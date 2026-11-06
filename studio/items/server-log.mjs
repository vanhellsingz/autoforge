// Incremental, read-only log observation. No service control, SQL or public tunnel.
import {openSync,readSync,closeSync,fstatSync,lstatSync,existsSync,mkdirSync,writeFileSync,readFileSync,writeSync} from 'node:fs';
import {resolve,join,dirname,basename,parse,sep,relative,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
const MAX_CAPTURE=32*1024*1024, MAX_MANIFEST=128*1024;
const integer=(n,name,min,max)=>{if(!Number.isSafeInteger(n)||n<min||n>max)throw Error(`Invalid ${name}`);return n;};
function noLinks(path){let at=parse(resolve(path)).root;for(const p of resolve(path).slice(at.length).split(sep).filter(Boolean)){at=join(at,p);if(existsSync(at)&&lstatSync(at).isSymbolicLink())throw Error('Log paths cannot traverse symlinks/junctions');}}
function within(root,path){const r=relative(root,path);return !r||(!isAbsolute(r)&&r!=='..'&&!r.startsWith('..'+sep));}
function sameFile(a,b){return a.dev===b.dev&&a.ino===b.ino&&a.birthtimeMs===b.birthtimeMs;}
function bytesAt(fd,position,length){const b=Buffer.alloc(length),n=readSync(fd,b,0,length,position);return b.subarray(0,n);}
function token(value,max=160){return typeof value==='string'&&value.length<=max&&/^[A-Za-z0-9_.:-]+$/.test(value)&&!/^(?:gh[opusr]_|github_pat_)/i.test(value)&&!/^[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}$/.test(value)?value:undefined;}
function normalizedIdentity(identity={}){
 if(identity===null||typeof identity!=='object'||Array.isArray(identity))throw Error('Identity must be an object');
 if(identity.commit!=null&&!/^[a-f0-9]{40,64}$/i.test(identity.commit))throw Error('Invalid backend commit');
 if(identity.jarSha256!=null&&!/^[a-f0-9]{64}$/i.test(identity.jarSha256))throw Error('Invalid JAR SHA256');
 const environment=identity.environment&&typeof identity.environment==='object'?{name:token(identity.environment.name,120)??null,kind:token(identity.environment.kind,80)??null}:{name:null,kind:null};
 const testId=token(identity.testId,160)??null;
 return {commit:identity.commit??null,environment,testId,jarSha256:identity.jarSha256??null,verification:identity.commit&&testId&&environment.name&&environment.kind?'DECLARED_NOT_RUNTIME_ATTESTED':'UNVERIFIED'};
}

/** Strict field allowlist. Arbitrary raw text, message/stack, tokens and URLs never leave the parser. */
export function parseLogLine(raw,source){
 let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(raw).replace(/^\uFEFF/,'').replace(/\r$/,'');}catch{return {diagnostic:'INVALID_UTF8'};}
 let fields={},at=null;
 if(text.trimStart().startsWith('{')){try{const j=JSON.parse(text);if(!j||typeof j!=='object'||Array.isArray(j))return {diagnostic:'UNSUPPORTED_LINE'};fields=j;at=j.timestamp??j['@timestamp'];}catch{return {diagnostic:'INVALID_JSON'};}}
 else{
  at=text.match(/\b\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)\b/)?.[0];
  for(const m of text.matchAll(/\b(event|sessionId|requestId|actionId|opcode|name|handler|templateId|itemId|quantity|gold|level|errorClass|code)=([^\s,;]+)/g))fields[m[1]]=m[2];
  fields.level??=text.match(/\b(ERROR|WARN|INFO|DEBUG|TRACE|FATAL)\b/)?.[1];
  fields.errorClass??=text.match(/\b((?:[A-Za-z_$][\w$]*\.)*[A-Za-z_$][\w$]*(?:Exception|Error))\b/)?.[1];
 }
 const errorClass=token(fields.errorClass,180),level=['ERROR','WARN','INFO','DEBUG','TRACE','FATAL'].includes(fields.level)?fields.level:undefined;
 const event=token(fields.event,120)??(errorClass||level==='ERROR'||level==='FATAL'?'server_error':null);
 if(!event)return {diagnostic:'UNSUPPORTED_LINE'};
 const row={timestamp:typeof at==='string'&&Number.isFinite(Date.parse(at))?new Date(at).toISOString():null,event};
 for(const name of ['sessionId','requestId','actionId','name','handler','code']){const v=token(fields[name]);if(v!==undefined)row[name]=v;}
 for(const name of ['opcode','templateId','itemId','quantity','gold']){const v=fields[name],n=typeof v==='number'?v:typeof v==='string'&&/^-?\d+$/.test(v)?Number(v):NaN;if(Number.isSafeInteger(n)&&(name==='templateId'||name==='quantity'||name==='gold'||n>=0))row[name]=n;}
 if(level)row.level=level;if(errorClass&&/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*(?:Exception|Error)$/.test(errorClass))row.errorClass=errorClass;
 if(event==='c2s_frame')row.direction='C2S';if(event==='s2c_frame')row.direction='S2C';
 row.source={...source,lineSha256:hash(raw)};return {event:row};
}

