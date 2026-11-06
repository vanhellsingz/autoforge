// Explicit, reviewed contracts only. No guessed rage bonuses, troop caps or drop generation.
import {verifyQuestSources} from './quests.mjs';
import {validIdentity,canonical,EVIDENCE_LIMITATION} from '../learning/evidence.mjs';
const n=v=>Number.isSafeInteger(v)&&v>=0;
const list=(v,max=10000)=>Array.isArray(v)&&v.length<=max;

export function auditBattleConsistency({atlas,contract,observation,expectedCommit,client}={}){
 const checks=[],add=(id,result,detail)=>checks.push({id,result,detail});
 if(!contract||contract.schemaVersion!==1||contract.reviewed!==true||!list(contract.sources,1000)||!contract.sources.length)throw Error('Reviewed battle contract and explicit source hashes required');
 if(!observation||typeof observation!=='object')throw Error('Battle observation required');
 if(client)verifyQuestSources({client,sources:contract.sources});else add('current-sources','UNVERIFIED','Pass the actual client to revalidate contract source bytes.');
 if(!validIdentity(observation.identity)||observation.identity.commit!==expectedCommit||!expectedCommit||observation.identity.clientSourceDigest!==atlas?.sourceDigest)add('identity','UNVERIFIED','Exact current commit, environment, test and atlas digest required.');
 if(!atlas?.coverage?.complete)add('catalog-coverage','UNVERIFIED','Complete current catalog scope required.');
 const rules=contract.rules??{},o=observation;
 const rage=rules.rage;
 if(!rage||!n(rage.expectedInitial)||!n(rage.cap)||rage.expectedInitial>rage.cap)add('rage-contract','UNVERIFIED','Resolve base rage, equipment/set/passive bonuses and cap from the exact client rules.');
 else {
  for(const channel of ['server','wire','ui'])add('rage-initial-'+channel,n(o.initialRage?.[channel])?o.initialRage[channel]===rage.expectedInitial?'PASS':'FAIL':'UNVERIFIED','Initial '+channel+' rage must equal reviewed base plus actual bonuses; a full UI bar does not grant rage.');
  if(!list(o.skillActions,1000)||!o.skillActions.length||!list(rage.skills,1000))add('rage-skills','UNVERIFIED','Explicit skill actions and reviewed costs/gains required.');
  else {const ids=new Set();for(const action of o.skillActions){
   if(typeof action.operationId!=='string'||!action.operationId||ids.has(action.operationId)){add('rage-operation','UNVERIFIED','Unique operation ID required; duplicate replay needs separate before/after evidence.');continue;}ids.add(action.operationId);
   const matches=rage.skills.filter(s=>s.skillId===action.skillId),r=matches.length===1?matches[0]:null;
   if(!r||!n(r.cost)||!n(r.gain)||!n(action.before)||!n(action.after)||typeof action.accepted!=='boolean'){add('rage-skill-'+action.operationId,'UNVERIFIED','Missing skill rule or authoritative before/after/accepted values.');continue;}
   // This arithmetic mode must itself be reviewed against the actual skill dispatcher.
   if(r.mode!=='subtract-cost-add-gain-clamp'){add('rage-skill-'+action.operationId,'UNVERIFIED','Unsupported cost/gain ordering or modifiers; do not guess.');continue;}
   const canUse=action.before>=r.cost,expected=action.accepted?Math.min(rage.cap,action.before-r.cost+r.gain):action.before;
   add('rage-skill-'+action.operationId,Number.isSafeInteger(expected)&&action.before<=rage.cap&&(!action.accepted||canUse)&&action.after===expected?'PASS':'FAIL','Authoritative affordability and reviewed gain/cost ordering must match; rejected skills leave rage unchanged.');
  }}
 }
 const formation=rules.formation,actors=o.allies;
 if(!formation||!n(formation.heroSlot)||!list(formation.troopSlots,6)||!formation.troopSlots.every(n)||new Set([formation.heroSlot,...formation.troopSlots]).size!==formation.troopSlots.length+1) add('formation-contract','UNVERIFIED','Resolve the selected formation and slot coordinate mapping in the actual client.');
 else if(!list(actors,10))add('formation-actors','UNVERIFIED','Decoded allied battle actors required.');
 else {
  const hero=actors.filter(a=>a.kind==='hero'),troops=actors.filter(a=>a.kind==='troop'),slots=actors.map(a=>a.slot);
  add('formation-hero',hero.length===1&&hero[0].slot===formation.heroSlot?'PASS':'FAIL','Battle hero slot must equal the selected formation slot; do not invert front/back by intuition.');
  add('formation-troop-slots',troops.length===formation.troopSlots.length&&formation.troopSlots.every(s=>troops.some(a=>a.slot===s))&&new Set(slots).size===slots.length?'PASS':'FAIL','Every contracted troop stack must exist at its own mapped slot, not just one sprite.');
  add('formation-quantity',troops.every(a=>n(a.quantity))&&n(o.troops?.before?.deployed)?troops.reduce((sum,a)=>sum+a.quantity,0)===o.troops.before.deployed?'PASS':'FAIL':'UNVERIFIED','Sum of troop stack quantities must equal deployed troops, not one copy of the full count per sprite.');
 }
 const tr=rules.troops,t=o.troops;
 if(!tr||!n(tr.capacity)||typeof tr.autoRefill!=='boolean')add('troop-capacity-contract','UNVERIFIED','Derive capacity from the actual character/catalog/bonuses. No fixed 100 or 200 fallback.');
 else if(!t||![t.before?.deployed,t.before?.reserve,t.before?.capacity,t.losses,t.after?.deployed,t.after?.reserve,t.after?.capacity].every(n))add('troop-snapshot','UNVERIFIED','Authoritative before/losses/after counts and capacity required.');
 else {
  add('troop-capacity',t.before.capacity===tr.capacity&&t.after.capacity===tr.capacity&&t.before.deployed<=tr.capacity&&t.losses<=t.before.deployed?'PASS':'FAIL','Capacity must reflect the reviewed client rule and valid loss bounds.');
  add('troop-safe-total',Number.isSafeInteger(t.before.deployed+t.before.reserve)&&Number.isSafeInteger(t.after.deployed+t.after.reserve)?'PASS':'FAIL','Totals must remain exact safe integers.');
  const survivors=Math.max(0,t.before.deployed-t.losses),refill=tr.autoRefill?Math.min(Math.max(0,tr.capacity-survivors),t.before.reserve):0;
  add('troop-refill',t.after.deployed===survivors+refill&&t.after.reserve===t.before.reserve-refill?'PASS':'FAIL','Refill only the missing quantity from real reserve. Do not add the entire capacity or mint reserve.');
  add('troop-conservation',t.before.deployed+t.before.reserve-t.losses===t.after.deployed+t.after.reserve?'PASS':'FAIL','Deployed + reserve changes only by confirmed casualties in this isolated operation.');
  add('troop-relogin',t.relogin?canonical(t.relogin)===canonical(t.after)?'PASS':'FAIL':'UNVERIFIED','Fresh-login troop snapshot must equal persisted settlement.');
  if(t.replayAfter)add('troop-settlement-replay',canonical(t.replayAfter)===canonical(t.after)?'PASS':'FAIL','Replayed settlement cannot refill or deduct reserve twice.');
 }
 const ch=rules.chests;
 if(!ch||!list(ch.allowedNodeKeys)||new Set(ch.allowedNodeKeys).size!==ch.allowedNodeKeys.length)add('chest-contract','UNVERIFIED','Explicit map-scoped catalog chest node keys required.');
 else {
  const known=new Set((atlas?.nodes??[]).map(n=>n.key));
  const scope=[...(atlas?.maps??[]),...(atlas?.campaigns??[])].find(m=>m.key===ch.mapKey);
  if(!scope||o.mapKey!==ch.mapKey)add('chest-map-scope','UNVERIFIED','Contract and observed chest identities must refer to the same explicit map/campaign.');
  if(ch.allowedNodeKeys.some(k=>!known.has(k)))add('chest-namespace','UNVERIFIED','Chest must resolve in its reviewed node namespace; no numeric-ID coercion.');
  for(const key of ch.allowedNodeKeys){const node=atlas?.nodes?.find(n=>n.key===key);if(!node||!scope)continue;const campaign=scope.kind==='campaign'?String(scope.id):String(scope.fields?.CampaignId??'');const related=node.kind==='node'?String(node.fields?.CampaignId??'')===campaign:scope.kind==='map'?String(node.fields?.MapId??'')===String(scope.id):(atlas.maps??[]).some(m=>String(m.id)===String(node.fields?.MapId)&&String(m.fields?.CampaignId)===campaign);if(!related)add('chest-map-node-'+key,'UNVERIFIED','Source fields do not establish membership in the contracted map.');}
  if(!list(o.visibleChestNodeKeys))add('chest-observation','UNVERIFIED','Decoded after-battle map chest identities required.');
  else add('chest-spawns',new Set(o.visibleChestNodeKeys).size===o.visibleChestNodeKeys.length&&o.visibleChestNodeKeys.every(k=>ch.allowedNodeKeys.includes(k))?'PASS':'FAIL','Every visible chest must belong to this map contract. Monster victory does not authorize a new chest node.');
 }
 return {schemaVersion:'autoforge.battle-consistency.v1',status:checks.some(c=>c.result==='FAIL')?'FAIL_RECORDED':checks.some(c=>c.result==='UNVERIFIED')?'UNVERIFIED':'PASS_RECORDED',checks,identity:o.identity??null,sourceRevalidated:!!client,causalAttribution:'NOT_ESTABLISHED',limitation:EVIDENCE_LIMITATION,mutationsPerformed:false};
}
