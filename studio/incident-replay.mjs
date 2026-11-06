import {mkdirSync, writeFileSync, existsSync} from 'node:fs';
import {join} from 'node:path';
import {canonical, normalizeInventory} from './equivalence.mjs';
import {artifactJson, digest, HASH, COMMIT} from './learning/evidence.mjs';
import {json, output, save, readBounded} from './items/lib.mjs';
import {findIncidentAnchors} from './incident-anchors.mjs';

const ID = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function validateCases(input) {
  if (input?.schemaVersion !== 1 || !Array.isArray(input.cases) || !input.cases.length || input.cases.length > 100) throw Error('Expected 1..100 incident cases');
  const ids = new Set();
  for (const entry of input.cases) {
    if (!ID.test(entry.id) || ids.has(entry.id) || typeof entry.title !== 'string' || !['now', 'preserve', 'later'].includes(entry.priority)) throw Error('Invalid/repeated incident identity');
    ids.add(entry.id);
    if (!Array.isArray(entry.steps) || !entry.steps.length || entry.steps.length > 100) throw Error('Expected 1..100 ordered incident steps');
    const steps = new Set();
    for (const step of entry.steps) {
      if (!ID.test(step.id) || steps.has(step.id) || !['json', 'inventory'].includes(step.measure) || typeof step.capture !== 'string' || !Array.isArray(step.symbols) || step.symbols.length > 10 || step.symbols.some(s => !/^[A-Za-z_$][A-Za-z0-9_$]{0,127}$/.test(s))) throw Error('Invalid incident step');
      steps.add(step.id);
    }
  }
  return input.cases;
}

function validateRecord(record, role, entry) {
  const identity = record.identity;
  const sourceReplay = identity?.environment?.kind === 'SOURCE_REPLAY';
  if (record.schemaVersion !== 1 || record.role !== role || record.caseId !== entry.id || record.contractDigest !== digest(entry)) throw Error('Record role/case/contract mismatch');
  if (!(COMMIT.test(identity?.commit ?? '') || sourceReplay && HASH.test(identity?.sourceSha256 ?? '')) || !identity?.testId || !identity?.environment?.name || !identity?.environment?.kind) throw Error('Commit/source, environment and test identity required');
  if (!HASH.test(record.clientDigest ?? '') || !object(record.action) || typeof record.action.type !== 'string' || !object(record.action.inputs) || !object(record.preconditions)) throw Error('Client digest, semantic action and preconditions required');
  if (!record.sessionId || !record.operationId || !Array.isArray(record.steps) || record.steps.length > entry.steps.length) throw Error('Correlated operation and bounded steps required');
  const seen = new Set();
  let previous = -1;
  for (const step of record.steps) {
    const position = entry.steps.findIndex(s => s.id === step.id);
    if (position < 0 || position <= previous || seen.has(step.id) || step.sessionId !== record.sessionId || step.operationId !== record.operationId) throw Error('Unknown, unordered, duplicate or uncorrelated step');
    previous = position;
    seen.add(step.id);
    if (step.value !== null && step.value !== undefined) canonical(step.value);
  }
}

function inventoryDelta(value) {
  const before = normalizeInventory(value.before);
  const after = normalizeInventory(value.after);
  const delta = Object.create(null);
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const change = (after[key] ?? 0) - (before[key] ?? 0);
    if (!Number.isSafeInteger(change)) throw Error('Inventory delta overflow');
    if (change) delta[key] = change;
  }
  return {before, delta};
}

function differences(expected, actual, path = '', result = []) {
  if (canonical(expected) === canonical(actual) || result.length >= 30) return result;
  if (object(expected) && object(actual)) {
    for (const key of new Set([...Object.keys(expected), ...Object.keys(actual)])) {
      const child = path + '/' + key.replaceAll('~', '~0').replaceAll('/', '~1');
      if (!Object.hasOwn(expected, key) || !Object.hasOwn(actual, key)) result.push({path: child, expected: expected[key] ?? null, actual: actual[key] ?? null, missingSide: !Object.hasOwn(expected, key) ? 'reference' : 'candidate'});
      else differences(expected[key], actual[key], child, result);
      if (result.length >= 30) break;
    }
  } else result.push({path: path || '/', expected, actual});
  return result;
}

export function compareIncident(entry, reference, candidate) {
  validateRecord(reference, 'reference', entry);
  validateRecord(candidate, 'candidate', entry);
  for (const field of ['clientDigest', 'action', 'preconditions']) {
    if (canonical(reference[field]) !== canonical(candidate[field])) return {status: 'INCOMPARABLE', reason: field + ' differs; reproduce equivalent conditions', steps: []};
  }
  if (reference.identity.environment.kind !== candidate.identity.environment.kind) return {status: 'INCOMPARABLE', reason: 'Evidence execution kinds differ', steps: []};
  const steps = [];
  for (const specification of entry.steps) {
    const left = reference.steps.find(s => s.id === specification.id);
    const right = candidate.steps.find(s => s.id === specification.id);
    if (left?.value == null || right?.value == null) {
      steps.push({id: specification.id, status: 'NEEDS_CAPTURE', capture: specification.capture});
      continue;
    }
    let expected = left.value;
    let actual = right.value;
    if (specification.measure === 'inventory') {
      const referenceState = inventoryDelta(expected);
      const candidateState = inventoryDelta(actual);
      if (canonical(referenceState.before) !== canonical(candidateState.before)) {
        steps.push({id: specification.id, status: 'INCOMPARABLE', reason: 'Initial full inventories differ'});
        continue;
      }
      expected = referenceState.delta;
      actual = candidateState.delta;
    }
    const diff = differences(expected, actual);
    steps.push({id: specification.id, status: diff.length ? 'DIVERGENT' : 'MATCH_RECORDED', differences: diff});
  }
  const firstDifference = steps.find(s => s.status === 'DIVERGENT') ?? null;
  const firstGap = steps.find(s => ['NEEDS_CAPTURE', 'INCOMPARABLE'].includes(s.status)) ?? null;
  return {
    status: firstDifference ? 'DIVERGENT' : firstGap ? 'NEEDS_CAPTURE' : 'MATCH_RECORDED',
    firstDifference, firstGap, earliestBoundaryCertain: !!firstDifference && (!firstGap || steps.indexOf(firstDifference) < steps.indexOf(firstGap)),
    steps, identities: {reference: reference.identity, candidate: candidate.identity},
    scope: reference.identity.environment.kind,
  };
}

