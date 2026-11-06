import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCli, compareMissions, classifyStatic, priorityTargets, renderMissionMarkdown, main } from '../omega.mjs';

test('OMEGA help runs without modifying project', async () => {
  assert.equal((await main(['help'])).status, 'HELP');
  assert.equal((await main(['--help'])).status, 'HELP');
});

test('CLI parsing rejects missing, duplicated and unsupported flags', () => {
  assert.deepEqual(parseCli(['focus','--action=forge','--opcode','8538']),
    {cmd:'focus',opts:{action:'forge',opcode:'8538'}});
  assert.throws(() => parseCli(['focus','--client']), /Missing value/);
  assert.throws(() => parseCli(['focus','--action','a','--action','b']), /Repeated/);
  assert.throws(() => parseCli(['focus','--erase','all']), /Unknown option/);
});

test('static clean status never claims runtime/gameplay pass', () => {
  assert.equal(classifyStatic({ defects:[], plusResult:'PASS', plusSummary:{SKIP:0}, reproSummary:{staticFindingsDetected:0} }),
    'STATIC_NO_FINDINGS_RUNTIME_UNVERIFIED');
  assert.equal(classifyStatic({ defects:[], plusResult:'PASS', plusSummary:{SKIP:2}, reproSummary:{staticFindingsDetected:0} }),
    'STATIC_INCOMPLETE_REQUIRES_REVIEW');
  assert.equal(classifyStatic({ defects:[{id:'foo'}], plusResult:'PASS', plusSummary:{SKIP:0} }),
    'STATIC_FINDINGS_REQUIRE_REVIEW');
  assert.equal(classifyStatic({ defects:[], plusResult:'FAIL', plusSummary:{SKIP:0} }),
    'STATIC_GUARD_FAILURE');
});

test('radar obtains the actual opcode from clientValues and ignores info-only rows', () => {
  assert.deepEqual(priorityTargets([
    {name:'U_C_X',clientValues:[8538],severity:'critical-candidate',status:'no-dispatch-evidence'},
    {name:'U_C_Y',clientValues:[5000],severity:'info',status:'switch-case-found'},
  ]).map(x => x.opcode), [8538]);
});

test('verify compares only matching action, paths and opcode', () => {
  const original = {action:'gem', client:'/client', backend:'/java',requestedOpcode:8538,defects:[{id:'A'},{id:'B'}],plusResult:'WARN'};
  const current = {...original,defects:[{id:'B'},{id:'C'}],plusResult:'PASS'};
  const delta = compareMissions(original,current);
  assert.equal(delta.comparable,true);
  assert.deepEqual(delta.newlyDetected,['C|']);
  assert.deepEqual(delta.noLongerDetected,['A|']);
  assert.equal(compareMissions(original,{...current,action:'forge'}).status,'BASELINE_MISMATCH');
  assert.equal(compareMissions(null,current).status,'NO_BASELINE');
});

test('dossier explicitly separates static findings from runtime verification', () => {
  const md = renderMissionMarkdown({mode:'VERIFY',verdict:'STATIC_NO_FINDINGS_RUNTIME_UNVERIFIED',action:'gem',
    c2sOpcode:8538,sliceStatus:'UNVERIFIED',plusResult:'PASS',plusSummary:{PASS:4},defects:[],
    plusHighlights:[],reproSummary:{overallStatus:'STATIC_ANALYSIS_ONLY'},sliceOutDir:'/tmp/flow'});
  assert.match(md,/Validação real:\*\* NÃO EXECUTADA/);
  assert.match(md,/Isso não prova gameplay funcional/);
  assert.doesNotMatch(md,/CONVERGED_PASS/);
});

test('unknown command fails', async () => {
  await assert.rejects(() => main(['arbitrary-command']),/Unknown command/);
});