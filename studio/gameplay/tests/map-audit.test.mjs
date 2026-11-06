import {test} from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {auditWorld,auditFlow,FLOW_STAGES,FOUNDATION_FLOWS} from '../map-audit.mjs';
import {buildWorldAtlas} from '../world.mjs';import {digest} from '../../learning/evidence.mjs';import {main} from '../autoforge.mjs';
function fixture(t){
 const root=mkdtempSync(join(tmpdir(),'af-audit-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const client=join(root,'client'),config=join(client,'res/release/config');mkdirSync(config,{recursive:true});
 const put=(name,rows)=>writeFileSync(join(config,name+'-aaaaaaaaaa.json'),JSON.stringify({[name]:rows}));
 put('t_s_map',[{Id:1,Types:0},{Id:2,Types:888,CampaignId:1004}]);put('t_s_campaign',[{CampaignId:1004,PreCampaignId:1003,MapIds:'2'}]);put('t_s_campaigndata',[{Id:20,CampaignId:1004}]);put('t_s_mapnode',[{Id:20,MapId:2,MoveToMapId:1}]);put('t_s_mapphysicposition',[{Id:100,PhysicId:99}]);
 const atlas=buildWorldAtlas({client}),commit='a'.repeat(40),environment={name:'QA',kind:'FIXTURE'},artifacts=[];
 function record({flow='map-entry',target='campaign:1004',caseId='ibalize',identity={},events,failStage,...rest}={}){
  const value={schemaVersion:1,caseId,flow,target,identity:{commit,environment,testId:caseId,clientSourceDigest:atlas.sourceDigest,...identity},sessionId:'session-1',requestId:'request-1',events:events??FLOW_STAGES[flow].map((stage,i)=>({stage,result:stage===failStage?'failed':'passed',sessionId:'session-1',requestId:'request-1',at:new Date(1000+i).toISOString()})),...rest};
  const bytes=Buffer.from(JSON.stringify(value)),path='trace-'+artifacts.length+'.json';writeFileSync(join(root,path),bytes);const artifact={path,sha256:digest(bytes)};artifacts.push(artifact);return artifact;
 }
 return {root,client,atlas,commit,record,put};
}
test('inventory preserves every namespaced node/type and exposes unresolved links without fabricating semantics',t=>{
 const f=fixture(t),r=auditWorld({atlas:f.atlas});assert.equal(r.status,'UNVERIFIED');assert.equal(r.inventory.length,6);assert.ok(r.inventory.some(x=>x.key==='node:20'));assert.ok(r.inventory.some(x=>x.key==='mapnode:20'));assert.ok(r.inventory.find(x=>x.key==='campaign:1004').unresolvedReferences.some(r=>r.to==='campaign:1003'));assert.equal(r.interpretation.allMapsFunctional,false);assert.ok(r.foundation.every(x=>x.status==='UNVERIFIED'));
});
test('scene spinner locates first missing boundary, not a presumed network or database cause',t=>{
 const f=fixture(t),a=f.record({events:FLOW_STAGES['map-entry'].slice(0,2).map((stage,i)=>({stage,result:'passed',sessionId:'session-1',requestId:'request-1',at:new Date(i).toISOString()}))});const r=auditWorld({atlas:f.atlas,expectedCommit:f.commit,evidenceRoot:f.root,observations:[a]});assert.equal(r.flows[0].firstMissingBoundary,'scene');assert.equal(r.status,'UNVERIFIED');assert.match(r.investigations[0].advice,/asset URL/);
});
test('missing create response and arena start are isolated from map scene evidence',t=>{
 const f=fixture(t),observations=[f.record({flow:'character-create',caseId:'create',target:'account:new',failStage:'created'}),f.record({flow:'arena-battle',caseId:'battle',target:'arena:bot',failStage:'start'})];
 const r=auditWorld({atlas:f.atlas,expectedCommit:f.commit,evidenceRoot:f.root,observations});assert.equal(r.status,'FAIL_RECORDED');assert.deepEqual(r.flows.map(f=>f.firstMissingBoundary),['created','start']);assert.equal(r.regressions.length,0);
});
test('real matching artifacts are required; tampering and another session cannot establish a pass',t=>{
 const f=fixture(t),a=f.record();assert.equal(auditFlow({artifact:a,evidenceRoot:f.root,expectedCommit:f.commit,sourceDigest:f.atlas.sourceDigest}).status,'PASS_RECORDED');writeFileSync(join(f.root,a.path),'{}');assert.equal(auditFlow({artifact:a,evidenceRoot:f.root,expectedCommit:f.commit,sourceDigest:f.atlas.sourceDigest}).status,'UNVERIFIED');
 const b=f.record({sessionId:'another-session'});assert.equal(auditFlow({artifact:b,evidenceRoot:f.root,expectedCommit:f.commit,sourceDigest:f.atlas.sourceDigest}).status,'UNVERIFIED');
});
test('commit/client drift and unordered/duplicate stages block passing evidence',t=>{
 const f=fixture(t),a=f.record();assert.equal(auditFlow({artifact:a,evidenceRoot:f.root,expectedCommit:'b'.repeat(40),sourceDigest:f.atlas.sourceDigest}).status,'UNVERIFIED');assert.equal(auditFlow({artifact:a,evidenceRoot:f.root,expectedCommit:f.commit,sourceDigest:'f'.repeat(64)}).status,'UNVERIFIED');
 const events=FLOW_STAGES['map-entry'].map(stage=>({stage,result:'passed',sessionId:'session-1',requestId:'request-1',at:new Date(0).toISOString()}));events.push(events[0]);const b=f.record({events});assert.equal(auditFlow({artifact:b,evidenceRoot:f.root,expectedCommit:f.commit,sourceDigest:f.atlas.sourceDigest}).status,'UNVERIFIED');
});
test('only same case/environment baseline pass and new-commit failure is called a recorded regression',t=>{
 const f=fixture(t),before=f.record({identity:{commit:'b'.repeat(40)}}),after=f.record({failStage:'scene'}),r=auditWorld({atlas:f.atlas,evidenceRoot:f.root,expectedCommit:f.commit,observations:[after],baselines:[{artifact:before,commit:'b'.repeat(40)}]});assert.equal(r.regressions.length,1);assert.equal(r.regressions[0].causalAttribution,'NOT_ESTABLISHED');
 const foreign=f.record({identity:{commit:'b'.repeat(40),environment:{name:'other',kind:'FIXTURE'}}});assert.equal(auditWorld({atlas:f.atlas,evidenceRoot:f.root,expectedCommit:f.commit,observations:[after],baselines:[{artifact:foreign,commit:'b'.repeat(40)}]}).regressions.length,0);
});
test('all foundation flows do not imply every map is implemented or server validated',t=>{
 const f=fixture(t),observations=FOUNDATION_FLOWS.map(flow=>f.record({flow,caseId:flow,target:flow==='map-entry'?'map:2':'flow:'+flow}));const r=auditWorld({atlas:f.atlas,evidenceRoot:f.root,expectedCommit:f.commit,observations});assert.ok(r.foundation.every(f=>f.status==='PASS_RECORDED'));assert.equal(r.status,'UNVERIFIED');assert.equal(r.scope.fullRunsRecorded,0);assert.equal(r.interpretation.deployAuthorized,false);
});
test('current source drift, path escapes and duplicate cases cannot silently pass',t=>{
 const f=fixture(t),a=f.record();assert.throws(()=>auditWorld({atlas:f.atlas,observations:[a,a],evidenceRoot:f.root,expectedCommit:f.commit}),/Duplicate/);assert.equal(auditFlow({artifact:{...a,path:'../trace.json'},evidenceRoot:f.root,expectedCommit:f.commit,sourceDigest:f.atlas.sourceDigest}).status,'UNVERIFIED');f.put('t_s_map',[{Id:50}]);assert.throws(()=>auditWorld({atlas:f.atlas,client:f.client}),/changed/);
});
test('CLI builds complete map inventory without evidence and does not claim runtime success',async t=>{
 const f=fixture(t),atlasFile=join(f.root,'atlas.json');writeFileSync(atlasFile,JSON.stringify(f.atlas));const r=await main(['map-audit','--atlas',atlasFile,'--client',f.client,'--out',join(f.root,'audit')]);assert.equal(r.status,'UNVERIFIED');assert.equal(r.sourceRevalidated,true);
});
test('level/attempts never establish completion; a recorded boss failure is not a completed run',t=>{
 const f=fixture(t),a=f.record({flow:'campaign-run',failStage:'boss-win'}),r=auditWorld({atlas:f.atlas,evidenceRoot:f.root,expectedCommit:f.commit,observations:[a],projections:[{authoritative:{completedCampaignIds:[]},ui:{completedCampaignIds:[1004]},history:{verifiedWins:[]},entry:{campaignId:1004,attemptsRemaining:0}}]});assert.equal(r.status,'FAIL_RECORDED');assert.equal(r.inventory.find(m=>m.key==='campaign:1004').fullRun,'FAIL_RECORDED');assert.equal(r.interpretation.attemptCountIsCompletion,false);
});
