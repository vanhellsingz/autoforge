// Data-only coverage/scenario planner. Never grants items, runs actions or writes SQL.
import {createHash} from 'node:crypto';
const HASH=/^[a-f0-9]{64}$/i;
const OPERATIONS=new Set(['equip','unequip','use','open','sell','forge']);
const DOMAINS=new Set(['inventory','currencies','attributes']);
const KEY=/^[A-Za-z0-9_.:-]{1,100}$/;
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const copy=v=>JSON.parse(JSON.stringify(v));
function fields(v,allowed,label){if(!object(v)||Object.keys(v).some(k=>!allowed.includes(k)))throw Error('Invalid/unsupported '+label+' field');}
function itemId(value){if(typeof value==='number'&&!Number.isSafeInteger(value))throw Error('Unsafe item identifier');const s=String(value);if(!/^-?\d{1,32}$/.test(s))throw Error('Unsafe item identifier');return BigInt(s).toString();}
function relativeSource(path){return typeof path==='string'&&path.length>0&&path.length<=500&&!path.includes('\\')&&!path.includes(':')&&!path.startsWith('/')&&!path.split('/').some(s=>!s||s==='.'||s==='..');}
function source(s){fields(s,['path','sha256'],'source');if(!relativeSource(s.path)||!HASH.test(s.sha256??''))throw Error('Evidence requires safe source path and SHA256');return {path:s.path,sha256:s.sha256.toLowerCase()};}
function canonical(v){if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';if(object(v))return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';return JSON.stringify(v);}
const digest=v=>createHash('sha256').update(canonical(v)).digest('hex');
function validateOperation(o){
 fields(o,['type','evidence','expected','guards','effectStatus'],'operation');
 if(!OPERATIONS.has(o.type))throw Error('Unsupported item operation');
 if(o.effectStatus!==undefined&&!['reviewed','unverified'].includes(o.effectStatus))throw Error('Unsupported effect status');
 if(!Array.isArray(o.evidence)||o.evidence.length<1||o.evidence.length>30)throw Error('Operation needs 1..30 explicit evidence references');
 const evidence=o.evidence.map(source);
 fields(o.guards,['amount','minLevel','classIds','boundAllowed','requireSpace'],'guard');
 fields(o.guards.amount,['min','max'],'amount');
 const {min,max}=o.guards.amount;
 if(!Number.isSafeInteger(min)||!Number.isSafeInteger(max)||min<1||max<min||max>1000000)throw Error('Explicit amount bounds must be 1..1000000');
 if(o.guards.minLevel!==undefined&&(!Number.isSafeInteger(o.guards.minLevel)||o.guards.minLevel<1||o.guards.minLevel>1000000))throw Error('Invalid minLevel');
 if(o.guards.classIds!==undefined&&(!Array.isArray(o.guards.classIds)||!o.guards.classIds.length||o.guards.classIds.length>100||new Set(o.guards.classIds).size!==o.guards.classIds.length||o.guards.classIds.some(x=>!Number.isSafeInteger(x)||x<0)))throw Error('Invalid classIds');
 for(const k of ['boundAllowed','requireSpace'])if(o.guards[k]!==undefined&&typeof o.guards[k]!=='boolean')throw Error('Invalid '+k);
 fields(o.expected,['deltas','responseOpcodes','uiCheckpoints'],'expected');
 if(!Array.isArray(o.expected.deltas)||o.expected.deltas.length>64)throw Error('Expected deltas must be an explicit bounded array');
 const seen=new Set();for(const d of o.expected.deltas){fields(d,['domain','key','perUnit'],'delta');const k=d.domain+':'+d.key;if(!DOMAINS.has(d.domain)||!KEY.test(d.key??'')||['__proto__','prototype','constructor'].includes(d.key)||!Number.isSafeInteger(d.perUnit)||d.perUnit===0||Math.abs(d.perUnit)>1000000||!Number.isSafeInteger(d.perUnit*max)||seen.has(k))throw Error('Invalid, duplicate or overflowing expected delta');seen.add(k);}
 if(o.expected.responseOpcodes!==undefined&&(!Array.isArray(o.expected.responseOpcodes)||o.expected.responseOpcodes.length>50||o.expected.responseOpcodes.some(x=>!Number.isSafeInteger(x)||x<0||x>0xffffffff)))throw Error('Invalid expected S2C opcodes');
 if(o.expected.uiCheckpoints!==undefined&&(!Array.isArray(o.expected.uiCheckpoints)||o.expected.uiCheckpoints.length>50||o.expected.uiCheckpoints.some(x=>typeof x!=='string'||!KEY.test(x))))throw Error('Invalid UI checkpoint IDs');
 return {...copy(o),evidence};
}
function validateContract(c){
 fields(c,['schemaVersion','id','selector','operations'],'contract');
 if(c.schemaVersion!==1||!KEY.test(c.id??''))throw Error('Invalid scenario contract identity');
 fields(c.selector,['templateIds','category'],'selector');
 if(!!c.selector.templateIds===!!c.selector.category)throw Error('Choose exactly one explicit item selector');
 let selector;
 if(c.selector.templateIds){if(!Array.isArray(c.selector.templateIds)||!c.selector.templateIds.length||c.selector.templateIds.length>100000)throw Error('Invalid templateIds selector');const ids=c.selector.templateIds.map(itemId);if(new Set(ids).size!==ids.length)throw Error('Duplicate template IDs');selector={templateIds:ids};}
 else{fields(c.selector.category,['field','value'],'category');const v=c.selector.category.value;if(!/^[A-Za-z][A-Za-z0-9_]{0,99}$/.test(c.selector.category.field??'')||['constructor','prototype','__proto__'].includes(c.selector.category.field)||!['string','number','boolean'].includes(typeof v)||(typeof v==='number'&&!Number.isFinite(v)))throw Error('Explicit original category field/value required');selector={category:copy(c.selector.category)};}
 if(!Array.isArray(c.operations)||!c.operations.length||c.operations.length>OPERATIONS.size)throw Error('Contract needs 1..6 operations');
 const operations=c.operations.map(validateOperation);if(new Set(operations.map(o=>o.type)).size!==operations.length)throw Error('Repeated operation in contract');
 return {schemaVersion:1,id:c.id,selector,operations};
}
function scenarios(item,contract,operation){
 const min=operation.guards.amount.min,max=operation.guards.amount.max;
 const add=(id,expect,detail={})=>({id:`${item.id}:${operation.type}:${id}`,itemId:item.id,contractId:contract.id,operation:operation.type,kind:id,expect,...detail,runtime:'UNVERIFIED',executesActions:false});
 const rows=[add('success','SUCCESS',{inputs:{amount:min},expected:{deltas:operation.expected.deltas.map(d=>({...d,total:d.perUnit*min})),responseOpcodes:operation.expected.responseOpcodes??[],uiCheckpoints:operation.expected.uiCheckpoints??[]}}),add('amount-below-min','REJECT_WITHOUT_MUTATION',{inputs:{amount:min-1}}),add('amount-above-max','REJECT_WITHOUT_MUTATION',{inputs:{amount:max+1}}),add('same-operation-replay','NO_ADDITIONAL_MUTATION',{requires:'Use exactly the same persisted operationId and inputs as the successful action.'}),add('f5-readback','SAME_AUTHORITATIVE_STATE',{requires:'Reload UI and compare authoritative inventory/currency/equipment projections.'}),add('relogin-readback','SAME_PERSISTED_STATE',{requires:'New login plus authoritative database/service readback; UI text alone is insufficient.'})];
 for(const d of operation.expected.deltas.filter(d=>d.perUnit<0))rows.push(add('insufficient-'+d.domain+'-'+d.key,'REJECT_WITHOUT_MUTATION',{inputs:{amount:min},precondition:{domain:d.domain,key:d.key,quantity:Math.abs(d.perUnit*min)-1}}));
 if(operation.guards.minLevel!==undefined)rows.push(add('below-required-level','REJECT_WITHOUT_MUTATION',{precondition:{level:operation.guards.minLevel-1}}));
 if(operation.guards.classIds)rows.push(add('wrong-class','REJECT_WITHOUT_MUTATION',{precondition:{classId:{outside:operation.guards.classIds}}}));
 if(operation.guards.boundAllowed===false)rows.push(add('bound-item','REJECT_WITHOUT_MUTATION',{precondition:{bound:true}}));
 if(operation.guards.requireSpace===true)rows.push(add('full-bag','REJECT_WITHOUT_MUTATION',{precondition:{availableBagSlots:0}}));
 return rows;
}

