// Read-only integration hints. A reference is not proof that a gameplay path works.
import {readFileSync,readdirSync,lstatSync,existsSync} from 'node:fs';
import {resolve,join,relative,parse,sep} from 'node:path';
import {createHash} from 'node:crypto';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const posix=path=>path.replaceAll('\\','/');
const LIMIT=24;
const PROFILES=[
 {id:'forge.common.enhancement.gold',symbol:'ForgeEnhancementCost',classes:['ForgeStrengthenService','BagService'],terms:['strengthen','enhancement','forgeCost','getIntensifuGold']},
 {id:'forge.common.enhancement.rate',symbol:'ForgeEnhancementRules',classes:['ForgeStrengthenService','BagService'],terms:['strengthen','successRate','UNOBSERVED_SLOT_BONUS','canIntensify']},
 {id:'attributes.fighting-capacity',symbol:'ClientFightCapacity',classes:['EffectiveHeroAttributeService','BareHeroAttributes','BattleService','GameLoginHandler'],terms:['fightingCapacity','effectiveHeroAttributes','calculate','power']},
 {id:'quest.condition.vocabulary',symbol:'QuestConditionType',classes:['TutorialProgressionService','CampaignProgressionService','TutorialService','CampaignRunService','GameLoginHandler'],terms:['CondictionType','conditionType','syncQuests','quest','condition']},
];

function noLinks(path) {
 const absolute=resolve(path),root=parse(absolute).root;let current=root;
 for(const part of absolute.slice(root.length).split(sep).filter(Boolean)) {
  current=join(current,part);
  if(existsSync(current)&&lstatSync(current).isSymbolicLink())throw Error(`Backend symlink/junction refused: ${current}`);
 }
}

// Preserve source character and newline positions while masking comments/literals.
// This is a lexical search aid; it is not a Java compiler or call-graph analysis.
function codeOnly(text) {
 return text.replace(/\/\*[\s\S]*?\*\/|\/\/[^\r\n]*|"""[\s\S]*?"""|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g,
  token=>token.replace(/[^\r\n]/g,' '));
}
function dependency(qualified) {
 if(qualified.startsWith('com.wartuneultra.autoforge.v2.'))return 'isolated_v2';
 if(qualified.startsWith('com.wartuneultra.autoforge.'))return 'current_package';
 return 'unresolved_package';
}

export function scanBackend(backendRoot) {
 const root=resolve(backendRoot);noLinks(root);
 const sourceRoot=join(root,'apps/game-server/src/main/java');noLinks(sourceRoot);
 if(!existsSync(sourceRoot)||!lstatSync(sourceRoot).isDirectory())throw Error(`Backend Java source directory missing: ${sourceRoot}`);
 const files=[],skipped=[];
 function walk(directory) {
  for(const entry of readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en'))) {
   const path=join(directory,entry.name),rel=posix(relative(root,path));
   if(entry.isSymbolicLink()) {skipped.push(rel);continue;}
   if(entry.isDirectory()) {
    if(['target','generated'].includes(entry.name)||rel.endsWith('/com/wartuneultra/autoforge'))continue;
    walk(path);
   } else if(entry.isFile()&&entry.name.endsWith('.java'))files.push(path);
  }
 }
 walk(sourceRoot);
 const rules=PROFILES.map(p=>({id:p.id,symbol:p.symbol,references:[],candidates:[],referenceCount:0,candidateCount:0}));
 const sources=[],warnings=[];
 for(const path of files) {
  const bytes=readFileSync(path),text=bytes.toString('utf8'),sha256=hash(bytes),rel=posix(relative(root,path));
  sources.push({path:rel,sha256,bytes:bytes.length});
  // Java processes unicode escapes before tokenization. Do not claim lexical
  // evidence for such files; a Java parser is required to resolve them safely.
  if(/\\u+[0-9a-fA-F]{4}/.test(text)){warnings.push(`Unicode escape syntax requires manual review: ${rel}`);continue;}
  const code=codeOnly(text),rawLines=text.split(/\r?\n/),lines=code.split(/\r?\n/);
  const imports=new Map();
  for(const m of code.matchAll(/\bimport\s+(?:static\s+)?(com\.wartuneultra\.autoforge(?:\.v2)?\.([A-Za-z_$][\w$]*))(?:\.[A-Za-z_$*][\w$]*)?\s*;/g))imports.set(m[2],dependency(m[1]));
  for(let p=0;p<PROFILES.length;p++) {
   const profile=PROFILES[p],rule=rules[p],isCandidateClass=profile.classes.some(name=>new RegExp(`\\b(?:class|record|interface|enum)\\s+${name}\\b`).test(code));
   const matcher=new RegExp(`\\b(?:com\\.wartuneultra\\.autoforge(?:\\.v2)?\\.)?${profile.symbol}\\b`,'g');
   for(let n=0;n<lines.length;n++) {
    const line=lines[n],matches=[...line.matchAll(matcher)];
    if(matches.length&&!new RegExp(`\\b(?:class|record|interface|enum)\\s+${profile.symbol}\\b`).test(line)) {
     const match=matches[0],qualified=match[0].includes('.')?dependency(match[0]):imports.get(profile.symbol)??'unresolved_package';
     const after=line.slice(match.index+match[0].length);
     const kind=/\bimport\s/.test(line)?'import':/^\s*\.\s*\w+\s*\(/.test(after)?'call':'type_reference';
     rule.referenceCount++;
     if(rule.references.length<LIMIT)rule.references.push({path:rel,line:n+1,sha256,kind,dependency:qualified,symbol:profile.symbol,snippet:rawLines[n].trim().slice(0,320)});
    }
    if(isCandidateClass&&profile.terms.some(term=>new RegExp(`\\b${term}\\b`,'i').test(line))) {
     rule.candidateCount++;
     if(rule.candidates.length<LIMIT)rule.candidates.push({path:rel,line:n+1,sha256,kind:'candidate',snippet:rawLines[n].trim().slice(0,320)});
    }
   }
   if(isCandidateClass&&!rule.candidates.some(c=>c.path===rel)) {
    const n=lines.findIndex(line=>profile.classes.some(name=>new RegExp(`\\b(?:class|record|interface|enum)\\s+${name}\\b`).test(line)));
    rule.candidateCount++;
    if(rule.candidates.length<LIMIT)rule.candidates.push({path:rel,line:n+1,sha256,kind:'candidate_class',snippet:rawLines[n].trim().slice(0,320)});
   }
  }
 }
 return {schemaVersion:'autoforge.backend-map.v2.2',mode:'static-read-only',filesScanned:files.length,sources,
  rules:rules.map(r=>({...r,status:r.referenceCount?'REFERENCES_FOUND':r.candidateCount?'CANDIDATES_ONLY':'UNRESOLVED',
   truncation:{limitPerList:LIMIT,references:r.referenceCount>r.references.length,candidates:r.candidateCount>r.candidates.length}})),
  skippedLinks:skipped,warnings,gaps:[
   'References and imports are static facts only; they do not prove the method is executed or gameplay is integrated.',
   'Candidates use known service/class names and identifiers. Different architecture, wildcard imports, aliases and reflective calls require manual investigation.',
   'Generated AutoForge packages are excluded to avoid counting definitions as consumers. No database, configuration or secret files are read.',
  ]};
}
