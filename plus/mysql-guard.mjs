// PLUS #3 - MySQL / Flyway Guard.
// Offline: lints migrations for destructive SQL, detects duplicate/out-of-order versions and rewritten history,
// builds an approximate schema model and compares it with the SQL embedded in the Java server.
// Optional live mode (read-only SELECTs on information_schema + flyway_schema_history) or --live-schema FILE.
// It NEVER runs migrations, DDL or DML.
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {basename, relative} from 'node:path';
import {guarded, walk, posix, readUtf8, git, javaLiterals, lineOf, redact} from './lib.mjs';
import {detectBackend} from './branch-adapter.mjs';

// ---------- Flyway checksum (CRC32 over lines, BOM stripped, line endings ignored) ----------
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
export function crc32(buf) { let c = 0xFFFFFFFF; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) | 0; }
export function flywayChecksum(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const lines = text.split(/\r\n|\r|\n/);
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  return crc32(Buffer.from(lines.join(''), 'utf8'));
}

// ---------- SQL helpers ----------
export function stripSql(text) {
  return text.replace(/\/\*[\s\S]*?\*\/|--[^\r\n]*|#[^\r\n]*|'(?:''|\\.|[^'\\])*'|"(?:""|\\.|[^"\\])*"/g, s => s.replace(/[^\r\n]/g, ' '));
}
export function splitStatements(masked) {
  const out = []; let start = 0;
  for (let i = 0; i <= masked.length; i++) if (i === masked.length || masked[i] === ';') {
    const t = masked.slice(start, i);
    if (t.trim()) out.push({text: t.trim(), offset: start + (t.length - t.trimStart().length)});
    start = i + 1;
  }
  return out;
}
const ALLOW = /autoforge-plus:\s*allow-destructive/i;
export function lintMigration(text) {
  const allow = ALLOW.test(text), out = [];
  const push = (level, code, message, offset) => out.push({level: allow && level === 'FAIL' ? 'WARN' : level, code, message: allow && level === 'FAIL' ? message + ' (allowed by marker)' : message, line: lineOf(text, offset)});
  for (const s of splitStatements(stripSql(text))) {
    const t = s.text;
    if (/^DROP\s+(?:TABLE|DATABASE|SCHEMA)\b/i.test(t)) push('FAIL', 'DESTRUCTIVE_DROP', 'DROP TABLE/DATABASE destroys live data.', s.offset);
    else if (/^TRUNCATE\b/i.test(t)) push('FAIL', 'DESTRUCTIVE_TRUNCATE', 'TRUNCATE destroys live data.', s.offset);
    else if (/^ALTER\s+TABLE\b[\s\S]*\bDROP\s+COLUMN\b/i.test(t)) push('FAIL', 'DESTRUCTIVE_DROP_COLUMN', 'DROP COLUMN breaks running code of the previous version.', s.offset);
    else if (/^DELETE\s+FROM\b/i.test(t) && !/\bWHERE\b/i.test(t)) push('WARN', 'DELETE_WITHOUT_WHERE', 'DELETE without WHERE.', s.offset);
    else if (/^UPDATE\b/i.test(t) && !/\bWHERE\b/i.test(t)) push('WARN', 'UPDATE_WITHOUT_WHERE', 'UPDATE without WHERE affects every row.', s.offset);
    else if (/^ALTER\s+TABLE\b[\s\S]*\b(?:MODIFY|CHANGE)\s/i.test(t)) push('WARN', 'COLUMN_REDEFINED', 'MODIFY/CHANGE can truncate data or break the previous version.', s.offset);
    else if (/^RENAME\s+TABLE\b/i.test(t) || /^ALTER\s+TABLE\s+\S+\s+RENAME\s+(?:TO|AS)\b/i.test(t)) push('WARN', 'TABLE_RENAMED', 'Renamed table breaks the previous version while it is still running.', s.offset);
  }
  return out;
}

const IDENT = '(?:`[^`]+`|[A-Za-z_][\\w$]*)(?:\\s*\\.\\s*(?:`[^`]+`|[A-Za-z_][\\w$]*))?';
const ID = '(`[^`]+`|[A-Za-z_][\\w$]*)';
const tname = s => s.replace(/`/g, '').replace(/\s/g, '').split('.').pop().toLowerCase();
const cname = s => s.replace(/`/g, '').toLowerCase();
function splitTop(body) { const parts = []; let depth = 0, cur = ''; for (const ch of body) { if (ch === '(') depth++; else if (ch === ')') depth--; if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; } else cur += ch; } if (cur.trim()) parts.push(cur); return parts; }
const NOT_COL = /^(?:PRIMARY|KEY|UNIQUE|INDEX|CONSTRAINT|FOREIGN|FULLTEXT|SPATIAL|CHECK|PERIOD|PARTITION)\b/i;

