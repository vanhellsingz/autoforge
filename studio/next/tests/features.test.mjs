import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import os from 'node:os';import path from 'node:path';
import {snapshotClient,diffSnapshots,diffDiscovery,impactedArtifacts} from '../drift.mjs';
import {scanBackend,buildGapMatrix,renderGapMarkdown} from '../gaps.mjs';
import {inferFrameLayout,decodeFrame} from '../frame-layout.mjs';
import {compareRates} from '../statistics.mjs';
import {makeEvidencePack,verifyEvidencePack,unpackEvidencePack,evidenceAsText,evidenceFromText} from '../evidence-pack.mjs';
import {main} from '../autoforge.mjs';
function dir(){return mkdtempSync(path.join(os.tmpdir(),'autoforge-next-'));}
function put(root,p,contents){
  const full=path.join(root,p);mkdirSync(path.dirname(full),{recursive:true});writeFileSync(full,contents);return full;
}
test('Drift snapshots track renamed build assets by logical name',async()=>{
  const a=dir(),b=dir();
  put(a,'js/bundle-aaaaaaaaaa.js','old');put(b,'js/bundle-bbbbbbbbbb.js','new');
  put(a,'data/constants.json','{}');put(b,'data/constants.json','{}');
  put(b,'data/new.json','[]');put(b,'image.png','not tracked');
  const old=await snapshotClient(a),newer=await snapshotClient(b),diff=diffSnapshots(old,newer);
  assert.equal(old.files.length,2);assert.equal(newer.files.length,3);
  assert.equal(diff.changed.length,1);assert.equal(diff.added.length,1);assert.equal(diff.changed[0].logical,'js/bundle.js');
  assert.equal(diffSnapshots(old,old).identical,true);
});
test('Drift refuses ambiguous logical hash filenames',async()=>{
  const a=dir();put(a,'x-a1b2c3d4.js','one');put(a,'x-12345678.js','two');
  await assert.rejects(snapshotClient(a),/Ambiguous/);
});
test('Drift classifies changed opcodes and message fields and maps impact',async()=>{
  const old={opcodes:[{name:'C_GEMS',opcode:55}],messages:[{name:'Gems',fields:[{id:1,name:'id',type:'int32'}]}],sources:[{path:'a-aaaaaaaaaa.js',sha256:'old-hash'}]};
  const newer={opcodes:[{name:'C_GEMS',opcode:99}],messages:[{name:'Gems',fields:[{id:1,name:'id',type:'string'}]}],sources:[{path:'a-bbbbbbbbbb.js',sha256:'new-hash'}]};
  const report=diffDiscovery(old,newer);assert.equal(report.summary.breaking,2);
  const root=dir();put(root,'contracts/gems.contract.json',JSON.stringify({feature:'gems',operations:[{name:'C_GEMS',message:{name:'Gems'}}]}));
  put(root,'src.evidence.json',JSON.stringify({sha256:'old-hash'}));
  const impacted=await impactedArtifacts(report,{contractsDir:path.join(root,'contracts'),evidenceFiles:[path.join(root,'src.evidence.json')]});
  assert.equal(impacted.length,2);
});
function javaFixture(){
  const root=dir();
  put(root,'src/Opcodes.java','class Opcodes { public static final int C_GEMS = 55; public static final int U_UPDATE = 56; }');
  put(root,'src/Router.java','class Router { void handle(int n){switch(n){case Opcodes.U_UPDATE -> send();}} }');
  return root;
}
test('Gap scanner distinguishes lexical handlers from unproven runtime behavior',async()=>{
  const backend=await scanBackend(javaFixture());
  const discovery={opcodes:[{name:'C_GEMS',opcode:55},{name:'U_UPDATE',opcode:56},{name:'C_UNKNOWN',opcode:77}]};
  const events=[{kind:'frame',opcode:55,dir:'C2S',decoderReviewed:true},{kind:'frame',opcode:55,dir:'C2S',decoderReviewed:true}];
  const report=buildGapMatrix({discovery,backend,events});
  const rows=Object.fromEntries(report.rows.map(r=>[r.name,r]));
  assert.equal(rows.C_GEMS.severity,'critical-candidate');
  assert.equal(rows.U_UPDATE.status,'switch-case-found');
  assert.equal(rows.C_UNKNOWN.severity,'gap');
  assert.equal(report.policy.implementationProof,false);
  assert.match(renderGapMarkdown(report),/C_GEMS/);
});
test('Gap observations without reviewed decoder are only review hints',async()=>{
  const backend=await scanBackend(javaFixture());
  const r=buildGapMatrix({discovery:{opcodes:[{name:'C_GEMS',opcode:55}]},backend,events:[{kind:'frame',opcode:55,dir:'C2S'}]});
  assert.equal(r.rows[0].severity,'review');
});
test('Frame inference uses provided unencrypted sample headers only',()=>{
  const ids=[513,1027,2051,513,1027,2051];
  const frames=ids.map(n=>Buffer.from([0xAA,0xCC,n>>8,n&255,0x00,0x01]));
  const report=inferFrameLayout(frames,new Set(ids));
  assert.equal(report.status,'INFERRED_NOT_PROVEN');
  assert.equal(report.best.opcodeOffset,2);
  assert.equal(decodeFrame(frames[0],report.best).opcode,513);
});
test('Frame inference remains UNVERIFIED without enough evidence',()=>{
  assert.equal(inferFrameLayout([Buffer.from([1,2])],new Set([1])).status,'UNVERIFIED');
});
test('Statistical comparison reports recorded compatibility, never proof of equivalence',()=>{
  assert.equal(compareRates({n:400,successes:200},{n:400,successes:203}).status,'COMPATIBLE_INTERVALS_RECORDED');
  assert.equal(compareRates({n:400,successes:1},{n:400,successes:399}).status,'DIVERGENT_RECORDED');
  assert.equal(compareRates({n:20,successes:10},{n:20,successes:10}).status,'UNVERIFIED');
});
test('Evidence pack verifies hashes and unpacks only into a new directory',()=>{
  const root=dir(),out=path.join(dir(),'unpacked');
  put(root,'reports/a.json','{"result":"UNVERIFIED"}\n');
  const p=makeEvidencePack({root,files:['reports/a.json']});
  const checked=verifyEvidencePack(p.buffer);
  assert.equal(checked.files,1);assert.equal(checked.execution,'UNVERIFIED');
  const imported=unpackEvidencePack(p.buffer,out);assert.equal(imported.files,1);
  assert.equal(readFileSync(path.join(out,'reports/a.json'),'utf8'),'{"result":"UNVERIFIED"}\n');
  assert.throws(()=>unpackEvidencePack(p.buffer,out),/must not exist/);
  assert.deepEqual(evidenceFromText(evidenceAsText(p.buffer)),p.buffer);
});
test('Evidence pack refuses secrets, non-reports and traversal',()=>{
  const root=dir();put(root,'secret.log','password=ultrasecret');
  assert.throws(()=>makeEvidencePack({root,files:['secret.log']}),/sensitive/i);
  assert.throws(()=>makeEvidencePack({root,files:['../secret.log']}),/Unsafe/i);
  assert.throws(()=>makeEvidencePack({root,files:['.env']}),/not an approved/i);
});
test('Studio Next CLI can create statistical report outside source',async()=>{
  const d=dir(),source=put(d,'scenario.json',JSON.stringify({reference:{n:400,successes:200},candidate:{n:400,successes:201}}));
  const out=path.join(d,'out');
  const result=await main(['stats','--input',source,'--out',out]);
  assert.equal(result.status,'COMPATIBLE_INTERVALS_RECORDED');
  assert.ok(existsSync(path.join(out,'statistics.json')));
  await assert.rejects(main(['stats','--input',source,'--out',out]),/must not exist/);
});
