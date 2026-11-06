#!/usr/bin/env node
// AutoForge Next: extends Studio 2.5 without modifying the Wartune client/backend.
import {readFileSync,writeFileSync,mkdirSync,existsSync,lstatSync} from 'node:fs';
import {resolve,join,dirname,parse,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {main as studioMain} from '../autoforge.mjs';
import {readCapture} from '../flight-recorder.mjs';
import {snapshotClient,diffSnapshots,diffDiscovery,impactedArtifacts} from './drift.mjs';
import {scanBackend,buildGapMatrix,renderGapMarkdown} from './gaps.mjs';
import {inferFrameLayout} from './frame-layout.mjs';
import {compareRates} from './statistics.mjs';
import {makeEvidencePack,verifyEvidencePack,unpackEvidencePack,evidenceAsText,evidenceFromText} from './evidence-pack.mjs';

const HELP=['AutoForge Studio Next (Node 22+)','',
  'Existing Studio commands: record, diagnose, generate, compare, audit, replay, bridge, import, bundle',
  'New, read-only/safe output commands:',
  '  drift snapshot --client CLIENT_DIR --out NEW_SNAPSHOT.json',
  '  drift diff --old OLD.json --new NEW.json [--contracts-dir DIR] [--evidence FILE] --out NEW_DIR',
  '  gaps --discovery discovery.json --backend JAVA_DIR [--capture STUDIO_CAPTURE_DIR] [--match REGEX] --out NEW_DIR',
  '  calibrate --headers SAMPLES.json --discovery discovery.json --out NEW_DIR',
  '  stats --input statistical-scenario.json --out NEW_DIR',
  '  pack --root REVIEWED_DIR --files a.json,b.md --out NEW_FILE.afpack',
  '  pack-verify --file FILE.afpack',
  '  pack-unpack --file FILE.afpack --out NEW_DIR',
  '  pack-text --file FILE.afpack --out NEW_FILE.txt',
  '  pack-recover --file TEXT_LOG.txt --out NEW_FILE.afpack','',
  'No action executes SQL, deploys, restarts services or patches the client.',
  'All output paths must be new; ambiguous/unsupported evidence stays UNVERIFIED.'].join('\n');

function parseOptions(argv) {
  const opts={},pos=[];
  for(let i=0;i<argv.length;i++){
    const a=argv[i];
    if(!a.startsWith('--')){pos.push(a);continue;}
    const [k,inline]=a.slice(2).split('=',2);
    if(!/^[a-z][a-z0-9-]*$/i.test(k))throw Error('Invalid argument '+k);
    const val=inline??(argv[i+1]&&!argv[i+1].startsWith('--')?argv[++i]:true);
    if(k==='evidence'){opts[k]=[...(opts[k]??[]),val];}
    else {if(k in opts)throw Error('Duplicate argument '+k);opts[k]=val;}
  }
  return {opts,pos};
}
function must(o,key){if(typeof o[key]!=='string'||!o[key])throw Error('Missing --'+key);return o[key];}
function checkNoLinks(p) {
  let at=parse(resolve(p)).root;
  for(const part of resolve(p).slice(at.length).split(sep).filter(Boolean)){
    at=join(at,part);
    if(existsSync(at)&&lstatSync(at).isSymbolicLink())throw Error('Linked paths refused');
  }
}
function file(p){
  checkNoLinks(p);
  const st=lstatSync(resolve(p));
  if(!st.isFile()||st.size>16*1024*1024)throw Error('Input file is missing or oversized');
  return readFileSync(resolve(p));
}
function json(p){return JSON.parse(file(p).toString('utf8').replace(/^\uFEFF/,''));}
function newDir(o,protectedRoots=[]){
  const dest=resolve(o);checkNoLinks(dest);
  if(existsSync(dest))throw Error('Output directory must not exist');
  for(const src of protectedRoots){
    if(!src)continue;
    const base=resolve(src);if(dest===base||dest.startsWith(base+sep))throw Error('Output cannot be inside a protected source tree');
  }
  mkdirSync(dest,{recursive:true});return dest;
}
function newFile(p,contents,protectedRoots=[]){
  const dest=resolve(p);checkNoLinks(dest);
  for(const src of protectedRoots){if(!src)continue;const base=resolve(src);if(dest===base||dest.startsWith(base+sep))throw Error('Output cannot touch source input');}
  if(existsSync(dest))throw Error('Output file already exists');
  mkdirSync(dirname(dest),{recursive:true});
  writeFileSync(dest,contents,{flag:'wx'});
  return dest;
}
function save(dir,name,value){writeFileSync(join(dir,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});}
function discoveryOpcodes(d){return new Set((d.opcodes??[]).map(x=>x.opcode).filter(x=>Number.isSafeInteger(x)&&x>=0));}
export async function main(argv){
  if(!argv.length||argv[0]==='help'||argv.includes('--help')){console.log(HELP);return {status:'HELP'};}
  const [command,...rest]=argv;
  if(['record','diagnose','generate','compare','audit','replay','bridge','import','bundle'].includes(command))return studioMain(argv);
  const {opts,pos}=parseOptions(rest);
  let result;
  switch(command){
    case 'drift':{
      const sub=pos[0];
      if(sub==='snapshot'){
        const client=must(opts,'client'),snapshot=await snapshotClient(client);
        newFile(must(opts,'out'),JSON.stringify(snapshot,null,2)+'\n',[client]);
        return {status:'SNAPSHOT_RECORDED',rootHash:snapshot.rootHash,files:snapshot.files.length};
      }
      if(sub!=='diff')throw Error('drift requires snapshot or diff');
      const old=json(must(opts,'old')),newer=json(must(opts,'new'));
      result=(old.schemaVersion==='autoforge.client-snapshot.v3')?diffSnapshots(old,newer):diffDiscovery(old,newer);
      if(result.changes){
        result.impacted=await impactedArtifacts(result,{contractsDir:opts['contracts-dir'],evidenceFiles:opts.evidence??[]});
      }
      const dir=newDir(must(opts,'out'),[opts['contracts-dir']]);
      save(dir,'drift-report.json',result);
      if(opts['fail-on-breaking']&&result.summary?.breaking)process.exitCode=2;
      return result;
    }
    case 'gaps':{
      const discovery=json(must(opts,'discovery')),backend=await scanBackend(must(opts,'backend'));
      const events=opts.capture?readCapture(opts.capture).events:[];
      const result=buildGapMatrix({discovery,backend,events,match:opts.match??null});
      const out=newDir(must(opts,'out'),[opts.backend,opts.capture].filter(Boolean));
      save(out,'gap-matrix.json',result);
      writeFileSync(join(out,'GAPS.md'),renderGapMarkdown(result),{flag:'wx'});
      return result.summary;
    }
    case 'calibrate':{
      const headers=json(must(opts,'headers'));
      if(!Array.isArray(headers)||headers.length>50000)throw Error('Expected bounded header samples array');
      const frames=[],lengths=[];
      for(const item of headers) {
        if(typeof item.head!=='string'||!/^(?:[a-f0-9]{2}){2,4096}$/i.test(item.head)||!Number.isSafeInteger(item.bytes)||item.bytes<item.head.length/2)
          throw Error('Invalid reviewed header sample');
        frames.push(Buffer.from(item.head,'hex'));lengths.push(item.bytes);
      }
      result=inferFrameLayout(frames,discoveryOpcodes(json(must(opts,'discovery'))),{lengths});
      const dir=newDir(must(opts,'out'));save(dir,'frame-calibration.json',result);return result;
    }
    case 'stats':{
      const s=json(must(opts,'input'));
      result=compareRates(s.reference,s.candidate,{minN:s.minN??200});
      const dir=newDir(must(opts,'out'));save(dir,'statistics.json',result);return result;
    }
    case 'pack':{
      const root=must(opts,'root'),files=must(opts,'files').split(',');
      result=makeEvidencePack({root,files});
      newFile(must(opts,'out'),result.buffer,[root]);
      return {status:'PACKED_INTEGRITY_ONLY',files:result.manifest,sha256:result.sha256};
    }
    case 'pack-verify':{
      const r=verifyEvidencePack(file(must(opts,'file')));
      return {status:r.integrity,execution:r.execution,files:r.files,sha256:r.sha256};
    }
    case 'pack-unpack':return unpackEvidencePack(file(must(opts,'file')),must(opts,'out'));
    case 'pack-text':{
      const bytes=file(must(opts,'file'));
      newFile(must(opts,'out'),evidenceAsText(bytes),[opts.file]);
      return {status:'TEXT_PARTS_PREPARED'};
    }
    case 'pack-recover':{
      const bytes=evidenceFromText(file(must(opts,'file')).toString('utf8'));
      newFile(must(opts,'out'),bytes,[opts.file]);
      return {status:'PACK_RECOVERED_AND_VERIFIED'};
    }
    default:throw Error('Unknown command '+command);
  }
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  try {const result=await main(process.argv.slice(2));if(result.status!=='HELP')console.log(JSON.stringify(result,null,2));}
  catch(error){console.error('AutoForge Next: '+error.message);process.exitCode=1;}
}
