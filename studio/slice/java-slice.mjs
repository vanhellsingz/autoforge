// Java 21 Backend Callgraph, Wire Decoder Verifier, Transaction Auditor & Minimal Patch Generator.
import { existsSync, lstatSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { extractJavaMethods } from '../../integration-contracts.mjs';
import { noLinks, readBounded } from '../items/lib.mjs';

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const lineAt = (text, offset) => text.slice(0, offset).split('\n').length;

function walkJavaFiles(root) {
  const out = [];
  const queue = [root];
  let entries = 0;
  while (queue.length) {
    const dir = queue.pop();
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (++entries > 50000) throw Error('Java scan entry limit exceeded');
      if (entry.isSymbolicLink() || ['.git', 'target', 'build', '.gradle', 'node_modules'].includes(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) queue.push(full);
      else if (entry.isFile() && entry.name.endsWith('.java')) {
        out.push(full);
        if (out.length > 20000) throw Error('Java file scan limit exceeded');
      }
    }
  }
  return out.sort();
}

function inspectGitState(backendRoot) {
  try {
    const commit = execFileSync('git', ['--no-optional-locks', '-c', 'core.fsmonitor=false', '-C', backendRoot, 'rev-parse', '--verify', 'HEAD'], {
      encoding: 'utf8',
      timeout: 10000,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    const porcelain = execFileSync('git', ['--no-optional-locks', '-c', 'core.fsmonitor=false', '-C', backendRoot, 'status', '--porcelain', '--ignore-submodules=all'], {
      encoding: 'utf8',
      timeout: 10000,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    const dirtyFiles = porcelain
      ? porcelain.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
      : [];
    return { isGitRepo: true, commit, dirty: dirtyFiles.length > 0, dirtyFiles };
  } catch {
    return { isGitRepo: false, commit: null, dirty: false, dirtyFiles: [] };
  }
}

// Creates a minimal standard unified diff between `beforeText` and `afterText` for `relPath`
export function createUnifiedPatch(relPath, baseSha256, beforeText, afterText) {
  if (beforeText === afterText) return '';
  const oldLines = beforeText.replaceAll('\r\n', '\n').split('\n');
  const newLines = afterText.replaceAll('\r\n', '\n').split('\n');

  let prefix = 0;
  while (prefix < oldLines.length && prefix < newLines.length && oldLines[prefix] === newLines[prefix]) {
    prefix++;
  }
  let suffix = 0;
  while (
    suffix < oldLines.length - prefix &&
    suffix < newLines.length - prefix &&
    oldLines[oldLines.length - 1 - suffix] === newLines[newLines.length - 1 - suffix]
  ) {
    suffix++;
  }

  const ctxStart = Math.max(0, prefix - 3);
  const oldEnd = Math.min(oldLines.length, oldLines.length - suffix + 3);
  const newEnd = Math.min(newLines.length, newLines.length - suffix + 3);

  const oldCount = oldEnd - ctxStart;
  const newCount = newEnd - ctxStart;
  const hunk = [
    `# Base-SHA256: ${baseSha256}`,
    `--- a/${relPath}`,
    `+++ b/${relPath}`,
    `@@ -${ctxStart + 1},${oldCount} +${ctxStart + 1},${newCount} @@`,
  ];

  for (let i = ctxStart; i < prefix; i++) hunk.push(' ' + oldLines[i]);
  for (let i = prefix; i < oldLines.length - suffix; i++) hunk.push('-' + oldLines[i]);
  for (let i = prefix; i < newLines.length - suffix; i++) hunk.push('+' + newLines[i]);
  for (let i = oldLines.length - suffix; i < oldEnd; i++) hunk.push(' ' + oldLines[i]);

  return hunk.join('\n') + '\n';
}

function extractBalancedBraces(text, openIdx) {
  let depth = 0;
  let inStr = null;
  for (let i = openIdx; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (ch === '\\') { i++; continue; }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'") { inStr = ch; continue; }
    if (ch === '/' && text[i + 1] === '/') {
      const nl = text.indexOf('\n', i + 2);
      if (nl < 0) break;
      i = nl;
      continue;
    }
    if (ch === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      if (end < 0) break;
      i = end + 1;
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return text.slice(openIdx + 1, i);
    }
  }
  return null;
}

// Parses a Java `Request.decode(ProtoReader)` or `switch (tag)` wire decoder
function analyzeJavaDecoder(javaFile, clientSlice) {
  const text = javaFile.text;
  const findings = [];
  const wireBindings = [];

  // Match record Request(...) or class Request with decode(...)
  const recordMatch = text.match(/public\s+(?:static\s+)?record\s+Request\s*\(([^)]+)\)\s*\{/);
  if (!recordMatch) {
    return { found: false, wireBindings, findings, patchedText: null };
  }

  const openBraceIdx = recordMatch.index + recordMatch[0].length - 1;
  const decodeBody = extractBalancedBraces(text, openBraceIdx);
  if (decodeBody === null) {
    return { found: false, wireBindings, findings, patchedText: null };
  }

  const recordParams = recordMatch[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((decl) => {
      const parts = decl.split(/\s+/);
      return { type: parts.slice(0, -1).join(' '), name: parts.at(-1) };
    });
  const caseToVar = new Map();
  // Match `case 1 -> wire9 = reader.readInt32();` or `case 1: wire9 = ...; break;`
  for (const m of decodeBody.matchAll(/\bcase\s+(\d+)\s*(?:->|:)\s*([A-Za-z_$][\w$]*)\s*=\s*reader\.(\w+)\s*\(/g)) {
    caseToVar.set(Number(m[1]), { varName: m[2], readerMethod: m[3] });
  }

  // Match `return new Request(arg0, arg1, arg2);`
  const returnMatch = decodeBody.match(/return\s+new\s+Request\s*\(([^)]+)\)\s*;/);
  if (!returnMatch) {
    return { found: true, recordParams, wireBindings, findings, patchedText: null };
  }

  const returnArgs = returnMatch[1].split(',').map((s) => s.trim());
  const varToFieldNum = new Map([...caseToVar.entries()].map(([num, info]) => [info.varName, num]));

  for (let idx = 0; idx < recordParams.length; idx++) {
    const param = recordParams[idx];
    const argExpr = returnArgs[idx] ?? null;
    const fieldNum = varToFieldNum.get(argExpr) ?? null;
    const clientVar = clientSlice?.recoveredVariables?.find((v) => v.fieldNumber === fieldNum) ?? null;

    wireBindings.push({
      paramIndex: idx,
      javaType: param.type,
      javaParamName: param.name,
      boundLocalVar: argExpr,
      wireFieldNumber: fieldNum,
      clientProtobufField: clientVar?.protobufField ?? null,
      clientRecoveredRole: clientVar?.recoveredRole ?? null,
    });
  }

  // Detect swapped wire fields between Java record parameters and client protobuf schema!
  const expectedArgs = [...returnArgs];
  let hasSwap = false;

  for (let idx = 0; idx < wireBindings.length; idx++) {
    const b = wireBindings[idx];
    const pLower = b.javaParamName.toLowerCase();
    const expectedRole = /(?:src|source|consume|from)/.test(pLower)
      ? 'SOURCE_ITEM_TEMPLATE'
      : /(?:target|des|dst|dest|to)/.test(pLower)
        ? 'DEST_ITEM_TEMPLATE'
        : /(?:count|qty|amount|num)/.test(pLower)
          ? 'QUANTITY'
          : null;

    if (expectedRole && b.clientRecoveredRole && b.clientRecoveredRole !== expectedRole) {
      // Find the wire field that actually carries `expectedRole`
      const matchingClientVar = clientSlice?.recoveredVariables?.find((v) => v.recoveredRole === expectedRole);
      const matchingCase = matchingClientVar?.fieldNumber ? caseToVar.get(matchingClientVar.fieldNumber) : null;
      if (matchingCase) {
        hasSwap = true;
        expectedArgs[idx] = matchingCase.varName;
        findings.push({
          id: 'JAVA_WIRE_FIELD_SWAP',
          severity: 'CRITICAL',
          stage: 'java_decode_and_handler',
          filePath: javaFile.relPath,
          line: lineAt(text, openBraceIdx + 1 + returnMatch.index),
          message: `Wire field swap in ${javaFile.relPath}: Java parameter "${b.javaParamName}" (expected ${expectedRole}) receives wire field #${b.wireFieldNumber} (${b.boundLocalVar} = ${b.clientProtobufField}, role ${b.clientRecoveredRole}).`,
          suggestedFix: `Bind "${b.javaParamName}" to wire field #${matchingClientVar.fieldNumber} (${matchingCase.varName}).`,
        });
      }
    }
  }

  let patchedText = null;
  if (hasSwap) {
    const fixedReturn = `return new Request(${expectedArgs.join(', ')});`;
    const returnStart = openBraceIdx + 1 + returnMatch.index;
    patchedText = text.slice(0, returnStart) + fixedReturn + text.slice(returnStart + returnMatch[0].length);
  }

  return {
    found: true,
    recordParams,
    wireBindings,
    findings: findings.map((finding) => ({ ...finding, evidenceKind: 'STATIC_HEURISTIC', requiresConfirmation: true })),
    returnStatement: returnMatch[0],
    patchedReturnStatement: hasSwap ? `return new Request(${expectedArgs.join(', ')});` : null,
    patchedText,
  };
}

function stripJavaComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\/|\/\/[^\r\n]*/g, (m) => m.replace(/[^\r\n]/g, ' '));
}

// Audits service methods for consume-before-validation, missing S2C bag sync, missing idempotency, and SQL boundaries.
function auditJavaServiceMethod(javaFile, methodObj, clientSlice) {
  const rawBody = javaFile.text.slice(methodObj.bodyStart, methodObj.end);
  const body = stripJavaComments(rawBody);
  const findings = [];
  const sqlStatements = [];
  const s2cEmissions = [];

  for (const m of body.matchAll(/"((?:SELECT|INSERT|UPDATE|DELETE)\s+[^"]{6,200})"/gi)) {
    sqlStatements.push({
      sql: m[1],
      line: lineAt(javaFile.text, methodObj.bodyStart + m.index),
    });
  }

  for (const m of body.matchAll(/\b(?:respond|send|sendPacket|sendMessage|emit)\s*\(\s*[^,)]+,\s*([^,)]+)/g)) {
    s2cEmissions.push({
      opcodeExpr: m[1].trim(),
      line: lineAt(javaFile.text, methodObj.bodyStart + m.index),
    });
  }

  const consumeMatch = body.match(/\b(?:consumeItem|removeItem|deductItem|deleteItem|consume)\s*\(/);
  const validateMatch = body.match(/\b(?:validate\w*|findTransformTemplate|checkCapacity|hasFreeSlot|canAdd|verify\w*)\s*\(/);

  if (consumeMatch && (!validateMatch || consumeMatch.index < validateMatch.index)) {
    findings.push({
      id: 'JAVA_CONSUME_BEFORE_VALIDATION',
      severity: 'CRITICAL',
      stage: 'java_transaction_and_sql',
      filePath: javaFile.relPath,
      line: lineAt(javaFile.text, methodObj.bodyStart + consumeMatch.index),
      message: `Method "${methodObj.method}" invokes "${consumeMatch[0].replace('(', '')}" before validating catalog rules / bag capacity, risking permanent loss of high-level (e.g. Lv.12) items on rejection.`,
      suggestedFix: 'Validate template group, level, currency, and destination bag capacity BEFORE consuming source items.',
    });
  }

  const mutatesInventory = Boolean(consumeMatch || /\b(?:addItem\w*|grantItem\w*|saveItem\w*|insertItem\w*|persistItem\w*|UPDATE\s+t_u_item|INSERT\s+INTO\s+t_u_item)\b/i.test(body));
  if (mutatesInventory && !s2cEmissions.length) {
    findings.push({
      id: 'JAVA_MISSING_S2C_UI_SYNC',
      severity: 'HIGH',
      stage: 's2c_response_emit',
      filePath: javaFile.relPath,
      line: methodObj.endLine,
      message: `Method "${methodObj.method}" mutates inventory without emitting an S2C bag/item update response, causing synthesized/converted items to appear only after relogin.`,
      suggestedFix: 'Emit S2C response + U_C_BAG_MOVE_UPDATE after transaction commit.',
    });
  }

  const hasTransaction = /@Transactional|transactionTemplate|setAutoCommit\s*\(\s*false\s*\)|inTransaction/i.test(javaFile.text);
  const hasIdempotency = /idempotency|operationId|requestId|deduplicate/i.test(body);

  return {
    method: methodObj.method,
    signature: methodObj.signature,
    filePath: javaFile.relPath,
    startLine: methodObj.startLine,
    endLine: methodObj.endLine,
    sha256: javaFile.sha256,
    bodySha256: methodObj.bodySha256,
    hasTransaction,
    hasIdempotency,
    sqlStatements,
    s2cEmissions,
    findings,
  };
}

export function analyzeJavaSlice({ backendRoot, clientSlice }) {
  if (!backendRoot) {
    return {
      status: 'BACKEND_NOT_PROVIDED',
      git: { isGitRepo: false, commit: null, dirty: false, dirtyFiles: [] },
      files: [],
      opcodes: [],
      dispatchHandler: null,
      decoderAnalysis: null,
      serviceMethods: [],
      findings: [],
      patches: [],
      captureQuestions: [{
        id: 'Q_BACKEND_MISSING',
        stage: 'java_decode_and_handler',
        question: 'Provide --backend JAVA_DIR to resolve Java decoder, handler, transaction, and S2C response bindings.',
      }],
    };
  }

  const root = noLinks(backendRoot);
  if (!existsSync(root) || !lstatSync(root).isDirectory()) {
    throw Error('Backend path must be an existing directory');
  }

  const git = inspectGitState(root);
  const javaPaths = walkJavaFiles(root);
  let totalBytes = 0;
  const javaFiles = javaPaths.map((full) => {
    const relPath = relative(root, full).split(sep).join('/');
    const bytes = readBounded(full, 16 * 1024 * 1024);
    totalBytes += bytes.length;
    if (totalBytes > 256 * 1024 * 1024) throw Error('Java source byte limit exceeded');
    const text = bytes.toString('utf8');
    return {
      relPath,
      fullPath: full,
      sha256: sha256(bytes),
      byteLength: bytes.length,
      text,
      methods: extractJavaMethods(text),
    };
  });

  // 1. Scan Java opcode declarations
  const opcodes = [];
  for (const jf of javaFiles) {
    for (const m of jf.text.matchAll(/\b(?:public\s+)?static\s+final\s+int\s+([A-Z][A-Z0-9_]{2,})\s*=\s*(0x[0-9a-fA-F]+|\d+)\s*;/g)) {
      opcodes.push({
        name: m[1],
        value: Number(m[2]),
        filePath: jf.relPath,
        line: lineAt(jf.text, m.index),
        sha256: jf.sha256,
      });
    }
  }

  // 2. Match C2S opcode from clientSlice
  const targetOpValue = clientSlice?.c2sOpcode?.value ?? null;
  const targetOpName = clientSlice?.c2sOpcode?.name ?? null;
  const matchedJavaOpcode = opcodes.find((o) =>
    (targetOpValue !== null && o.value === targetOpValue) ||
    (targetOpName && o.name === targetOpName)
  ) ?? null;

  // 3. Locate switch/dispatch handler in Java
  let dispatchHandler = null;
  const searchSymbols = [
    matchedJavaOpcode?.name,
    targetOpName,
    targetOpValue !== null ? String(targetOpValue) : null,
  ].filter(Boolean);

  for (const jf of javaFiles) {
    for (const sym of searchSymbols) {
      const caseRe = new RegExp(`\\bcase\\s+(?:[A-Za-z_]\\w*\\.)?${sym}\\s*(?:->|:)\\s*([A-Za-z_$][\\w$]*)\\s*\\(`);
      const match = caseRe.exec(jf.text);
      if (match) {
        const handlerName = match[1];
        const containingMethod = jf.methods.find((m) => m.start <= match.index && m.end >= match.index) ?? null;
        const targetMethod = jf.methods.find((m) => m.method === handlerName) ?? null;
        dispatchHandler = {
          opcodeSymbol: sym,
          dispatchFile: jf.relPath,
          dispatchLine: lineAt(jf.text, match.index),
          dispatchSha256: jf.sha256,
          containingMethod: containingMethod?.method ?? null,
          handlerMethodName: handlerName,
          handlerSignature: targetMethod?.signature ?? null,
          handlerStartLine: targetMethod?.startLine ?? null,
          handlerEndLine: targetMethod?.endLine ?? null,
          handlerBodySha256: targetMethod?.bodySha256 ?? null,
          handlerBody: targetMethod ? jf.text.slice(targetMethod.bodyStart, targetMethod.end) : null,
        };
        break;
      }
    }
    if (dispatchHandler) break;
  }

  // 4. Find candidate domain service files (by handler calls or action keywords)
  const serviceCandidates = new Set();
  if (dispatchHandler?.handlerBody) {
    for (const m of dispatchHandler.handlerBody.matchAll(/\b([A-Z][A-Za-z0-9_]*(?:Service|Manager|Handler|Repository))\b/g)) {
      serviceCandidates.add(m[1]);
    }
  }
  const actionTokens = (clientSlice?.actionQuery ?? '').split(/[^A-Za-z0-9]+/).filter((t) => t.length >= 3);
  const relevantJavaFiles = javaFiles.filter((jf) =>
    [...serviceCandidates].some((s) => jf.relPath.includes(s) || jf.text.includes(`class ${s}`)) ||
    (matchedJavaOpcode && jf.text.includes(matchedJavaOpcode.name)) ||
    actionTokens.some((tok) => jf.relPath.toLowerCase().includes(tok.toLowerCase()))
  );

  let decoderAnalysis = null;
  const serviceMethods = [];
  const findings = [];
  const patches = [];
  const captureQuestions = [];

  for (const jf of relevantJavaFiles) {
    let workingText = jf.text;
    const dec = analyzeJavaDecoder(jf, clientSlice);
    if (dec.found) {
      decoderAnalysis = { filePath: jf.relPath, fileSha256: jf.sha256, ...dec };
      findings.push(...dec.findings);
      if (dec.patchedText) {
        workingText = dec.patchedText;
      }
    }

    for (const m of jf.methods) {
      if (m.method === 'decode') continue;
      if (
        (dispatchHandler && (m.method === dispatchHandler.handlerMethodName || dispatchHandler.handlerBody?.includes(m.method + '('))) ||
        /(?:transform|compose|enchant|strengthen|recruit|openChest|settle|handle|execute)/i.test(m.method)
      ) {
        const audit = auditJavaServiceMethod(jf, m, clientSlice);
        serviceMethods.push(audit);
        findings.push(...audit.findings);

        // Transaction order needs control-flow and database review; never reorder statements automatically.
      }
    }

    if (workingText !== jf.text) {
      patches.push({
        filePath: jf.relPath,
        baseSha256: jf.sha256,
        reason: 'Review-only candidate for inferred wire decoder field order; not applied or runtime verified',
        unifiedDiff: createUnifiedPatch(jf.relPath, jf.sha256, jf.text, workingText),
      });
    }
  }

  if (!dispatchHandler) {
    captureQuestions.push({
      id: 'Q_JAVA_HANDLER_UNRESOLVED',
      stage: 'java_decode_and_handler',
      question: `No Java switch case found for opcode ${targetOpName ?? targetOpValue ?? 'UNKNOWN'}. Verify dynamic handler registration or command map in backend.`,
    });
  }

  return {
    status: relevantJavaFiles.length ? 'RESOLVED' : 'PARTIAL_UNRESOLVED',
    git,
    files: javaFiles.map((jf) => ({ path: jf.relPath, sha256: jf.sha256, byteLength: jf.byteLength })),
    opcodes,
    matchedJavaOpcode,
    dispatchHandler,
    decoderAnalysis,
    serviceMethods,
    findings: findings.map((finding) => ({ ...finding, evidenceKind: 'STATIC_HEURISTIC', requiresConfirmation: true })),
    patches,
    captureQuestions,
  };
}
