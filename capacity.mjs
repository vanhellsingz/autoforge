import {readFileSync,readdirSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {parseNumeric,emitJava} from './numeric-ast.mjs';

export const STAT_FIELDS = ['power','agility','intel','physi','captain','attack','defence','magicattack','magicdefence','live','conat','forcehit','parry','fireResi','waterResi','windResi','electResi','darkResi','lightResi','reduceResi','defensePenetration','criticalResistance','parryPenetration'];
export const BASE_FIELDS = ['power','intel','physi','agility','captain','attack','magicattack','defence','magicdefence','live','conat','forcehit','parry'];
export const RATE_FIELDS = ['attackRate','magicAttackRate','defenceRate','liveRate','conatRate','forcehitRate','parryRate'];
const METHODS=['calculatePlayerFightCapacity','calculateGuardFightCapacity','calculateRareWeaponFightCapacity'];
const sha=b=>createHash('sha256').update(b).digest('hex');

// Split commas only at depth zero: calls such as Math.floor(a,b) stay intact.
function split(source) {
 let depth=0,start=0; const parts=[];
 for(let i=0;i<source.length;i++) { if(source[i]==='(')depth++; if(source[i]===')')depth--; if(depth<0)throw Error('Unbalanced expression'); if(source[i]===','&&depth===0){parts.push(source.slice(start,i));start=i+1;} }
 if(depth)throw Error('Unbalanced expression'); parts.push(source.slice(start)); return parts;
}

export function extractCapacity(source) {
 return METHODS.map((name,index)=>{
  const matches=[...source.matchAll(new RegExp(name+'\\(t\\)\\{([^{}]*)\\}','g'))];
  if(matches.length!==1)throw Error(`Expected one ${name} definition; got ${matches.length}`);
  const m=matches[0], body=m[1], shape=/^let ([\s\S]+);return ([\s\S]+)$/.exec(body);
  if(!shape)throw Error(`Unsupported control flow in ${name}`);
  const inputs=new Map();
  STAT_FIELDS.forEach((key,i)=>inputs.set('t.'+key,`stats[${i}]`));
  BASE_FIELDS.forEach((key,i)=>inputs.set('this.baseInfo.'+key,`base[${i}]`));
  RATE_FIELDS.forEach((key,i)=>inputs.set('this.'+key,`rates[${i}]`));
  const lines=[];
  for(const declaration of split(shape[1])) {
   const d=/^([a-zA-Z_$][\w$]*)=([\s\S]+)$/.exec(declaration);
   if(!d||inputs.has(d[1]))throw Error(`Unsupported declaration ${declaration}`);
   const local='v'+lines.length;
   lines.push(`double ${local} = ${emitJava(parseNumeric(d[2],inputs))};`);
   inputs.set(d[1],local);
  }
  const returns=split(shape[2]);
  for(const update of returns.slice(0,-1)) {
   const u=/^([\w$]+)\+=([\s\S]+)$/.exec(update);
   if(!u||!inputs.has(u[1])||!/^v\d+$/.test(inputs.get(u[1])))throw Error('Unsupported return side effect');
   lines.push(`${inputs.get(u[1])} += ${emitJava(parseNumeric(u[2],inputs))};`);
  }
  lines.push(`return ${emitJava(parseNumeric(returns.at(-1),inputs))};`);
  return {id:['player','guard','rareWeapon'][index],method:name,java:lines.join('\n        '),source:{start:Buffer.byteLength(source.slice(0,m.index)),end:Buffer.byteLength(source.slice(0,m.index+m[0].length)),sha256:sha(m[0])}};
 });
}

// Independent reviewed transcription. Does not consume AST/emitted expressions.
export function referenceCapacity(kind,stats,base,rates) {
 const t=Object.fromEntries(STAT_FIELDS.map((k,i)=>[k,stats[i]]));
 let extras=2*t.defensePenetration+t.criticalResistance+t.parryPenetration+3*t.reduceResi+2*t.waterResi+2*t.fireResi+2*t.electResi+2*t.windResi+2*t.darkResi+2*t.lightResi;
 if(kind!=='player') {
  if(kind==='rareWeapon')extras+=5*t.power+8*t.agility+5*t.intel+4*t.physi;
  return Math.floor(t.attack+t.magicattack+t.defence+t.magicdefence+Math.floor(t.live/5)+t.conat+t.forcehit+t.parry+extras);
 }
 const b=Object.fromEntries(BASE_FIELDS.map((k,i)=>[k,base[i]])),r=Object.fromEntries(RATE_FIELDS.map((k,i)=>[k,rates[i]]));
 const strength=Math.floor(t.power*b.power/100),intel=Math.floor(t.intel*b.intel/100),phys=Math.floor(t.physi*b.physi/100),agil=Math.floor(t.agility*b.agility/100),capt=Math.floor(t.captain*b.captain/100);
 const attack=Math.floor((strength*r.attackRate+t.attack)*b.attack/100),magic=Math.floor((intel*r.magicAttackRate+t.magicattack)*b.magicattack/100);
 const defense=Math.floor((strength+agil*r.defenceRate+t.defence)*b.defence/100),magicDefense=Math.floor((intel+agil*r.defenceRate+t.magicdefence)*b.magicdefence/100);
 const life=Math.floor((phys*r.liveRate+t.live)*b.live/100),conat=Math.floor((capt*r.conatRate+t.conat)*b.conat/100),hit=Math.floor(r.forcehitRate*t.forcehit*b.forcehit/100),parry=Math.floor(r.parryRate*t.parry*b.parry/100);
 return attack+Math.floor(1.05*magic)+defense+magicDefense+Math.floor(life/5)+conat+hit+parry+extras;
}

export function generateCapacity(clientRoot,outDir) {
 const files=readdirSync(join(clientRoot,'js')).filter(n=>/^bundle_release-[\w-]+\.js$/.test(n));
 if(files.length!==1)throw Error(`Expected one live bundle, got ${files.length}`);
 const path='js/'+files[0],bytes=readFileSync(join(clientRoot,path)),rules=extractCapacity(bytes.toString('utf8'));
 const java=`// Generated by AutoForge v2 from client source. Pure resolved-input formulas only.\npublic final class ClientFightCapacity {\n    private ClientFightCapacity() {}\n${rules.map(rule=>`    public static double ${rule.id}(double[] stats,double[] base,double[] rates) {\n        if(stats.length!=23||base.length!=13||rates.length!=7)throw new IllegalArgumentException("Input shape");\n        ${rule.java}\n    }`).join('\n')}\n}\n`;
 const cases=[];
 cases.push({stats:Array(23).fill(0),base:Array(13).fill(100),rates:Array(7).fill(1)});
 cases.push({stats:Array.from({length:23},(_,i)=>i+1),base:Array(13).fill(100),rates:[4,4,1,20,1,1,1]});
 for(let field=0;field<23;field++){const stats=Array(23).fill(0);stats[field]=-101;cases.push({stats,base:Array(13).fill(100),rates:[4,4,1,20,1,1,1]});}
 let seed=1729; const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
 for(let c=0;c<256;c++)cases.push({stats:Array.from({length:23},()=>random()%10001),base:Array.from({length:13},()=>random()%301),rates:Array.from({length:7},()=>random()%21)});
 const temp=mkdtempSync(join(tmpdir(),'autoforge-capacity-'));
 let comparisons=0;
 try {
  writeFileSync(join(temp,'ClientFightCapacity.java'),java);
  writeFileSync(join(temp,'Compare.java'),`import java.io.*; import java.util.*; class Compare { public static void main(String[] args) throws Exception { var in=new BufferedReader(new InputStreamReader(System.in)); for(String line;(line=in.readLine())!=null;) { var a=Arrays.stream(line.split(" ")).mapToDouble(Double::parseDouble).toArray(); var s=Arrays.copyOfRange(a,0,23); var b=Arrays.copyOfRange(a,23,36); var r=Arrays.copyOfRange(a,36,43); System.out.println(ClientFightCapacity.player(s,b,r)); System.out.println(ClientFightCapacity.guard(s,b,r)); System.out.println(ClientFightCapacity.rareWeapon(s,b,r)); } } }`);
  execFileSync('javac',['--release','21','-d',temp,join(temp,'ClientFightCapacity.java'),join(temp,'Compare.java')],{timeout:30000});
  const rows=execFileSync('java',['-cp',temp,'Compare'],{encoding:'utf8',input:cases.map(c=>[...c.stats,...c.base,...c.rates].join(' ')).join('\n')+'\n',timeout:30000}).trim().split(/\r?\n/).map(Number);
  if(rows.length!==cases.length*3)throw Error('Unexpected Java comparison output');
  cases.forEach((c,i)=>rules.forEach((rule,j)=>{const want=referenceCapacity(rule.id,c.stats,c.base,c.rates),got=rows[i*3+j];if(!Number.isFinite(got)||got!==want)throw Error(`Capacity divergence case=${i} kind=${rule.id} JS=${want} Java=${got}`);comparisons++;}));
 } finally { rmSync(temp,{recursive:true,force:true}); }
 mkdirSync(outDir,{recursive:true});
 writeFileSync(join(outDir,'ClientFightCapacity.java'),java);
 const report={rule:'attributes.fighting-capacity',status:'JAVA_JS_PARITY_PASSED',source:{path,sha256:sha(bytes)},spanConvention:'UTF-8 bytes; start inclusive, end exclusive',rules:rules.map(({java,...r})=>r),inputs:{stats:STAT_FIELDS,basePercentWeights:BASE_FIELDS,rates:RATE_FIELDS},comparison:{cases:comparisons,fixtures:cases.length,mismatches:0,oracle:'Independent reviewed JS transcription; deterministic seed 1729'},generated:{path:'generated/ClientFightCapacity.java',sha256:sha(java)},limitations:['Base weights and conversion rates must be supplied from resolved authoritative character state; no defaults inferred.','Does not aggregate equipment, skills, pets or buffs; their final attribute vectors are inputs.','No database, protocol dispatch or runtime integration is enabled.']};
 writeFileSync(join(outDir,'capacity.evidence.json'),JSON.stringify(report,null,2)+'\n');
 return report;
}
