// Complete Arena Deliverable Package Emitter (manifest, flow, variables, protocol, rules, patch, tests, validation, ARENA.txt).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { validateContract } from '../contract-generator.mjs';

const sha256 = (buf) => createHash('sha256').update(Buffer.isBuffer(buf) ? buf : Buffer.from(buf, 'utf8')).digest('hex');

function pascalCase(str) {
  const result = str
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join('') || 'ActionSlice';
  return /^[A-Za-z_$]/.test(result) ? result : 'Action' + result;
}

function buildTwelveStageFlow({ clientSlice, javaSlice }) {
  const allCaptureQuestions = [
    ...(clientSlice.captureQuestions ?? []),
    ...(javaSlice.captureQuestions ?? []),
  ];

  const byStageQ = (stageId) => allCaptureQuestions.filter((q) => q.stage === stageId);

  const wireSwap = javaSlice.findings?.find((f) => f.id === 'JAVA_WIRE_FIELD_SWAP');
  const stackDefect = clientSlice.clientDefects?.find((d) => d.id === 'CLIENT_STACK_QUANTITY_FORCED');
  const consumeBeforeVal = javaSlice.findings?.find((f) => f.id === 'JAVA_CONSUME_BEFORE_VALIDATION');
  const missingS2cSync = javaSlice.findings?.find((f) => f.id === 'JAVA_MISSING_S2C_UI_SYNC');
  const missingUiRefresh = clientSlice.clientDefects?.find((d) => d.id === 'MISSING_UI_REFRESH_AFTER_MODEL_MUTATION');
  const filterDefect = clientSlice.clientDefects?.find((d) => d.id === 'UI_FILTER_EXCLUDES_VALID_CATALOG_ITEM');

  const stages = [
    {
      order: 1,
      id: 'ui_control',
      title: '1. Controle da Tela (LayaAir UI Trigger)',
      status: clientSlice.uiCallSite ? 'RESOLVED' : clientSlice.anchorFound ? 'PARTIAL_RESOLVED' : 'DYNAMIC_UNRESOLVED',
      provenance: clientSlice.uiCallSite ? {
        filePath: clientSlice.uiCallSite.filePath,
        symbol: clientSlice.uiCallSite.callerFunction,
        line: clientSlice.uiCallSite.line,
        startByte: clientSlice.uiCallSite.startByte,
        endByte: clientSlice.uiCallSite.endByte,
        sha256: clientSlice.uiCallSite.classSha256,
      } : null,
      details: clientSlice.uiCallSite
        ? `Caller ${clientSlice.uiCallSite.callerFunction} invokes ${clientSlice.uiCallSite.callExpr}`
        : 'UI caller not statically resolved; inspect sender call hierarchy.',
      captureQuestions: byStageQ('ui_control'),
    },
    {
      order: 2,
      id: 'selection_and_quantity',
      title: '2. Seleção e Quantidade',
      status: stackDefect ? 'DEFECT_DETECTED' : clientSlice.recoveredVariables.length ? 'RESOLVED' : 'DYNAMIC_UNRESOLVED',
      provenance: clientSlice.uiCallSite ? {
        filePath: clientSlice.uiCallSite.filePath,
        args: clientSlice.uiCallSite.callArgs,
        thisFieldOrigins: clientSlice.uiCallSite.thisFieldOrigins,
      } : null,
      defects: stackDefect ? [stackDefect] : [],
      details: clientSlice.recoveredVariables.map((v) => `${v.recoveredRole}: ${v.uiExpression ?? v.originalName} (${v.quantitySourceMode ?? v.unit})`),
      captureQuestions: byStageQ('selection_and_quantity'),
    },
    {
      order: 3,
      id: 'client_validation',
      title: '3. Validação no Cliente e Filtros de Elegibilidade',
      status: filterDefect ? 'DEFECT_DETECTED' : (clientSlice.validationGuards.length || clientSlice.uiFilters.length) ? 'RESOLVED' : 'UNVERIFIED',
      guards: clientSlice.validationGuards,
      uiFilters: clientSlice.uiFilters,
      defects: filterDefect ? [filterDefect] : [],
      captureQuestions: byStageQ('ui_selection_filter'),
    },
    {
      order: 4,
      id: 'catalog_lookup',
      title: '4. Consulta a Catálogos Estáticos',
      status: clientSlice.catalogBindings.length ? 'RESOLVED' : byStageQ('catalog_lookup').length ? 'DYNAMIC_UNRESOLVED' : 'UNVERIFIED',
      catalogs: clientSlice.catalogBindings.map((c) => ({ tableName: c.tableName, filePath: c.filePath, sha256: c.sha256, rowCount: c.rowCount })),
      captureQuestions: byStageQ('catalog_lookup'),
    },
    {
      order: 5,
      id: 'request_build',
      title: '5. Montagem do Pedido no Cliente',
      status: clientSlice.senderFunction ? 'RESOLVED' : 'DYNAMIC_UNRESOLVED',
      provenance: clientSlice.senderFunction ? {
        filePath: clientSlice.senderFunction.filePath,
        symbol: clientSlice.senderFunction.qualifiedName,
        line: clientSlice.senderFunction.line,
        startByte: clientSlice.senderFunction.startByte,
        endByte: clientSlice.senderFunction.endByte,
        sha256: clientSlice.senderFunction.sha256,
        constructedClass: clientSlice.senderFunction.constructedClass,
      } : null,
      captureQuestions: byStageQ('request_build'),
    },
    {
      order: 6,
      id: 'protobuf_encode',
      title: '6. Codificação Binária Protobuf',
      status: clientSlice.protobufSchema ? 'RESOLVED' : 'DYNAMIC_UNRESOLVED',
      schema: clientSlice.protobufSchema,
      captureQuestions: byStageQ('protobuf_encode'),
    },
    {
      order: 7,
      id: 'c2s_dispatch',
      title: '7. Envio C2S pelo Transporte WebSocket',
      status: clientSlice.c2sOpcode ? 'RESOLVED' : 'DYNAMIC_UNRESOLVED',
      opcode: clientSlice.c2sOpcode,
      captureQuestions: byStageQ('c2s_dispatch'),
    },
    {
      order: 8,
      id: 'java_decode_and_handler',
      title: '8. Decoder Protobuf & Handler Java',
      status: wireSwap ? 'DEFECT_DETECTED' : (javaSlice.dispatchHandler || javaSlice.decoderAnalysis?.found) ? 'RESOLVED' : 'DYNAMIC_UNRESOLVED',
      dispatchHandler: javaSlice.dispatchHandler,
      decoderAnalysis: javaSlice.decoderAnalysis ? {
        filePath: javaSlice.decoderAnalysis.filePath,
        fileSha256: javaSlice.decoderAnalysis.fileSha256,
        wireBindings: javaSlice.decoderAnalysis.wireBindings,
        returnStatement: javaSlice.decoderAnalysis.returnStatement,
        patchedReturnStatement: javaSlice.decoderAnalysis.patchedReturnStatement,
      } : null,
      defects: wireSwap ? [wireSwap] : [],
      captureQuestions: byStageQ('java_decode_and_handler'),
    },
    {
      order: 9,
      id: 'java_transaction_and_sql',
      title: '9. Transação Persistente, Validação & SQL no Backend',
      status: consumeBeforeVal ? 'DEFECT_DETECTED' : javaSlice.serviceMethods.length ? 'RESOLVED' : 'UNVERIFIED',
      serviceMethods: javaSlice.serviceMethods,
      defects: consumeBeforeVal ? [consumeBeforeVal] : [],
      captureQuestions: byStageQ('java_transaction_and_sql'),
    },
    {
      order: 10,
      id: 's2c_response_emit',
      title: '10. Emissão das Respostas S2C do Servidor',
      status: missingS2cSync ? 'DEFECT_DETECTED' : (javaSlice.serviceMethods.some((m) => m.s2cEmissions.length) || clientSlice.s2cOpcodes.length) ? 'RESOLVED' : 'UNVERIFIED',
      s2cOpcodes: clientSlice.s2cOpcodes,
      javaEmissions: javaSlice.serviceMethods.flatMap((m) => m.s2cEmissions),
      defects: missingS2cSync ? [missingS2cSync] : [],
      captureQuestions: byStageQ('s2c_response_emit'),
    },
    {
      order: 11,
      id: 'client_model_update',
      title: '11. Atualização do Modelo de Bolsa/Estado no Cliente',
      status: clientSlice.s2cConsumers.some((c) => c.modelMutations.length) ? 'RESOLVED' : 'UNVERIFIED',
      consumers: clientSlice.s2cConsumers,
      captureQuestions: byStageQ('client_model_update'),
    },
    {
      order: 12,
      id: 'ui_refresh_and_unlock',
      title: '12. Atualização Visual da Tela LayaAir & Liberação de Modal',
      status: missingUiRefresh ? 'DEFECT_DETECTED' : clientSlice.s2cConsumers.some((c) => c.uiRefreshCalls.length) ? 'RESOLVED' : 'UNVERIFIED',
      refreshCalls: clientSlice.s2cConsumers.flatMap((c) => c.uiRefreshCalls),
      modalUnlocks: clientSlice.s2cConsumers.flatMap((c) => c.modalUnlocks),
      defects: missingUiRefresh ? [missingUiRefresh] : [],
      captureQuestions: byStageQ('ui_refresh_and_unlock'),
    },
  ];

  const resolvedStages = stages.filter((s) => s.status === 'RESOLVED').length;
  const defectStages = stages.filter((s) => s.status === 'DEFECT_DETECTED').length;
  const unresolvedStages = stages.filter((s) => s.status === 'DYNAMIC_UNRESOLVED' || s.status === 'UNVERIFIED' || s.status === 'PARTIAL_RESOLVED').length;

  return {
    schemaVersion: 'autoforge.flow.v1',
    evidenceKind: 'STATIC_ANALYSIS',
    runtime: 'NOT_RUN',
    actionQuery: clientSlice.actionQuery,
    summary: {
      totalStages: stages.length,
      resolvedStages,
      defectStages,
      unresolvedStages,
      handledStages: resolvedStages + defectStages,
      completenessPercent: Math.round(((resolvedStages + defectStages) / stages.length) * 1000) / 10,
    },
    stages,
    captureQuestions: allCaptureQuestions,
  };
}

