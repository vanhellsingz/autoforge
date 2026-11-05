#!/usr/bin/env node
// AutoForge Plus - single entry point for the Arena / GitHub runner.
//   node plus/plus.mjs scan  --backend JAVA_V1 [--client CLIENT] [--out DIR] [--base origin/main] [--live | --live-schema FILE] [--baseline FILE] [--strict]
//   node plus/plus.mjs gate  [--port N] [--health-url URL] [--pid N | --pid-file F] [--jar F --jar-sha256 H] [--log-file F] [--baseline FILE] [--out DIR]
//   node plus/plus.mjs apply --from DELIVERY --backend JAVA_V1 [--verify "mvn -q -o test"] [--dry-run]
//   node plus/plus.mjs rollback --backend JAVA_V1 [--id ID]
// Exit code 1 only for FAIL (or new findings with --strict). Scan and gate never modify backend, client or database.
import {appendFileSync, existsSync, readFileSync} from 'node:fs';
import {join, resolve, dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Check, assertOutside, parseArgs, writeAtomic, writeJson, redact} from './lib.mjs';
import {branchAdapter} from './branch-adapter.mjs';
import {protocolParity} from './protocol-parity.mjs';
import {mysqlGuard} from './mysql-guard.mjs';
import {javaWiring} from './java-wiring.mjs';
import {runtimeGate} from './runtime-gate.mjs';

export const LIMITATIONS = [
  'Static evidence: a token, SQL literal or class reference is not proof that a feature works in gameplay.',
  'The report is bound to the checked-out working tree, not necessarily to the JAR that is running.',
  'No code of the client or backend is executed; no database write, migration, clean or repair is ever performed.',
  'Model of the schema parsed from migrations is approximate (no stored procedures / DELIMITER blocks / dynamic SQL).',
];

const nums = list => (list || []).map(Number).filter(Number.isInteger);

function summarize(checks) {
  const summary = {PASS: 0, WARN: 0, FAIL: 0, SKIP: 0};
  for (const c of checks) summary[c.status]++;
  let firstFailure = null;
  for (const c of checks) { const f = c.findings.find(x => x.level === 'FAIL'); if (f) { firstFailure = {check: c.id, code: f.code, message: f.message}; break; } }
  return {summary, firstFailure};
}

export function toMarkdown(report) {
  const icon = {PASS: 'PASS', WARN: 'WARN', FAIL: 'FAIL', SKIP: 'SKIP'};
  const lines = [`# AutoForge Plus report`, '', `Mode: **${report.mode}** | Result: **${report.result}** | ${report.generatedAt}`, ''];
  const g = report.profile;
  if (g) lines.push(`Branch: \`${g.branch ?? '?'}\` | HEAD: \`${(g.head ?? '?').slice(0, 12)}\` | Dirty files: ${g.dirtyFiles ?? '?'}`, '');
  if (report.firstFailure) lines.push(`> First failure: **${report.firstFailure.check}** / \`${report.firstFailure.code}\` - ${report.firstFailure.message}`, '');
  if (report.newFindings) lines.push(`Baseline: ${report.newFindings.length} new finding(s), ${report.knownFindings} known.`, '');
  lines.push('| Check | Status | Findings |', '|---|---|---|');
  for (const c of report.checks) lines.push(`| ${c.id} | ${icon[c.status]} | ${c.findings.length}${c.suppressedFindings ? ` (+${c.suppressedFindings} hidden)` : ''} |`);
  for (const c of report.checks.filter(c => c.status !== 'PASS')) {
    lines.push('', `## ${c.id} - ${c.status}`, c.skipReason ? `Skipped: ${c.skipReason}` : '');
    for (const f of c.findings.filter(f => f.level !== 'INFO').slice(0, 15)) lines.push(`- **${f.level}** \`${f.code}\` ${f.message}`);
    const infos = c.findings.filter(f => f.level === 'INFO').length;
    if (infos) lines.push(`- ${infos} informational note(s) in the JSON report.`);
  }
  lines.push('', '## Limits', ...report.limitations.map(l => `- ${l}`), '');
  return lines.join('\n');
}

function finish(mode, checks, ctx, out, extra = {}) {
  const {summary, firstFailure} = summarize(checks);
  const report = {schemaVersion: 'autoforge.plus.v1', mode, generatedAt: new Date().toISOString(), profile: ctx.profile ? {...ctx.profile.git} : null, result: summary.FAIL ? 'FAIL' : summary.WARN ? 'WARN' : 'PASS', summary, firstFailure, checks: checks.map(c => c.toJSON()), limitations: LIMITATIONS, ...extra};
  let exitFail = summary.FAIL > 0;
  // Baseline: recognize existing WARN findings, but never suppress FAIL findings.
  const keys = checks.flatMap(c => c.keysFor(['FAIL', 'WARN']));
  if (ctx.baseline && existsSync(ctx.baseline)) {
    const known = new Set(JSON.parse(readFileSync(ctx.baseline, 'utf8')).keys || []);
    const fresh = keys.filter(k => !known.has(k));
    report.newFindings = fresh; report.knownFindings = keys.length - fresh.length;
    // A baseline may explain historical WARNs, but never permits a known destructive
    // migration, failed health probe or other FAIL to pass CI unnoticed.
    exitFail = summary.FAIL > 0 || (ctx.strict && fresh.length > 0);
  } else if (ctx.strict) exitFail = summary.FAIL + summary.WARN > 0;
  report.exitCode = exitFail ? 1 : 0;
  writeJson(join(out, `plus-${mode}-report.json`), report);
  writeAtomic(join(out, `PLUS_${mode.toUpperCase()}_REPORT.md`), toMarkdown(report));
  writeJson(join(out, `plus-${mode}-baseline.json`), {schemaVersion: 1, keys});
  for (const c of checks) if (c.artifact && (!c.artifact.onlyWhenGreen || summary.FAIL === 0)) writeJson(join(out, c.artifact.name), c.artifact.data);
  if (process.env.GITHUB_STEP_SUMMARY) { try { appendFileSync(process.env.GITHUB_STEP_SUMMARY, toMarkdown(report) + '\n'); } catch { /* summary is best-effort */ } }
  return report;
}

