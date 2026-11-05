// AutoForge Plus - shared helpers. Zero dependencies. READ-ONLY toward the backend/client.
// Every write goes through writeAtomic() and is refused inside protected trees (assertOutside).
import {createHash} from 'node:crypto';
import {lstatSync,readdirSync,readFileSync,writeFileSync,renameSync,mkdirSync,openSync,readSync,closeSync,fstatSync,realpathSync} from 'node:fs';
import {dirname,join,resolve,relative,sep,isAbsolute} from 'node:path';
import {execFileSync} from 'node:child_process';

export const OMIT = new Set(['.git', 'target', 'node_modules', 'dist', 'build', 'out', '.idea', '.gradle', '.autoforge-plus']);
export const LIMIT_PER_CODE = 25;
export const posix = p => p.split(sep).join('/');
export const sha256 = b => createHash('sha256').update(b).digest('hex');

export function stat(p) {
  try { return lstatSync(p); } catch (e) { if (e.code === 'ENOENT' || e.code === 'ENOTDIR') return null; throw e; }
}

/** Deterministic walk. Symbolic links are never followed (same policy as backend-guard.mjs). */
export function* walk(dir, {ext = null, omit = OMIT, depth = 64} = {}) {
  if (depth < 0) return;
  const st = stat(dir);
  if (!st || st.isSymbolicLink() || !st.isDirectory()) return;
  let entries;
  try { entries = readdirSync(dir, {withFileTypes: true}); } catch { return; }
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const e of entries) {
    if (e.isSymbolicLink()) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (!omit.has(e.name)) yield* walk(p, {ext, omit, depth: depth - 1}); }
    else if (e.isFile() && (!ext || ext.test(e.name))) yield p;
  }
}

export function readUtf8(path, max = 8 * 1024 * 1024) {
  const b = readFileSync(path);
  return (b.length > max ? b.subarray(0, max) : b).toString('utf8');
}

/** Read only the last `bytes` of a file (log tails). */
export function tailFile(path, bytes = 2 * 1024 * 1024) {
  const fd = openSync(path, 'r');
  try {
    const size = fstatSync(fd).size, start = Math.max(0, size - bytes), len = size - start, buf = Buffer.alloc(len);
    readSync(fd, buf, 0, len, start);
    return buf.toString('utf8');
  } finally { closeSync(fd); }
}

export function writeAtomic(path, data) {
  mkdirSync(dirname(path), {recursive: true});
  const tmp = `${path}.tmp-${process.pid}`;
  writeFileSync(tmp, data);
  renameSync(tmp, path);
}
export const writeJson = (path, value) => writeAtomic(path, JSON.stringify(value, null, 2) + '\n');

/** Canonicalize existing ancestors too, so symlinked output cannot enter a protected tree. */
export function canonicalPath(path) {
  let current = resolve(path), suffix = [];
  while (!stat(current)) {
    const parent = dirname(current);
    if (parent === current) throw Error(`Cannot resolve output path: ${path}`);
    suffix.unshift(current.slice(parent.length).replace(/^[/\\]+/, ''));
    current = parent;
  }
  const real = resolve(realpathSync(current), ...suffix);
  return process.platform === 'win32' ? real.toLowerCase() : real;
}

/** Refuse output inside protected roots, including through symlinks. */
export function assertOutside(out, protectedRoots) {
  const o = canonicalPath(out);
  for (const r of protectedRoots.filter(Boolean)) {
    const base = canonicalPath(r), rel = relative(base, o);
    if (rel === '' || (rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel))) {
      throw Error(`Output must be outside protected tree: ${r}`);
    }
  }
}

export function redact(s) {
  return String(s)
    .replace(/(password|passwd|pwd|secret|token|api[-_]?key)(\s*[=:]\s*)(\S+)/gi, '$1$2***')
    .replace(/(\/\/[^/:@\s]+:)[^@\s]+@/g, '$1***@');
}

