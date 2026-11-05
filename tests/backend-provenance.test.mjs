import {createHash} from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {backendProvenance,loadAssessments} from '../backend-provenance.mjs';
const commit='a'.repeat(40),sha='b'.repeat(64),rule='attributes.fighting-capacity';
function fixture(t){const root=mkdtempSync(join(tmpdir(),'af-provenance-'));t.after(()=>rmSync(root,{recursive:true,force:true}));return root;}
function input(t,status='partial'){
 const root=fixture(t),file=join(root,'assessment.json');
 const item={rule,status,commit,sourceHashes:[{path:'apps/main/Service.java',sha256:sha}],evidence:[{kind:'code',id:'review-1',description:'Reviewer checked service path'}]};
 const save=()=>writeFileSync(file,JSON.stringify({schemaVersion:1,assessments:[{...item,evidence:item.evidence.map(e=>({commit,environment:{name:'isolated-test',kind:e.kind},testId:e.id,...(e.kind==='runtime'?{deployment:{commit,jarSha256:'c'.repeat(64)}}:{}),...e}))}]}));const persist=save;
 const saveWithArtifacts=()=>{if(item.status==='functional')for(const e of item.evidence){if(!['test','runtime'].includes(e.kind))continue;const stamped={commit,environment:{name:'isolated-test',kind:e.kind},testId:e.id,...(e.kind==='runtime'?{deployment:{commit,jarSha256:'c'.repeat(64)}}:{}),...e};const path=e.kind+'.report.json';const content=JSON.stringify({schemaVersion:1,commit:stamped.commit,testId:stamped.testId,environment:stamped.environment,...(stamped.deployment?{deployment:stamped.deployment}:{}),result:'passed',checks:[{id:'fixture',result:'passed'}]});writeFileSync(join(root,path),content);e.artifacts=[{path,format:'json-report',sha256:createHash('sha256').update(content).digest('hex')}];}persist();};
 saveWithArtifacts();return {root,file,item,save:saveWithArtifacts,context:{commit,sources:item.sourceHashes}};
}
test('missing optional assessment stays unclassified',()=>{assert.deepEqual(loadAssessments(),{});});
test('assessment validates snapshot but remains reviewer-declared',t=>{const f=input(t);const out=loadAssessments(f.file,f.context);assert.equal(out[rule].status,'partial');assert.equal(out[rule].evidenceScope,'REVIEWER_DECLARED');});
test('rejects missing commit and stale source/commit declarations',t=>{
 const f=input(t);assert.throws(()=>loadAssessments(f.file,{sources:f.context.sources}),/commit/);
 assert.throws(()=>loadAssessments(f.file,{...f.context,commit:'c'.repeat(40)}),/commit mismatch/);
 assert.throws(()=>loadAssessments(f.file,{...f.context,sources:[{path:f.item.sourceHashes[0].path,sha256:'d'.repeat(64)}]}),/hash mismatch/);
});
test('functional needs passed runtime and test evidence',t=>{
 const f=input(t,'functional');assert.throws(()=>loadAssessments(f.file,f.context),/test and runtime/);
 f.item.evidence=[{kind:'test',id:'it-1',description:'MariaDB integration',result:'passed'},{kind:'runtime',id:'qa-1',description:'Actual game capture',result:'passed'}];f.save();assert.equal(loadAssessments(f.file,f.context)[rule].status,'functional');
});
test('divergent needs independent comparison and unknown statuses are rejected',t=>{
 const f=input(t,'divergent');assert.throws(()=>loadAssessments(f.file,f.context),/independent/);
 f.item.evidence=[{kind:'comparison',id:'golden-1',description:'Independent result differs',independent:true,result:'divergent'}];f.save();assert.equal(loadAssessments(f.file,f.context)[rule].status,'divergent');
 f.item.status='maybe';f.save();assert.throws(()=>loadAssessments(f.file,f.context),/status/);
});
test('rejects escaped, repeated and unscoped source files',t=>{
 const f=input(t);f.item.sourceHashes=[{path:'../secret.java',sha256:sha}];f.save();assert.throws(()=>loadAssessments(f.file,f.context),/source/);
});
test('Git provenance scopes tracked and untracked changes to backend',t=>{
 const root=fixture(t),backend=join(root,'java-v1');mkdirSync(backend);mkdirSync(join(root,'tools'));writeFileSync(join(backend,'Service.java'),'class Service{}');
 const git=args=>execFileSync('git',['-C',root,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
 try{git(['init']);git(['add','java-v1/Service.java']);git(['-c','user.name=AutoForge Test','-c','user.email=autoforge-test@example.invalid','commit','-m','fixture']);}catch(e){if(e.code==='EPERM'||e.code==='ENOENT'){t.skip('Git subprocess unavailable');return;}throw e;}
 const clean=backendProvenance(backend);assert.equal(clean.status,'VERSIONED');assert.equal(clean.dirty,false);assert.match(clean.commit,/^[a-f0-9]{40}$/);
 writeFileSync(join(root,'tools','scratch.mjs'),'tool change');assert.equal(backendProvenance(backend).dirty,false);
 writeFileSync(join(backend,'Service.java'),'class Service{int changed;}');writeFileSync(join(backend,'New.java'),'class New{}');
 const changed=backendProvenance(backend);assert.equal(changed.dirty,true);assert.equal(changed.trackedChanges[0].path,'Service.java');assert.equal(changed.untrackedChanges[0].path,'New.java');assert.equal(changed.commit,clean.commit);
});
test('non-repository is explicit and never invents a commit',t=>{const p=backendProvenance(fixture(t));assert.ok(['UNVERSIONED','GIT_UNAVAILABLE'].includes(p.status));assert.equal(p.commit,null);assert.equal(p.dirty,null);});

test('each declared evidence requires its own commit, environment, test and runtime artifact identity',t=>{
 const f=input(t);
 f.item.evidence[0].commit='d'.repeat(40);f.save();assert.throws(()=>loadAssessments(f.file,f.context),/Evidence commit/);delete f.item.evidence[0].commit;
 f.item.evidence[0].environment=null;f.save();assert.throws(()=>loadAssessments(f.file,f.context),/environment/);delete f.item.evidence[0].environment;
 f.item.evidence[0].testId='';f.save();assert.throws(()=>loadAssessments(f.file,f.context),/testId/);
 f.item.evidence=[{kind:'runtime',id:'qa',description:'old deployment',deployment:{commit:'d'.repeat(40),jarSha256:'c'.repeat(64)}}];f.save();assert.throws(()=>loadAssessments(f.file,f.context),/matching deployed commit/);
});

test('a hash-checked video alone cannot establish functional test evidence',t=>{
 const f=input(t,'functional');f.item.evidence=[{kind:'test',id:'it',description:'test'},{kind:'runtime',id:'qa',description:'runtime'}];f.save();
 const doc=JSON.parse(readFileSync(f.file,'utf8'));writeFileSync(join(f.root,'video.mp4'),'opaque video bytes');doc.assessments[0].evidence[0].artifacts=[{path:'video.mp4',format:'opaque',sha256:createHash('sha256').update('opaque video bytes').digest('hex')}];writeFileSync(f.file,JSON.stringify(doc));assert.throws(()=>loadAssessments(f.file,f.context),/identity-matched/);
});
