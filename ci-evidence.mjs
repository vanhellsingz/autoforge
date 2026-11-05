// Evidence transport only: never converts a failed test or missing report to success.
import {readFileSync,writeFileSync,mkdirSync,existsSync,appendFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const hash=b=>createHash('sha256').update(b).digest('hex');
const names=['unit-results.xml','unit-report.json'];
const LIMIT=8*1024*1024;
export function encodeEvidence(directory){
 const records=names.map(name=>{const bytes=readFileSync(join(directory,name));if(bytes.length>LIMIT)throw Error('Evidence exceeds size limit');return {name,bytes,sha256:hash(bytes)};});
 const lines=['AUTOFORGE_EVIDENCE_BEGIN'];
 for(const r of records){lines.push(`AUTOFORGE_FILE:${r.name}:${r.sha256}:${r.bytes.length}`);const b64=r.bytes.toString('base64');for(let i=0;i<b64.length;i+=160)lines.push(`AUTOFORGE_DATA:${b64.slice(i,i+160)}`);lines.push('AUTOFORGE_FILE_END');}
 lines.push('AUTOFORGE_EVIDENCE_END');return lines.join('\n');
}
export function recoverEvidence(log,directory){
 if(Buffer.byteLength(log)>LIMIT*4)throw Error('Log exceeds size limit');
 let begun=false,ended=false,current=null;const records=[];
 for(const line of log.split(/\r?\n/)){
  const marker=line.match(/AUTOFORGE_(EVIDENCE_BEGIN|EVIDENCE_END|FILE_END|FILE:.*|DATA:[A-Za-z0-9+/=]+)\s*$/)?.[0].trim();if(!marker)continue;
  if(marker==='AUTOFORGE_EVIDENCE_BEGIN'){if(begun||ended)throw Error('Repeated evidence bundle');begun=true;continue;}
  if(!begun||ended)throw Error('Evidence outside bundle');
  if(marker==='AUTOFORGE_EVIDENCE_END'){if(current)throw Error('Incomplete file');ended=true;continue;}
  if(marker.startsWith('AUTOFORGE_FILE:')){
   const m=/^AUTOFORGE_FILE:([^:]+):([a-f0-9]{64}):(\d+)$/.exec(marker);
   if(current||!m||!names.includes(m[1])||records.some(r=>r.name===m[1])||Number(m[3])>LIMIT)throw Error('Invalid evidence header');
   current={name:m[1],sha256:m[2],size:Number(m[3]),data:''};continue;
  }
  if(!current)throw Error('Evidence data without file');
  if(marker==='AUTOFORGE_FILE_END'){
   const bytes=Buffer.from(current.data,'base64');if(bytes.toString('base64')!==current.data||bytes.length!==current.size||hash(bytes)!==current.sha256)throw Error('Evidence hash/size mismatch');
   records.push({...current,bytes});current=null;
  }else{current.data+=marker.slice('AUTOFORGE_DATA:'.length);if(current.data.length>LIMIT*1.4)throw Error('Encoded evidence exceeds limit');}
 }
 if(!ended||current||records.length!==names.length)throw Error('Missing or truncated evidence bundle');
 // Verify everything and refuse existing files before creating output.
 for(const r of records)if(existsSync(join(directory,r.name)))throw Error(`Refusing to overwrite ${r.name}`);
 mkdirSync(directory,{recursive:true});for(const r of records)writeFileSync(join(directory,r.name),r.bytes,{flag:'wx'});
 return records.map(({name,sha256,size})=>({name,sha256,bytes:size}));
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){try{
 const [mode,source,out]=process.argv.slice(2);
 if(mode==='emit'&&source&&!out){console.log(encodeEvidence(source));if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,'\n## AutoForge evidence\n\nJUnit and JSON report are embedded losslessly in this step log, with SHA256. Recover with `ci-evidence.mjs recover LOG NEW_DIRECTORY`. This is tool validation, not gameplay/deployment proof. Artifact download is optional; test and generation steps remain mandatory.\n');}
 else if(mode==='recover'&&source&&out)console.log(JSON.stringify(recoverEvidence(readFileSync(source,'utf8'),out),null,2));
 else throw Error('Usage: ci-evidence.mjs emit DIRECTORY | recover LOG_FILE NEW_DIRECTORY');
}catch(e){console.error(e.message);process.exitCode=1;}}
