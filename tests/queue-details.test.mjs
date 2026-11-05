import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,cpSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepare} from '../prepare.mjs';
import {mysqlPreflight} from '../domain-guide.mjs';
import {scanDataAdmin} from '../data-admin-map.mjs';
const example=fileURLToPath(new URL('../examples/validated/',import.meta.url));
test('enriched tasks expose unverified states, no live schema claims, and preserve reviewer work',t=>{
 const root=mkdtempSync(join(tmpdir(),'af-domain-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const from=join(root,'out');cpSync(example,from,{recursive:true});
 writeFileSync(join(from,'RESULTADO_ARENA.md'),'reviewer result');writeFileSync(join(from,'ASSESSMENT_TEMPLATE.json'),'reviewer template');
 const plan=prepare({from});assert.equal(plan.version,'2.4');assert.equal(plan.evidenceLineage.deployment.status,'NOT_INSPECTED');assert.ok(plan.evidenceLineage.artifacts.every(e=>e.environment.kind==='LOCAL_COMPARISON'&&e.test.id&&e.transferToLive==='NOT_PROVEN_FOR_LIVE'));assert.ok(plan.tasks.every(x=>x.implementation.status==='unverified'));assert.ok(plan.tasks.every(x=>x.dependencies.admin.writeVerification==='NOT_VERIFIED'&&x.dependencies.admin.removalAuthorizedByMissingEvidence===false));
 assert.ok(plan.tasks.every(x=>x.dependencies.mysql.liveSchema==='NOT_QUERIED'&&x.gameplayProofs.length>0&&x.preserve.length>0));
 assert.equal(readFileSync(join(from,'RESULTADO_ARENA.md'),'utf8'),'reviewer result');assert.equal(readFileSync(join(from,'ASSESSMENT_TEMPLATE.json'),'utf8'),'reviewer template');
 const task=readFileSync(join(from,'tasks/01-ForgeEnhancementCost.md'),'utf8');assert.match(task,/Commit e estado existente/);assert.match(task,/Bloqueios explícitos/);assert.match(task,/Como provar no jogo/);
});
test('MySQL preflight contains only read-only queries and rejects malformed table names',()=>{
 const sql=mysqlPreflight(['characters','character_items','x; DROP TABLE accounts','characters']);
 assert.doesNotMatch(sql,/DROP TABLE|INSERT INTO|UPDATE |DELETE FROM|CREATE TABLE/);
 assert.match(sql,/information_schema.columns/);assert.match(sql,/flyway_schema_history/);assert.match(sql,/effective_schema/);
});
test('upsert column update is not invented as a SQL table dependency',t=>{
 const root=mkdtempSync(join(tmpdir(),'af-upsert-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const dir=join(root,'apps/game-server/src/main/java/test');mkdirSync(dir,{recursive:true});
 writeFileSync(join(dir,'InventoryStore.java'),'class InventoryStore { String sql="INSERT INTO character_items (stack_count) VALUES (?) ON DUPLICATE KEY UPDATE stack_count=VALUES(stack_count)"; }');
 const tables=scanDataAdmin(root).rules[0].referencedTableNames;assert.ok(tables.includes('character_items'));assert.ok(!tables.includes('stack_count'));
});

test('preflight policy rejects writes and side effects disguised as SELECT',async()=>{
 const {assertReadOnlyPreflight}=await import('../domain-guide.mjs');
 assert.equal(assertReadOnlyPreflight(mysqlPreflight(['characters'])),true);
 for(const sql of ['UPDATE characters SET grade=1','SELECT * FROM information_schema.tables FOR UPDATE','SELECT 1 INTO OUTFILE "x"','SELECT GET_LOCK("x",1) FROM information_schema.tables','SELECT * FROM information_schema.tables; DROP TABLE x','SELECT * FROM arbitrary_runtime_table','SELECT dangerous_mutation() FROM information_schema.tables'])assert.throws(()=>assertReadOnlyPreflight(sql));
});

test('diagnostic update affected wording is not a table dependency',t=>{
 const root=mkdtempSync(join(tmpdir(),'af-log-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const dir=join(root,'apps/game-server/src/main/java/test');mkdirSync(dir,{recursive:true});
 writeFileSync(join(dir,'TutorialService.java'),'class TutorialService { String log="character XP update affected "; String sql="UPDATE characters SET grade=? WHERE character_id=?"; }');
 const tables=scanDataAdmin(root).rules.find(r=>r.id==='quest.condition.vocabulary').referencedTableNames;assert.deepEqual(tables,['characters']);
});
