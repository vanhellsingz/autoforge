// Static MySQL/admin dependency evidence. Does not connect to MySQL or modify schemas.
import {readFileSync,readdirSync,lstatSync,existsSync} from 'node:fs';
import {resolve,join,relative,parse,sep,basename} from 'node:path';
import {createHash} from 'node:crypto';
const LIMIT=24;
const hash=b=>createHash('sha256').update(b).digest('hex');
const slash=p=>p.replaceAll('\\','/');
const profiles=[
 {id:'forge.common.enhancement.gold',files:/^(?:Forge|BagService|InventoryStore)/i,tables:/^(?:characters|character_items|character_currencies|currency_ledger|item_template)$/,terms:/\b(?:inventory|items?|enhance(?:ment)?|strengthen|forge|currency|wallet|gold)\b/i},
 {id:'forge.common.enhancement.rate',files:/^(?:Forge|BagService|InventoryStore)/i,tables:/^(?:characters|character_items|item_template)$/,terms:/\b(?:inventory|items?|enhance(?:ment)?|strengthen|forge|material)\b/i},
 {id:'attributes.fighting-capacity',files:/^(?:EffectiveHero|BareHero|BattleService|Character|JdbcLogin|InventoryStore)/i,tables:/^(?:characters|character_items|item_template|character_skills|character_timed_buffs|character_.*(?:pet|guard|rare|mount).*|character_attributes)$/,terms:/\b(?:character|characters|attribute|attributes|fightingCapacity|equipment|inventory|pet|guard|mount)\b/i},
 {id:'quest.condition.vocabulary',files:/^(?:Tutorial|Campaign|Quest|Progression)/i,tables:/^(?:character_.*(?:quest|campaign|tutorial).*|quest_.*|character_items|character_currencies|characters)$/,terms:/\b(?:quest|quests|campaign|tutorial|reward|rewards)\b/i},
];
function noLinks(path){const abs=resolve(path),r=parse(abs).root;let cur=r;for(const part of abs.slice(r.length).split(sep).filter(Boolean)){cur=join(cur,part);try{if(lstatSync(cur).isSymbolicLink())throw Error('Source link refused: '+cur);}catch(e){if(e.code!=='ENOENT')throw e;}}}
function maskComments(text){return text.replace(/\/\*[\s\S]*?\*\/|--[^\r\n]*/g,s=>s.replace(/[^\r\n]/g,' '));}
const ident='(?:`[A-Za-z_][A-Za-z0-9_$]*`|[A-Za-z_][A-Za-z0-9_$]*)(?:\\s*\\.\\s*(?:`[A-Za-z_][A-Za-z0-9_$]*`|[A-Za-z_][A-Za-z0-9_$]*))?';
const tableName=s=>s.replaceAll('`','').replace(/\s/g,'').toLowerCase();
function sqlRefs(text){const re=new RegExp('\\b(CREATE\\s+TABLE(?:\\s+IF\\s+NOT\\s+EXISTS)?|ALTER\\s+TABLE|DELETE\\s+FROM|FROM|JOIN|UPDATE|INSERT(?:\\s+IGNORE)?\\s+INTO)\\s+('+ident+')','gi');return [...maskComments(text).matchAll(re)].filter(m=>!(m[1].toUpperCase()==='UPDATE'&&/ON\s+DUPLICATE\s+KEY\s*$/i.test(text.slice(0,m.index)))).map(m=>({index:m.index,table:tableName(m[2]),operation:m[1].replace(/\s+/g,' ').toUpperCase()})).filter(x=>!['select','set'].includes(x.table));}
function javaLiterals(text){const tokens=/\/\*[\s\S]*?\*\/|\/\/[^\r\n]*|"""[\s\S]*?"""|"(?:\\.|[^"\\])*"/g;const out=[];for(const m of text.matchAll(tokens)){if(m[0].startsWith('/'))continue;const triple=m[0].startsWith('"""');const value=m[0].slice(triple?3:1,triple?-3:-1).replace(/\\n/g,'\n').replace(/\\r/g,'\r').replace(/\\t/g,'\t').replace(/\\"/g,'"');out.push({index:m.index,text:value});}return out;}
export function scanDataAdmin(backendRoot){
 const root=resolve(backendRoot);noLinks(root);
 const javaDir=join(root,'apps/game-server/src/main/java');if(!existsSync(javaDir))throw Error('Backend Java source directory missing: '+javaDir);
 const all=[],skippedLinks=[],warnings=[];
 function walk(dir,ext,kind){if(!existsSync(dir)){warnings.push('Missing optional source directory: '+slash(relative(root,dir)));return;}noLinks(dir);for(const e of readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en'))){const path=join(dir,e.name);if(e.isSymbolicLink()){skippedLinks.push(slash(relative(root,path)));continue;}if(e.isDirectory()){if(!['target','dist','node_modules','.git'].includes(e.name))walk(path,ext,kind);}else if(e.isFile()&&ext.test(e.name))all.push({path,kind});}}
 walk(javaDir,/\.java$/,'java');walk(join(root,'apps/game-server/src/main/resources/db/migration'),/^V[0-9][^/]*\.sql$/,'migration');walk(join(root,'apps/admin-web/src'),/\.(?:ts|tsx)$/,'admin_ui');
 const sources=[],rules=profiles.map(p=>({id:p.id,tables:[],admin:[],handlers:[],migrations:[],counts:{tables:0,admin:0,handlers:0,migrations:0}}));
 const sqlByRule=profiles.map(()=>new Set()),migrations=[];
 function add(rule,key,e){rule.counts[key]++;if(rule[key].length<LIMIT)rule[key].push(e);}
 for(const f of all){const bytes=readFileSync(f.path),text=bytes.toString('utf8'),path=slash(relative(root,f.path)),sha256=hash(bytes),lines=text.split(/\r?\n/);sources.push({path,sha256,bytes:bytes.length,kind:f.kind});
  function ev(index,kind,extra={}){const line=text.slice(0,index).split('\n').length;return {path,line,sha256,kind,snippet:lines[line-1].trim().slice(0,320),...extra};}
  if(f.kind==='migration'){for(const ref of sqlRefs(text).filter(r=>r.operation.startsWith('CREATE TABLE')||r.operation==='ALTER TABLE'))migrations.push(ev(ref.index,'migration_ddl',{table:ref.table,operation:ref.operation}));continue;}
  for(let i=0;i<profiles.length;i++){const p=profiles[i],r=rules[i],service=p.files.test(basename(f.path));
   if(f.kind==='java'&&service){for(const literal of javaLiterals(text)){if(!/^\s*(?:SELECT\b|INSERT\s+(?:IGNORE\s+)?INTO\b|UPDATE\s+[^;]+?\s+SET\b|DELETE\s+FROM\b|WITH\b|FROM\b|JOIN\b)/i.test(literal.text))continue;for(const ref of sqlRefs(literal.text)){const entry=ev(literal.index,'sql_literal_reference',{table:ref.table,operation:ref.operation,authority:'STATIC_SQL_LITERAL',relation:'SAME_CANDIDATE_SERVICE_FILE_NOT_PROVEN_RULE_PATH'});sqlByRule[i].add(ref.table);add(r,'tables',entry);}}}
   const admin=f.kind==='admin_ui'||path.includes('/admin/')||/Controller\.java$/.test(path);
   if(admin){for(let n=0;n<lines.length;n++){const line=lines[n];if(p.terms.test(line))add(r,'admin',{path,line:n+1,sha256,kind:f.kind==='admin_ui'?'admin_ui_candidate':'admin_java_candidate',snippet:line.trim().slice(0,320),authority:'LEXICAL_CANDIDATE'});}}
   if(f.kind==='java'&&(service||/GameLoginHandler\.java$/.test(path))){for(let n=0;n<lines.length;n++){const line=lines[n];if((/@(?:Get|Post|Put|Patch|Delete|Request)Mapping\b/.test(line)||/\bcase\s+Opcodes\.|\b(?:public|private|protected)\b.*\(/.test(line))&&(service||p.terms.test(line))){add(r,'handlers',{path,line:n+1,sha256,kind:line.includes('Mapping')?'route_annotation_candidate':'handler_candidate',snippet:line.trim().slice(0,320),authority:'LEXICAL_CANDIDATE'});}}}
  }
 }
 for(let i=0;i<profiles.length;i++)for(const migration of migrations){const name=migration.table.split('.').at(-1);if([...sqlByRule[i]].some(t=>t.split('.').at(-1)===name))add(rules[i],'migrations',{...migration,match:'OBSERVED_SQL_TABLE_NAME'});else if(profiles[i].tables.test(name))add(rules[i],'migrations',{...migration,match:'PROFILE_TABLE_CANDIDATE'});}
 return {schemaVersion:'autoforge.data-admin-map.v2.3',mode:'static-read-only',adminEvidencePolicy:{location:'STATIC_CANDIDATE',writeCorrectness:'NOT_TESTED',removalAuthorizedByMissingEvidence:false},filesScanned:all.length,sources,rules:rules.map((r,i)=>({...r,referencedTableNames:[...sqlByRule[i]].sort(),truncation:Object.fromEntries(Object.entries(r.counts).map(([key,count])=>[key,{count,limit:LIMIT,truncated:count>r[key].length}]))})),skippedLinks,warnings,gaps:[
  'Migrations describe repository DDL, not the live MySQL schema or applied Flyway versions. Inspect flyway_schema_history in the authorized deployment environment.',
  'SQL literals and table names are static references. Dynamically constructed SQL, ORM mappings, joins split across constants and other services may be unresolved.',
  'Admin UI/controller matches are candidates, not proof of a functioning editor or authorized endpoint. Verify route composition, DTOs, permissions, audit and service wiring.',
  'No database connection, credentials/configuration read, migration, permission grant or admin mutation is performed.',
 ]};
}
