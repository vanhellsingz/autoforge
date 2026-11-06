// Client map/activity data and recorded-journey checks. Never drives the game or awards rewards.
import {readFileSync,readdirSync,lstatSync} from 'node:fs';
import {join} from 'node:path';import {createHash} from 'node:crypto';
import {readGameCatalogs,gamePath} from './catalogs.mjs';
import {itemId} from '../items/item-index.mjs';
const H=v=>createHash('sha256').update(typeof v==='string'||Buffer.isBuffer(v)?v:JSON.stringify(v)).digest('hex');
const FAMILY=/^t_s_(?:config|.*(?:map|campaign|arena|labyr|catac|city|monster|spawn|portal|dungeon|tower|trial|abyss|boss|land|battlefield|wild|hall|chaos|expedition|purgatory|maze|uiplay|activity|scene|multiplayer).*)$/i;
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v),copy=v=>JSON.parse(JSON.stringify(v));
const nonnegative=n=>Number.isSafeInteger(n)&&n>=0;
function rowId(row,keys=['Id','TemplateId','ID','CampaignId','PortalId','FloorId','MapId']){for(const key of keys){const id=itemId(row.fields[key]);if(id!==null)return id;}return null;}
const name=row=>['MapName_pt','CampaignName_pt','NodeName_pt','PortalName_pt','TemplateName_pt','MapName_en','CampaignName_en','NodeName_en','PortalName_en','MapName','NodeName','TemplateName'].map(k=>row.fields[k]).find(v=>typeof v==='string'&&v)||null;
function ids(value){if(Array.isArray(value))return value.every(x=>itemId(x)!==null)?value.map(itemId):null;if(itemId(value)!==null)return [itemId(value)];if(typeof value==='string'&&/^\s*-?\d+(?:\s*[,|;]\s*-?\d+)*\s*$/.test(value))return value.split(/[,|;]/).map(x=>itemId(x.trim()));if(value===''||value==null)return [];return null;}
function cycleSamples(edges,max=100){const adjacency=new Map();for(const e of edges.filter(e=>e.resolved)){if(!adjacency.has(e.from))adjacency.set(e.from,[]);adjacency.get(e.from).push(e.to);}const color=new Map(),cycles=[];for(const key of adjacency.keys()){if(color.has(key)||cycles.length>=max)continue;const stack=[{key,next:0}],positions=new Map([[key,0]]);color.set(key,1);while(stack.length&&cycles.length<max){const frame=stack.at(-1),next=adjacency.get(frame.key)??[];if(frame.next>=next.length){color.set(frame.key,2);positions.delete(frame.key);stack.pop();continue;}const to=next[frame.next++];if(color.get(to)===1){const sample=stack.slice(positions.get(to)).map(f=>f.key);cycles.push({nodes:[...sample.slice(0,99),to],truncated:sample.length>99});}else if(!color.has(to)){color.set(to,1);positions.set(to,stack.length);stack.push({key:to,next:0});}}}return {samples:cycles,limit:max,note:'Cycles can be intentional portals/repeatable areas; they are not automatically invalid.'};}
function codeCandidates(client){
 const dir=gamePath(join(client,'js'));let files;try{files=readdirSync(dir).filter(n=>/^bundle_release[^/.]*\.js$/i.test(n));}catch{return {status:'BUNDLE_NOT_AVAILABLE',sources:[],candidates:[]};}
 if(files.length!==1)return {status:'AMBIGUOUS_OR_MISSING_BUNDLE',sources:[],candidates:[]};
 const path='js/'+files[0],full=gamePath(join(client,path)),st=lstatSync(full);if(!st.isFile()||st.size>80*1024*1024)return {status:'BUNDLE_LIMIT',sources:[],candidates:[]};
 const bytes=readFileSync(full),text=bytes.toString('utf8'),sha256=H(bytes),candidates=[];
 for(const term of ['MoveToMapId','MoveToNodeId','MapType','CampaignType','t_s_mapnode','t_s_mapphysicposition','sendCampaign','C_C_CAMPAIGN','C_C_LEAVE','C_C_MAP']){let start=-1,count=0;while((start=text.indexOf(term,start+1))!==-1&&count++<3){const snippet=text.slice(Math.max(0,start-100),Math.min(text.length,start+term.length+180));candidates.push({term,path,sourceSha256:sha256,offset:Buffer.byteLength(text.slice(0,start)),spanSha256:H(snippet),snippet,meaning:'LEXICAL_CANDIDATE_NOT_DISPATCH_SEMANTICS'});}}
 return {status:'STATIC_CANDIDATES',sources:[{path,sha256,bytes:bytes.length}],candidates};
}
export function buildWorldAtlas({client,...bounds}={}){
 const catalog=readGameCatalogs({client,include:FAMILY,...bounds}),tableMap=new Map(catalog.tables.map(t=>[t.name,t]));
 const entities=new Map(),maps=[],campaigns=[],nodes=[],activityRows=[],unidentifiedRows=[];
 for(const table of catalog.tables){const kind=table.name==='t_s_map'?'map':table.name==='t_s_campaign'?'campaign':table.name==='t_s_campaigndata'?'node':table.name==='t_s_mapnode'?'mapnode':table.name==='t_s_mapphysicstemplate'?'physics':null;
  for(const row of table.rows){const id=rowId(row,kind==='campaign'?['CampaignId','Id']:undefined);if(id===null){unidentifiedRows.push({table:table.name,source:row.source});continue;}const entity={id,key:(kind??table.name)+':'+id,kind:kind??'activity-data',name:name(row),table:table.name,source:row.source,fields:row.fields,runtime:'UNVERIFIED'};
   if(entities.has(entity.key))throw Error('Ambiguous world identity: '+entity.key);entities.set(entity.key,entity);
   if(kind==='map')maps.push(entity);else if(kind==='campaign')campaigns.push(entity);else if(kind==='node'||kind==='mapnode')nodes.push(entity);else activityRows.push(entity);
  }
 }
 const references=[],unsupportedReferences=[];
 function ref(entity,field,prefix,{list=false}={}){if(!Object.hasOwn(entity.fields,field))return;const values=ids(entity.fields[field]);if(values===null){unsupportedReferences.push({from:entity.key,field,value:entity.fields[field],source:entity.source,status:'UNPARSED_NOT_GUESSED'});return;}for(const value of values){if(value==='0')continue;const to=prefix+':'+value;references.push({from:entity.key,to,field,resolved:entities.has(to),source:entity.source,meaning:'EXPLICIT_FIELD_REFERENCE_NOT_COMPLETE_GAME_RULE'});}}
 for(const entity of entities.values()){
  if(entity.kind==='map')ref(entity,'CampaignId','campaign');
  if(entity.kind==='campaign'){ref(entity,'PreCampaignId','campaign');ref(entity,'NextCampaignId','campaign');ref(entity,'MapIds','map',{list:true});}
  if(entity.kind==='node'){ref(entity,'CampaignId','campaign');ref(entity,'NextNodeIds','node',{list:true});ref(entity,'PreNodeIds','node',{list:true});ref(entity,'MoveToNodeIds','node',{list:true});}
  if(entity.kind==='mapnode'){ref(entity,'MapId','map');ref(entity,'MoveToMapId','map');ref(entity,'MoveToNodeId','mapnode');}
  if(entity.table==='t_s_mapphysicposition')ref(entity,'PhysicId','physics');
 }
 const requestedFamilies={campaign:/campaign/,arena:/arena|battlefield/,heroHall:/herohall|hero.*hall|dungeon/,labyrinth:/labyr|maze/,catacombs:/catac|abyss|purgatory/,outerCities:/mapphysic|mapboss|mapmine|outcity/,cloudCity:/skytrial|mapnode/};
 const facilities=Object.fromEntries(Object.entries(requestedFamilies).map(([key,re])=>{const tables=catalog.tables.filter(t=>re.test(t.name)).map(t=>t.name);return [key,{status:tables.length?'CATALOG_CANDIDATES_NOT_RUNTIME':'NOT_IDENTIFIED_BY_TABLE_NAME',tables,notes:key==='heroHall'?'A translated activity may exist under another type/dispatcher; absence by name never authorizes removal.':key==='cloudCity'?'Sky-trial data is not proof that the cloud-city scene is implemented.':null}];}));
 const mapTypes=Object.create(null);for(const m of maps){const value=JSON.stringify(m.fields.Types??null);if(!mapTypes[value])mapTypes[value]={rawType:m.fields.Types??null,mapIds:[],meaning:'CLIENT_TYPE_DISPATCH_REQUIRED'};mapTypes[value].mapIds.push(m.id);}
 const missingPrimaryCatalogs=['t_s_map'].filter(t=>!tableMap.has(t));
 return {schemaVersion:'autoforge.world-atlas.v1',client:catalog.client,sourceDigest:catalog.sourceDigest,sources:catalog.sources,tables:catalog.tables,maps,campaigns,nodes,activityRows,references,missingReferences:references.filter(r=>!r.resolved),unsupportedReferences,cycles:cycleSamples(references),mapTypes,code:codeCandidates(catalog.client),coverage:{...catalog.coverage,complete:catalog.coverage.complete&&missingPrimaryCatalogs.length===0,missingPrimaryCatalogs,maps:maps.length,campaigns:campaigns.length,nodes:nodes.length,activityRows:activityRows.length,unidentifiedRows,facilities},runtime:'UNVERIFIED',implementationChecklist:['Resolve map Types/MasterType/SonType in the actual client dispatcher; names alone are insufficient.','Bind entry requirements, costs, spawn/NPC allegiance and each portal/exit to explicit sources.','Distinguish intermediate-scene transition from final boss completion and return destination.','Keep defeat, duplicate requests and reconnect from completing nodes or duplicating rewards.','Prove C2S -> handler -> transaction -> S2C -> UI -> relogin for each activity family.'],limitations:['Selected catalog families preserve original records; unrelated geographical city tables may also match and are not automatically game scenes.','Property/Param fields, monster allegiance, rewards and map type semantics are not inferred.','Not discovering a family by name does not prove its absence; inspect raw map types and client candidates.']};
}

