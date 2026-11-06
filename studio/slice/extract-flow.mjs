// Static action-flow extraction. Source checkouts are inspected without execution or patch application.
import { readdirSync, lstatSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { noLinks, output, readBounded } from '../items/lib.mjs';
import { indexBundleRegions } from './js-ast.mjs';
import { extractProtobufSchemas } from './protobuf-extractor.mjs';
import { analyzeClientActionSlice } from './dataflow.mjs';
import { analyzeJavaSlice } from './java-slice.mjs';
import { runDifferentialRepro } from './differential-repro.mjs';
import { emitArenaPackage } from './package-emitter.mjs';

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

function walkClientFiles(clientRoot) {
  const jsFiles = [];
  const jsonFiles = [];
  const queue = [clientRoot];
  let scannedEntries = 0;
  while (queue.length) {
    const dir = queue.pop();
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (++scannedEntries > 50000) throw Error('Client scan entry limit exceeded');
      if (entry.isSymbolicLink() || ['node_modules', '.git'].includes(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        queue.push(full);
      } else if (entry.isFile()) {
        if (entry.name.endsWith('.js')) jsFiles.push(full);
        else if (entry.name.endsWith('.json')) jsonFiles.push(full);
      }
    }
  }
  return { jsFiles: jsFiles.sort(), jsonFiles: jsonFiles.sort() };
}

function loadCatalogRows(jsonText, relPath) {
  const clean = jsonText.replace(/^\uFEFF/, '');
  const parsed = JSON.parse(clean);
  if (Array.isArray(parsed)) {
    const baseName = relPath.split('/').at(-1).replace(/-[a-f0-9]{6,}\.json$/i, '').replace(/\.json$/i, '');
    return { tableName: baseName, rows: parsed };
  }
  if (parsed && typeof parsed === 'object') {
    const arrayKey = Object.keys(parsed).find((k) => Array.isArray(parsed[k]));
    if (arrayKey) {
      return { tableName: arrayKey, rows: parsed[arrayKey] };
    }
  }
  return null;
}

export function indexClientCheckout(clientRoot, backendRoot = null) {
  const root = noLinks(clientRoot);
  if (!existsSync(root) || !lstatSync(root).isDirectory()) {
    throw Error('Client path must be an existing directory');
  }
  const { jsFiles: allJs, jsonFiles: allJson } = walkClientFiles(root);
  if (!allJs.length) {
    throw Error('No .js files found inside client directory');
  }

  const jsFiles = [];
  const protoFiles = [];
  const allProtoSchemas = [];
  let totalBytes = 0;
  const boundedSource = (path, maximum) => {
    const bytes = readBounded(path, maximum);
    totalBytes += bytes.length;
    if (totalBytes > 256 * 1024 * 1024) throw Error('Client source byte limit exceeded');
    return bytes;
  };

  for (const full of allJs) {
    const relPath = relative(root, full).split(sep).join('/');
    const bytes = boundedSource(full, 64 * 1024 * 1024);
    const text = bytes.toString('utf8');
    const fileHash = sha256(bytes);

    const isProtoBundle = /protobuf|proto[-_.]?bundle/i.test(relPath) || /\.(?:encode|decode)\s*=\s*function\b[\s\S]{0,400}writer\.uint32/.test(text);
    if (isProtoBundle) {
      const extracted = extractProtobufSchemas(text, relPath);
      protoFiles.push({ relPath, sha256: fileHash, byteLength: bytes.length, schemaCount: extracted.messages.length });
      allProtoSchemas.push(...extracted.messages);
    }

    // Index non-protobuf JS bundles (or all JS if no separate non-proto bundle exists)
    if (!isProtoBundle || allJs.length === 1) {
      const regionIndex = indexBundleRegions(text, relPath);
      jsFiles.push({ relPath, sha256: fileHash, byteLength: bytes.length, text, regionIndex });
    }
  }

  // Fallback if every JS file matched proto heuristic
  if (!jsFiles.length) {
    for (const full of allJs) {
      const relPath = relative(root, full).split(sep).join('/');
      const bytes = readBounded(full, 64 * 1024 * 1024);
      const text = bytes.toString('utf8');
      jsFiles.push({
        relPath,
        sha256: sha256(bytes),
        byteLength: bytes.length,
        text,
        regionIndex: indexBundleRegions(text, relPath),
      });
    }
  }

  const catalogs = [];
  for (const full of allJson) {
    const relPath = relative(root, full).split(sep).join('/');
    const bytes = boundedSource(full, 32 * 1024 * 1024);
    const text = bytes.toString('utf8');
    try {
      const loaded = loadCatalogRows(text, relPath);
      if (loaded) {
        catalogs.push({
          tableName: loaded.tableName,
          relPath,
          sha256: sha256(bytes),
          rowCount: loaded.rows.length,
          rows: loaded.rows,
        });
      }
    } catch {
      // Skip non-catalog JSON files
    }
  }

  return {
    root,
    backendRoot: backendRoot ? noLinks(backendRoot) : null,
    jsFiles,
    protoFiles,
    protoSchemas: allProtoSchemas,
    catalogs,
  };
}

export function runExtractFlow({ client, backend = null, action, opcode = null, out }) {
  if (!client) throw Error('--client CLIENT_DIR required');
  if (!action || typeof action !== 'string' || !action.trim()) throw Error('--action ACTION_NAME required');
  if (!out) throw Error('--out NEW_DIR required');

  const clientRoot = noLinks(client);
  const backendRoot = backend ? noLinks(backend) : null;
  const targetOpcode = opcode !== null && opcode !== undefined ? Number(opcode) : null;
  if (targetOpcode !== null && (!Number.isSafeInteger(targetOpcode) || targetOpcode <= 0)) {
    throw Error('--opcode must be a positive integer');
  }

  const clientIndex = indexClientCheckout(clientRoot, backendRoot);

  const clientSlice = analyzeClientActionSlice({
    clientIndex,
    actionQuery: action.trim(),
    targetOpcode,
    catalogs: clientIndex.catalogs,
    protoSchemas: clientIndex.protoSchemas,
  });

  const javaSlice = analyzeJavaSlice({
    backendRoot,
    clientSlice,
  });

  const reproReport = runDifferentialRepro({
    clientSlice,
    javaSlice,
    backendRoot,
  });

  const outDir = output(out, [clientRoot, backendRoot].filter(Boolean));

  const emitted = emitArenaPackage({
    outDir,
    actionQuery: action.trim(),
    clientIndex,
    clientSlice,
    javaSlice,
    reproReport,
  });

  return {
    schemaVersion: 'autoforge.extract-flow.v1',
    status: emitted.manifest.coverage.status,
    outDir,
    action: action.trim(),
    c2sOpcode: clientSlice.c2sOpcode?.value ?? null,
    defectsFound: [
      ...(clientSlice.clientDefects ?? []),
      ...(javaSlice.findings ?? []),
    ],
    captureQuestions: emitted.flow.captureQuestions,
    coverage: emitted.manifest.coverage,
    reproSummary: reproReport.summary,
  };
}
