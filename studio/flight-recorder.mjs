// Observes an existing session. Never launches/restarts browsers, services or SQL.
import {createHash,randomUUID} from 'node:crypto';
import {mkdirSync,lstatSync,existsSync,openSync,writeSync,closeSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve,dirname,join,parse,sep} from 'node:path';
const hash=b=>createHash('sha256').update(b).digest('hex');
const KINDS=new Set(['action','frame','console','error','lifecycle','server','checkpoint']);
const SECRET=/password|passwd|secret|token|authorization|cookie|credential|sign(?:ature)?$|(?:^|_)key(?:$|_)/i;
export function sanitize(value,depth=0){
 if(depth>7)return '[DEPTH_LIMIT]';
 if(value===null||typeof value==='boolean')return value;
 if(typeof value==='number')return Number.isFinite(value)?value:null;
 if(typeof value==='string')return value.slice(0,512).replace(/\b(?:Bearer\s+)[A-Za-z0-9._~-]+/gi,'[REDACTED]').replace(/((?:password|passwd|token|secret|sign|authorization)\s*[:=]\s*)[^\s&,;]+/gi,'$1[REDACTED]').replace(/:\/\/[^/@\s]+:[^/@\s]+@/g,'://[REDACTED]@');
 if(Array.isArray(value))return value.slice(0,1000).map(v=>sanitize(v,depth+1));
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).slice(0,1000).map(([k,v])=>[k,SECRET.test(k)?'[REDACTED]':sanitize(v,depth+1)]));
 return null;
}
function id(value,name){if(value==null)return null;if(typeof value!=='string'||!value.length||value.length>160||!/^[\w:./@-]+$/.test(value))throw Error(`Invalid ${name}`);return value;}
function noLinks(path){let p=parse(path).root;for(const part of path.slice(p.length).split(sep).filter(Boolean)){p=join(p,part);if(existsSync(p)&&lstatSync(p).isSymbolicLink())throw Error('Recorder output cannot traverse links');}}
function origin(url){try{return new URL(url).origin;}catch{return 'unresolved';}}
export function createFlightRecorder({out,identity={},sessionId=randomUUID(),runId=randomUUID(),maxEvents=20000,maxDurationMs=15*60*1000,maxBytes=32*1024*1024,clock=()=>new Date()}={}){
 if(!out)throw Error('Recorder output directory required');
 for(const v of [maxEvents,maxDurationMs,maxBytes])if(!Number.isSafeInteger(v)||v<1)throw Error('Recorder limits must be positive integers');
 for(const [key,pattern] of [['commit',/^[a-f0-9]{40,64}$/i],['jarSha256',/^[a-f0-9]{64}$/i]])if(identity[key]!=null&&!pattern.test(identity[key]))throw Error(`Invalid identity ${key}`);
 id(sessionId,'sessionId');id(runId,'runId');
 const dir=resolve(out);noLinks(dir);if(existsSync(dir))throw Error('Use a new recorder output directory');mkdirSync(dir,{recursive:true});
 const file=join(dir,'events.jsonl'),fd=openSync(file,'wx'),start=clock(),streamHash=createHash('sha256');
 let sequence=0,totalBytes=0,closed=false,truncated=false,reason=null,lastAction=null;
 const provenance={commit:identity.commit??null,environment:sanitize(identity.environment??{name:'unspecified',kind:'UNVERIFIED'}),jarSha256:identity.jarSha256??null,verification:'DECLARED_NOT_RUNTIME_ATTESTED'};
 function stopReason(v){truncated=true;reason??=v;return null;}
 function record(event){
  if(closed)throw Error('Recorder already closed');
  const now=clock();if(!KINDS.has(event.kind))throw Error('Unsupported trace event kind');
  if(now-start>maxDurationMs)return stopReason('DURATION_LIMIT');
  if(sequence>=maxEvents)return stopReason('EVENT_LIMIT');
  if(event.opcode!=null&&(!Number.isInteger(event.opcode)||event.opcode<0||event.opcode>0xffffffff))throw Error('Invalid opcode');
  if(event.direction!=null&&!['C2S','S2C'].includes(event.direction))throw Error('Invalid frame direction');
  const at=event.timestamp==null?now:new Date(event.timestamp);if(!Number.isFinite(at.getTime()))throw Error('Invalid event timestamp');
  const row={schemaVersion:1,runId,sessionId:id(event.sessionId??sessionId,'sessionId'),actionId:id(event.actionId,'actionId'),requestId:id(event.requestId,'requestId'),timestamp:at.toISOString(),sequence:sequence+1,kind:event.kind,...(event.direction?{direction:event.direction}:{}),...(event.opcode!=null?{opcode:event.opcode}:{}),data:sanitize(event.data??{})};
  const bytes=Buffer.from(JSON.stringify(row)+'\n');if(totalBytes+bytes.length>maxBytes)return stopReason('BYTE_LIMIT');
  writeSync(fd,bytes);streamHash.update(bytes);sequence++;totalBytes+=bytes.length;if(row.kind==='action')lastAction={id:row.actionId,at:row.timestamp};return row;
 }
 function frame(direction,payload,metadata={}){
  const bytes=Buffer.isBuffer(payload)?payload:Buffer.from(typeof payload==='string'?payload:payload??[]);
  const safeData=sanitize(metadata.data??{}),data=safeData&&typeof safeData==='object'&&!Array.isArray(safeData)?safeData:{};
  // Only declared correlation metadata may pass through. Transport facts are computed here.
  delete data.recentActionHint;
  return record({kind:'frame',direction,sessionId:metadata.sessionId,actionId:metadata.actionId,requestId:metadata.requestId,opcode:metadata.opcode,timestamp:metadata.timestamp,data:{...data,bodyBytes:bytes.length,bodySha256:hash(bytes),decoded:metadata.opcode!=null,rawPayloadStored:false,...(lastAction&&!metadata.actionId?{recentActionHint:lastAction}:{})}});
 }
 function close(){
  if(closed)return manifest;
  closeSync(fd);closed=true;
  manifest={schemaVersion:1,kind:'autoforge.flight-recorder',runId,sessionId,identity:provenance,startedAt:start.toISOString(),endedAt:clock().toISOString(),eventCount:sequence,truncated,truncationReason:reason,events:{path:'events.jsonl',bytes:totalBytes,sha256:streamHash.digest('hex')},limitations:['Encrypted frames require an explicitly supplied reviewed decoder.','Recent actions are timing hints, not proven causality.','No game state, persistence or deployment is proven by frame presence alone.']};
  writeFileSync(join(dir,'capture-manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});return manifest;
 }
 let manifest;
 return {out:dir,identity:provenance,record,frame,close,get count(){return sequence;},get truncated(){return truncated;}};
}

/** Playwright-compatible API: observer only, attaches to a page already owned by the caller. */
export async function attachFlightRecorder(page,{recorder,decodeFrame,captureActions=false}={}){
 if(!page?.on||!recorder?.record)throw Error('Existing page and recorder required');
 if(captureActions&&(!page.exposeBinding||!page.addInitScript||!page.evaluate))throw Error('Page action capture requires exposeBinding, addInitScript and evaluate');
 const listeners=[],sockets=[];let detached=false;
 function on(target,name,handler){target.on(name,handler);listeners.push([target,name,handler]);}
 function safe(fn){return (...args)=>{if(detached)return;try{fn(...args);}catch(e){try{recorder.record({kind:'error',data:{source:'recorder',errorName:e.name,errorSha256:hash(String(e.message))}});}catch{}}};}
 on(page,'console',safe(message=>{const text=String(message.text?.()??'');recorder.record({kind:'console',data:{type:message.type?.()??'unknown',messageBytes:Buffer.byteLength(text),messageSha256:hash(text),textStored:false}});}));
 on(page,'pageerror',safe(error=>recorder.record({kind:'error',data:{errorName:String(error.name??'Error'),messageSha256:hash(String(error.message??error)),textStored:false}})));
 on(page,'crash',safe(()=>recorder.record({kind:'lifecycle',data:{event:'page-crash'}})));
 on(page,'close',safe(()=>recorder.record({kind:'lifecycle',data:{event:'page-close'}})));
 on(page,'websocket',safe(socket=>{
  const socketId=randomUUID();sockets.push(socket);
  recorder.record({kind:'lifecycle',data:{event:'socket-open',socketId,origin:origin(socket.url?.())}});
  for(const [name,direction] of [['framesent','C2S'],['framereceived','S2C']])on(socket,name,safe(event=>{
   const payload=event.payload,bytes=Buffer.isBuffer(payload)?payload:Buffer.from(String(payload));
   let decoded=[];
   if(decodeFrame){const r=decodeFrame(bytes,{direction,socketId});if(r&&typeof r.then==='function')throw Error('Decoder must be synchronous');decoded=Array.isArray(r)?r:r?[r]:[];if(decoded.length>1000)throw Error('Decoder frame limit');}
   if(!decoded.length)recorder.frame(direction,bytes,{data:{socketId,decodeStatus:decodeFrame?'UNRESOLVED':'NO_DECODER'}});
 else for(const d of decoded)recorder.frame(direction,bytes,{opcode:d.opcode,sessionId:d.sessionId,actionId:d.actionId,requestId:d.requestId,data:{socketId,decodeStatus:'EXPLICIT_DECODER',...(d.opcodeName?{opcodeName:d.opcodeName}:{})}});
  }));
  on(socket,'close',safe(()=>recorder.record({kind:'lifecycle',data:{event:'socket-close',socketId}})));
  on(socket,'socketerror',safe(error=>recorder.record({kind:'error',data:{source:'websocket',socketId,messageSha256:hash(String(error)),textStored:false}})));
 }));
 let binding;
 if(captureActions){
  binding='__autoforgePointer_'+randomUUID().replaceAll('-','');
  await page.exposeBinding(binding,(_source,data)=>{if(!detached)recorder.record({kind:'action',actionId:randomUUID(),data:{event:'pointerdown',x:Number(data.x),y:Number(data.y),tag:['CANVAS','BUTTON','A','INPUT','DIV'].includes(data.tag)?data.tag:'OTHER',correlation:'UI_EVENT_ONLY'}});});
  const install=({binding})=>{if(globalThis[binding+'_installed'])return;globalThis[binding+'_installed']=true;document.addEventListener('pointerdown',event=>{if(globalThis[binding+'_disabled'])return;globalThis[binding]({x:event.clientX,y:event.clientY,tag:event.target?.tagName}).catch(()=>{});},true);};
  await page.addInitScript(install,{binding});await page.evaluate(install,{binding});
 }
 recorder.record({kind:'lifecycle',data:{event:'observer-attached',captureActions}});
 return async function detach(){if(detached)return;detached=true;for(const [target,name,handler] of listeners){if(target.off)target.off(name,handler);else if(target.removeListener)target.removeListener(name,handler);}if(binding){try{await page.evaluate(name=>{globalThis[name+'_disabled']=true;},binding);}catch{/* page may already be closed */}}};
}

export function readCapture(directory){
 const dir=resolve(directory);noLinks(dir);const manifestPath=join(dir,'capture-manifest.json');noLinks(manifestPath);const manifestStat=lstatSync(manifestPath);if(!manifestStat.isFile()||manifestStat.size>1024*1024)throw Error('Capture manifest exceeds limit or is not a regular file');const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
 if(manifest.schemaVersion!==1||manifest.kind!=='autoforge.flight-recorder'||!Number.isSafeInteger(manifest.eventCount)||manifest.eventCount<0||!Number.isSafeInteger(manifest.events?.bytes)||manifest.events.bytes<0||manifest.events.bytes>32*1024*1024||!/^[a-f0-9]{64}$/i.test(manifest.events?.sha256??''))throw Error('Invalid capture manifest');
 if(manifest.events?.path!=='events.jsonl')throw Error('Unsupported event file');
 const path=join(dir,'events.jsonl');noLinks(path);const eventStat=lstatSync(path);if(!eventStat.isFile()||eventStat.size>32*1024*1024)throw Error('Capture events exceed limit or are not a regular file');const bytes=readFileSync(path);
 if(bytes.length>32*1024*1024||hash(bytes)!==manifest.events.sha256||bytes.length!==manifest.events.bytes)throw Error('Capture hash/size mismatch');
 const events=bytes.toString('utf8').split('\n').filter(Boolean).map(s=>JSON.parse(s));
 if(events.length!==manifest.eventCount||events.some((e,i)=>e.schemaVersion!==1||e.sequence!==i+1||e.runId!==manifest.runId||!KINDS.has(e.kind)||!Number.isFinite(new Date(e.timestamp).getTime())||typeof e.sessionId!=='string'||!e.sessionId))throw Error('Capture sequence/count/schema mismatch');
 return {manifest,events};
}
