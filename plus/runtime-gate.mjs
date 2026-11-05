// PLUS #6 - Runtime Health Gate + Regression Baseline for the RUNNING server (MySQL + Java).
// Ordered, non-destructive probes: process -> JAR hash -> game port -> admin port -> HTTP health -> MySQL ping -> log scan.
// Records the FIRST failing condition and keeps every positive result. A baseline detects regressions between runs.
// Never restarts, kills or writes to the server.
import net from 'node:net';
import {existsSync, readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {Check, guarded, sha256, tailFile, redact} from './lib.mjs';

export const tcpProbe = (host, port, ms = 3000) => new Promise(res => {
  const s = net.connect({host, port: Number(port)});
  const done = ok => { s.destroy(); res(ok); };
  s.setTimeout(ms, () => done(false)); s.once('connect', () => done(true)); s.once('error', () => done(false));
});

export const LOG_RULES = [
  {re: /FlywayValidateException|Validate failed: Migrations have failed validation/i, level: 'FAIL', code: 'LOG_FLYWAY_VALIDATE', msg: 'Flyway validation failed.'},
  {re: /Communications link failure|CommunicationsException|Connection refused.*3306/i, level: 'FAIL', code: 'LOG_MYSQL_LINK', msg: 'MySQL connection failures.'},
  {re: /Unknown column '[^']+'|Table '[^']+' doesn't exist|BadSqlGrammarException|SQLSyntaxErrorException/i, level: 'FAIL', code: 'LOG_SQL_SCHEMA', msg: 'SQL/schema mismatch errors (Java expects a different schema).'},
  {re: /HikariPool-\d+ - Connection is not available|Too many connections|Access denied for user/i, level: 'FAIL', code: 'LOG_POOL_OR_AUTH', msg: 'Connection pool exhausted or database access denied.'},
  {re: /OutOfMemoryError|Exception in thread "main"|APPLICATION FAILED TO START/i, level: 'FAIL', code: 'LOG_FATAL', msg: 'Fatal JVM/startup error.'},
  {re: /Deadlock found when trying to get lock/i, level: 'WARN', code: 'LOG_DEADLOCK', msg: 'MySQL deadlocks.'},
  {re: /Unhandled (?:opcode|packet|message)|unknown (?:opcode|protocol|packet)/i, level: 'WARN', code: 'LOG_UNHANDLED_PACKET', msg: 'Client packets the server did not handle.'},
];

export function scanLog(text, {npeThreshold = 20} = {}) {
  const hits = [];
  for (const r of LOG_RULES) { const n = (text.match(new RegExp(r.re.source, r.re.flags + 'g')) || []).length; if (n) hits.push({...r, count: n}); }
  const npe = (text.match(/NullPointerException/g) || []).length;
  if (npe > npeThreshold) hits.push({level: 'WARN', code: 'LOG_NPE_BURST', msg: 'NullPointerException burst.', count: npe});
  return hits;
}

export async function runtimeGate(cfg) {
  return guarded('runtime-gate', 'Running server health gate', async c => {
    const steps = [];
    const step = async (id, label, fn) => {
      let r; try { r = await fn(); } catch (e) { r = {status: 'FAIL', detail: redact(e.message).split('\n')[0]}; }
      steps.push({id, label, status: r.status, detail: r.detail}); return r;
    };
    const host = cfg.host || '127.0.0.1';
    if (cfg.pid || cfg.pidFile) await step('process', 'Server process alive', () => {
      const pid = Number(cfg.pid || readFileSync(cfg.pidFile, 'utf8').trim());
      try { process.kill(pid, 0); return {status: 'PASS', detail: `pid ${pid}`}; } catch (e) { return e.code === 'EPERM' ? {status: 'PASS', detail: `pid ${pid} (no permission to signal)`} : {status: 'FAIL', detail: `pid ${pid} not running`}; }
    });
    if (cfg.jar) await step('jar', 'Deployed JAR matches expected hash', () => {
      if (!existsSync(cfg.jar)) return {status: 'FAIL', detail: 'JAR file missing'};
      const h = sha256(readFileSync(cfg.jar));
      if (!cfg.jarSha256) return {status: 'WARN', detail: `sha256 ${h} (no --jar-sha256 to compare)`};
      return h === String(cfg.jarSha256).toLowerCase() ? {status: 'PASS', detail: h} : {status: 'FAIL', detail: `expected ${cfg.jarSha256}, found ${h}`};
    });
    if (cfg.port) await step('port', `Game port ${cfg.port} accepts connections`, async () => (await tcpProbe(host, cfg.port)) ? {status: 'PASS'} : {status: 'FAIL', detail: `${host}:${cfg.port} closed`});
    if (cfg.adminPort) await step('admin-port', `Admin port ${cfg.adminPort} accepts connections`, async () => (await tcpProbe(host, cfg.adminPort)) ? {status: 'PASS'} : {status: 'FAIL', detail: `${host}:${cfg.adminPort} closed`});
    if (cfg.healthUrl) await step('health', 'HTTP health endpoint', async () => {
      const r = await fetch(cfg.healthUrl, {signal: AbortSignal.timeout(5000)});
      return r.ok ? {status: 'PASS', detail: `HTTP ${r.status}`} : {status: 'FAIL', detail: `HTTP ${r.status}`};
    });
    if (cfg.mysqlHost || process.env.PLUS_MYSQL_HOST) await step('mysql', 'MySQL answers SELECT 1', async () => {
      const mh = cfg.mysqlHost || process.env.PLUS_MYSQL_HOST, mp = cfg.mysqlPort || process.env.PLUS_MYSQL_PORT || '3306';
      try {
        execFileSync('mysql', ['--batch', '--skip-column-names', '-h', mh, '-P', String(mp), '-u', process.env.PLUS_MYSQL_USER || cfg.mysqlUser || 'root', '-e', 'SELECT 1'], {encoding: 'utf8', timeout: 10000, stdio: ['ignore', 'pipe', 'pipe'], env: {...process.env, MYSQL_PWD: process.env.PLUS_MYSQL_PASSWORD || ''}});
        return {status: 'PASS'};
      } catch (e) {
        if (e.code === 'ENOENT') return (await tcpProbe(mh, mp)) ? {status: 'WARN', detail: 'mysql CLI missing; TCP port is open only'} : {status: 'FAIL', detail: `${mh}:${mp} closed`};
        return {status: 'FAIL', detail: redact(String(e.stderr || e.message)).split('\n')[0]};
      }
    });
    if (cfg.logFile) await step('logs', 'Recent server log is clean', () => {
      if (!existsSync(cfg.logFile)) return {status: 'WARN', detail: 'log file not found'};
      const hits = scanLog(tailFile(cfg.logFile, Number(cfg.logTailBytes) || 2 * 1024 * 1024), {npeThreshold: Number(cfg.npeThreshold) || 20});
      const worst = hits.some(h => h.level === 'FAIL') ? 'FAIL' : hits.length ? 'WARN' : 'PASS';
      return {status: worst, detail: hits.map(h => `${h.code}x${h.count}`).join(', ') || undefined, hits};
    });
    if (!steps.length) return c.skip('no probes configured (give --port, --health-url, --pid, --jar or --log-file)');

    let previous = null;
    if (cfg.baseline && existsSync(cfg.baseline)) { try { previous = JSON.parse(readFileSync(cfg.baseline, 'utf8')); } catch { c.warn('BASELINE_UNREADABLE', 'Baseline file is not valid JSON; ignored.'); } }
    for (const s of steps) {
      if (s.status === 'FAIL') c.fail(`GATE_${s.id.toUpperCase().replace(/-/g, '_')}`, `${s.label}: ${s.detail || 'failed'}`);
      else if (s.status === 'WARN') c.warn(`GATE_${s.id.toUpperCase().replace(/-/g, '_')}`, `${s.label}: ${s.detail || 'warning'}`);
      const prev = previous?.steps?.find(p => p.id === s.id);
      if (prev?.status === 'PASS' && s.status === 'FAIL') c.fail('GATE_REGRESSION', `Step "${s.id}" passed in the previous baseline and fails now.`, null, s.id);
    }
    const first = steps.find(s => s.status === 'FAIL');
    c.stats = {firstFailure: first ? {id: first.id, detail: first.detail || null} : null, steps: steps.map(({id, status, detail}) => ({id, status, ...(detail ? {detail} : {})}))};
    for (const s of steps) if (s.id === 'logs' && s.hits) for (const h of s.hits) c.add(h.level, h.code, `${h.msg} (${h.count} occurrence(s) in the log tail)`);
    // Baseline is only refreshed by a fully green run, so positive evidence is never overwritten by a bad run.
    c.artifact = {name: 'runtime-baseline.json', data: {schemaVersion: 1, steps: c.stats.steps}, onlyWhenGreen: true};
    c.baselinePath = cfg.baseline ? resolve(cfg.baseline) : null;
  });
}
