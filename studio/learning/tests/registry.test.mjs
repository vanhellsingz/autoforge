import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {appendLearningEvent,readRegistry,validateCapability,REGRESSION_TESTS} from '../registry.mjs';import {buildAgentCapsule,capsuleMarkdown} from '../transfer.mjs';import {digest} from '../evidence.mjs';import {main} from '../autoforge.mjs';
function fixture(t){
 const root=mkdtempSync(join(tmpdir(),'af-memory-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const registry=join(root,'ledger'),evidenceRoot=join(root,'evidence');mkdirSync(evidenceRoot);
 const capability={id:'map.wait-release',revision:1,domain:'maps',summary:'A map request must release its wait on rejection',symptoms:['Endless map spinner'],cause:'Missing failure response or UI cleanup requires investigation',fix:'Inspect the exact rejection handler and consumer; preserve the successful scene transition',appliesTo:{backendCommit:'a'.repeat(40),sourceDigest:'b'.repeat(64),sourceHashes:[{path:'client.js',sha256:'c'.repeat(64)}]},preserve:['Character creation','Existing quest/reward transactions'],requiredTests:['map.rejection-release'],detectors:[{signal:'map.spinner',equals:true}],limits:['Fixture lesson; not proof of a Wartune defect']};
 let version=0;const append=(action,extra={})=>{const result=appendLearningEvent({registry,evidenceRoot,expectedVersion:version,event:{action,id:capability.id,actor:'reviewer',at:'2026-11-06T12:00:00Z',capabilityDigest:digest(capability),...extra}});version=result.version;return result;};
 function evaluate(checks=[...capability.requiredTests,...REGRESSION_TESTS]){
  const evidence={commit:capability.appliesTo.backendCommit,testId:'tool-fixture',environment:{name:'local',kind:'UNIT_TEST'},result:'passed',artifacts:[]};
  const report={schemaVersion:1,commit:evidence.commit,testId:evidence.testId,environment:evidence.environment,result:'passed',capabilityDigest:digest(capability),clientSourceDigest:capability.appliesTo.sourceDigest,checks:checks.map(id=>({id,result:'passed'}))};
  const bytes=Buffer.from(JSON.stringify(report));writeFileSync(join(evidenceRoot,'results.json'),bytes);evidence.artifacts=[{path:'results.json',sha256:digest(bytes),format:'json-report'}];return {capabilityDigest:digest(capability),evidence:[evidence]};
 }
 const stable=()=>{append('propose',{capability});append('evaluate',{evaluation:evaluate()});append('review',{note:'Reviewed sources and reported tests'});append('approve',{note:'Explicit fixture approval'});append('promote');};
 const context=()=>({backendCommit:capability.appliesTo.backendCommit,sourceDigest:capability.appliesTo.sourceDigest,sourceHashes:capability.appliesTo.sourceHashes,signals:{'map.spinner':true},domain:'maps'});
 return {root,registry,evidenceRoot,capability,append,evaluate,stable,context};
}
test('candidate cannot skip tests/review/approval; stable requires explicit complete lifecycle',t=>{
 const f=fixture(t);f.append('propose',{capability:f.capability});assert.throws(()=>f.append('promote'),/approval/);assert.throws(()=>f.append('approve',{note:'skip'}),/review/);f.append('evaluate',{evaluation:f.evaluate()});f.append('review',{note:'reviewed'});f.append('approve',{note:'approved'});f.append('promote');assert.equal(readRegistry(f.registry).capabilities[0].status,'stable');assert.equal(readRegistry(f.registry).version,5);
});
test('missing creation/arena regression checks block promotion at evaluation time',t=>{
 const f=fixture(t);f.append('propose',{capability:f.capability});assert.throws(()=>f.append('evaluate',{evaluation:f.evaluate(f.capability.requiredTests)}),/Missing required checks/);assert.equal(readRegistry(f.registry).version,1);
});
test('opaque logs, forged result labels and stale client/revision cannot replace structured evidence',t=>{
 const f=fixture(t);f.append('propose',{capability:f.capability});const e=f.evaluate();e.evidence[0].artifacts[0].format='opaque';assert.throws(()=>f.append('evaluate',{evaluation:e}),/Identity-bearing/);
 const stale=f.evaluate();stale.capabilityDigest='d'.repeat(64);assert.throws(()=>f.append('evaluate',{evaluation:stale}),/exact capability/);
 const report=JSON.parse(readFileSync(join(f.evidenceRoot,'results.json')));report.clientSourceDigest='0'.repeat(64);const bytes=Buffer.from(JSON.stringify(report));writeFileSync(join(f.evidenceRoot,'results.json'),bytes);const mismatch=f.evaluate();writeFileSync(join(f.evidenceRoot,'results.json'),bytes);mismatch.evidence[0].artifacts[0].sha256=digest(bytes);assert.throws(()=>f.append('evaluate',{evaluation:mismatch}),/client mismatch/);
});
test('evidence is re-read before stable promotion and retrieval, never trusted from its old summary',t=>{
 const f=fixture(t);f.append('propose',{capability:f.capability});f.append('evaluate',{evaluation:f.evaluate()});f.append('review',{note:'reviewed'});f.append('approve',{note:'approved'});writeFileSync(join(f.evidenceRoot,'results.json'),'{}');assert.throws(()=>f.append('promote'),/hash/);
});
test('revision invalidates tests/review/approval and prevents reusing old evidence',t=>{
 const f=fixture(t);f.stable();const old=f.evaluate();f.capability.revision=2;f.capability.fix+=' (updated)';f.append('revise',{capability:f.capability});const c=readRegistry(f.registry).capabilities[0];assert.equal(c.status,'candidate');assert.equal(c.approval,null);assert.throws(()=>f.append('evaluate',{evaluation:old}),/exact capability/);
});
test('optimistic version, exclusive append, sequence and hash-chain detect stale writes and edits',t=>{
 const f=fixture(t);f.append('propose',{capability:f.capability});assert.throws(()=>appendLearningEvent({registry:f.registry,expectedVersion:0,event:{}}),/Concurrent/);const file=join(f.registry,'00000001.json'),entry=JSON.parse(readFileSync(file));entry.event.capability.cause='changed';writeFileSync(file,JSON.stringify(entry));assert.throws(()=>readRegistry(f.registry),/hash/);
});
test('retrieval requires stable exact commit/source matches and returns a portable agent capsule',t=>{
 const f=fixture(t);f.stable();const c=buildAgentCapsule({registry:f.registry,context:f.context(),evidenceRoot:f.evidenceRoot});assert.equal(c.matches.length,1);assert.equal(c.applyAllowed,false);assert.equal(c.deployAllowed,false);assert.match(capsuleMarkdown(c),/map.wait-release/);const stale=f.context();stale.backendCommit='d'.repeat(40);const r=buildAgentCapsule({registry:f.registry,context:stale,evidenceRoot:f.evidenceRoot});assert.equal(r.matches.length,0);assert.ok(r.blocked[0].reasons.includes('BACKEND_COMMIT_DRIFT'));
 const changed=f.context();changed.sourceHashes=[{path:'client.js',sha256:'f'.repeat(64)}];assert.equal(buildAgentCapsule({registry:f.registry,context:changed,evidenceRoot:f.evidenceRoot}).matches.length,0);
});
test('no arbitrary executable detectors and no accidental application of draft lessons',t=>{
 const f=fixture(t),bad=structuredClone(f.capability);bad.detectors=[{signal:'x',eval:'process.exit()'}];assert.throws(()=>validateCapability(bad),/detector/);f.append('propose',{capability:f.capability});const c=buildAgentCapsule({registry:f.registry,context:f.context(),evidenceRoot:f.evidenceRoot});assert.equal(c.matches.length,0);assert.equal(c.blocked[0].reasons[0],'CAPABILITY_NOT_STABLE');
});
test('retrieval rejects changed artifacts even when an old ledger still marks the capability stable',t=>{
 const f=fixture(t);f.stable();writeFileSync(join(f.evidenceRoot,'results.json'),'{}');const c=buildAgentCapsule({registry:f.registry,context:f.context(),evidenceRoot:f.evidenceRoot});assert.equal(c.matches.length,0);assert.match(c.blocked[0].reasons[0],/EVIDENCE_UNAVAILABLE/);
});
test('CLI writes only ledger/output and rejects unknown destructive options',t=>{
 const f=fixture(t),file=join(f.root,'event.json');writeFileSync(file,JSON.stringify({action:'propose',id:f.capability.id,actor:'test',at:'2026-11-06T12:00:00Z',capability:f.capability}));assert.equal(main(['record','--registry',f.registry,'--event',file,'--expected-version','0']).status,'candidate');assert.equal(main(['inspect','--registry',f.registry,'--out',join(f.root,'inspection')]).version,1);assert.throws(()=>main(['record','--restart-server','true']),/Unknown option/);
});
