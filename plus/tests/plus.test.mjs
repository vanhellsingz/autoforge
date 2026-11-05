import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, symlinkSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {parseArgs, assertOutside, redact} from '../lib.mjs';
import {crc32, flywayChecksum, lintMigration, applyStatement, splitStatements, stripSql, javaSqlRefs, parseMigrationName, cmpVersion, normVersion} from '../mysql-guard.mjs';
import {computeParity, scanSources} from '../protocol-parity.mjs';
import {flattenYaml, reviewConfig} from '../java-wiring.mjs';
import {tcpProbe, scanLog} from '../runtime-gate.mjs';
import {runScan, runGate} from '../plus.mjs';
import {restoreGenerated, safeApply, rollback} from '../safe-apply.mjs';

const tmp = () => mkdtempSync(join(tmpdir(), 'plus-'));
const put = (root, rel, text) => { const p = join(root, rel); mkdirSync(join(p, '..'), {recursive: true}); writeFileSync(p, text); };

test('parseArgs handles flags, lists and inline values', () => {
  const {opts, positional} = parseArgs(['scan', '--backend', 'x', '--strict', '--required-s2c=1,2', '--base', 'origin/main'], {bool: ['strict'], list: ['requiredS2c']});
  assert.deepEqual(positional, ['scan']);
  assert.equal(opts.backend, 'x'); assert.equal(opts.strict, true); assert.deepEqual(opts.requiredS2c, ['1', '2']); assert.equal(opts.base, 'origin/main');
});

test('assertOutside refuses output inside protected tree', () => {
  assert.throws(() => assertOutside('/srv/backend/out', ['/srv/backend']));
  assert.doesNotThrow(() => assertOutside('/srv/out', ['/srv/backend']));
});

test('redact hides secrets', () => {
  assert.match(redact('password=abc123'), /\*\*\*/);
  assert.doesNotMatch(redact('jdbc:mysql://user:hunter2@host/db'), /hunter2/);
});

test('crc32 matches the standard check value and flyway checksum ignores line endings and BOM', () => {
  assert.equal(crc32(Buffer.from('123456789')), 0xCBF43926 | 0);
  assert.equal(flywayChecksum('a\r\nb\r\n'), flywayChecksum('\uFEFFa\nb\n'));
  assert.notEqual(flywayChecksum('a\nb\n'), flywayChecksum('a\nc\n'));
});

test('migration lint flags destructive SQL, ignores comments and strings, honors the allow marker', () => {
  const codes = lintMigration("-- DROP TABLE nope;\nINSERT INTO t(a) VALUES ('DROP TABLE x;');\nDROP TABLE old;\nALTER TABLE t DROP COLUMN c;\nDELETE FROM t;\nUPDATE t SET a=1;").map(f => f.code);
  assert.deepEqual(codes, ['DESTRUCTIVE_DROP', 'DESTRUCTIVE_DROP_COLUMN', 'DELETE_WITHOUT_WHERE', 'UPDATE_WITHOUT_WHERE']);
  const allowed = lintMigration('-- autoforge-plus: allow-destructive\nDROP TABLE old;');
  assert.equal(allowed[0].level, 'WARN');
  assert.equal(lintMigration('ALTER TABLE t ADD COLUMN x INT;').length, 0);
});

test('schema model follows CREATE/ALTER/RENAME', () => {
  const tables = new Map();
  const sql = 'CREATE TABLE IF NOT EXISTS `characters` (id BIGINT PRIMARY KEY, name VARCHAR(20), PRIMARY KEY (id), KEY k (name));\nALTER TABLE characters ADD COLUMN gold DECIMAL(10,2), ADD INDEX i (gold), DROP COLUMN name;\nALTER TABLE characters RENAME COLUMN gold TO coins;';
  for (const s of splitStatements(stripSql(sql))) applyStatement(tables, s.text, '1');
  assert.deepEqual([...tables.get('characters').columns].sort(), ['coins', 'id']);
});

test('java SQL references skip ON DUPLICATE KEY UPDATE and capture insert columns', () => {
  const r = javaSqlRefs('class A{ String q="INSERT INTO character_items (id, slot) VALUES (?,?) ON DUPLICATE KEY UPDATE slot=?"; String s="SELECT * FROM characters c JOIN accounts a ON 1=1";}');
  assert.deepEqual(r.tables.map(t => t.table).sort(), ['accounts', 'character_items', 'characters']);
  assert.deepEqual(r.inserts[0].columns, ['id', 'slot']);
});

