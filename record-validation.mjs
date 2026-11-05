import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname,basename} from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseJUnit} from './test-artifacts.mjs';
export function recordValidation({junit,out,commit,environment='local',testId='autoforge-unit-tests'}) {
 const bytes=readFileSync(junit),counts=parseJUnit(bytes.toString('utf8'));
 if(!/^[a-f0-9]{40,64}$/i.test(commit??''))throw Error('Exact producer commit required; use GITHUB_SHA in CI');
 const report={schemaVersion:1,commit,testId,environment:{name:environment,kind:'TOOL_TESTS'},result:'passed',checks:[{id:'junit-positive-tests-zero-failures',result:'passed'}],counts,sourceJUnit:{path:basename(junit),sha256:createHash('sha256').update(bytes).digest('hex')},scope:'AUTOFORGE_TOOL_ONLY_NOT_GAMEPLAY',run:process.env.GITHUB_RUN_ID?{id:process.env.GITHUB_RUN_ID,url:`https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`}:{status:'LOCAL'},recordedAt:new Date().toISOString()};
 writeFileSync(out,JSON.stringify(report,null,2)+'\n');return report;
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){try{const o={commit:process.env.GITHUB_SHA};for(let i=2;i<process.argv.length;i++){const flag=process.argv[i];if(!['--junit','--out','--commit','--environment'].includes(flag)||!process.argv[i+1])throw Error('Usage: record-validation.mjs --junit FILE --out FILE --commit SHA [--environment NAME]');o[flag.slice(2)]=process.argv[++i];}if(!o.junit||!o.out)throw Error('junit and out required');const r=recordValidation(o);console.log(JSON.stringify({result:r.result,counts:r.counts,scope:r.scope}));}catch(e){console.error(e.message);process.exitCode=1;}}
