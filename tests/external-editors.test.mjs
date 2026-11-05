import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {scanExternalEditors,parseEditorRoot,assertExternalEditorSnapshot} from '../external-editors.mjs';
function fixture(t){const root=mkdtempSync(join(tmpdir(),'af-editors-'));t.after(()=>rmSync(root,{recursive:true,force:true}));return root;}
test('no implicit editor roots, parser requires named paths, roots are unique',t=>{
 assert.deepEqual(scanExternalEditors().roots,[]);assert.deepEqual(parseEditorRoot('legacy=some path'),{name:'legacy',path:resolve('some path')});
 for(const text of ['', '=path','../x=path','name='])assert.throws(()=>parseEditorRoot(text));
 const root=fixture(t);assert.throws(()=>scanExternalEditors([{name:'a',path:root},{name:'A',path:root}]),/Duplicate/);assert.throws(()=>scanExternalEditors([{name:'a',path:root},{name:'b',path:root}]),/Duplicate/);
});
test('forms and write candidates stay separate and never prove correct persistence',t=>{
 const root=fixture(t),path=join(root,'character-editor.php'),text='<form action="save-character.php">\n<input name="gold" />\n</form>\nfetch("/character", { method: "POST", body: formData });\n';writeFileSync(path,text);
 const report=scanExternalEditors([{name:'legacy',path:root}]),refs=report.rules.find(r=>r.id==='forge.common.enhancement.gold').editorReferences;
 assert.ok(refs.some(r=>r.kind==='FORM_LOCATION'&&r.line===1));assert.ok(refs.some(r=>r.kind==='WRITE_CALL_CANDIDATE'&&r.line===4));assert.ok(refs.every(r=>r.writeProof==='NOT_VERIFIED'));assert.equal(report.roots[0].mode,'READ_ONLY');assert.equal(readFileSync(path,'utf8'),text);assert.deepEqual(scanExternalEditors([{name:'legacy',path:root}]),report);
});
test('credentials, configurations, vendor, backups and binary-looking sources are skipped',t=>{
 const root=fixture(t);writeFileSync(join(root,'db.php'),'secret password');writeFileSync(join(root,'config.php'),'secret password');writeFileSync(join(root,'inventory.old.php'),'<form gold>');mkdirSync(join(root,'vendor'));writeFileSync(join(root,'vendor','inventory.php'),'<form gold>');writeFileSync(join(root,'character.php'),'<form>\n<input name="gold" />\nconst password = "do not expose";\n');writeFileSync(join(root,'inventory.js'),Buffer.from([0,1,2]));
 const report=scanExternalEditors([{name:'legacy',path:root}]);assert.equal(report.sources.length,1);assert.equal(report.sources[0].path,'character.php');assert.doesNotMatch(JSON.stringify(report),/do not expose/);assert.ok(report.warnings.some(w=>w.includes('Binary')));
});
test('reports deterministic file/reference/byte bounds',t=>{
 const root=fixture(t);writeFileSync(join(root,'a-character.php'),Array(10).fill('<form><input name="gold"></form>').join('\n'));writeFileSync(join(root,'b-character.php'),'<form gold>');
 const files=scanExternalEditors([{name:'legacy',path:root}],{maxFiles:1,maxReferencesPerRule:2});assert.equal(files.sources.length,1);assert.equal(files.truncated.files,true);assert.equal(files.truncated.references,true);assert.equal(files.rules[0].editorReferences.length,2);
 assert.equal(scanExternalEditors([{name:'legacy',path:root}],{maxTotalBytes:1}).truncated.bytes,true);assert.equal(scanExternalEditors([{name:'legacy',path:root}],{maxBytesPerFile:1}).skippedOversized,2);
});
test('links are skipped inside a root and linked roots are refused',t=>{
 const root=fixture(t),outside=fixture(t);writeFileSync(join(outside,'character.php'),'<form gold>');const link=join(root,'linked');
 try{symlinkSync(outside,link,process.platform==='win32'?'junction':'dir');}catch(e){if(['EPERM','EACCES'].includes(e.code)){t.skip('Directory link privilege unavailable');return;}throw e;}
 const report=scanExternalEditors([{name:'legacy',path:root}]);assert.equal(report.sources.length,0);assert.equal(report.skippedLinks.length,1);assert.throws(()=>scanExternalEditors([{name:'legacy',path:link}]),/link refused/);
});

test('external snapshots reject modified, added, removed and incompletely scanned sources',t=>{
 const root=fixture(t),file=join(root,'character.php');writeFileSync(file,'<form gold>');const original=scanExternalEditors([{name:'legacy',path:root}]);assert.equal(assertExternalEditorSnapshot(original),true);
 writeFileSync(file,'<form power>');assert.throws(()=>assertExternalEditorSnapshot(original),/changed/);writeFileSync(file,'<form gold>');
 writeFileSync(join(root,'inventory.php'),'<form gold>');assert.throws(()=>assertExternalEditorSnapshot(original),/changed/);rmSync(join(root,'inventory.php'));rmSync(file);assert.throws(()=>assertExternalEditorSnapshot(original),/changed/);
 writeFileSync(file,'<form gold>');const incomplete=scanExternalEditors([{name:'legacy',path:root}],{maxBytesPerFile:1});assert.throws(()=>assertExternalEditorSnapshot(incomplete),/incomplete/);
});
