// Runtime identifiers establish correlation; text/clock proximity never proves causation.
import {createHash} from 'node:crypto';
const text=value=>typeof value==='string'&&value.length>0;
export function correlateTrace(events,context={}){
 if(!Array.isArray(events)||events.length>100000)throw Error('Expected bounded trace events');
 const actions=events.filter(e=>e.kind==='action'),results=[];
 const byAction=new Map(),byRequest=new Map(),byHint=new Map();
 const key=(session,value)=>`${session}\0${value}`;
 const add=(map,k,event)=>{if(!map.has(k))map.set(k,[]);map.get(k).push(event);};
 for(const e of events){if(text(e.actionId))add(byAction,key(e.sessionId,e.actionId),e);if(text(e.requestId))add(byRequest,key(e.sessionId,e.requestId),e);if(text(e.data?.recentActionHint?.id))add(byHint,key(e.sessionId,e.data.recentActionHint.id),e);}
 const methods=(context.domains??[]).flatMap(d=>(d.methods??[]).map(m=>({...m,domain:d.id})));
 for(const action of actions){
  const explicit=[...new Set([...(byAction.get(key(action.sessionId,action.actionId))??[]),...(byRequest.get(key(action.sessionId,action.requestId))??[])])].filter(e=>e!==action).sort((a,b)=>a.sequence-b.sequence);
  const explicitSet=new Set(explicit);
  const hinted=(byHint.get(key(action.sessionId,action.actionId))??[]).filter(e=>e!==action&&!explicitSet.has(e));
  const opcodeSet=new Set(explicit.filter(e=>e.opcode!=null).map(e=>e.opcode));
  const symbols=new Set(explicit.flatMap(e=>[e.data?.opcodeName,e.data?.handler].filter(text)));
  const matches=methods.filter(m=>(m.opcodes??[]).some(o=>opcodeSet.has(o.value)||symbols.has(o.symbol))||symbols.has(m.method));
  const candidates=matches.slice(0,100).map(m=>({path:m.path,method:m.method,startLine:m.startLine,endLine:m.endLine,sha256:m.sha256,domain:m.domain,relation:'STATIC_CANDIDATE_NOT_RUNTIME_CALL_PROOF'}));
  const requests=explicit.filter(e=>e.kind==='frame'&&e.direction==='C2S'),responses=explicit.filter(e=>e.kind==='frame'&&e.direction==='S2C');
  results.push({actionId:action.actionId,sessionId:action.sessionId,actionSequence:action.sequence,correlation:explicit.length?'EXPLICIT_IDENTIFIER':'UNVERIFIED',events:explicit.map(e=>e.sequence),timingHints:hinted.map(e=>e.sequence),candidates,candidatesTruncated:matches.length>candidates.length,boundaries:{clientAction:'OBSERVED',request:requests.length?'OBSERVED':'UNVERIFIED',response:responses.length?'OBSERVED':'UNVERIFIED',serverMutation:explicit.some(e=>e.kind==='server'&&e.data?.boundary==='mutation')?'REPORTED_NOT_STATE_VERIFIED':'UNVERIFIED',ui:explicit.some(e=>e.kind==='checkpoint'&&e.data?.boundary==='ui')?'REPORTED_NOT_EQUIVALENCE_VERIFIED':'UNVERIFIED',persistence:explicit.some(e=>e.kind==='checkpoint'&&e.data?.boundary==='persistence')?'REPORTED_NOT_EQUIVALENCE_VERIFIED':'UNVERIFIED'},firstMissingBoundary:!requests.length?'request':!responses.length?'response':'MUTATION_UI_PERSISTENCE_REQUIRE_EQUIVALENCE_CHECK'});
 }
 return {schemaVersion:1,kind:'autoforge.causal-runtime',contextCommit:context.commit??null,eventCount:events.length,actions:results,status:actions.length?'INVESTIGATION_READY':'UNVERIFIED',limitations:['Explicit IDs correlate records but do not prove a handler executed or a mutation was correct.','Timing hints never become explicit links.','Static candidates require matching commit/source hashes and manual receiver/type resolution.']};
}

/** Import a known structured Java log line, without retaining the raw line or arbitrary fields. */
export function javaLogEvent(line){
 if(typeof line!=='string'||line.length>65536)throw Error('Java log line exceeds limit');
 const timestamp=line.match(/\b\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)\b/)?.[0];
 const fields={};for(const m of line.matchAll(/\b(event|sessionId|requestId|actionId|opcode|name|handler)=([^\s]+)/g))fields[m[1]]=m[2];
 if(!timestamp||!fields.event||!fields.sessionId)return null;
 const frame=fields.event==='c2s_frame'||fields.event==='s2c_frame';
 return {timestamp,sessionId:fields.sessionId,actionId:fields.actionId??null,requestId:fields.requestId??null,kind:frame?'frame':'server',...(frame?{direction:fields.event==='c2s_frame'?'C2S':'S2C'}:{}),...(/^\d+$/.test(fields.opcode??'')?{opcode:Number(fields.opcode)}:{}),data:{event:fields.event,...(fields.name?{opcodeName:fields.name}:{}),...(fields.handler?{handler:fields.handler}:{})}};
}

export function parseServerLog(input,{identity={},runId='server-log',maxEvents=20000,maxBytes=32*1024*1024}={}){
 const bytes=Buffer.isBuffer(input)?input:Buffer.from(String(input));
 if(!Number.isSafeInteger(maxEvents)||maxEvents<1||!Number.isSafeInteger(maxBytes)||maxBytes<1)throw Error('Invalid server log limits');
 const bounded=bytes.subarray(0,maxBytes),lines=bounded.toString('utf8').split(/\r?\n/),events=[];let ignoredLines=0,truncated=bytes.length>maxBytes;
 // A byte-cut final line must never become apparent complete evidence.
 if(truncated)lines.pop();
 for(const line of lines){if(!line.trim())continue;if(events.length>=maxEvents){truncated=true;break;}let event;
  if(line.trimStart().startsWith('{')){
   try{const j=JSON.parse(line),at=j.timestamp??j['@timestamp'];if(typeof at==='string'&&Number.isFinite(new Date(at).getTime())&&text(j.event)&&text(j.sessionId)){
    const frame=j.event==='c2s_frame'||j.event==='s2c_frame';event={timestamp:new Date(at).toISOString(),sessionId:j.sessionId,actionId:j.actionId??null,requestId:j.requestId??null,kind:frame?'frame':'server',...(frame?{direction:j.event==='c2s_frame'?'C2S':'S2C'}:{}),...(Number.isInteger(j.opcode)&&j.opcode>=0?{opcode:j.opcode}:{}),data:{event:j.event,...(text(j.name)?{opcodeName:j.name}:{}),...(text(j.handler)?{handler:j.handler}:{})}};
   }}catch{/* Unknown lines remain unverified. */}
  }else if(line.length<=65536)event=javaLogEvent(line);
  if(event){events.push({schemaVersion:1,runId,sequence:events.length+1,...event});}else ignoredLines++;
 }
 return {schemaVersion:1,kind:'autoforge.server-log',identity:{commit:identity.commit??null,environment:identity.environment??{name:'unspecified',kind:'SERVER_LOG'},jarSha256:identity.jarSha256??null,verification:'DECLARED_NOT_RUNTIME_ATTESTED'},sourceSha256:createHash('sha256').update(bytes).digest('hex'),events,ignoredLines,truncated};
}
