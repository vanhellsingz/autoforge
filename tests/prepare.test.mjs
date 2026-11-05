import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,cpSync,writeFileSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepare} from '../prepare.mjs';
const example=fileURLToPath(new URL('../examples/validated/',import.meta.url));
function fixture(t){const root=mkdtempSync(join(tmpdir(),'af-prepare-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const from=join(root,'delivery');cpSync(example,from,{recursive:true});return {root,from};}
test('prepares four explicit tasks and exact input positions without claiming runtime success',t=>{
 const f=fixture(t),plan=prepare(f);
 assert.equal(plan.status,'BACKEND_PATH_REQUIRED');assert.equal(plan.tasks.length,4);
 assert.equal(plan.runtime,'NOT_VERIFIED');assert.equal(plan.deployment,'NOT_RUN');
 assert.ok(existsSync(join(f.from,'COMECE_AQUI.md')));assert.ok(existsSync(join(f.from,'arena-steps.ps1')));
 const inputs=readFileSync(join(f.from,'INPUTS.md'),'utf8');assert.match(inputs,/stats\[22\].*parryPenetration/);assert.match(inputs,/base\[12\].*parry/);
 assert.ok(plan.tasks.every(task=>task.status==='TO_IMPLEMENT'));
});
test('backend references become task pointers; preparation never installs into backend',t=>{
 const f=fixture(t),backend=join(f.root,'java-v1'),sourceDir=join(backend,'apps/game-server/src/main/java/test');mkdirSync(sourceDir,{recursive:true});
 writeFileSync(join(sourceDir,'ForgeStrengthenService.java'),'package test;\nimport com.wartuneultra.autoforge.ForgeEnhancementCost;\nclass ForgeStrengthenService {}\n');
 const plan=prepare({...f,backend});assert.equal(plan.status,'READY_FOR_IMPLEMENTATION');
 assert.ok(plan.tasks[0].backend.references.length>0);
 assert.equal(existsSync(join(backend,'apps/game-server/src/main/java/com/wartuneultra/autoforge/v2')),false);
});
test('tampered evidence prevents preparation',t=>{
 const f=fixture(t);writeFileSync(join(f.from,'capacity.evidence.json'),'{}');assert.throws(()=>prepare(f));
});

test('freshly prepared snapshot permits install and then blocks backend changes',async t=>{
 const f=fixture(t),backend=join(f.root,'backend'),dir=join(backend,'apps/game-server/src/main/java/test');mkdirSync(dir,{recursive:true});const source=join(dir,'Source.java');writeFileSync(source,'class Source {}');
 prepare({...f,backend});const {integrate}=await import('../integrate.mjs');assert.equal(integrate({...f,backend,apply:true}).applied,4);
 writeFileSync(source,'class Source { int newState; }');assert.throws(()=>integrate({...f,backend,apply:true}));
});