export function applyStatement(tables, stmt, version = null) {
  let m = new RegExp(`^CREATE\\s+(?:TEMPORARY\\s+)?TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?(${IDENT})\\s*\\(`, 'i').exec(stmt);
  if (m) {
    const name = tname(m[1]), end = stmt.lastIndexOf(')'), cols = new Set();
    for (const part of splitTop(stmt.slice(m[0].length, end > m[0].length ? end : undefined))) {
      const p = part.trim(); if (!p || NOT_COL.test(p)) continue;
      const c = new RegExp(`^${ID}`).exec(p); if (c) cols.add(cname(c[1]));
    }
    if (!tables.has(name)) tables.set(name, {columns: cols, createdBy: version});
    return;
  }
  m = new RegExp(`^DROP\\s+TABLE\\s+(?:IF\\s+EXISTS\\s+)?(${IDENT})`, 'i').exec(stmt);
  if (m) { tables.delete(tname(m[1])); return; }
  m = new RegExp(`^RENAME\\s+TABLE\\s+(${IDENT})\\s+TO\\s+(${IDENT})`, 'i').exec(stmt);
  if (m) { const t = tables.get(tname(m[1])); if (t) { tables.delete(tname(m[1])); tables.set(tname(m[2]), t); } return; }
  m = new RegExp(`^ALTER\\s+TABLE\\s+(${IDENT})\\s+([\\s\\S]*)$`, 'i').exec(stmt);
  if (!m) return;
  const name = tname(m[1]); let t = tables.get(name);
  if (!t) tables.set(name, t = {columns: new Set(), createdBy: null, partial: true});
  for (const raw of splitTop(m[2])) {
    const clause = raw.trim(); let a;
    if ((a = new RegExp(`^RENAME\\s+COLUMN\\s+${ID}\\s+TO\\s+${ID}`, 'i').exec(clause))) { t.columns.delete(cname(a[1])); t.columns.add(cname(a[2])); }
    else if ((a = new RegExp(`^RENAME\\s+(?:TO|AS)\\s+(${IDENT})`, 'i').exec(clause))) { tables.delete(name); tables.set(tname(a[1]), t); }
    else if ((a = new RegExp(`^ADD\\s+(?:COLUMN\\s+)?(?:IF\\s+NOT\\s+EXISTS\\s+)?(?!(?:INDEX|KEY|UNIQUE|PRIMARY|CONSTRAINT|FOREIGN|FULLTEXT|SPATIAL|CHECK|PARTITION)\\b)${ID}`, 'i').exec(clause))) t.columns.add(cname(a[1]));
    else if ((a = new RegExp(`^DROP\\s+COLUMN\\s+(?:IF\\s+EXISTS\\s+)?${ID}`, 'i').exec(clause))) t.columns.delete(cname(a[1]));
    else if ((a = new RegExp(`^CHANGE\\s+(?:COLUMN\\s+)?${ID}\\s+${ID}`, 'i').exec(clause))) { t.columns.delete(cname(a[1])); t.columns.add(cname(a[2])); }
  }
}

// ---------- Flyway versions ----------
export function parseMigrationName(file) {
  const m = /^V(\d+(?:[._]\d+)*)__(.+)\.sql$/i.exec(basename(file));
  return m ? {version: normVersion(m[1]), description: m[2]} : null;
}
export function normVersion(v) { const p = String(v).split(/[._]/).map(n => String(parseInt(n, 10))); while (p.length > 1 && p[p.length - 1] === '0') p.pop(); return p.join('.'); }
export function cmpVersion(a, b) { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; } return 0; }

