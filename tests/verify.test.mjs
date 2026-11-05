import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, renameSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verifyBundle } from '../verify.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function fixture() {
 const root = mkdtempSync(join(tmpdir(), 'af-verify-')), from = join(root,'delivery'), client = join(root,'client');
 mkdirSync(join(from,'generated'),{recursive:true}); mkdirSync(join(client,'js'),{recursive:true});
 const java='public final class Rule {}\n', source='actual client rule';
 writeFileSync(join(from,'generated/Rule.java'),java); writeFileSync(join(client,'js/bundle.js'),source);
 const report={rule:'test.rule',sources:[{path:'js/bundle.js',sha256:hash(source)}],generated:{path:'generated/Rule.java',sha256:hash(java)},comparison:{cases:1,mismatches:0}};
 const manifest={schemaVersion:1,validated:true,files:[{path:'generated/Rule.java',sha256:hash(java),className:'Rule'}],evidence:[]};
 const save=()=>{ const text=JSON.stringify(report);writeFileSync(join(from,'test.evidence.json'),text);manifest.evidence=[{path:'test.evidence.json',sha256:hash(text)}];writeFileSync(join(from,'manifest.json'),JSON.stringify(manifest)); };
 save(); return {root,from,client,report,manifest,save,cleanup(){rmSync(root,{recursive:true,force:true});}};
}
function withFixture(fn){const f=fixture();try{fn(f);}finally{f.cleanup();}}

test('verifies artifacts and optional client provenance without writes',()=>withFixture(f=>{
 const before=readFileSync(join(f.from,'manifest.json'),'utf8');
 assert.equal(verifyBundle({from:f.from}).sourceChecks.length,0);
 const result=verifyBundle({from:f.from,client:f.client});
 assert.equal(result.status,'VERIFIED');assert.equal(result.sourceChecks.length,1);assert.equal(result.evidence[0].report.rule,'test.rule');
 assert.equal(readFileSync(join(f.from,'manifest.json'),'utf8'),before);
}));
test('rejects invalid success flag and missing evidence',()=>withFixture(f=>{
 f.manifest.validated=false;f.save();assert.throws(()=>verifyBundle({from:f.from}),/validated/);
 f.manifest.validated=true;f.manifest.evidence=[];writeFileSync(join(f.from,'manifest.json'),JSON.stringify(f.manifest));assert.throws(()=>verifyBundle({from:f.from}),/nonempty/);
}));
test('rejects tampered generated Java and evidence bytes',()=>withFixture(f=>{
 writeFileSync(join(f.from,'generated/Rule.java'),'tampered');assert.throws(()=>verifyBundle({from:f.from}),/Hash mismatch/);
 writeFileSync(join(f.from,'generated/Rule.java'),'public final class Rule {}\n');writeFileSync(join(f.from,'test.evidence.json'),'{}');assert.throws(()=>verifyBundle({from:f.from}),/Hash mismatch/);
}));
test('rejects evidence/manifest disagreement and failed comparisons',()=>withFixture(f=>{
 f.report.generated.sha256='a'.repeat(64);f.save();assert.throws(()=>verifyBundle({from:f.from}),/manifest mismatch/);
 f.report.generated.sha256=f.manifest.files[0].sha256;f.report.comparison.mismatches=1;f.save();assert.throws(()=>verifyBundle({from:f.from}),/not successful/);
}));
test('rejects stale client and missing client root',()=>withFixture(f=>{
 writeFileSync(join(f.client,'js/bundle.js'),'changed');assert.throws(()=>verifyBundle({from:f.from,client:f.client}),/Hash mismatch/);
 assert.throws(()=>verifyBundle({from:f.from,client:join(f.root,'missing')}));
}));
test('rejects path escapes and duplicate classes',()=>withFixture(f=>{
 f.manifest.files[0].path='../Rule.java';f.save();assert.throws(()=>verifyBundle({from:f.from}),/Invalid generated/);
 f.manifest.files[0].path='generated/Rule.java';f.manifest.files.push({...f.manifest.files[0]});f.save();assert.throws(()=>verifyBundle({from:f.from}),/Duplicate/);
}));
test('rejects missing and contradictory source provenance',()=>withFixture(f=>{
 f.report.sources=[];f.save();assert.throws(()=>verifyBundle({from:f.from}),/Missing source/);
 f.report.sources=[{path:'js/bundle.js',sha256:'a'.repeat(64)},{path:'js/bundle.js',sha256:'b'.repeat(64)}];f.save();assert.throws(()=>verifyBundle({from:f.from}),/Contradictory/);
 f.report.sources=[{path:'../outside.js',sha256:'a'.repeat(64)}];f.save();assert.throws(()=>verifyBundle({from:f.from}),/Unsafe source/);
}));
test('rejects generated directory junctions before reading files',()=>withFixture(f=>{
 renameSync(join(f.from,'generated'),join(f.root,'outside'));
 symlinkSync(join(f.root,'outside'),join(f.from,'generated'),process.platform==='win32'?'junction':'dir');
 assert.throws(()=>verifyBundle({from:f.from}),/Symlink\/junction refused/);
}));
