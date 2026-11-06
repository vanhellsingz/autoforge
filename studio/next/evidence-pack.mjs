// Evidence Pack v3: bounded, reviewed, secret-rejecting archive; no --force.
import {readFileSync,writeFileSync,mkdirSync,lstatSync,existsSync} from 'node:fs';
import {resolve,join,parse,sep,dirname,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';

const hash=b=>createHash('sha256').update(b).digest('hex');
const MAX=2*1024*1024;
const EXT=/\.(?:json|jsonl|ndjson|md|txt|log|xml|csv)$/i;
function pathSafe(p){
  if(typeof p!=='string'||!p||p.length>180||isAbsolute(p)||p.includes('\\')||p.includes(':')||p.split('/').some(x=>!x||x==='.'||x==='..'))throw Error('Unsafe evidence path');
  if(!EXT.test(p)||/(^|\/)(?:\.env|.*(?:secret|credential|password|token|private.key).*)/i.test(p))throw Error('Evidence path is not an approved report');
}
function noLinks(p){
  let at=parse(resolve(p)).root;
  for(const part of resolve(p).slice(at.length).split(sep).filter(Boolean)){
    at=join(at,part);
    if(existsSync(at)&&lstatSync(at).isSymbolicLink())throw Error('Symlink/junction path refused');
  }
}
function isSensitive(s){
  return /(?:gh[opusr]_[a-z0-9]{15,}|github_pat_[a-z0-9_]{16,}|Bearer\s+\S{12,}|(?:password|passwd|api[_-]?key|session[_-]?key|client[_-]?secret|authorization)\s*[:=]\s*["']?[^"'\s,}]{4,}|-----BEGIN\s+(?:RSA|OPENSSH|PRIVATE)\s+KEY-----|[a-z0-9.-]+\.trycloudflare\.com)/i.test(s);
}
export function makeEvidencePack({root,files}){
  root=resolve(root);noLinks(root);
  if(!Array.isArray(files)||!files.length||files.length>40||new Set(files.map(x=>x.toLowerCase())).size!==files.length)throw Error('Select 1..40 unique reviewed files');
  let total=0;const entries=[];
  for(const file of files){
    pathSafe(file);const absolute=resolve(root,file);noLinks(absolute);
    const st=lstatSync(absolute);if(!st.isFile()||st.size>MAX)throw Error('Evidence must be a bounded regular file');
    const bytes=readFileSync(absolute);total+=bytes.length;
    if(total>MAX)throw Error('Evidence pack exceeds 2MiB; use reviewed artifact storage');
    const s=bytes.toString('utf8');
    if(s.includes('\ufffd')||isSensitive(s))throw Error('Potentially sensitive or non-text evidence refused: '+file);
    entries.push({path:file,sha256:hash(bytes),bytes:bytes.length,content:bytes.toString('base64')});
  }
  const envelope={schemaVersion:'autoforge.evidence-pack.v3',policy:{integrityOnly:true,executionProven:false,noForceOverride:true},entries};
  const raw=Buffer.from(JSON.stringify(envelope),'utf8');
  return {buffer:gzipSync(raw),manifest:entries.map(({path,sha256,bytes})=>({path,sha256,bytes})),sha256:hash(raw)};
}
export function verifyEvidencePack(buffer){
  if(!Buffer.isBuffer(buffer)||buffer.length>MAX*3)throw Error('Evidence pack exceeds size limit');
  const raw=gunzipSync(buffer,{maxOutputLength:MAX*3});
  const value=JSON.parse(raw.toString('utf8'));
  if(value.schemaVersion!=='autoforge.evidence-pack.v3'||!Array.isArray(value.entries)||!value.entries.length||value.entries.length>40)throw Error('Invalid evidence pack schema');
  let total=0;const names=new Set();const records=[];
  for(const e of value.entries){
    pathSafe(e.path);const lower=e.path.toLowerCase();
    if(names.has(lower))throw Error('Repeated evidence paths');names.add(lower);
    if(!/^[a-f0-9]{64}$/i.test(e.sha256)||typeof e.content!=='string'||e.content.length>MAX*2)throw Error('Invalid evidence hash/content');
    const bytes=Buffer.from(e.content,'base64');
    total+=bytes.length;
    if(total>MAX||bytes.length!==e.bytes||bytes.toString('base64')!==e.content||hash(bytes)!==e.sha256)throw Error('Evidence integrity mismatch');
    if(isSensitive(bytes.toString('utf8')))throw Error('Sensitive evidence refused');
    records.push({path:e.path,sha256:e.sha256,bytes});
  }
  return {sha256:hash(raw),files:records.length,integrity:'VERIFIED',execution:'UNVERIFIED',records};
}
export function unpackEvidencePack(buffer,out){
  const result=verifyEvidencePack(buffer);
  out=resolve(out);noLinks(out);
  if(existsSync(out))throw Error('Unpack destination must not exist');
  mkdirSync(out,{recursive:true});
  for(const e of result.records){
    const p=join(out,e.path);mkdirSync(dirname(p),{recursive:true});
    writeFileSync(p,e.bytes,{flag:'wx'});
  }
  return {integrity:result.integrity,execution:result.execution,files:result.files,sha256:result.sha256};
}
export function evidenceAsText(buffer){
  const checked=verifyEvidencePack(buffer),s=buffer.toString('base64'),parts=['AFPACK_BEGIN:'+hash(buffer)+':'+checked.files];
  for(let i=0;i<s.length;i+=160)parts.push('AFPACK_DATA:'+s.slice(i,i+160));
  parts.push('AFPACK_END:'+hash(buffer));
  return parts.join('\n')+'\n';
}
export function evidenceFromText(text){
  const lines=text.split(/\r?\n/),begin=lines.filter(x=>x.startsWith('AFPACK_BEGIN:')),end=lines.filter(x=>x.startsWith('AFPACK_END:')),data=lines.filter(x=>x.startsWith('AFPACK_DATA:'));
  if(begin.length!==1||end.length!==1||!data.length)throw Error('Incomplete or repeated pack');
  const digest=begin[0].split(':')[1];
  if(!/^[a-f0-9]{64}$/.test(digest)||end[0]!=='AFPACK_END:'+digest)throw Error('Pack hash delimiters mismatch');
  const s=data.map(x=>x.slice('AFPACK_DATA:'.length)).join(''),buffer=Buffer.from(s,'base64');
  if(buffer.toString('base64')!==s||hash(buffer)!==digest)throw Error('Pack text altered or incomplete');
  verifyEvidencePack(buffer);return buffer;
}
