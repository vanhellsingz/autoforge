// Comprehensive inventory + evidence-boundary audit; never drives or modifies the game.
import {buildWorldAtlas,validateWorldJourney,validateWorldProjection} from './world.mjs';
import {verifyQuestSources} from './quests.mjs';
import {assertBackendSnapshot} from '../../backend-guard.mjs';
import {artifactJson,canonical,digest,HASH,COMMIT,validIdentity,EVIDENCE_LIMITATION} from '../learning/evidence.mjs';

export const FLOW_STAGES=Object.freeze({
 login:['request','response','snapshot','ui','relogin'],
 'character-create':['request','created','persisted','snapshot','ui','relogin'],
 city:['request','response','scene','ui','relogin'],
 'map-entry':['request','response','scene','ui','relogin'],
 portal:['request','response','scene','ui','relogin'],
 'arena-battle':['request','response','prepare','start','result','persisted','ui','relogin'],
 blitz:['request','response','started','result','persisted','confirm','ui','relogin'],
 'campaign-run':['request','response','scene','boss-win','completion','reward','exit','persisted','ui','relogin'],
});
export const FOUNDATION_FLOWS=Object.freeze(['login','character-create','city','map-entry','arena-battle']);
const ADVICE={
 request:'Check input hit target, invisible modal, callback and actual outgoing opcode before changing the server.',
 response:'Trace decoder -> opcode dispatch -> handler -> exception/rejection response; a rejected request must release the UI wait.',
 scene:'Compare accepted map identity, scene payload, explicit asset URL and loader error. Do not label every spinner a network fault.',
 created:'Compare create-character codec, account ownership, validation response and transaction; keep it separate from map logic.',
 'boss-win':'Require a confirmed result for this run; disappearing enemies are not victory evidence.',
 completion:'Trace the final node/run event to the quest predicate and persisted completion; level and attempts do not establish a win.',
 reward:'Compare exact client catalog XP/rewards with the transaction and idempotency key; separate mob and final rewards.',
 exit:'Resolve intermediate portal vs final return destination from this map/run contract.',
 prepare:'Trace selected opponent/room -> prepare message -> client acknowledgment; generated bots alone prove no battle.',
 start:'Correlate prepare/ready and battle start for the same session and request.',
 result:'Require battle outcome, then persist it once. Dimming is not a battle result.',
 persisted:'Compare read-only before/after snapshots and the same character after reconnect; do not repair data from UI guesses.',
 snapshot:'Inspect message fields, namespaces and missing values against the client reader.',
 ui:'Trace the S2C consumer and loading/modal cleanup; server success is not proof of a working button.',
 relogin:'Read a fresh snapshot after login; compare the same operation, character and completion state.',
 started:'Resolve the actual blitz state machine, server clock/job and polling/completion messages. Opening a results window is not a finished blitz.',
 confirm:'Inspect readiness predicate and the actual confirm callback/modal cleanup. Require a response only if the client really sends a request here.',
};
const refs=a=>[...(a.sources??[]),...(a.code?.sources??[])];
const array=(v,label,max=10000)=>{if(!Array.isArray(v)||v.length>max)throw Error('Bounded '+label+' array required');return v;};

/** Artifact format is documented, not inferred from text, screenshots, opcodes or counters. */
export function auditFlow({artifact,evidenceRoot,expectedCommit,sourceDigest,backendDigest}={}){
 let record;
 try{record=artifactJson(evidenceRoot,artifact);}catch(e){return {status:'UNVERIFIED',issues:[e.message],artifact};}
 const issues=[],stages=FLOW_STAGES[record.flow];
 if(record.schemaVersion!==1||!stages||!validIdentity(record.identity)||typeof record.caseId!=='string'||!record.caseId||typeof record.target!=='string'||!record.target)issues.push('Invalid flow/case/identity/target');
 if(!expectedCommit||!COMMIT.test(expectedCommit)||record.identity?.commit!==expectedCommit)issues.push('Missing or stale expected backend commit');
 if(!HASH.test(sourceDigest??'')||record.identity?.clientSourceDigest!==sourceDigest)issues.push('Client source digest mismatch');
 if(backendDigest&&record.identity?.backendSnapshotDigest!==backendDigest)issues.push('Backend snapshot digest mismatch');
 if(typeof record.sessionId!=='string'||!record.sessionId||typeof record.requestId!=='string'||!record.requestId)issues.push('Session/request correlation required');
 if(!Array.isArray(record.events)||record.events.length>500)issues.push('Bounded events required');
 const events=Array.isArray(record.events)?record.events:[],seen=new Set();let previous=-Infinity,lastStage=-1;
 for(const event of events){
  const pos=stages?.indexOf(event.stage)??-1,at=typeof event.at==='string'?Date.parse(event.at):NaN;
  if(pos<0||seen.has(event.stage)||!['passed','failed'].includes(event.result)||event.sessionId!==record.sessionId||event.requestId!==record.requestId||!Number.isFinite(at)||at<previous||pos<=lastStage)issues.push('Invalid, duplicate, unordered or uncorrelated stage');
  seen.add(event.stage);previous=at;lastStage=pos;
 }
 const base={caseId:record.caseId,flow:record.flow,target:record.target,identity:record.identity,artifact,sessionId:record.sessionId,requestId:record.requestId,issues,independentlyAttested:false};
 if(issues.length)return {...base,status:'UNVERIFIED'};
 const boundary=stages.find(stage=>!events.some(e=>e.stage===stage&&e.result==='passed'))??null;
 const failed=events.some(e=>e.result==='failed');
 return {...base,status:failed?'FAIL_RECORDED':boundary?'UNVERIFIED':'PASS_RECORDED',firstMissingBoundary:boundary,advice:ADVICE[boundary]??null,observedStages:events};
}

