#!/usr/bin/env node
import {readFileSync,writeFileSync,mkdirSync,existsSync,lstatSync} from 'node:fs';
import {resolve,join} from 'node:path';import {pathToFileURL} from 'node:url';
import {parseArgs,assertOutside,redact} from '../plus/lib.mjs';
import {readCapture} from './flight-recorder.mjs';import {correlateTrace,parseServerLog} from './causal-engine.mjs';
import {recordCdp} from './cdp-recorder.mjs';import {generateImplementation} from './contract-generator.mjs';
import {compareAction} from './equivalence.mjs';import {auditInvariants} from './invariants.mjs';
import {buildReplayPlan} from './replay-planner.mjs';import {packEvidence,importEvidence} from './evidence-bridge.mjs';
import {runIncidentReplay} from './incident-replay.mjs';
import {runExtractFlow} from './slice/extract-flow.mjs';
const HELP=`AutoForge Studio — evidence-led tools (Node22 / Java21 for generated-code tests)
  extract-flow --client CLIENT_DIR --action ACTION_NAME [--backend JAVA_DIR] [--opcode ID] --out NEW_DIR
  record     --cdp http://127.0.0.1:9222 --page-url http://127.0.0.1:5173/index.html --out NEW_DIR
             [--seconds 30] [--capture-actions] [--commit SHA] [--environment windows-dev]
  diagnose   --capture DIR [--context causal-context.json] [--server-log FILE] --out NEW_DIR
  generate   --contract FILE [--backend JAVA_DIR] --out NEW_DIR
  compare    --reference ACTION.json --candidate ACTION.json --out NEW_DIR
  incident-replay --cases CASES.json [--evidence DIR] [--backend JAVA_DIR] --out NEW_DIR
  audit      --action ACTION.json [--rules RULES.json] --out NEW_DIR
  replay     --capture DIR [--required-s2c 113,115] --out NEW_DIR
  bridge     --root REPORT_DIR --files events.jsonl,capture-manifest.json [--out NEW_DIR]
  import     --log GITHUB_LOG --out NEW_DIR [--expected-sha256 HASH]
  bundle     --capture DIR [--context FILE] [--reference FILE --candidate FILE] [--contract FILE --backend DIR] --out NEW_DIR
The recorder attaches only to an existing browser with local CDP already enabled.
No command starts/stops the game, migrates SQL or deploys. Replay CLI creates a plan;
executing real actions uses the reviewed runReplay adapter API with explicit authorization.`;
function input(path){if(!path)throw Error('Input path required');const p=resolve(path);const st=lstatSync(p);if(st.isSymbolicLink()||!st.isFile()||st.size>32*1024*1024)throw Error('Input must be bounded regular file');return readFileSync(p,'utf8').replace(/^\uFEFF/,'');}
const json=path=>JSON.parse(input(path));
function output(path,protectedPaths=[]){if(!path)throw Error('--out NEW_DIR required');const p=resolve(path);assertOutside(p,protectedPaths);if(existsSync(p))throw Error('Use a new output directory');mkdirSync(p,{recursive:true});return p;}
const save=(root,name,value)=>writeFileSync(join(root,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
function capture(o){const value=readCapture(o.capture);return value;}
function opcodes(value){if(value===undefined)return [];const result=value.split(',').map(Number);if(result.some(n=>!Number.isSafeInteger(n)||n<0))throw Error('Invalid required S2C list');return result;}
function normalizedArgs(args){const {opts,positional}=parseArgs(args,{bool:['captureActions'],list:[]});if(positional.length)throw Error('Unexpected positional argument');const allowed=new Set(['cdp','pageUrl','out','seconds','captureActions','commit','environment','capture','context','serverLog','contract','backend','reference','candidate','action','rules','requiredS2c','root','files','log','expectedSha256','cases','evidence','client','opcode']);for(const k of Object.keys(opts))if(!allowed.has(k))throw Error('Unknown option: '+k);return opts;}
export async function main(argv){
 const [cmd,...args]=argv;if(!cmd||cmd==='help'||args.includes('--help')){console.log(HELP);return {status:'HELP'}};
 const o=normalizedArgs(args);
 if(cmd==='extract-flow')return runExtractFlow({client:o.client,backend:o.backend,action:o.action,opcode:o.opcode,out:o.out});
 if(cmd==='incident-replay')return runIncidentReplay({cases:json(o.cases),evidence:o.evidence,backend:o.backend,out:o.out});
 if(cmd==='record'){
  const controller=new AbortController(),stop=()=>controller.abort();process.once('SIGINT',stop);process.once('SIGTERM',stop);
  try{return await recordCdp({endpoint:o.cdp,pageUrl:o.pageUrl,out:o.out,identity:{commit:o.commit??null,environment:{name:o.environment??'windows-dev',kind:'BROWSER_OBSERVER'}},durationMs:Number(o.seconds??30)*1000,captureActions:!!o.captureActions,signal:controller.signal})}finally{process.off('SIGINT',stop);process.off('SIGTERM',stop)}
 }
 if(cmd==='generate')return generateImplementation({contract:o.contract,backend:o.backend,out:o.out});
 if(cmd==='import')return importEvidence({log:input(o.log),out:o.out,expectedSha256:o.expectedSha256});
 if(cmd==='bridge'){
  const p=packEvidence({root:o.root,files:o.files?.split(',')});
  if(o.out){const out=output(o.out,[o.root]);writeFileSync(join(out,'evidence.log'),p.log);save(out,'bridge-manifest.json',{sha256:p.sha256,files:p.files})}
  else process.stdout.write(p.log);return {status:'PACKED_INTEGRITY_ONLY',sha256:p.sha256,files:p.files};
 }
 if(cmd==='compare'){
  const reference=json(o.reference),candidate=json(o.candidate),report=compareAction(reference,candidate,{referenceBaseDir:resolve(o.reference,'..'),candidateBaseDir:resolve(o.candidate,'..')});
  const out=output(o.out,[o.reference,o.candidate]);save(out,'equivalence.json',report);return report;
 }
 if(cmd==='audit'){
  const report=auditInvariants(json(o.action),{rules:o.rules?json(o.rules):[]});const out=output(o.out,[o.action,o.rules].filter(Boolean));save(out,'invariants.json',report);return report;
 }
 if(['diagnose','replay','bundle'].includes(cmd)){
  const c=capture(o);let context=o.context?json(o.context):{};
  const staleContext=!!(context.commit&&c.manifest.identity.commit&&context.commit!==c.manifest.identity.commit);
  if(staleContext)context={...context,domains:[],staticCandidatesBlocked:'BACKEND_COMMIT_MISMATCH'};
  const out=output(o.out,[o.capture,o.backend,o.context,o.reference,o.candidate,o.contract,o.serverLog].filter(Boolean));
  const report={schemaVersion:'autoforge.studio.v1',capture:c.manifest,checks:{captureIntegrity:'VERIFIED',captureComplete:!c.manifest.truncated,contextMatch:staleContext?'MISMATCH_NO_STATIC_CANDIDATES':context.commit&&c.manifest.identity.commit?'DECLARED_COMMIT_MATCH':'UNVERIFIED'},gameplay:'UNVERIFIED',deploy:'NOT_RUN',outputs:[]};
  let causalEvents=c.events;
  if(o.serverLog){
   const server=parseServerLog(input(o.serverLog),{identity:c.manifest.identity,runId:c.manifest.runId});save(out,'server-events.json',server);report.outputs.push('server-events.json');
   causalEvents=[...c.events.map(e=>({...e,source:'capture',sourceSequence:e.sequence})),...server.events.map(e=>({...e,source:'server-log',sourceSequence:e.sequence}))].sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp)||a.sequence-b.sequence).map((e,i)=>({...e,sequence:i+1}));
   report.serverJoin='Correlated only by observed session/action/request identifiers; unmapped transport and backend sessions remain unverified. Source provenance remains declared.';
  }
  if(cmd!=='replay'){const causal=correlateTrace(causalEvents,context);save(out,'causal-report.json',causal);report.outputs.push('causal-report.json');}
  if(cmd!=='diagnose'){const replay=buildReplayPlan({events:c.events,requiredS2C:opcodes(o.requiredS2c),context});save(out,'replay-plan.json',replay);report.outputs.push('replay-plan.json');}
  if(cmd==='bundle'){
   if(!!o.reference!==!!o.candidate)throw Error('Bundle comparison requires both reference and candidate');
   if(o.reference){const r=json(o.reference),j=json(o.candidate);save(out,'equivalence.json',compareAction(r,j,{referenceBaseDir:resolve(o.reference,'..'),candidateBaseDir:resolve(o.candidate,'..')}));save(out,'invariants.json',auditInvariants(j,{rules:o.rules?json(o.rules):[]}));report.outputs.push('equivalence.json','invariants.json');}
   if(o.contract){const generated=generateImplementation({contract:o.contract,backend:o.backend,out:join(out,'implementation')});report.contractStatus=generated.status;report.outputs.push('implementation/');}
  }
  save(out,'studio-report.json',report);
  writeFileSync(join(out,'COMECE_AQUI.md'),'# Entrega AutoForge Studio\n\nLeia studio-report.json, causal-report.json e replay-plan.json quando presentes. Verifique commit, hashes e truncamento da captura. Chamadas estaticas sao candidatos. Ausencia de pacote ou checkpoint e UNVERIFIED. Integre somente os contratos revisados, preserve transacoes/handlers existentes e gere provas de UI e persistencia antes de declarar gameplay funcional.\n',{flag:'wx'});
  return report;
 }
 throw Error('Unknown command: '+cmd);
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){try{const r=await main(process.argv.slice(2));if(r.status!=='HELP'){console.log(JSON.stringify(r,null,2));if(r.status==='DIVERGENT'||r.status==='FAIL')process.exitCode=1}}catch(e){console.error('AutoForge Studio: '+redact(e.message));process.exitCode=1}}