test('flyway version helpers', () => {
  assert.equal(parseMigrationName('V1_2__x.sql').version, '1.2');
  assert.equal(normVersion('1.0'), '1');
  assert.ok(cmpVersion('1.10', '1.9') > 0);
});

test('protocol parity detects unhandled C2S, missing required S2C and dead listeners', () => {
  const root = tmp();
  try {
    put(root, 'c/main.js', 'new C2S100(); new C2S200(); net.on(S2C301, f); net.on(S2C999, g); S2C150;');
    put(root, 's/Handler.java', 'class H{ void x(){ new S2C150(); } int h(int op){ switch(op){ case 100: return 1; } return 0; } }');
    const cl = scanSources(root, [join(root, 'c/main.js')]);
    const sv = scanSources(root, [join(root, 's/Handler.java')], {javaCases: true});
    const p = computeParity(cl, sv, {requiredS2c: [150, 301], criticalC2s: [200]});
    assert.deepEqual(p.clientSendsUnhandled, [200]);
    assert.deepEqual(p.requiredMissing, [301]);
    assert.deepEqual(p.clientListensNeverSent, [301, 999]);
    assert.deepEqual(p.criticalUnhandled, [200]);
  } finally { rmSync(root, {recursive: true, force: true}); }
});

test('config review catches data-wiping settings without leaking values', () => {
  const flat = flattenYaml('spring:\n  jpa:\n    hibernate:\n      ddl-auto: create-drop\n  flyway:\n    clean-disabled: false\n  datasource:\n    password: topsecret\n    url: jdbc:mysql://h/db\n');
  const r = reviewConfig(flat);
  assert.ok(r.some(x => x.code === 'DDL_AUTO_DESTROYS_SCHEMA'));
  assert.ok(r.some(x => x.code === 'FLYWAY_CLEAN_ENABLED'));
  assert.ok(r.some(x => x.code === 'PLAINTEXT_DB_PASSWORD'));
  assert.ok(!JSON.stringify(r).includes('topsecret'));
});

test('runtime gate: tcp probe and log scanner', async () => {
  const srv = net.createServer(s => s.end());
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const {port} = srv.address();
  assert.equal(await tcpProbe('127.0.0.1', port), true);
  await new Promise(r => srv.close(r));
  assert.equal(await tcpProbe('127.0.0.1', port, 500), false);
  const hits = scanLog("ERROR Unknown column 'x' in 'field list'\nCommunications link failure\n");
  assert.deepEqual(hits.map(h => h.code).sort(), ['LOG_MYSQL_LINK', 'LOG_SQL_SCHEMA']);
});

test('end-to-end scan on a synthetic backend: FAILs on destructive migration, never writes inside backend', async () => {
  const root = tmp(), backend = join(root, 'backend'), client = join(root, 'client'), out = join(root, 'out');
  try {
    put(backend, 'apps/game-server/pom.xml', '<project/>');
    put(backend, 'apps/game-server/src/main/java/com/x/Svc.java', 'package com.x; class Svc{ String q="SELECT * FROM characters"; }');
    put(backend, 'apps/game-server/src/main/java/com/wartuneultra/autoforge/v2/Rule.java', 'package com.wartuneultra.autoforge.v2; class Rule{}');
    put(backend, 'apps/game-server/src/main/resources/db/migration/V1__init.sql', 'CREATE TABLE characters (id BIGINT);');
    put(backend, 'apps/game-server/src/main/resources/db/migration/V2__bad.sql', 'DROP TABLE characters;');
    put(backend, 'apps/game-server/src/main/resources/application.properties', 'spring.flyway.clean-disabled=false\n');
    put(client, 'libs/laya.core.js', 'Laya.version = "2.13.0";');
    put(client, 'main.js', 'new C2S5();');
    const rep = await runScan({backend, client, out, requiredS2c: [301]});
    assert.equal(rep.result, 'FAIL');
    assert.equal(rep.exitCode, 1);
    const codes = rep.checks.flatMap(c => c.findings.map(f => f.code));
    for (const code of ['DESTRUCTIVE_DROP', 'FLYWAY_CLEAN_ENABLED', 'GENERATED_RULE_NOT_WIRED', 'C2S_UNHANDLED', 'REQUIRED_S2C_NOT_SENT']) assert.ok(codes.includes(code), code);
    assert.ok(existsSync(join(out, 'plus-scan-report.json')));
    assert.ok(!existsSync(join(backend, 'plus-scan-report.json')));
    await assert.rejects(runScan({backend, out: join(backend, 'inside')}), /outside protected tree/);
  } finally { rmSync(root, {recursive: true, force: true}); }
});


