import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {asset,assertSeparateOutput} from '../assets.mjs';
import {parseNumeric,emitJava} from '../numeric-ast.mjs';
test('asset finds renamed hashed file and refuses ambiguous versions',()=>{
 const root=mkdtempSync(join(tmpdir(),'af-assets-'));
 try{mkdirSync(join(root,'js'));writeFileSync(join(root,'js','bundle_release-0123456789.js'),'abc');
 assert.equal(asset(root,'js/bundle_release-aaaaaaaaaa.js').text,'abc');
 writeFileSync(join(root,'js','bundle_release-9999999999.js'),'def');
 assert.throws(()=>asset(root,'js/bundle_release-aaaaaaaaaa.js'),/found 2/);
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('output cannot overwrite client tree',()=>{
 assert.throws(()=>assertSeparateOutput('/client','/client/res/output'));
 assert.doesNotThrow(()=>assertSeparateOutput('/client','/output'));
});
test('numeric compiler rejects arbitrary calls and keeps floating-point division',()=>{
 assert.throws(()=>parseNumeric('process.exit(0)',new Map()));
 assert.throws(()=>parseNumeric('a; evil()',new Map([['a','a']])));
 assert.equal(emitJava(parseNumeric('1/2',new Map())),'(1.0 / 2.0)');
});
