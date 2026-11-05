// Evidence artifacts are read as data. Integrity/result consistency is not proof that a run occurred.
import {readFileSync,lstatSync} from 'node:fs';
import {resolve,join,parse,sep,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
const HASH=/^[a-f0-9]{64}$/i,COMMIT=/^[a-f0-9]{40,64}$/i;
const MAX_BYTES=32*1024*1024;
const sha256=b=>createHash('sha256').update(b).digest('hex');
function safeFile(root,path){
 if(typeof path!=='string'||!path||isAbsolute(path)||path.includes('\\')||path.includes(':')||path.split('/').some(p=>!p||p==='.'||p==='..'))throw Error('Artifact path must be a safe relative path');
 let current=parse(root).root;
 for(const part of root.slice(current.length).split(sep).filter(Boolean)){current=join(current,part);if(lstatSync(current).isSymbolicLink())throw Error('Artifact root contains a symlink/junction');}
 for(const part of path.split('/')){current=join(current,part);if(lstatSync(current).isSymbolicLink())throw Error('Artifact symlink/junction refused');}
 const stat=lstatSync(current);if(!stat.isFile()||stat.size>MAX_BYTES)throw Error('Artifact must be a regular file up to 32 MiB');
 return current;
}
function attributes(text){
 const out={};let cursor=0;
 const re=/\s+([A-Za-z_][\w.-]*)\s*=\s*(?:"([^"<>]*)"|'([^'<>]*)')/y;
 while(cursor<text.length){if(!text.slice(cursor).trim())break;re.lastIndex=cursor;const m=re.exec(text);if(!m)throw Error('Unsupported JUnit XML attributes');if(Object.hasOwn(out,m[1]))throw Error('Duplicate JUnit XML attribute');out[m[1]]=m[2]??m[3];cursor=re.lastIndex;}
 return out;
}
function countAttr(attrs,name,required=false){
 if(attrs[name]===undefined){if(required)throw Error(`JUnit ${name} count required`);return null;}
 if(!/^\d+$/.test(attrs[name])||!Number.isSafeInteger(Number(attrs[name])))throw Error(`Invalid JUnit ${name} count`);
 return Number(attrs[name]);
}
/** Conservative JUnit XML subset. It validates structure and every declared count.
 * No XML entities, DTDs, namespaces or arbitrary processing instructions are expanded.
 */