export function createLogFollower({file,identity={},from='end',maxReadBytes=256*1024,maxLineBytes=64*1024,maxEventsPerPoll=10000}={}){
 if(typeof file!=='string'||!file)throw Error('Log file required');file=resolve(file);noLinks(file);
 if(!['start','end'].includes(from))throw Error('from must be start or end');
 integer(maxReadBytes,'maxReadBytes',1,4*1024*1024);integer(maxLineBytes,'maxLineBytes',32,1024*1024);integer(maxEventsPerPoll,'maxEventsPerPoll',1,100000);
 const provenance=normalizedIdentity(identity);let previous=null,offset=0,generation=0,initialized=false,pending=Buffer.alloc(0),lineStart=0,discarding=false,closed=false;
 let prefix=Buffer.alloc(0),anchor=Buffer.alloc(0),anchorOffset=0,totalRead=0;
 function poll({maxBytes=maxReadBytes}={}){
  integer(maxBytes,'poll maxBytes',1,maxReadBytes);
  if(closed)throw Error('Log follower closed');noLinks(file);let fd;
  const events=[],diagnostics=[],diagnosticCounts={};let rotation=null,truncated=false,diagnosticsSuppressed=0;
  const note=d=>{diagnosticCounts[d.code]=(diagnosticCounts[d.code]??0)+1;if(diagnostics.length<128)diagnostics.push(d);else diagnosticsSuppressed++;};
  try{fd=openSync(file,'r');}catch(e){if(e.code==='ENOENT')return {events,cursor:cursor(),rotation:null,truncated:false,diagnostics:[{code:'SOURCE_MISSING'}],diagnosticCounts:{SOURCE_MISSING:1},diagnosticsSuppressed:0};throw e;}
  try{
   const stat=fstatSync(fd);if(!stat.isFile())throw Error('Log source must be a regular file');
   if(!initialized){offset=from==='end'?stat.size:0;lineStart=offset;initialized=true;if(offset&&bytesAt(fd,offset-1,1)[0]!==10){discarding=true;note({code:'INITIAL_PARTIAL_LINE_SKIPPED',offset});}}
   else if(!sameFile(previous,stat))rotation='REPLACED';
   else if(stat.size<offset)rotation='TRUNCATED';
   else if(prefix.length&&!prefix.equals(bytesAt(fd,0,prefix.length)))rotation='PREFIX_CHANGED';
   else if(anchor.length&&!anchor.equals(bytesAt(fd,anchorOffset,anchor.length)))rotation='PREFIX_CHANGED';
   if(rotation){note({code:'SOURCE_ROTATED',rotation,generation:++generation,discardedPartialBytes:pending.length});offset=0;lineStart=0;pending=Buffer.alloc(0);discarding=false;prefix=Buffer.alloc(0);anchor=Buffer.alloc(0);}
   previous={dev:stat.dev,ino:stat.ino,birthtimeMs:stat.birthtimeMs};
   const bytes=bytesAt(fd,offset,Math.min(maxBytes,Math.max(0,stat.size-offset)));const readStart=offset;offset+=bytes.length;totalRead+=bytes.length;
   let start=0;
   while(start<bytes.length){
    const newline=bytes.indexOf(10,start),end=newline<0?bytes.length:newline,fragment=bytes.subarray(start,end);
    if(!discarding){if(pending.length+fragment.length>maxLineBytes){discarding=true;pending=Buffer.alloc(0);note({code:'LINE_LIMIT',generation,offset:lineStart});truncated=true;}else pending=Buffer.concat([pending,fragment]);}
    if(newline<0)break;
    const endOffset=readStart+newline+1;
    if(!discarding){const parsed=parseLogLine(pending,{generation,offset:lineStart,endOffset});if(parsed.event){if(events.length<maxEventsPerPoll)events.push(parsed.event);else{truncated=true;note({code:'EVENT_LIMIT',offset:lineStart});}}else note({code:parsed.diagnostic,offset:lineStart});}
    pending=Buffer.alloc(0);discarding=false;lineStart=endOffset;start=newline+1;
   }
   prefix=bytesAt(fd,0,Math.min(256,offset));anchorOffset=Math.max(0,offset-64);anchor=bytesAt(fd,anchorOffset,offset-anchorOffset);
   return {events,cursor:cursor(),rotation,truncated,diagnostics,diagnosticCounts,diagnosticsSuppressed,backlogBytes:Math.max(0,stat.size-offset)};
  }finally{closeSync(fd);}
 }
 function cursor(){return {schemaVersion:'autoforge.log-cursor.v1',generation,offset,lineStart,pendingBytes:pending.length,discarding,totalRead,initialized};}
 return {file,identity:provenance,poll,get cursor(){return cursor()},close(){closed=true;return cursor()}};
}

