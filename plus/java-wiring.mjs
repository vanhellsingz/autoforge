// PLUS #4 - Java Wiring & Connection-Config Guard.
// (a) Finds generated AutoForge classes that are installed but never called (pure rules that are not connected).
// (b) Statically reviews application.properties/yml for settings that can wipe or lock the MySQL database.
// (c) Flags destructive SQL embedded in Java. Static only; credentials are never printed.
import {relative, join} from 'node:path';
import {guarded, walk, posix, readUtf8, javaLiterals, lineOf} from './lib.mjs';
import {detectBackend} from './branch-adapter.mjs';

export function flattenYaml(text) {
  const out = {}, stack = [];
  for (const raw of text.split(/\r?\n/)) {
    if (/^\s*(#|$)/.test(raw) || /^\s*-/.test(raw)) continue;
    const m = /^(\s*)([\w.\-"']+):\s*(.*?)\s*$/.exec(raw);
    if (!m) continue;
    const indent = m[1].length, key = m[2].replace(/["']/g, '');
    while (stack.length && stack[stack.length - 1][0] >= indent) stack.pop();
    const value = m[3].replace(/\s+#.*$/, '');
    if (value === '') stack.push([indent, key]);
    else out[[...stack.map(s => s[1]), key].join('.')] = value.replace(/^["']|["']$/g, '');
  }
  return out;
}
export function flattenProperties(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) { const m = /^\s*([^#!=:\s][^=:]*?)\s*[=:]\s*(.*)$/.exec(line); if (m) out[m[1]] = m[2]; }
  return out;
}
const norm = k => k.toLowerCase().replace(/[-_]/g, '');
const isPlaceholder = v => /^\$\{[^}]+\}$/.test(String(v).trim()) || String(v).trim() === '';

/** Returns [{level, code, message}] for one flattened config. Values of secrets are never included. */
export function reviewConfig(flat) {
  const out = [];
  for (const [k, v] of Object.entries(flat)) {
    const n = norm(k), val = String(v).trim();
    if (/datasource\.(?:url|jdbcurl)$/.test(n) && !isPlaceholder(val) && !/^jdbc:(?:mysql|mariadb):/i.test(val)) out.push({level: 'WARN', code: 'JDBC_URL_NOT_MYSQL', message: `${k} is not a jdbc:mysql/jdbc:mariadb URL.`});
    if (/datasource\.(?:password|username)$/.test(n) && /password$/.test(n) && !isPlaceholder(val)) out.push({level: 'WARN', code: 'PLAINTEXT_DB_PASSWORD', message: `${k} holds a literal password in the repository (use an environment variable).`});
    if (/hibernate\.ddlauto$/.test(n) && /^(?:create|create-drop)$/i.test(val)) out.push({level: 'FAIL', code: 'DDL_AUTO_DESTROYS_SCHEMA', message: `${k}=${val} recreates the schema on startup and erases data.`});
    else if (/hibernate\.ddlauto$/.test(n) && /^update$/i.test(val)) out.push({level: 'WARN', code: 'DDL_AUTO_UPDATE', message: `${k}=update lets Hibernate mutate the schema outside Flyway.`});
    if (/flyway\.cleandisabled$/.test(n) && /^false$/i.test(val)) out.push({level: 'FAIL', code: 'FLYWAY_CLEAN_ENABLED', message: `${k}=false allows Flyway clean, which drops every object in the schema.`});
    if (/flyway\.cleanonvalidationerror$/.test(n) && /^true$/i.test(val)) out.push({level: 'FAIL', code: 'FLYWAY_CLEAN_ON_ERROR', message: `${k}=true wipes the database when validation fails.`});
    if (/flyway\.enabled$/.test(n) && /^false$/i.test(val)) out.push({level: 'WARN', code: 'FLYWAY_DISABLED', message: `${k}=false: migrations are not applied automatically on this branch.`});
    if (/flyway\.validateonmigrate$/.test(n) && /^false$/i.test(val)) out.push({level: 'WARN', code: 'FLYWAY_VALIDATE_OFF', message: `${k}=false hides checksum drift until it explodes later.`});
    if (/flyway\.outoforder$/.test(n) && /^true$/i.test(val)) out.push({level: 'WARN', code: 'FLYWAY_OUT_OF_ORDER', message: `${k}=true lets lower versions run after higher ones.`});
    if (/hikari\.maximumpoolsize$/.test(n) && Number(val) > 100) out.push({level: 'WARN', code: 'POOL_TOO_LARGE', message: `${k}=${val} can exhaust MySQL max_connections.`});
  }
  return out;
}

export async function javaWiring(ctx) {
  return guarded('java-wiring', 'Java wiring and connection configuration', async c => {
    const p = ctx.profile || detectBackend(ctx.backend);
    if (!p.javaDirs.length) return c.skip('no Java sources found');
    const generatedRel = ctx.generatedRel || 'autoforge/v2';
    const generated = [], others = [];
    for (const d of p.javaDirs) for (const f of walk(d, {ext: /\.java$/})) (posix(f).includes(generatedRel) ? generated : others).push(f);
    const texts = others.map(f => ({file: f, rel: posix(relative(p.root, f)), text: readUtf8(f)}));

    // (a) orphans
    if (!generated.length) c.info('NO_GENERATED_PACKAGE', `No generated classes under "${generatedRel}" on this branch (integrate.mjs --apply not run yet).`);
    else {
      const blob = texts.map(t => t.text).join('\n');
      let wired = 0;
      for (const f of generated) {
        const name = f.split(/[\\/]/).pop().replace(/\.java$/, '');
        if (new RegExp(`\\b${name}\\b`).test(blob)) wired++;
        else c.warn('GENERATED_RULE_NOT_WIRED', `${name} is installed but no Java file outside the generated package references it.`, {file: posix(relative(p.root, f))}, name);
      }
      c.stats.generatedClasses = generated.length; c.stats.wired = wired; c.stats.orphans = generated.length - wired;
    }

    // (b) config
    let configs = 0;
    for (const f of p.configFiles) {
      configs++;
      const text = readUtf8(f), flat = /\.ya?ml$/i.test(f) ? flattenYaml(text) : flattenProperties(text);
      for (const r of reviewConfig(flat)) c.add(r.level, r.code, `${posix(relative(p.root, f))}: ${r.message}`, null, `${posix(relative(p.root, f))}:${r.code}`);
    }
    c.stats.configFiles = configs;
    if (!configs) c.info('NO_CONFIG_FILES', 'No application*.properties/yml found; datasource may come from environment variables.');

    // (c) destructive SQL in Java
    for (const t of texts) for (const lit of javaLiterals(t.text)) {
      const m = /^\s*(?:DROP\s+(?:TABLE|DATABASE|SCHEMA)|TRUNCATE\s+TABLE|TRUNCATE)\b/i.exec(lit.text);
      if (m) c.fail('SQL_DESTRUCTIVE_IN_JAVA', `${t.rel}:${lineOf(t.text, lit.index)} embeds "${m[0].trim().toUpperCase()}" in Java code.`, null, `${t.rel}:${lineOf(t.text, lit.index)}`);
    }
  });
}
