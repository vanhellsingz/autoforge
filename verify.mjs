// Verify delivery artifacts as data. Hash consistency is not a Java execution sandbox.
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';
import { isAbsolute, join, parse, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
function noLinks(path) {
  const absolute = resolve(path), root = parse(absolute).root;
  let cursor = root;
  for (const part of absolute.slice(root.length).split(sep).filter(Boolean)) {
    cursor = join(cursor, part);
    if (lstatSync(cursor).isSymbolicLink()) throw Error(`Symlink/junction refused: ${cursor}`);
  }
}
function safePath(root, path) {
  if (typeof path !== 'string' || !path || path.includes('\\') || path.includes(':') || path.includes('\0') || isAbsolute(path)
      || path.split('/').some(part => !part || part === '.' || part === '..')) throw Error(`Unsafe relative path: ${String(path)}`);
  const absolute = resolve(root, path), rel = relative(root, absolute);
  if (!rel || rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel)) throw Error(`Path escapes root: ${path}`);
  noLinks(absolute);
  if (!lstatSync(absolute).isFile()) throw Error(`Expected file: ${path}`);
  return absolute;
}
function decodeJson(bytes, description) {
  try { return JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, '')); }
  catch (error) { throw Error(`Cannot read ${description}: ${error.message}`); }
}
const loadJson = (path, description) => decodeJson(readFileSync(path), description);
function checkHash(bytes, expected, description) {
  if (!digest(expected)) throw Error(`Invalid SHA-256 for ${description}`);
  if (hash(bytes) !== expected) throw Error(`Hash mismatch: ${description}`);
}

/** Verify all manifest files/evidence and optionally their client source snapshot. */
export function verifyBundle({ from, client } = {}) {
  if (typeof from !== 'string' || !from) throw Error('Delivery directory --from is required');
  const root = resolve(from); noLinks(root);
  if (!lstatSync(root).isDirectory()) throw Error('Delivery root must be a directory');
  const manifest = loadJson(safePath(root, 'manifest.json'), 'manifest.json');
  if (manifest.schemaVersion !== 1 || manifest.validated !== true) throw Error('Manifest must have schemaVersion 1 and validated:true');
  if (!Array.isArray(manifest.files) || !manifest.files.length || !Array.isArray(manifest.evidence) || !manifest.evidence.length) throw Error('Manifest requires nonempty files and evidence arrays');
  if (client !== undefined && (typeof client !== 'string' || !client)) throw Error('Invalid client directory');
  const clientRoot = client === undefined ? undefined : resolve(client);
  if (clientRoot) { noLinks(clientRoot); if (!lstatSync(clientRoot).isDirectory()) throw Error('Client root must be a directory'); }
  const seen = new Set(), classes = new Set(), files = [], evidence = [], sourceChecks = [];
  function unique(path) { const key = path.toLowerCase(); if (seen.has(key)) throw Error(`Duplicate manifest path: ${path}`); seen.add(key); }
  for (const file of manifest.files) {
    if (!file || typeof file.className !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(file.className)
        || file.path !== `generated/${file.className}.java`) throw Error('Invalid generated class path or name');
    unique(file.path);
    if (classes.has(file.className.toLowerCase())) throw Error(`Duplicate class: ${file.className}`);
    classes.add(file.className.toLowerCase());
    const bytes = readFileSync(safePath(root, file.path)); checkHash(bytes, file.sha256, file.path);
    files.push({ path: file.path, sha256: file.sha256, className: file.className });
  }
  const byPath = new Map(files.map(file => [file.path, file])), covered = new Set(), sourceHashes = new Map(), rules = new Set();
  for (const entry of manifest.evidence) {
    if (!entry || typeof entry.path !== 'string' || !/^[A-Za-z0-9_-]+\.evidence\.json$/.test(entry.path)) throw Error('Invalid evidence path');
    unique(entry.path);
    const absolute = safePath(root, entry.path), bytes = readFileSync(absolute); checkHash(bytes, entry.sha256, entry.path);
    const report = decodeJson(bytes, entry.path);
    if (!report || typeof report.rule !== 'string' || !/^[a-zA-Z0-9_.-]+$/.test(report.rule)) throw Error(`Invalid rule in ${entry.path}`);
    if (rules.has(report.rule)) throw Error(`Duplicate evidence rule: ${report.rule}`); rules.add(report.rule);
    const generated = report.generated, file = generated && byPath.get(generated.path);
    if (!file || generated.sha256 !== file.sha256) throw Error(`Evidence/generated manifest mismatch: ${entry.path}`);
    covered.add(file.path);
    if (report.comparison !== undefined && (!report.comparison || report.comparison.mismatches !== 0)) throw Error(`Comparison not successful: ${entry.path}`);
    const sources = report.sources ?? (report.source ? [report.source] : undefined);
    if (!Array.isArray(sources) || !sources.length) throw Error(`Missing source provenance: ${entry.path}`);
    for (const source of sources) {
      if (!source || typeof source.path !== 'string' || !digest(source.sha256)) throw Error(`Invalid source provenance: ${entry.path}`);
      // Validate source paths even when no client snapshot was supplied.
      if (!source.path || source.path.includes('\\') || source.path.includes(':') || source.path.includes('\0') || isAbsolute(source.path)
          || source.path.split('/').some(part => !part || part === '.' || part === '..')) throw Error(`Unsafe source path: ${source.path}`);
      const key = source.path.toLowerCase(), prior = sourceHashes.get(key);
      if (prior && prior.sha256 !== source.sha256) throw Error(`Contradictory source hashes: ${source.path}`);
      if (!prior) {
        sourceHashes.set(key, source);
        if (clientRoot) {
          const sourceBytes = readFileSync(safePath(clientRoot, source.path)); checkHash(sourceBytes, source.sha256, `client/${source.path}`);
          sourceChecks.push({ path: source.path, sha256: source.sha256, status: 'MATCHED' });
        }
      }
    }
    evidence.push({ path: entry.path, sha256: entry.sha256, rule: report.rule, report });
  }
  for (const file of files) if (!covered.has(file.path)) throw Error(`Generated file lacks evidence: ${file.path}`);
  return { status: 'VERIFIED', files, evidence, sourceChecks };
}

function cli(args) {
  const result = {};
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (!['--from', '--client'].includes(key) || !args[i + 1] || args[i + 1].startsWith('--') || result[key.slice(2)] !== undefined) throw Error('Usage: node verify.mjs --from OUTPUT [--client CLIENT_ROOT]');
    result[key.slice(2)] = args[++i];
  }
  const verified = verifyBundle(result);
  console.log(JSON.stringify({ status: verified.status, files: verified.files.length, rules: verified.evidence.map(entry => entry.rule), clientSourcesChecked: verified.sourceChecks.length }, null, 2));
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try { cli(process.argv.slice(2)); }
  catch (error) { console.error(`AutoForge verification failed: ${error.message}`); process.exitCode = 1; }
}