export function buildItemScenarios({index,contracts=[],evidenceSources=[],maxScenarios=50000}={}){
 if(index?.schemaVersion!=='autoforge.items-index.v1'||!Array.isArray(index.items)||index.items.length>100000||!Array.isArray(index.sources)||!HASH.test(index.sourceDigest??''))throw Error('A bounded item index with source digest is required');
 if(!Array.isArray(contracts)||contracts.length>10000||!Array.isArray(evidenceSources)||evidenceSources.length>10000)throw Error('Contracts/evidenceSources must be bounded arrays');
 if(!Number.isSafeInteger(maxScenarios)||maxScenarios<1||maxScenarios>250000)throw Error('maxScenarios must be 1..250000');
 const sourceMap=new Map();for(const s of [...index.sources,...evidenceSources]){const ref=source({path:s.path,sha256:s.sha256});if(sourceMap.has(ref.path)&&sourceMap.get(ref.path)!==ref.sha256)throw Error('Conflicting source hashes');sourceMap.set(ref.path,ref.sha256);}
 const items=index.items.map(row=>{if(!object(row)||!object(row.fields))throw Error('Invalid indexed item');return {...row,id:itemId(row.id)};});
 if(new Set(items.map(i=>i.id)).size!==items.length)throw Error('Duplicate indexed item IDs');
 const reviewed=contracts.map(validateContract);if(new Set(reviewed.map(c=>c.id)).size!==reviewed.length)throw Error('Duplicate contract IDs');
 const complete=index.coverage?.complete===true&&index.coverage?.truncated===false;
 const itemCoverage=[],plan=[],unmatchedSelectors=[];let truncated=false;
 for(const c of reviewed)if(c.selector.templateIds)for(const id of c.selector.templateIds)if(!items.some(i=>i.id===id))unmatchedSelectors.push({contractId:c.id,itemId:id,status:'TARGET_NOT_IN_INDEX'});
 for(const item of items){
  const matches=reviewed.filter(c=>c.selector.templateIds?c.selector.templateIds.includes(item.id):Object.hasOwn(item.fields,c.selector.category.field)&&item.fields[c.selector.category.field]===c.selector.category.value);
  const operations=[];
  for(const type of OPERATIONS){
   const selected=matches.flatMap(c=>c.operations.filter(o=>o.type===type).map(o=>({c,o})));
   if(!selected.length)continue;
   const blockers=[];
   if(!complete)blockers.push('INDEX_INCOMPLETE_OR_UNDECLARED');
   if(selected.length>1)blockers.push('CONFLICTING_CONTRACTS_FOR_SAME_ITEM_OPERATION');
   const {c,o}=selected[0];
   if(o.effectStatus!=='reviewed')blockers.push('EFFECT_SEMANTICS_UNVERIFIED');
   if(!o.expected.deltas.length&&!(o.expected.responseOpcodes?.length)&&!(o.expected.uiCheckpoints?.length))blockers.push('EXPECTED_EFFECTS_UNSPECIFIED');
   for(const e of o.evidence)if(sourceMap.get(e.path)!==e.sha256)blockers.push('SOURCE_REFERENCE_NOT_IN_VERIFIED_INDEX:'+e.path);
   let cases=[];if(!blockers.length){cases=scenarios(item,c,o);if(plan.length+cases.length>maxScenarios){blockers.push('SCENARIO_LIMIT_REACHED');truncated=true;cases=[];}}
   const status=blockers.length?'BLOCKED':'PLANNED_FOR_REVIEW';
   const op={type,contractIds:selected.map(s=>s.c.id),status,blockers,evidence:o.evidence,contractSha256:digest(c),runtime:'UNVERIFIED',scenarioIds:[]};
   if(!blockers.length){op.scenarioIds=cases.map(s=>s.id);plan.push(...cases);}
   operations.push(op);
  }
  itemCoverage.push({itemId:item.id,name:typeof item.name==='string'?item.name:null,source:item.source?copy(item.source):null,status:!operations.length?'MISSING_CONTRACT':operations.some(o=>o.status==='BLOCKED')?'BLOCKED':'PLANNED_FOR_REVIEW',runtime:'UNVERIFIED',operations});
 }
 const counts={indexedItems:items.length,plannedItems:itemCoverage.filter(i=>i.status==='PLANNED_FOR_REVIEW').length,blockedItems:itemCoverage.filter(i=>i.status==='BLOCKED').length,missingContractItems:itemCoverage.filter(i=>i.status==='MISSING_CONTRACT').length,plannedScenarios:plan.length,executedScenarios:0,verifiedItems:0,unmatchedTargets:unmatchedSelectors.length};
 return {schemaVersion:'autoforge.item-scenarios.v1',sourceDigest:index.sourceDigest,indexComplete:complete,truncated,limits:{maxScenarios},status:!complete?'INDEX_INCOMPLETE':truncated?'SCENARIO_LIMIT_REACHED':counts.blockedItems||counts.missingContractItems||unmatchedSelectors.length?'GAPS_REMAIN':'SCENARIOS_PLANNED_NOT_EXECUTED',coverage:counts,items:itemCoverage,scenarios:plan,unmatchedSelectors,contracts:reviewed.map(c=>({id:c.id,sha256:digest(c),evidenceScope:'REVIEWER_DECLARED_SOURCE_REFERENCES'})),limitations:['Source SHA matching establishes catalog/reference consistency, not correct item semantics or real execution.','Selectors use exact original catalog fields; no category, reward, price, cap, RNG or drop rule is invented.','Plan fixtures never grant items or run client actions; a reviewed adapter and explicit authorization are required.','Index limits and unknown effects block planning; missing contracts remain visible for every indexed item.']};
}
