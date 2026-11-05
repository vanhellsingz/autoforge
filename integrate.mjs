// Install only validated generated classes. Default: read-only plan.
// node integrate.mjs --from OUTPUT --backend JAVA_ROOT [--apply]
// Hashes prove artifact consistency, not that arbitrary Java is safe to run.
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, parse, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertBackendSnapshot } from './backend-guard.mjs';
import { assertExternalEditorSnapshot } from './external-editors.mjs';

export const PACKAGE = 'com.wartuneultra.autoforge.v2';
const MARKER = '// AUTOFORGE_V2_MANAGED';
const TARGET = 'apps/game-server/src/main/java/com/wartuneultra/autoforge/v2';
const sha256 = value => createHash('sha256').update(value).digest('hex');
const normalize = text => text.replace(/\r\n/g, '\n').replace(/\s+$/, '') + '\n';

function noLinks(path) {
  const absolute = resolve(path);
  const root = parse(absolute).root;
  let current = root;
  for (const segment of absolute.slice(root.length).split(sep).filter(Boolean)) {
    current = join(current, segment);
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) {
      throw new Error(`Symlink/junction refused: ${current}`);
    }
    // existsSync follows a broken link, so inspect lstat separately.
    try {
      if (lstatSync(current).isSymbolicLink()) throw new Error(`Symlink/junction refused: ${current}`);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}

function contained(root, path) {
  const resolved = resolve(root, path);
  const rel = relative(root, resolved);
  if (!rel || rel.startsWith(`..${sep}`) || rel === '..' || isAbsolute(rel)) {
    throw new Error(`Path escapes root: ${path}`);
  }
  noLinks(resolved);
  return resolved;
}

// Strip comments and literals while retaining structural tokens. This is a
// conservative shape check, not a Java parser or an execution sandbox.
function structuralJava(source) {
  if (source.includes('\\u')) throw new Error('Java Unicode escapes are not supported');
  return source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\r\n]*|"""[\s\S]*?"""|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, ' ');
}

function checkClass(source, name) {
  const text = structuralJava(source);
  if (/\bpackage\b/.test(text)) throw new Error(`Source already declares package: ${name}`);
  let depth = 0;
  const declarations = [];
  for (const token of text.matchAll(/\b(class|interface|enum|record)\s+([A-Za-z_$][\w$]*)|[{}]/g)) {
    if (token[0] === '{') depth++;
    else if (token[0] === '}') { if (--depth < 0) throw new Error(`Unbalanced class: ${name}`); }
    else if (depth === 0) declarations.push([token[1], token[2]]);
  }
  if (depth || declarations.length !== 1 || !['class', 'enum'].includes(declarations[0][0])
      || declarations[0][1] !== name
      || !new RegExp(`\\bpublic\\s+(?:final\\s+)?(?:class|enum)\\s+${name}\\b`).test(text)) {
    throw new Error(`Expected one public generated class or enum ${name}`);
  }
}

function installed(raw) {
  const body = normalize(raw);
  return `package ${PACKAGE};\n\n${MARKER}\n// AutoForge-Body-SHA256: ${sha256(body)}\n${body}`;
}

function managedAndUnedited(text) {
  const normalized = text.replace(/\r\n/g, '\n');
  const prefix = `package ${PACKAGE};\n\n${MARKER}\n// AutoForge-Body-SHA256: `;
  if (!normalized.startsWith(prefix)) return false;
  const rest = normalized.slice(prefix.length);
  const newline = rest.indexOf('\n');
  if (newline !== 64) return false;
  return rest.slice(0, newline) === sha256(rest.slice(newline + 1));
}

/** Prepare every source/target before any write. Entries include internal
 * payloads; use publicPlan() for logging or serialization. */
export function planIntegration({ from, backend }) {
  const output = resolve(from), backendRoot = resolve(backend);
  noLinks(output); noLinks(backendRoot);
  if (!lstatSync(output).isDirectory() || !lstatSync(backendRoot).isDirectory()) {
    throw new Error('Output and backend roots must be existing directories');
  }
  const manifestPath = contained(output, 'manifest.json');
  const manifestBytes = readFileSync(manifestPath);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  if (manifest.schemaVersion !== 1 || manifest.validated !== true
      || !Array.isArray(manifest.files) || !manifest.files.length || manifest.files.length > 100) {
    throw new Error('Expected validated manifest schemaVersion=1 with 1..100 files');
  }
  const names = new Set(), paths = new Set();
  const targetRoot = contained(backendRoot, TARGET);
  const entries = manifest.files.map(file => {
    if (!file || !/^[A-Z][A-Za-z0-9_]*$/.test(file.className)
        || file.path !== `generated/${file.className}.java`
        || !/^[a-f0-9]{64}$/.test(file.sha256)) throw new Error('Invalid generated file descriptor');
    const key = file.className.toLowerCase();
    if (names.has(key) || paths.has(file.path.toLowerCase())) throw new Error('Duplicate generated class/path');
    names.add(key); paths.add(file.path.toLowerCase());
    const source = contained(output, file.path), bytes = readFileSync(source);
    if (bytes.length > 1024 * 1024 || sha256(bytes) !== file.sha256) throw new Error(`Source hash/size mismatch: ${file.path}`);
    const raw = bytes.toString('utf8');
    checkClass(raw, file.className);
    const target = contained(targetRoot, `${file.className}.java`);
    const content = installed(raw);
    let priorHash = null, action = 'create', reason = null;
    if (existsSync(target)) {
      const previous = readFileSync(target); priorHash = sha256(previous);
      if (previous.toString('utf8').replace(/\r\n/g, '\n') === content) action = 'unchanged';
      else if (managedAndUnedited(previous.toString('utf8'))) action = 'update';
      else { action = 'conflict'; reason = 'Unmanaged or manually edited target'; }
    }
    return { className: file.className, source, sourceHash: file.sha256, target,
      priorHash, generatedHash: sha256(content), action, reason, content };
  });
  const backendSnapshotPath=contained(output,'backend-snapshot.json');
  const externalSnapshotPath=contained(output,'external-editor-snapshot.json');
  return { schemaVersion: 1, mode: 'dry-run', output, backend: backendRoot, targetRoot,
    backendSnapshotPath,backendSnapshotHash:existsSync(backendSnapshotPath)?sha256(readFileSync(backendSnapshotPath)):null,
    externalSnapshotPath,externalSnapshotHash:existsSync(externalSnapshotPath)?sha256(readFileSync(externalSnapshotPath)):null,
    manifestPath, manifestHash: sha256(manifestBytes), entries,
    conflicts: entries.filter(e => e.action === 'conflict').length };
}

