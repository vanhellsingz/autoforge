// Bounded contract compiler. Emits a usable transaction core, never installs/deploys it.
import {readFileSync,writeFileSync,mkdirSync,existsSync,lstatSync} from 'node:fs';
import {join,resolve,relative,dirname,sep,isAbsolute,parse} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {extractJavaMethods} from '../integration-contracts.mjs';
import {assertOutside} from '../plus/lib.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const HASH=/^[a-f0-9]{64}$/i,COMMIT=/^[a-f0-9]{40,64}$/i;
const KEY=/^[A-Za-z0-9_.:-]{1,80}$/;
const KEYWORDS=new Set(('abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while true false null record sealed permits var yield module open requires exports').split(' '));
function identifier(s){return typeof s==='string'&&/^[A-Za-z][A-Za-z0-9_]*$/.test(s)&&!KEYWORDS.has(s);}
function exactFields(value,allowed,label){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!allowed.includes(k)))throw Error(`Unsupported ${label} field`);}
function noLinks(p){const full=resolve(p);let at=parse(full).root;for(const part of full.slice(at.length).split(sep).filter(Boolean)){at=join(at,part);if(existsSync(at)&&lstatSync(at).isSymbolicLink())throw Error('Contract path links refused');}}
function relativeFile(root,path){if(typeof path!=='string'||!path||isAbsolute(path)||path.includes('\\'))throw Error('Expected source must use a relative slash path');const full=resolve(root,path),r=relative(root,full);if(!r||r==='..'||r.startsWith('..'+sep)||isAbsolute(r))throw Error('Source escapes backend');noLinks(full);if(!existsSync(full)||!lstatSync(full).isFile()||lstatSync(full).size>32*1024*1024)throw Error('Missing or oversized backend source');return full;}
export function validateContract(c){
 exactFields(c,['schemaVersion','id','packageName','className','requestOpcode','responseOpcode','amount','deltas','evidence','backend'],'contract');
 if(!c||c.schemaVersion!==1||!KEY.test(c.id??'')||!identifier(c.className)||c.className.length>80||typeof c.packageName!=='string'||c.packageName.split('.').some(p=>!identifier(p)))throw Error('Invalid contract identity or Java identifier');
 if(['State','Receipt','Transition','Transactions'].includes(c.className))throw Error('Class name collides with generated type');
 for(const field of ['requestOpcode','responseOpcode'])if(!Number.isInteger(c[field])||c[field]<1||c[field]>0x7fffffff)throw Error('Explicit positive protocol opcodes required');
 exactFields(c.amount,['min','max'],'amount');if(!c.amount||!Number.isSafeInteger(c.amount.min)||!Number.isSafeInteger(c.amount.max)||c.amount.min<1||c.amount.max<c.amount.min||c.amount.max>1000000)throw Error('amount bounds must be 1..1000000');
 if(!Array.isArray(c.deltas)||!c.deltas.length||c.deltas.length>64)throw Error('Contract needs 1..64 explicit deltas');
 const seen=new Set();for(const d of c.deltas){exactFields(d,['domain','key','perUnit'],'delta');const k=`${d.domain}:${d.key}`;if(!['inventory','currencies','attributes'].includes(d.domain)||!KEY.test(d.key??'')||!Number.isSafeInteger(d.perUnit)||d.perUnit===0||Math.abs(d.perUnit)>1000000||seen.has(k))throw Error('Invalid, duplicate or unsupported delta');seen.add(k);}
 if(!Array.isArray(c.evidence)||!c.evidence.length||c.evidence.some(e=>typeof e.path!=='string'||!e.path.trim()||!HASH.test(e.sha256??'')))throw Error('Explicit source evidence with SHA256 required');
 if(c.backend){if(!COMMIT.test(c.backend.commit??'')||!Array.isArray(c.backend.sources)||!c.backend.sources.length||!Array.isArray(c.backend.targets)||!c.backend.targets.length)throw Error('Backend binding needs commit, source hashes and targets');for(const s of c.backend.sources)if(typeof s.path!=='string'||!HASH.test(s.sha256??''))throw Error('Invalid backend source hash');for(const t of c.backend.targets)if(!identifier(t.method)||typeof t.path!=='string'||!c.backend.sources.some(s=>s.path===t.path))throw Error('Every exact target requires a bound source hash');}
 return c;
}
function inspectBackend(c,backend){
 if(!backend)return {status:'BACKEND_REQUIRED',commit:null,targets:[],sources:[]};
 noLinks(backend);if(!c.backend)throw Error('Backend supplied without an exact backend binding in contract');
 let commit;try{commit=execFileSync('git',['-C',backend,'rev-parse','HEAD'],{encoding:'utf8',timeout:10000,stdio:['ignore','pipe','pipe']}).trim();}catch{throw Error('Cannot verify backend commit');}
 if(commit.toLowerCase()!==c.backend.commit.toLowerCase())throw Error('Backend commit stale');
 const sources=c.backend.sources.map(s=>{const file=relativeFile(backend,s.path),bytes=readFileSync(file);if(hash(bytes)!==s.sha256.toLowerCase())throw Error(`Backend source stale: ${s.path}`);return {...s,text:bytes.toString('utf8')};});
 const targets=c.backend.targets.map(t=>{const source=sources.find(s=>s.path===t.path);const methods=extractJavaMethods(source.text).filter(m=>m.method===t.method);if(methods.length!==1)throw Error(`Target missing or overloaded; resolve exact integration: ${t.path}:${t.method}`);const m=methods[0];return {...t,sha256:source.sha256,signature:m.signature,startLine:m.startLine,endLine:m.endLine,bodySha256:m.bodySha256};});
 return {status:'BOUND_TO_EXACT_CHECKOUT',commit,sources:sources.map(({text,...s})=>s),targets};
}
function sources(c,contractHash){
 const name=c.className,handler=name+'Handler',test=name+'Test';
 const mutations=c.deltas.map(d=>`        change(${d.domain}, "${d.key}", Math.multiplyExact(${d.perUnit}L, amount));`).join('\n');
 const seed=c.deltas.map(d=>`        ${d.domain}.put("${d.key}", ${Math.abs(d.perUnit)*c.amount.min+10}L);`).join('\n');
 const expected=c.deltas.map(d=>`        check(first.state().${d.domain}().get("${d.key}") == before.${d.domain}().get("${d.key}") + ${d.perUnit}L * ${c.amount.min}L, "delta ${d.key}");`).join('\n');
 const negative=c.deltas.find(d=>d.perUnit<0),positive=c.deltas.find(d=>d.perUnit>0);
 const service=`package ${c.packageName};

import java.util.Map;
import java.util.HashMap;
import java.util.Objects;

/** Generated from reviewed bounded contract ${c.id}; contract SHA256 ${contractHash}.
 * Production adapter MUST provide one database transaction, row locking/version checks,
 * persisted idempotency and atomic commit of every map plus its result. No DB adapter is inferred.
 */
public final class ${name} {
    public static final String CONTRACT_SHA256 = "${contractHash}";
    public record State(Map<String,Long> inventory, Map<String,Long> currencies, Map<String,Long> attributes) {
        public State { inventory=valid(inventory); currencies=valid(currencies); attributes=valid(attributes); }
        private static Map<String,Long> valid(Map<String,Long> values) {
            Objects.requireNonNull(values); for (var entry: values.entrySet())
                if (entry.getKey()==null || entry.getValue()==null || entry.getValue()<0) throw new IllegalArgumentException("Negative/null state");
            return Map.copyOf(values);
        }
    }
    public record Receipt(State state, boolean replayed) { public Receipt { Objects.requireNonNull(state); } }
    @FunctionalInterface public interface Transition { State apply(State before); }
    public interface Transactions {
        // MUST return the persisted original result on replay; reject a different fingerprint for the same key.
        Receipt execute(long characterId, String idempotencyKey, String fingerprint, Transition transition);
    }
    private final Transactions transactions;
    public ${name}(Transactions transactions) { this.transactions=Objects.requireNonNull(transactions); }
    public Receipt execute(long characterId, String operationId, long amount) {
        if(characterId<=0 || operationId==null || !operationId.matches("[A-Za-z0-9_.:-]{1,128}")) throw new IllegalArgumentException("Invalid identity");
        if(amount<${c.amount.min}L || amount>${c.amount.max}L) throw new IllegalArgumentException("Amount outside contract");
        String fingerprint=CONTRACT_SHA256+":"+amount;
        return transactions.execute(characterId,operationId,fingerprint,before -> transition(before,amount));
    }
    private static State transition(State before,long amount) {
        var inventory=new HashMap<>(before.inventory()); var currencies=new HashMap<>(before.currencies()); var attributes=new HashMap<>(before.attributes());
${mutations}
        return new State(inventory,currencies,attributes);
    }
    private static void change(Map<String,Long> values,String key,long delta) {
        long next=Math.addExact(values.getOrDefault(key,0L),delta);
        if(next<0) throw new IllegalStateException("Insufficient value: "+key);
        values.put(key,next);
    }
}
`;
 const handle=`package ${c.packageName};

import java.util.Objects;
/** Typed dispatch boundary. Existing protobuf decoder/authentication/session ownership and S2C encoding must wrap it. */
public final class ${handler} {
    public static final int C2S=${c.requestOpcode}, S2C=${c.responseOpcode};
    public record Request(long characterId,String operationId,long amount) {}
    public record Response(int opcode,${name}.Receipt receipt) {}
    private final ${name} service;
    public ${handler}(${name} service){this.service=Objects.requireNonNull(service);}
    public Response handle(int opcode,Request request){
        if(opcode!=C2S)throw new IllegalArgumentException("Wrong request opcode");
        Objects.requireNonNull(request);
        return new Response(S2C,service.execute(request.characterId(),request.operationId(),request.amount()));
    }
}
`;
 const tests=`package ${c.packageName};

import java.util.Map;
import java.util.HashMap;
/** Standalone TOOL TEST adapter only. This is not MariaDB persistence or gameplay evidence. */
public final class ${test} {
    static final class MemoryTransactions implements ${name}.Transactions {
        ${name}.State current; final Map<String,String> fingerprints=new HashMap<>(); final Map<String,${name}.Receipt> receipts=new HashMap<>();
        MemoryTransactions(${name}.State initial){current=initial;}
        public synchronized ${name}.Receipt execute(long id,String key,String fp,${name}.Transition transition){
            String k=id+":"+key;
            if(receipts.containsKey(k)){if(!fp.equals(fingerprints.get(k)))throw new IllegalArgumentException("Idempotency conflict"); return new ${name}.Receipt(receipts.get(k).state(),true);}
            var next=transition.apply(current); var receipt=new ${name}.Receipt(next,false);
            current=next; fingerprints.put(k,fp); receipts.put(k,receipt); return receipt;
        }
    }
    static void check(boolean result,String message){if(!result)throw new AssertionError(message);}
    static void reject(Runnable action){boolean rejected=false;try{action.run();}catch(IllegalArgumentException|IllegalStateException|ArithmeticException e){rejected=true;}check(rejected,"Expected rejection");}
    public static void main(String[] args){
        var inventory=new HashMap<String,Long>();var currencies=new HashMap<String,Long>();var attributes=new HashMap<String,Long>();
${seed}
        var before=new ${name}.State(inventory,currencies,attributes);var tx=new MemoryTransactions(before);var service=new ${name}(tx);var dispatch=new ${handler}(service);
        var response=dispatch.handle(${handler}.C2S,new ${handler}.Request(7,"first",${c.amount.min}L));var first=response.receipt();
        check(response.opcode()==${handler}.S2C,"Response opcode");check(!first.replayed(),"First mutation");
${expected}
        var replay=service.execute(7,"first",${c.amount.min}L);check(replay.replayed(),"Replay marked");check(replay.state().equals(first.state()),"Replay original result");check(tx.current.equals(first.state()),"Replay did not mutate");
        reject(()->service.execute(0,"invalid",${c.amount.min}L));reject(()->service.execute(7,"low",0));reject(()->service.execute(7,"high",${c.amount.max+1}L));
        reject(()->dispatch.handle(0,new ${handler}.Request(7,"bad",${c.amount.min}L)));
${c.amount.min<c.amount.max?`        reject(()->service.execute(7,"first",${c.amount.min+1}L));`:''}
${negative?`        var insufficient=new MemoryTransactions(new ${name}.State(Map.of(),Map.of(),Map.of()));var saved=insufficient.current;
        reject(()->new ${name}(insufficient).execute(7,"insufficient",${c.amount.min}L));check(insufficient.current.equals(saved)&&insufficient.receipts.isEmpty(),"Failure rolled back");`:''}
${positive?`        var maxInventory=new HashMap<>(before.inventory());var maxCurrencies=new HashMap<>(before.currencies());var maxAttributes=new HashMap<>(before.attributes());
        max${positive.domain[0].toUpperCase()+positive.domain.slice(1)}.put("${positive.key}",Long.MAX_VALUE);
        var overflow=new MemoryTransactions(new ${name}.State(maxInventory,maxCurrencies,maxAttributes));var original=overflow.current;
        reject(()->new ${name}(overflow).execute(7,"overflow",${c.amount.min}L));check(overflow.current.equals(original),"Overflow rolled back");`:''}
        System.out.println("CONTRACT_TEST_PASSED ${c.id}; scope=GENERATED_IN_MEMORY_TEST_ONLY");
    }
}
`;
 return {[name+'.java']:service,[handler+'.java']:handle,[test+'.java']:tests};
}
export function generateImplementation({contract,backend,out}){
 const contractFile=typeof contract==='string'?resolve(contract):null;
 const c=validateContract(contractFile?JSON.parse(readFileSync(contractFile,'utf8')):contract);
 if(typeof out!=='string'||!out)throw Error('Output directory required');out=resolve(out);noLinks(out);if(backend){backend=resolve(backend);assertOutside(out,[backend]);}
 if(contractFile)assertOutside(out,[contractFile]);
 if(existsSync(out))throw Error('Refusing to overwrite an existing output directory');
 const binding=inspectBackend(c,backend),contractHash=hash(JSON.stringify(c)),generated=sources(c,contractHash);
 // Recheck exact source hashes immediately before writing any generated code.
 if(backend)inspectBackend(c,backend);
 mkdirSync(out,{recursive:true});
 const javaRoot=join(out,'java',...c.packageName.split('.'));mkdirSync(javaRoot,{recursive:true});
 const files=[];for(const [name,text] of Object.entries(generated)){const path=join(javaRoot,name);writeFileSync(path,text,{flag:'wx'});files.push({path:relative(out,path).split(sep).join('/'),sha256:hash(text)});}
 const plan={schemaVersion:'autoforge.contract-implementation.v1',id:c.id,contractSha256:contractHash,generatedAt:new Date().toISOString(),status:backend?'READY_FOR_REVIEW':'BACKEND_REQUIRED',backend:binding,evidence:c.evidence.map(e=>({...e,verification:'DECLARED_SOURCE_REFERENCE_NOT_RUNTIME_PROOF'})),files,protocol:{requestOpcode:c.requestOpcode,responseOpcode:c.responseOpcode,encoding:'REUSE_EXISTING_CODEC_NOT_GENERATED'},requiredProductionPorts:['Transactions.execute: one DB transaction; lock/version state; reject conflicting idempotency; persist result and every state mutation atomically','Authenticated session -> character ownership; existing protobuf decode/encode','Authoritative readback -> inventory/currency/attributes UI updates; relogin persistence'],preserve:['Existing controllers, opcode registrations, transactions, account data and migrations','Do not replace an equivalent working service or add duplicate rewards','No SQL migration, server restart or deployment is generated'],verification:{javaCompilation:'NOT_RUN',generatedHarness:'NOT_RUN',mysql:'NOT_RUN',gameplay:'unverified',deployment:'NOT_RUN'}};
 writeFileSync(join(out,'implementation-plan.json'),JSON.stringify(plan,null,2)+'\n',{flag:'wx'});
 writeFileSync(join(out,'INTEGRATE.md'),`# ${c.id}\n\nContract SHA256: ${contractHash}. ${plan.status}.\n\n1. Recheck exact backend commit/hashes/target methods in implementation-plan.json.\n2. Inspect the generated typed handler and transactional service. Wire the existing protobuf decoder/session identity; never trust a client character ID.\n3. Implement Transactions using the existing MariaDB service, locking/version rules, persistent idempotency and atomic commit. The included memory adapter is a test fixture only.\n4. Connect persisted readback and the declared S2C to the existing UI refresh path; preserve working behavior.\n5. Compile with Java21 and run ${c.packageName}.${c.className}Test. Record results; this generator has not run that test.\n6. Prove insufficient resources rollback, successful deltas, replay, conflicting replay, F5 and relogin against the actual backend.\n\nUnsupported formulas/effects are blocked; only explicit bounded integer deltas are compiled. No production database code, migration or deploy is presumed.\n`,{flag:'wx'});
 return plan;
}
