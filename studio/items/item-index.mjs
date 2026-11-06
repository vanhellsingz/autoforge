// Item catalogs are data only. No bundle, backend, SQL or item effect is executed.
import {readFileSync,readdirSync,lstatSync,existsSync} from 'node:fs';
import {resolve,join,relative,parse,sep} from 'node:path';
import {createHash} from 'node:crypto';
const H=b=>createHash('sha256').update(b).digest('hex');
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const FAMILIES=/^t_s_(?:item[a-z_]*|equip[a-z_]*|compose|drop[a-z_]*|gift[a-z_]*|suit[a-z_]*|gem[a-z_]*|buff[a-z_]*)$/i;
const NAME=/^(t_s_[a-z0-9_]+?)(?:-([a-f0-9]{8,64}))?\.json$/i;
const BAD=new Set(['__proto__','constructor','prototype']);
export function noItemLinks(path){const full=resolve(path);let at=parse(full).root;for(const part of full.slice(at.length).split(sep).filter(Boolean)){at=join(at,part);if(existsSync(at)&&lstatSync(at).isSymbolicLink())throw Error('Item source links/junctions refused');}return full;}
export function itemId(value){if(typeof value==='number'){if(!Number.isSafeInteger(value))return null;return String(value);}if(typeof value==='string'&&/^-?\d{1,16}$/.test(value)){const n=Number(value);return Number.isSafeInteger(n)?String(n):null;}return null;}
function assertData(value,depth=0){if(depth>20)throw Error('Catalog nesting exceeds limit');if(Array.isArray(value)){for(const x of value)assertData(x,depth+1);}else if(plain(value)){for(const [k,v] of Object.entries(value)){if(BAD.has(k))throw Error('Unsafe catalog object key');assertData(v,depth+1);}}else if(typeof value==='number'&&!Number.isFinite(value))throw Error('Non-finite catalog number');else if(value!==null&&!['string','number','boolean'].includes(typeof value))throw Error('Unsupported catalog value');}
function rowId(fields){for(const k of ['TemplateId','Id','id','templateId'])if(Object.hasOwn(fields,k)){const id=itemId(fields[k]);if(id!==null)return {id,idField:k};}return {id:null,idField:null};}
/** Supports actual Laya {t_s_table:[rows]}, arrays, named wrappers and keyed row maps. */
export function catalogRows(value,table,path='$',depth=0){
 if(depth>5)throw Error('Unsupported nested catalog shape');
 if(Array.isArray(value)){if(value.some(v=>!plain(v)))throw Error('Catalog array must contain object rows');return value.map((fields,i)=>({rowKey:`${path}[${i}]`,fields}));}
 if(!plain(value))throw Error('Unsupported catalog shape');
 if(Object.hasOwn(value,table))return catalogRows(value[table],table,`${path}[${JSON.stringify(table)}]`,depth+1);
 if(rowId(value).id!==null)return [{rowKey:path,fields:value}];
 for(const key of ['rows','data','records','items'])if(Object.hasOwn(value,key)&&(Array.isArray(value[key])||plain(value[key])))return catalogRows(value[key],table,`${path}[${JSON.stringify(key)}]`,depth+1);
 const entries=Object.entries(value);
 if(entries.length===0)return [];
 if(entries.every(([,v])=>plain(v)&&rowId(v).id!==null))return entries.map(([key,fields])=>({rowKey:`${path}[${JSON.stringify(key)}]`,fields}));
 if(entries.length===1&&(plain(entries[0][1])||Array.isArray(entries[0][1]))){const [key,nested]=entries[0];return catalogRows(nested,table,`${path}[${JSON.stringify(key)}]`,depth+1);}
 throw Error('Unsupported catalog row map');
}
export function fieldType(value){if(value===null)return 'null';if(Array.isArray(value))return 'array<'+[...new Set(value.map(fieldType))].sort().join('|')+'>';return plain(value)?'object':typeof value;}
export function buildItemIndex({client,maxFiles=64,maxFileBytes=32*1024*1024,maxTotalBytes=128*1024*1024,maxRows=200000}={}){
 if(typeof client!=='string'||!client)throw Error('Client directory required');
 for(const [key,v] of Object.entries({maxFiles,maxFileBytes,maxTotalBytes,maxRows}))if(!Number.isSafeInteger(v)||v<1)throw Error('Invalid item index limit: '+key);
 const root=noItemLinks(client),dir=noItemLinks(join(root,'res/release/config'));
 if(!lstatSync(dir).isDirectory())throw Error('Client config directory missing');
 const files=[],seenNames=new Set();
 for(const entry of readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en'))){const m=NAME.exec(entry.name);if(!m||!FAMILIES.test(m[1]))continue;if(entry.isSymbolicLink())throw Error('Catalog source link refused');if(!entry.isFile())continue;const logicalName=m[1].toLowerCase();if(seenNames.has(logicalName))throw Error('Ambiguous catalog build: '+logicalName);seenNames.add(logicalName);files.push({name:entry.name,logicalName});}
 if(!files.some(f=>f.logicalName==='t_s_itemtemplate'))throw Error('Required t_s_itemtemplate catalog missing');
 // Primary items are processed first so a source limit cannot silently erase the corpus.
 files.sort((a,b)=>(a.logicalName==='t_s_itemtemplate'?-1:b.logicalName==='t_s_itemtemplate'?1:a.logicalName.localeCompare(b.logicalName,'en')));
 const sources=[],tables=[],items=[],skipped=[],ids=new Set();let bytesRead=0,rowsRead=0;
 for(let f=0;f<files.length;f++){
  const {name,logicalName}=files[f],absolute=noItemLinks(join(dir,name)),path=relative(root,absolute).replaceAll('\\','/'),stat=lstatSync(absolute);
  if(f>=maxFiles){skipped.push({path,reason:'FILE_COUNT_LIMIT'});continue;}
  if(stat.size>maxFileBytes){skipped.push({path,reason:'FILE_BYTE_LIMIT',bytes:stat.size});continue;}
  if(bytesRead+stat.size>maxTotalBytes){skipped.push({path,reason:'TOTAL_BYTE_LIMIT',bytes:stat.size});continue;}
  const bytes=readFileSync(absolute);bytesRead+=bytes.length;
  const sha256=H(bytes);let rows;
  try{const parsed=JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/,''));assertData(parsed);rows=catalogRows(parsed,logicalName);}catch(error){if(/Unsafe catalog|nesting exceeds/.test(error.message))throw error;skipped.push({path,reason:'UNSUPPORTED_OR_INVALID_JSON',detail:String(error.message).slice(0,160)});continue;}
  const source={path,logicalName,sha256,bytes:bytes.length,rows:rows.length};sources.push(source);
  const accepted=[];
  for(const row of rows){if(rowsRead>=maxRows){skipped.push({path,reason:'ROW_COUNT_LIMIT',remaining:rows.length-accepted.length});break;}rowsRead++;const identity=rowId(row.fields);if(logicalName==='t_s_itemtemplate'&&identity.id===null)throw Error('Item row has no explicit safe integer identity: '+row.rowKey);
   const record={...identity,rowKey:row.rowKey,fields:row.fields};accepted.push(record);
   if(logicalName==='t_s_itemtemplate'){
    if(ids.has(identity.id))throw Error('Duplicate item identity: '+identity.id);ids.add(identity.id);
    const name=['TemplateName_pt','Name_pt','TemplateName_en','Name_en','TemplateName','Name','TemplateName_zhcn'].map(k=>row.fields[k]).find(v=>typeof v==='string'&&v.trim())??null;
    items.push({id:identity.id,name,fields:row.fields,source:{path,logicalName,rowKey:row.rowKey,sha256},fieldTypes:Object.fromEntries(Object.entries(row.fields).map(([k,v])=>[k,fieldType(v)]))});
   }
  }
  tables.push({name:logicalName,source,rows:logicalName==='t_s_itemtemplate'?accepted.map(({fields,...row})=>row):accepted});
 }
 items.sort((a,b)=>Number(a.id)-Number(b.id));
 const complete=skipped.length===0;
 return {schemaVersion:'autoforge.items-index.v1',client:root,sourceDigest:H(JSON.stringify(sources.map(s=>[s.path,s.sha256]))),sources,items,tables,coverage:{complete,truncated:!complete,filesDiscovered:files.length,filesRead:sources.length,rowsRead,itemCount:items.length,bytesRead,skipped,limits:{maxFiles,maxFileBytes,maxTotalBytes,maxRows}},claims:{catalogDataOnly:true,allItemEffectsImplemented:false,runtimeVerified:false},limitations:['Only explicit item/equipment/compose/drop/gift/suite/gem/buff catalog families are indexed.','Catalog fields and references are static data, not proof of item use, rewards, price enforcement or backend integration.','Unsupported catalog shapes and bounds remain visible as incomplete coverage.']};
}
const folded=s=>String(s).normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase();
export function searchItemIndex(index,{query='',id,offset=0,limit=50,category}={}){
 if(index?.schemaVersion!=='autoforge.items-index.v1'||!Array.isArray(index.items))throw Error('Invalid item index');
 if(typeof query!=='string'||query.length>500||!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(limit)||limit<1||limit>500)throw Error('Invalid item search/page');
 const wanted=id===undefined?null:itemId(id);if(id!==undefined&&wanted===null)throw Error('Invalid item identity');
 if(category&&(!plain(category)||!['MasterType','SonType','Type','Category'].includes(category.field)||!['number','string'].includes(typeof category.value)))throw Error('Category filter requires an explicit original field and value');
 const q=folded(query),matches=index.items.filter(item=>(wanted===null||item.id===wanted)&&(!category||item.fields[category.field]===category.value)&&(!q||folded([item.id,item.name,...Object.entries(item.fields).filter(([k,v])=>/name/i.test(k)&&typeof v==='string').map(([,v])=>v)].join(' ')).includes(q)));
 return {sourceDigest:index.sourceDigest,total:matches.length,offset,limit,items:matches.slice(offset,offset+limit),coverage:index.coverage};
}
