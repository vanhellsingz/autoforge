#!/usr/bin/env node
import {writeFileSync} from 'node:fs';import {join,resolve} from 'node:path';import {pathToFileURL} from 'node:url';
import {json,options,only,requireValue as must,output,save} from '../items/lib.mjs';
import {appendLearningEvent,readRegistry} from './registry.mjs';
import {buildAgentCapsule,capsuleMarkdown} from './transfer.mjs';
const HELP=`AutoForge learning — explicit review; no server changes
  record --registry NEW_OR_EXISTING_LEDGER --event EVENT.json --expected-version N [--evidence-root DIR]
  inspect --registry DIR --out NEW_DIR
  capsule --registry DIR --context CONTEXT.json --evidence-root DIR --out NEW_DIR
Actions: propose -> evaluate -> review -> approve -> promote. revise invalidates prior approval.
No automatic promotion, generated scripts, server access, SQL or deployment.`;
export function main(argv){
 const [cmd,...args]=argv;if(!cmd||cmd==='help'){console.log(HELP);return {status:'HELP'};}const o=options(args);
 if(cmd==='record'){
  only(o,['registry','event','expected-version','evidence-root']);const v=must(o,'expected-version');if(!/^(0|[1-9]\d*)$/.test(v))throw Error('Nonnegative expected-version required');
  const result=appendLearningEvent({registry:must(o,'registry'),event:json(must(o,'event')),expectedVersion:Number(v),evidenceRoot:o['evidence-root']});
  return {status:result.capability.status,version:result.version,head:result.head};
 }
 if(cmd==='inspect'){
  only(o,['registry','out']);const report=readRegistry(must(o,'registry')),out=output(must(o,'out'),[o.registry]);save(out,'registry.json',report);return {status:'READ_ONLY',version:report.version,capabilities:report.capabilities.length};
 }
 if(cmd==='capsule'){
  only(o,['registry','context','evidence-root','out']);const report=buildAgentCapsule({registry:must(o,'registry'),context:json(must(o,'context')),evidenceRoot:must(o,'evidence-root')});
  const out=output(must(o,'out'),[o.registry,o.context,o['evidence-root']]);save(out,'agent-capsule.json',report);writeFileSync(join(out,'PROMPT_AGENTE.md'),capsuleMarkdown(report),{flag:'wx'});return {status:report.status,matches:report.matches.length,blocked:report.blocked.length};
 }
 throw Error('Unknown learning command');
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){try{console.log(JSON.stringify(main(process.argv.slice(2))));}catch(e){console.error('AutoForge learning: '+e.message);process.exitCode=1;}}
