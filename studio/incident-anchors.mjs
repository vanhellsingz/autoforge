import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {lstatSync, readFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {captureBackendSnapshot, assertBackendSnapshot} from '../backend-guard.mjs';
import {extractJavaMethods} from '../integration-contracts.mjs';

const limits = {
  maxSymbols: 64, maxJavaFiles: 2500, maxFileBytes: 4 * 1024 * 1024,
  maxTotalBytes: 64 * 1024 * 1024, maxCandidatesPerSymbol: 24,
  scanMs: 30000, operationMs: 90000,
};
const hash = value => createHash('sha256').update(value).digest('hex');
const reserved = new Set(('abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while true false null _').split(' '));
function methodNames(symbols) {
  if (!Array.isArray(symbols) || symbols.length > limits.maxSymbols) throw Error('Expected at most 64 Java method names');
  for (const name of symbols) {
    if (typeof name !== 'string' || !/^[A-Za-z_$][A-Za-z0-9_$]{0,127}$/.test(name) || reserved.has(name)) {
      throw Error('Expected an exact Java method name supported by the static extractor');
    }
  }
  return [...new Set(symbols)];
}

function scan(backend, symbols) {
  const snapshot = captureBackendSnapshot(backend);
  const files = snapshot.files.filter(file => file.path.endsWith('.java'));
  const bySymbol = Object.fromEntries(symbols.map(name => [name, []]));
  const truncated = new Set();
  const coverage = {
    basis: 'Lexical Java method declarations in the critical backend snapshot',
    totalJavaFiles: files.length, scannedJavaFiles: 0, bytesRead: 0,
    skippedOversize: 0, skippedUnicodeEscapes: 0, stopReason: null, limits,
  };
  const deadline = performance.now() + limits.scanMs;
  for (let i = 0; symbols.length && i < files.length; i++) {
    if (i >= limits.maxJavaFiles || performance.now() >= deadline) {
      coverage.stopReason = i >= limits.maxJavaFiles ? 'FILE_LIMIT' : 'SCAN_DEADLINE';
      break;
    }
    const {path, sha256} = files[i];
    const full = join(snapshot.backendRoot, path);
    const stat = lstatSync(full);
    if (!stat.isFile()) throw Error('Backend Java source changed type: ' + path);
    if (stat.size > limits.maxFileBytes) { coverage.skippedOversize++; continue; }
    if (coverage.bytesRead + stat.size > limits.maxTotalBytes) { coverage.stopReason = 'BYTE_LIMIT'; break; }
    const bytes = readFileSync(full);
    if (hash(bytes) !== sha256) throw Error('Backend Java source changed during scan: ' + path);
    coverage.bytesRead += bytes.length;
    const source = bytes.toString('utf8');
    if (/\\u+[0-9a-fA-F]{4}/.test(source)) { coverage.skippedUnicodeEscapes++; continue; }
    coverage.scannedJavaFiles++;
    if (!symbols.some(name => source.includes(name))) continue;
    for (const {method, startLine, endLine, bodySha256} of extractJavaMethods(source)) {
      if (!Object.hasOwn(bySymbol, method)) continue;
      const candidates = bySymbol[method];
      if (candidates.length < limits.maxCandidatesPerSymbol) candidates.push({path, method, startLine, endLine, sha256, bodySha256});
      else truncated.add(method);
    }
  }
  assertBackendSnapshot(backend, snapshot);
  coverage.truncatedSymbols = [...truncated];
  coverage.missingSymbols = symbols.filter(name => bySymbol[name].length === 0);
  coverage.complete = (!symbols.length || files.length === coverage.scannedJavaFiles) && !truncated.size;
  const {schemaVersion, commit, commitStatus, scope} = snapshot;
  const snapshotDigest = hash(JSON.stringify({schemaVersion, commit, commitStatus, scope, files: snapshot.files}));
  return {commit, bySymbol, coverage, snapshotDigest};
}

// A separate process places a wall-clock deadline around snapshotting and even a single slow parser call.
const workerPath = fileURLToPath(import.meta.url);
export function findIncidentAnchors(backend, symbols) {
  const names = methodNames(symbols);
  if (typeof backend !== 'string' || !backend.trim()) throw Error('Backend root required');
  const result = spawnSync(process.execPath, [workerPath], {
    input: JSON.stringify({backend, symbols: names}), encoding: 'utf8', windowsHide: true,
    timeout: limits.operationMs, maxBuffer: 4 * 1024 * 1024,
  });
  if (result.error?.code === 'ETIMEDOUT') throw Error('Backend incident anchor operation exceeded deadline');
  if (result.error) throw result.error;
  if (result.status !== 0) throw Error(result.stderr.trim() || 'Backend incident anchor scan failed');
  return JSON.parse(result.stdout);
}

if (process.argv[1] && resolve(process.argv[1]) === workerPath) {
  try {
    const {backend, symbols} = JSON.parse(readFileSync(0, 'utf8'));
    process.stdout.write(JSON.stringify(scan(backend, methodNames(symbols))));
  } catch (error) {
    process.stderr.write(error.message);
    process.exitCode = 1;
  }
}
