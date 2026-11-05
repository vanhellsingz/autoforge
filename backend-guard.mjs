// Read-only critical-backend fingerprint. No source contents, credentials or database data are logged.
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {existsSync,lstatSync,readFileSync,readdirSync,realpathSync} from 'node:fs';
import {dirname,join,parse,relative,resolve,sep} from 'node:path';

const GENERATED='apps/game-server/src/main/java/com/wartuneultra/autoforge/v2';
const OMIT=new Set(['.git','target','node_modules','dist']);
const SCOPE=Object.freeze([
 'apps/game-server/src/main/**',
 'apps/admin-web/src/**',
 'modules/*/src/main/**',
 '**/pom.xml within apps and modules; root pom.xml',
 'apps/admin-web/package*.json and known build configuration files',
 '.mvn/**; mvnw; mvnw.cmd',
 `excluded managed target: ${GENERATED}/**`,
]);
const posix=value=>value.replaceAll('\\','/');
const hash=value=>createHash('sha256').update(value).digest('hex');
const samePath=(a,b)=>process.platform==='win32'?a.toLowerCase()===b.toLowerCase():a===b;
function stat(path){try{return lstatSync(path);}catch(error){if(error.code==='ENOENT')return null;throw error;}}
function noLinks(path){
 const absolute=resolve(path),base=parse(absolute).root;let current=base;
 for(const part of absolute.slice(base.length).split(sep).filter(Boolean)){
  current=join(current,part);
  if(stat(current)?.isSymbolicLink())throw Error(`Critical backend link refused: ${current}`);
 }
}
function repositoryMarker(root){
 for(let current=root;;current=dirname(current)){
  if(stat(join(current,'.git')))return true;
  const parent=dirname(current);if(parent===current)return false;
 }
}
function commitIdentity(root){
 // A genuinely unversioned directory remains useful without requiring a Git executable.
 if(!repositoryMarker(root))return {commit:null,commitStatus:'UNVERSIONED'};
 try{
  const commit=execFileSync('git',['-C',root,'rev-parse','--verify','HEAD'],{encoding:'utf8',timeout:10000,maxBuffer:1024*1024,stdio:['ignore','pipe','pipe'],env:{...process.env,GIT_OPTIONAL_LOCKS:'0'}}).trim();
  if(!/^[a-f0-9]{40,64}$/i.test(commit))throw Error('Invalid Git HEAD');
  return {commit:commit.toLowerCase(),commitStatus:'VERSIONED'};
 }catch{return {commit:null,commitStatus:'GIT_UNAVAILABLE'};}
}
function canonicalRoot(backendRoot){
 if(typeof backendRoot!=='string'||!backendRoot.trim())throw Error('Backend root required');
 const root=resolve(backendRoot);noLinks(root);
 if(!stat(root)?.isDirectory())throw Error('Backend root must be an existing directory');
 return realpathSync(root);
}
function collect(root){
 const files=new Map();
 const excluded=path=>{const rel=posix(relative(root,path)),value=process.platform==='win32'?rel.toLowerCase():rel,target=process.platform==='win32'?GENERATED.toLowerCase():GENERATED;return value===target||value.startsWith(target+'/');};
 function add(path){
  if(excluded(path))return;
  noLinks(path);const entry=stat(path);if(!entry)return;
  if(!entry.isFile())throw Error(`Critical backend file is not regular: ${posix(relative(root,path))}`);
  const name=posix(relative(root,path));files.set(name,{path:name,sha256:hash(readFileSync(path))});
 }
 function walk(path,onFile){
  if(excluded(path))return;
  noLinks(path);const entry=stat(path);if(!entry)return;
  if(!entry.isDirectory())throw Error(`Critical backend scope is not a directory: ${posix(relative(root,path))}`);
  for(const item of readdirSync(path,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en'))){
   if(OMIT.has(item.name))continue;
   const child=join(path,item.name);if(excluded(child))continue;
   if(item.isSymbolicLink())throw Error(`Critical backend link refused: ${posix(relative(root,child))}`);
   if(item.isDirectory())walk(child,onFile);else if(item.isFile())onFile(child);
   else throw Error(`Unsupported critical backend entry: ${posix(relative(root,child))}`);
  }
 }
 for(const part of ['apps/game-server/src/main','apps/admin-web/src','.mvn'])walk(join(root,part),add);
 const modules=join(root,'modules');noLinks(modules);
 if(stat(modules)){
  if(!stat(modules).isDirectory())throw Error('Critical modules scope is not a directory');
  for(const entry of readdirSync(modules,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en'))){
   if(OMIT.has(entry.name))continue;
   const path=join(modules,entry.name);
   if(entry.isSymbolicLink())throw Error(`Critical module link refused: ${entry.name}`);
   if(entry.isDirectory())walk(join(path,'src/main'),add);
  }
 }
 for(const parent of ['apps','modules'])walk(join(root,parent),path=>{if(path.endsWith(sep+'pom.xml'))add(path);});
 for(const name of ['pom.xml','mvnw','mvnw.cmd'])add(join(root,name));
 const admin=join(root,'apps/admin-web');noLinks(admin);
 if(stat(admin)){
  if(!stat(admin).isDirectory())throw Error('Critical admin root is not a directory');
  for(const entry of readdirSync(admin,{withFileTypes:true})){
   if(/^package.*\.json$|^(?:vite|vitest|webpack|tsconfig|eslint|postcss|tailwind|babel|rollup)(?:[.-].*)?$|^(?:pnpm-lock\.yaml|yarn\.lock)$/i.test(entry.name))add(join(admin,entry.name));
  }
 }
 return [...files.values()].sort((a,b)=>a.path.localeCompare(b.path,'en'));
}
/** Capture all critical file membership and bytes, plus actual Git HEAD when available.
 * A versioned directory with unreadable Git is recorded but cannot be applied until regenerated with Git access.
 * Generated managed targets are excluded because integrate.mjs separately snapshots their existing contents.
 */
export function captureBackendSnapshot(backendRoot){
 const root=canonicalRoot(backendRoot),before=commitIdentity(root),files=collect(root),after=commitIdentity(root);
 if(before.commit!==after.commit||before.commitStatus!==after.commitStatus)throw Error('Backend Git identity changed during snapshot capture');
 return {schemaVersion:1,backendRoot:root,...after,scope:[...SCOPE],files};
}
export function assertBackendSnapshot(backendRoot,snapshot){
 if(!snapshot||snapshot.schemaVersion!==1||typeof snapshot.backendRoot!=='string'||!Array.isArray(snapshot.files)||!Array.isArray(snapshot.scope)||JSON.stringify(snapshot.scope)!==JSON.stringify(SCOPE))throw Error('Expected critical backend snapshot schemaVersion=1');
 const root=canonicalRoot(backendRoot);
 if(!samePath(root,snapshot.backendRoot))throw Error('Backend root differs from the analyzed snapshot; regenerate planning');
 if(!['VERSIONED','UNVERSIONED','GIT_UNAVAILABLE'].includes(snapshot.commitStatus))throw Error('Backend snapshot commit status invalid');
 if(snapshot.commitStatus==='VERSIONED'&&!/^[a-f0-9]{40,64}$/i.test(snapshot.commit??''))throw Error('Backend snapshot commit invalid');
 if(snapshot.commitStatus!=='VERSIONED'&&snapshot.commit!==null)throw Error('Unversioned snapshot must have explicit null commit');
 const expected=new Map();
 for(const file of snapshot.files){
  if(!file||typeof file.path!=='string'||!file.path||file.path.includes('\\')||file.path.startsWith('/')||/^[A-Za-z]:/.test(file.path)||file.path.split('/').some(p=>!p||p==='.'||p==='..')||!/^[a-f0-9]{64}$/.test(file.sha256??'')||expected.has(file.path))throw Error('Invalid critical backend file descriptor');
  expected.set(file.path,file.sha256);
 }
 const current=captureBackendSnapshot(root);
 if(snapshot.commitStatus==='GIT_UNAVAILABLE'||current.commitStatus==='GIT_UNAVAILABLE')throw Error('Backend Git identity unavailable; regenerate planning with Git access');
 if(current.commit!==snapshot.commit||current.commitStatus!==snapshot.commitStatus)throw Error('Backend commit differs from the analyzed snapshot; regenerate planning');
 const actual=new Map(current.files.map(file=>[file.path,file.sha256]));
 for(const [path,sha]of expected){if(!actual.has(path))throw Error(`Critical backend file deleted: ${path}; regenerate planning`);if(actual.get(path)!==sha)throw Error(`Critical backend file changed: ${path}; regenerate planning`);}
 for(const path of actual.keys())if(!expected.has(path))throw Error(`Critical backend file added: ${path}; regenerate planning`);
 return {status:'MATCHED',commit:current.commit,commitStatus:current.commitStatus,filesChecked:current.files.length};
}