export function parseJUnit(text){
 if(typeof text!=='string'||/<!DOCTYPE|<!ENTITY/i.test(text))throw Error('JUnit DTD/entities are forbidden');
 const allowed=new Set(['testsuites','testsuite','testcase','properties','property','system-out','system-err','failure','error','skipped']);
 const stack=[],suites=[];let cursor=0,rootCount=0,xmlSeen=false;
 const total={tests:0,failures:0,errors:0,skipped:0};
 function finish(node){
  if(node.name==='testcase'){
   total.tests++;total.failures+=node.failed?1:0;total.errors+=node.errored?1:0;total.skipped+=node.skipped?1:0;
   for(const s of stack.filter(s=>s.name==='testsuite'||s.name==='testsuites')){s.actual.tests++;s.actual.failures+=node.failed?1:0;s.actual.errors+=node.errored?1:0;s.actual.skipped+=node.skipped?1:0;}
  }
  if(node.name==='testsuite'||node.name==='testsuites'){
   for(const name of ['tests','failures','errors','skipped']){const declared=countAttr(node.attrs,name,name==='tests'&&node.name==='testsuite');if(declared!==null&&declared!==node.actual[name])throw Error(`JUnit ${name} count mismatch`);}
   suites.push(node);
  }
 }
 while(cursor<text.length){
  const next=text.indexOf('<',cursor);
  if(next<0){if(!stack.length&&text.slice(cursor).trim())throw Error('Text after JUnit root');break;}
  if(!stack.length&&text.slice(cursor,next).trim())throw Error('Text outside JUnit root');
  cursor=next;
  if(text.startsWith('<!--',cursor)){const end=text.indexOf('-->',cursor+4);if(end<0)throw Error('Unclosed JUnit comment');cursor=end+3;continue;}
  if(text.startsWith('<![CDATA[',cursor)){if(!stack.length)throw Error('CDATA outside JUnit root');const end=text.indexOf(']]>',cursor+9);if(end<0)throw Error('Unclosed JUnit CDATA');cursor=end+3;continue;}
  if(text.startsWith('<?',cursor)){const end=text.indexOf('?>',cursor+2);if(end<0||xmlSeen||rootCount||!/^<\?xml\s/i.test(text.slice(cursor,end+2)))throw Error('Unsupported JUnit processing instruction');xmlSeen=true;cursor=end+2;continue;}
  let quote=null,end=cursor+1;
  for(;end<text.length;end++){const c=text[end];if(quote){if(c===quote)quote=null;}else if(c==='"'||c==="'")quote=c;else if(c==='>')break;}
  if(end>=text.length)throw Error('Unclosed JUnit tag');
  const token=text.slice(cursor,end+1);cursor=end+1;
  const m=/^<(\/?)([A-Za-z][\w.-]*)([\s\S]*?)(\/?)>$/.exec(token);
  if(!m||!allowed.has(m[2]))throw Error('Unsupported JUnit XML tag');
  const [,closing,name,body,selfClosing]=m;
  if(closing){if(selfClosing||body.trim())throw Error('Invalid JUnit closing tag');const node=stack.pop();if(!node||node.name!==name)throw Error('Unbalanced JUnit XML');finish(node);continue;}
  const attrs=attributes(body),parent=stack.at(-1);
  if(!parent){if(++rootCount!==1||!['testsuite','testsuites'].includes(name))throw Error('Expected one JUnit suite root');}
  else {
   const permitted={testsuites:['testsuite','testcase'],testsuite:['testsuite','testcase','properties','system-out','system-err'],testcase:['failure','error','skipped','system-out','system-err','properties'],properties:['property']};
   if(!(permitted[parent.name]??[]).includes(name))throw Error(`Unexpected JUnit ${name} inside ${parent.name}`);
  }
  if(name==='testcase'&&(!attrs.name||!attrs.name.trim()))throw Error('JUnit testcase name required');
  const node={name,attrs,actual:{tests:0,failures:0,errors:0,skipped:0}};
  if(['failure','error','skipped'].includes(name)){
   if(parent.name!=='testcase'||parent.failed||parent.errored||parent.skipped)throw Error('Multiple or misplaced JUnit outcome elements');
   parent[name==='failure'?'failed':name==='error'?'errored':'skipped']=true;
  }
  if(selfClosing)finish(node);else stack.push(node);
 }
 if(stack.length||rootCount!==1||!suites.length||!total.tests)throw Error('JUnit needs balanced suites and at least one testcase');
 if(total.failures||total.errors)throw Error('JUnit contains failed or errored tests');
 const passed=total.tests-total.skipped;
 if(!passed)throw Error('JUnit has no passed tests');
 return {...total,passed};
}
function canonical(value){
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
 return JSON.stringify(value);
}
function object(value){return value&&typeof value==='object'&&!Array.isArray(value);}
function text(value){return typeof value==='string'&&value.trim().length>0;}
function jsonReport(bytes,evidence){
 let report;try{report=JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/,''));}catch{throw Error('Invalid JSON test report');}
 if(!object(report)||report.schemaVersion!==1||!['passed','failed'].includes(report.result))throw Error('Invalid JSON test report schema');
 if(!COMMIT.test(evidence.commit??'')||report.commit!==evidence.commit)throw Error('Artifact commit mismatch');
 if(!text(evidence.testId)||report.testId!==evidence.testId)throw Error('Artifact testId mismatch');
 if(!object(evidence.environment)||!text(evidence.environment.name)||!text(evidence.environment.kind)||canonical(report.environment)!==canonical(evidence.environment))throw Error('Artifact environment mismatch');
 if(evidence.kind==='runtime'||report.deployment||evidence.deployment){
  if(!object(report.deployment)||!object(evidence.deployment)||report.deployment.commit!==evidence.commit||report.deployment.commit!==evidence.deployment.commit||!HASH.test(report.deployment.jarSha256??'')||report.deployment.jarSha256.toLowerCase()!==String(evidence.deployment.jarSha256).toLowerCase())throw Error('Artifact deployed commit/JAR mismatch');
 }
 if(!Array.isArray(report.checks)||!report.checks.length||report.checks.length>100000)throw Error('JSON test report requires 1..100000 checks');
 const ids=new Set();let passed=0,failed=0;
 for(const check of report.checks){if(!object(check)||!text(check.id)||ids.has(check.id)||!['passed','failed'].includes(check.result))throw Error('Invalid/repeated JSON test report check');ids.add(check.id);if(check.result==='passed')passed++;else failed++;}
 if(report.result==='passed'&&failed)throw Error('JSON report claims passed with failed checks');
 if(report.result==='failed'&&!failed)throw Error('JSON failed report contains no failed check');
 if(evidence.result==='passed'&&report.result!=='passed')throw Error('Passed evidence points to a failed artifact');
 return {identityVerified:true,verifiedTests:report.result==='passed'?passed:0,result:report.result,proof:'IDENTITY_AND_STRUCTURED_RESULTS',supportsClaimedPass:report.result==='passed'};
}
/** Each evidence.artifacts entry is {path,sha256,format:'junit'|'json-report'|'opaque'}.
 * JUnit establishes reported results but no commit/environment/test identity.
 * Opaque logs/videos establish bytes only. A caller must not promote either to
 * a functional/runtime claim without a matching identity-bearing JSON report.
 * Even that report checks declarations, not truth of an external run.
 */
