import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync,mkdirSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {verifyEvidenceArtifacts,parseJUnit} from '../test-artifacts.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const commit='a'.repeat(40),jarSha256='b'.repeat(64);
function fixture(t){const root=mkdtempSync(join(tmpdir(),'af-artifacts-'));t.after(()=>rmSync(root,{recursive:true,force:true}));return root;}
function example(t,kind='test'){
 const baseDir=fixture(t),evidence={kind,commit,testId:'inventory-service-it',environment:{name:'isolated-mariadb',kind:'TEST'},result:'passed',artifacts:[]};
 if(kind==='runtime'){evidence.environment={name:'dev-19090',kind:'RUNTIME'};evidence.deployment={commit,jarSha256};}
 const report={schemaVersion:1,commit,testId:evidence.testId,environment:{...evidence.environment},result:'passed',checks:[{id:'equip-relogin',result:'passed'}],...(kind==='runtime'?{deployment:{commit,jarSha256}}:{})};
 const save=(value=report)=>{const bytes=JSON.stringify(value);writeFileSync(join(baseDir,'result.json'),bytes);evidence.artifacts=[{path:'result.json',sha256:hash(bytes),format:'json-report'}];};save();return {baseDir,evidence,report,save};
}
test('missing artifacts remain unverified rather than satisfying a passed claim',()=>{
 const out=verifyEvidenceArtifacts({result:'passed'});assert.equal(out.status,'NO_ARTIFACTS');assert.equal(out.supportsClaimedPass,false);assert.equal(out.semanticProof,'NOT_ESTABLISHED');
});
test('JSON reports match exact test, commit and environment with hashed bytes',t=>{
 const f=example(t),out=verifyEvidenceArtifacts(f.evidence,f);assert.equal(out.status,'ARTIFACTS_VERIFIED');assert.equal(out.identityVerified,true);assert.equal(out.verifiedTests,1);assert.equal(out.supportsClaimedPass,true);assert.equal(out.semanticProof,'NOT_ESTABLISHED');
});
test('runtime reports must match deployed commit and JAR identity',t=>{
 const f=example(t,'runtime');assert.equal(verifyEvidenceArtifacts(f.evidence,f).supportsClaimedPass,true);
 f.report.deployment.jarSha256='c'.repeat(64);f.save();assert.throws(()=>verifyEvidenceArtifacts(f.evidence,f),/JAR/);
});
test('tampered, missing or escaped files are rejected',t=>{
 const f=example(t);writeFileSync(join(f.baseDir,'result.json'),'{}');assert.throws(()=>verifyEvidenceArtifacts(f.evidence,f),/hash/);
 f.evidence.artifacts[0].path='../result.json';assert.throws(()=>verifyEvidenceArtifacts(f.evidence,f),/relative/);
 f.evidence.artifacts[0].path='not-found.json';assert.throws(()=>verifyEvidenceArtifacts(f.evidence,f));
});
test('stale commit, environment, test ID and failure cannot support passed evidence',t=>{
 for(const [key,value,pattern] of [['commit','d'.repeat(40),/commit/],['environment',{name:'other',kind:'TEST'},/environment/],['testId','wrong',/testId/]]){
  const f=example(t);f.report[key]=value;f.save();assert.throws(()=>verifyEvidenceArtifacts(f.evidence,f),pattern);
 }
 const f=example(t);f.report.result='failed';f.report.checks[0].result='failed';f.save();assert.throws(()=>verifyEvidenceArtifacts(f.evidence,f),/failed artifact/);
});
test('JSON reports require unique checks and consistent results',t=>{
 const f=example(t);f.report.checks=[];f.save();assert.throws(()=>verifyEvidenceArtifacts(f.evidence,f),/checks/);
 f.report.checks=[{id:'one',result:'failed'}];f.save();assert.throws(()=>verifyEvidenceArtifacts(f.evidence,f),/failed checks/);
 f.report.checks=[{id:'one',result:'passed'},{id:'one',result:'passed'}];f.save();assert.throws(()=>verifyEvidenceArtifacts(f.evidence,f),/repeated/);
});
test('JUnit suites validate actual testcase counts but supply no deployment identity',t=>{
 const root=fixture(t),xml='<?xml version="1.0"?><testsuites tests="2"><testsuite name="a" tests="1" failures="0" errors="0"><testcase name="equip"/></testsuite><testsuite name="b" tests="1"><testcase name="sell"/></testsuite></testsuites>';
 writeFileSync(join(root,'test.xml'),xml);const out=verifyEvidenceArtifacts({result:'passed',artifacts:[{path:'test.xml',sha256:hash(xml),format:'junit'}]},{baseDir:root});
 assert.equal(out.artifacts[0].verifiedTests,2);assert.equal(out.artifacts[0].proof,'TEST_RESULTS_ONLY');assert.equal(out.identityVerified,false);assert.equal(out.supportsClaimedPass,false);assert.equal(out.verifiedTests,0);
});
test('JUnit rejects hidden failures, declared count mismatches and malformed structure',()=>{
 for(const xml of ['<testsuite tests="2"><testcase name="one"/></testsuite>','<testsuite tests="1" failures="0"><testcase name="one"><failure/></testcase></testsuite>','<testsuite tests="0"/>','<testsuite tests="1"><testcase name="one"/></testsuites>','<testsuites tests="2"><testsuite tests="1"><testcase name="one"/></testsuite></testsuites>','<testsuite tests="1"><testcase name="one"><skipped/></testcase></testsuite>'])assert.throws(()=>parseJUnit(xml));
 assert.equal(parseJUnit('<testsuite tests="1"><testcase name="one"><system-out><![CDATA[<failure>literal output</failure>]]></system-out></testcase></testsuite>').passed,1);
});
test('JUnit never expands entities, namespaces or processing instructions',()=>{
 for(const xml of ['<!DOCTYPE x [<!ENTITY a SYSTEM "file:///secret">]><testsuite tests="1"><testcase name="a"/></testsuite>','<?evil run?><testsuite tests="1"><testcase name="a"/></testsuite>','<ns:testsuite tests="1"><ns:testcase name="a"/></ns:testsuite>'])assert.throws(()=>parseJUnit(xml));
});
test('opaque logs or video establish only integrity and never a passing test',t=>{
 const root=fixture(t),bytes=Buffer.from([0,1,2,3]);writeFileSync(join(root,'video.bin'),bytes);
 const out=verifyEvidenceArtifacts({result:'passed',artifacts:[{path:'video.bin',sha256:hash(bytes),format:'opaque'}]},{baseDir:root});
 assert.equal(out.artifacts[0].proof,'INTEGRITY_ONLY');assert.equal(out.supportsClaimedPass,false);assert.equal(out.verifiedTests,0);
});
test('junctions and duplicate descriptors cannot escape the evidence root',t=>{
 const root=fixture(t),outside=fixture(t);writeFileSync(join(outside,'result.log'),'external');symlinkSync(outside,join(root,'linked'),process.platform==='win32'?'junction':'dir');
 assert.throws(()=>verifyEvidenceArtifacts({artifacts:[{path:'linked/result.log',sha256:hash('external'),format:'opaque'}]},{baseDir:root}),/symlink/);
 const f=example(t);f.evidence.artifacts.push({...f.evidence.artifacts[0]});assert.throws(()=>verifyEvidenceArtifacts(f.evidence,f),/Duplicate/);
});

test('accepts Node native JUnit flattened testcase roots and still rejects failures',()=>{
 assert.equal(parseJUnit('<testsuites><testcase name="node test"/></testsuites>').passed,1);
 assert.throws(()=>parseJUnit('<testsuites><testcase name="node test"><failure>bad</failure></testcase></testsuites>'));
});
