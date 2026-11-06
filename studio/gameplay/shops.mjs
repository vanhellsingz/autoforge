// Shop catalogs and pure purchase plans. Never executes SQL, grants items or touches a process.
import {createHash} from 'node:crypto';
import {readGameCatalogs,verifyGameSources} from './catalogs.mjs';
import {itemId} from '../items/item-index.mjs';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const KEY=/^[A-Za-z0-9_.:-]{1,160}$/;
const FIELD=/^[A-Za-z][A-Za-z0-9_]{0,99}$/;
const BAD=new Set(['constructor','prototype','__proto__']);
const COST=/^(?:Price|Gold|GiftToken|Honor|Point|Score|LordsScore|ConsortiaOffer|ConsortiaPve|MineScore|SecretStone|Crystal|Strategy|Currency|HowMuch|NeedItem|Cost[A-Za-z0-9_]*|[A-Za-z0-9_]*(?:Coin|Token))$/i;
const MODIFIER=/^(?:Discount|FirstPrice|Rands|Random|Prob|ValidDate|IsDrop)$/;
const LIMIT=/^(?:Count|Limit|LimitType|WeeklyLimit|MonthLimit|Vipp\d+|Need[A-Z][A-Za-z0-9_]*)$/;
const REWARD=/^(?:ItemId|Item|Item[1-9]\d*)$/;
function key(v,label){if(typeof v!=='string'||!KEY.test(v)||BAD.has(v))throw Error('Invalid '+label);return v;}
function fields(v,allowed,label){if(!object(v)||Object.keys(v).some(k=>!allowed.includes(k)||BAD.has(k)))throw Error('Unknown/invalid '+label+' fields');}
function number(v,label,{min=0,max=Number.MAX_SAFE_INTEGER}={}){if(typeof v==='string'&&/^-?\d+$/.test(v))v=Number(v);if(!Number.isSafeInteger(v)||v<min||v>max)throw Error('Invalid '+label);return v;}
function mul(a,b){const n=a*b;if(!Number.isSafeInteger(n))throw Error('Purchase amount overflow');return n;}
function add(a,b){const n=a+b;if(!Number.isSafeInteger(n)||n<0)throw Error('Invalid/overflowing next balance');return n;}
function copy(v){return JSON.parse(JSON.stringify(v));}
function family(table){if(table==='t_s_shop')return 'COMMON_AND_SHOPTYPE_CATALOG';if(/wish/i.test(table))return 'WISH_CATALOG';if(/outcity/i.test(table))return 'OUTCITY_CATALOG';if(/sky/i.test(table))return 'SKY_CATALOG';if(/seasonpass/i.test(table))return 'SEASON_PASS_CATALOG';if(/exchange/i.test(table))return 'EXCHANGE_CATALOG';return 'OTHER_SHOP_FAMILY_UNCLASSIFIED';}
function nonzero(v){return v!==undefined&&v!==null&&v!==0&&v!=='0'&&v!==''&&v!==-1&&v!=='-1';}
function rowIdentity(row,index){for(const f of ['Id','ShopId','MapShopId','TemplateId','LinkID'])if(itemId(row.fields[f])!==null)return {id:itemId(row.fields[f]),idField:f};return {id:'row-'+index,idField:null};}
export function buildShopAtlas({client,...limits}={}){
 const catalogs=readGameCatalogs({client,include:/^t_s_(?:itemtemplate|[a-z0-9_]*(?:shop|mall|store|exchange|wish)[a-z0-9_]*)$/i,...limits});
 const itemRows=catalogs.tables.find(t=>t.name==='t_s_itemtemplate')?.rows??[];
 const itemTargets=new Map();for(const r of itemRows){const id=itemId(r.fields.TemplateId??r.fields.Id);if(id!==null){if(itemTargets.has(id))throw Error('Ambiguous item template identity');itemTargets.set(id,{id,name:r.fields.TemplateName_pt??r.fields.TemplateName??r.fields.TemplateName_en??null,source:r.source});}}
 const offers=[],families=[];
 for(const table of catalogs.tables){
  if(table.name==='t_s_itemtemplate')continue;
  const counts=new Map();for(let i=0;i<table.rows.length;i++){const x=rowIdentity(table.rows[i],i);counts.set(x.id,(counts.get(x.id)??0)+1);}
  const entries=[];
  for(let i=0;i<table.rows.length;i++){
   const row=table.rows[i],identity=rowIdentity(row,i),base=table.name+':'+identity.id;
   const offer={id:counts.get(identity.id)>1?base+'@'+i:base,catalogId:identity.id,idField:identity.idField,ambiguousId:counts.get(identity.id)>1,table:table.name,family:family(table.name),fields:row.fields,source:row.source,
    rewardCandidates:Object.entries(row.fields).filter(([f,v])=>REWARD.test(f)&&nonzero(v)).map(([field,value])=>({field,value,status:'FIELD_REFERENCE_NOT_REWARD_PROOF'})),
    costCandidates:Object.entries(row.fields).filter(([f,v])=>COST.test(f)&&nonzero(v)).map(([field,value])=>({field,value,status:'CURRENCY_MEANING_UNVERIFIED'})),
    limitCandidates:Object.entries(row.fields).filter(([f,v])=>LIMIT.test(f)&&nonzero(v)).map(([field,value])=>({field,value,status:'LIMIT_SEMANTICS_UNVERIFIED'})),
    modifierCandidates:Object.entries(row.fields).filter(([f,v])=>MODIFIER.test(f)&&nonzero(v)).map(([field,value])=>({field,value,status:'PRICE_REFRESH_OR_RNG_UNVERIFIED'})),runtime:'UNVERIFIED'};
   offer.itemReferences=[];
   for(const [field,value]of Object.entries(row.fields)){
    if(!REWARD.test(field)&&field!=='HowMuch'&&field!=='Currency')continue;
    let target=itemId(value);if(target===null&&typeof value==='string'&&/^\s*-?\d+\s*,\s*\d+\s*$/.test(value))target=itemId(value.split(',')[0].trim());
    if(target===null||target==='0')continue;const found=itemTargets.get(target);
    offer.itemReferences.push({field,targetId:target,target:found??null,status:found?'CATALOG_ROW_FOUND_NOT_EFFECT_PROOF':'UNRESOLVED_ITEM_REFERENCE',meaning:field==='Currency'?'NUMERIC_CODE_MATCH_ONLY':field==='HowMuch'?'PAIR_REFERENCE_REQUIRES_REVIEWED_COST_BINDING':'REWARD_FIELD_CANDIDATE'});
   }
   offer.recordKind=offer.rewardCandidates.length?'OFFER_CANDIDATE':'RELATED_SHOP_CONFIGURATION';offers.push(offer);entries.push(offer.id);
  }
  families.push({table:table.name,family:family(table.name),rows:table.rows.length,source:table.source,offerIds:entries,status:'CATALOG_INDEXED_NOT_SHOP_IMPLEMENTED'});
 }
 const relatedItemIds=new Set();for(const o of offers)for(const r of o.rewardCandidates){const id=itemId(r.value);if(id!==null)relatedItemIds.add(id);}
 return {schemaVersion:'autoforge.shops.v1',client:catalogs.client,sourceDigest:catalogs.sourceDigest,sources:catalogs.sources,coverage:{...catalogs.coverage,records:offers.length,offers:offers.length,offerCandidates:offers.filter(o=>o.recordKind==='OFFER_CANDIDATE').length,families:families.length,itemTemplates:itemTargets.size,verifiedShops:0},families,offers,referencedItemIds:[...relatedItemIds],limitations:['All selected shop/mall/store/exchange/wish catalogs are indexed; unsupported schemas/bounds remain explicit.','ShopType and currency codes remain raw values until a reviewed binding resolves them.','Count, discounts, refresh, random stock, limits and eligibility are not guessed.','A pure plan is not a database transaction, purchase, grant or runtime proof.'],runtime:'UNVERIFIED'};
}

