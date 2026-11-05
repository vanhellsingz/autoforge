import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {buildCausalContext,renderCausalContext} from '../causal-context.mjs';
function fixture(t){const root=mkdtempSync(join(tmpdir(),'autoforge-context-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const dir=join(root,'apps/game-server/src/main/java/example');mkdirSync(dir,{recursive:true});const file=join(dir,'BagService.java');writeFileSync(file,`class BagService {
 public void handleBagSell() {
   inventory.sell();
   respond(Opcodes.U_C_PLAYER_INFO);
 }
 public void sell() {
   jdbc.update("UPDATE character_items SET count = ?");
   // jdbc.update("UPDATE invented_table SET count = ?");
 }
}`);return {root,file};}
test('context ties exact methods, lexical calls, protocol and SQL to hashes without claiming proof',t=>{const {root}=fixture(t);const r=buildCausalContext(root,{commit:'a'.repeat(40)});const d=r.domains.find(x=>x.id==='sale');assert.equal(d.runtimeProven,false);assert.equal(d.implementationStatus,'unverified');const h=d.methods.find(m=>m.method==='handleBagSell');assert.equal(h.startLine,2);assert.equal(h.endLine,5);assert.equal(h.sha256.length,64);assert.equal(h.calls[0].method,'sell');assert.equal(h.calls[0].resolved,false);assert.equal(h.calls[0].candidates[0].method,'sell');assert.equal(h.opcodes[0].symbol,'U_C_PLAYER_INFO');const s=d.methods.find(m=>m.method==='sell');assert.deepEqual(s.tables.map(x=>x.table),['character_items']);assert.match(renderCausalContext(r),/Análise estática/);});
test('stale expected sources refuse a misleading context',t=>{const {root,file}=fixture(t),old=buildCausalContext(root);writeFileSync(file,'class BagService {}');assert.throws(()=>buildCausalContext(root,{expectedSources:old.sources}),/snapshot stale/);});
test('empty scope is unresolved rather than absent',t=>{const {root,file}=fixture(t);rmSync(file);const r=buildCausalContext(root);assert.equal(r.policy.absenceAllowsRemoval,false);assert.ok(r.domains.every(x=>x.status==='NO_CANDIDATE_IN_SCANNED_SCOPE'&&x.implementationStatus==='unverified'));});
test('bounded lists explicitly report omitted context',t=>{const {root}=fixture(t),r=buildCausalContext(root,{maxMethodsPerDomain:1,maxCallsPerMethod:1});const d=r.domains.find(x=>x.id==='sale');assert.equal(d.methods.length,1);assert.equal(d.truncated,true);assert.equal(d.methods[0].callsTruncated,true);});
test('expected source cannot escape backend root',t=>{const {root}=fixture(t);assert.throws(()=>buildCausalContext(root,{expectedSources:[{path:'../outside.java',sha256:'a'.repeat(64)}]}),/Invalid expected source path/);});
