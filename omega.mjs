#!/usr/bin/env node
/** AutoForge OMEGA — read-only, evidence-led orchestration. */
import { randomUUID } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync, renameSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runExtractFlow } from './studio/slice/extract-flow.mjs';
import { runScan } from './plus/plus.mjs';
import { discover } from './discover.mjs';
import { scanBackend, buildGapMatrix } from './studio/next/gaps.mjs';
import { readCapture } from './studio/flight-recorder.mjs';

const HELP = `AutoForge OMEGA — single-command static investigation (Node >=22)
  node omega.mjs focus  --client CLIENT_DIR --backend JAVA_DIR --action ACTION [--opcode ID] [--out WORKSPACE]
  node omega.mjs verify --client CLIENT_DIR --backend JAVA_DIR --action ACTION [--opcode ID] [--out WORKSPACE]
  node omega.mjs radar  --client CLIENT_DIR --backend JAVA_DIR [--capture CAPTURE_DIR] [--match REGEX] [--out WORKSPACE]

Workspace: by default, a sibling of JAVA_DIR named autoforge-omega-workspace.
Outputs: runs/<unique-id>/OMEGA_MISSION.{md,json} and LATEST_MISSION.{md,json}.
These commands NEVER apply code, deploy, mutate the database, run gameplay, or certify runtime equivalence.
The 'verify' command reruns STATIC checks only; browser/JVM/DB/UI verification remains separate.`;
const ALLOWED = new Set(['client', 'backend', 'action', 'opcode', 'out', 'capture', 'match']);

export function parseCli(argv) {
  if (!argv.length || argv[0] === '--help') return { cmd: 'help', opts: {} };
  const [cmd = 'help', ...rest] = argv;
  const opts = {};
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === '--help') return { cmd: 'help', opts: {} };
    if (!arg.startsWith('--')) throw Error(`Unexpected argument: ${arg}`);
    const equal = arg.indexOf('=');
    const key = equal < 0 ? arg.slice(2) : arg.slice(2, equal);
    if (!ALLOWED.has(key)) throw Error(`Unknown option: --${key}`);
    if (Object.hasOwn(opts, key)) throw Error(`Repeated option: --${key}`);
    const value = equal < 0 ? rest[++i] : arg.slice(equal + 1);
    if (!value || value.startsWith('--')) throw Error(`Missing value: --${key}`);
    opts[key] = value;
  }
  return { cmd, opts };
}

