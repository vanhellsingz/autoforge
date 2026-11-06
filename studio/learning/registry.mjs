// Append-only, optimistic-concurrency knowledge ledger. No code/SQL execution or game access.
import {existsSync,mkdirSync,readdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {readBounded,noLinks} from '../items/lib.mjs';
import {verifyEvidenceArtifacts} from '../../test-artifacts.mjs';
import {artifactJson,canonical,digest,HASH,COMMIT,EVIDENCE_LIMITATION} from './evidence.mjs';

export const REGRESSION_TESTS=Object.freeze(['regression.login','regression.character-create','regression.city','regression.map-entry','regression.arena-battle']);
const ID=/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,99}$/;
function text(v,label,max=8000){if(typeof v!=='string'||!v.trim()||v.length>max)throw Error('Invalid '+label);}
function strings(v,label){if(!Array.isArray(v)||!v.length||v.length>100||new Set(v).size!==v.length)throw Error('Invalid '+label);for(const x of v)text(x,label);}
function exact(obj,keys,label){if(!obj||typeof obj!=='object'||Array.isArray(obj)||Object.keys(obj).some(k=>!keys.includes(k)))throw Error('Invalid '+label+' fields');}
export function validateCapability(c){
 exact(c,['id','revision','domain','summary','symptoms','cause','fix','appliesTo','preserve','requiredTests','detectors','limits'],'capability');
 if(!ID.test(c.id??'')||!ID.test(c.domain??'')||!Number.isSafeInteger(c.revision)||c.revision<1)throw Error('Invalid capability identity/revision');
 for(const key of ['summary','cause','fix'])text(c[key],key);
 for(const key of ['symptoms','preserve','requiredTests','limits'])strings(c[key],key);
 for(const id of c.requiredTests)if(!ID.test(id))throw Error('Invalid required test ID');
 exact(c.appliesTo,['backendCommit','sourceDigest','sourceHashes'],'applicability');
 if(!COMMIT.test(c.appliesTo.backendCommit??'')||!HASH.test(c.appliesTo.sourceDigest??''))throw Error('Exact backend commit and client digest required');
 const sources=c.appliesTo.sourceHashes;if(!Array.isArray(sources)||!sources.length||sources.length>1000)throw Error('Source hashes required');
 const paths=new Set();for(const s of sources){exact(s,['path','sha256'],'source');if(typeof s.path!=='string'||!s.path||/[\\:]/.test(s.path)||s.path.split('/').some(p=>!p||p==='.'||p==='..')||paths.has(s.path)||!HASH.test(s.sha256??''))throw Error('Invalid/duplicate source');paths.add(s.path);}
 if(!Array.isArray(c.detectors)||!c.detectors.length||c.detectors.length>50)throw Error('Detectors required');
 for(const d of c.detectors){exact(d,['signal','equals'],'detector');if(!ID.test(d.signal??'')||!['string','number','boolean'].includes(typeof d.equals)||typeof d.equals==='number'&&!Number.isFinite(d.equals))throw Error('Only declarative exact-match detectors are supported');}
 if(Buffer.byteLength(canonical(c))>128*1024)throw Error('Capability size limit');
 return c;
}

export function validateEvaluation({capability,evaluation,evidenceRoot}={}){
 validateCapability(capability);
 if(!evaluation||evaluation.capabilityDigest!==digest(capability)||!Array.isArray(evaluation.evidence)||!evaluation.evidence.length||evaluation.evidence.length>100)throw Error('Evaluation must bind this exact capability revision');
 const required=[...new Set([...capability.requiredTests,...REGRESSION_TESTS])],passed=new Set(),artifacts=[];
 for(const evidence of evaluation.evidence){
  if(evidence.commit!==capability.appliesTo.backendCommit||evidence.result!=='passed')throw Error('Evaluation commit/result mismatch');
  const verified=verifyEvidenceArtifacts(evidence,{baseDir:evidenceRoot});
  if(!verified.identityVerified||!verified.supportsClaimedPass)throw Error('Identity-bearing passed JSON report required');
  for(const descriptor of evidence.artifacts.filter(a=>a.format==='json-report')){
   const report=artifactJson(evidenceRoot,descriptor);
   if(report.capabilityDigest!==digest(capability)||report.clientSourceDigest!==capability.appliesTo.sourceDigest)throw Error('Test artifact revision/client mismatch');
   for(const check of report.checks){if(check.result!=='passed')throw Error('Failed test cannot promote a capability');passed.add(check.id);}
   artifacts.push(descriptor);
  }
 }
 const missing=required.filter(id=>!passed.has(id));if(missing.length)throw Error('Missing required checks: '+missing.join(', '));
 return {capabilityDigest:digest(capability),evaluationDigest:digest(evaluation),checked:required,artifacts,limitation:EVIDENCE_LIMITATION};
}

