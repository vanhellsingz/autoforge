import {createHash} from 'node:crypto';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const LIMIT=50000;
export function buildReplayPlan({events,requiredS2C=[],context=null}={}){
 if(!Array.isArray(events)||!events.length||events.length>LIMIT)throw Error('Replay requires 1..50000 events');
 if(!Array.isArray(requiredS2C)||requiredS2C.some(n=>!Number.isSafeInteger(n)||n<0))throw Error('Invalid required S2C opcodes');
 let last=0;const actions=[],byKey=new Map(),orphans=[];const runs=new Set();
 for(const e of events){
  if(e.schemaVersion!==1||typeof e.runId!=='string'||typeof e.sessionId!=='string'||!e.sessionId||!Number.isSafeInteger(e.sequence)||e.sequence<=last||!Number.isFinite(Date.parse(e.timestamp)))throw Error('Invalid, unordered or mixed trace');
  last=e.sequence;runs.add(e.runId);if(runs.size>1)throw Error('Mixed captures require separate replay plans');
  const key=JSON.stringify([e.runId,e.sessionId,e.actionId]);
  if(e.kind==='action'){
   if(typeof e.actionId!=='string'||!e.actionId||byKey.has(key))throw Error('Missing/repeated action identity');
   const a={id:e.actionId,sessionId:e.sessionId,sequence:e.sequence,timestamp:e.timestamp,action:e.data??{},requests:[],responses:[],errors:[],prerequisites:actions.map(a=>a.id),runtimeProof:'unverified'};
   actions.push(a);byKey.set(key,a);
  }else{
   const a=e.actionId?byKey.get(key):null;
   if(!a){orphans.push({sequence:e.sequence,kind:e.kind,reason:'NO_EXPLICIT_ACTION_CORRELATION'});continue;}
   if(e.kind==='frame'&&e.direction==='C2S')a.requests.push({opcode:e.opcode??null,sequence:e.sequence});
   if(e.kind==='frame'&&e.direction==='S2C')a.responses.push({opcode:e.opcode??null,sequence:e.sequence});
   if(e.kind==='error')a.errors.push({sequence:e.sequence,message:e.data?.message??'Recorded error'});
  }
 }
 let firstGap=null;
 for(const a of actions){
  a.missingS2C=requiredS2C.filter(op=>!a.responses.some(r=>r.opcode===op));
  a.status=a.errors.length?'RECORDED_ERROR':!a.requests.length?'REQUEST_NOT_OBSERVED':a.missingS2C.length?'RESPONSE_NOT_OBSERVED':'TRACE_BOUNDARIES_PRESENT';
  if(!firstGap&&a.status!=='TRACE_BOUNDARIES_PRESENT')firstGap={actionId:a.id,sessionId:a.sessionId,status:a.status};
 }
 const stop=firstGap?actions.findIndex(a=>a.id===firstGap.actionId&&a.sessionId===firstGap.sessionId)+1:actions.length;
 return {schemaVersion:'autoforge.replay.v1',runId:events[0].runId,traceSha256:hash(events),status:actions.length?'FOCUSED_REPLAY_PLAN':'ACTION_CAPTURE_REQUIRED',firstGap,actions:actions.slice(0,stop),orphans,requiredS2C,contextCommit:context?.commit??null,claims:{minimalScenarioProven:false,gameplayVerified:false},instructions:['Preserve all preceding actions; prerequisites are conservative, not a resolved dependency graph.','Run against an isolated test account only after explicit action authorization.','An opcode without decoded payload does not prove correct effects.','Capture UI and authoritative before/after plus relogin evidence separately.']};
}

/** Caller supplies the reviewed adapter. No browser/server mutation by default. */
export async function runReplay(plan,adapter,{allowActions=false,timeoutMs=15000}={}){
 if(plan?.schemaVersion!=='autoforge.replay.v1'||!Array.isArray(plan.actions))throw Error('Invalid replay plan');
 if(!allowActions)throw Error('Replay executes real actions; explicit allowActions=true required');
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>60000)throw Error('Invalid replay timeout');
 if(typeof adapter?.perform!=='function'||typeof adapter?.observe!=='function')throw Error('Reviewed perform/observe adapter required');
 const results=[];
 for(const action of plan.actions){
  const controller=new AbortController();let timer;
  const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('Replay deadline exceeded; adapter must honor AbortSignal'));},timeoutMs);});
  try{
   const observed=await Promise.race([(async()=>{await adapter.perform(action,{signal:controller.signal});return adapter.observe(action,{signal:controller.signal});})(),deadline]);
   if(!observed||!['PASS','FAIL','UNVERIFIED'].includes(observed.status))throw Error('Adapter must explicitly report PASS/FAIL/UNVERIFIED');
   results.push({actionId:action.id,sessionId:action.sessionId,...observed});
   if(observed.status!=='PASS')break;
  }catch(e){results.push({actionId:action.id,sessionId:action.sessionId,status:'FAIL',reason:String(e.message)});break;}finally{clearTimeout(timer);}
 }
 return {schemaVersion:'autoforge.replay-result.v1',traceSha256:plan.traceSha256,status:results.some(r=>r.status==='FAIL')?'FAIL':results.length===0||results.some(r=>r.status==='UNVERIFIED')?'UNVERIFIED':'RECORDED_PASS',results,independentGameplayProof:false};
}
