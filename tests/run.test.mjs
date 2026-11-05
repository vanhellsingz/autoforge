import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {options,run} from '../run.mjs';
test('CLI validates options and preserves paths with spaces',()=>{
 assert.equal(options(['--client','a b','--out','c d']).client.endsWith('a b'),true);
 assert.throws(()=>options(['--out']));assert.throws(()=>options(['--unknown']));
});
test('failed discovery revokes a prior validated manifest with exact failed phase',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'af-run-')),out=join(dir,'out');
 try{mkdirSync(out);writeFileSync(join(out,'manifest.json'),JSON.stringify({validated:true}));
 await assert.rejects(()=>run({client:join(dir,'missing'),out}));
 assert.equal(JSON.parse(readFileSync(join(out,'manifest.json'))).validated,false);
 const report=JSON.parse(readFileSync(join(out,'handoff.json')));assert.equal(report.status,'FAILED');assert.equal(report.failedPhase,'discovery');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('discovery-only produces no installable success and needs no Java',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'af-run-')),client=join(dir,'client'),out=join(dir,'out');
 try{mkdirSync(join(client,'js'),{recursive:true});writeFileSync(join(client,'js','bundle_release-0123456789.js'),'class A{}');
 await run({client,out,discoverOnly:true,quiet:true});
 assert.equal(JSON.parse(readFileSync(join(out,'manifest.json'))).validated,false);
 assert.equal(JSON.parse(readFileSync(join(out,'handoff.json'))).status,'DISCOVERY_ONLY');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