function required(opts, key) {
  if (!opts[key]) throw Error(`--${key} is required`);
  return resolve(opts[key]);
}
function inside(parent, candidate) {
  const r = relative(parent, candidate);
  return !r || (r !== '..' && !r.startsWith(`..${sep}`) && !isAbsolute(r));
}
function realDirectory(value, label) {
  const p = resolve(value);
  if (!existsSync(p) || !lstatSync(p).isDirectory()) throw Error(`${label} must be an existing directory: ${p}`);
  return realpathSync(p);
}
function workspace(opts, client, backend) {
  const base = resolve(opts.out ?? join(dirname(backend), 'autoforge-omega-workspace'));
  const canonical = existsSync(base) ? realpathSync(base) : base;
  if (inside(client, canonical) || inside(backend, canonical)) {
    throw Error('Workspace must be outside the client and backend trees');
  }
  if (existsSync(base) && !lstatSync(base).isDirectory()) throw Error('Workspace must be a directory');
  mkdirSync(join(base, 'runs'), { recursive: true });
  const runDir = join(base, 'runs', `run-${Date.now()}-${randomUUID().slice(0, 8)}`);
  mkdirSync(runDir);
  return { base, runDir };
}
function saveNew(path, body) { writeFileSync(path, body, { flag: 'wx' }); }
function saveLatest(base, filename, body) {
  const dest = join(base, filename), temp = join(base, `.${filename}.${randomUUID()}.tmp`);
  saveNew(temp, body);
  renameSync(temp, dest);
}
function loadPrevious(base) {
  try { return JSON.parse(readFileSync(join(base, 'LATEST_MISSION.json'), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
const keyOf = finding => [finding?.id ?? finding?.code ?? finding?.kind ?? 'unknown', finding?.file ?? finding?.path ?? finding?.javaFile ?? finding?.clientFile ?? ''].join('|');

export function compareMissions(previous, current) {
  if (!previous) return { status: 'NO_BASELINE', comparable: false };
  if (previous.action !== current.action || previous.client !== current.client || previous.backend !== current.backend || previous.requestedOpcode !== current.requestedOpcode) {
    return { status: 'BASELINE_MISMATCH', comparable: false };
  }
  const before = new Set((previous.defects ?? []).map(keyOf));
  const after = new Set((current.defects ?? []).map(keyOf));
  return {
    status: 'COMPARABLE_STATIC_SNAPSHOTS', comparable: true,
    previousDefects: (previous.defects ?? []).length,
    currentDefects: (current.defects ?? []).length,
    newlyDetected: [...after].filter(x => !before.has(x)),
    noLongerDetected: [...before].filter(x => !after.has(x)),
    previousPlus: previous.plusResult,
    currentPlus: current.plusResult,
  };
}

export function classifyStatic({ defects, plusResult, plusSummary, reproSummary }) {
  if (plusResult === 'FAIL') return 'STATIC_GUARD_FAILURE';
  if ((defects?.length ?? 0) > 0 || (reproSummary?.staticFindingsDetected ?? 0) > 0) return 'STATIC_FINDINGS_REQUIRE_REVIEW';
  if ((plusSummary?.SKIP ?? 0) > 0 || plusResult === 'WARN') return 'STATIC_INCOMPLETE_REQUIRES_REVIEW';
  return 'STATIC_NO_FINDINGS_RUNTIME_UNVERIFIED';
}

export function priorityTargets(rows, limit = 10) {
  return (rows ?? []).filter(x => x.severity !== 'info').slice(0, limit).map(x => ({
    name: x.name,
    opcode: (x.clientValues ?? []).find(Number.isSafeInteger) ?? null,
    severity: x.severity,
    status: x.status,
    observed: x.observed ?? null,
    server: x.server ?? null,
    classification: 'CANDIDATE_ONLY_NOT_A_PROVEN_BUG',
  }));
}
function trim(s, max = 320) { return String(s ?? '').replace(/\s+/g, ' ').slice(0, max); }
export function renderMissionMarkdown(m) {
  const lines = [
    '# OMEGA — Dossiê estático para o Arena', '',
    `- **Modo:** ${m.mode} | **Classificação:** ${m.verdict}`,
    `- **Ação:** ${m.action} | **C2S extraído:** ${m.c2sOpcode ?? 'não identificado'}`,
    `- **Cobertura:** ${m.sliceStatus} | **Plus:** ${m.plusResult}`,
    `- **Validação real:** NÃO EXECUTADA (cliente, JVM, DB, S2C e UI)`, '',
  ];
  if (m.delta) {
    lines.push('## Comparação estática com a execução anterior',
      `- Estado: ${m.delta.status}`);
    if (m.delta.comparable) lines.push(
      `- Achados anteriores: ${m.delta.previousDefects}; atuais: ${m.delta.currentDefects}`,
      `- Novos: ${m.delta.newlyDetected.join(', ') || 'nenhum'}; não detectados agora: ${m.delta.noLongerDetected.join(', ') || 'nenhum'}`);
    lines.push('');
  }
  lines.push('## Achados da fatia cliente ↔ Java');
  if (!m.defects.length) lines.push('- Nenhum defeito estático identificado. **Isso não prova gameplay funcional.**');
  for (const [i, d] of m.defects.slice(0, 20).entries()) {
    lines.push(`${i + 1}. **${trim(d.id ?? d.code ?? d.kind ?? 'FINDING', 75)}:** ${trim(d.message ?? d.description ?? d.summary ?? JSON.stringify(d))}`);
  }
  if (m.defects.length > 20) lines.push(`- Outros ${m.defects.length - 20} achados: veja ${m.sliceOutDir}/flow.json`);
  lines.push('', '## Plus: protocolo, banco e wiring',
    `- Resultado: ${m.plusResult} (PASS ${m.plusSummary?.PASS ?? 0}; WARN ${m.plusSummary?.WARN ?? 0}; FAIL ${m.plusSummary?.FAIL ?? 0}; SKIP ${m.plusSummary?.SKIP ?? 0})`);
  if (m.plusFirstFailure) lines.push(`- Primeira falha: ${trim(m.plusFirstFailure.check)} / ${trim(m.plusFirstFailure.code)} — ${trim(m.plusFirstFailure.message)}`);
  for (const h of m.plusHighlights.slice(0, 12)) lines.push(`- ${trim(h.check)}/${trim(h.level)} ${trim(h.code)}: ${trim(h.message)}`);
  lines.push('', '## Reprodução diferencial (limite de evidência)',
    `- ${JSON.stringify(m.reproSummary ?? {status:'UNAVAILABLE'})}`,
    '- Fonte/AST/simulação simbólica ≠ execução real do Java nem equivalência comprovada.', '',
    '## Próxima ação',
    `1. Examine ${m.sliceOutDir}/ARENA.md e flow.json; preserve os hashes das fontes.`,
    '2. Investigue só os handlers/serviços realmente ligados à ação; não presuma que todo aviso é um bug.',
    '3. Após a edição, execute `omega verify` com os mesmos parâmetros de ação, opcode, cliente, backend e workspace.',
    '4. Valide separadamente: C2S → handler → banco → S2C → UI → relogin. Não declare PASS sem essa prova.',
  );
  return lines.slice(0, 115).join('\n') + '\n';
}

export async function runFocusOrVerify(mode, opts) {
  const client = realDirectory(required(opts, 'client'), 'Client');
  const backend = realDirectory(required(opts, 'backend'), 'Backend');
  const action = opts.action?.trim();
  if (!action) throw Error('--action is required');
  const opcode = opts.opcode === undefined ? null : Number(opts.opcode);
  if (opcode !== null && (!Number.isSafeInteger(opcode) || opcode <= 0)) throw Error('--opcode must be a positive integer');
  const { base, runDir } = workspace(opts, client, backend);
  const previous = mode === 'verify' ? loadPrevious(base) : null;
  const sliceOutDir = join(runDir, 'slice-package');
  const plusOutDir = join(runDir, 'plus-scan');
  const slice = runExtractFlow({ client, backend, action, opcode, out: sliceOutDir });
  const plus = await runScan({ client, backend, out: plusOutDir });
  const defects = slice.defectsFound ?? [];
  const mission = {
    schemaVersion: 'autoforge.omega.v1', generatedAt: new Date().toISOString(), mode: mode.toUpperCase(),
    action, requestedOpcode: opcode, c2sOpcode: slice.c2sOpcode, client, backend, runDir,
    sliceOutDir, plusOutDir, sliceStatus: slice.status, coverage: slice.coverage,
    defects, captureQuestions: slice.captureQuestions ?? [], reproSummary: slice.reproSummary ?? null,
    plusResult: plus.result, plusSummary: plus.summary, plusFirstFailure: plus.firstFailure,
    plusHighlights: (plus.checks ?? []).flatMap(c => (c.findings ?? [])
      .filter(f => f.level === 'FAIL' || f.level === 'WARN')
      .map(f => ({check:c.id, level:f.level, code:f.code, message:f.message}))),
    runtime: {clientExecuted:false, javaExecuted:false, databaseTested:false, uiVerified:false, status:'NOT_TESTED'},
  };
  mission.verdict = classifyStatic(mission);
  if (mode === 'verify') mission.delta = compareMissions(previous, mission);
  const markdown = renderMissionMarkdown(mission), json = JSON.stringify(mission, null, 2) + '\n';
  saveNew(join(runDir, 'OMEGA_MISSION.md'), markdown);
  saveNew(join(runDir, 'OMEGA_MISSION.json'), json);
  saveLatest(base, 'LATEST_MISSION.md', markdown);
  saveLatest(base, 'LATEST_MISSION.json', json);
  return { ...mission, markdown };
}

export async function runRadar(opts) {
  const client = realDirectory(required(opts, 'client'), 'Client');
  const backend = realDirectory(required(opts, 'backend'), 'Backend');
  const { base, runDir } = workspace(opts, client, backend);
  const discovery = discover(client);
  const backendScan = await scanBackend(backend);
  const events = opts.capture ? readCapture(realDirectory(opts.capture, 'Capture')).events : [];
  const gapMatrix = buildGapMatrix({ discovery, backend: backendScan, events, match: opts.match ?? null });
  const plus = await runScan({ client, backend, out: join(runDir, 'plus-scan') });
  const targets = priorityTargets(gapMatrix.rows);
  const next = targets.find(x => x.opcode !== null);
  const radar = {
    schemaVersion: 'autoforge.omega.radar.v1', generatedAt: new Date().toISOString(),
    status: 'TRIAGE_CANDIDATES_NOT_VERIFIED', client, backend,
    gapSummary: gapMatrix.summary, plusSummary: plus.summary, plusResult: plus.result,
    plusFirstFailure: plus.firstFailure, priorityTargets: targets,
    nextStepCommand: next ? `node omega.mjs focus --client "${client}" --backend "${backend}" --action "${next.name}" --opcode ${next.opcode}` : null,
    limitations: ['Lexical gaps do not prove missing handlers.', 'Transport WebSocket opcode is not the game opcode.', 'No backend, DB or UI execution was performed.'],
  };
  const data = JSON.stringify(radar, null, 2) + '\n';
  saveNew(join(runDir, 'OMEGA_RADAR.json'), data);
  saveLatest(base, 'LATEST_RADAR.json', data);
  return radar;
}

export async function main(argv) {
  const { cmd, opts } = parseCli(argv);
  if (cmd === 'help') { console.log(HELP); return {status:'HELP'}; }
  if (cmd === 'focus' || cmd === 'verify') {
    const result = await runFocusOrVerify(cmd, opts);
    console.log(result.markdown);
    if (cmd === 'verify' && (result.verdict === 'STATIC_GUARD_FAILURE' || result.delta?.newlyDetected?.length)) process.exitCode = 1;
    return result;
  }
  if (cmd === 'radar') {
    const result = await runRadar(opts);
    console.log(JSON.stringify(result, null, 2));
    return result;
  }
  throw Error(`Unknown command: ${cmd}`);
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try { await main(process.argv.slice(2)); }
  catch (error) { console.error(`AutoForge OMEGA: ${error.message}`); process.exitCode = 1; }
}