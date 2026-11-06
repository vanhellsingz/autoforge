// AutoForge Studio Next: read-only Drift Watch. Evidence is static, never gameplay proof.
import {createHash} from 'node:crypto';
import {promises as fs} from 'node:fs';
import path from 'node:path';

const H = b => createHash('sha256').update(b).digest('hex');
const logical = p => p.replace(/-[0-9a-f]{8,12}(?=\.[a-z0-9]+$)/i,'');
const exts = new Set(['.js','.json','.proto','.atlas','.html']);
const valid = s => typeof s === 'string' && s.length > 0;
export const logicalName = logical;

async function listFiles(root,maxFiles=200000) {
  const found=[], pending=[root];
  while (pending.length) {
    const dir=pending.pop();
    const entries=(await fs.readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (entry.isSymbolicLink() || ['.git','node_modules','target','.gradle'].includes(entry.name)) continue;
      const f=path.join(dir,entry.name);
      if (entry.isDirectory()) pending.push(f);
      else if (entry.isFile()) {
        found.push(f);
        if (found.length > maxFiles) throw Error('Too many files in source snapshot');
      }
    }
  }
  return found.sort();
}
export async function snapshotClient(root,{maxFiles=200000,maxFileBytes=80*1024*1024}={}) {
  root=path.resolve(root);
  const stat=await fs.lstat(root);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw Error('Client root must be a real directory');
  const files=[];
  for (const f of await listFiles(root,maxFiles)) {
    if (!exts.has(path.extname(f).toLowerCase())) continue;
    const stat=await fs.lstat(f);
    if (!stat.isFile() || stat.size>maxFileBytes) throw Error('Client file too large: '+f);
    const rel=path.relative(root,f).split(path.sep).join('/');
    const bytes=await fs.readFile(f);
    files.push({path:rel,logical:logical(rel),bytes:bytes.length,sha256:H(bytes)});
  }
  // Reject logical-name collisions; otherwise a hashed filename could hide changes.
  const seen=new Set();
  for (const f of files) {
    if (seen.has(f.logical)) throw Error('Ambiguous logical client asset: '+f.logical);
    seen.add(f.logical);
  }
  files.sort((a,b)=>a.logical.localeCompare(b.logical));
  const rootHash=H(JSON.stringify(files.map(f=>[f.logical,f.sha256])));
  return {schemaVersion:'autoforge.client-snapshot.v3',createdAt:new Date().toISOString(),rootHash,files};
}
export function diffSnapshots(a,b) {
  if (!Array.isArray(a?.files) || !Array.isArray(b?.files)) throw Error('Invalid client snapshots');
  const one=new Map(a.files.map(x=>[x.logical,x])),two=new Map(b.files.map(x=>[x.logical,x]));
  if (one.size!==a.files.length || two.size!==b.files.length) throw Error('Ambiguous logical snapshot');
  const added=[],removed=[],changed=[];
  for (const [k,v] of two) {
    if (!one.has(k)) added.push(v.path);
    else if (one.get(k).sha256!==v.sha256) changed.push({logical:k,before:one.get(k).path,after:v.path,oldSha256:one.get(k).sha256,newSha256:v.sha256});
  }
  for (const [k,v] of one) if (!two.has(k)) removed.push(v.path);
  return {schemaVersion:'autoforge.snapshot-diff.v3',identical:!added.length&&!removed.length&&!changed.length,added,removed,changed,proof:'STATIC_FILE_HASHES_ONLY'};
}
function opcodes(d) {
  const m=new Map();
  for(const x of d.opcodes??[]) {
    if(!valid(x.name) || !Number.isSafeInteger(x.opcode))continue;
    const s=m.get(x.name)??new Set();s.add(x.opcode);m.set(x.name,s);
  }
  return m;
}
function byName(a,k='name') {
  const m=new Map();for(const x of a??[])if(valid(x?.[k]))m.set(x[k],x);return m;
}
export function diffDiscovery(oldD,newD) {
  const changes=[],staleSourceHashes=[];
  const add=(severity,area,id,detail)=>changes.push({severity,area,id,detail});
  const a=opcodes(oldD),b=opcodes(newD);
  for(const [name,values] of b) {
    if(!a.has(name))add('additive','opcode',name,'New opcode');
    else if([...a.get(name)].sort().join(',')!==[...values].sort().join(','))add('breaking','opcode',name,'Opcode numeric value changed');
  }
  for(const name of a.keys())if(!b.has(name))add('breaking','opcode',name,'Opcode removed');
  const am=byName(oldD.messages),bm=byName(newD.messages);
  for(const [name,msg] of bm) {
    if(!am.has(name)){add('additive','message',name,'New message');continue;}
    const fa=new Map((am.get(name).fields??[]).map(x=>[String(x.id),x]));
    const fb=new Map((msg.fields??[]).map(x=>[String(x.id),x]));
    for(const [id,f] of fb){
      if(!fa.has(id))add('additive','message-field',name+'#'+id,'New field');
      else if(f.type!==fa.get(id).type||f.name!==fa.get(id).name)add('breaking','message-field',name+'#'+id,'Field type/name changed');
    }
    for(const id of fa.keys())if(!fb.has(id))add('breaking','message-field',name+'#'+id,'Field removed');
  }
  for(const name of am.keys())if(!bm.has(name))add('breaking','message',name,'Message removed');
  const tabs=d=>{const m=new Map();for(const cat of d.catalogs??[])for(const t of cat.tables??[])if(valid(t.table))m.set(t.table,{...t,sha256:cat.sha256});return m;};
  const ta=tabs(oldD),tb=tabs(newD);
  for(const [name,t] of tb) {
    if(!ta.has(name)){add('additive','table',name,'New table');continue;}
    const p=ta.get(name);
    const lost=(p.fields??[]).filter(f=>!(t.fields??[]).includes(f));
    const extra=(t.fields??[]).filter(f=>!(p.fields??[]).includes(f));
    if(lost.length)add('breaking','table',name,'Columns removed: '+lost.join(','));
    if(extra.length)add('additive','table',name,'Columns added: '+extra.join(','));
    if(p.rows!==t.rows||p.sha256!==t.sha256)add('data','table',name,'Data/catalog changed');
  }
  for(const name of ta.keys())if(!tb.has(name))add('breaking','table',name,'Table removed');
  const sourceOld=new Map((oldD.sources??[]).map(s=>[logical(s.path),s]));
  for(const s of newD.sources??[]) {
    const before=sourceOld.get(logical(s.path));
    if(before?.sha256 && before.sha256!==s.sha256) {
      staleSourceHashes.push(before.sha256);
      add('code','source',logical(s.path),'Source hash changed; extracted formulas require revalidation');
    }
  }
  const summary={};for(const k of ['breaking','additive','data','code'])summary[k]=changes.filter(c=>c.severity===k).length;
  return {schemaVersion:'autoforge.drift-report.v3',generatedAt:new Date().toISOString(),changes,staleSourceHashes,summary,limits:'STATIC_ANALYSIS_ONLY'};
}
export async function impactedArtifacts(diff,{contractsDir=null,evidenceFiles=[]}={}) {
  const changedOps=new Set(diff.changes.filter(c=>c.severity==='breaking'&&c.area==='opcode').map(c=>c.id));
  const changedMsgs=new Set(diff.changes.filter(c=>c.severity==='breaking'&&c.area.startsWith('message')).map(c=>c.id.split('#')[0]));
  const impacted=[];
  if(contractsDir){
    for(const f of (await listFiles(path.resolve(contractsDir))).filter(p=>p.endsWith('.contract.json'))){
      const data=JSON.parse(await fs.readFile(f,'utf8'));
      const ops=(data.operations??[]).filter(o=>changedOps.has(o.name)||changedMsgs.has(o.message?.name));
      if(ops.length)impacted.push({kind:'contract',path:f,feature:data.feature??null,reason:'Opcode/message changed',action:'REVIEW_AND_REGENERATE'});
    }
  }
  for(const f of evidenceFiles){
    const s=await fs.readFile(f,'utf8');
    if(diff.staleSourceHashes.some(h=>s.includes(h)))impacted.push({kind:'evidence',path:f,reason:'Outdated source hash',action:'REGENERATE'});
  }
  return impacted;
}
