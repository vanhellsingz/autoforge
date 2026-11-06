// Observed log symptoms and explicit identifiers are evidence, not proof of a game mutation.
import {createHash} from 'node:crypto';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const integer=v=>Number.isSafeInteger(v)&&v>=0;
const id=v=>(typeof v==='string'||Number.isSafeInteger(v))?String(v):null;
function itemId(v){const s=id(v);return s&&/^-?\d{1,16}$/.test(s)&&Number.isSafeInteger(Number(s))?String(Number(s)):null;}
function source(e){const s=e.source??{};return {generation:s.generation??null,offset:s.offset??null,endOffset:s.endOffset??null,lineSha256:s.lineSha256??null};}
function completeSource(e){const s=e.source;return object(s)&&integer(s.generation)&&integer(s.offset)&&integer(s.endOffset)&&s.endOffset>s.offset&&/^[a-f0-9]{64}$/i.test(s.lineSha256??'');}
export function buildIncidents({events,index=null,identity={},context=null,responseContracts=[],continuity=false,windowEnd=null,maxIncidents=500}={}){
 if(!Array.isArray(events)||events.length>100000||events.some(e=>!object(e)))throw Error('Expected bounded normalized log events');
 if(!Number.isSafeInteger(maxIncidents)||maxIncidents<1||maxIncidents>5000)throw Error('Invalid incident limit');
 if(!Array.isArray(responseContracts)||responseContracts.length>1000)throw Error('Invalid response contracts');
 const contracts=new Map();for(const c of responseContracts){if(!object(c)||!integer(c.requestOpcode)||contracts.has(c.requestOpcode)||!Array.isArray(c.responseOpcodes)||!c.responseOpcodes.length||c.responseOpcodes.some(n=>!integer(n))||!Number.isSafeInteger(c.windowMs)||c.windowMs<1||c.windowMs>300000)throw Error('Explicit unique request/response opcodes and window required');contracts.set(c.requestOpcode,c);}
 if(index&&(index.schemaVersion!=='autoforge.items-index.v1'||!Array.isArray(index.items)))throw Error('Invalid item index');
 const items=new Map((index?.items??[]).map(i=>[id(i.id),i]));if(index&&items.size!==index.items.length)throw Error('Ambiguous item index');
 const groups=new Map(),requests=new Map();let suppressed=0;
 const end=windowEnd?Date.parse(windowEnd):NaN;
 const staleContext=!!(context?.commit&&identity.commit&&context.commit!==identity.commit);
 const methods=staleContext?[]:(context?.domains??[]).flatMap(d=>(d.methods??[]).map(m=>({...m,domain:d.id})));
 function add(code,severity,e,detail,proof='OBSERVED_LOG_SYMPTOM'){
  const templateId=itemId(e.templateId),key=hash([code,e.sessionId??null,e.requestId??null,e.opcode??null,templateId,e.errorClass??null]);
  if(!groups.has(key)){
   if(groups.size>=maxIncidents){suppressed++;return;}
   const item=templateId?items.get(templateId):null;
   const matches=methods.filter(m=>e.handler&&m.method===e.handler||(m.opcodes??[]).some(o=>o.value===e.opcode&&e.opcode!==undefined));
   groups.set(key,{id:key.slice(0,20),code,severity,proof,detail,count:0,firstTimestamp:e.timestamp??null,lastTimestamp:e.timestamp??null,sessionId:id(e.sessionId),requestId:id(e.requestId),opcode:integer(e.opcode)?e.opcode:null,templateId,item:item?{id:item.id,name:item.name,source:item.source,status:'CATALOG_REFERENCE_ONLY'}:null,itemResolution:templateId?(item?'FOUND':'NOT_IN_INDEX'):e.itemId!==undefined?'INSTANCE_ID_IS_NOT_A_TEMPLATE':'TEMPLATE_NOT_RECORDED',sourceReferences:[],sourceProof:'UNVERIFIED',candidates:matches.slice(0,20).map(m=>({path:m.path,method:m.method,startLine:m.startLine,sha256:m.sha256,relation:'STATIC_CANDIDATE_NOT_RUNTIME_PROOF'}))});
  }
  const g=groups.get(key);g.count++;g.lastTimestamp=e.timestamp??g.lastTimestamp;if(g.sourceReferences.length<20)g.sourceReferences.push(source(e));
  if(completeSource(e)&&g.count===1)g.sourceProof='HASHED_LINE_AND_BYTE_OFFSETS';else if(!completeSource(e))g.sourceProof='UNVERIFIED';
 }
 for(const e of events){
  const name=String(e.event??e.data?.event??''),direction=e.direction??(name==='c2s_frame'?'C2S':name==='s2c_frame'?'S2C':null);
  if(/(?:opcode_ignored|unknown_opcode|unsupported_opcode)/i.test(name))add('OPCODE_NOT_HANDLED','WARN',e,'Opcode was reported ignored; presence does not prove a missing handler.');
  if(/(?:item.*(?:rejected|failed|unsupported)|bag.*(?:rejected|failed)|forge.*(?:rejected|failed))/.test(name))add('ITEM_OPERATION_REJECTED','WARN',e,'Read the explicit rejection and contract before changing item behavior.');
  if(e.level==='ERROR'||e.errorClass)add('SERVER_ERROR','ERROR',e,'Server reported an error; raw log text was intentionally not retained.');
  if((typeof e.quantity==='number'&&e.quantity<0)||(typeof e.gold==='number'&&e.gold<0))add('NEGATIVE_RESOURCE_REPORTED','ERROR',e,'A negative quantity/balance was reported; verify authoritative DB state separately.');
  if(!id(e.sessionId)||!id(e.requestId)||!integer(e.opcode)||!Number.isFinite(Date.parse(e.timestamp??'')))continue;
  const key=JSON.stringify([e.sessionId,e.requestId]);
  if(direction==='C2S'&&contracts.has(e.opcode)){if(!requests.has(key))requests.set(key,{event:e,contract:contracts.get(e.opcode),responses:[]});}
  if(direction==='S2C'&&requests.has(key))requests.get(key).responses.push(e);
 }
 for(const {event,contract,responses} of requests.values()){
  const start=Date.parse(event.timestamp),deadline=start+contract.windowMs;
  const observed=responses.some(e=>contract.responseOpcodes.includes(e.opcode)&&Date.parse(e.timestamp)>=start&&Date.parse(e.timestamp)<=deadline);
  if(observed)continue;
  const complete=continuity===true&&Number.isFinite(end)&&end>=deadline;
  add(complete?'EXPECTED_RESPONSE_NOT_OBSERVED':'RESPONSE_EVIDENCE_INCOMPLETE',complete?'WARN':'INFO',event,complete?'No declared S2C was observed within the explicit complete capture window.':'Missing continuity, time window or response evidence; do not classify the handler as broken.',complete?'OBSERVED_ABSENCE_WITHIN_DECLARED_WINDOW':'UNVERIFIED');
 }
 const incidents=[...groups.values()];
 return {schemaVersion:'autoforge.item-log-incidents.v1',identity:{commit:identity.commit??null,environment:identity.environment??null,testId:identity.testId??null,jarSha256:identity.jarSha256??null},input:{eventCount:events.length,eventsSha256:hash(events),itemSourceDigest:index?.sourceDigest??null,continuity:continuity===true,windowEnd},status:incidents.length?'INVESTIGATION_READY':'NO_MATCHED_SYMPTOMS',incidents,suppressed,contextStatus:staleContext?'MISMATCH_CANDIDATES_BLOCKED':context?.commit&&identity.commit?'DECLARED_COMMIT_MATCH':'UNVERIFIED',claims:{gameplayVerified:false,absenceOfBugsProven:false,mutationsPerformed:false},next:['Check the exact backend commit and source hashes.','Read the first recorded failure before changing later UI paths.','Use item dossier + reviewed contract + invariant/equivalence tests.','Missing evidence never authorizes removing an existing feature.']};
}
export function renderIncidents(report){const safe=s=>String(s??'—').replace(/[|<>\r\n]/g,' ');return '# Incidentes observados nos logs\n\nEstado: '+safe(report.status)+'. Gameplay: UNVERIFIED.\n\n| Sintoma | Nivel | Quantidade | Opcode | Item |\n|---|---|---|---|---|\n'+report.incidents.map(i=>`| ${safe(i.code)} | ${safe(i.severity)} | ${i.count} | ${safe(i.opcode)} | ${safe(i.item?.name??i.templateId)} |`).join('\n')+'\n\nNao confundir itemId de instancia com templateId do catalogo. Consulte o JSON para offsets, hashes, contratos e limites.\n';}
