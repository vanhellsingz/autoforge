// A bounded navigation aid. Lexical relations are candidates, never execution proof.
import {readFileSync,readdirSync,lstatSync,existsSync} from 'node:fs';
import {resolve,join,relative,parse,sep,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
import {extractJavaMethods} from './integration-contracts.mjs';
const digest=b=>createHash('sha256').update(b).digest('hex');
const posix=p=>p.replaceAll('\\','/');
const DOMAINS=[
 ['inventory','Inventory|Bag|ItemRepository','bag|inventory|itemUse|useItem'],
 ['equipment','Equipment|EffectiveHeroAttribute|BagService','equip|bagMove|attribute'],
 ['sale','BagService|Inventory','sell|sale|bagSell'],
 ['forge','Forge|Strengthen','forge|strengthen|enhance|intensif'],
 ['troops','Army|Pawn','army|pawn|recruit|formation|dismiss'],
 ['campaign','Campaign|TutorialProgression','campaign|nodeSucc|battleResult|quest'],
 ['power','Attribute|FightCapacity|CombatMath','attribute|fightingCapacity|power|capacity'],
];
const CONTROL=new Set(['if','for','while','switch','catch','synchronized','try','new','return','throw','this','super']);
function masked(text){return text.replace(/\/\*[\s\S]*?\*\/|\/\/[^\r\n]*|"""[\s\S]*?"""|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g,s=>s.replace(/[^\r\n]/g,' '));}
function assertNoLinks(path){let at=parse(path).root;for(const p of path.slice(at.length).split(sep).filter(Boolean)){at=join(at,p);if(existsSync(at)&&lstatSync(at).isSymbolicLink())throw Error(`Causal context refuses links: ${at}`);}}
const lineAt=(text,n)=>text.slice(0,n).split('\n').length;
const methodRef=m=>({id:m.id,path:m.source.path,method:m.method,signature:m.signature,startLine:m.startLine,endLine:m.endLine,sha256:m.source.sha256,bodySha256:m.bodySha256});

export function buildCausalContext(backendRoot,{commit=null,maxFiles=2500,maxBytesPerFile=4*1024*1024,maxMethodsPerDomain=24,maxCallsPerMethod=20,maxCandidatesPerCall=4,expectedSources=[]}={}){
 const root=resolve(backendRoot);assertNoLinks(root);
 for(const [key,value] of Object.entries({maxFiles,maxBytesPerFile,maxMethodsPerDomain,maxCallsPerMethod,maxCandidatesPerCall}))if(!Number.isSafeInteger(value)||value<1)throw Error(`Invalid context limit: ${key}`);
 const files=[],limitations=[],sources=[],methods=[];let omittedFiles=0;
 function walk(dir){if(!existsSync(dir))return;assertNoLinks(dir);for(const e of readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en'))){const p=join(dir,e.name);if(e.isSymbolicLink()){limitations.push(`Skipped linked source: ${posix(relative(root,p))}`);continue;}if(e.isDirectory()){if(['target','generated','autoforge'].includes(e.name))continue;walk(p);}else if(e.isFile()&&e.name.endsWith('.java')){if(files.length<maxFiles)files.push(p);else omittedFiles++;}}}
 walk(join(root,'apps/game-server/src/main/java'));
 const moduleRoot=join(root,'modules');if(existsSync(moduleRoot)){assertNoLinks(moduleRoot);for(const e of readdirSync(moduleRoot,{withFileTypes:true})){if(e.isSymbolicLink()){limitations.push(`Skipped linked module: ${e.name}`);continue;}if(e.isDirectory())walk(join(moduleRoot,e.name,'src/main/java'));}}
 const expected=new Map(expectedSources.map(s=>[s.path,s.sha256]));
 for(const file of files){if(lstatSync(file).size>maxBytesPerFile){limitations.push(`Source exceeds byte limit: ${posix(relative(root,file))}`);continue;}const bytes=readFileSync(file),path=posix(relative(root,file)),sha256=digest(bytes);if(expected.has(path)&&expected.get(path)!==sha256)throw Error(`Causal context snapshot stale: ${path}`);const source={path,sha256,bytes:bytes.length,text:bytes.toString('utf8')};source.code=masked(source.text);sources.push({path,sha256,bytes:bytes.length});if(/\\u+[0-9a-fA-F]{4}/.test(source.text)){limitations.push(`Unicode escapes require Java parser: ${path}`);continue;}for(const m of extractJavaMethods(source.text))methods.push({...m,source,id:`${path}:${m.startLine}:${m.method}`});}
 for(const [path,sha] of expected){const full=resolve(root,path),rel=relative(root,full);if(isAbsolute(path)||!rel||rel==='..'||rel.startsWith('..'+sep)||isAbsolute(rel))throw Error('Invalid expected source path');assertNoLinks(full);if(!existsSync(full)||digest(readFileSync(full))!==sha)throw Error(`Causal context snapshot stale: ${path}`);}
 const byName=new Map();for(const m of methods){if(!byName.has(m.method))byName.set(m.method,[]);byName.get(m.method).push(m);}
 function describe(m){const code=m.source.code.slice(m.bodyStart,m.end),calls=[],opcodes=[],tables=[];let totalCalls=0;
  for(const c of code.matchAll(/\b(?:(\w+)\s*\.\s*)?([A-Za-z_$][\w$]*)\s*\(/g)){if(CONTROL.has(c[2]))continue;totalCalls++;if(calls.length>=maxCallsPerMethod)continue;const matches=(byName.get(c[2])??[]).filter(x=>x.id!==m.id);calls.push({receiver:c[1]??null,method:c[2],line:lineAt(m.source.text,m.bodyStart+c.index),relation:'LEXICAL_CALL_CANDIDATE',resolved:false,candidateCount:matches.length,candidates:matches.slice(0,maxCandidatesPerCall).map(methodRef)});}
  for(const c of code.matchAll(/\bOpcodes\.([A-Z][A-Z0-9_]*)\b/g))opcodes.push({symbol:c[1],line:lineAt(m.source.text,m.bodyStart+c.index),meaning:'SYMBOL_REFERENCE_ONLY'});
  // Only quoted Java literals, excluding comments. No SQL is executed.
  const body=m.source.text.slice(m.bodyStart,m.end);
  for(const token of body.matchAll(/\/\*[\s\S]*?\*\/|\/\/[^\r\n]*|"""[\s\S]*?"""|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g)){if(!token[0].startsWith('"'))continue;for(const sql of token[0].matchAll(/\b(?:FROM|JOIN|UPDATE|INTO)\s+`?([A-Za-z_][A-Za-z0-9_]*)/gi))tables.push({table:sql[1],line:lineAt(m.source.text,m.bodyStart+token.index+sql.index),meaning:'SQL_LITERAL_REFERENCE_NOT_SCHEMA_PROOF'});}
  return {...methodRef(m),calls,totalCalls,callsTruncated:totalCalls>calls.length,opcodes,tables};
 }
 const domains=DOMAINS.map(([id,classPattern,methodPattern])=>{const classRe=new RegExp(classPattern,'i'),methodRe=new RegExp(methodPattern,'i');const matches=methods.filter(m=>classRe.test(m.source.path.split('/').at(-1))||methodRe.test(m.method));matches.sort((a,b)=>Number(/^handle/.test(b.method))-Number(/^handle/.test(a.method))||a.source.path.localeCompare(b.source.path,'en')||a.startLine-b.startLine);const selected=matches.slice(0,maxMethodsPerDomain).map(describe);return {id,status:selected.length?'STATIC_CANDIDATES':'NO_CANDIDATE_IN_SCANNED_SCOPE',implementationStatus:'unverified',runtimeProven:false,candidateCount:matches.length,truncated:matches.length>selected.length,methods:selected,requiredTrace:['Client event and emitted opcode (capture required)','Dispatcher and service invocation (candidates below)','Transactional validation, mutation, audit and commit','Authoritative readback and response/S2C','UI refresh and persistence after relogin'],missingProofs:['No client capture or deployed JAR was inspected by this scanner.','A same-name method candidate does not resolve receiver type, overload, virtual dispatch or execution.','SQL literals do not establish live tables, transaction correctness or successful persistence.']};});
 return {schemaVersion:'autoforge.causal-context.v1',mode:'STATIC_READ_ONLY',commit,environment:{kind:'BACKEND_CHECKOUT',root},testId:'causal-context.mjs static scan',sources,filesScanned:sources.length,omittedFiles,limits:{maxFiles,maxBytesPerFile,maxMethodsPerDomain,maxCallsPerMethod,maxCandidatesPerCall},domains,limitations,policy:{implementationProof:false,autoMutation:false,absenceAllowsRemoval:false},workflow:['Find the failing user action and first missing boundary; do not alter later systems to mask it.','Inspect exact methods and verify hashes against the planning snapshot before editing.','Trace calls using type information or captured execution; candidates here are navigation hints.','Preserve authoritative data, transactions, idempotency, permissions and response order.','Record expected vs actual values plus commit/environment/test/artifact for each boundary.','Test focused units/contracts before deployment; perform one deployment only after those pass.']};
}

export function renderCausalContext(report){return '# Mapa de investigação para o Arena\n\nAnálise estática; não prova gameplay nem substitui leitura dos métodos. Commit: '+(report.commit??'indisponível')+'.\n\n'+report.workflow.map((s,i)=>`${i+1}. ${s}`).join('\n')+'\n\n'+report.domains.map(d=>`## ${d.id}\n\n${d.status}; ${d.candidateCount} candidatos, ${d.methods.length} exibidos. Estado: unverified.\n\n`+d.methods.map(m=>`- ${m.path}:${m.startLine} — ${m.signature}; fim ${m.endLine}; SHA-256 ${m.sha256}`).join('\n')+'\n\n'+d.missingProofs.map(s=>'- '+s).join('\n')).join('\n\n')+'\n\nDetalhes de chamadas, símbolos e SQL em causal-context.json. Relações são candidatos lexicais, não um call graph resolvido.\n';}
