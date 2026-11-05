// PLUS #5 - Transactional Safe Apply + Rollback.
// Wraps the EXISTING integrate.mjs (does not replace it): preview -> backup -> apply -> verify -> auto-rollback.
// Only the managed generated package may change. Any other critical backend file that differs after the apply
// (checked with the existing backend-guard.mjs) triggers a full restore. State lives OUTSIDE the backend.
import {cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {basename, dirname, join, relative, resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {assertOutside, canonicalPath, sha256, stat, walk, posix, writeJson, parseArgs, redact} from './lib.mjs';
import {detectBackend} from './branch-adapter.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const GENERATED_SUFFIX = 'src/main/java/com/wartuneultra/autoforge/v2';

export function treeHash(dir) {
  const files = [];
  if (stat(dir)?.isDirectory()) for (const f of walk(dir, {omit: new Set()})) files.push({path: posix(relative(dir, f)), sha256: sha256(readFileSync(f))});
  return files;
}
const sameTree = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function pidAlive(pid) { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } }
function acquireLock(state) {
  const lock = join(state, 'lock');
  try { writeFileSync(lock, String(process.pid), {flag: 'wx'}); return lock; }
  catch {
    const pid = Number(readFileSync(lock, 'utf8'));
    if (pid && pidAlive(pid)) throw Error(`Another safe-apply is running (pid ${pid}).`);
    rmSync(lock, {force: true}); writeFileSync(lock, String(process.pid), {flag: 'wx'}); return lock;
  }
}

export function restoreGenerated(genDir, backupDir, entry) {
  // Verify backup BEFORE removing the current package. A missing backup is NOT
  // an empty backup; deleting first would permanently lose generated code.
  if (entry.existedBefore && !stat(backupDir)?.isDirectory()) throw Error('Backup is missing; refusing to delete the installed package.');
  if (!Array.isArray(entry.backupTree) || !sameTree(treeHash(backupDir), entry.backupTree)) throw Error('Backup is corrupted; refusing to restore from it.');
  rmSync(genDir, {recursive: true, force: true});
  if (entry.existedBefore) { mkdirSync(dirname(genDir), {recursive: true}); cpSync(backupDir, genDir, {recursive: true}); }
  const now = treeHash(genDir);
  if (!sameTree(now, entry.backupTree)) throw Error('Rollback verification failed: restored tree differs from the backup.');
}

function diffSnapshots(a, b) {
  const A = new Map(a.files.map(f => [f.path, f.sha256])), B = new Map(b.files.map(f => [f.path, f.sha256])), d = [];
  if (a.commit !== b.commit) d.push(`HEAD changed ${a.commit} -> ${b.commit}`);
  for (const [p, h] of A) { if (!B.has(p)) d.push(`deleted ${p}`); else if (B.get(p) !== h) d.push(`changed ${p}`); }
  for (const p of B.keys()) if (!A.has(p)) d.push(`added ${p}`);
  return d;
}

export async function safeApply(o) {
  const backend = resolve(o.backend), from = resolve(o.from);
  const profile = detectBackend(backend);
  if (!profile.gameServer) throw Error('No game-server module found in backend.');
  const managed = resolve(profile.gameServer, GENERATED_SUFFIX);
  const genDir = resolve(o.generatedDir || managed);
  if (canonicalPath(genDir) !== canonicalPath(managed)) throw Error('Only the managed AutoForge generated package may be modified.');
  const state = resolve(o.state || join(dirname(backend), '.autoforge-plus-state', basename(backend)));
  assertOutside(state, [backend, from]);
  mkdirSync(state, {recursive: true});
  const integrate = join(here, '..', 'integrate.mjs');
  if (!existsSync(integrate)) throw Error('integrate.mjs not found next to plus/. Place plus/ inside the AutoForge tool directory.');
  const {captureBackendSnapshot} = await import(pathToFileURL(join(here, '..', 'backend-guard.mjs')).href);   // fail closed if absent

  const lock = acquireLock(state);
  const id = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = join(state, 'backups', id), journalPath = join(state, 'journal', `${id}.json`);
  const entry = {schemaVersion: 1, id, backend, from, generatedDir: genDir, status: 'STARTED', existedBefore: !!stat(genDir)?.isDirectory(), backupTree: null, steps: []};
  const log = (step, ok, detail) => { entry.steps.push({step, ok, ...(detail ? {detail: redact(detail).slice(0, 2000)} : {})}); writeJson(journalPath, entry); };
  const run = (extra, timeout = 180000) => execFileSync(process.execPath, [integrate, '--from', from, '--backend', backend, ...extra], {encoding: 'utf8', timeout, stdio: ['ignore', 'pipe', 'pipe']});
  try {
    const before = captureBackendSnapshot(backend);
    if (before.commitStatus !== 'VERSIONED') log('snapshot', true, `commit status ${before.commitStatus}`); else log('snapshot', true, `HEAD ${before.commit}`);

    try { log('preview', true, run([])); }
    catch (e) { entry.status = 'PREVIEW_REFUSED'; log('preview', false, String(e.stderr || e.message)); throw Error(`integrate.mjs preview refused the apply (nothing was changed): ${redact(String(e.stderr || e.message)).split('\n')[0]}`); }
    if (o.dryRun) { entry.status = 'DRY_RUN_OK'; writeJson(journalPath, entry); return entry; }

    if (entry.existedBefore) cpSync(genDir, backupDir, {recursive: true}); else mkdirSync(backupDir, {recursive: true});
    entry.backupTree = treeHash(entry.existedBefore ? backupDir : genDir);
    log('backup', true, `${entry.backupTree.length} file(s) saved`);

    let failure = null;
    try { log('apply', true, run(['--apply'])); } catch (e) { failure = `integrate --apply failed: ${String(e.stderr || e.message).split('\n')[0]}`; log('apply', false, failure); }
    if (!failure) {
      const diff = diffSnapshots(before, captureBackendSnapshot(backend));
      if (diff.length) { failure = `critical backend files changed outside the managed package: ${diff.slice(0, 5).join('; ')}`; log('guard', false, failure); } else log('guard', true, 'critical files identical');
    }
    for (const cmd of failure ? [] : (o.verify || [])) {
      const [bin, ...args] = cmd.split(/\s+/);
      try { log('verify', true, `${cmd}\n${execFileSync(bin, args, {cwd: backend, encoding: 'utf8', timeout: 20 * 60 * 1000, stdio: ['ignore', 'pipe', 'pipe']}).slice(-1500)}`); }
      catch (e) { failure = `verify command failed: ${cmd}`; log('verify', false, String(e.stderr || e.stdout || e.message).slice(-1500)); break; }
    }
    if (failure) {
      try { restoreGenerated(genDir, backupDir, entry); entry.status = 'ROLLED_BACK'; log('rollback', true, 'managed package restored and verified'); }
      catch (e) { entry.status = 'ROLLBACK_INCONSISTENT'; log('rollback', false, e.message); throw Error(`${failure}. ROLLBACK FAILED: ${e.message}. Restore manually from ${backupDir}`); }
      throw Error(`${failure}. Managed package rolled back; backend is as before.`);
    }
    entry.status = 'COMMITTED'; entry.afterTree = treeHash(genDir); writeJson(journalPath, entry);
    return entry;
  } finally { rmSync(lock, {force: true}); }
}

export async function rollback(o) {
  const backend = resolve(o.backend), profile = detectBackend(backend);
  const state = resolve(o.state || join(dirname(backend), '.autoforge-plus-state', basename(backend)));
  const dir = join(state, 'journal');
  const ids = existsSync(dir) ? readdirSync(dir).filter(n => n.endsWith('.json')).sort() : [];
  const pick = o.id ? `${o.id}.json` : [...ids].reverse().find(n => JSON.parse(readFileSync(join(dir, n), 'utf8')).status === 'COMMITTED');
  if (!pick || !ids.includes(pick)) throw Error('No committed apply found to roll back.');
  const entry = JSON.parse(readFileSync(join(dir, pick), 'utf8'));
  if (canonicalPath(entry.backend) !== canonicalPath(backend) ||
      canonicalPath(entry.generatedDir) !== canonicalPath(resolve(profile.gameServer, GENERATED_SUFFIX)) ||
      !/^[\dTZ-]+$/.test(entry.id) || `${entry.id}.json` !== pick ||
      !['COMMITTED', 'ROLLED_BACK_MANUAL'].includes(entry.status)) {
    throw Error('Rollback journal identity does not match the requested backend and managed package.');
  }
  if (entry.status !== 'COMMITTED') throw Error('This apply has already been rolled back.');
  if (entry.afterTree && !sameTree(treeHash(entry.generatedDir), entry.afterTree)) throw Error('Managed package was edited after the apply; refusing to overwrite manual changes.');
  mkdirSync(state, {recursive: true});
  const lock = acquireLock(state);
  try { restoreGenerated(entry.generatedDir, join(state, 'backups', entry.id), entry); entry.status = 'ROLLED_BACK_MANUAL'; writeJson(join(dir, pick), entry); return entry; }
  finally { rmSync(lock, {force: true}); }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const {opts, positional} = parseArgs(process.argv.slice(2), {bool: ['dryRun'], list: ['verify']});
    const cmd = positional[0] || 'apply';
    if (!opts.backend) throw Error('--backend is required');
    const r = cmd === 'rollback' ? await rollback(opts) : await safeApply({...opts, verify: (opts.verify || []).map(v => v)});
    console.log(`AutoForge Plus safe-apply: ${r.status} (${r.id})`);
  } catch (e) { console.error(`AutoForge Plus: ${e.message}`); process.exitCode = 1; }
}
