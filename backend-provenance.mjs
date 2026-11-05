import {verifyEvidenceArtifacts} from './test-artifacts.mjs';
// Read-only provenance and reviewer declarations. No network, database or Git writes.
import {execFileSync} from 'node:child_process';
import {readFileSync,lstatSync,realpathSync} from 'node:fs';
import {resolve,relative,isAbsolute,sep,dirname} from 'node:path';

const RULES=new Set(['forge.common.enhancement.gold','forge.common.enhancement.rate','attributes.fighting-capacity','quest.condition.vocabulary']);
const STATES=new Set(['absent','partial','functional','divergent']);
const HASH=/^[a-f0-9]{64}$/i,COMMIT=/^[a-f0-9]{40,64}$/i;
const posix=s=>s.replaceAll('\\','/');
const limit=250;
function git(cwd,args){return execFileSync('git',['-C',cwd,...args],{encoding:'utf8',timeout:10000,maxBuffer:4*1024*1024,stdio:['ignore','pipe','pipe'],env:{...process.env,GIT_OPTIONAL_LOCKS:'0'}});}
function unavailable(status,reason){return {status,commit:null,repoRoot:null,backendPath:null,dirty:null,trackedChanges:[],untrackedChanges:[],dirtyCoverage:'NOT_CHECKED',reason};}

/** Reports actual local HEAD, scoped dirty state and untracked non-ignored files.
 * Tool-only edits outside the backend scope do not dirty this snapshot.
 * A clean commit does not prove the code is functional or deployed.
 */
export function backendProvenance(backendRoot){
 // Native realpath expands Windows 8.3 names (RUNNER~1) as well as junctions.
 // The JS implementation may retain short aliases while Git returns long names.
 let root;try{root=realpathSync.native(resolve(backendRoot));}catch{return unavailable('UNVERSIONED','Backend directory is unavailable');}
 let repoRoot;
 try{repoRoot=realpathSync.native(git(root,['rev-parse','--show-toplevel']).trim());}
 catch(error){const stderr=String(error.stderr??'');return unavailable(/not a git repository/i.test(stderr)?'UNVERSIONED':'GIT_UNAVAILABLE',error.code??'git repository could not be read');}
 const rel=relative(repoRoot,root);
 if(isAbsolute(rel)||rel==='..'||rel.startsWith('..'+sep))return {...unavailable('GIT_UNAVAILABLE','Backend is outside the discovered repository'),pathDiagnostic:{backend:root,repository:repoRoot,relative:posix(rel)}};
 let commit;
 try{commit=git(root,['rev-parse','--verify','HEAD']).trim();if(!COMMIT.test(commit))throw Error('Invalid HEAD');}
 catch(error){return {...unavailable('UNVERSIONED','Git repository has no readable HEAD commit'),repoRoot,backendPath:posix(rel)||'.'};}
 let raw;
 try{raw=git(repoRoot,['status','--porcelain=v1','-z','--untracked-files=all','--',':(literal)'+(posix(rel)||'.')]);}
 catch(error){return {...unavailable('GIT_UNAVAILABLE','Backend dirty state could not be read'),commit,repoRoot,backendPath:posix(rel)||'.'};}
 const tokens=raw.split('\0'),tracked=[],untracked=[];
 for(let i=0;i<tokens.length;i++){
  const token=tokens[i];if(!token)continue;
  const status=token.slice(0,2),repoPath=token.slice(3),oldRepoPath=/[RC]/.test(status)?tokens[++i]:undefined;
  const path=posix(relative(root,resolve(repoRoot,repoPath)));
  if(path==='..'||path.startsWith('../')||isAbsolute(path))continue;
  if(path.split('/').some(p=>['target','node_modules','dist'].includes(p)))continue;
  const entry={path,status};if(oldRepoPath)entry.oldPath=posix(relative(root,resolve(repoRoot,oldRepoPath)));
  (status==='??'?untracked:tracked).push(entry);
 }
 return {status:'VERSIONED',commit,repoRoot,backendPath:posix(rel)||'.',dirty:tracked.length+untracked.length>0,
  trackedChanges:tracked.slice(0,limit),untrackedChanges:untracked.slice(0,limit),
  counts:{tracked:tracked.length,untracked:untracked.length},truncated:tracked.length>limit||untracked.length>limit,
  dirtyCoverage:'Tracked and untracked non-ignored files within backend; target/node_modules/dist excluded. No file contents are read by Git status.'};
}

function safeRelative(path){return typeof path==='string'&&path.length>0&&!isAbsolute(path)&&!path.includes('\\')&&!/^[a-z]:/i.test(path)&&!path.split('/').some(p=>p==='.'||p==='..'||p==='');}
function evidenceString(value,label){if(typeof value!=='string'||!value.trim())throw Error(`Assessment ${label} required`);return value;}

