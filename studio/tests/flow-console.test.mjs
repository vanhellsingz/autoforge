import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {request} from 'node:http';
import {createFlowConsole, readFlowPackage} from '../flow-console.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'af-flow-console-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  const sources = {
    'flow.json': JSON.stringify({stages:[{id:'request',title:'<img src=x onerror=alert(1)>',status:'RESOLVED'}],captureQuestions:[]}),
    'validation.json': JSON.stringify({claims:{runtime:'NOT_RUN',patchApplied:false}}),
    'ARENA.txt': 'Review exact sources before changing the backend.',
  };
  const artifacts = {};
  for (const [path, content] of Object.entries(sources)) {
    writeFileSync(join(root, path), content);
    artifacts[path] = hash(content);
  }
  const manifest = {schemaVersion:'autoforge.vertical-slice.v1',actionQuery:'test',coverage:{status:'COMPLETE_STATIC_MAP'},artifacts};
  writeFileSync(join(root, 'manifest.json'), JSON.stringify(manifest));
  return {root,manifest};
}

test('package reader verifies original bytes and rejects tampering and path traversal', t => {
  const f = fixture(t);
  assert.equal(readFlowPackage(f.root).integrity, 'MANIFEST_ARTIFACT_HASHES_MATCH');
  writeFileSync(join(f.root, 'ARENA.txt'), 'changed');
  assert.throws(() => readFlowPackage(f.root), /changed/);
  delete f.manifest.artifacts['ARENA.txt'];
  f.manifest.artifacts['../outside.json'] = 'a'.repeat(64);
  writeFileSync(join(f.root, 'manifest.json'), JSON.stringify(f.manifest));
  assert.throws(() => readFlowPackage(f.root), /relative artifact/);
});

test('normal console routes serve verified data and block writes, arbitrary files and foreign hosts', async t => {
  const f = fixture(t);
  const server = createFlowConsole({packageDirectory:f.root});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = 'http://127.0.0.1:' + server.address().port;
  const home = await fetch(base);
  assert.equal(home.status, 200);
  assert.match(home.headers.get('content-security-policy'), /script-src 'self'/);
  assert.match(await home.text(), /console.js/);
  const pkg = await (await fetch(base + '/api/package')).json();
  assert.equal(pkg.execution.patchApplied, false);
  assert.equal(pkg.documents['flow.json'].stages[0].title, '<img src=x onerror=alert(1)>');
  assert.equal((await fetch(base + '/api/package', {method:'POST',body:'{}'})).status, 405);
  assert.equal((await fetch(base + '/implementation.patch')).status, 404);
  const foreignStatus = await new Promise((accept, reject) => {
    const req = request(base + '/', {headers:{host:'foreign.test'}}, response => { response.resume(); accept(response.statusCode); });
    req.on('error', reject);
    req.end();
  });
  assert.equal(foreignStatus, 403);
  writeFileSync(join(f.root, 'ARENA.txt'), 'altered during viewing');
  assert.equal((await fetch(base + '/api/package')).status, 409);
});