function validateBinding(binding,offer,atlas){
 fields(binding,['schemaVersion','offerId','reviewed','source','evidence','rewards','costs','allowFree','modifiers','limits','stock','eligibility','responseOpcodes'],'binding');
 if(binding.schemaVersion!==1||binding.offerId!==offer.id||binding.reviewed!==true)throw Error('Reviewed exact offer binding required');
 fields(binding.source,['path','sha256','rowKey','logicalName'],'source');
 for(const field of ['path','sha256','rowKey'])if(binding.source[field]!==offer.source[field])throw Error('Binding source mismatch: '+field);
 if(!Array.isArray(binding.evidence)||!binding.evidence.length||binding.evidence.length>20)throw Error('Binding evidence required');
 const sources=new Map(atlas.sources.map(s=>[s.path,s.sha256]));
 for(const e of binding.evidence){fields(e,['path','sha256'],'evidence');if(sources.get(e.path)!==e.sha256)throw Error('Binding evidence source mismatch');}
 if(!Array.isArray(binding.rewards)||!binding.rewards.length||binding.rewards.length>16||!Array.isArray(binding.costs)||binding.costs.length>32)throw Error('Explicit bounded reward/cost rules required');
 const covered=new Set(),rewardCovered=new Set(),costRuleFields=new Set();
 function operation(rule,reward){
  fields(rule,reward?['itemField','quantityField','unitQuantity','pairField']:['domain','key','keyField','amountField','pairField'],'rule');
  for(const f of ['itemField','quantityField','keyField','amountField','pairField'])if(rule[f]!==undefined&&(!FIELD.test(rule[f])||!Object.hasOwn(offer.fields,rule[f])))throw Error('Original catalog field missing: '+rule[f]);
  if(reward){
   if(rule.pairField){if(rule.itemField||rule.quantityField||rule.unitQuantity!==undefined||rewardCovered.has(rule.pairField))throw Error('Ambiguous/duplicate reward pair rule');rewardCovered.add(rule.pairField);}
   else{if(!rule.itemField||!!rule.quantityField===(rule.unitQuantity!==undefined)||rewardCovered.has(rule.itemField))throw Error('Explicit unique reward item/count rule required');if(rule.unitQuantity!==undefined)number(rule.unitQuantity,'reward unit quantity',{min:1});rewardCovered.add(rule.itemField);}
  }else{
   if(!['currencies','inventory'].includes(rule.domain))throw Error('Unknown resource domain');
   const costField=rule.pairField??rule.amountField;if(costRuleFields.has(costField))throw Error('Duplicate cost source field');costRuleFields.add(costField);
   if(rule.pairField){if(rule.domain!=='inventory'||rule.key||rule.keyField||rule.amountField)throw Error('Pair cost requires inventory domain only');covered.add(rule.pairField);}
   else{if(!rule.amountField||!!rule.key===!!rule.keyField)throw Error('Explicit resource key and amount required');if(rule.key)key(rule.key,'resource key');covered.add(rule.amountField);if(rule.keyField)covered.add(rule.keyField);}
  }
 }
 binding.rewards.forEach(r=>operation(r,true));binding.costs.forEach(r=>operation(r,false));
 for(const c of offer.costCandidates)if(!covered.has(c.field))throw Error('Unresolved cost field: '+c.field);
 for(const r of offer.rewardCandidates)if(!rewardCovered.has(r.field))throw Error('Unresolved reward field: '+r.field);
 const modifiers=binding.modifiers??[];if(!Array.isArray(modifiers)||modifiers.length>40)throw Error('Invalid modifier review');const modifierFields=new Set();
 for(const m of modifiers){fields(m,['field','mode','value'],'modifier');if(m.mode!=='not-applicable-proven'||!FIELD.test(m.field)||!Object.hasOwn(offer.fields,m.field)||JSON.stringify(m.value)!==JSON.stringify(offer.fields[m.field]))throw Error('Unknown/unproven price or refresh modifier');modifierFields.add(m.field);}
 for(const m of offer.modifierCandidates)if(!modifierFields.has(m.field))throw Error('Unresolved modifier: '+m.field);
 const handledLimits=new Set();
 if(binding.stock){fields(binding.stock,['field','key'],'stock');if(!FIELD.test(binding.stock.field)||!Object.hasOwn(offer.fields,binding.stock.field))throw Error('Original stock field missing');key(binding.stock.key,'stock key');number(offer.fields[binding.stock.field],'catalog stock',{min:0});handledLimits.add(binding.stock.field);}
 for(const l of binding.limits??[]){fields(l,['field','key','unlimitedValue'],'limit');if(!FIELD.test(l.field)||!Object.hasOwn(offer.fields,l.field))throw Error('Original limit field missing');key(l.key,'limit key');if(l.unlimitedValue!==undefined)number(l.unlimitedValue,'unlimited marker',{min:-1});handledLimits.add(l.field);}
 for(const e of binding.eligibility??[]){fields(e,['catalogField','stateField','operator','zeroMeansDisabled'],'eligibility');if(!FIELD.test(e.catalogField)||!Object.hasOwn(offer.fields,e.catalogField)||!['level','classId','vip','guildLevel'].includes(e.stateField)||!['gte','lte','eq'].includes(e.operator)||(e.zeroMeansDisabled!==undefined&&typeof e.zeroMeansDisabled!=='boolean'))throw Error('Invalid explicit eligibility');handledLimits.add(e.catalogField);}
 for(const l of offer.limitCandidates)if(!handledLimits.has(l.field))throw Error('Unresolved stock/limit/eligibility: '+l.field);
 if(binding.responseOpcodes!==undefined&&(!Array.isArray(binding.responseOpcodes)||binding.responseOpcodes.some(n=>!Number.isSafeInteger(n)||n<0)))throw Error('Invalid expected response opcodes');
 return binding;
}
function stateMap(v,{inventory=false}={}){if(!object(v)||Object.keys(v).length>100000)throw Error('State map missing/bounded');const out=Object.create(null);for(const [k,n]of Object.entries(v)){if(inventory?itemId(k)!==k:!KEY.test(k)||BAD.has(k))throw Error('Invalid state map key');out[k]=number(n,'observed state value');}return out;}
function pair(value){if(typeof value!=='string'||!/^\s*-?\d+\s*,\s*\d+\s*$/.test(value))throw Error('Unknown pair catalog encoding');const [k,q]=value.split(',').map(s=>s.trim()),id=itemId(k);if(id===null)throw Error('Invalid pair item');return [id,number(q,'pair quantity',{min:1})];}
export function evaluatePurchase({atlas,offerId,quantity,state,binding,operationId,actorId,client}={}){
 const blocked=reason=>({schemaVersion:'autoforge.purchase-plan.v1',status:'BLOCKED',reason,mutationsPerformed:false,runtime:'UNVERIFIED'});
 if(atlas?.schemaVersion!=='autoforge.shops.v1'||!Array.isArray(atlas.offers)||!Array.isArray(atlas.sources))return blocked('SHOP_ATLAS_REQUIRED');
 const selected=atlas.offers.filter(o=>o.id===offerId);if(selected.length!==1)return blocked(selected.length?'AMBIGUOUS_OFFER':'OFFER_NOT_FOUND');const offer=selected[0];
 if(!atlas.coverage?.complete||atlas.coverage?.truncated)return blocked('INCOMPLETE_CATALOG_COVERAGE');
 let b,next,costs=[],rewards=[];
 try{
  b=validateBinding(binding,offer,atlas);if(client)verifyGameSources({client,sources:atlas.sources});quantity=number(quantity,'purchase quantity',{min:1,max:1000000});key(operationId,'operation ID');
  fields(state,['characterId','currencies','inventory','stock','purchases','receipts','eligibility'],'state');number(actorId,'actor ID',{min:1});if(state.characterId!==actorId)throw Error('Character/session ownership not verified');
  const currencies=stateMap(state.currencies),inventory=stateMap(state.inventory,{inventory:true}),stock=stateMap(state.stock??{}),purchases=stateMap(state.purchases??{});
  if(!object(state.receipts??{})||Object.keys(state.receipts??{}).length>10000)throw Error('Invalid receipt projection');
  if(state.eligibility!==undefined){fields(state.eligibility,['level','classId','vip','guildLevel'],'eligibility state');for(const n of Object.values(state.eligibility))number(n,'eligibility state');}
  for(const [operation,receipt] of Object.entries(state.receipts??{})){key(operation,'receipt operation');fields(receipt,['fingerprint','offerId','quantity','costs','rewards'],'receipt');if(!/^[a-f0-9]{64}$/.test(receipt.fingerprint??'')||typeof receipt.offerId!=='string'||receipt.offerId.length>300)throw Error('Invalid persisted receipt identity');number(receipt.quantity,'receipt quantity',{min:1});for(const name of ['costs','rewards']){if(!Array.isArray(receipt[name])||receipt[name].length>48)throw Error('Invalid receipt effects');for(const effect of receipt[name]){fields(effect,['domain','key','amount'],'receipt effect');if(!['inventory','currencies'].includes(effect.domain))throw Error('Invalid receipt resource');key(effect.key,'receipt resource key');number(effect.amount,'receipt amount');}}}
  const fingerprint=hash({offerId,quantity,actorId,binding:b,source:offer.source});
  const prior=(state.receipts??{})[operationId];if(prior){if(!object(prior)||prior.fingerprint!==fingerprint)return {schemaVersion:'autoforge.purchase-plan.v1',status:'REJECTED',reason:'IDEMPOTENCY_CONFLICT',stateUnchanged:true,mutationsPerformed:false,runtime:'UNVERIFIED'};return {schemaVersion:'autoforge.purchase-plan.v1',status:'REPLAY_RECORDED',replayed:true,receipt:copy(prior),after:copy(state),stateUnchanged:true,mutationsPerformed:false,runtime:'UNVERIFIED'};}
  for(const r of b.costs){let k,a;if(r.pairField)[k,a]=pair(offer.fields[r.pairField]);else{k=r.key??(r.domain==='inventory'?itemId(offer.fields[r.keyField]):idKey(offer.fields[r.keyField]));if(k===null)throw Error('Unknown resource identity');a=number(offer.fields[r.amountField],'catalog cost');}costs.push({domain:r.domain,key:k,amount:mul(a,quantity)});}
  for(const r of b.rewards){let k,a;if(r.pairField)[k,a]=pair(offer.fields[r.pairField]);else{k=itemId(offer.fields[r.itemField]);if(k===null)throw Error('Unknown reward template');a=r.quantityField?number(offer.fields[r.quantityField],'catalog reward count',{min:1}):r.unitQuantity;}rewards.push({domain:'inventory',key:k,amount:mul(a,quantity)});}
  if(!costs.some(c=>c.amount>0)&&b.allowFree!==true)throw Error('Free purchase semantics not explicitly reviewed');
  for(const rule of b.eligibility??[]){const required=number(offer.fields[rule.catalogField],'catalog eligibility');if(required===0&&rule.zeroMeansDisabled)continue;const actual=number(state.eligibility?.[rule.stateField],'observed eligibility');if(!(rule.operator==='gte'?actual>=required:rule.operator==='lte'?actual<=required:actual===required))return rejection('ELIGIBILITY_REJECTED',state);}
  for(const rule of b.limits??[]){const limit=number(offer.fields[rule.field],'catalog limit',{min:-1});if(rule.unlimitedValue!==undefined&&limit===rule.unlimitedValue)continue;if(limit<0)throw Error('Unknown negative limit semantics');if(!Object.hasOwn(purchases,rule.key))throw Error('Current persisted purchase counter missing');if(add(purchases[rule.key],quantity)>limit)return rejection('PURCHASE_LIMIT_REACHED',state);}
  if(b.stock){if(!Object.hasOwn(stock,b.stock.key))throw Error('Current persisted stock missing');if(stock[b.stock.key]<quantity)return rejection('OUT_OF_STOCK',state);}
  const aggregated=new Map();for(const c of costs){const k=c.domain+':'+c.key;aggregated.set(k,add(aggregated.get(k)??0,c.amount));}
  for(const [combined,amount]of aggregated){const split=combined.indexOf(':'),domain=combined.slice(0,split),k=combined.slice(split+1);const balance=(domain==='inventory'?inventory:currencies)[k]??0;if(balance<amount)return rejection('INSUFFICIENT_'+domain.toUpperCase(),state);}
  next={characterId:state.characterId,currencies:{...currencies},inventory:{...inventory},stock:{...stock},purchases:{...purchases},receipts:copy(state.receipts??{}),...(state.eligibility?{eligibility:copy(state.eligibility)}:{})};
  for(const [combined,amount]of aggregated){const split=combined.indexOf(':'),domain=combined.slice(0,split),k=combined.slice(split+1);next[domain][k]=(next[domain][k]??0)-amount;}
  for(const r of rewards)next.inventory[r.key]=add(next.inventory[r.key]??0,r.amount);
  for(const rule of b.limits??[]){const limit=number(offer.fields[rule.field],'catalog limit',{min:-1});if(rule.unlimitedValue!==undefined&&limit===rule.unlimitedValue)continue;next.purchases[rule.key]=add(next.purchases[rule.key],quantity);}
  if(b.stock)next.stock[b.stock.key]-=quantity;
  next.receipts[operationId]={fingerprint,offerId,quantity,costs,rewards};
  return {schemaVersion:'autoforge.purchase-plan.v1',status:'PLAN_READY_REVIEWED_BINDING',offerId,quantity,source:offer.source,bindingSha256:hash(b),costs,rewards,after:next,replayed:false,mutationsPerformed:false,runtime:'UNVERIFIED',requiredProductionProofs:['One MariaDB transaction with ownership, row locking/version and persistent idempotency.','Apply all debits/grants/stock counters atomically and rollback on every failure.','Emit actual S2C snapshots, confirm UI and relogin readback.','Prove current refresh/stock, price modifiers and time windows independently.']};
 }catch(e){return blocked(e.message);}
}
function idKey(value){return typeof value==='string'&&KEY.test(value)&&!BAD.has(value)?value:typeof value==='number'&&Number.isSafeInteger(value)?String(value):null;}
function rejection(reason,state){return {schemaVersion:'autoforge.purchase-plan.v1',status:'REJECTED',reason,stateUnchanged:true,after:copy(state),mutationsPerformed:false,runtime:'UNVERIFIED'};}