// ---------- Java SQL references ----------
const SKIP_TABLES = new Set(['select', 'set', 'dual', 'values', 'where', 'table', 'lateral']);
export function javaSqlRefs(text) {
  const tables = [], inserts = [];
  for (const lit of javaLiterals(text)) {
    if (!/\b(?:SELECT|INSERT|UPDATE|DELETE)\b/i.test(lit.text)) continue;
    const masked = stripSql(lit.text);
    for (const m of masked.matchAll(new RegExp(`\\b(?:FROM|JOIN|UPDATE|INSERT(?:\\s+IGNORE)?\\s+INTO)\\s+(${IDENT})`, 'gi'))) {
      if (/information_schema|performance_schema|^mysql\./i.test(m[1])) continue;
      if (/^UPDATE/i.test(m[0]) && /DUPLICATE\s+KEY\s*$/i.test(masked.slice(0, m.index))) continue;
      const n = tname(m[1]);
      if (n.length > 1 && /^[a-z0-9_$]+$/.test(n) && !SKIP_TABLES.has(n)) tables.push({table: n, index: lit.index});
    }
    for (const m of masked.matchAll(new RegExp(`INSERT\\s+(?:IGNORE\\s+)?INTO\\s+(${IDENT})\\s*\\(([^)]*)\\)`, 'gi'))) {
      const cols = m[2].split(',').map(cname).map(s => s.trim()).filter(Boolean);
      if (!cols.some(c => /[?(%{]/.test(c))) inserts.push({table: tname(m[1]), columns: cols, index: lit.index});
    }
  }
  return {tables, inserts};
}

// ---------- Live schema (read-only) ----------
function mysqlRows(sql, env) {
  const out = execFileSync('mysql', ['--batch', '--raw', '--skip-column-names', '-h', env.PLUS_MYSQL_HOST || '127.0.0.1', '-P', env.PLUS_MYSQL_PORT || '3306', '-u', env.PLUS_MYSQL_USER || 'root', env.PLUS_MYSQL_DATABASE || '', '-e', sql],
    {encoding: 'utf8', timeout: 30000, maxBuffer: 64 * 1024 * 1024, env: {...process.env, MYSQL_PWD: env.PLUS_MYSQL_PASSWORD || ''}});
  return out.split('\n').filter(Boolean).map(l => l.split('\t'));
}
export function liveFromMysql(env = process.env, c = null) {
  const columns = mysqlRows('SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = DATABASE()', env).map(([table, column]) => ({table, column}));
  let flyway = null;
  try { flyway = mysqlRows('SELECT version, script, checksum, success FROM flyway_schema_history ORDER BY installed_rank', env).map(([version, script, checksum, success]) => ({version, script, checksum: checksum === 'NULL' ? null : Number(checksum), success: success === '1'})); }
  catch (e) { c?.warn('FLYWAY_HISTORY_UNREADABLE', 'flyway_schema_history could not be read: ' + redact(e.message).split('\n')[0]); }
  return {columns, flyway};
}

export async function mysqlGuard(ctx) {
  return guarded('mysql-guard', 'MySQL migrations, schema and Flyway safety', async c => {
    const p = ctx.profile || detectBackend(ctx.backend);
    const root = p.root;
    // 1) migrations
    const migrations = [];
    for (const dir of p.migrationDirs) for (const f of walk(dir, {ext: /\.sql$/i, depth: 0})) {
      const info = parseMigrationName(f), text = readUtf8(f);
      if (info) migrations.push({...info, file: f, rel: posix(relative(root, f)), text});
      else if (/^R__/i.test(basename(f))) c.info('REPEATABLE_MIGRATION', `Repeatable migration ${basename(f)} is re-applied whenever its checksum changes.`, null, basename(f));
      else c.warn('MIGRATION_BAD_NAME', `SQL file does not match V<version>__<description>.sql: ${posix(relative(root, f))}`, null, f);
    }
    migrations.sort((a, b) => cmpVersion(a.version, b.version));
    c.stats.migrations = migrations.length;
    c.stats.latestVersion = migrations.at(-1)?.version ?? null;
    const byVersion = new Map();
    for (const m of migrations) { (byVersion.get(m.version) || byVersion.set(m.version, []).get(m.version)).push(m); }
    for (const [v, list] of byVersion) if (list.length > 1) c.fail('MIGRATION_VERSION_DUPLICATE', `Version ${v} is used by ${list.length} files (${list.map(m => m.rel).join(', ')}). Flyway refuses to start.`, null, v);
    for (const m of migrations) for (const f of lintMigration(m.text)) c.add(f.level, f.code, `${m.rel}:${f.line} ${f.message}`, null, `${m.rel}:${f.line}:${f.code}`);

    // 2) history rewritten vs base ref (git, read-only)
    if (ctx.base && p.migrationDirs.length) {
      const resolved = git(root, ['rev-parse', '--verify', `${ctx.base}^{commit}`]);
      if (!resolved) c.warn('BASE_UNRESOLVED', `Base ref "${ctx.base}" cannot be resolved; migration history check skipped.`);
      else {
        const rels = p.migrationDirs.map(d => posix(relative(root, d)) || '.');
        const diff = git(root, ['diff', '--name-status', '-M', '--relative', ctx.base, '--', ...rels]) || '';
        const baseFiles = (git(root, ['ls-tree', '-r', '--name-only', ctx.base, '--', ...rels]) || '').split('\n').filter(Boolean);
        const baseMax = baseFiles.map(f => parseMigrationName(f)?.version).filter(Boolean).sort(cmpVersion).at(-1) ?? null;
        for (const line of diff.split('\n').filter(Boolean)) {
          const [st, ...paths] = line.split('\t'), file = paths.at(-1), info = parseMigrationName(paths[0]);
          if (!info) continue;
          if (/^[MDR]/.test(st)) c.fail('MIGRATION_HISTORY_REWRITTEN', `Already-versioned migration ${paths[0]} was ${st[0] === 'M' ? 'modified' : st[0] === 'D' ? 'deleted' : 'renamed'} relative to ${ctx.base}. Flyway validate fails on startup; add a new migration instead.`, null, line);
          else if (st === 'A' && baseMax && cmpVersion(parseMigrationName(file).version, baseMax) < 0) c.fail('MIGRATION_OUT_OF_ORDER', `New migration ${file} has a version lower than ${baseMax} already on ${ctx.base}.`, null, file);
          else if (st === 'A') c.info('MIGRATION_ADDED', `New migration ${file} (additive).`, null, file);
        }
      }
    } else if (!ctx.base) c.info('NO_BASE_REF', 'No --base ref given: pass --base origin/main to detect rewritten migration history.');

    // 3) schema model vs Java SQL
    const model = new Map();
    for (const m of migrations) for (const s of splitStatements(stripSql(m.text))) applyStatement(model, s.text, m.version);
    c.stats.modelTables = model.size;
    const refs = [];
    for (const d of p.javaDirs) for (const f of walk(d, {ext: /\.java$/})) {
      const text = readUtf8(f), r = javaSqlRefs(text), rel = posix(relative(root, f));
      for (const t of r.tables) refs.push({...t, rel, line: lineOf(text, t.index), kind: 'table'});
      for (const i of r.inserts) refs.push({...i, rel, line: lineOf(text, i.index), kind: 'insert'});
    }
    c.stats.javaSqlReferences = refs.length;
    if (model.size) {
      for (const r of refs) {
        const t = model.get(r.table);
        if (r.kind === 'table' && !t) c.warn('SQL_TABLE_NOT_IN_MIGRATIONS', `${r.rel}:${r.line} references table "${r.table}" that no migration creates (pre-baseline or dynamic?).`, null, `${r.table}`);
        if (r.kind === 'insert' && t && !t.partial) for (const col of r.columns) if (!t.columns.has(col)) c.warn('SQL_COLUMN_NOT_IN_MIGRATIONS', `${r.rel}:${r.line} INSERT uses column "${r.table}.${col}" unknown to migrations.`, null, `${r.table}.${col}`);
      }
    }

    // 4) live comparison
    let live = null;
    if (ctx.liveSchema) live = JSON.parse(readFileSync(ctx.liveSchema, 'utf8'));
    else if (ctx.live) { try { live = liveFromMysql(process.env, c); } catch (e) { c.warn('LIVE_UNAVAILABLE', 'Live MySQL read failed (mysql CLI/credentials via PLUS_MYSQL_*): ' + redact(e.message).split('\n')[0]); } }
    else c.info('NO_LIVE_SCHEMA', 'No live schema compared. Use --live (env PLUS_MYSQL_*) or --live-schema FILE.');
    if (live) {
      const liveCols = new Map();
      for (const {table, column} of live.columns || []) (liveCols.get(table.toLowerCase()) || liveCols.set(table.toLowerCase(), new Set()).get(table.toLowerCase())).add(column.toLowerCase());
      c.stats.liveTables = liveCols.size;
      const applied = (live.flyway || []).filter(r => r.version != null && r.version !== '').map(r => ({...r, version: normVersion(r.version)}));
      const localByVersion = new Map(migrations.map(m => [m.version, m]));
      const maxApplied = applied.map(a => a.version).sort(cmpVersion).at(-1) ?? null, maxLocal = migrations.at(-1)?.version ?? null;
      for (const a of applied) {
        if (a.success === false) c.fail('FLYWAY_FAILED_MIGRATION', `Migration ${a.version} is recorded as FAILED in the live database. Repair it before starting any branch.`, null, a.version);
        const local = localByVersion.get(a.version);
        if (!local) {
          if (maxLocal && cmpVersion(a.version, maxLocal) < 0) c.fail('APPLIED_MIGRATION_MISSING_LOCALLY', `Live DB applied ${a.version}, absent from this branch while lower than its latest (${maxLocal}). Flyway validate fails.`, null, a.version);
          else c.warn('DB_AHEAD_OF_BRANCH', `Live DB has migration ${a.version} that this branch does not know (branch is older than the database). Do not run clean/repair.`, null, a.version);
        } else if (a.checksum != null && flywayChecksum(local.text) !== a.checksum) c.fail('FLYWAY_CHECKSUM_MISMATCH', `Migration ${a.version} (${local.rel}) differs from what was applied (checksum). The server will refuse to start.`, null, a.version);
      }
      if (live.flyway) {
        const appliedSet = new Set(applied.map(a => a.version));
        const pending = migrations.filter(m => !appliedSet.has(m.version));
        c.stats.pendingMigrations = pending.length;
        for (const m of pending) {
          if (maxApplied && cmpVersion(m.version, maxApplied) < 0) c.fail('PENDING_MIGRATION_OUT_OF_ORDER', `Migration ${m.version} is pending but lower than the highest applied (${maxApplied}).`, null, m.version);
          else c.info('PENDING_MIGRATION', `Migration ${m.version} will run on next startup: take a backup first.`, null, m.version);
        }
        c.stats.pendingCreates = pending.flatMap(m => [...splitStatements(stripSql(m.text))].map(s => /^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\S+)/i.exec(s.text)?.[1]).filter(Boolean).map(tname));
      }
      const pendingTables = new Set(c.stats.pendingCreates || []);
      for (const r of refs) {
        const cols = liveCols.get(r.table);
        if (r.kind === 'table' && !cols && !pendingTables.has(r.table)) c.fail('SQL_TABLE_MISSING_LIVE', `${r.rel}:${r.line} uses table "${r.table}" which does not exist in the live database.`, null, r.table);
        if (r.kind === 'insert' && cols) for (const col of r.columns) if (!cols.has(col)) c.fail('SQL_COLUMN_MISSING_LIVE', `${r.rel}:${r.line} INSERT uses column "${r.table}.${col}" missing in the live database.`, null, `${r.table}.${col}`);
      }
    }
    c.artifact = {name: 'mysql-model.json', data: {schemaVersion: 'autoforge.plus.mysql-model.v1', approximate: true, tables: Object.fromEntries([...model].map(([n, t]) => [n, {createdBy: t.createdBy, columns: [...t.columns].sort()}])), migrations: migrations.map(m => ({version: m.version, file: m.rel}))}};
  });
}
