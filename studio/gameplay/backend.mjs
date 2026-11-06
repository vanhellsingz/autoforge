import {readFileSync} from 'node:fs';import {join} from 'node:path';import {createHash} from 'node:crypto';
import {captureBackendSnapshot,assertBackendSnapshot} from '../../backend-guard.mjs';
import {backendProvenance} from '../../backend-provenance.mjs';import {extractJavaMethods} from '../../integration-contracts.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const TERMS={quests:/quest|mission|condiction|condition|tutorial|intensif|strengthen|enchant|evol|transfer|rebirth/i,world:/campaign|dungeon|arena|maze|labyrinth|catacomb|herohall|outercity|outcity|skycity|teleport|mapnode|scene|room|portal|blitz|sweep/i,shops:/shop|mall|store|purchase|buyitem|buygoods|exchange|wish|currency|balance|debit|wallet/i,battle:/battle|rage|anger|fury|army|pawn|formation|soldier|blitz|sweep|chest|drop/i};
/** Static navigation only. The snapshot records critical files and is never applied. */
export function scanGameplayBackend({backend,maxFiles=2000,maxFileBytes=4*1024*1024,maxMethods=120}={}){
 for(const n of [maxFiles,maxFileBytes,maxMethods])if(!Number.isSafeInteger(n)||n<1)throw Error('Invalid backend scan bound');
 const snapshot=captureBackendSnapshot(backend),provenance=backendProvenance(backend);
 const java=snapshot.files.filter(f=>f.path.endsWith('.java'));
 const domains=Object.fromEntries(Object.keys(TERMS).map(k=>[k,{methods:[],totalMatches:0,truncated:false}]));const skipped=[];
 for(const source of java.slice(0,maxFiles)){
  const bytes=readFileSync(join(backend,source.path));if(bytes.length>maxFileBytes){skipped.push({path:source.path,reason:'BYTE_LIMIT'});continue;}
  if(hash(bytes)!==source.sha256)throw Error('Backend changed during gameplay scan');const text=bytes.toString('utf8');
  if(/\\u+[a-f0-9]{4}/i.test(text)){skipped.push({path:source.path,reason:'UNICODE_ESCAPES_REQUIRE_JAVA_PARSER'});continue;}
  for(const m of extractJavaMethods(text))for(const [domain,pattern] of Object.entries(TERMS)){
   if(!pattern.test(source.path+' '+m.method+' '+text.slice(m.bodyStart,m.end)))continue;
   const group=domains[domain];group.totalMatches++;
   if(group.methods.length>=maxMethods){group.truncated=true;continue;}
   group.methods.push({path:source.path,sha256:source.sha256,method:m.method,signature:m.signature,startLine:m.startLine,endLine:m.endLine,bodySha256:m.bodySha256,relation:'LEXICAL_INTEGRATION_CANDIDATE',runtime:'UNVERIFIED'});
  }
 }
 assertBackendSnapshot(backend,snapshot);
 return {schemaVersion:'autoforge.gameplay-backend.v1',provenance,domains,migrations:snapshot.files.filter(f=>f.path.endsWith('.sql')).map(f=>({path:f.path,sha256:f.sha256})),snapshot,coverage:{files:java.length,scanned:Math.min(java.length,maxFiles),skipped,truncated:java.length>maxFiles||skipped.length>0},limits:{maxFiles,maxFileBytes,maxMethods},claims:{runtimeVerified:false,queriesExecuted:false,mutationsPerformed:false},preserve:['Existing transactions, session ownership, catalog repositories and codecs.','Quest progress and reward idempotency; do not derive completion from level/attempt count alone.','Campaign state, room lists, costs, win/loss and exit transitions remain distinct.','Shop costs, inventory grants and stock/limits must commit atomically.']};
}