export async function runScan(o) {
  if (!o.backend) throw Error('--backend is required');
  const backend = resolve(o.backend), client = o.client ? resolve(o.client) : null;
  const out = resolve(o.out || join(dirname(backend), 'autoforge-plus-output'));
  assertOutside(out, [backend, client]);                                   // protection: never write inside the project
  const ctx = {backend, client, out, base: o.base, live: !!o.live, liveSchema: o.liveSchema && resolve(o.liveSchema), requiredS2c: o.requiredS2c ? nums(o.requiredS2c) : [150, 301], criticalC2s: nums(o.criticalC2s), generatedRel: o.generatedRel, baseline: o.baseline && resolve(o.baseline), strict: !!o.strict};
  const checks = [await branchAdapter(ctx)];
  const ok = ctx.profile && ctx.profile.gameServer;
  for (const fn of [protocolParity, mysqlGuard, javaWiring]) {
    if (ok) checks.push(await fn(ctx));
    else { const id = {protocolParity: 'protocol-parity', mysqlGuard: 'mysql-guard', javaWiring: 'java-wiring'}[fn.name]; checks.push(new Check(id, id).skip('backend layout not detected')); }
  }
  return finish('scan', checks, ctx, out);
}

export async function runGate(o) {
  const out = resolve(o.out || join(process.cwd(), 'autoforge-plus-output'));
  const cfg = {...(o.config ? JSON.parse(readFileSync(resolve(o.config), 'utf8')) : {}), ...Object.fromEntries(Object.entries(o).filter(([k, v]) => k !== 'config' && v !== undefined))};
  const check = await runtimeGate(cfg);
  const ctx = {baseline: undefined, strict: !!o.strict};
  const report = finish('gate', [check], ctx, out);
  // Refresh the baseline only after a fully green gate (positive results are preserved otherwise).
  if (cfg.baseline && report.result === 'PASS' && check.artifact) writeJson(resolve(cfg.baseline), check.artifact.data);
  return report;
}

const HELP = `AutoForge Plus
  scan     --backend DIR [--client DIR] [--out DIR] [--base origin/main] [--live|--live-schema FILE]
           [--baseline FILE] [--required-s2c 150,301] [--critical-c2s 1,2] [--generated-rel autoforge/v2] [--strict]
  gate     [--config plus.runtime.json] [--host H] [--port N] [--admin-port N] [--health-url URL] [--pid N|--pid-file F]
           [--jar F --jar-sha256 H] [--log-file F] [--baseline FILE] [--out DIR]
  apply    --from DELIVERY --backend DIR [--verify "cmd"] [--dry-run] [--state DIR]
  rollback --backend DIR [--id ID] [--state DIR]
MySQL credentials only through env: PLUS_MYSQL_HOST/PORT/USER/PASSWORD/DATABASE.`;

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const argv = process.argv.slice(2), cmd = argv[0] && !argv[0].startsWith('--') ? argv.shift() : 'scan';
    if (cmd === 'help' || argv.includes('--help')) { console.log(HELP); }
    else if (cmd === 'apply' || cmd === 'rollback') {
      const {safeApply, rollback} = await import('./safe-apply.mjs');
      const {opts} = parseArgs(argv, {bool: ['dryRun'], list: ['verify']});
      if (!opts.backend) throw Error('--backend is required');
      const r = cmd === 'apply' ? await safeApply(opts) : await rollback(opts);
      console.log(`AutoForge Plus ${cmd}: ${r.status} (${r.id})`);
    } else if (cmd === 'scan' || cmd === 'gate') {
      const {opts} = parseArgs(argv, {bool: ['live', 'strict'], list: ['requiredS2c', 'criticalC2s']});
      const report = cmd === 'scan' ? await runScan(opts) : await runGate(opts);
      const s = report.summary;
      console.log(`AutoForge Plus ${cmd}: ${report.result} (PASS ${s.PASS} / WARN ${s.WARN} / FAIL ${s.FAIL} / SKIP ${s.SKIP})`);
      if (report.firstFailure) console.log(`First failure: ${report.firstFailure.check}/${report.firstFailure.code} - ${report.firstFailure.message}`);
      process.exitCode = report.exitCode;
    } else throw Error(`Unknown command "${cmd}". Use --help.`);
  } catch (e) { console.error(`AutoForge Plus: ${redact(e.message)}`); process.exitCode = 1; }
}