function fields(value,allowed,label){if(!object(value)||Object.keys(value).some(k=>!allowed.includes(k)||['__proto__','prototype','constructor'].includes(k)))throw Error('Invalid '+label);}
function resources(value){if(!object(value)||Object.keys(value).some(k=>!/^[A-Za-z][A-Za-z0-9_.-]{0,99}$/.test(k)||!nonnegative(value[k])))throw Error('Resource values must be nonnegative safe integers');return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b,'en')));}
function bindingContract(b,atlas){
 fields(b,['schemaVersion','id','fromMapId','toMapId','nodeId','nodeKind','kind','requireWin','minLevel','costs','rewardDeltas','responseOpcodes','evidence','reviewed'],'world binding');
 if(b.schemaVersion!==1||typeof b.id!=='string'||!/^[A-Za-z0-9_.:-]{1,120}$/.test(b.id)||!['entry','portal','exit','campaign-complete','battle','activity'].includes(b.kind)||itemId(b.fromMapId)===null||itemId(b.toMapId)===null)throw Error('Invalid world binding identity/maps');
 if(b.requireWin!==undefined&&typeof b.requireWin!=='boolean'||b.minLevel!==undefined&&!nonnegative(b.minLevel)||b.nodeId!==undefined&&itemId(b.nodeId)===null)throw Error('Invalid world requirements');
 if(b.nodeKind!==undefined&&!['node','mapnode'].includes(b.nodeKind))throw Error('Invalid explicit node kind');
 for(const key of ['costs','rewardDeltas']){if(!Array.isArray(b[key])||b[key].length>100)throw Error('Explicit costs/rewardDeltas arrays required');const seen=new Set();for(const c of b[key]){fields(c,['resource','amount'],key);if(!/^[A-Za-z][A-Za-z0-9_.-]{0,99}$/.test(c.resource)||!nonnegative(c.amount)||seen.has(c.resource))throw Error('Invalid/duplicate resource delta');seen.add(c.resource);}}
 if(!Array.isArray(b.responseOpcodes)||b.responseOpcodes.some(n=>!nonnegative(n)||n>0xffffffff)||b.responseOpcodes.length>100)throw Error('Invalid response opcodes');
 if(!Array.isArray(b.evidence)||!b.evidence.length||b.evidence.length>100)throw Error('Source evidence required');
 const sources=new Map(atlas.sources.map(s=>[s.path,s.sha256]));const matched=b.evidence.every(e=>object(e)&&typeof e.path==='string'&&/^[a-f0-9]{64}$/i.test(e.sha256??'')&&sources.get(e.path)===e.sha256);
 return {...b,fromMapId:itemId(b.fromMapId),toMapId:itemId(b.toMapId),nodeId:b.nodeId===undefined?null:itemId(b.nodeId),sourceMatched:matched};
}
export function validateWorldJourney({atlas,journey,bindings=[]}={}){
 if(atlas?.schemaVersion!=='autoforge.world-atlas.v1'||!Array.isArray(atlas.maps)||!Array.isArray(atlas.sources)||!object(journey)||!Array.isArray(journey.steps)||journey.steps.length>10000||!Array.isArray(bindings)||bindings.length>10000)throw Error('Invalid world atlas/journey');
 const maps=new Map(atlas.maps.map(m=>[m.id,m]));
 const contracts=new Map();for(const b of bindings){const c=bindingContract(b,atlas);if(contracts.has(c.id))throw Error('Duplicate world binding');contracts.set(c.id,c);}
 const checks=[],operations=new Set();const add=(step,id,result,detail)=>checks.push({step,id,result,detail});
 const identity=journey.identity??{};const stamped=/^[a-f0-9]{40,64}$/i.test(identity.commit??'')&&object(identity.environment)&&typeof identity.environment.name==='string'&&typeof identity.environment.kind==='string'&&typeof identity.testId==='string'&&identity.testId.length>0;
 if(!stamped)add(null,'identity','UNVERIFIED','Commit/environment/test identity missing.');
 if(!atlas.coverage?.complete||atlas.coverage?.truncated)add(null,'atlas-coverage','UNVERIFIED','Incomplete catalog scope.');
 if(!journey.steps.length)add(null,'journey','UNVERIFIED','No observed steps supplied.');
 for(let i=0;i<journey.steps.length;i++){
  const s=journey.steps[i],b=contracts.get(s?.bindingId);if(!b){add(i,'binding','UNVERIFIED','No reviewed transition contract.');continue;}
  if(!b.sourceMatched||b.reviewed!==true){add(i,'binding-evidence','UNVERIFIED','Catalog hashes/review do not support the declared contract.');continue;}
  const before=s.before??{},after=s.after??{},from=itemId(before.mapId),to=itemId(after.mapId);
  if(!maps.has(from)||!maps.has(to)||!maps.has(b.fromMapId)||!maps.has(b.toMapId)){add(i,'map-reference','FAIL','Unknown observed or contracted map.');continue;}
  add(i,'entry-map',from===b.fromMapId?'PASS':'FAIL','Observed source must equal contracted source.');
  const lost=s.outcome==='lose',win=s.outcome==='win';if(b.requireWin&&s.outcome!=='win'&&!lost)add(i,'battle-outcome','UNVERIFIED','Confirmed outcome missing.');
  if(!lost){if(b.requireWin&&!win)add(i,'destination','UNVERIFIED','Victory is not confirmed, so final destination cannot be presumed.');else add(i,'destination',to===b.toMapId?'PASS':'FAIL',b.kind==='portal'?'Intermediate portal must reach its exact scene, not a presumed city.':'Destination must match the explicit contract.');}
  if(b.nodeId){const candidates=(atlas.nodes??[]).filter(n=>n.id===b.nodeId&&(!b.nodeKind||n.kind===b.nodeKind)),node=candidates.length===1?candidates[0]:null;if(!candidates.length)add(i,'node-reference','FAIL','Transition node not in atlas.');else if(candidates.length>1)add(i,'node-reference','UNVERIFIED','Numeric ID occurs in multiple node namespaces; explicit nodeKind required.');else if(node.kind==='mapnode'&&itemId(node.fields.MoveToMapId)!=='0'&&itemId(node.fields.MoveToMapId)!==null)add(i,'catalog-portal-target',itemId(node.fields.MoveToMapId)===b.toMapId?'PASS':'FAIL','Declared portal destination conflicts with explicit client field.');
   const a=Array.isArray(after.completedNodeIds)?after.completedNodeIds.map(itemId):null,z=Array.isArray(before.completedNodeIds)?before.completedNodeIds.map(itemId):null;
   if(lost){if(!a||!z)add(i,'defeat-completion','UNVERIFIED','Before/after completion sets missing.');else add(i,'defeat-completion',!a.includes(b.nodeId)||z.includes(b.nodeId)?'PASS':'FAIL','Defeat cannot newly mark this node completed.');}
   if(win&&b.kind==='campaign-complete'){if(!a)add(i,'victory-completion','UNVERIFIED','Completion snapshot missing.');else add(i,'victory-completion',a.includes(b.nodeId)?'PASS':'FAIL','Confirmed final victory must persist completion.');}
  }
  if(b.minLevel!==undefined)add(i,'level-requirement',nonnegative(before.level)?before.level>=b.minLevel?'PASS':'FAIL':'UNVERIFIED','Validate actual entry grade.');
  const catalogMinimum=maps.get(from).fields?.MinLevel;if(nonnegative(catalogMinimum)&&catalogMinimum>0)add(i,'catalog-minimum-level',nonnegative(before.level)?before.level>=catalogMinimum?'PASS':'FAIL':'UNVERIFIED','Explicit MinLevel must not be weakened by a reviewed contract.');
  const op=typeof s.operationId==='string'&&s.operationId?s.operationId:null,replay=op?operations.has(b.id+'\0'+op):false;if(op)operations.add(b.id+'\0'+op);else add(i,'operation-id','UNVERIFIED','Stable operation ID needed to inspect duplicate rewards.');
  for(const [kind,rows] of [['cost',b.costs],['reward',b.rewardDeltas]])for(const delta of rows){
   try{const a=resources(kind==='cost'?before.resources:before.rewards),z=resources(kind==='cost'?after.resources:after.rewards);const expected=replay?0:kind==='reward'&&lost?0:delta.amount;
    if(b.requireWin&&!win&&!lost&&kind==='reward'){add(i,kind+'.'+delta.resource,'UNVERIFIED','No confirmed battle outcome.');continue;}
    if(a[delta.resource]===undefined||z[delta.resource]===undefined)throw Error('Missing projection');const observed=kind==='cost'?a[delta.resource]-z[delta.resource]:z[delta.resource]-a[delta.resource];add(i,kind+'.'+delta.resource,observed===expected?'PASS':'FAIL',replay?'Repeated operation must not debit or reward again.':lost&&kind==='reward'?'Defeat must not grant victory rewards.':'Recorded delta must equal the reviewed contract.');
   }catch{add(i,kind+'.'+delta.resource,'UNVERIFIED','Complete valid before/after resource projections needed.');}
  }
  if(!b.responseOpcodes.length)add(i,'response-contract','UNVERIFIED','No reviewed S2C contract.');else add(i,'responses',Array.isArray(s.responses)?b.responseOpcodes.every(op=>s.responses.includes(op))?'PASS':'FAIL':'UNVERIFIED','All declared responses must be observed.');
  add(i,'ui',s.ui&&s.ui.loadingFinished===true&&itemId(s.ui.mapId)!==null?itemId(s.ui.mapId)===to?'PASS':'FAIL':'UNVERIFIED','The intended scene must finish loading in the client.');
  add(i,'persistence',s.persistence?.relogin===true&&itemId(s.persistence.mapId)!==null?itemId(s.persistence.mapId)===to?'PASS':'FAIL':'UNVERIFIED','Relogin must read back the recorded destination.');
  if(s.persistence?.resources&&after.resources){try{add(i,'resource-persistence',H(resources(s.persistence.resources))===H(resources(after.resources))?'PASS':'FAIL','Authoritative resources must survive relogin.');}catch{add(i,'resource-persistence','UNVERIFIED','Invalid resource readback.');}}
  add(i,'trace',/^[a-f0-9]{64}$/i.test(s.trace?.sha256??'')?'PASS':'UNVERIFIED','A recorded trace hash is an integrity reference, not independent runtime attestation.');
 }
 if(journey.projection){const p=validateWorldProjection({atlas,projection:journey.projection});checks.push(...p.checks.map(c=>({step:null,...c})));}
 return {schemaVersion:'autoforge.world-journey.v1',sourceDigest:atlas.sourceDigest,identity:copy(identity),status:checks.some(c=>c.result==='FAIL')?'FAIL':checks.some(c=>c.result==='UNVERIFIED')?'UNVERIFIED':'PASS_RECORDED',checks,scope:'RECORDED_VALUES_AND_REVIEWED_CONTRACTS_ONLY',runtimeAttested:false,mutationsPerformed:false};
}

