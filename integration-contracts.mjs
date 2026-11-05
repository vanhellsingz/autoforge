// Static, conservative method and protocol contracts. No runtime success inferred.
import {readFileSync,existsSync,lstatSync} from 'node:fs';
import {resolve,join,relative,isAbsolute,sep,parse} from 'node:path';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
const LOGIN='apps/game-server/src/main/java/com/wartuneultra/server/login/GameLoginHandler.java';
const OPCODES='modules/protocol-legacy/src/main/java/com/wartuneultra/protocol/Opcodes.java';
const ids=['forge.common.enhancement.gold','forge.common.enhancement.rate','attributes.fighting-capacity','quest.condition.vocabulary'];
const selections={
 'forge.common.enhancement.gold':{names:['C_ITEM_STRENGTHEN','U_C_BAG_MOVE_UPDATE','U_C_PLAYER_INFO'],handlers:['handleItemStrengthen'],attributes:['NeedGrades','Profile','strengthenGrade','StrengthenMax','gold','persisted forge slots']},
 'forge.common.enhancement.rate':{names:['C_ITEM_STRENGTHEN','U_C_BAG_MOVE_UPDATE','U_C_PLAYER_INFO'],handlers:['handleItemStrengthen'],attributes:['strengthenGrade','material Property1','StrengthenMax','gold','controlled RNG']},
 'attributes.fighting-capacity':{names:['C_BAG_MOVE','C_BAG_USEITEM','U_C_HERO_INFO','U_C_BAG_MOVE_UPDATE','U_C_PLAYER_INFO','C_ARMY_UPDATE_GRID'],handlers:['handleBagMove','handleBagUse','bagResponses','heroCard'],attributes:['resolved primary attributes','equipment and passive contributions','base percent weights','conversion rates','resistances']},
 'quest.condition.vocabulary':{names:['U_QUEST_UPDATED','U_C_QUEST_UPDATED'],handlers:['bagResponses'],attributes:['CondictionType','Para1..Para4','quest event type','persisted progress','reward idempotency']}
};
function masked(text){return text.replace(/\/\*[\s\S]*?\*\/|\/\/[^\r\n]*|"""[\s\S]*?"""|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g,s=>s.replace(/[^\r\n]/g,' '));}
function paired(code,at,open,close){let depth=0;for(let i=at;i<code.length;i++){if(code[i]===open)depth++;else if(code[i]===close&&--depth===0)return i;}return -1;}
const lineAt=(text,offset)=>text.slice(0,offset).split('\n').length;
export function extractJavaMethods(text){
 if(/\\u+[0-9a-fA-F]{4}/.test(text))return [];
 const code=masked(text),methods=[];
 for(const m of code.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)){
  const name=m[1];if(['if','for','while','switch','catch','synchronized','try','new','return','throw','this','super'].includes(name))continue;
  const paren=code.indexOf('(',m.index),endParams=paired(code,paren,'(',')');if(endParams<0)continue;
  const after=code.slice(endParams+1),tail=/^\s*(?:throws\s+[\w$.,\s]+)?\s*\{/.exec(after);if(!tail)continue;
  const open=endParams+1+tail[0].lastIndexOf('{');
  let start=m.index;while(start>0&&!';{}'.includes(code[start-1]))start--;
  let prefix=code.slice(start,m.index).trim().replace(/@[\w$.]+(?:\([^)]*\))?\s*/g,'').trim();
  if(!prefix||/\b(new|class|record|interface|enum|return|throw|case)\b|=|->/.test(prefix))continue;
  if(!/^(?:(?:public|private|protected|static|final|synchronized|abstract|native|strictfp|default)\s+)*(?:<[^;{}]+>\s+)?(?:[\w$]+(?:\.[\w$]+)*(?:<[^;{}]*>)?(?:\[\])?\s*)?$/.test(prefix))continue;
  const end=paired(code,open,'{','}');if(end<0)continue;
  while(start<m.index&&/\s/.test(code[start]))start++;
  methods.push({method:name,signature:text.slice(start,open).trim().replace(/\s+/g,' '),startLine:lineAt(text,start),endLine:lineAt(text,end),start,end:end+1,bodyStart:open,bodySha256:hash(text.slice(open,end+1))});
 }
 return methods;
}
function safe(root,path){
 const full=resolve(root,path),rel=relative(root,full);if(!rel||rel==='..'||rel.startsWith('..'+sep)||isAbsolute(rel))throw Error('Contract source path escapes backend');
 let current=parse(full).root;for(const part of full.slice(current.length).split(sep).filter(Boolean)){current=join(current,part);if(existsSync(current)&&lstatSync(current).isSymbolicLink())throw Error('Contract source symlink refused');}
 return full;
}
export function scanContracts(backendRoot,backendMap){
 const root=resolve(backendRoot),cache=new Map(),gaps=[];
 function load(path){if(cache.has(path))return cache.get(path);const full=safe(root,path);if(!existsSync(full))return null;const bytes=readFileSync(full),text=bytes.toString('utf8'),value={path,text,code:masked(text),sha256:hash(bytes),methods:extractJavaMethods(text)};cache.set(path,value);return value;}
 const login=load(LOGIN),opcodes=load(OPCODES);
 if(!login)gaps.push('GameLoginHandler source missing; dispatch and responses unresolved.');
 if(!opcodes)gaps.push('Opcodes source missing; no opcode values invented.');
 function methodEvidence(source,method){return {path:source.path,method:method.method,signature:method.signature,startLine:method.startLine,endLine:method.endLine,sha256:source.sha256,bodySha256:method.bodySha256};}
 const constants=[];
 if(opcodes){for(const m of opcodes.code.matchAll(/\b(?:public\s+)?static\s+final\s+int\s+([A-Z][A-Z0-9_]*)\s*=\s*(\d+)\s*;/g)){constants.push({name:m[1],value:Number(m[2]),path:OPCODES,line:lineAt(opcodes.text,m.index),sha256:opcodes.sha256});}}
 const rules=ids.map(id=>{
  const p=selections[id],mapped=backendMap?.rules?.find(r=>r.id===id),methods=[],unresolved=[];
  const keys=new Set();
  for(const ref of [...(mapped?.references??[]),...(mapped?.candidates??[])]){
   if(ref.path.includes('/com/wartuneultra/autoforge/'))continue;
   const source=load(ref.path);if(!source){unresolved.push({...ref,reason:'SOURCE_MISSING'});continue;}
   if(ref.sha256&&ref.sha256!==source.sha256){unresolved.push({...ref,reason:'SOURCE_CHANGED_SINCE_BACKEND_MAP'});continue;}
   const containing=source.methods.filter(m=>m.startLine<=ref.line&&m.endLine>=ref.line).sort((a,b)=>(a.end-a.start)-(b.end-b.start))[0];
   if(!containing){unresolved.push({path:ref.path,line:ref.line,reason:'NO_SUPPORTED_CONTAINING_METHOD'});continue;}
   const key=ref.path+':'+containing.start;if(keys.has(key))continue;keys.add(key);methods.push(methodEvidence(source,containing));
  }
  const handlers=[];
  if(login){for(const method of login.methods.filter(m=>p.handlers.includes(m.method))){const body=login.text.slice(method.bodyStart,method.end),bodyCode=login.code.slice(method.bodyStart,method.end);handlers.push({...methodEvidence(login,method),messages:[...new Set([...bodyCode.matchAll(/\bnew\s+([A-Za-z_$][\w$.]*Msg)\s*\(/g)].map(m=>m[1]))],evidence:'static_method_body'});}}
  const protocol=constants.filter(c=>p.names.includes(c.name)).map(c=>{
   const caseRegex=new RegExp('\\bcase\\s+Opcodes\\.'+c.name+'\\s*->\\s*([\\w$]+)\\s*\\('),dispatch=login&&caseRegex.exec(login.code);
   const replyRegex=new RegExp('\\brespond\\s*\\(\\s*frame\\s*,\\s*Opcodes\\.'+c.name+'\\b'),response=login&&replyRegex.exec(login.code);
   return {...c,direction:dispatch?'C2S':response?'S2C':'UNRESOLVED',directionConfidence:dispatch?'incoming_dispatch_case':response?'outgoing_respond_call':'enum_value_only',...(dispatch?{handler:dispatch[1],dispatch:{path:LOGIN,line:lineAt(login.text,dispatch.index),sha256:login.sha256}}:{}),...(response?{response:{path:LOGIN,line:lineAt(login.text,response.index),sha256:login.sha256}}:{})};
  });
  // Literal response values have no enum name: record only values actually observed in selected handlers.
  if(login){for(const h of handlers){const method=login.methods.find(m=>m.startLine===h.startLine&&m.method===h.method);for(const m of login.code.slice(method.bodyStart,method.end).matchAll(/\brespond\s*\(\s*frame\s*,\s*(\d+)\s*,/g)){protocol.push({name:null,value:Number(m[1]),path:LOGIN,line:lineAt(login.text,method.bodyStart+m.index),sha256:login.sha256,direction:'S2C',directionConfidence:'outgoing_literal_respond_call',handler:h.method});}}}
  return {id,methods,handlers,protocol,attributes:p.attributes,unresolved,limits:['Java method extraction is lexical and conservative; unsupported signatures remain unresolved.','Protocol entries are static observations, not captured or validated messages.','Handler messages list only direct new *Msg constructors and is incomplete for builders/delegation.']};
 });
 return {schemaVersion:'autoforge.integration-contracts.v2.3',mode:'static-read-only',rules,sources:[...cache.values()].map(({path,sha256})=>({path,sha256})),gaps};
}
