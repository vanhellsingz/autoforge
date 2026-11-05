import {captureBackendSnapshot} from '../backend-guard.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applyIntegration, integrate, planIntegration } from '../integrate.mjs';

const hash = data => createHash('sha256').update(data).digest('hex');
const targetRelative = 'apps/game-server/src/main/java/com/wartuneultra/autoforge/v2';
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'autoforge-integrate-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const from = join(root, 'output'), backend = join(root, 'java-v1');
  mkdirSync(join(from, 'generated'), { recursive: true }); mkdirSync(backend);
  const source = '// generated\npublic final class Sample { public static double value() { return 2.0; } }\n';
  const files = [{ path: 'generated/Sample.java', className: 'Sample', sha256: hash(source) }];
  writeFileSync(join(from, files[0].path), source);
  const manifest = { schemaVersion: 1, validated: true, files };
  const save = () => writeFileSync(join(from, 'manifest.json'), JSON.stringify(manifest));
  save();
  writeFileSync(join(from,'backend-snapshot.json'),JSON.stringify(captureBackendSnapshot(backend)));
  return { root, from, backend, files, manifest, save, target: join(backend, targetRelative, 'Sample.java') };
}

test('dry-run creates nothing; apply inserts isolated package and is idempotent', t => {
  const f = fixture(t);
  const plan = integrate(f);
  assert.equal(plan.entries[0].action, 'create');
  assert.equal(existsSync(f.target), false);
  assert.equal('content' in plan.entries[0], false);
  assert.equal(integrate({ ...f, apply: true }).applied, 1);
  assert.match(readFileSync(f.target, 'utf8'), /^package com\.wartuneultra\.autoforge\.v2;/);
  assert.equal(integrate({ ...f, apply: true }).applied, 0);
  assert.equal(integrate(f).entries[0].action, 'unchanged');
});

test('installs one public generated enum with methods', t => {
  const f = fixture(t);
  const source = 'public enum Sample { FIRST(1), SECOND(2); private final int id; Sample(int id) { this.id=id; } public int id() { return id; } }\n';
  writeFileSync(join(f.from, f.files[0].path), source);
  f.files[0].sha256 = hash(source); f.save();
  assert.equal(integrate({ ...f, apply: true }).applied, 1);
  assert.match(readFileSync(f.target, 'utf8'), /public enum Sample/);
  assert.equal(integrate(f).entries[0].action, 'unchanged');
});

test('updates its own intact managed file but refuses manual edits', t => {
  const f = fixture(t); integrate({ ...f, apply: true });
  const source = 'public final class Sample { public static double value() { return 3.0; } }\n';
  writeFileSync(join(f.from, f.files[0].path), source);
  f.files[0].sha256 = hash(source); f.save();
  assert.equal(integrate(f).entries[0].action, 'update');
  integrate({ ...f, apply: true });
  writeFileSync(f.target, readFileSync(f.target, 'utf8').replace('3.0', '4.0'));
  assert.equal(integrate(f).conflicts, 1);
  assert.throws(() => integrate({ ...f, apply: true }), /conflicts/);
  assert.match(readFileSync(f.target, 'utf8'), /4\.0/);
});

test('unmanaged collision prevents all writes', t => {
  const f = fixture(t);
  const other = 'public final class Other {}\n';
  f.files.push({ path: 'generated/Other.java', className: 'Other', sha256: hash(other) });
  writeFileSync(join(f.from, 'generated/Other.java'), other); f.save();
  mkdirSync(join(f.backend, targetRelative), { recursive: true });
  const otherTarget = join(f.backend, targetRelative, 'Other.java');
  writeFileSync(otherTarget, '// existing manual source\n');
  assert.throws(() => integrate({ ...f, apply: true }), /conflicts/);
  assert.equal(existsSync(f.target), false);
  assert.equal(readFileSync(otherTarget, 'utf8'), '// existing manual source\n');
});

