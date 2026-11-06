#!/usr/bin/env node
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';import {pathToFileURL} from 'node:url';
import {buildItemIndex,searchItemIndex} from './item-index.mjs';import {explainItem} from './item-explain.mjs';
import {buildItemScenarios} from './item-scenarios.mjs';
import {captureLog,readLogCapture} from './server-log.mjs';import {buildIncidents,renderIncidents} from './incidents.mjs';
import {makeEvidencePack,evidenceAsText,evidenceFromText,unpackEvidencePack} from '../next/evidence-pack.mjs';
import {readBounded,json,output,save,options,requireValue as must,only} from './lib.mjs';
const HELP=`AutoForge Items & Logs (feature branch, Node22+)
  index     --client CLIENT_DIR --out NEW_DIR
  search    --index item-index.json [--query NAME] [--id ID] [--offset N] [--limit N] --out NEW_DIR
  explain   --index item-index.json --id ID [--client CLIENT_DIR] --out NEW_DIR
  scenarios --index item-index.json [--contracts REVIEWED_ARRAY.json] [--sources SOURCES_ARRAY.json] --out NEW_DIR
  logs      --file SERVER.log --out NEW_DIR [--seconds 30] [--poll-ms 500] [--from end|start]
            [--commit BACKEND_SHA] [--environment windows-runner] [--test-id ID] [--jar-sha256 HASH]
  incidents --capture LOG_CAPTURE_DIR [--index item-index.json] [--context causal-context.json]
            [--response-contracts ARRAY.json] --out NEW_DIR
  log-bundle --capture LOG_CAPTURE_DIR [--index item-index.json] [--context FILE] --out NEW_DIR
  recover-logs --file GITHUB_RUN_LOG.txt --out NEW_DIR
All server access is opt-in read-only file observation. No service/process control, SQL,
browser interaction, migration, privilege elevation or deploy. Missing evidence stays UNVERIFIED.`;
const indexJson=file=>JSON.parse(readBounded(file,128*1024*1024).toString('utf8').replace(/^\uFEFF/,''));
const number=(v,def,min,max)=>{const n=v===undefined?def:Number(v);if(!Number.isSafeInteger(n)||n<min||n>max)throw Error('Numeric option outside bounds');return n;};
const writeReport=(o,name,value,inputs=[])=>{const dir=output(must(o,'out'),inputs);save(dir,name,value);return value;};
export async function main(argv){
 const [cmd,...args]=argv;if(!cmd||cmd==='help'||args.includes('--help')){console.log(HELP);return {status:'HELP'}}
 const o=options(args);
 if(cmd==='index'){only(o,['client','out']);const index=await buildItemIndex({client:must(o,'client')});writeReport(o,'item-index.json',index,[o.client]);return {status:'INDEXED_CATALOG_NOT_GAMEPLAY',items:index.items.length,sourceDigest:index.sourceDigest,coverage:index.coverage};}
 if(cmd==='search'){only(o,['index','query','id','offset','limit','out']);const r=searchItemIndex(indexJson(must(o,'index')),{query:o.query??'',id:o.id,offset:number(o.offset,0,0,1000000),limit:number(o.limit,50,1,200)});return writeReport(o,'item-search.json',r,[o.index]);}
 if(cmd==='explain'){only(o,['index','id','client','out']);const r=await explainItem(indexJson(must(o,'index')),must(o,'id'),{client:o.client});return writeReport(o,'item-dossier.json',r,[o.index,o.client].filter(Boolean));}
 if(cmd==='scenarios'){only(o,['index','contracts','sources','out']);const r=buildItemScenarios({index:indexJson(must(o,'index')),contracts:o.contracts?json(o.contracts):[],evidenceSources:o.sources?json(o.sources):[]});return writeReport(o,'item-scenarios.json',r,[o.index,o.contracts,o.sources].filter(Boolean));}
 if(cmd==='logs'){
  only(o,['file','out','seconds','poll-ms','from','commit','environment','test-id','jar-sha256']);
  const controller=new AbortController(),stop=()=>controller.abort();process.once('SIGINT',stop);process.once('SIGTERM',stop);
  try{return await captureLog({file:must(o,'file'),out:must(o,'out'),identity:{commit:o.commit??null,environment:{name:o.environment??'windows-runner',kind:'READ_ONLY_LOG_OBSERVER'},testId:o['test-id']??'server-log-capture',jarSha256:o['jar-sha256']??null},durationMs:number(o.seconds,30,1,300)*1000,pollMs:number(o['poll-ms'],500,25,10000),from:o.from??'end',maxEvents:1000,maxBytes:512*1024,signal:controller.signal})}finally{process.off('SIGINT',stop);process.off('SIGTERM',stop)}
 }
 if(cmd==='incidents'||cmd==='log-bundle'){
  only(o,['capture','index','context','response-contracts','out']);const c=readLogCapture(must(o,'capture'));
  // A rotated/truncated/partially buffered capture cannot prove absence of an expected response.
  const coverage=c.manifest.coverage??{};
  const complete=!c.manifest.truncated&&!c.manifest.failure&&!c.manifest.stopped&&!(c.manifest.rotations??[]).length&&coverage.pendingLineBytes===0&&coverage.unreadBacklogBytes===0&&!Object.values(c.manifest.diagnosticCounts??{}).some(n=>n>0);
  const r=buildIncidents({events:c.events,index:o.index?indexJson(o.index):null,identity:c.manifest.identity,context:o.context?json(o.context):null,responseContracts:o['response-contracts']?json(o['response-contracts']):[],continuity:complete,windowEnd:c.manifest.endedAt});
  const out=output(must(o,'out'),[o.capture,o.index,o.context,o['response-contracts']].filter(Boolean));save(out,'incidents.json',r);writeFileSync(join(out,'INCIDENTS.md'),renderIncidents(r),{flag:'wx'});
  if(cmd==='log-bundle'){
   for(const name of ['events.jsonl','log-manifest.json','log-cursor.json'])writeFileSync(join(out,name),readBounded(join(o.capture,name),2*1024*1024),{flag:'wx'});
   const pack=makeEvidencePack({root:out,files:['events.jsonl','log-manifest.json','log-cursor.json','incidents.json','INCIDENTS.md']});
   writeFileSync(join(out,'server-log.afpack'),pack.buffer,{flag:'wx'});writeFileSync(join(out,'github-evidence.txt'),evidenceAsText(pack.buffer),{flag:'wx'});
   return {status:'LOG_EVIDENCE_PREPARED',incidents:r.incidents.length,packSha256:pack.sha256,gameplay:'UNVERIFIED',artifact:'server-log.afpack'};
  }
  return {status:r.status,incidents:r.incidents.length,suppressed:r.suppressed,gameplay:'UNVERIFIED'};
 }
 if(cmd==='recover-logs'){
  only(o,['file','out']);const raw=readBounded(must(o,'file'),16*1024*1024).toString('utf8');
  const lines=raw.split(/\r?\n/).map(line=>line.match(/(AFPACK_(?:BEGIN|DATA|END):[A-Za-z0-9+/:=]+)\s*$/)?.[1]).filter(Boolean);
  const pack=evidenceFromText(lines.join('\n'));return unpackEvidencePack(pack,must(o,'out'));
 }
 throw Error('Unknown command '+cmd);
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){try{const r=await main(process.argv.slice(2));if(r.status!=='HELP')console.log(JSON.stringify(r,null,2))}catch(e){console.error('AutoForge Items & Logs: '+e.message);process.exitCode=1}}
