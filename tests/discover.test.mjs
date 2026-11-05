import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { discover } from '../discover.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'autoforge-discovery-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const dir of ['js', 'libs', 'res/release/config']) mkdirSync(join(root, dir), { recursive: true });
  writeFileSync(join(root, 'js/bundle_release-fixture.js'), '/* ç */ calculatePlayerFightCapacity(t){};t[t.C_BAG_SELL=5007]="C_BAG_SELL";');
  writeFileSync(join(root, 'res/release/config/t_s_items.json'), JSON.stringify({ t_s_itemtemplate: [
    { MasterType: 1, SonType: 101, Property1: 6 }, { MasterType: 2, SonType: 203, Property1: 6 },
  ] }));
  return root;
}
test('discovers discriminators, byte offsets and stable results without changing inputs', t => {
  const root = fixture(t), a = discover(root), b = discover(root);
  assert.deepEqual(a, b);
  assert.equal(a.itemCoverage.rows, 2);
  assert.equal(a.itemCoverage.byProperty1['6'], 2);
  assert.equal(a.itemCoverage.status, 'DISCOVERED_NOT_IMPLEMENTED');
  assert.equal(a.opcodes[0].opcode, 5007);
  assert.equal(a.candidates.capacity[0].start, Buffer.byteLength('/* ç */ '));
  assert.equal(a.sources.length, 2);
});
test('ignores backup extensions, rejects ambiguous main bundles', t => {
  const root = fixture(t);
  writeFileSync(join(root, 'js/bundle_release-fixture.js.before-test.js'), 'backup');
  assert.equal(discover(root).sources.length, 2);
  writeFileSync(join(root, 'js/bundle_release-second.js'), 'ambiguous');
  assert.throws(() => discover(root), /exactly one/);
});
test('caps search results, reports truncation and invalid catalogs', t => {
  const root = fixture(t);
  writeFileSync(join(root, 'js/bundle_release-fixture.js'), 'getIntensifuGold '.repeat(40));
  writeFileSync(join(root, 'res/release/config/t_s_bad.json'), '{bad');
  const report = discover(root);
  assert.equal(report.candidates.forge.length, 12);
  assert.equal(report.truncation.candidates.forge, 28);
  assert.ok(report.warnings.some(w => w.includes('Invalid JSON')));
});
test('recovers partial protobuf fields without executing generated code', t => {
  const root = fixture(t);
  writeFileSync(join(root, 'libs/protobuf-bundles-x.js'), 'ItemReqMsg.encode = function encode(message, writer) { writer.uint32(/* id 1, wireType 0 =*/8).int32(message.pos); return writer; };');
  const report = discover(root);
  assert.equal(report.messages[0].name, 'ItemReqMsg');
  assert.deepEqual(report.messages[0].fields, [{ id: 1, wireType: 0, type: 'int32', name: 'pos' }]);
});