export function publicPlan(plan) {
  return { ...plan, entries: plan.entries.map(({ content, ...entry }) => entry) };
}

function assertSnapshots(plan) {
  if(!plan.backendSnapshotHash)throw new Error('Backend planning snapshot required before --apply; regenerate with prepare.mjs --backend');
  noLinks(plan.backendSnapshotPath);
  const backendBytes=readFileSync(plan.backendSnapshotPath);
  if(sha256(backendBytes)!==plan.backendSnapshotHash)throw new Error('Backend planning snapshot changed after planning');
  const backendSnapshot=JSON.parse(backendBytes);
  assertBackendSnapshot(plan.backend,backendSnapshot);
  if(backendSnapshot.externalEditorSnapshotHash&&backendSnapshot.externalEditorSnapshotHash!==plan.externalSnapshotHash)throw new Error('External editor snapshot is missing or differs from the planning scope');
  if(plan.externalSnapshotHash){
    noLinks(plan.externalSnapshotPath);const bytes=readFileSync(plan.externalSnapshotPath);
    if(sha256(bytes)!==plan.externalSnapshotHash)throw new Error('External editor snapshot changed after planning');
    assertExternalEditorSnapshot(JSON.parse(bytes));
  }
  noLinks(plan.targetRoot);
  noLinks(plan.manifestPath);
  if (sha256(readFileSync(plan.manifestPath)) !== plan.manifestHash) throw new Error('Manifest changed after planning');
  for (const entry of plan.entries) {
    noLinks(entry.source); noLinks(entry.target);
    if (sha256(readFileSync(entry.source)) !== entry.sourceHash) throw new Error(`Source changed after planning: ${entry.source}`);
    const current = existsSync(entry.target) ? sha256(readFileSync(entry.target)) : null;
    if (current !== entry.priorHash) throw new Error(`Target changed after planning: ${entry.target}`);
  }
}

export function applyIntegration(plan) {
  if (plan.conflicts) throw new Error('Integration conflicts: no files were changed');
  assertSnapshots(plan);
  const staged = [];
  try {
    for (const entry of plan.entries.filter(e => e.action !== 'unchanged')) {
      noLinks(dirname(entry.target)); mkdirSync(dirname(entry.target), { recursive: true });
      noLinks(dirname(entry.target));
      const temp = `${entry.target}.autoforge-${randomUUID()}.tmp`;
      writeFileSync(temp, entry.content, { flag: 'wx' });
      staged.push({ entry, temp });
    }
    // Validate the complete set once more after staging. Renames are atomic per
    // file; the full multi-file operation is not a filesystem transaction.
    assertSnapshots(plan);
    for (const { entry, temp } of staged) renameSync(temp, entry.target);
    return { ...publicPlan(plan), mode: 'applied', applied: staged.length };
  } finally {
    for (const { temp } of staged) if (existsSync(temp)) unlinkSync(temp);
  }
}

export function integrate({ from, backend, apply = false }) {
  const plan = planIntegration({ from, backend });
  return apply ? applyIntegration(plan) : publicPlan(plan);
}

function cli(args) {
  const options = { apply: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--apply' && !options.apply) options.apply = true;
    else if ((arg === '--from' || arg === '--backend') && args[i + 1] && !args[i + 1].startsWith('--')) {
      const key = arg.slice(2);
      if (options[key]) throw new Error(`Repeated option: ${arg}`);
      options[key] = args[++i];
    } else throw new Error(`Unknown/incomplete option: ${arg}`);
  }
  if (!options.from || !options.backend) throw new Error('Usage: node integrate.mjs --from OUTPUT --backend JAVA_ROOT [--apply]');
  const result = integrate(options);
  console.log(JSON.stringify(result, null, 2));
  if (result.conflicts) process.exitCode = 2;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { cli(process.argv.slice(2)); }
  catch (error) { console.error(`AutoForge integration failed: ${error.message}`); process.exitCode = 1; }
}