/** Read-only git helper. Returns null when git/repo is unavailable. Never writes (GIT_OPTIONAL_LOCKS=0). */
export function git(root, args) {
  try {
    return execFileSync('git', ['-C', root, ...args], {encoding: 'utf8', timeout: 20000, maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'], env: {...process.env, GIT_OPTIONAL_LOCKS: '0'}}).trim();
  } catch { return null; }
}

export function parseArgs(argv, {bool = [], list = []} = {}) {
  const opts = {}, positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { positional.push(a); continue; }
    const [rawKey, inline] = a.slice(2).split(/=(.*)/s, 2);
    const key = rawKey.replace(/-([a-z])/g, (m, c) => c.toUpperCase());
    if (bool.includes(key)) { opts[key] = inline === undefined ? true : inline !== 'false'; continue; }
    const value = inline !== undefined ? inline : argv[++i];
    if (value === undefined) throw Error(`--${rawKey} requires a value`);
    if (list.includes(key)) (opts[key] ||= []).push(...String(value).split(',').map(s => s.trim()).filter(Boolean));
    else opts[key] = value;
  }
  return {opts, positional};
}

/** Result container for one check. Findings per code are capped so reports stay bounded. */
export class Check {
  constructor(id, title) { this.id = id; this.title = title; this.findings = []; this.counts = {}; this.keys = new Set(); this.stats = {}; this.skipReason = null; this.artifact = null; }
  add(level, code, message, evidence = null, key = null) {
    this.keys.add(`${level}|${this.id}|${code}|${key ?? message}`);
    const bucket = `${level}|${code}`;
    const n = (this.counts[bucket] = (this.counts[bucket] || 0) + 1);
    if (n <= LIMIT_PER_CODE) this.findings.push({level, code, message: redact(message), ...(evidence ? {evidence} : {})});
    return this;
  }
  fail(code, message, evidence, key) { return this.add('FAIL', code, message, evidence, key); }
  warn(code, message, evidence, key) { return this.add('WARN', code, message, evidence, key); }
  info(code, message, evidence, key) { return this.add('INFO', code, message, evidence, key); }
  skip(reason) { this.skipReason = reason; return this; }
  has(level) { return Object.keys(this.counts).some(k => k.startsWith(level + '|')); }
  get status() { return this.skipReason ? 'SKIP' : this.has('FAIL') ? 'FAIL' : this.has('WARN') ? 'WARN' : 'PASS'; }
  get suppressed() { return Object.values(this.counts).reduce((a, n) => a + Math.max(0, n - LIMIT_PER_CODE), 0); }
  keysFor(levels) { return [...this.keys].filter(k => levels.includes(k.split('|')[0])); }
  toJSON() { return {id: this.id, title: this.title, status: this.status, ...(this.skipReason ? {skipReason: this.skipReason} : {}), stats: this.stats, suppressedFindings: this.suppressed, findings: this.findings}; }
}

/** A crashing check becomes a FAIL finding. It can never throw into the caller or touch the backend. */
export async function guarded(id, title, fn) {
  const c = new Check(id, title);
  try { await fn(c); } catch (e) { c.fail('CHECK_CRASHED', String(e && e.message || e)); }
  return c;
}

/** Java string-literal extractor (ignores comments, supports text blocks). */
export function javaLiterals(text) {
  const tokens = /\/\*[\s\S]*?\*\/|\/\/[^\r\n]*|"""[\s\S]*?"""|"(?:\\.|[^"\\\r\n])*"|'(?:\\.|[^'\\\r\n])+'/g;
  const out = [];
  for (const m of text.matchAll(tokens)) {
    const t = m[0];
    if (t[0] === '/' || t[0] === "'") continue;
    const triple = t.startsWith('"""');
    out.push({index: m.index, text: t.slice(triple ? 3 : 1, triple ? -3 : -1).replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t').replace(/\\"/g, '"')});
  }
  return out;
}

export const lineOf = (text, idx) => { let n = 1; for (let i = 0; i < idx && i < text.length; i++) if (text.charCodeAt(i) === 10) n++; return n; };