export function verifyEvidenceArtifacts(evidence,{baseDir}={}){
 if(!object(evidence))throw Error('Evidence object required');
 if(evidence.artifacts===undefined||Array.isArray(evidence.artifacts)&&!evidence.artifacts.length)return {status:'NO_ARTIFACTS',artifacts:[],identityVerified:false,verifiedTests:0,supportsClaimedPass:false,semanticProof:'NOT_ESTABLISHED'};
 if(!Array.isArray(evidence.artifacts)||evidence.artifacts.length>100)throw Error('Expected up to 100 evidence artifacts');
 if(!text(baseDir))throw Error('Artifact baseDir required');
 const root=resolve(baseDir),seen=new Set(),artifacts=[];
 for(const descriptor of evidence.artifacts){
  if(!object(descriptor)||!HASH.test(descriptor.sha256??'')||!['junit','json-report','opaque'].includes(descriptor.format))throw Error('Invalid artifact descriptor');
  const key=String(descriptor.path).toLowerCase();if(seen.has(key))throw Error('Duplicate artifact path');seen.add(key);
  const path=safeFile(root,descriptor.path),bytes=readFileSync(path);
  if(bytes.length>MAX_BYTES||sha256(bytes)!==descriptor.sha256.toLowerCase())throw Error(`Artifact hash/size mismatch: ${descriptor.path}`);
  let details={identityVerified:false,verifiedTests:0,proof:'INTEGRITY_ONLY',supportsClaimedPass:false};
  if(descriptor.format==='json-report')details=jsonReport(bytes,evidence);
  if(descriptor.format==='junit'){const counts=parseJUnit(bytes.toString('utf8').replace(/^\uFEFF/,''));details={...details,verifiedTests:counts.passed,proof:'TEST_RESULTS_ONLY',counts};}
  artifacts.push({path:descriptor.path,sha256:descriptor.sha256.toLowerCase(),format:descriptor.format,bytes:bytes.length,...details});
 }
 const identity=artifacts.filter(a=>a.identityVerified&&a.supportsClaimedPass);
 return {status:'ARTIFACTS_VERIFIED',artifacts,identityVerified:identity.length>0,verifiedTests:identity.reduce((n,a)=>n+a.verifiedTests,0),supportsClaimedPass:identity.length>0,semanticProof:'NOT_ESTABLISHED',limitation:'Hashes and structured reported results are verified; actual execution and gameplay truth are not independently established.'};
}
