import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,symlinkSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {captureBackendSnapshot,assertBackendSnapshot} from '../backend-guard.mjs';
function fixture(t){const root=mkdtempSync(join(tmpdir(),'af-backend-guard-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const backend=join(root,'java-v1');mkdirSync(backend);const put=(path,text='original')=>{const file=join(backend,path);mkdirSync(join(file,'..'),{recursive:true});writeFileSync(file,text);return file;};return {root,backend,put};}
const critical=[
 'apps/game-server/src/main/java/test/Service.java',
 'apps/game-server/src/main/resources/db/migration/V1__init.sql',
 'apps/admin-web/src/views/ItemsPage.tsx',
 'modules/protocol-legacy/src/main/java/test/Opcodes.java',
 'pom.xml',
 'apps/game-server/pom.xml',
 'modules/protocol-legacy/pom.xml',
 'apps/admin-web/package-lock.json',
 'apps/admin-web/vite.config.ts',
 '.mvn/wrapper/maven-wrapper.properties',
];
test('captures deterministic file membership and hashes, never secret contents',t=>{const f=fixture(t);for(const path of critical)f.put(path);f.put('apps/game-server/src/main/resources/application.yml','password: secret-value');const a=captureBackendSnapshot(f.backend),b=captureBackendSnapshot(f.backend);assert.deepEqual(a,b);assert.equal(a.commit,null);assert.equal(a.commitStatus,'UNVERSIONED');assert.equal(a.files.length,critical.length+1);assert.doesNotMatch(JSON.stringify(a),/secret-value/);assert.equal(assertBackendSnapshot(f.backend,a).status,'MATCHED');});
test('refuses stale service, migration, admin, protocol and build hashes',t=>{for(const path of critical){const f=fixture(t);const file=f.put(path);const snapshot=captureBackendSnapshot(f.backend);writeFileSync(file,'changed');assert.throws(()=>assertBackendSnapshot(f.backend,snapshot),/Critical backend file changed/);}});
test('detects added and deleted files even without Git',t=>{const f=fixture(t);const path=critical[0],file=f.put(path),snapshot=captureBackendSnapshot(f.backend);f.put('apps/admin-web/src/new.tsx');assert.throws(()=>assertBackendSnapshot(f.backend,snapshot),/added/);rmSync(join(f.backend,'apps/admin-web/src/new.tsx'));rmSync(file);assert.throws(()=>assertBackendSnapshot(f.backend,snapshot),/deleted/);});
test('different destination root and invalid snapshot descriptors are refused',t=>{const f=fixture(t);f.put(critical[0]);const snapshot=captureBackendSnapshot(f.backend),other=join(f.root,'other');mkdirSync(other);assert.throws(()=>assertBackendSnapshot(other,snapshot),/root differs/);assert.throws(()=>assertBackendSnapshot(f.backend,{...snapshot,scope:[]}));assert.throws(()=>assertBackendSnapshot(f.backend,{...snapshot,files:[{path:'../escape',sha256:'a'.repeat(64)}]}));});
test('managed generated targets and build outputs are excluded for first install and idempotency',t=>{const f=fixture(t);f.put(critical[0]);const snapshot=captureBackendSnapshot(f.backend);f.put('apps/game-server/src/main/java/com/wartuneultra/autoforge/v2/Generated.java');f.put('apps/game-server/target/classes/test/Service.class');f.put('apps/admin-web/node_modules/x/package.json');f.put('apps/admin-web/dist/index.html');assert.equal(assertBackendSnapshot(f.backend,snapshot).status,'MATCHED');});
test('critical linked source roots are refused',t=>{const f=fixture(t),outside=join(f.root,'outside');mkdirSync(outside);mkdirSync(join(f.backend,'apps/game-server'),{recursive:true});try{symlinkSync(outside,join(f.backend,'apps/game-server/src'),process.platform==='win32'?'junction':'dir');}catch(error){if(['EPERM','EACCES'].includes(error.code)){t.skip('Directory link privilege unavailable');return;}throw error;}assert.throws(()=>captureBackendSnapshot(f.backend),/link refused/);});
test('unchanged critical bytes do not permit another Git commit',t=>{const f=fixture(t);f.put(critical[0]);const git=args=>execFileSync('git',['-C',f.root,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']});try{git(['init']);git(['add','.']);git(['-c','user.name=AutoForge Test','-c','user.email=autoforge-test@example.invalid','commit','-m','fixture']);}catch(error){if(['EPERM','ENOENT'].includes(error.code)){t.skip('Git subprocess unavailable');return;}throw error;}const snapshot=captureBackendSnapshot(f.backend);assert.equal(snapshot.commitStatus,'VERSIONED');writeFileSync(join(f.root,'unrelated.txt'),'new commit');git(['add','unrelated.txt']);git(['-c','user.name=AutoForge Test','-c','user.email=autoforge-test@example.invalid','commit','-m','unrelated']);assert.throws(()=>assertBackendSnapshot(f.backend,snapshot),/commit differs/);});
test('a snapshot whose Git identity was unreadable cannot authorize apply',t=>{const f=fixture(t);f.put(critical[0]);const snapshot=captureBackendSnapshot(f.backend);assert.throws(()=>assertBackendSnapshot(f.backend,{...snapshot,commitStatus:'GIT_UNAVAILABLE'}),/Git identity unavailable/);});