test('output through a symlink cannot overwrite any file under the backend', () => {
  const root = tmp(), backend = join(root, 'backend'), alias = join(root, 'alias');
  try {
    mkdirSync(backend);
    symlinkSync(backend, alias, 'dir');
    assert.throws(() => assertOutside(join(alias, 'reports'), [backend]), /outside protected tree/);
  } finally { rmSync(root, {recursive: true, force: true}); }
});

test('full-size LayaAir bundle (> 8 MiB) is scanned including its last bytes', () => {
  const root = tmp();
  try {
    const path = join(root, 'bundle.js');
    writeFileSync(path, 'a'.repeat(9 * 1024 * 1024) + ';new C2S_8450(); S2C_4184;');
    const result = scanSources(root, [path]);
    assert.ok(result.c2s.has(8450));
    assert.ok(result.s2c.has(4184));
    assert.deepEqual(result.truncatedFiles, []);
  } finally { rmSync(root, {recursive: true, force: true}); }
});

test('oversize sources record explicit truncation instead of silently claiming completeness', () => {
  const root = tmp();
  try {
    const path = join(root, 'bundle.js');
    writeFileSync(path, 'a'.repeat(4096) + ' C2S_8450');
    const result = scanSources(root, [path], {maxBytes: 1024});
    assert.deepEqual(result.truncatedFiles, ['bundle.js']);
    assert.equal(result.c2s.size, 0);
  } finally { rmSync(root, {recursive: true, force: true}); }
});

test('existing FAIL in scan baseline remains blocking, even if previously known', async () => {
  const root = tmp(), backend = join(root, 'backend'), out = join(root, 'out');
  try {
    put(backend, 'apps/game-server/pom.xml', '<project/>');
    put(backend, 'apps/game-server/src/main/java/com/x/A.java', 'package com.x; class A {}');
    put(backend, 'apps/game-server/src/main/resources/db/migration/V1__init.sql', 'DROP TABLE characters;');
    const first = await runScan({backend, out});
    assert.equal(first.exitCode, 1);
    const second = await runScan({backend, out, baseline: join(out, 'plus-scan-baseline.json')});
    assert.ok(second.knownFindings > 0);
    assert.equal(second.result, 'FAIL');
    assert.equal(second.exitCode, 1);
  } finally { rmSync(root, {recursive: true, force: true}); }
});

test('rollback refuses missing backup before deleting the installed generated classes', () => {
  const root = tmp(), genDir = join(root, 'generated'), backup = join(root, 'missing');
  try {
    put(genDir, 'Keep.java', 'public class Keep {}');
    assert.throws(() => restoreGenerated(genDir, backup, {existedBefore: true, backupTree: []}), /Backup is missing/);
    assert.ok(existsSync(join(genDir, 'Keep.java')));
  } finally { rmSync(root, {recursive: true, force: true}); }
});

test('apply refuses an arbitrary generated directory before changing backend files', async () => {
  const root = tmp(), backend = join(root, 'backend');
  try {
    put(backend, 'apps/game-server/src/main/java/com/x/A.java', 'package com.x; class A {}');
    await assert.rejects(safeApply({backend, from: join(root, 'delivery'), generatedDir: join(backend, 'apps/game-server/src/main/java/com/x')}), /Only the managed/);
  } finally { rmSync(root, {recursive: true, force: true}); }
});

test('gate does not replace a successful runtime baseline when a probe is warning', async () => {
  const root = tmp(), out = join(root, 'out'), baseline = join(root, 'runtime-baseline.json');
  try {
    writeFileSync(baseline, JSON.stringify({schemaVersion: 1, steps: [{id:'jar', status:'PASS'}]}));
    const old = readFileSync(baseline, 'utf8');
    const rep = await runGate({jar: join(root, 'missing.jar'), port: 0, out, baseline});
    assert.equal(rep.result, 'FAIL');
    assert.equal(readFileSync(baseline, 'utf8'), old);
    const unknown = join(root, 'unknown.jar'); writeFileSync(unknown, 'hello');
    const warn = await runGate({jar: unknown, out, baseline});
    assert.equal(warn.result, 'WARN');
    assert.equal(readFileSync(baseline, 'utf8'), old);
  } finally { rmSync(root, {recursive: true, force: true}); }
});
