import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {encodeEvidence,recoverEvidence} from '../ci-evidence.mjs';
function fixture(t){const root=mkdtempSync(join(tmpdir(),'af-evidence-'));t.after(()=>rmSync(root,{recursive:true,force:true}));writeFileSync(join(root,'unit-results.xml'),'<testsuites><testcase name="real"/></testsuites>\n');writeFileSync(join(root,'unit-report.json'),'{"scope":"tool"}\n');return {root,log:encodeEvidence(root),out:join(root,'recovered')};}
test('CI log evidence roundtrips byte-for-byte through timestamped gh logs',t=>{const {root,log,out}=fixture(t);const records=recoverEvidence(log.split('\n').map(l=>'job\tstep\t2026-11-05T01:00:00Z '+l).join('\n'),out);assert.equal(records.length,2);for(const r of records)assert.deepEqual(readFileSync(join(root,r.name)),readFileSync(join(out,r.name)));});
test('truncated evidence writes nothing',t=>{const {log,out}=fixture(t);assert.throws(()=>recoverEvidence(log.replace('AUTOFORGE_EVIDENCE_END',''),out),/truncated/);assert.equal(existsSync(out),false);});
test('tampered bytes fail the hash',t=>{const {log,out}=fixture(t);assert.throws(()=>recoverEvidence(log.replace(/AUTOFORGE_DATA:./,'AUTOFORGE_DATA:A'),out),/hash/);assert.equal(existsSync(out),false);});
test('path traversal and duplicate bundles rejected',t=>{const {log,out}=fixture(t);assert.throws(()=>recoverEvidence(log.replace('unit-results.xml','../escape'),out),/header/);assert.throws(()=>recoverEvidence(log+'\n'+log,out),/Repeated/);});
test('existing evidence cannot be overwritten',t=>{const {log,out}=fixture(t);recoverEvidence(log,out);assert.throws(()=>recoverEvidence(log,out),/overwrite/);});
test('missing reports fail emission',t=>{const {root}=fixture(t);rmSync(join(root,'unit-report.json'));assert.throws(()=>encodeEvidence(root));});
