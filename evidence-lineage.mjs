import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {backendProvenance} from './backend-provenance.mjs';
/** Attach source observations and numerical comparisons to their actual evidence scopes.
 * No runtime deployment is inspected or inferred here.
 */
export function evidenceLineage({from,backend,client,provenance,verified,scan,dataAdmin,contracts}) {
 const runId=randomUUID(),recordedAt=new Date().toISOString();
 const environment={kind:'SOURCE_CHECKOUT',platform:process.platform,backend:backend??null,deployedCommit:null,liveJarSha256:null,runtimeVerification:'NOT_PERFORMED'};
 const environmentId='checkout:'+runId;
 const observation=producer=>({commit:provenance.commit??null,environmentId,testId:producer,evidenceRunId:runId,scope:'STATIC_EXTRACTION_NOT_LIVE'});
 const context=producer=>({runId,recordedAt,commit:provenance.commit??null,dirty:provenance.dirty??null,environment,test:{id:producer,kind:'STATIC_EXTRACTION',result:'OBSERVATION_ONLY'},transferToLive:'NOT_PROVEN_FOR_LIVE'});
 for(const [map,producer,keys] of [[scan,'backend-map.mjs',['references','candidates']],[dataAdmin,'data-admin-map.mjs',['tables','admin','handlers','migrations']],[contracts,'integration-contracts.mjs',['methods','handlers','protocol','unresolved']]]) {
  if(!map)continue;
  map.evidenceContext=context(producer);
  for(const rule of map.rules??[])for(const key of keys)for(const item of rule[key]??[])item.evidenceContext=observation(producer);
 }
 let doctor={};try{doctor=JSON.parse(readFileSync(join(from,'handoff.json'),'utf8')).doctor??{};}catch{}
 const cp=client?backendProvenance(client):{commit:null,status:'NOT_REQUESTED'};
 const artifacts=verified.evidence.map(entry=>({path:entry.path,sha256:entry.sha256,rule:entry.rule,commit:cp.commit??null,commitStatus:cp.status,backendContextCommit:provenance.commit??null,environment:{kind:'LOCAL_COMPARISON',platform:process.platform,node:doctor.node??'NOT_RECORDED',javac:doctor.javac??'NOT_RECORDED',deployedCommit:null,liveJarSha256:null},producer:({'forge.common.enhancement.gold':'forge-cost.mjs','forge.common.enhancement.rate':'forge-rate.mjs','attributes.fighting-capacity':'capacity.mjs','quest.condition.vocabulary':'quest-conditions.mjs'})[entry.rule],test:entry.report.comparison?{id:entry.rule,kind:'NUMERIC_PARITY',result:'PASSED_FOR_RECORDED_CORPUS',comparison:entry.report.comparison}:{id:entry.rule,kind:'STATIC_VOCABULARY_EXTRACTION',result:'OBSERVATION_ONLY'},sources:entry.report.sources??(entry.report.source?[entry.report.source]:[]),scope:'CLIENT_RULE_ONLY_NOT_DEPLOYED_GAMEPLAY',transferToLive:'NOT_PROVEN_FOR_LIVE'}));
 const lineage={schemaVersion:1,runId,recordedAt,environments:{[environmentId]:environment},backend:provenance,artifacts,staticAnalysis:context('AutoForge 2.3 preparation'),deployment:{status:'NOT_INSPECTED',commit:null,jarSha256:null},limitations:['A commit is recorded only when Git resolves it. Unversioned client assets remain identified by source hashes.','Numerical comparisons do not prove backend integration, admin persistence or deployed behavior.','Old-branch evidence cannot be transferred to the currently deployed artifact without matching commit/hashes, environment and a fresh test.']};
 writeFileSync(join(from,'evidence-lineage.json'),JSON.stringify(lineage,null,2)+'\n');
 writeFileSync(join(from,'EVIDENCE_LINEAGE.md'),'# Origem e validade das evidências\n\nCada observação está vinculada ao commit (quando resolvido), hashes, ambiente e teste/extrator. evidence-lineage.json liga cada relatório numérico pelo SHA256; as evidências estáticas levam evidenceContext.\n\nCódigo analisado, teste local e versão implantada são escopos distintos. A versão implantada não foi inspecionada. Um sucesso em branch antiga não comprova o JAR atual. Assets sem Git ficam com commit nulo e hashes explícitos, nunca com commit inventado.\n\nAvaliações de runtime precisam declarar ambiente, teste, commit e SHA256 do JAR implantado. A validação desses metadados não executa novamente nem certifica os artefatos externos citados.\n');
 return lineage;
}
