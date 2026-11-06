// Shared bounded DATA loader for the three gameplay intelligence modules.
import {readFileSync,readdirSync,lstatSync,existsSync} from 'node:fs';
import {resolve,join,relative,parse,sep,isAbsolute} from 'node:path';import {createHash} from 'node:crypto';
import {catalogRows,itemId} from '../items/item-index.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const FILE=/^(t_s_[a-z0-9_]+?)(?:-[a-f0-9]{8,64})?\.json$/i;
export function gamePath(path){path=resolve(path);let at=parse(path).root;for(const part of path.slice(at.length).split(sep).filter(Boolean)){at=join(at,part);if(existsSync(at)&&lstatSync(at).isSymbolicLink())throw Error('Gameplay source links/junctions refused');}return path;}
function data(v,depth=0){if(depth>24)throw Error('Catalog nesting limit');if(Array.isArray(v)){for(const x of v)data(x,depth+1);}else if(v&&typeof v==='object'){for(const [k,x] of Object.entries(v)){if(['__proto__','constructor','prototype'].includes(k))throw Error('Unsafe catalog key');data(x,depth+1);}}else if(typeof v==='number'&&(!Number.isFinite(v)||(Number.isInteger(v)&&!Number.isSafeInteger(v))))throw Error('Unsafe numeric catalog value');}
export function readGameCatalogs({client,include=/.*/,maxFiles=256,maxRows=150000,maxFileBytes=32*1024*1024,maxTotalBytes=128*1024*1024}={}){
 if(typeof client!=='string'||!client||!(include instanceof RegExp))throw Error('Client and explicit catalog selector required');
 for(const n of [maxFiles,maxRows,maxFileBytes,maxTotalBytes])if(!Number.isSafeInteger(n)||n<1)throw Error('Invalid catalog bound');
 const root=gamePath(client),dir=gamePath(join(root,'res/release/config')),available=[],selected=[],seen=new Set();
 for(const e of readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en'))){const m=FILE.exec(e.name);if(!m)continue;const name=m[1].toLowerCase();available.push(name);include.lastIndex=0;if(!include.test(name))continue;if(e.isSymbolicLink())throw Error('Linked catalog refused');if(!e.isFile())continue;if(seen.has(name))throw Error('Ambiguous catalog build: '+name);seen.add(name);selected.push({name,file:e.name});}
 const tables=[],sources=[],skipped=[];let bytesRead=0,rowsRead=0;
 for(const s of selected){
  if(sources.length>=maxFiles){skipped.push({table:s.name,reason:'FILE_LIMIT'});continue;}
  const path='res/release/config/'+s.file,full=gamePath(join(root,path)),st=lstatSync(full);
  if(st.size>maxFileBytes||bytesRead+st.size>maxTotalBytes){skipped.push({table:s.name,reason:'BYTE_LIMIT'});continue;}
  const bytes=readFileSync(full),source={path,logicalName:s.name,sha256:hash(bytes),bytes:bytes.length};bytesRead+=bytes.length;sources.push(source);
  let records;try{const parsed=JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/,''));data(parsed);records=catalogRows(parsed,s.name);}catch{skipped.push({table:s.name,reason:'UNSUPPORTED_OR_UNSAFE_SCHEMA'});continue;}
  if(rowsRead+records.length>maxRows){skipped.push({table:s.name,reason:'ROW_LIMIT'});continue;}
  const rows=records.map(r=>{let id=null;for(const k of ['Id','TemplateId','id','templateId'])if(Object.hasOwn(r.fields,k)){id=itemId(r.fields[k]);if(id!==null)break;}return {id,fields:r.fields,source:{path,logicalName:s.name,sha256:source.sha256,rowKey:r.rowKey}};});
  rowsRead+=rows.length;tables.push({name:s.name,logicalName:s.name,source,rows});
 }
 verifyGameSources({client:root,sources});
 const complete=selected.length>0&&skipped.length===0;
 return {schemaVersion:'autoforge.game-catalogs.v1',client:root,sourceDigest:hash(JSON.stringify(sources.map(s=>[s.path,s.sha256]))),sources,tables,availableTables:[...new Set(available)],coverage:{complete,truncated:skipped.length>0,selectedFiles:selected.length,files:sources.length,tables:tables.length,rows:rowsRead,bytes:bytesRead,skipped,...(!selected.length?{missing:'NO_CATALOGS_FOUND'}:{})},limits:{maxFiles,maxRows,maxFileBytes,maxTotalBytes},runtime:'UNVERIFIED'};
}
export function verifyGameSources({client,sources}){
 const root=gamePath(client);if(!Array.isArray(sources)||sources.length>1024)throw Error('Invalid sources');
 for(const s of sources){if(typeof s.path!=='string'||!/^res\/release\/config\/t_s_[a-z0-9_-]+\.json$/i.test(s.path)||!/^[a-f0-9]{64}$/i.test(s.sha256??''))throw Error('Unsafe source reference');const p=gamePath(join(root,s.path)),rel=relative(root,p);if(isAbsolute(rel)||rel==='..'||rel.startsWith('..'+sep))throw Error('Source outside client');const st=lstatSync(p);if(!st.isFile()||st.size>64*1024*1024||hash(readFileSync(p))!==s.sha256)throw Error('Gameplay source changed: '+s.path);}
 return {status:'SOURCE_HASHES_MATCH',runtime:'UNVERIFIED'};
}
