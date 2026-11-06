import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {compareIncident, runIncidentReplay} from '../incident-replay.mjs';
import {digest} from '../learning/evidence.mjs';

const entry = {id:'convert',title:'Conversion',priority:'now',steps:[
  {id:'decode',measure:'json',capture:'Source and target fields',symbols:['decode']},
  {id:'bag',measure:'inventory',capture:'Full inventory before/after',symbols:['transform']},
]};
function record(role) {
  const sessionId = role;
  const operationId = 'convert-1';
  return {schemaVersion:1,role,caseId:entry.id,contractDigest:digest(entry),
    identity:{commit:'a'.repeat(40),testId:role,environment:{name:role,kind:'UNIT_TEST'}},
    clientDigest:'b'.repeat(64),action:{type:'convert',inputs:{source:1,target:2}},preconditions:{level:12},sessionId,operationId,
    steps:[{id:'decode',sessionId,operationId,value:{source:1,target:2}},
      {id:'bag',sessionId,operationId,value:{before:[{templateId:1,bound:true,quantity:1},{templateId:3,bound:false,quantity:5}],after:[{templateId:2,bound:true,quantity:1},{templateId:3,bound:false,quantity:5}]}}]};
}
test('locates reversed wire fields before bag effects and accepts corrected replay',()=>{
  const ref=record('reference'),candidate=record('candidate');
  candidate.steps[0].value={source:2,target:1};
  const failed=compareIncident(entry,ref,candidate);
  assert.equal(failed.firstDifference.id,'decode');
  assert.equal(failed.firstDifference.differences[0].path,'/source');
  candidate.steps[0].value={source:1,target:2};
  assert.equal(compareIncident(entry,ref,candidate).status,'MATCH_RECORDED');
});
test('detects loss of unrelated items and refuses different starting inventories',()=>{
  const ref=record('reference'),candidate=record('candidate');
  candidate.steps[1].value.after.pop();
  const report=compareIncident(entry,ref,candidate);
  assert.equal(report.firstDifference.id,'bag');
  assert.equal(report.firstDifference.differences[0].actual,-5);
  candidate.steps[1].value.before[1].quantity=10;
  assert.equal(compareIncident(entry,ref,candidate).status,'NEEDS_CAPTURE');
});
test('missing earlier stage prevents claiming earliest difference and input drift blocks comparison',()=>{
  const ref=record('reference'),candidate=record('candidate');
  candidate.steps[0].value=null;
  candidate.steps[1].value.after.pop();
  assert.equal(compareIncident(entry,ref,candidate).earliestBoundaryCertain,false);
  candidate.action.inputs.target=4;
  assert.equal(compareIncident(entry,ref,candidate).status,'INCOMPARABLE');
  candidate.action=ref.action;
  candidate.steps[1].sessionId='other';
  assert.throws(()=>compareIncident(entry,ref,candidate),/uncorrelated/);
});
test('normal command path validates artifact hashes and emits collection plan when evidence is absent',async t=>{
  const root=mkdtempSync(join(tmpdir(),'af-incident-test-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const artifacts={};
  for(const role of ['reference','candidate']){
    const bytes=Buffer.from(JSON.stringify(record(role)));
    writeFileSync(join(root,role+'.json'),bytes);
    artifacts[role]={path:role+'.json',sha256:digest(bytes)};
  }
  writeFileSync(join(root,'convert.json'),JSON.stringify(artifacts));
  const cases={schemaVersion:1,cases:[entry]};
  assert.equal(runIncidentReplay({cases,evidence:root,out:join(tmpdir(),'af-incident-result-'+Date.now())}).status,'MATCH_RECORDED');
  // Every generated output is isolated from the evidence root.
  const plan=join(tmpdir(),'af-incident-plan-'+Date.now());
  t.after(()=>rmSync(plan,{recursive:true,force:true}));
  assert.equal(runIncidentReplay({cases,out:plan}).cases[0].status,'NEEDS_CAPTURE');
  writeFileSync(join(root,'candidate.json'),'{}');
  const invalid=join(tmpdir(),'af-incident-invalid-'+Date.now());
  t.after(()=>rmSync(invalid,{recursive:true,force:true}));
  assert.equal(runIncidentReplay({cases,evidence:root,out:invalid}).cases[0].status,'EVIDENCE_INVALID');
});
