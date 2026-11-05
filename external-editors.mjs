// Explicit optional sources only. Static locations never establish correct persistence.
import {readFileSync,readdirSync,lstatSync,realpathSync} from 'node:fs';
import {resolve,relative,join,parse,sep} from 'node:path';
import {createHash} from 'node:crypto';
const HASH=bytes=>createHash('sha256').update(bytes).digest('hex');
const slash=value=>value.replaceAll('\\','/');
const PROFILES=[
 {id:'forge.common.enhancement.gold',terms:/\b(?:gold|ouro|wallet|currency|forge|strengthen|enchant|encantamento|forja|inventory|items?)\b/i},
 {id:'forge.common.enhancement.rate',terms:/\b(?:forge|strengthen|enchant|encantamento|forja|material|success_?rate|chance)\b/i},
 {id:'attributes.fighting-capacity',terms:/\b(?:character|personagem|attributes?|atributos?|power|poder|fightingCapacity|equipment|inventory|pet|mount|guard)\b/i},
 {id:'quest.condition.vocabulary',terms:/\b(?:quests?|missions?|missoes|missões|tutorial|campaign|campanha|reward)\b/i}
];
const SKIP_DIR=/^(?:vendor|node_modules|\.git|dist|target|build|coverage|backups?|backup.*|\.recovery|cache|logs?|uploads?|sessions?)$/i;
const SENSITIVE=/(?:^|[_.-])(?:config(?:uration)?|credentials?|secrets?|connection|connect|database|db|password|passwd|bootstrap|environment|env)(?:[_.-]|$)/i;
const EXT=/\.(?:php|js|mjs|cjs|ts|tsx|jsx|vue|html?)$/i;
function noLinks(path){const absolute=resolve(path),prefix=parse(absolute).root;let current=prefix;for(const part of absolute.slice(prefix.length).split(sep).filter(Boolean)){current=join(current,part);if(lstatSync(current).isSymbolicLink())throw Error('External editor root/source link refused: '+current);}}
function masked(text){return text.replace(/<!--[\s\S]*?-->|\/\*[\s\S]*?\*\/|(^|\n)\s*\/\/[^\r\n]*/g,token=>token.replace(/[^\r\n]/g,' '));}
/** Parse one --editor-root NAME=PATH. No implicit external path is ever chosen. */
export function parseEditorRoot(value){
 if(typeof value!=='string')throw Error('Editor root must be NAME=PATH');
 const equal=value.indexOf('='),name=value.slice(0,equal),path=value.slice(equal+1);
 if(equal<1||!/^[-A-Za-z0-9_]{1,48}$/.test(name)||!path.trim())throw Error('Editor root must be NAME=PATH with a simple unique name');
 return {name,path:resolve(path)};
}
/** Read-only source inventory. Options primarily allow reproducible resource bounds. */
export function scanExternalEditors(roots=[],options={}) {
 if(!Array.isArray(roots))throw Error('Editor roots must be an array');
 const limits={maxFiles:2000,maxBytesPerFile:1024*1024,maxTotalBytes:16*1024*1024,maxReferencesPerRule:32,maxDirectories:512,maxDepth:24,...options};
 for(const [name,value]of Object.entries(limits))if(!Number.isSafeInteger(value)||value<1)throw Error('Invalid scan limit '+name);
 const sources=[],warnings=[],resolved=[],names=new Set(),paths=new Set(),skippedLinks=[];
 const rules=PROFILES.map(p=>({id:p.id,editorReferences:[],matches:0}));
 let totalBytes=0,filesSeen=0,skippedSensitive=0,skippedOversized=0,directoriesSeen=0;
 const truncated={files:false,bytes:false,references:false,directories:false,depth:false};
 for(const root of roots){
  if(!root||!/^[-A-Za-z0-9_]{1,48}$/.test(root.name??'')||typeof root.path!=='string'||!root.path.trim())throw Error('Invalid explicit editor root');
  if(names.has(root.name.toLowerCase()))throw Error('Duplicate editor root name: '+root.name);
  const path=resolve(root.path);noLinks(path);if(!lstatSync(path).isDirectory())throw Error('Editor root is not a directory: '+path);
  const canonical=realpathSync(path),key=process.platform==='win32'?canonical.toLowerCase():canonical;
  if(paths.has(key))throw Error('Duplicate editor root path');names.add(root.name.toLowerCase());paths.add(key);
  resolved.push({name:root.name,path:canonical,mode:'READ_ONLY'});
  function walk(directory,depth=0){
   if(++directoriesSeen>limits.maxDirectories){truncated.directories=true;return;}
   if(depth>limits.maxDepth){truncated.depth=true;return;}
   for(const entry of readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en'))){
    const absolute=join(directory,entry.name),path=slash(relative(canonical,absolute));
    if(entry.isSymbolicLink()){skippedLinks.push({root:root.name,path});continue;}
    if(entry.isDirectory()){if(!SKIP_DIR.test(entry.name)&&!SENSITIVE.test(entry.name))walk(absolute,depth+1);continue;}
    if(!entry.isFile()||!EXT.test(entry.name))continue;
    if(SENSITIVE.test(entry.name)||/\.(?:bak|backup|old|orig|before)[.-]/i.test(entry.name)||entry.name.startsWith('.')){skippedSensitive++;continue;}
    filesSeen++;if(filesSeen>limits.maxFiles){truncated.files=true;return;}
    const stat=lstatSync(absolute);if(stat.size>limits.maxBytesPerFile){skippedOversized++;continue;}
    if(totalBytes+stat.size>limits.maxTotalBytes){truncated.bytes=true;continue;}
    noLinks(absolute);const bytes=readFileSync(absolute);if(bytes.includes(0)){warnings.push(`Binary-looking source skipped: ${root.name}/${path}`);continue;}
    totalBytes+=bytes.length;const sha256=HASH(bytes),text=bytes.toString('utf8');sources.push({root:root.name,path,sha256,bytes:bytes.length});
    const safe=masked(text),lines=safe.split(/\r?\n/),raw=text.split(/\r?\n/);
    const fileHint=path.replace(/[_./-]/g,' ');
    for(let r=0;r<PROFILES.length;r++){
     const profile=PROFILES[r];if(!profile.terms.test(fileHint)&&!profile.terms.test(safe))continue;
     for(let i=0;i<lines.length;i++){
      const line=lines[i];if(!line.trim())continue;
      // Keep secret-looking lines out of snippets even in a normal editor file.
      if(/\b(?:password|passwd|secret|credential|api[_-]?key|access[_-]?token)\b/i.test(raw[i]))continue;
      let kind;
      if(/<\s*form\b|\buseForm\s*\(/i.test(line))kind='FORM_LOCATION';
      else if(/\b(?:onSubmit|submit|save|update|insert|delete|persist|mutate)\s*(?:[:=(]|\b)|\b(?:UPDATE\s+\w+\s+SET|INSERT\s+INTO|DELETE\s+FROM)\b|\bmethod\s*:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/i.test(line))kind='WRITE_CALL_CANDIDATE';
      else if(/\b(?:fetch|axios\.(?:get|request)|\$\.ajax|\$\.get|SELECT\b[^;]*\bFROM)\s*\(?/i.test(line))kind='READ_CALL_CANDIDATE';
      else if(profile.terms.test(line)&&/<\s*(?:input|select|textarea)\b|\b(?:register|name|value)\s*[=(]/i.test(line))kind='FIELD_CANDIDATE';
      if(!kind)continue;
      rules[r].matches++;if(rules[r].editorReferences.length>=limits.maxReferencesPerRule){truncated.references=true;continue;}
      rules[r].editorReferences.push({root:root.name,path,line:i+1,sha256,snippet:raw[i].trim().slice(0,320),kind,authority:'STATIC_LOCATION_OR_CALL_CANDIDATE',writeProof:'NOT_VERIFIED'});
     }
    }
   }
  }
  walk(canonical);
 }
 return {schemaVersion:'autoforge.external-editors.v2.4',mode:'READ_ONLY',roots:resolved,sources,rules,warnings,skippedLinks,skippedSensitive,skippedOversized,limits,truncated,filesSeen,directoriesSeen,totalBytes,
  evidencePolicy:{formLocation:'STATIC_ONLY',correctWrite:'NOT_PROVEN',removalAuthorizedByMissingEvidence:false},
  gaps:['No root is scanned unless explicitly supplied. Configuration/credential names, links, dependencies, backups and binaries are excluded.',
   'Form and write-call locations do not prove request authorization, correct data mutation, auditing or persistence. Validate request/readback/relogin separately.',
   'The bounded lexical scan does not resolve dynamic includes, PHP execution, routes, DB schemas or runtime sessions. No script, SQL or HTTP request is executed.']};
}

/** Recheck explicitly opted-in roots before applying generated integration.
 * Reference/snippet caps do not hide source files; source/byte/depth caps do.
 */
export function assertExternalEditorSnapshot(snapshot){
 if(!snapshot||snapshot.schemaVersion!=='autoforge.external-editors.v2.4'||!Array.isArray(snapshot.roots)||!Array.isArray(snapshot.sources))throw Error('Invalid external editor snapshot');
 function complete(report){if(report.truncated?.files||report.truncated?.bytes||report.truncated?.directories||report.truncated?.depth||report.skippedOversized>0)throw Error('External editor source snapshot is incomplete/truncated; regenerate with sufficient limits');}
 complete(snapshot);
 const actual=scanExternalEditors(snapshot.roots,snapshot.limits);complete(actual);
 const identity=sources=>sources.map(s=>{
  if(!s||typeof s.root!=='string'||typeof s.path!=='string'||!/^[a-f0-9]{64}$/.test(s.sha256??''))throw Error('Invalid external source descriptor');
  return `${s.root}\0${s.path}\0${s.sha256}`;
 }).sort();
 if(JSON.stringify(identity(snapshot.sources))!==JSON.stringify(identity(actual.sources)))throw Error('External editor source changed since planning; regenerate the analysis');
 return true;
}
