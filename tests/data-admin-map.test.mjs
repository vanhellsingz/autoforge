import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {scanDataAdmin} from '../data-admin-map.mjs';
function setup(t){const root=mkdtempSync(join(tmpdir(),'af-data-admin-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const java=join(root,'apps/game-server/src/main/java/test'),sql=join(root,'apps/game-server/src/main/resources/db/migration'),ui=join(root,'apps/admin-web/src');for(const d of [java,sql,ui])mkdirSync(d,{recursive:true});return {root,java,sql,ui};}
test('records SQL table evidence, DDL migration, admin candidates and immutable hashes',t=>{
 const f=setup(t),source='class ForgeStrengthenService {\n void strengthen(){ jdbc.sql("UPDATE character_items SET enhancement_level=?"); }\n}\n';
 writeFileSync(join(f.java,'ForgeStrengthenService.java'),source);writeFileSync(join(f.sql,'V12__items.sql'),'-- CREATE TABLE fake_table (id int);\nCREATE TABLE character_items (id BIGINT);\nALTER TABLE character_items ADD enhancement_level INT;');writeFileSync(join(f.ui,'InventoryEditor.tsx'),'export const inventory = "/admin/api/v1/inventory";');
 const report=scanDataAdmin(f.root),rule=report.rules[0];assert.deepEqual(rule.referencedTableNames,['character_items']);assert.equal(rule.tables[0].line,2);assert.equal(rule.tables[0].sha256,createHash('sha256').update(source).digest('hex'));assert.equal(rule.migrations.length,2);assert.equal(rule.admin[0].kind,'admin_ui_candidate');assert.ok(report.gaps.some(g=>g.includes('live MySQL')));assert.deepEqual(scanDataAdmin(f.root),report);assert.equal(readFileSync(join(f.java,'ForgeStrengthenService.java'),'utf8'),source);
});
test('comments do not fabricate SQL references; optional admin/migration directories stay explicit',t=>{
 const f=setup(t);writeFileSync(join(f.java,'ForgeStrengthenService.java'),'class ForgeStrengthenService {\n// jdbc.sql("UPDATE fake_table SET x=1");\nString sql="SELECT x FROM character_items";\n}');rmSync(f.ui,{recursive:true});rmSync(f.sql,{recursive:true});const r=scanDataAdmin(f.root);assert.deepEqual(r.rules[0].referencedTableNames,['character_items']);assert.equal(r.warnings.length,2);
});
test('caps evidence and reports truncation',t=>{const f=setup(t);writeFileSync(join(f.java,'ForgeStrengthenService.java'),'class ForgeStrengthenService {\n'+Array(40).fill('String x="UPDATE character_items SET x=1";').join('\n')+'\n}');const r=scanDataAdmin(f.root).rules[0];assert.equal(r.tables.length,24);assert.equal(r.truncation.tables.count,40);assert.equal(r.truncation.tables.truncated,true);});
test('missing Java source root fails instead of declaring schema absent',t=>{const f=setup(t);rmSync(join(f.root,'apps/game-server/src/main/java'),{recursive:true});assert.throws(()=>scanDataAdmin(f.root),/missing/);});
test('rejects junction roots and skips linked files/directories',t=>{const f=setup(t),outside=join(f.root,'outside'),link=join(f.java,'linked');mkdirSync(outside);writeFileSync(join(outside,'ForgeStrengthenService.java'),'String x="UPDATE secret_table SET x=1";');try{symlinkSync(outside,link,process.platform==='win32'?'junction':'dir');}catch(e){if(['EPERM','EACCES'].includes(e.code)){t.skip('Link privilege unavailable');return;}throw e;}const r=scanDataAdmin(f.root);assert.equal(r.skippedLinks.length,1);assert.equal(r.rules[0].tables.length,0);assert.throws(()=>scanDataAdmin(link),/link refused/);});