function apply(state,event,{verify=false,evidenceRoot}={}){
 exact(event,['action','id','actor','at','capability','evaluation','capabilityDigest','note'],'event');
 if(!ID.test(event.id??''))throw Error('Capability ID required');text(event.actor,'actor',200);text(event.at,'at',80);if(!Number.isFinite(Date.parse(event.at)))throw Error('Timestamp required');
 const old=state.get(event.id),action=event.action;
 if(['propose','revise'].includes(action)){
  const c=validateCapability(event.capability);if(c.id!==event.id)throw Error('Event/capability ID mismatch');
  if(action==='propose'&&(old||c.revision!==1)||action==='revise'&&(!old||c.revision!==old.capability.revision+1))throw Error('Revision must advance exactly once; use revise for existing IDs');
  state.set(event.id,{status:'candidate',capability:c,digest:digest(c),evaluation:null,review:null,approval:null});return;
 }
 if(!old||event.capabilityDigest!==old.digest)throw Error('Unknown/stale capability revision');
 if(action==='evaluate'){
  if(!['candidate','tested'].includes(old.status))throw Error('Revise a reviewed/stable capability before changing its evidence');
  if(verify)validateEvaluation({capability:old.capability,evaluation:event.evaluation,evidenceRoot});
  if(!event.evaluation||event.evaluation.capabilityDigest!==old.digest)throw Error('Evaluation revision mismatch');
  state.set(event.id,{...old,status:'tested',evaluation:event.evaluation});return;
 }
 if(action==='review'){
  if(old.status!=='tested')throw Error('Only tested capability can be reviewed');text(event.note,'review note');
  state.set(event.id,{...old,status:'reviewed',review:{actor:event.actor,at:event.at,note:event.note,capabilityDigest:old.digest,evaluationDigest:digest(old.evaluation)}});return;
 }
 if(action==='approve'){
  if(old.status!=='reviewed'||old.review?.evaluationDigest!==digest(old.evaluation))throw Error('Current review required before approval');text(event.note,'approval note');
  state.set(event.id,{...old,status:'approved',approval:{actor:event.actor,at:event.at,note:event.note,capabilityDigest:old.digest,evaluationDigest:digest(old.evaluation)}});return;
 }
 if(action==='promote'){
  if(old.status!=='approved'||old.approval?.evaluationDigest!==digest(old.evaluation))throw Error('Explicit approval required before stable promotion');
  if(verify)validateEvaluation({capability:old.capability,evaluation:old.evaluation,evidenceRoot});
  state.set(event.id,{...old,status:'stable'});return;
 }
 if(action==='retire'){text(event.note,'retirement reason');state.set(event.id,{...old,status:'retired',retirement:{actor:event.actor,at:event.at,note:event.note}});return;}
 throw Error('Unknown learning action');
}

/** Hash-chain detects accidental edits; it is not a digital signature or access-control mechanism. */
export function readRegistry(registry){
 const root=noLinks(resolve(registry)),state=new Map();let previous='0'.repeat(64),version=0;
 if(!existsSync(root))return {version,head:previous,capabilities:[],events:[]};
 const names=readdirSync(root).sort();if(names.length>10000||names.some(n=>!/^\d{8}\.json$/.test(n)))throw Error('Unexpected/too many ledger entries');
 const events=[];for(const name of names){
  version++;if(name!==String(version).padStart(8,'0')+'.json')throw Error('Ledger sequence gap');
  const entry=JSON.parse(readBounded(join(root,name),1024*1024).toString('utf8'));
  exact(entry,['schemaVersion','version','previous','event','sha256'],'ledger');
  if(entry.schemaVersion!==1||entry.version!==version||entry.previous!==previous||entry.sha256!==digest({schemaVersion:1,version,previous,event:entry.event}))throw Error('Ledger hash/sequence mismatch');
  apply(state,entry.event);previous=entry.sha256;events.push(entry);
 }
 return {version,head:previous,capabilities:[...state.values()],events};
}

export function appendLearningEvent({registry,event,expectedVersion,evidenceRoot}={}){
 if(!Number.isSafeInteger(expectedVersion)||expectedVersion<0)throw Error('Explicit expectedVersion required');
 const root=noLinks(resolve(registry)),current=readRegistry(root);if(current.version!==expectedVersion)throw Error('Concurrent/stale ledger version; reload before retrying');
 const state=new Map(current.capabilities.map(c=>[c.capability.id,c]));apply(state,event,{verify:true,evidenceRoot});
 const value={schemaVersion:1,version:current.version+1,previous:current.head,event},entry={...value,sha256:digest(value)};
 if(Buffer.byteLength(JSON.stringify(entry))>1024*1024)throw Error('Ledger entry size limit');
 mkdirSync(root,{recursive:true});
 // Exclusive creation arbitrates writers that observed the same prior version. No overwrite or mutable HEAD.
 writeFileSync(join(root,String(entry.version).padStart(8,'0')+'.json'),JSON.stringify(entry,null,2)+'\n',{flag:'wx'});
 return {version:entry.version,head:entry.sha256,capability:state.get(event.id)};
}
