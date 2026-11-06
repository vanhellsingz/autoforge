// Main quests, side/task catalogues and evolution candidates are separate namespaces.
// This module never grants rewards, completes quests or executes the client/backend.
import {readFileSync,readdirSync,lstatSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {readGameCatalogs,verifyGameSources} from './catalogs.mjs';
import {noItemLinks,itemId} from '../items/item-index.mjs';
const H=v=>createHash('sha256').update(v).digest('hex');
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const INCLUDE=/^t_s_.*(?:quest|task|evol|transfer|transjob|rebirth|reincarn|advance|upgrade)/i;
const id=v=>itemId(v);
const title=row=>row.Title_pt||row.Title_en||row.TemplateName_pt||row.TemplateName_en||row.Title_zhcn||null;
const clone=v=>JSON.parse(JSON.stringify(v));
const canonical=v=>{if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';if(object(v))return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';return JSON.stringify(v);};
function mask(text){
 const parts=[];let at=0,i=0,previous='',word='';
 const remove=(start,end)=>{parts.push(text.slice(at,start),text.slice(start,end).replace(/[^\r\n]/g,' '));at=end;};
 while(i<text.length){const c=text[i],next=text[i+1];
  if(c==='"'||c==="'"||c==='`'){const start=i++,quote=c;while(i<text.length){if(text[i]==='\\'){i+=2;continue;}if(text[i++]===quote)break;}remove(start,i);previous='v';word='';continue;}
  if(c==='/'&&next==='*'){const start=i;i=text.indexOf('*/',i+2);i=i<0?text.length:i+2;remove(start,i);continue;}
  if(c==='/'&&next==='/'){const start=i;while(i<text.length&&!/[\r\n]/.test(text[i]))i++;remove(start,i);continue;}
  if(c==='/'&&(!previous||/[=(:,;!?{\[<>+*%^&|~]/.test(previous)||/^(return|throw|case|delete|yield|await|typeof|void)$/.test(word))){const start=i++;let inClass=false;while(i<text.length){if(text[i]==='\\'){i+=2;continue;}if(text[i]==='[')inClass=true;if(text[i]===']')inClass=false;if(text[i++]==='/'&&!inClass)break;}while(/[a-z]/i.test(text[i]??'')&&i<text.length)i++;remove(start,i);previous='v';word='';continue;}
  if(/[A-Za-z_$]/.test(c)){const start=i++;while(/[\w$]/.test(text[i]??'')&&i<text.length)i++;word=text.slice(start,i);previous='v';continue;}
  if(!/\s/.test(c)){previous=c;word='';}i++;
 }
 parts.push(text.slice(at));return parts.join('');
}
function span(source,text,start,end){return {path:source.path,sourceSha256:source.sha256,start:Buffer.byteLength(text.slice(0,start)),end:Buffer.byteLength(text.slice(0,end)),sha256:H(Buffer.from(text.slice(start,end)))};}
function clientVocabulary(client){
 const dir=noItemLinks(join(client,'js'));if(!existsSync(dir))return {source:null,enums:[],dispatchers:[],status:'CLIENT_BUNDLE_MISSING'};
 const names=readdirSync(dir).filter(n=>/^bundle_release(?:-[a-f0-9]+)?\.js$/i.test(n));
 if(names.length!==1)return {source:null,enums:[],dispatchers:[],status:names.length?'AMBIGUOUS_CLIENT_BUNDLES':'CLIENT_BUNDLE_MISSING'};
 const path=noItemLinks(join(dir,names[0])),stat=lstatSync(path);if(!stat.isFile()||stat.size>80*1024*1024)throw Error('Quest bundle exceeds bounded file scope');
 const bytes=readFileSync(path),text=bytes.toString('utf8'),source={path:'js/'+names[0],sha256:H(bytes),bytes:bytes.length};
 const enums=[];for(const m of text.matchAll(/class\s+([A-Za-z_$][\w$]*)\{\}((?:\1\.[A-Z_][A-Z_0-9]*=\d+,?)+);/g)){
  const constants=[...m[2].matchAll(/\.([A-Z_][A-Z_0-9]*)=(\d+)/g)].map(x=>({name:x[1],value:Number(x[2])}));
  if(!constants.some(c=>/STRENGTHEN|TALKTASK|KILL_MONSTER|GIVE_PAWNS/.test(c.name)))continue;
  enums.push({namespace:m[1],constants,evidence:span(source,text,m.index,m.index+m[0].length),binding:'NOT_BOUND_TO_MAIN_QUEST_CONDITIONS'});
  if(enums.length>100)throw Error('Quest enum candidate limit exceeded');
 }
 const code=mask(text),dispatchers=[];
 for(const m of code.matchAll(/switch\([A-Za-z_$][\w$]*\.CondictionType\)\{/g)){
  let depth=1,end=m.index+m[0].length;for(;end<code.length&&end-m.index<32000&&depth;end++){if(code[end]==='{')depth++;else if(code[end]==='}')depth--;}
  const block=text.slice(m.index,end),prefix=text.slice(Math.max(0,m.index-50000),m.index),classes=[...prefix.matchAll(/\bclass\s+([A-Za-z_$][\w$]*)/g)],namespace=classes.at(-1)?.[1]??null;
  const numericCases=[...block.matchAll(/\bcase\s+(\d+)\s*:/g)].map(x=>Number(x[1]));
  const symbolicCases=[...block.matchAll(/\bcase\s+([A-Za-z_$][\w$]*\.[A-Z_][A-Z_0-9]*)\s*:/g)].map(x=>x[1]);
  const methods=[...new Set([...block.matchAll(/(?:this\.|[A-Za-z_$][\w$]*\.)([A-Za-z_$][\w$]*)\s*\(/g)].map(x=>x[1]))];
  dispatchers.push({id:'quest-dispatch-'+dispatchers.length,namespace,numericCases:[...new Set(numericCases)],symbolicCases:[...new Set(symbolicCases)],methods,evidence:span(source,text,m.index,end),snippet:block.slice(0,2400),truncated:depth!==0||block.length>2400,classification:'LEXICAL_DISPATCH_CANDIDATE_NOT_SEMANTIC_PROOF'});
  if(dispatchers.length>200)throw Error('Quest dispatcher candidate limit exceeded');
 }
 return {source,enums,dispatchers,status:'STATIC_VOCABULARY_NOT_NAMESPACE_RESOLVED'};
}
function prerequisites(value){if(value===undefined||value===null||value==='')return {ids:[],unparsed:[]};const tokens=Array.isArray(value)?value:String(value).split(/[;,|\s]+/).filter(Boolean);const ids=[],unparsed=[];for(const token of tokens){const n=id(token);if(n===null)unparsed.push(token);else ids.push(n)}return {ids:[...new Set(ids)],unparsed};}
function graphFor(quests){
 const byId=new Map(quests.map(q=>[q.id,q])),edges=[],dangling=[],unparsed=[];
 for(const q of quests){const p=prerequisites(q.fields.PreQuestId);for(const from of p.ids){const edge={from,to:q.id,semantics:'REFERENCE_NOT_AND_OR_RULE'};edges.push(edge);if(!byId.has(from))dangling.push(edge)}if(p.unparsed.length)unparsed.push({questId:q.id,values:p.unparsed});}
 const next=new Map();for(const e of edges){if(!next.has(e.from))next.set(e.from,[]);next.get(e.from).push(e.to)}
 const colors=new Map(),cycles=[];let suppressedCycles=0;
 for(const q of quests){if(colors.has(q.id))continue;const stack=[{id:q.id,index:0}],path=[],positions=new Map();colors.set(q.id,1);path.push(q.id);positions.set(q.id,0);
  while(stack.length){const top=stack.at(-1),targets=next.get(top.id)??[];if(top.index>=targets.length){colors.set(top.id,2);positions.delete(top.id);stack.pop();path.pop();continue;}const n=targets[top.index++];if(!byId.has(n))continue;if(colors.get(n)===1){if(cycles.length<1000)cycles.push(path.slice(positions.get(n)).concat(n));else suppressedCycles++;continue;}if(colors.has(n))continue;colors.set(n,1);positions.set(n,path.length);path.push(n);stack.push({id:n,index:0});}
 }
 return {edges,dangling,unparsed,cycles,suppressedCycles,cycleAnalysis:'STATIC_REFERENCES_CHECKED'};
}
export function buildQuestAtlas({client,...limits}={}){
 const corpus=readGameCatalogs({client,include:INCLUDE,...limits}),questRows=corpus.tables.filter(t=>t.name==='t_s_questtemplate').flatMap(t=>t.rows),conditionRows=corpus.tables.filter(t=>/^t_s_questcondi(?:c)?tion$/i.test(t.name)).flatMap(t=>t.rows),rewardRows=corpus.tables.filter(t=>t.name==='t_s_questgood').flatMap(t=>t.rows);
 const quests=[],seen=new Set(),conditionsByQuest=new Map(),unresolvedConditions=[];
 for(const row of conditionRows){const questId=id(row.fields.TemplateId),conditionId=id(row.fields.CondictionID??row.fields.ConditionId);if(questId===null||conditionId===null){unresolvedConditions.push(row);continue;}const key=questId+':'+conditionId;if(seen.has('condition:'+key))throw Error('Ambiguous main quest condition '+key);seen.add('condition:'+key);const condition={id:conditionId,key,type:id(row.fields.CondictionType??row.fields.ConditionType),fields:row.fields,source:row.source};if(!conditionsByQuest.has(questId))conditionsByQuest.set(questId,[]);conditionsByQuest.get(questId).push(condition);}
 for(const row of questRows){const questId=id(row.fields.TemplateId??row.id);if(questId===null)throw Error('Main quest without stable TemplateId');if(seen.has('quest:'+questId))throw Error('Duplicate quest TemplateId '+questId);seen.add('quest:'+questId);quests.push({id:questId,title:title(row.fields),fields:row.fields,source:row.source,conditions:conditionsByQuest.get(questId)??[],rewardItems:rewardRows.filter(r=>id(r.fields.TemplateId)===questId).map(r=>({fields:r.fields,source:r.source})),implementation:'UNVERIFIED'});}
 const known=new Set(quests.map(q=>q.id)),orphanConditions=[...conditionsByQuest].filter(([quest])=>!known.has(quest)).flatMap(([,conditions])=>conditions);
 const vocabulary=clientVocabulary(corpus.client),sources=[...corpus.sources,...(vocabulary.source?[vocabulary.source]:[])];verifyQuestSources({client:corpus.client,sources});
 const requiredCoreMissing=[];if(!corpus.tables.some(t=>t.name==='t_s_questtemplate'))requiredCoreMissing.push('t_s_questtemplate');if(!corpus.tables.some(t=>/^t_s_questcondi(?:c)?tion$/.test(t.name)))requiredCoreMissing.push('t_s_questcondition_or_questcondiction');if(!corpus.tables.some(t=>t.name==='t_s_questgood'))requiredCoreMissing.push('t_s_questgood');
 return {schemaVersion:'autoforge.quest-atlas.v1',client:corpus.client,sourceDigest:H(JSON.stringify(sources.map(s=>[s.path,s.sha256]))),sources,quests,graph:graphFor(quests),vocabulary,auxiliaryCatalogs:corpus.tables.filter(t=>!/^t_s_quest(?:template|condi(?:c)?tion|good)$/.test(t.name)).map(t=>({...t,role:'TASK_EVOLUTION_OR_UPGRADE_CANDIDATE_UNRESOLVED_NAMESPACE',runtime:'UNVERIFIED'})),unresolvedConditions,orphanConditions,coverage:{...corpus.coverage,complete:corpus.coverage.complete&&!requiredCoreMissing.length,requiredCoreMissing,mainQuests:quests.length,mainConditions:conditionRows.length,mainRewardRows:rewardRows.length,auxiliaryTables:corpus.tables.filter(t=>!/^t_s_quest(?:template|condi(?:c)?tion|good)$/.test(t.name)).length,conditionTypes:[...new Set(quests.flatMap(q=>q.conditions.map(c=>c.type)))].sort(),allCatalogRolesResolved:false},claims:{allMissionsImplemented:false,gameplayVerified:false,grantsPerformed:false},limitations:['A condition number is scoped to its task namespace. Ring/reward enums cannot name main-quest conditions automatically.','Every selected quest/task/evolution/upgrade family is retained; auxiliary catalogues are not automatically executable missions.','PreQuestId references do not establish AND/OR, acceptance, reward or reset semantics.','STRENGTHEN=2 in a ring enum does not imply that main quest CondictionType 2 means strengthening.']};
}

export function verifyQuestSources({client,sources}){
 verifyGameSources({client,sources:sources.filter(s=>s.path.startsWith('res/release/config/'))});
 for(const s of sources.filter(s=>!s.path.startsWith('res/release/config/'))){if(!/^js\/bundle_release(?:-[a-f0-9]+)?\.js$/i.test(s.path))throw Error('Unsafe quest bundle source');const p=noItemLinks(join(client,s.path)),st=lstatSync(p);if(!st.isFile()||st.size>80*1024*1024||H(readFileSync(p))!==s.sha256)throw Error('Quest bundle source changed');}
 return {status:'SOURCE_HASHES_MATCH',runtime:'UNVERIFIED'};
}

const allowedBinding=new Set(['conditionType','conditionId','event','mode','projection','field','operator','target','required','mutation','reviewed','sourceRefs','dispatcherId']);
function parameter(value,condition){if(object(value)){if(Object.keys(value).length!==1||!/^Para[1-4]$/.test(value.parameter??''))throw Error('Target must explicitly bind a Para1..4 parameter');value=condition.fields[value.parameter];}if(typeof value==='string'&&/^-?\d+$/.test(value))value=Number(value);if(!Number.isSafeInteger(value))throw Error('Quest target must resolve to an exact safe integer');return value;}
function matches(value,operator,target){if(!Number.isSafeInteger(value))return false;return operator==='gte'?value>=target:operator==='eq'?value===target:operator==='gt'?value>target:false;}
function rows(snapshot,projection){const value=snapshot?.[projection];if(Array.isArray(value))return value;if(object(value))return [value];return null;}
function key(row){return id(row.instanceId??row.itemId??row.characterId??row.id??row.templateId);}
function progress(snapshot,questId,conditionId){const q=snapshot?.quest;if(!q||id(q.questId)!==questId)return null;const value=(q.conditions??[]).find(c=>id(c.conditionId)===conditionId)?.progress;return Number.isSafeInteger(value)&&value>=0?value:null;}
function stamp(identity){return object(identity)&&/^[a-f0-9]{40,64}$/i.test(identity.commit??'')&&typeof identity.environment?.name==='string'&&identity.environment.name&&typeof identity.environment?.kind==='string'&&identity.environment.kind&&typeof identity.testId==='string'&&identity.testId;}
function bindingFor(binding,condition,atlas){
 if(!object(binding)||Object.keys(binding).some(k=>!allowedBinding.has(k)))throw Error('Unknown quest binding fields');
 if(!['state','delta','count'].includes(binding.mode)||!['equipment','character','skills','mounts','pets','troops'].includes(binding.projection)||!/^[_A-Za-z][_A-Za-z0-9]{0,79}$/.test(binding.field??'')||['__proto__','constructor','prototype'].includes(binding.field)||!['gte','eq','gt'].includes(binding.operator))throw Error('Unsupported quest binding grammar');
 if(binding.reviewed!==true||!Array.isArray(binding.sourceRefs)||binding.sourceRefs.length<2)return {ready:false,reason:'REVIEWED_SOURCE_BINDING_REQUIRED'};
 const sources=new Map(atlas.sources.map(s=>[s.path,s.sha256]));if(binding.sourceRefs.some(r=>!object(r)||sources.get(r.path)!==r.sha256))return {ready:false,reason:'SOURCE_HASH_MISMATCH'};
 if(!binding.sourceRefs.some(r=>r.path===condition.source.path&&r.sha256===condition.source.sha256))return {ready:false,reason:'CONDITION_CATALOG_SOURCE_REQUIRED'};
 const dispatcher=atlas.vocabulary.dispatchers.find(d=>d.id===binding.dispatcherId&&d.numericCases.includes(Number(condition.type)));
 if(!dispatcher||!binding.sourceRefs.some(r=>r.path===dispatcher.evidence.path&&r.sha256===dispatcher.evidence.sourceSha256))return {ready:false,reason:'EXPLICIT_MAIN_QUEST_DISPATCH_REFERENCE_REQUIRED'};
 if(binding.mode==='count'&&(typeof binding.event!=='string'||!/^[-\w.]{1,100}$/.test(binding.event)||!binding.mutation))throw Error('Event-count binding needs an exact event and explicit mutation mode');
 if(binding.mutation!==undefined&&!['increase','changed','any-success'].includes(binding.mutation))throw Error('Unsupported mutation mode');
 const target=parameter(binding.target,condition),required=parameter(binding.required??1,condition);if(required<1||required>1000000)throw Error('Invalid required quest progress');return {ready:true,target,required,dispatcher};
}
/** Diagnoses recorded evidence only; never marks a backend quest complete. */
export function diagnoseQuest({atlas,questId,bindings=[],evidence={},client}={}){
 if(atlas?.schemaVersion!=='autoforge.quest-atlas.v1'||!Array.isArray(atlas.quests))throw Error('Invalid quest atlas');
 if(client)verifyQuestSources({client,sources:atlas.sources});
 const wanted=id(questId),quest=atlas.quests.find(q=>q.id===wanted);if(!quest)throw Error('Quest not present in atlas');
 if(!Array.isArray(bindings)||bindings.length>1000)throw Error('Expected bounded quest bindings');
 if(!object(evidence)||!Array.isArray(evidence.events??[])||(evidence.events??[]).length>100000)throw Error('Invalid quest evidence');
 const conditions=[];
 for(const condition of quest.conditions){
  const candidates=bindings.filter(b=>id(b.conditionType)===condition.type&&(b.conditionId===undefined||id(b.conditionId)===condition.id));
  const result={conditionId:condition.id,conditionType:condition.type,parameters:Object.fromEntries(['Para1','Para2','Para3','Para4'].map(k=>[k,condition.fields[k]??null])),status:'UNVERIFIED',catalogSource:condition.source,firstMissingBoundary:null,findings:[]};
  conditions.push(result);if(candidates.length!==1){result.findings.push(candidates.length?'AMBIGUOUS_BINDINGS':'NO_SEMANTIC_BINDING');continue;}
  const b=candidates[0],resolved=bindingFor(b,condition,atlas);if(!resolved.ready){result.findings.push(resolved.reason);continue;}
  const before=rows(evidence.before,b.projection),after=rows(evidence.after,b.projection);if(!before||!after){result.findings.push('AUTHORITATIVE_BEFORE_AFTER_MISSING');continue;}
  const beforeMap=new Map(),afterMap=new Map();for(const [list,map]of [[before,beforeMap],[after,afterMap]])for(const row of list){const k=key(row);if(k===null||map.has(k))throw Error('Ambiguous projection identity');map.set(k,row);}
  const qualified=new Set();for(const [k,a]of afterMap){const prior=beforeMap.get(k),old=prior?.[b.field],current=a?.[b.field];const value=b.mode==='delta'?(Number.isSafeInteger(old)&&Number.isSafeInteger(current)?current-old:null):current;if(matches(value,b.operator,resolved.target))qualified.add(k);}
  let observed;
  if(b.mode==='state'||b.mode==='delta')observed=qualified.size;
  else{
   const unique=new Set();for(const event of evidence.events??[]){if(event.event!==b.event||event.success!==true||typeof event.sessionId!=='string'||typeof event.requestId!=='string'||!event.sessionId||!event.requestId)continue;const k=id(event.itemId??event.instanceId??event.characterId??event.entityId);if(!qualified.has(k))continue;const old=beforeMap.get(k)?.[b.field],current=afterMap.get(k)?.[b.field];if(b.mutation==='increase'&&!(Number.isSafeInteger(old)&&Number.isSafeInteger(current)&&current>old))continue;if(b.mutation==='changed'&&old===current)continue;unique.add(event.sessionId+'\0'+event.requestId);}observed=unique.size;
  }
  const priorProgress=progress(evidence.before,wanted,condition.id),actualProgress=progress(evidence.after,wanted,condition.id);
  result.binding={mode:b.mode,event:b.event??null,projection:b.projection,field:b.field,operator:b.operator,target:resolved.target,required:resolved.required,mutation:b.mutation??null,sourceRefs:b.sourceRefs,dispatcherId:b.dispatcherId};result.observedQualifying=observed;result.beforeProgress=priorProgress;result.afterProgress=actualProgress;result.expectedMinimumProgress=b.mode==='count'?(priorProgress===null?null:Math.min(resolved.required,priorProgress+observed)):Math.min(resolved.required,observed);
  if(!stamp(evidence.identity)){result.findings.push('COMMIT_ENVIRONMENT_TEST_ID_REQUIRED');continue;}
  if(!atlas.coverage.complete||atlas.coverage.truncated){result.findings.push('INCOMPLETE_CATALOG_SCOPE');continue;}
  if(actualProgress===null||result.expectedMinimumProgress===null){result.firstMissingBoundary='questCounter';result.findings.push('QUEST_COUNTER_READBACK_MISSING');continue;}
  if(actualProgress<result.expectedMinimumProgress){result.status='DIVERGENT_RECORDED';result.firstMissingBoundary='questCounter';result.findings.push('QUALIFYING_MUTATION_NOT_REFLECTED_IN_QUEST_PROGRESS');continue;}
  if(!observed&&b.mode==='count'){result.findings.push('NO_NEW_QUALIFYING_EVENT');result.firstMissingBoundary='mutation';continue;}
  const stages=evidence.stages??{};
  for(const stage of ['s2c','ui','relogin']){if(!stages[stage]||stages[stage].observed!==true||stages[stage].progress!==actualProgress){result.firstMissingBoundary=stage;result.findings.push(stage.toUpperCase()+'_READBACK_MISSING_OR_DIVERGENT');break;}}
  if(!result.firstMissingBoundary){result.status='CONSISTENT_RECORDED';result.findings.push('RECORDED_BOUNDARIES_CONSISTENT_NOT_RUNTIME_ATTESTED');}
 }
 return {schemaVersion:'autoforge.quest-diagnosis.v1',questId:wanted,title:quest.title,sourceDigest:atlas.sourceDigest,identity:evidence.identity??null,evidenceSha256:H(canonical(evidence)),status:conditions.some(c=>c.status==='DIVERGENT_RECORDED')?'DIVERGENT_RECORDED':conditions.length&&conditions.every(c=>c.status==='CONSISTENT_RECORDED')?'CONSISTENT_RECORDED':'UNVERIFIED',conditions,claims:{questCompleted:false,rewardsGranted:false,gameplayIndependentlyVerified:false},next:['Use the observed main-quest namespace, not a coincident ring/reward enum value.','Wire the successful committed gameplay event to the matching condition, then persist the quest counter.','Emit the existing quest S2C, verify UI and relogin readback; reward idempotency is separate.']};
}
