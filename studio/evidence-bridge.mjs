import {readFileSync,writeFileSync,mkdirSync,lstatSync,existsSync} from 'node:fs';
import {resolve,join,dirname,parse,sep,isAbsolute,relative} from 'node:path';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const MAX=2*1024*1024;
function noLinks(path){let p=parse(resolve(path)).root;for(const part of resolve(path).slice(p.length).split(sep).filter(Boolean)){p=join(p,part);if(existsSync(p)&&lstatSync(p).isSymbolicLink())throw Error('Evidence links/junctions refused');}}
function name(n){if(typeof n!=='string'||n.length>180||!n||n.includes('\\')||isAbsolute(n)||/[:\x00-\x1f]/.test(n)||n.split('/').some(s=>!s||s==='.'||s==='..')||!/^[-\w./]+\.(json|jsonl|ndjson|md|txt|xml)$/.test(n)||/(^|\/)(\.env|.*(?:credential|password|secret|\.dpapi).*)/i.test(n))throw Error('Unsafe or non-report evidence path');return n;}
export function packEvidence({root,files}){
 if(!Array.isArray(files)||!files.length||files.length>40||new Set(files.map(f=>f.toLowerCase())).size!==files.length)throw Error('Select 1..40 unique reviewed report files');
 root=resolve(root);noLinks(root);let total=0;
 const entries=files.map(n=>{name(n);const p=resolve(root,n);noLinks(p);const st=lstatSync(p);if(!st.isFile()||st.size>MAX)throw Error('Evidence file too large or not regular');const bytes=readFileSync(p);total+=bytes.length;if(total>MAX)throw Error('Log transport limit exceeded; use reviewed artifact storage for large evidence');return {path:n,sha256:sha(bytes),bytes:bytes.length,base64:bytes.toString('base64')};});
 const bundle={schemaVersion:'autoforge.bridge.v1',entries,claims:{integrityOnly:true,executionVerified:false}};
 const bytes=Buffer.from(JSON.stringify(bundle)),encoded=bytes.toString('base64'),digest=sha(bytes);
 const lines=[`AUTOFORGE_BRIDGE_BEGIN:${digest}`];for(let i=0;i<encoded.length;i+=160)lines.push(`AUTOFORGE_BRIDGE_DATA:${encoded.slice(i,i+160)}`);lines.push(`AUTOFORGE_BRIDGE_END:${digest}`);
 return {sha256:digest,files:entries.map(({path,sha256,bytes})=>({path,sha256,bytes})),log:lines.join('\n')+'\n'};
}
export function importEvidence({log,out,expectedSha256}){
 if(typeof log!=='string'||Buffer.byteLength(log)>MAX*4)throw Error('Bridge log too large');
 let begin=null,end=null,data='';
 for(const line of log.split(/\r?\n/)){
  const m=line.match(/AUTOFORGE_BRIDGE_(BEGIN|END|DATA):([a-zA-Z0-9+/=]+)\s*$/);if(!m)continue;
  if(m[1]==='BEGIN'){if(begin||end)throw Error('Repeated evidence bundles must be imported separately');begin=m[2];}
  else if(m[1]==='END'){if(!begin||end)throw Error('Invalid bridge end');end=m[2];}
  else{if(!begin||end)throw Error('Bridge data outside bundle');data+=m[2];}
 }
 if(!begin||!end||begin!==end||!/^[a-f0-9]{64}$/.test(begin))throw Error('Truncated evidence bundle');
 const bytes=Buffer.from(data,'base64');if(bytes.toString('base64')!==data||sha(bytes)!==begin||(expectedSha256&&begin!==expectedSha256))throw Error('Bridge hash mismatch');
 const bundle=JSON.parse(bytes.toString('utf8'));if(bundle.schemaVersion!=='autoforge.bridge.v1'||!Array.isArray(bundle.entries)||!bundle.entries.length||bundle.entries.length>40)throw Error('Invalid bridge schema');
 const seen=new Set();let total=0;const records=bundle.entries.map(e=>{name(e.path);const folded=e.path.toLowerCase();if(seen.has(folded))throw Error('Repeated evidence path');seen.add(folded);const b=Buffer.from(e.base64,'base64');total+=b.length;if(total>MAX||b.toString('base64')!==e.base64||b.length!==e.bytes||sha(b)!==e.sha256)throw Error('Evidence content/hash mismatch');return {...e,content:b};});
 out=resolve(out);noLinks(out);if(existsSync(out))throw Error('Import requires a new output directory');
 // Validate the entire bundle before any write. No extraction outside the chosen new directory.
 mkdirSync(out,{recursive:true});for(const e of records){const p=join(out,e.path);mkdirSync(dirname(p),{recursive:true});writeFileSync(p,e.content,{flag:'wx'});}
 return {schemaVersion:'autoforge.bridge-import.v1',sha256:begin,files:records.map(({path,sha256,bytes})=>({path,sha256,bytes})),integrity:'VERIFIED',execution:'UNVERIFIED'};
}