function buildFlowMarkdown(flow, manifest) {
  const lines = [
    `# Fluxo Vertical Extraído — \`${flow.actionQuery}\``,
    '',
    `- **Cobertura Estática:** ${flow.summary.completenessPercent}% (${flow.summary.handledStages}/${flow.summary.totalStages} etapas mapeadas, ${flow.summary.defectStages} suspeita(s) estatica(s), ${flow.summary.unresolvedStages} etapa(s) pendente(s) de captura)`,
    '- Runtime, banco, UI e aplicacao do patch: NOT_RUN. RESOLVED descreve somente o mapeamento estatico.',
    `- **Commit Backend:** \`${manifest.sources.backend.commit ?? 'UNVERIFIED'}\` (dirty: \`${manifest.sources.backend.dirty}\`)`,
    '',
    '## Linha do Fluxo (12 Etapas)',
    '',
  ];

  for (const s of flow.stages) {
    lines.push(`### ${s.title} — \`${s.status}\``);
    if (s.provenance?.filePath) {
      lines.push(`- **Fonte:** \`${s.provenance.filePath}:${s.provenance.line ?? 1}\` (bytes \`${s.provenance.startByte ?? 0}..${s.provenance.endByte ?? 0}\`, sha256 \`${(s.provenance.sha256 ?? '').slice(0, 12)}...\`)`);
    }
    if (typeof s.details === 'string') lines.push(`- **Detalhe:** ${s.details}`);
    if (Array.isArray(s.details) && s.details.length) {
      for (const d of s.details) lines.push(`  - ${d}`);
    }
    if (s.defects?.length) {
      for (const d of s.defects) {
        lines.push(`- **DEFEITO [${d.severity}] \`${d.id}\`:** ${d.message}`);
        if (d.suggestedFix) lines.push(`  - **Correção proposta:** ${d.suggestedFix}`);
      }
    }
    if (s.captureQuestions?.length) {
      for (const q of s.captureQuestions) {
        lines.push(`- **PERGUNTA DE CAPTURA (\`${q.id}\`):** ${q.question}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

function synthesizeContract({ actionQuery, clientSlice, javaSlice, manifestSources }) {
  const cleanId = actionQuery.toLowerCase().replace(/[^a-z0-9_.:-]+/g, '-').replace(/^-|-$/g, '') || 'extracted-action';
  const clsName = pascalCase(actionQuery) + 'Operation';
  const reqOp = clientSlice.c2sOpcode?.value ?? null;
  const respOp = clientSlice.s2cOpcodes?.[0]?.value ?? null;
  if (!reqOp || !respOp) return { valid: false, status: 'UNRESOLVED', error: 'Request and response opcodes must both be recovered; no defaults are synthesized.', contract: null };

  const evidence = [
    ...manifestSources.client.files.slice(0, 4).map((f) => ({ path: f.path, sha256: f.sha256 })),
    ...manifestSources.protobuf.files.slice(0, 2).map((f) => ({ path: f.path, sha256: f.sha256 })),
  ];
  if (!evidence.length) return { valid: false, status: 'UNRESOLVED', error: 'No source evidence recovered.', contract: null };

  const contract = {
    schemaVersion: 1,
    id: cleanId.slice(0, 80),
    packageName: 'com.wartuneultra.autoforge.v2',
    className: clsName.slice(0, 80),
    requestOpcode: reqOp,
    responseOpcode: respOp,
    amount: { min: 1, max: 999 },
    deltas: [
      { domain: 'inventory', key: 'source-slot', perUnit: -1 },
      { domain: 'inventory', key: 'target-slot', perUnit: 1 },
    ],
    evidence,
  };

  if (javaSlice.git?.commit && javaSlice.serviceMethods.length) {
    const firstSvc = javaSlice.serviceMethods[0];
    const srcFile = javaSlice.files.find((f) => f.path === firstSvc.filePath);
    if (srcFile) {
      contract.backend = {
        commit: javaSlice.git.commit,
        sources: [{ path: srcFile.path, sha256: srcFile.sha256 }],
        targets: [{ path: srcFile.path, method: firstSvc.method }],
      };
    }
  }

  try {
    validateContract(contract);
    return { valid: true, status: 'REVIEW_ONLY_TEMPLATE', semantics: 'UNVERIFIED', assumptions: ['amount bounds and inventory deltas are generic placeholders; review against the action contract before generation.'], contract };
  } catch (err) {
    return { valid: false, error: err.message, contract };
  }
}

export function emitArenaPackage({
  outDir,
  actionQuery,
  clientIndex,
  clientSlice,
  javaSlice,
  reproReport,
}) {
  const manifestSources = {
    client: {
      root: clientIndex.root,
      files: clientIndex.jsFiles.map((f) => ({ path: f.relPath, sha256: f.sha256, byteLength: f.byteLength })),
    },
    protobuf: {
      files: clientIndex.protoFiles.map((f) => ({ path: f.relPath, sha256: f.sha256, messageCount: f.schemaCount })),
    },
    catalogs: {
      files: clientIndex.catalogs.map((c) => ({ tableName: c.tableName, path: c.relPath, sha256: c.sha256, rowCount: c.rowCount })),
    },
    backend: {
      root: javaSlice.git ? clientIndex.backendRoot ?? null : null,
      commit: javaSlice.git?.commit ?? null,
      dirty: javaSlice.git?.dirty ?? false,
      dirtyFiles: javaSlice.git?.dirtyFiles ?? [],
      files: javaSlice.files ?? [],
    },
  };

  const flow = buildTwelveStageFlow({ clientSlice, javaSlice });

  // Build combined unified patch
  const patchChunks = [];
  for (const p of javaSlice.patches ?? []) {
    if (p.unifiedDiff) patchChunks.push(p.unifiedDiff);
  }
  // Client quantity semantics need a reviewed selector contract; no client edits are synthesized.

  const implementationPatch = patchChunks.length
    ? patchChunks.join('\n')
    : '# NO_AUTOMATIC_PATCH_GENERATED — Inspect flow.json defects and captureQuestions.\n';

  const wireBindings = javaSlice.decoderAnalysis?.wireBindings ?? [];
  const protocolDoc = {
    schemaVersion: 'autoforge.protocol.v1',
    c2sOpcode: clientSlice.c2sOpcode,
    s2cOpcodes: clientSlice.s2cOpcodes,
    protobufMessage: clientSlice.protobufSchema,
    wireBijection: (clientSlice.protobufSchema?.fields ?? []).map((pf) => {
      const jb = wireBindings.find((w) => w.wireFieldNumber === pf.fieldNumber) ?? null;
      const cv = clientSlice.recoveredVariables.find((v) => v.fieldNumber === pf.fieldNumber) ?? null;
      return {
        fieldNumber: pf.fieldNumber,
        wireTag: pf.wireTag,
        wireType: pf.wireTypeName,
        scalarType: pf.scalarType,
        clientFieldName: pf.fieldName,
        recoveredRole: cv?.recoveredRole ?? null,
        javaParamName: jb?.javaParamName ?? null,
        javaLocalVar: jb?.boundLocalVar ?? null,
        bijectionStatus: jb
          ? (jb.clientRecoveredRole === cv?.recoveredRole && !javaSlice.findings.some((f) => f.id === 'JAVA_WIRE_FIELD_SWAP' && f.message.includes(jb.javaParamName))
            ? 'ALIGNED'
            : 'SWAPPED_OR_MISMATCHED')
          : 'JAVA_DECODER_UNRESOLVED',
      };
    }),
    s2cConsumers: clientSlice.s2cConsumers,
  };

  const variablesDoc = {
    schemaVersion: 'autoforge.variables.v1',
    actionQuery,
    variables: clientSlice.recoveredVariables,
  };

  const synthesizedContract = synthesizeContract({ actionQuery, clientSlice, javaSlice, manifestSources });
  const rulesDoc = {
    schemaVersion: 'autoforge.rules.v1',
    evidenceKind: 'STATIC_ANALYSIS',
    invariantStatus: 'REQUIRED_NOT_EXECUTED',
    actionQuery,
    catalogsConsulted: clientSlice.catalogBindings,
    numericFormulas: clientSlice.numericFormulas,
    clientValidationGuards: clientSlice.validationGuards,
    uiSelectionFilters: clientSlice.uiFilters,
    behavioralIR: {
      inputs: clientSlice.recoveredVariables.map((v) => ({
        name: v.protobufField ?? v.originalName,
        role: v.recoveredRole,
        type: v.inferredType,
        unit: v.unit,
      })),
      preconditions: clientSlice.validationGuards.map((g) => g.condition),
      catalogLookups: clientSlice.catalogBindings.map((c) => c.tableName),
      transactionalInvariants: [
        'Validate catalog recipe, item level, and free bag slots BEFORE consuming source items.',
        'Execute source consumption, currency deduction, and target grant in a single ACID transaction.',
        'Enforce operationId idempotency so duplicate C2S frames cannot double-charge or duplicate items.',
        'Emit S2C response + U_C_BAG_MOVE_UPDATE after commit and trigger LayaAir list.refresh().',
      ],
    },
    synthesizedContract,
  };

  // Generate standalone executable differential tests in tests/
  const testsDir = join(outDir, 'tests');
  mkdirSync(testsDir, { recursive: true });

  const safeSlug = actionQuery.toLowerCase().replace(/[^a-z0-9_-]+/g, '-') || 'action';
  const javaCls = pascalCase(actionQuery) + 'DifferentialTest';

  // These checks validate package integrity only. They do not execute checkout code.
  const reproTestJs = [
    '// Auto-generated artifact checks. Runtime behavior remains unverified.',
    "import test from 'node:test';",
    "import assert from 'node:assert/strict';",
    "import { readFileSync } from 'node:fs';",
    "import { createHash } from 'node:crypto';",
    "const manifest = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));",
    "test('package artifact hashes match manifest', () => {",
    "  for (const [path, expected] of Object.entries(manifest.artifacts)) {",
    "    const bytes = readFileSync(new URL('../' + path, import.meta.url));",
    "    assert.equal(createHash('sha256').update(bytes).digest('hex'), expected, path);",
    "  }",
    "});",
    "test('runtime transaction, S2C and UI behavior', {skip: 'Requires reviewed runtime adapter, disposable database, and captured UI evidence.'}, () => {});",
    '',
  ].join('\n');

  const javaTestCode = [
    'package com.wartuneultra.autoforge.v2;',
    '',
    '/** Integration placeholder. No backend, transaction or inventory behavior is exercised. */',
    'public final class ' + javaCls + ' {',
    '    public static void main(String[] args) {',
    '        throw new UnsupportedOperationException("UNVERIFIED: supply reviewed backend/database/runtime adapters before executing integration checks.");',
    '    }',
    '}',
    '',
  ].join('\n');

  const casesDoc = {
    schemaVersion: 1,
    cases: [
      {
        id: safeSlug,
        title: `Vertical slice verification for ${actionQuery}`,
        priority: 'now',
        steps: [
          {
            id: 'wire-decode',
            measure: 'json',
            capture: `Decoded protobuf fields for ${actionQuery}`,
            symbols: ['decode'],
          },
          {
            id: 'bag-state',
            measure: 'inventory',
            capture: 'Inventory conservation before/after transaction (including Lv.12 and unrelated stacks)',
            symbols: ['transform', 'compose', 'enchant'],
          },
        ],
      },
    ],
  };

  writeFileSync(join(testsDir, `${safeSlug}.repro.test.mjs`), reproTestJs, { flag: 'wx' });
  writeFileSync(join(testsDir, `${javaCls}.java`), javaTestCode, { flag: 'wx' });
  writeFileSync(join(testsDir, 'cases.json'), JSON.stringify(casesDoc, null, 2) + '\n', { flag: 'wx' });

  // Write core JSON/text files first so we can compute their exact SHA-256 into manifest.json & validation.json
  const filesToWrite = [
    ['flow.json', JSON.stringify(flow, null, 2) + '\n'],
    ['flow.md', buildFlowMarkdown(flow, { sources: manifestSources })],
    ['variables.json', JSON.stringify(variablesDoc, null, 2) + '\n'],
    ['protocol.json', JSON.stringify(protocolDoc, null, 2) + '\n'],
    ['rules.json', JSON.stringify(rulesDoc, null, 2) + '\n'],
    ['implementation.patch', implementationPatch],
  ];

  const artifactDigests = {};
  for (const [name, content] of filesToWrite) {
    writeFileSync(join(outDir, name), content, { flag: 'wx' });
    artifactDigests[name] = sha256(content);
  }
  artifactDigests[`tests/${safeSlug}.repro.test.mjs`] = sha256(reproTestJs);
  artifactDigests[`tests/${javaCls}.java`] = sha256(javaTestCode);
  artifactDigests['tests/cases.json'] = sha256(readFileSync(join(testsDir, 'cases.json')));

  const validationDoc = {
    schemaVersion: 'autoforge.validation.v1',
    actionQuery,
    identity: {
      backendCommit: javaSlice.git?.commit ?? null,
      backendDirty: javaSlice.git?.dirty ?? false,
      nodeVersion: process.version,
    },
    claims: { analysis: 'STATIC_ONLY', clientRuntime: 'NOT_RUN', javaRuntime: 'NOT_RUN', database: 'NOT_RUN', ui: 'NOT_RUN', patchApplication: 'NOT_RUN', patchReview: 'REQUIRED' },
    repro: reproReport,
    artifactDigests,
    remainingChecks: [
      ...(flow.captureQuestions.map((q) => `[CAPTURE] ${q.question}`)),
      'Substituir o placeholder Java por testes de integracao com adapters revisados; nenhum backend foi executado.',
      'Validar persistência em banco descartável (MariaDB/MySQL) + idempotência + S2C após relogin.',
    ],
  };
  const validationStr = JSON.stringify(validationDoc, null, 2) + '\n';
  writeFileSync(join(outDir, 'validation.json'), validationStr, { flag: 'wx' });
  artifactDigests['validation.json'] = sha256(validationStr);

  const arenaTxt = [
    `========================================================================`,
    `AUTOFORGE VERTICAL-SLICE PACKAGE — ACAO: ${actionQuery}`,
    `========================================================================`,
    ``,
    `1. IDENTIDADE E FONTES ESTATICAS`,
    `   - Client root : ${clientIndex.root} (${clientIndex.jsFiles.length} JS, ${clientIndex.protoFiles.length} Proto, ${clientIndex.catalogs.length} Catalogos)`,
    `   - Backend root: ${javaSlice.git?.commit ? `${javaSlice.git.commit} (dirty=${javaSlice.git.dirty})` : 'NAO FORNECIDO / SEM GIT'}`,
    `   - Cobertura   : ${flow.summary.completenessPercent}% (${flow.summary.handledStages}/${flow.summary.totalStages} etapas)`,
    `   - Status Repro: ${reproReport.summary.overallStatus}`,
    ``,
    `2. DEFEITOS DETECTADOS AUTOMATICAMENTE`,
    ...(clientSlice.clientDefects.length || javaSlice.findings.length
      ? [
          ...clientSlice.clientDefects.map((d) => `   [CLIENT/${d.severity}] ${d.id}: ${d.message}`),
          ...javaSlice.findings.map((f) => `   [JAVA/${f.severity}]   ${f.id}: ${f.message}`),
        ]
      : ['   Nenhum defeito estatico/wire automatico encontrado nas etapas resolvidas.']),
    ``,
    `3. ORDEM DE APLICACAO PARA O ARENA`,
    `   Passo 1: Conferir hashes SHA-256 em manifest.json contra o checkout ativo.`,
    `   Passo 2: Executar somente os checks de integridade dos artefatos:`,
    `            node --test tests/${safeSlug}.repro.test.mjs`,
    `   Passo 3: Revisar manualmente implementation.patch; aplicacao automatica desativada. O extrator nao aplica patches.`,
    `   Passo 4: Caso precise gerar novo nucleo transacional Java 21, usar rules.json -> synthesizedContract com:`,
    `            node studio/autoforge.mjs generate --contract rules.contract.json --backend <JAVA_DIR> --out <OUT_DIR>`,
    `   Passo 5: Implementar testes reais com adapters revisados e validar em banco descartavel; o arquivo Java e um placeholder.`,
    ``,
    `4. CONTRATOS E INVARIANTES A PRESERVAR`,
    `   - Validar catalogo, nivel do item (ex: Nivel 12), posse e espaco na bolsa ANTES de consumir itens.`,
    `   - Executar consumo + cobranca + concessao na mesma transacao ACID com chave de idempotencia.`,
    `   - Emitir S2C de resposta + sincronizacao de bolsa (U_C_BAG_MOVE_UPDATE) e disparar refresh na UI LayaAir.`,
    ``,
    `5. VERIFICACOES RESTANTES / PERGUNTAS DE CAPTURA`,
    ...validationDoc.remainingChecks.map((c) => `   - ${c}`),
    ``,
  ].join('\n');

  writeFileSync(join(outDir, 'ARENA.txt'), arenaTxt, { flag: 'wx' });
  artifactDigests['ARENA.txt'] = sha256(arenaTxt);

  const manifestDoc = {
    schemaVersion: 'autoforge.vertical-slice.v1',
    actionQuery,
    sources: manifestSources,
    coverage: {
      ...flow.summary,
      evidenceKind: 'STATIC_ANALYSIS',
      runtime: 'NOT_RUN',
      unresolvedQuestionCount: flow.captureQuestions.length,
      status: flow.summary.unresolvedStages === 0 && flow.captureQuestions.length === 0
        ? 'COMPLETE_STATIC_MAP'
        : flow.summary.handledStages > 0
          ? 'PARTIAL_NEEDS_CAPTURE'
          : 'UNVERIFIED',
    },
    artifacts: artifactDigests,
  };

  writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifestDoc, null, 2) + '\n', { flag: 'wx' });
  return { manifest: manifestDoc, flow, reproReport };
}