function skeleton(entry, role) {
  return {
    schemaVersion: 1, role, caseId: entry.id, contractDigest: digest(entry),
    identity: {commit: null, environment: {name: null, kind: 'RUNTIME'}, testId: null},
    clientDigest: null, action: {type: entry.id, inputs: {}}, preconditions: {}, sessionId: null, operationId: null,
    steps: entry.steps.map(s => ({id: s.id, sessionId: null, operationId: null, value: null})),
  };
}

export function runIncidentReplay({cases, evidence, backend, out, demo = false}) {
  const entries = validateCases(cases);
  const symbols = [...new Set(entries.flatMap(c => c.steps.flatMap(s => s.symbols)))];
  let navigation = null;
  if (backend) navigation = findIncidentAnchors(backend, symbols);
  const reports = entries.map(entry => {
    const base = {id: entry.id, title: entry.title, priority: entry.priority, contractDigest: digest(entry)};
    if (!evidence || !existsSync(join(evidence, entry.id + '.json'))) return {...base, status: 'NEEDS_CAPTURE', steps: entry.steps.map(s => ({id: s.id, status: 'NEEDS_CAPTURE', capture: s.capture}))};
    try {
      const index = json(join(evidence, entry.id + '.json'));
      if (index.reference?.sha256 === index.candidate?.sha256) throw Error('Reference and candidate artifacts must be distinct');
      const reference = artifactJson(evidence, index.reference);
      const candidate = artifactJson(evidence, index.candidate);
      return {...base, ...compareIncident(entry, reference, candidate), artifacts: index};
    } catch (error) {
      return {...base, status: 'EVIDENCE_INVALID', reason: error.message, steps: []};
    }
  });
  for (const report of reports) {
    const entry = entries.find(e => e.id === report.id);
    const step = entry.steps.find(s => s.id === (report.firstDifference?.id ?? report.firstGap?.id)) ?? entry.steps[0];
    report.nextCapture = step.capture;
    report.codeCandidates = step.symbols.flatMap(symbol => navigation?.bySymbol[symbol] ?? []);
    report.codeBinding = navigation && report.identities?.candidate?.commit === navigation.commit ? 'COMMIT_MATCH_RECHECK_WORKTREE_AND_CALL_PATH' : 'CHECKOUT_NAVIGATION_ONLY';
  }
  const directory = output(out, [evidence, backend].filter(Boolean));
  mkdirSync(join(directory, 'coleta'));
  for (const entry of entries) save(join(directory, 'coleta'), entry.id + '.json', {reference: skeleton(entry, 'reference'), candidate: skeleton(entry, 'candidate')});
  const report = {schemaVersion: 'autoforge.incident-replay.v1', status: reports.some(r => r.status === 'DIVERGENT') ? 'DIVERGENT' : reports.every(r => r.status === 'MATCH_RECORDED') ? 'MATCH_RECORDED' : 'NEEDS_CAPTURE', demo, cases: reports, navigation, executionAttested: false};
  save(directory, 'report.json', report);
  save(directory, 'cases.json', cases);
  const lines = ['# Diagnóstico por ação reproduzível', '', 'Compare a mesma ação e as mesmas condições. Reexecute a candidata corrigida com a referência preservada.', ''];
  for (const item of reports) {
    lines.push('## ' + item.title, '', 'Estado: ' + item.status, '', 'Contrato: `' + item.contractDigest + '`', '');
    if (item.firstDifference) lines.push('Primeira diferença observada: `' + item.firstDifference.id + '`', '', '```json', JSON.stringify(item.firstDifference.differences, null, 2), '```', '');
    if (item.firstGap) lines.push('Coleta pendente anterior ou posterior: `' + item.firstGap.id + '`', '');
    if (item.reason) lines.push(item.reason, '');
    lines.push('Capturar: ' + item.nextCapture, '', 'Métodos candidatos: ' + (item.codeCandidates.map(c => c.path + ':' + c.startLine + ' ' + c.method).join(', ') || 'fornecer checkout e confirmar os símbolos'), '');
  }
  lines.push('Confira hash/commit dos métodos e a ligação com o pedido antes de editar. Preserve os casos priority=preserve. Registre artefatos da candidata depois da correção e rode este mesmo comando novamente. Resultados SOURCE_REPLAY cobrem a execução isolada dos trechos. Resultados RUNTIME dependem da captura identificada do jogo. Hashes verificam os bytes entregues, sem autenticar quem executou o teste.', '');
  writeFileSync(join(directory, 'ARENA.md'), lines.join('\n'), {flag: 'wx'});
  return report;
}
