import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,symlinkSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {scanBackend} from '../backend-map.mjs';

function fixture(){const root=mkdtempSync(join(tmpdir(),'af-backend-'));const src=join(root,'apps/game-server/src/main/java');mkdirSync(src,{recursive:true});return {root,src};}
function write(src,path,text){const full=join(src,path);mkdirSync(join(full,'..'),{recursive:true});writeFileSync(full,text);}
const rule=(report,id)=>report.rules.find(r=>r.id===id);
test('records real lines, hashes and old/v2 dependencies without reading other files',()=>{
 const {root,src}=fixture();
 try{
  const old='package demo;\nimport com.wartuneultra.autoforge.ForgeEnhancementCost;\nclass ForgeStrengthenService {\n double strengthen(){ return ForgeEnhancementCost.gold(1,2,3); }\n}';
  write(src,'demo/ForgeStrengthenService.java',old);
  write(src,'demo/Other.java','import com.wartuneultra.autoforge.v2.ClientFightCapacity;\nclass Other { double value(){return ClientFightCapacity.player(null,null,null);} }');
  writeFileSync(join(root,'secret.json'),'{"doNotRead":true}');
  const report=scanBackend(root),gold=rule(report,'forge.common.enhancement.gold'),capacity=rule(report,'attributes.fighting-capacity');
  assert.equal(report.filesScanned,2);assert.equal(gold.status,'REFERENCES_FOUND');
  assert.deepEqual(gold.references.map(r=>r.line),[2,4]);assert.equal(gold.references[1].kind,'call');
  assert.equal(gold.references[1].dependency,'current_package');
  assert.equal(gold.references[1].sha256,createHash('sha256').update(old).digest('hex'));
  assert.equal(capacity.references[0].dependency,'isolated_v2');
  assert.deepEqual(scanBackend(root),report);
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('comments, strings and generated definitions do not become consumers',()=>{
 const {root,src}=fixture();
 try{
  write(src,'com/wartuneultra/autoforge/v2/ClientFightCapacity.java','public class ClientFightCapacity {}');
  write(src,'demo/BagService.java','class BagService {\n // ForgeEnhancementCost.gold(1,2,3);\n String literal="ForgeEnhancementCost";\n void strengthen(){}\n}');
  const report=scanBackend(root),gold=rule(report,'forge.common.enhancement.gold');
  assert.equal(report.filesScanned,1);assert.equal(gold.references.length,0);assert.equal(gold.status,'CANDIDATES_ONLY');
  assert.equal(gold.candidates[0].line,4);
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('unknown architecture stays unresolved and result lists are capped',()=>{
 const {root,src}=fixture();
 try{
  write(src,'Other.java','class Other {\n'+Array.from({length:30},()=> ' double get(){return ForgeEnhancementCost.gold(1,2,3);}').join('\n')+'\n}');
  const report=scanBackend(root),gold=rule(report,'forge.common.enhancement.gold');
  assert.equal(gold.referenceCount,30);assert.equal(gold.references.length,24);assert.equal(gold.truncation.references,true);
  assert.equal(gold.references[0].dependency,'unresolved_package');
  assert.equal(rule(report,'quest.condition.vocabulary').status,'UNRESOLVED');
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('missing Java root errors instead of producing an empty success',()=>{
 const root=mkdtempSync(join(tmpdir(),'af-backend-'));
 try{assert.throws(()=>scanBackend(root),/missing/);}finally{rmSync(root,{recursive:true,force:true});}
});
test('linked Java files are skipped and linked backend roots are refused',t=>{
 const {root,src}=fixture(),outside=mkdtempSync(join(tmpdir(),'af-backend-other-'));
 try{
  writeFileSync(join(outside,'Outside.java'),'class ForgeStrengthenService{}');
  const link=join(root,'linked-backend');
  try{symlinkSync(src,link,process.platform==='win32'?'junction':'dir');}catch(e){if(['EPERM','EACCES'].includes(e.code)){t.skip('Symlink privilege unavailable');return;}throw e;}
  assert.throws(()=>scanBackend(link),/symlink|junction/i);
  // Directory link inside source must not be followed into outside content.
  symlinkSync(outside,join(src,'outside'),process.platform==='win32'?'junction':'dir');
  const report=scanBackend(root);assert.equal(report.filesScanned,0);assert.equal(report.skippedLinks.length,1);
 }finally{rmSync(root,{recursive:true,force:true});rmSync(outside,{recursive:true,force:true});}
});