test('rejects unvalidated, tampered, path escaping and duplicate inputs', t => {
  const f = fixture(t);
  f.manifest.validated = false; f.save();
  assert.throws(() => integrate(f), /validated manifest/);
  f.manifest.validated = true; f.files[0].path = '../Sample.java'; f.save();
  assert.throws(() => integrate(f), /descriptor/);
  f.files[0].path = 'generated/Sample.java'; f.files[0].sha256 = '0'.repeat(64); f.save();
  assert.throws(() => integrate(f), /hash/);
  f.files[0].sha256 = hash(readFileSync(join(f.from, f.files[0].path)));
  f.files.push({ ...f.files[0] }); f.save();
  assert.throws(() => integrate(f), /Duplicate/);
});

test('rejects wrong class, package and additional top-level classes', t => {
  const f = fixture(t);
  for (const source of ['public final class Wrong {}', 'package other; public final class Sample {}',
    'public final class Sample {} class Extra {}', 'public final class Sample {']) {
    writeFileSync(join(f.from, f.files[0].path), source);
    f.files[0].sha256 = hash(source); f.save();
    assert.throws(() => integrate(f), /class|package/i);
  }
});

test('rechecks target and source snapshots before write', t => {
  const f = fixture(t);
  const plan = planIntegration(f);
  mkdirSync(join(f.backend, targetRelative), { recursive: true });
  writeFileSync(f.target, '// concurrent edit');
  assert.throws(() => applyIntegration(plan), /Target changed/);
  assert.equal(readFileSync(f.target, 'utf8'), '// concurrent edit');
});

test('changed manifest or source invalidates a prepared plan', t => {
  const f = fixture(t);
  const plan = planIntegration(f);
  f.manifest.note = 'changed'; f.save();
  assert.throws(() => applyIntegration(plan), /Manifest changed/);
  const next = planIntegration(f);
  writeFileSync(join(f.from, f.files[0].path), 'public final class Sample {}');
  assert.throws(() => applyIntegration(next), /Source changed/);
  assert.equal(existsSync(f.target), false);
});

test('rejects a symlinked generated source', t => {
  const f = fixture(t), original = join(f.from, f.files[0].path);
  const outside = join(f.root, 'Sample.java');
  writeFileSync(outside, readFileSync(original));
  rmSync(original);
  try { symlinkSync(outside, original, 'file'); }
  catch (error) { if (['EPERM', 'EACCES'].includes(error.code)) { t.skip('Symlink privilege unavailable'); return; } throw error; }
  assert.throws(() => integrate(f), /Symlink/);
});

test('rejects symlinked source and target ancestors', t => {
  const f = fixture(t), external = join(f.root, 'outside'); mkdirSync(external);
  const link = join(f.backend, 'apps');
  try { symlinkSync(external, link, process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) { if (['EPERM', 'EACCES'].includes(error.code)) { t.skip('Symlink privilege unavailable'); return; } throw error; }
  assert.throws(() => integrate(f), /Symlink/);
  assert.equal(existsSync(join(external, 'game-server')), false);
});

test('apply requires a prepared backend snapshot and blocks stale service, migration and added sources',t=>{
 const f=fixture(t);rmSync(join(f.from,'backend-snapshot.json'));
 assert.throws(()=>integrate({...f,apply:true}),/snapshot required/);assert.equal(existsSync(f.target),false);
 const service=join(f.backend,'apps/game-server/src/main/java/Service.java');mkdirSync(join(f.backend,'apps/game-server/src/main/java'),{recursive:true});writeFileSync(service,'class Service{}');
 writeFileSync(join(f.from,'backend-snapshot.json'),JSON.stringify(captureBackendSnapshot(f.backend)));
 const plan=planIntegration(f);writeFileSync(service,'class Service{int changed;}');assert.throws(()=>applyIntegration(plan));assert.equal(existsSync(f.target),false);
 writeFileSync(service,'class Service{}');const migration=join(f.backend,'apps/game-server/src/main/resources/db/migration');mkdirSync(migration,{recursive:true});writeFileSync(join(migration,'V99__new.sql'),'SELECT 1;');assert.throws(()=>integrate({...f,apply:true}));assert.equal(existsSync(f.target),false);
});