/** Optional reviewer input schema (JSON data, never executed):
 * {schemaVersion:1,assessments:[{rule:'attributes.fighting-capacity',status:'functional',
 * commit:'<full HEAD>',sourceHashes:[{path:'apps/.../Service.java',sha256:'<64hex>'}],
 * evidence:[{kind:'test',id:'run-or-artifact-reference',description:'What was checked',result:'passed'},
 * {kind:'runtime',id:'capture-or-run-reference',description:'Real game behavior',result:'passed'}]}]}
 * `functional` requires passed test AND runtime declarations. `divergent` requires
 * {kind:'comparison',independent:true,result:'divergent',id,description}.
 * All results are REVIEWER_DECLARED; validating shape/hashes does not independently
 * confirm an external test, runtime artifact, absence claim or comparison.
 * sourceHashes cover only reviewer-listed files, not the entire backend.
 */
export function loadAssessments(file,{commit,sources}={}){
 if(!file)return {};
 if(!COMMIT.test(commit??''))throw Error('Assessments require a readable exact backend commit');
 const stat=lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>1024*1024)throw Error('Assessment must be a regular JSON file no larger than 1 MiB');
 const input=JSON.parse(readFileSync(file,'utf8').replace(/^\uFEFF/,''));
 if(input.schemaVersion!==1||!Array.isArray(input.assessments))throw Error('Assessment schemaVersion 1 and assessments array required');
 const current=new Map();
 for(const source of sources??[]){
  if(!safeRelative(source.path)||!HASH.test(source.sha256??''))throw Error('Invalid current source hash');
  if(current.has(source.path)&&current.get(source.path)!==source.sha256.toLowerCase())throw Error('Contradictory current source hashes');
  current.set(source.path,source.sha256.toLowerCase());
 }
 const result={};
 for(const item of input.assessments){
  if(!RULES.has(item.rule)||Object.hasOwn(result,item.rule))throw Error(`Unknown or repeated assessment rule: ${item.rule}`);
  if(!STATES.has(item.status))throw Error(`Unknown implementation status: ${item.status}`);
  if(!COMMIT.test(item.commit??'')||item.commit.toLowerCase()!==commit.toLowerCase())throw Error(`Assessment commit mismatch: ${item.rule}`);
  if(!Array.isArray(item.sourceHashes)||!item.sourceHashes.length)throw Error(`Assessment sourceHashes required: ${item.rule}`);
  const seen=new Set();
  for(const source of item.sourceHashes){
   if(!safeRelative(source.path)||!HASH.test(source.sha256??'')||seen.has(source.path))throw Error(`Invalid/repeated assessment source: ${source.path}`);
   seen.add(source.path);
   if(current.get(source.path)!==source.sha256.toLowerCase())throw Error(`Assessment source hash mismatch: ${source.path}`);
  }
  if(!Array.isArray(item.evidence)||!item.evidence.length)throw Error(`Assessment evidence required: ${item.rule}`);
  for(const evidence of item.evidence){
   if(!['test','code','runtime','comparison'].includes(evidence.kind))throw Error('Unknown assessment evidence kind');
   if(evidence.commit!==item.commit)throw Error('Evidence commit mismatch');
   if(!evidence.environment||typeof evidence.environment!=='object')throw Error('Evidence environment required');
   evidenceString(evidence.environment.name,'environment name');evidenceString(evidence.environment.kind,'environment kind');evidenceString(evidence.testId,'testId or static review id');
   if(evidence.kind==='runtime'&&(!evidence.deployment||evidence.deployment.commit!==item.commit||!HASH.test(evidence.deployment.jarSha256??'')))throw Error('Runtime evidence requires matching deployed commit and JAR SHA256');
   evidenceString(evidence.id,'evidence id');evidenceString(evidence.description,'evidence description');
   evidence.artifactVerification=verifyEvidenceArtifacts(evidence,{baseDir:dirname(resolve(file))});
   if(item.status==='functional'&&['test','runtime'].includes(evidence.kind)&&!evidence.artifactVerification.supportsClaimedPass)throw Error('Functional evidence requires an identity-matched passed JSON test artifact');
  }
  if(item.status==='functional'&&!['test','runtime'].every(kind=>item.evidence.some(e=>e.kind===kind&&e.result==='passed')))throw Error('Functional assessment needs passed test and runtime evidence');
  if(item.status==='divergent'&&!item.evidence.some(e=>e.kind==='comparison'&&e.independent===true&&e.result==='divergent'))throw Error('Divergent assessment needs an independent divergent comparison');
  result[item.rule]={...item,evidenceScope:'REVIEWER_DECLARED',sourceScope:'Only listed source files; not a whole-backend certification',snapshotConsistency:'COMMIT_AND_LISTED_HASHES_MATCH'};
 }
 return result;
}
