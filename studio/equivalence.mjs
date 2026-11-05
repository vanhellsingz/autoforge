// Compares recorded effects. It does not execute the client or certify that a run occurred.
import {readFileSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join,parse,sep,isAbsolute} from 'node:path';
const COMMIT=/^[a-f0-9]{40,64}$/i,HASH=/^[a-f0-9]{64}$/i;
const FIELDS=new Set(['inventory','currencies','attributes','ui','persistence']);
const MAX_ITEMS=100000,MAX_ARTIFACT=8*1024*1024;
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const hash=b=>createHash('sha256').update(b).digest('hex');
export function canonical(value){
 if(value===null||typeof value==='boolean'||typeof value==='string')return JSON.stringify(value);
 if(typeof value==='number'){if(!Number.isFinite(value))throw Error('Non-finite number');return JSON.stringify(value);}
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(object(value))return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
 throw Error('Unsupported or missing value');
}
export function normalizeInventory(items){
 if(!Array.isArray(items)||items.length>MAX_ITEMS)throw Error('Inventory requires bounded rows');
 const totals=Object.create(null);
 for(const item of items){
  if(!object(item)||!Number.isSafeInteger(item.templateId)||item.templateId<1||typeof item.bound!=='boolean'||!Number.isSafeInteger(item.quantity)||item.quantity<0)throw Error('Invalid inventory template/binding/quantity');
  const key=item.templateId+':'+Number(item.bound),next=(totals[key]??0)+item.quantity;
  if(!Number.isSafeInteger(next))throw Error('Inventory total overflow');
  if(next)totals[key]=next;
 }
 return Object.fromEntries(Object.entries(totals).sort(([a],[b])=>a.localeCompare(b,'en')));
}
export function normalizeNumbers(values,{integer=true,nonnegative=true}={}){
 if(!object(values)||Object.keys(values).length>10000)throw Error('Expected bounded numeric map');
 const out=Object.create(null);
 for(const key of Object.keys(values).sort()){
  if(!/^[A-Za-z][A-Za-z0-9_.-]{0,99}$/.test(key)||['constructor','prototype','__proto__'].includes(key))throw Error('Invalid state key');
  const n=values[key];if(typeof n!=='number'||!Number.isFinite(n)||(integer&&!Number.isSafeInteger(n))||(nonnegative&&n<0))throw Error('Invalid numeric state');out[key]=n;
 }
 return out;
}
export function normalizeState(state,fields=['inventory','currencies']){
 if(!object(state))throw Error('State snapshot missing');
 const out={};for(const field of fields){if(field==='inventory')out.inventory=normalizeInventory(state.inventory);else if(field==='currencies')out.currencies=normalizeNumbers(state.currencies);else if(field==='attributes')out.attributes=normalizeNumbers(state.attributes,{integer:false,nonnegative:false});}
 return out;
}
function normalizeUi(ui){
 if(!object(ui)||!Array.isArray(ui.checks)||!ui.checks.length||ui.checks.length>10000)throw Error('UI checkpoints missing');
 const out=Object.create(null);
 for(const check of ui.checks){if(!object(check)||typeof check.id!=='string'||!/^[A-Za-z0-9_.:-]{1,120}$/.test(check.id)||Object.hasOwn(out,check.id)||!['passed','failed'].includes(check.result))throw Error('Invalid UI checkpoint');out[check.id]={expected:check.expected,actual:check.actual,result:check.result};canonical(out[check.id]);}
 return out;
}
function validIdentity(i){return object(i)&&COMMIT.test(i.commit??'')&&object(i.environment)&&typeof i.environment.name==='string'&&i.environment.name.trim()&&typeof i.environment.kind==='string'&&i.environment.kind.trim()&&typeof i.testId==='string'&&i.testId.trim();}
function safeArtifact(root,path){
 if(typeof path!=='string'||!path||isAbsolute(path)||path.includes('\\')||path.includes(':')||path.split('/').some(p=>!p||p==='.'||p==='..'))throw Error('Unsafe artifact path');
 const absolute=resolve(root);let at=parse(absolute).root;
 for(const part of absolute.slice(at.length).split(sep).filter(Boolean)){at=join(at,part);if(lstatSync(at).isSymbolicLink())throw Error('Linked artifact root refused');}
 for(const part of path.split('/')){at=join(at,part);if(lstatSync(at).isSymbolicLink())throw Error('Linked artifact refused');}
 const stat=lstatSync(at);if(!stat.isFile()||stat.size>MAX_ARTIFACT)throw Error('Artifact must be a bounded regular file');return at;
}
function validateArtifacts(record,root){
 const problems=[],verified=[];let supports=false;
 if(!root)return {supports:false,verified,problems:['Artifact base directory not supplied']};
 if(!Array.isArray(record.artifacts)||!record.artifacts.length||record.artifacts.length>32)return {supports:false,verified,problems:['Structured action artifact missing']};
 for(const ref of record.artifacts){try{
  if(!object(ref)||!HASH.test(ref.sha256??''))throw Error('Artifact hash missing');
  const bytes=readFileSync(safeArtifact(root,ref.path));if(hash(bytes)!==ref.sha256.toLowerCase())throw Error('Artifact hash mismatch');
  if(ref.format!=='json-report'){verified.push({sha256:ref.sha256,proof:'INTEGRITY_ONLY'});continue;}
  const report=JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/,''));
  if(report.schemaVersion!==1||report.result!=='passed'||!Array.isArray(report.checks)||!report.checks.length||report.checks.length>10000||report.checks.some(c=>!object(c)||typeof c.id!=='string'||!/^[A-Za-z0-9_.:-]{1,120}$/.test(c.id)||c.result!=='passed')||new Set(report.checks.map(c=>c.id)).size!==report.checks.length)throw Error('Artifact outcome is not passed');
  if(canonical(report.identity)!==canonical(record.identity))throw Error('Artifact identity mismatch');
  for(const field of ['action','before','after','ui','persistence'])if(canonical(report[field])!==canonical(record[field]))throw Error('Artifact action/snapshot mismatch');
  supports=true;verified.push({sha256:ref.sha256,proof:'IDENTITY_AND_RECORDED_ACTION_MATCHED'});
 }catch(error){problems.push(error.message);}}
 return {supports:supports&&!problems.length,verified,problems};
}
function delta(before,after){const out=Object.create(null);for(const key of new Set([...Object.keys(before),...Object.keys(after)])){const value=(after[key]??0)-(before[key]??0);if(!Number.isFinite(value))throw Error('Delta overflow');if(value)out[key]=value;}return out;}
function equalNumeric(a,b,field,tolerances){for(const key of new Set([...Object.keys(a),...Object.keys(b)])){if(!Object.hasOwn(a,key)||!Object.hasOwn(b,key))return false;const tolerance=tolerances[field+'.'+key]??0;if(Math.abs(a[key]-b[key])>tolerance)return false;}return true;}
export function compareAction(reference,candidate,options={}){
 const fields=options.fields??['inventory','currencies','ui','persistence'];
 if(!Array.isArray(fields)||!fields.length||new Set(fields).size!==fields.length||fields.some(f=>!FIELDS.has(f)))throw Error('Unsupported or duplicate comparison fields');
 const tolerances=options.tolerances??{};
 if(!object(tolerances)||Object.entries(tolerances).some(([key,n])=>!/^attributes\.[A-Za-z][A-Za-z0-9_.-]*$/.test(key)||!Number.isFinite(n)||n<0))throw Error('Tolerances are finite nonnegative attributes-only values');
 const report={schemaVersion:'autoforge.equivalence.v1',status:'UNVERIFIED',scope:'RECORDED_ACTION_EFFECTS_ONLY',independentExecutionProven:false,fields:[...fields],differences:[],missingEvidence:[],artifacts:{},limitations:['The tool validates consistency of supplied records/artifacts; it does not execute either backend.','Unobserved RNG, missing UI checkpoints and absent relogin readbacks are not guessed.']};
 const difference=(field,reason)=>report.differences.push({field,reason});
 const missing=(side,reason)=>report.missingEvidence.push({side,reason});
 if(!object(reference)||!object(candidate)){missing('both','Action records required');return report;}
 for(const [side,record] of [['reference',reference],['candidate',candidate]]){
  if(record.schemaVersion!==1||!validIdentity(record.identity))missing(side,'Valid schema and commit/environment/test identity required');
  if(record.truncated||record.complete===false)missing(side,'Record explicitly incomplete or truncated');
  if(!object(record.action)||typeof record.action.type!=='string'||!record.action.type.trim()||!object(record.action.inputs))missing(side,'Semantic action type and inputs required');
  if(record.randomness==='unobserved')missing(side,'RNG is unobserved; provide deterministic outcome evidence or a separately reviewed distribution test');
  const artifact=validateArtifacts(record,options[side+'BaseDir']??options.baseDir);report.artifacts[side]=artifact;
  if(!artifact.supports)missing(side,'Identity-matched structured action artifact required');
 }
 try{if(canonical(reference.action)!==canonical(candidate.action))difference('action','Semantic action or inputs differ');}catch{missing('both','Action inputs are not valid JSON data');}
 const stateFields=fields.filter(f=>['inventory','currencies','attributes'].includes(f));
 // Persistence of the effects in scope still requires a state projection.
 const persistedFields=stateFields.length?stateFields:['inventory','currencies'];
 for(const field of stateFields){try{
  const rb=normalizeState(reference.before,[field])[field],ra=normalizeState(reference.after,[field])[field],cb=normalizeState(candidate.before,[field])[field],ca=normalizeState(candidate.after,[field])[field];
  const same=(a,b)=>field==='attributes'?equalNumeric(a,b,field,tolerances):canonical(a)===canonical(b);
  if(!same(ra,ca))difference(field+'.after','Final projection differs');
  if(!same(delta(rb,ra),delta(cb,ca)))difference(field+'.delta','Action effect differs');
 }catch(error){missing('both',field+': '+error.message);}}
 if(fields.includes('ui')){
  const observed={};for(const [side,r] of [['reference',reference],['candidate',candidate]])try{observed[side]=normalizeUi(r.ui);for(const c of Object.values(observed[side]))if(c.result!=='passed'||canonical(c.expected)!==canonical(c.actual))difference(side+'.ui','UI checkpoint failed its expected result');}catch(error){missing(side,error.message);}
  if(observed.reference&&observed.candidate&&canonical(observed.reference)!==canonical(observed.candidate))difference('ui','UI checkpoint sets/results differ');
 }
 if(fields.includes('persistence')){
  const persisted={};for(const [side,r] of [['reference',reference],['candidate',candidate]]){
   if(!object(r.persistence)||r.persistence.relogin!==true){missing(side,'Post-relogin persistence readback required');continue;}
   try{persisted[side]=normalizeState(r.persistence.state,persistedFields);if(canonical(persisted[side])!==canonical(normalizeState(r.after,persistedFields)))difference(side+'.persistence','Readback differs from authoritative action result');}catch(error){missing(side,'Persistence: '+error.message);}
  }
  if(persisted.reference&&persisted.candidate&&canonical(persisted.reference)!==canonical(persisted.candidate))difference('persistence','Post-relogin projections differ');
 }
 report.status=report.differences.length?'DIVERGENT':report.missingEvidence.length?'UNVERIFIED':'EQUIVALENT_RECORDED';return report;
}