/** Diagnose recorded authoritative/UI projections without inventing completion history. */
export function validateWorldProjection({atlas,projection}={}){
 if(atlas?.schemaVersion!=='autoforge.world-atlas.v1'||!object(projection))throw Error('Invalid world projection');
 const checks=[],add=(id,result,detail)=>checks.push({id,result,detail}),campaigns=new Set((atlas.campaigns??[]).map(c=>c.id));
 function completeIds(value){if(!Array.isArray(value)||value.length>100000||value.some(v=>itemId(v)===null))return null;return new Set(value.map(itemId));}
 const actual=completeIds(projection.authoritative?.completedCampaignIds),ui=completeIds(projection.ui?.completedCampaignIds);
 if(!actual||!ui)add('completion-projection','UNVERIFIED','Both authoritative and UI completion sets are required.');
 else{
  const unknown=[...actual,...ui].filter(id=>!campaigns.has(id));if(unknown.length)add('completion-ids','UNVERIFIED','Projection contains campaign IDs outside this atlas.');
  const extra=[...ui].filter(id=>!actual.has(id)),missing=[...actual].filter(id=>!ui.has(id));
  add('completion-projection',extra.length||missing.length?'FAIL':'PASS',{uiOnly:extra,authoritativeOnly:missing});
  const wins=Array.isArray(projection.history?.verifiedWins)?projection.history.verifiedWins:[];
  for(const id of actual){const observed=wins.some(w=>itemId(w.campaignId)===id&&/^[a-f0-9]{64}$/i.test(w.artifactSha256??''));add('completion-history.'+id,observed?'PASS':'UNVERIFIED',observed?'Recorded win artifact reference exists; execution is not independently attested.':'Completed flag has no recorded win evidence in the supplied history; do not fabricate a battle or erase progress.');}
 }
 let firstMissingBoundary=null;const entry=projection.entry;
 if(entry){
  if(!campaigns.has(itemId(entry.campaignId)))add('entry-campaign','UNVERIFIED','Entry campaign is unknown to the current catalog.');
  for(const [field,boundary] of [['requestObserved','entry.request'],['responseObserved','entry.response'],['sceneLoaded','entry.scene-load']]){
   if(entry[field]!==true){firstMissingBoundary??=boundary;add(boundary,field==='sceneLoaded'&&entry.loadingTimeout===true?'FAIL':'UNVERIFIED','First missing observed boundary; HTTP 200 or an attempt counter does not prove scene entry.');break;}
   add(boundary,'PASS','Boundary explicitly recorded.');
  }
 }
 return {schemaVersion:'autoforge.world-projection.v1',status:checks.some(c=>c.result==='FAIL')?'FAIL':checks.some(c=>c.result==='UNVERIFIED')||!checks.length?'UNVERIFIED':'PASS_RECORDED',checks,firstMissingBoundary,attemptCountsUsedAsCompletion:false,runtimeAttested:false};
}
