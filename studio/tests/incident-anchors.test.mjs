import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {tmpdir} from 'node:os';
import {findIncidentAnchors} from '../incident-anchors.mjs';

const hash = text => createHash('sha256').update(text).digest('hex');
function fixture(t, files) {
  const root = mkdtempSync(join(tmpdir(), 'af-incident-anchors-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  for (const [path, source] of Object.entries(files)) {
    const full = join(root, path);
    mkdirSync(dirname(full), {recursive: true});
    writeFileSync(full, source);
  }
  return root;
}

test('indexes every exact declaration, with file and body hashes and explicit missing names', t => {
  const handler = 'apps/game-server/src/main/java/Handler.java';
  const other = 'modules/bag/src/main/java/Bag.java';
  const source = [
    'class Handler {', '  int use(int n) { return n; }', '  int use() { return 1; }',
    '  int unused() { return absent(); } // public void absent() {}', '}',
  ].join('\n');
  const root = fixture(t, {
    [handler]: source,
    [other]: 'class Bag {\n  void use() {}\n  void __proto__() {}\n}',
  });
  const result = findIncidentAnchors(root, ['use', 'absent', '__proto__', 'use']);
  assert.deepEqual(result.bySymbol.use.map(a => [a.path, a.method, a.startLine, a.endLine]),
    [[handler, 'use', 2, 2], [handler, 'use', 3, 3], [other, 'use', 2, 2]]);
  assert.equal(result.bySymbol.use[0].sha256, hash(source));
  assert.equal(result.bySymbol.use[0].bodySha256, hash('{ return n; }'));
  assert.equal(result.bySymbol.__proto__.length, 1);
  assert.deepEqual(result.bySymbol.absent, []);
  assert.deepEqual(result.coverage.missingSymbols, ['absent']);
  assert.equal(result.coverage.complete, true);
  assert.equal(result.commit, null);
  assert.match(result.snapshotDigest, /^[a-f0-9]{64}$/);
  assert.equal(findIncidentAnchors(root, []).snapshotDigest, result.snapshotDigest);
  writeFileSync(join(root, handler), source + '\n');
  assert.notEqual(findIncidentAnchors(root, ['use']).snapshotDigest, result.snapshotDigest);
});

test('reports omitted declarations and unsupported Unicode-escaped source', t => {
  const classes = Array.from({length: 30}, (_, i) => 'class C' + i + ' { void run() {} }').join('\n');
  const root = fixture(t, {
    'apps/game-server/src/main/java/Many.java': classes,
    'apps/game-server/src/main/java/Esc.java': 'class Esc { void \\u0067o() {} }',
  });
  const {bySymbol, coverage} = findIncidentAnchors(root, ['run', 'go']);
  assert.equal(bySymbol.run.length, coverage.limits.maxCandidatesPerSymbol);
  assert.deepEqual(coverage.truncatedSymbols, ['run']);
  assert.deepEqual(coverage.missingSymbols, ['go']);
  assert.equal(coverage.skippedUnicodeEscapes, 1);
  assert.equal(coverage.complete, false);
});

test('rejects patterns, invalid names and excess symbols before inspecting the backend', () => {
  for (const symbols of [['foo.*'], ['service.use'], ['if'], [null], ['a'.repeat(129)], Array(65).fill('use')]) {
    assert.throws(() => findIncidentAnchors('', symbols), /Java method name/);
  }
});
