#!/usr/bin/env node
import {writeFileSync} from 'node:fs';import {join,resolve} from 'node:path';import {pathToFileURL} from 'node:url';
import {readBounded,output,save,options,requireValue as must,only} from '../items/lib.mjs';
import {buildQuestAtlas,diagnoseQuest,verifyQuestSources} from './quests.mjs';
import {buildWorldAtlas,validateWorldJourney,validateWorldProjection} from './world.mjs';
import {buildShopAtlas,evaluatePurchase} from './shops.mjs';import {scanGameplayBackend} from './backend.mjs';
import {assertBackendSnapshot} from '../../backend-guard.mjs';
import {auditWorld} from './map-audit.mjs';
import {auditBattleConsistency} from './battle-audit.mjs';
import {artifactJson,digest} from '../learning/evidence.mjs';
const HELP=`AutoForge Gameplay — three modules, read-only toward the game
  quests | maps | shops | all --client CLIENT_DIR [--backend JAVA_DIR] --out NEW_DIR
  quest-check --atlas quest-atlas.json --quest-id ID --evidence RECORD.json --bindings ARRAY.json [--client DIR] --out NEW_DIR
  map-check --atlas world-atlas.json --journey RECORD.json [--bindings ARRAY.json] [--client DIR] --out NEW_DIR
  map-projection --atlas world-atlas.json --projection RECORD.json --out NEW_DIR
  map-audit --atlas world-atlas.json [--manifest AUDIT.json --evidence-root DIR] [--client DIR] [--backend DIR --backend-report FILE] --out NEW_DIR
  battle-check --atlas world-atlas.json --contract RULES.json --observation ARTIFACT_DESCRIPTOR.json --evidence-root DIR --client DIR --expected-commit SHA --out NEW_DIR
  shop-check --atlas shop-atlas.json --purchase RECORD.json [--client DIR] --out NEW_DIR
  Checks optionally accept --backend DIR --backend-report backend-analysis.json to reject stale plans.
No SQL, grants, quest completion, browser actions, process control or deployment are performed.`;
const json=p=>JSON.parse(readBounded(p,128*1024*1024).toString('utf8').replace(/^\uFEFF/,''));
function guard(o){if(!!o.backend!==!!o['backend-report'])throw Error('Checks require both backend and backend-report');if(o.backend)assertBackendSnapshot(o.backend,json(o['backend-report']).snapshot);}
export async function main(argv){
 const [cmd,...args]=argv;if(!cmd||cmd==='help'||args.includes('--help')){console.log(HELP);return {status:'HELP'}}const o=options(args);
 if(['quests','maps','shops','all'].includes(cmd)){
  only(o,['client','backend','out']);const client=must(o,'client'),builders={quests:buildQuestAtlas,maps:buildWorldAtlas,shops:buildShopAtlas},names={quests:'quest-atlas.json',maps:'world-atlas.json',shops:'shop-atlas.json'};
  const backend=o.backend?scanGameplayBackend({backend:o.backend}):null;
  const built={};for(const domain of cmd==='all'?Object.keys(builders):[cmd])built[domain]=builders[domain]({client});
  const out=output(must(o,'out'),[client,o.backend].filter(Boolean));const report={schemaVersion:'autoforge.gameplay-delivery.v1',status:'READY_FOR_INVESTIGATION',runtime:'UNVERIFIED',backendCommit:backend?.provenance.commit??null,backendDirty:backend?.provenance.dirty??null,modules:{},mutationsPerformed:false};
  for(const [domain,atlas] of Object.entries(built)){save(out,names[domain],atlas);report.modules[domain]={file:names[domain],sourceDigest:atlas.sourceDigest,coverage:atlas.coverage};}
  if(backend)save(out,'backend-analysis.json',backend);save(out,'gameplay-report.json',report);
  writeFileSync(join(out,'COMECE_AQUI.md'),'# AutoForge: missões, mapas e lojas\n\nLeia gameplay-report.json e o atlas do domínio. As fontes e hashes pertencem a este snapshot. Consulte docs/GAMEPLAY_START.md na ferramenta. Não associe condições só pelo número; compare namespace/dispatcher e evento persistido. Diferencie entrada de mapa, vitória, projeção da UI e relogin. Lojas exigem todos os custos, limites e modificadores resolvidos. backend-analysis.json contém métodos candidatos e snapshot: revalide antes de editar. Nenhum sistema foi declarado funcional por esta geração.\n',{flag:'wx'});
  return {status:report.status,runtime:report.runtime,modules:Object.keys(report.modules),backendCommit:report.backendCommit};
 }
 const checks=['quest-check','map-check','map-projection','map-audit','battle-check','shop-check'];if(!checks.includes(cmd))throw Error('Unknown command '+cmd);
 only(o,['atlas','quest-id','evidence','bindings','journey','projection','purchase','client','backend','backend-report','manifest','evidence-root','contract','observation','expected-commit','out']);guard(o);const atlas=json(must(o,'atlas'));let report;
 if(cmd==='quest-check')report=diagnoseQuest({atlas,questId:must(o,'quest-id'),bindings:json(must(o,'bindings')),evidence:json(must(o,'evidence')),client:o.client});
 else if(cmd==='map-check'){
  if(o.client)verifyQuestSources({client:o.client,sources:[...atlas.sources,...(atlas.code?.sources??[])]});
  report=validateWorldJourney({atlas,journey:json(must(o,'journey')),bindings:o.bindings?json(o.bindings):[]});
 }else if(cmd==='map-projection')report=validateWorldProjection({atlas,projection:json(must(o,'projection'))});
 else if(cmd==='map-audit'){
  const manifest=o.manifest?json(o.manifest):{};
  if(Object.keys(manifest).some(k=>!['expectedCommit','observations','baselines','journeys','projections','bindings','reportedSymptoms'].includes(k)))throw Error('Unknown audit manifest field');
  report=auditWorld({...manifest,atlas,client:o.client,backend:o.backend,backendReport:o.backend?json(o['backend-report']):undefined,evidenceRoot:o['evidence-root']});
 }
 else if(cmd==='battle-check'){
  const descriptor=json(must(o,'observation')),observation=artifactJson(must(o,'evidence-root'),descriptor),backendReport=o.backend?json(o['backend-report']):null;
  if(backendReport&&o['expected-commit']&&backendReport.snapshot.commit!==o['expected-commit'])throw Error('Expected commit differs from analyzed backend');
  if(backendReport&&observation.identity?.backendSnapshotDigest!==digest(backendReport.snapshot))throw Error('Battle observation backend snapshot mismatch');
  if(o.client)verifyQuestSources({client:o.client,sources:[...atlas.sources,...(atlas.code?.sources??[])]});
  report=auditBattleConsistency({atlas,contract:json(must(o,'contract')),observation,expectedCommit:backendReport?.snapshot.commit??o['expected-commit'],client:o.client});report.artifact=descriptor;
 }
 else report=evaluatePurchase({...json(must(o,'purchase')),atlas,client:o.client});
 const out=output(must(o,'out'),[o.atlas,o.evidence,o.bindings,o.journey,o.projection,o.purchase,o.client,o.backend,o.manifest,o.contract,o.observation,o['evidence-root']].filter(Boolean));save(out,cmd+'-report.json',report);return report;
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){try{const r=await main(process.argv.slice(2));if(r.status!=='HELP'){console.log(JSON.stringify({status:r.status,runtime:r.runtime??'UNVERIFIED',modules:r.modules,firstMissingBoundary:r.firstMissingBoundary,reason:r.reason}));if(['FAIL','FAIL_RECORDED','DIVERGENT_RECORDED','REJECTED'].includes(r.status))process.exitCode=1}}catch(e){console.error('AutoForge Gameplay: '+e.message);process.exitCode=1}}
