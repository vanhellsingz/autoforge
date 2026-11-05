import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {extractJavaMethods,scanContracts} from '../integration-contracts.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
test('extracts overloaded exact methods and ignores braces in comments and strings',()=>{
 const source='class A {\n/** doc { */\npublic int apply(int n) { String s="}"; if(n>0){return n;}return 0;}\npublic int apply(String s) {return 1;}\n}';
 const methods=extractJavaMethods(source);assert.equal(methods.length,2);assert.equal(methods[0].method,'apply');assert.equal(methods[0].startLine,3);assert.match(methods[0].signature,/^public int apply\(int n\)$/);assert.equal(methods[1].signature,'public int apply(String s)');
});
test('unsupported signatures and unicode escapes remain unresolved',()=>{
 assert.deepEqual(extractJavaMethods('class A { void run( {oops} }'),[]);
 assert.deepEqual(extractJavaMethods('class A { public void run() { String x="\\u0041"; } }'),[]);
});
test('resolves service method, actual dispatch and literal S2C with provenance',t=>{
 const root=mkdtempSync(join(tmpdir(),'af-contracts-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const service='apps/game-server/src/main/java/test/ForgeStrengthenService.java';
 const login='apps/game-server/src/main/java/com/wartuneultra/server/login/GameLoginHandler.java';
 const opcode='modules/protocol-legacy/src/main/java/com/wartuneultra/protocol/Opcodes.java';
 const java='class ForgeStrengthenService {\n public double strengthen(int n) {\n return ForgeEnhancementCost.gold(n,1,0);\n }\n}';
 for(const [path,text] of [[service,java],[login,'class GameLoginHandler { public void dispatch() { switch(n){case Opcodes.C_ITEM_STRENGTHEN -> handleItemStrengthen(frame,state);} } private void handleItemStrengthen(Frame frame, State state) { out.add(respond(frame,86,new StoreRspMsg())); out.add(respond(frame,Opcodes.U_C_BAG_MOVE_UPDATE,new ItemMovedListMsg())); } }'],[opcode,'class Opcodes { public static final int C_ITEM_STRENGTHEN=5150; public static final int U_C_BAG_MOVE_UPDATE=115; public static final int U_C_PLAYER_INFO=3; }']]){mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),text);}
 const report=scanContracts(root,{rules:[{id:'forge.common.enhancement.gold',references:[{path:service,line:3,sha256:hash(java)}],candidates:[]}]});
 const rule=report.rules[0];assert.equal(rule.methods[0].method,'strengthen');assert.equal(rule.methods[0].startLine,2);assert.equal(rule.handlers[0].method,'handleItemStrengthen');
 assert.equal(rule.protocol.find(p=>p.value===5150).direction,'C2S');assert.equal(rule.protocol.find(p=>p.value===115).direction,'S2C');assert.equal(rule.protocol.find(p=>p.value===86).directionConfidence,'outgoing_literal_respond_call');
 assert.equal(rule.protocol.find(p=>p.value===3).direction,'UNRESOLVED');assert.match(rule.methods[0].sha256,/^[a-f0-9]{64}$/);
 assert.equal(readFileSync(join(root,service),'utf8'),java);
});
test('changed/missing reference sources cannot become exact method facts',t=>{
 const root=mkdtempSync(join(tmpdir(),'af-contracts-'));t.after(()=>rmSync(root,{recursive:true,force:true}));mkdirSync(join(root,'source'));writeFileSync(join(root,'source','A.java'),'class A { public void x() {} }');
 const report=scanContracts(root,{rules:[{id:'forge.common.enhancement.gold',references:[{path:'source/A.java',line:1,sha256:'bad'},{path:'source/B.java',line:1}]}]});assert.equal(report.rules[0].methods.length,0);assert.equal(report.rules[0].unresolved.length,2);assert.ok(report.gaps.length);
 assert.throws(()=>scanContracts(root,{rules:[{id:'forge.common.enhancement.gold',references:[{path:'../escape.java',line:1}]}]}),/escapes/);
});