export async function captureLog({file,out,identity={},durationMs=30000,pollMs=500,from='end',signal,maxEvents=20000,maxBytes=4*1024*1024,maxReadBytes=256*1024,maxLineBytes=64*1024,maxSourceBytes=32*1024*1024}={}){
 integer(durationMs,'durationMs',0,15*60*1000);integer(pollMs,'pollMs',5,30000);integer(maxEvents,'maxEvents',1,100000);integer(maxBytes,'maxBytes',128,MAX_CAPTURE);integer(maxSourceBytes,'maxSourceBytes',1,128*1024*1024);
 if(typeof out!=='string'||!out)throw Error('Capture output directory required');file=resolve(file);out=resolve(out);noLinks(out);noLinks(file);
 if(within(dirname(file),out)||within(out,file))throw Error('Capture output cannot overlap the source log directory');
 if(existsSync(out))throw Error('Capture output must be a new directory');
 const follower=createLogFollower({file,identity,from,maxReadBytes,maxLineBytes});mkdirSync(out,{recursive:true});
 const dest=join(out,'events.jsonl'),fd=openSync(dest,'wx'),streamHash=createHash('sha256');let count=0,bytes=0,polls=0,truncated=false,stopped=false;
 const start=Date.now(),diagnostics=[],rotations=[],diagnosticCounts={};let failure=null,diagnosticsSuppressed=0,lastBacklogBytes=null;
 try{
  do{
   if(signal?.aborted){stopped=true;break;}
   if(follower.cursor.totalRead>=maxSourceBytes){truncated=true;break;}
   const batch=follower.poll({maxBytes:Math.min(maxReadBytes,maxSourceBytes-follower.cursor.totalRead)});polls++;lastBacklogBytes=batch.backlogBytes??null;truncated||=batch.truncated;if(batch.rotation){if(rotations.length<128)rotations.push({poll:polls,generation:batch.cursor.generation,kind:batch.rotation});else truncated=true;}
   for(const [code,n] of Object.entries(batch.diagnosticCounts??{}))diagnosticCounts[code]=(diagnosticCounts[code]??0)+n;
   diagnosticsSuppressed+=batch.diagnosticsSuppressed??0;
   for(const d of batch.diagnostics){if(diagnostics.length<128)diagnostics.push(d);else diagnosticsSuppressed++;}
   for(const row of batch.events){const b=Buffer.from(JSON.stringify({...row,sequence:count+1})+'\n');if(count>=maxEvents||bytes+b.length>maxBytes){truncated=true;break;}writeSync(fd,b);streamHash.update(b);bytes+=b.length;count++;}
   if(batch.cursor.totalRead>=maxSourceBytes&&batch.backlogBytes>0){truncated=true;if(diagnostics.length<128)diagnostics.push({code:'SOURCE_READ_LIMIT'});diagnosticCounts.SOURCE_READ_LIMIT=(diagnosticCounts.SOURCE_READ_LIMIT??0)+1;}
   if(truncated||Date.now()-start>=durationMs)break;
   await new Promise(resolve=>{const timer=setTimeout(done,Math.min(pollMs,Math.max(1,durationMs-(Date.now()-start))));function done(){clearTimeout(timer);signal?.removeEventListener('abort',done);resolve()}signal?.addEventListener('abort',done,{once:true});if(signal?.aborted)done();});
  }while(true);
 }catch(e){failure={type:e.name,code:token(e.code)??'CAPTURE_ERROR'};throw e;}
 finally{
  closeSync(fd);const cursor=follower.close();writeFileSync(join(out,'log-cursor.json'),JSON.stringify(cursor,null,2)+'\n',{flag:'wx'});
  if(lastBacklogBytes>0){truncated=true;diagnosticCounts.WINDOW_ENDED_WITH_BACKLOG=(diagnosticCounts.WINDOW_ENDED_WITH_BACKLOG??0)+1;if(diagnostics.length<128)diagnostics.push({code:'WINDOW_ENDED_WITH_BACKLOG',unreadBytes:lastBacklogBytes});else diagnosticsSuppressed++;}
  const manifest={schemaVersion:'autoforge.server-log-capture.v1',identity:follower.identity,source:{basename:basename(file),pathSha256:hash(file)},startedAt:new Date(start).toISOString(),endedAt:new Date().toISOString(),from,eventCount:count,polls,truncated,stopped:stopped||!!signal?.aborted,rotations,diagnostics,diagnosticCounts,diagnosticsSuppressed,cursor,failure,events:{path:'events.jsonl',bytes,sha256:streamHash.digest('hex')},coverage:{continuity:rotations.length?'ROTATIONS_OBSERVED':'NO_ROTATION_OBSERVED',unreadBacklogBytes:lastBacklogBytes,pendingLineBytes:cursor.pendingBytes,windowComplete:!truncated&&lastBacklogBytes===0&&cursor.pendingBytes===0&&!cursor.discarding&&!failure,sourceReadOnly:true,runtimeAttested:false},limits:{durationMs,pollMs,maxEvents,maxBytes,maxReadBytes,maxLineBytes,maxSourceBytes},limitations:['Only newline-terminated allowlisted records are exported; pending/unsupported lines remain explicit.','No raw log text, credentials, cookie/header values or arbitrary stack messages are exported.','Copy-truncate with identical observed fingerprints may not be distinguishable; no complete-history claim is made.','Commit/environment/test identity is declared, not an attestation of the running JAR.']};
  writeFileSync(join(out,'log-manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
 }
 return readLogCapture(out).manifest;
}

export function readLogCapture(directory){
 const root=resolve(directory);noLinks(root);
 function load(name,limit){const file=join(root,name);noLinks(file);const st=lstatSync(file);if(!st.isFile()||st.size>limit)throw Error('Capture evidence is not a bounded regular file');return readFileSync(file);}
 const m=JSON.parse(load('log-manifest.json',MAX_MANIFEST).toString('utf8').replace(/^\uFEFF/,''));
 if(m.schemaVersion!=='autoforge.server-log-capture.v1'||m.events?.path!=='events.jsonl'||!Number.isSafeInteger(m.eventCount)||m.eventCount<0||!/^([a-f0-9]{64})$/.test(m.events.sha256??''))throw Error('Invalid log capture manifest');
 const bytes=load('events.jsonl',MAX_CAPTURE);if(bytes.length!==m.events.bytes||hash(bytes)!==m.events.sha256)throw Error('Log capture hash/size mismatch');
 const events=bytes.toString('utf8').split('\n').filter(Boolean).map(s=>JSON.parse(s));
 if(events.length!==m.eventCount||events.some((e,i)=>e.sequence!==i+1||typeof e.event!=='string'||!e.source||!Number.isSafeInteger(e.source.offset)||!Number.isSafeInteger(e.source.endOffset)||e.source.endOffset<=e.source.offset||!/^[a-f0-9]{64}$/.test(e.source.lineSha256??'')))throw Error('Invalid log capture records');
 return {manifest:m,events};
}
