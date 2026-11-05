// Attach to an already-enabled local Chrome/Edge/Opera debugging endpoint.
// Never launches, reloads, navigates or closes the user's browser.
import {randomUUID,createHash} from 'node:crypto';
import {createFlightRecorder} from './flight-recorder.mjs';
const digest=s=>createHash('sha256').update(s).digest('hex');
export function localEndpoint(value,protocols=['http:']){
 const u=new URL(value);if(!protocols.includes(u.protocol)||!['localhost','127.0.0.1','[::1]'].includes(u.hostname)||u.username||u.password||u.search||u.hash)throw Error('Use a loopback debugging endpoint without credentials/query');return u;
}
export function cdpEventToRecord(method,p,recorder){
 if(method==='Network.webSocketFrameSent'||method==='Network.webSocketFrameReceived'){
  const frame=p.response;if(!frame||typeof frame.payloadData!=='string')return;
  if(frame.payloadData.length>4*1024*1024){recorder.record({kind:'error',data:{message:'CDP frame exceeds capture limit'}});return;}
  const binary=frame.opcode===2;const bytes=Buffer.from(frame.payloadData,binary?'base64':'utf8');
  recorder.frame(method.endsWith('Sent')?'C2S':'S2C',bytes,{sessionId:'transport-'+p.requestId,requestId:String(p.requestId),data:{transportOpcode:frame.opcode,applicationOpcode:'UNDECODED',correlation:'TRANSPORT_ONLY'}});
 }else if(method==='Runtime.exceptionThrown'){
  recorder.record({kind:'error',data:{message:'Browser JavaScript exception',line:p.exceptionDetails?.lineNumber??null,exceptionSha256:digest(JSON.stringify(p.exceptionDetails??{}))}});
 }else if(method==='Runtime.consoleAPICalled'){
  recorder.record({kind:'console',data:{type:p.type,argumentCount:p.args?.length??0,contentSha256:digest(JSON.stringify(p.args??[]))}});
 }else if(method==='Network.webSocketFrameError')recorder.record({kind:'error',requestId:String(p.requestId),data:{message:'WebSocket transport error'}});
}
export async function recordCdp({endpoint,pageUrl,out,identity,durationMs=30000,captureActions=false,signal}={}){
 const base=localEndpoint(endpoint);if(!Number.isSafeInteger(durationMs)||durationMs<100||durationMs>300000)throw Error('Capture duration must be 100..300000 ms');
 const page=localEndpoint(pageUrl);const targets=await fetch(new URL('/json/list',base),{signal:AbortSignal.timeout(5000)}).then(r=>{if(!r.ok)throw Error('CDP target discovery failed');return r.json()});
 if(!Array.isArray(targets)||targets.length>128)throw Error('Invalid CDP target list');
 const matches=targets.filter(t=>t.type==='page'&&t.url===page.href);
 if(matches.length!==1)throw Error('Choose exactly one existing page URL; the recorder does not open/navigate pages');
 const wsUrl=localEndpoint(matches[0].webSocketDebuggerUrl,['ws:']);
 const socket=new WebSocket(wsUrl),pending=new Map();let nextId=0,actionSequence=0,closing=false;
 const recorder=createFlightRecorder({out,identity,maxDurationMs:durationMs+10000});
 const binding='autoforge_'+randomUUID().replaceAll('-','');
 const command=(method,params={})=>new Promise((resolve,reject)=>{const id=++nextId;const timeout=setTimeout(()=>{pending.delete(id);reject(Error('CDP command timeout: '+method));},5000);pending.set(id,{resolve,reject,timeout});socket.send(JSON.stringify({id,method,params}));});
 socket.addEventListener('message',({data})=>{
  if(closing)return;
  try{
   const msg=JSON.parse(String(data));if(msg.id){const job=pending.get(msg.id);if(job){clearTimeout(job.timeout);pending.delete(msg.id);msg.error?job.reject(Error('CDP command rejected')):job.resolve(msg.result)};return;}
   if(msg.method==='Runtime.bindingCalled'&&msg.params?.name===binding){let data;try{data=JSON.parse(msg.params.payload)}catch{return};recorder.record({kind:'action',actionId:'pointer-'+(++actionSequence),data:{type:'pointer',tag:String(data.tag??'').slice(0,30),x:Number.isFinite(data.x)?data.x:null,y:Number.isFinite(data.y)?data.y:null,correlation:'NO_BACKEND_ACTION_ID'}});return;}
   cdpEventToRecord(msg.method,msg.params??{},recorder);
  }catch{recorder.record({kind:'error',data:{message:'Invalid CDP message'}});}
 });
 let interrupted=false;
 try{
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('CDP connection timeout')),5000);socket.addEventListener('open',()=>{clearTimeout(timer);resolve()},{once:true});socket.addEventListener('error',()=>{clearTimeout(timer);reject(Error('CDP connection failed'))},{once:true});});
  socket.addEventListener('close',()=>{if(!closing){interrupted=true;recorder.record({kind:'error',data:{message:'CDP connection closed during capture'}})}});
  await command('Network.enable');await command('Runtime.enable');
  if(captureActions){await command('Runtime.addBinding',{name:binding});await command('Runtime.evaluate',{expression:`(()=>{const f=e=>window.${binding}(JSON.stringify({tag:e.target?.tagName,x:Math.round(e.clientX),y:Math.round(e.clientY)}));document.addEventListener('pointerdown',f,true);window.${binding}_off=()=>document.removeEventListener('pointerdown',f,true)})()`});}
  recorder.record({kind:'lifecycle',data:{event:'CDP_ATTACHED',targetUrlSha256:digest(page.href),actionsCaptured:captureActions}});
  await new Promise(resolve=>{const timer=setTimeout(resolve,durationMs);const done=()=>{clearTimeout(timer);resolve()};signal?.addEventListener('abort',done,{once:true});socket.addEventListener('close',done,{once:true});if(signal?.aborted)done();});
  recorder.record({kind:'lifecycle',data:{event:'CDP_CAPTURE_ENDED',interrupted,aborted:!!signal?.aborted}});
 }catch(e){recorder.record({kind:'error',data:{message:'CDP capture failed',errorType:e.name}});throw e;}
 finally{
  if(captureActions&&socket.readyState===WebSocket.OPEN){try{await command('Runtime.evaluate',{expression:`(()=>{window.${binding}_off?.();delete window.${binding}_off})()`});await command('Runtime.removeBinding',{name:binding})}catch{}}
  closing=true;for(const job of pending.values()){clearTimeout(job.timeout);job.reject(Error('CDP recorder detached'));}pending.clear();
  // Close this debugging connection only. Browser.close/Page.close are never sent.
  socket.close();recorder.close();
 }
 return {out,transportInterrupted:interrupted,gameplayVerified:false};
}
