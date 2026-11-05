// Declarative recorded-state audit; never mutates inventory, currency or database.
import {canonical,normalizeInventory,normalizeNumbers,normalizeState} from './equivalence.mjs';
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
function troopTotals(state){
 if(!object(state?.troops))throw Error('Troop projection missing');
 function quantities(v){if(!object(v))throw Error('Troop quantity map missing');return normalizeNumbers(Object.fromEntries(Object.entries(v).map(([k,n])=>['type_'+k,n])));}
 const reserve=quantities(state.troops.reserve),deployed=quantities(state.troops.deployed),totals=Object.create(null);
 for(const k of new Set([...Object.keys(reserve),...Object.keys(deployed)])){const n=(reserve[k]??0)+(deployed[k]??0);if(!Number.isSafeInteger(n))throw Error('Troop total overflow');totals[k]=n;}
 return totals;
}
export function auditInvariants(record,{rules=[]}={}){
 if(!Array.isArray(rules)||rules.length>1000)throw Error('Rules must be a bounded array');
 const report={schemaVersion:'autoforge.invariants.v1',status:'UNVERIFIED',scope:'RECORDED_STATE_ONLY',checks:[],mutationsPerformed:false};
 const check=(id,result,reason)=>report.checks.push({id,result,...(reason?{reason}:{})});
 if(!object(record)){check('record','unverified','Action record missing');return report;}
 for(const [side,state] of [['before',record.before],['after',record.after]])for(const [field,normalize] of [['inventory',normalizeInventory],['currencies',normalizeNumbers]]){
  if(!state||state[field]===undefined){check(side+'.'+field,'unverified','Projection missing');continue;}
  try{normalize(state[field]);check(side+'.'+field,'passed');}catch{check(side+'.'+field,'failed','Negative, noninteger, invalid or overflowing quantity');}
 }
 if(['troops.withdraw','troops.mobilize'].includes(record.action?.type)){
  if(!object(record.before?.troops?.reserve)||!object(record.before?.troops?.deployed)||!object(record.after?.troops?.reserve)||!object(record.after?.troops?.deployed))check('troops.conservation','unverified','Complete reserve/deployed projections required');
  else try{const before=troopTotals(record.before),after=troopTotals(record.after);check('troops.conservation',canonical(before)===canonical(after)?'passed':'failed','Reserve + deployed must be conserved per troop type');}catch{check('troops.conservation','failed','Invalid, negative, noninteger or overflowing troop quantities');}
 }
 if(!record.persistence||record.persistence.relogin!==true)check('persistence','unverified','Post-relogin readback required');
 else try{check('persistence',canonical(normalizeState(record.after))===canonical(normalizeState(record.persistence.state))?'passed':'failed','Readback must equal authoritative result');}catch{check('persistence','unverified','Incomplete persisted state projection');}
 for(let i=0;i<rules.length;i++){
  const rule=rules[i];if(!object(rule))throw Error('Invalid invariant rule');const id='rule.'+i+'.'+rule.type;
  if(rule.type==='currencyDebit'){
   if(typeof rule.currency!=='string'||!/^[A-Za-z][A-Za-z0-9_.-]{0,99}$/.test(rule.currency)||!Number.isSafeInteger(rule.amount)||rule.amount<0)throw Error('Invalid currencyDebit rule');
   const b=record.before?.currencies?.[rule.currency],a=record.after?.currencies?.[rule.currency];
   if(b===undefined||a===undefined)check(id,'unverified','Currency observation missing');else check(id,Number.isSafeInteger(a)&&Number.isSafeInteger(b)&&b-a===rule.amount?'passed':'failed','Currency must be debited exactly once');
  }else if(rule.type==='inventoryDelta'){
   if(!Number.isSafeInteger(rule.templateId)||rule.templateId<1||typeof rule.bound!=='boolean'||!Number.isSafeInteger(rule.delta))throw Error('Invalid inventoryDelta rule');
   try{const b=normalizeInventory(record.before.inventory),a=normalizeInventory(record.after.inventory),k=rule.templateId+':'+Number(rule.bound);check(id,(a[k]??0)-(b[k]??0)===rule.delta?'passed':'failed','Inventory delta differs from contract');}catch{check(id,'unverified','Inventory projection missing/invalid');}
  }else if(rule.type==='idempotentReplay'){
   if(!record.replay?.after||typeof record.operationId!=='string'||!record.operationId.trim()||typeof record.replay.operationId!=='string'||!record.replay.operationId.trim())check(id,'unverified','Replay result and matching operation identity required');
   else if(record.operationId!==record.replay.operationId)check(id,'failed','Replay operation identity differs');
   else try{check(id,canonical(normalizeState(record.after))===canonical(normalizeState(record.replay.after))?'passed':'failed','Same operation replay must not mutate state again');}catch{check(id,'unverified','Replay projection incomplete');}
  }else throw Error('Unsupported invariant rule type');
 }
 report.status=report.checks.some(c=>c.result==='failed')?'FAIL':report.checks.some(c=>c.result==='unverified')?'UNVERIFIED':'PASS_RECORDED';return report;
}
