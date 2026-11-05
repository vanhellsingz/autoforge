// PLUS #1 - Branch Adapter.
// Detects the real layout of whichever backend branch is checked out (and the LayaAir client), so every other
// module works on ANY branch without hard-coded paths. Read-only. Never executes project code.
import {readdirSync} from 'node:fs';
import {join, resolve, relative, dirname} from 'node:path';
import {Check, guarded, walk, stat, posix, git, readUtf8, OMIT} from './lib.mjs';

const hasSrc = d => !!stat(join(d, 'src/main/java'))?.isDirectory();

function findModules(root, maxDepth = 3) {
  const found = [], queue = [[root, 0]];
  while (queue.length) {
    const [d, level] = queue.shift();
    if (hasSrc(d)) found.push(d);
    if (level >= maxDepth) continue;
    let es; try { es = readdirSync(d, {withFileTypes: true}); } catch { continue; }
    for (const e of es) if (e.isDirectory() && !e.isSymbolicLink() && !OMIT.has(e.name) && !e.name.startsWith('.')) queue.push([join(d, e.name), level + 1]);
  }
  return found;
}

export function detectBackend(rootArg) {
  const root = resolve(rootArg);
  if (!stat(root)?.isDirectory()) throw Error('Backend root must be an existing directory');
  const preferred = join(root, 'apps/game-server');
  let gameServer = null;
  if (hasSrc(preferred)) gameServer = preferred;
  else if (hasSrc(root)) gameServer = root;
  else {
    const mods = findModules(root);
    gameServer = mods.find(m => /game-?server|server/i.test(m)) || mods[0] || null;
  }
  const javaDirs = [];
  if (gameServer) javaDirs.push(join(gameServer, 'src/main/java'));
  const modulesDir = join(root, 'modules');
  if (stat(modulesDir)?.isDirectory()) for (const e of readdirSync(modulesDir, {withFileTypes: true}))
    if (e.isDirectory() && !e.isSymbolicLink() && hasSrc(join(modulesDir, e.name))) javaDirs.push(join(modulesDir, e.name, 'src/main/java'));

  const migrationDirs = [...new Set([...walk(root, {ext: /^V\d[\w.]*__.+\.sql$/i})].map(f => dirname(f)))];
  const configFiles = [];
  for (const d of javaDirs) for (const f of walk(join(d, '../resources'), {ext: /^(?:application|bootstrap)[\w.-]*\.(?:properties|ya?ml)$/i})) configFiles.push(f);

  const packages = new Map();
  let seen = 0;
  outer: for (const d of javaDirs) for (const f of walk(d, {ext: /\.java$/})) {
    const m = /^\s*package\s+([\w.]+)\s*;/m.exec(readUtf8(f, 8192));
    if (m) { const top = m[1].split('.').slice(0, 3).join('.'); packages.set(top, (packages.get(top) || 0) + 1); }
    if (++seen >= 400) break outer;
  }
  const buildTool = stat(join(root, 'pom.xml')) || (gameServer && stat(join(gameServer, 'pom.xml'))) ? 'maven'
    : stat(join(root, 'build.gradle')) || stat(join(root, 'build.gradle.kts')) ? 'gradle' : 'unknown';
  const dirty = git(root, ['status', '--porcelain']);
  return {
    root, gameServer, javaDirs, migrationDirs, configFiles, buildTool,
    adminWeb: stat(join(root, 'apps/admin-web'))?.isDirectory() ? join(root, 'apps/admin-web') : null,
    topPackages: [...packages.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, files]) => ({name, files})),
    git: {branch: git(root, ['rev-parse', '--abbrev-ref', 'HEAD']), head: git(root, ['rev-parse', '--verify', 'HEAD']), dirtyFiles: dirty === null ? null : dirty.split('\n').filter(Boolean).length},
  };
}

export function detectClient(rootArg) {
  const root = resolve(rootArg);
  if (!stat(root)?.isDirectory()) throw Error('Client root must be an existing directory');
  const js = [], laya = [];
  for (const f of walk(root, {ext: /\.js$/i})) { js.push(f); if (/laya/i.test(f)) laya.push(f); if (js.length > 20000) break; }
  let layaVersion = null;
  for (const f of laya.slice(0, 20)) {
    const head = readUtf8(f, 300 * 1024);
    const m = /Laya\.version\s*=\s*["']([\w.\-]+)|LayaAir(?:\s*Engine)?\s*v?([\d]+\.[\d.]+)/.exec(head);
    if (m) { layaVersion = m[1] || m[2]; break; }
  }
  return {root, jsFiles: js, layaFiles: laya.map(f => posix(relative(root, f))), layaVersion};
}

export async function branchAdapter(ctx) {
  return guarded('branch-adapter', 'Branch / layout detection', async c => {
    const p = ctx.profile = detectBackend(ctx.backend);
    c.stats = {branch: p.git.branch, head: p.git.head, dirtyFiles: p.git.dirtyFiles, buildTool: p.buildTool, gameServer: p.gameServer && posix(relative(p.root, p.gameServer)) || null, javaDirs: p.javaDirs.length, migrationDirs: p.migrationDirs.map(d => posix(relative(p.root, d))), configFiles: p.configFiles.length, topPackages: p.topPackages};
    if (!p.gameServer) c.fail('NO_GAME_SERVER', 'No Maven/Gradle module with src/main/java found in the backend checkout.');
    if (p.gameServer && !p.migrationDirs.length) c.warn('NO_MIGRATIONS', 'No Flyway migrations (V<ver>__name.sql) found; schema checks will be limited.');
    if (!p.git.head) c.info('NO_GIT', 'Backend is not a readable Git checkout; reports are not bound to a commit.');
    if (p.git.dirtyFiles > 0) c.warn('DIRTY_TREE', `Backend has ${p.git.dirtyFiles} uncommitted file(s); report is bound to the working tree, not to HEAD.`);
    if (ctx.client) {
      const cl = ctx.clientProfile = detectClient(ctx.client);
      c.stats.client = {jsFiles: cl.jsFiles.length, layaFiles: cl.layaFiles.length, layaVersion: cl.layaVersion};
      if (!cl.jsFiles.length) c.warn('CLIENT_NO_JS', 'Client directory has no .js files.');
      else if (!cl.layaFiles.length) c.warn('CLIENT_NOT_LAYA', 'No LayaAir engine file (laya*.js) found in the client; layout may be bundled/renamed.');
    }
  });
}
