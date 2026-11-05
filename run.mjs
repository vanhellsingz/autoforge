import {parseEditorRoot} from './external-editors.mjs';
import {readFileSync,readdirSync,writeFileSync,mkdirSync,copyFileSync,mkdtempSync,rmSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {sha256,assertSeparateOutput} from './assets.mjs';
import {discover} from './discover.mjs';
const here=dirname(fileURLToPath(import.meta.url));
export function options(args) {
 const r={client:resolve(here,'../..'),out:resolve(here,'../../../autoforge-v2-output'),discoverOnly:false};
 for(let i=0;i<args.length;i++) {
  const arg=args[i];
  if(arg==='--editor-root'){const value=args[++i];if(!value)throw Error('--editor-root requires name=path');(r.editorRoots??=[]).push(parseEditorRoot(value));}
  else if(arg==='--discover-only')r.discoverOnly=true;
  else if(arg==='--help')r.help=true;
  else if(['--client','--out','--backend','--assessment'].includes(arg)) {const value=args[++i];if(!value||value.startsWith('--'))throw Error(`Missing value for ${arg}`);r[arg.slice(2)]=resolve(value);}
  else if(!arg.startsWith('-')&&i===0)r.client=resolve(arg);
  else throw Error(`Unknown argument ${arg}`);
 }
 return r;
}
const json=(path,value)=>writeFileSync(path,JSON.stringify(value,null,2)+'\n');
function toolEnv(client,out) {
 const env={...process.env,AUTOFORGE_CLIENT_ROOT:client,AUTOFORGE_OUTPUT_DIR:out,AUTOFORGE_REQUIRE_JAVA:'1'};
 if(env.JAVA_HOME)env.PATH=join(env.JAVA_HOME,'bin')+(process.platform==='win32'?';':':')+env.PATH;
 return env;
}
export async function run(config) {
 const {client,out,discoverOnly}=config;
 assertSeparateOutput(client,out);mkdirSync(out,{recursive:true});
 json(join(out,'manifest.json'),{schemaVersion:1,validated:false,files:[]});
 const env=toolEnv(client,out),start=Date.now();let temp,phase="discovery";const completed=[];
 try {
  const discovery=await discover(client);json(join(out,'discovery.json'),discovery);
  if(discoverOnly){json(join(out,'handoff.json'),{version:'2.4',status:'DISCOVERY_ONLY',runtime:'NOT_INTEGRATED'});if(!config.quiet)console.log(`Discovery: ${join(out,'discovery.json')}`);return;}
  phase="jdk-preflight";const doctor={node:process.version,javac:execFileSync('javac',['-version'],{encoding:'utf8',env,timeout:10000}).trim()};
  temp=mkdtempSync(join(out,'.run-'));const stageEnv=toolEnv(client,temp);
  for(const name of ['forge-cost.mjs','forge-rate.mjs','quest-conditions.mjs']){phase=name;execFileSync(process.execPath,[join(here,name),'--write'],{stdio:'inherit',env:stageEnv,timeout:120000});completed.push(name);}
  phase='capacity';const {generateCapacity}=await import('./capacity.mjs');
  const prev=process.env.PATH;process.env.PATH=env.PATH;
  try{await generateCapacity(client,temp);}finally{process.env.PATH=prev;}
  completed.push('capacity');phase='compile-all';const javaFiles=readdirSync(temp).filter(n=>n.endsWith('.java')).sort();
  if(javaFiles.length<4)throw Error('Missing generated classes');
  execFileSync('javac',['--release','21','-d',temp,...javaFiles.map(n=>join(temp,n))],{env,timeout:120000,stdio:'pipe'});
  completed.push('compile-all');phase='snapshot-check';const after=await discover(client);
  if(JSON.stringify(discovery)!==JSON.stringify(after))throw Error('Client changed during extraction. Run again.');
  const files=[];mkdirSync(join(out,'generated'),{recursive:true});
  for(const name of javaFiles){const bytes=readFileSync(join(temp,name)),path='generated/'+name;copyFileSync(join(temp,name),join(out,path));files.push({path,sha256:sha256(bytes),className:name.slice(0,-5)});}
  const evidence=[];
  for(const name of readdirSync(temp).filter(n=>n.endsWith('.json')).sort()){copyFileSync(join(temp,name),join(out,name));evidence.push({path:name,sha256:sha256(readFileSync(join(temp,name)))});}
  json(join(out,'handoff.json'),{version:'2.4',status:'PURE_RULES_VALIDATED',doctor,files,evidence,elapsedMs:Date.now()-start,runtime:'NOT_INTEGRATED',deployment:'NOT_RUN',next:['Ler PROMPT_ARENA.md','Executar integrate.mjs para prévia e depois --apply','Conectar fórmulas aos serviços e validar transações/persistência','Compilar backend e aplicar pelo procedimento autorizado existente']});
  copyFileSync(join(here,'PROMPT_ARENA.md'),join(out,'PROMPT_ARENA.md'));
  json(join(out,'manifest.json'),{schemaVersion:1,validated:true,files,evidence});
  phase='arena-preparation';const {prepare}=await import('./prepare.mjs');const arena=prepare({from:out,backend:config.backend,client,assessment:config.assessment,editorRoots:config.editorRoots});
  const handoff=JSON.parse(readFileSync(join(out,'handoff.json'),'utf8'));handoff.arena={status:arena.status,entry:'COMECE_AQUI.md',tasks:arena.tasks.length};json(join(out,'handoff.json'),handoff);
  console.log(`AutoForge 2.4: ${files.length} classes Java compiladas. Entrega: ${out}`);
 }catch(error){json(join(out,'manifest.json'),{schemaVersion:1,validated:false,files:[]});json(join(out,'handoff.json'),{version:'2.4',status:'FAILED',failedPhase:phase,completed,error:String(error.message),runtime:'NOT_INTEGRATED',deployment:'NOT_RUN'});throw error;}
 finally{if(temp)rmSync(temp,{recursive:true,force:true});}
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 try{const config=options(process.argv.slice(2));if(config.help)console.log('node run.mjs [--client CLIENT_ROOT] [--out OUTPUT] [--backend JAVA_V1] [--assessment REVIEW.json] [--editor-root NAME=PATH] [--discover-only]\nDefaults: repository client; output beside repository. Node20+ and JDK21 for generation.');else await run(config);}
 catch(error){console.error(`AutoForge: ${error.message}`);process.exitCode=1;}
}
