// AutoForge Studio Next: lexical protocol gap matrix. It never certifies handler absence.
import {promises as fs} from 'node:fs';
import path from 'node:path';

const DECL = /\b(?:public\s+)?(?:static\s+)?(?:final\s+)?(?:int|short|long)\s+([A-Z][A-Z0-9_]{2,})\s*=\s*(0x[0-9a-f]+|\d+)\s*;/gi;
const CASE = /\bcase\s+(?:[A-Za-z_]\w*\.)?([A-Z][A-Z0-9_]{2,})\s*(?:->|:|,)/g;
const REF = /\b(?:Opcodes|Op|OpCode|Protocol)\.([A-Z][A-Z0-9_]{2,})\b/g;
function line(text,index) {let n=1;for(let i=0;i<index;i++)if(text.charCodeAt(i)===10)n++;return n;}
async function walk(root) {
  const out=[],q=[root];
  while(q.length){
    const dir=q.pop();
    for(const e of await fs.readdir(dir,{withFileTypes:true})){
      if(e.isSymbolicLink()||['.git','target','build','.gradle','node_modules'].includes(e.name))continue;
      const p=path.join(dir,e.name);
      if(e.isDirectory())q.push(p);
      else if(e.isFile()&&p.endsWith('.java')){out.push(p);if(out.length>30000)throw Error('Java scan file limit exceeded');}
    }
  }
  return out.sort();
}
export async function scanBackend(root) {
  root=path.resolve(root);
  const st=await fs.lstat(root);if(!st.isDirectory()||st.isSymbolicLink())throw Error('Backend must be a real directory');
  const declared=new Map(),dispatch=new Map(),references=new Map();
  const add=(m,k,v)=>m.set(k,[...(m.get(k)??[]),v]);
  const files=await walk(root);
  for(const f of files){
    const st=await fs.lstat(f);if(st.size>16*1024*1024)throw Error('Java file is too large');
    const src=await fs.readFile(f,'utf8'),rel=path.relative(root,f).split(path.sep).join('/');
    const opcodeSource=/Opcodes?\.java$/i.test(f);
    if(opcodeSource)for(const m of src.matchAll(DECL)){
      const value=Number(m[2]);if(!Number.isSafeInteger(value))continue;
      if(!declared.has(m[1]))declared.set(m[1],{value,path:rel,line:line(src,m.index)});
      else if(declared.get(m[1]).value!==value)declared.get(m[1]).ambiguous=true;
    }
    for(const m of src.matchAll(CASE))add(dispatch,m[1],{path:rel,line:line(src,m.index)});
    if(!opcodeSource)for(const m of src.matchAll(REF))add(references,m[1],{path:rel,line:line(src,m.index)});
  }
  return {filesScanned:files.length,declared,dispatch,references,analysis:'LEXICAL_ONLY'};
}
export function usageFromEvents(events) {
  const use=new Map();
  for(const ev of events??[]){
    if(ev.kind!=='frame')continue;
    const data=ev.data??{};
    // transportOpcode 2 identifies websocket BINARY frames, not a game opcode.
    const opcode=ev.opcode??data.gameOpcode??data.opcode;
    const direction=ev.dir??data.direction;
    if(!Number.isSafeInteger(opcode)||opcode<0||!['C2S','S2C'].includes(direction))continue;
    const u=use.get(opcode)??{c2s:0,s2c:0,sessionIds:new Set(),verifiedDecoder:false};
    u[direction.toLowerCase()]++;
    if(typeof (ev.session??ev.sessionId)==='string')u.sessionIds.add(ev.session??ev.sessionId);
    // Only a reviewed transport decoder may claim a known game opcode.
    if(data.decoderReviewed===true||ev.decoderReviewed===true)u.verifiedDecoder=true;
    use.set(opcode,u);
  }
  return use;
}
export function buildGapMatrix({discovery,backend,events=[],match=null}={}) {
  if(!discovery||!backend)throw Error('Discovery and Java scan are required');
  const filter=match?new RegExp(match,'i'):null,client=new Map(),use=usageFromEvents(events),rows=[];
  for(const op of discovery.opcodes??[]){
    if(typeof op.name!=='string'||!Number.isSafeInteger(op.opcode)||(filter&&!filter.test(op.name)))continue;
    const s=client.get(op.name)??new Set();s.add(op.opcode);client.set(op.name,s);
  }
  const serverValues=new Map();
  for(const [name,d] of backend.declared)serverValues.set(d.value,[...(serverValues.get(d.value)??[]),name]);
  for(const [name,values] of client){
    const decl=backend.declared.get(name),num=[...values],r=backend.references.get(name)??[],cases=backend.dispatch.get(name)??[];
    const seen=num.map(n=>use.get(n)).filter(Boolean);
    const c2s=seen.reduce((a,x)=>a+x.c2s,0),s2c=seen.reduce((a,x)=>a+x.s2c,0);
    let status='static-reference',severity='info';
    if(decl?.ambiguous){status='ambiguous-server-constant';severity='review';}
    else if(decl&&!values.has(decl.value)){status='value-mismatch';severity='review';}
    else if(!decl){status=(serverValues.get(num[0])??[]).length?'alias-or-name-mismatch':'no-constant-found';severity='gap';}
    else if(cases.length)status='switch-case-found';
    else if(r.length)status='reference-found-no-case';
    else {status='no-dispatch-evidence';severity='gap';}
    if(c2s>0 && severity!=='info'){
      status='observed-c2s:'+status;
      severity=seen.some(x=>x.verifiedDecoder)?'critical-candidate':'review';
    }
    rows.push({name,clientValues:num,server:decl??null,dispatch:cases.slice(0,4),references:r.length,
      observed:{c2s,s2c,reviewedDecoder:seen.some(x=>x.verifiedDecoder)},status,severity,
      conclusion:'CANDIDATE_ONLY'});
  }
  const known=new Set([...client.values()].flatMap(x=>[...x]).concat([...backend.declared.values()].map(d=>d.value)));
  for(const [opcode,u] of use)if(!known.has(opcode))rows.push({name:'UNKNOWN_'+opcode,clientValues:[],
    status:'observed-unmapped-opcode',severity:u.verifiedDecoder?'critical-candidate':'review',observed:{c2s:u.c2s,s2c:u.s2c,reviewedDecoder:u.verifiedDecoder}});
  const ranks={'critical-candidate':0,review:1,gap:2,info:3};
  rows.sort((a,b)=>ranks[a.severity]-ranks[b.severity]||(b.observed?.c2s??0)-(a.observed?.c2s??0)||a.name.localeCompare(b.name));
  return {schemaVersion:'autoforge.protocol-gap-matrix.v3',generatedAt:new Date().toISOString(),
    inputs:{clientOpcodes:client.size,javaFilesScanned:backend.filesScanned,decodedFrames:[...use.values()].reduce((a,u)=>a+u.c2s+u.s2c,0)},
    summary:{criticalCandidates:rows.filter(r=>r.severity==='critical-candidate').length,review:rows.filter(r=>r.severity==='review').length,gaps:rows.filter(r=>r.severity==='gap').length},
    rows,policy:{implementationProof:false,handlerAbsenceProven:false,reason:'Static regex and optional frame evidence do not resolve dynamic dispatch or prove runtime behavior.'}};
}
export function renderGapMarkdown(report,{limit=80}={}) {
  const lines=['# AutoForge — candidate protocol gaps','',
    'Critical candidates are triage hints. Verify C2S -> Java handler -> DB -> S2C -> UI -> relogin.','',
    'Critical candidates: '+report.summary.criticalCandidates+
    ' | Review: '+report.summary.review+' | Static gaps: '+report.summary.gaps,''];
  lines.push('| Name | Values | Status | C2S | Evidence |','|---|---|---|---:|---|');
  for(const r of report.rows.slice(0,limit))
    lines.push('| '+r.name+' | '+(r.clientValues??[]).join(',')+' | '+r.status+' | '+(r.observed?.c2s??0)+' | '+(r.server?.path??'unresolved')+' |');
  return lines.join('\n')+'\n';
}