function staticInventory(atlas){
 const references=array(atlas.references??[],'references',1000000),byFrom=new Map(),byTo=new Map();
 for(const ref of references){for(const [map,key] of [[byFrom,ref.from],[byTo,ref.to]]){if(!map.has(key))map.set(key,[]);map.get(key).push(ref);}}
 const all=[...array(atlas.maps,'maps'),...array(atlas.campaigns,'campaigns'),...array(atlas.nodes,'nodes',150000),...array(atlas.activityRows,'activities',150000)];
 const seen=new Set();return all.map(entity=>{
  if(typeof entity.key!=='string'||seen.has(entity.key))throw Error('Missing/duplicate namespaced entity key');seen.add(entity.key);
  const outgoing=byFrom.get(entity.key)??[],incoming=byTo.get(entity.key)??[];
  return {key:entity.key,kind:entity.kind,name:entity.name,table:entity.table,source:entity.source,
   declaredType:entity.fields?.Types??entity.fields?.MasterType??null,
   references:outgoing,incomingReferences:incoming,
   unresolvedReferences:outgoing.filter(r=>!r.resolved),
   semantics:'DISPATCHER_AND_REVIEWED_BINDING_REQUIRED',runtime:'UNVERIFIED'};
 });
}

export function auditWorld({atlas,client,backend,backendReport,evidenceRoot,observations=[],baselines=[],expectedCommit,journeys=[],projections=[],bindings=[],reportedSymptoms=[]}={}){
 if(atlas?.schemaVersion!=='autoforge.world-atlas.v1')throw Error('World atlas v1 required');
 if(!!backend!==!!backendReport)throw Error('Backend and its analyzed report must be provided together');
 if(client)verifyQuestSources({client,sources:refs(atlas)});
 let backendDigest=null;if(backend){assertBackendSnapshot(backend,backendReport.snapshot);backendDigest=digest(backendReport.snapshot);const commit=backendReport.snapshot.commit;if(expectedCommit&&commit!==expectedCommit)throw Error('Expected commit differs from backend snapshot');expectedCommit=commit;}
 const inventory=staticInventory(atlas),knownKeys=new Set(inventory.map(e=>e.key));
 const reports=array(reportedSymptoms,'reported symptoms',500).map(s=>{
  if(!s||typeof s.caseId!=='string'||!s.caseId||!FLOW_STAGES[s.flow]||typeof s.target!=='string'||typeof s.description!=='string'||!s.description||s.description.length>4000)throw Error('Invalid reported symptom');
  return {caseId:s.caseId,flow:s.flow,target:s.target,description:s.description,status:'USER_REPORT_NOT_RUNTIME_EVIDENCE',requiredStages:FLOW_STAGES[s.flow],capture:['backend commit and critical-file snapshot','client source digest','test/environment/character and session identity','request ID and ordered C2S/S2C/handler stages','UI state and fresh-login read-only snapshot','artifact path and SHA-256'],source:inventory.find(e=>e.key===s.target)?.source??null};
 });
 const flows=array(observations,'observations',5000).map(artifact=>auditFlow({artifact,evidenceRoot,expectedCommit,sourceDigest:atlas.sourceDigest,backendDigest}));
 // A baseline has its own exact commit; it is never relabeled as evidence for the current backend.
 const baselineFlows=array(baselines,'baselines',5000).map(b=>auditFlow({artifact:b.artifact,evidenceRoot,expectedCommit:b.commit,sourceDigest:atlas.sourceDigest}));
 const flowKey=f=>canonical([f.caseId,f.flow,f.target,f.identity?.environment]);
 const unique=new Set();for(const flow of flows){const k=flowKey(flow);if(unique.has(k))throw Error('Duplicate current observation case');unique.add(k);}
 const baselineMap=new Map();for(const b of baselineFlows){const k=flowKey(b);if(baselineMap.has(k))throw Error('Ambiguous baseline case');baselineMap.set(k,b);}
 const regressions=[];for(const flow of flows){const before=baselineMap.get(flowKey(flow));if(flow.status==='FAIL_RECORDED'&&before?.status==='PASS_RECORDED'&&flow.identity.commit!==before.identity.commit)regressions.push({caseId:flow.caseId,flow:flow.flow,target:flow.target,status:'REGRESSION_RECORDED',beforeCommit:before.identity.commit,afterCommit:flow.identity.commit,beforeArtifact:before.artifact,afterArtifact:flow.artifact,firstMissingBoundary:flow.firstMissingBoundary,causalAttribution:'NOT_ESTABLISHED'});}
 const foundation=FOUNDATION_FLOWS.map(flow=>{const matches=flows.filter(f=>f.flow===flow);return {flow,status:matches.some(f=>f.status==='FAIL_RECORDED')?'FAIL_RECORDED':matches.length&&matches.every(f=>f.status==='PASS_RECORDED')?'PASS_RECORDED':'UNVERIFIED',cases:matches.map(f=>f.caseId)};});
 const invalidTargets=flows.filter(f=>f.target&&/^(?:map|campaign|node|mapnode):/.test(f.target)&&!knownKeys.has(f.target));
 const byTarget=new Map();for(const flow of flows){if(!byTarget.has(flow.target))byTarget.set(flow.target,[]);byTarget.get(flow.target).push(flow);}
 const matrix=inventory.map(entity=>{const matched=byTarget.get(entity.key)??[];const outcome=accepted=>{const cases=matched.filter(f=>accepted.includes(f.flow));return cases.some(f=>f.status==='FAIL_RECORDED')?'FAIL_RECORDED':cases.length&&cases.every(f=>f.status==='PASS_RECORDED')?'PASS_RECORDED':'UNVERIFIED';};return {...entity,entry:outcome(['map-entry','portal','campaign-run']),fullRun:outcome(['campaign-run']),cases:matched.map(f=>({caseId:f.caseId,status:f.status,firstMissingBoundary:f.firstMissingBoundary}))};});
 const journeyReports=array(journeys,'journeys',5000).map(journey=>validateWorldJourney({atlas,journey,bindings}));
 const projectionReports=array(projections,'projections',5000).map(projection=>validateWorldProjection({atlas,projection}));
 const catalogIncomplete=!atlas.coverage?.complete||atlas.coverage?.truncated===true;
 const failures=flows.some(f=>f.status==='FAIL_RECORDED')||invalidTargets.length||[...journeyReports,...projectionReports].some(r=>r.status==='FAIL');
 const environments=new Set(flows.filter(f=>f.status==='PASS_RECORDED').map(f=>canonical(f.identity.environment)));
 const ready=!failures&&!catalogIncomplete&&!!client&&!!backend&&environments.size===1&&foundation.every(f=>f.status==='PASS_RECORDED');
 return {schemaVersion:'autoforge.map-audit.v1',status:failures?'FAIL_RECORDED':ready?'FOUNDATION_RECORDED':'UNVERIFIED',
  identity:{backendCommit:expectedCommit??null,backendSnapshotDigest:backendDigest,clientSourceDigest:atlas.sourceDigest},
  sourceRevalidated:!!client,backendRevalidated:!!backend,inventory:matrix,foundation,flows,regressions,invalidTargets,reportedSymptoms:reports,
  journeyReports,projectionReports,catalogCoverage:atlas.coverage,
  staticFindings:{unresolvedReferences:atlas.missingReferences??[],unparsedReferences:atlas.unsupportedReferences??[],cycles:atlas.cycles,note:'References and cycles are catalog facts, not confirmed bugs. Unknown namespaces/types require the actual dispatcher.'},
  coverageGaps:matrix.filter(e=>['map','campaign'].includes(e.kind)&&e.fullRun!=='PASS_RECORDED').map(e=>({key:e.key,source:e.source,entry:e.entry,run:e.fullRun,required:['entry requirements and all costs','spawn/monster/NPC semantics','battle win and defeat','intermediate portals and final exit','mob XP vs final rewards','quest completion and reward idempotency','UI response and relogin persistence'],status:'RUNTIME_OR_CONTRACT_EVIDENCE_REQUIRED'})),
  scope:{totalEntities:matrix.length,maps:atlas.maps.length,campaigns:atlas.campaigns.length,nodes:atlas.nodes.length,activityRows:atlas.activityRows.length,fullRunsRecorded:matrix.filter(m=>m.fullRun==='PASS_RECORDED').length},
  investigations:flows.filter(f=>f.firstMissingBoundary).map(f=>({caseId:f.caseId,target:f.target,boundary:f.firstMissingBoundary,advice:f.advice,artifact:f.artifact})),
  backendCandidates:backendReport?.domains?.world?.methods??[],
  interpretation:{attemptCountIsCompletion:false,levelIsCompletion:false,cyclesAreBugs:false,spawnOrPortalSemanticsGuessed:false,allMapsFunctional:false,deployAuthorized:false,causalityEstablished:false},
  limitation:EVIDENCE_LIMITATION,
  preserve:['Account/character creation and login transactions, codecs and session ownership.','Independent run/room identities for campaign, arena, hero hall and outer cities.','Explicit source namespaces and portal targets; no invented destination or monster allegiance.','Reward/energy idempotency, failure responses, wait/modal cleanup and fresh-login projection.'],
 };
}

export function collectAndAuditWorld({client,...options}={}){return auditWorld({...options,client,atlas:buildWorldAtlas({client})});}
