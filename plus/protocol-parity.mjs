// PLUS #2 - Client <-> Server Protocol Parity (LayaAir JS vs Java).
// Static evidence only: which C2S/S2C ids the client uses and which ones the Java server handles/sends.
// It answers "what does the client send that the server ignores?" - the classic cause of a frozen UI.
import {join, relative} from 'node:path';
import {statSync} from 'node:fs';
import {Check, guarded, walk, posix, readUtf8} from './lib.mjs';
import {detectBackend, detectClient} from './branch-adapter.mjs';

const RE_C2S = /\bC2S_?(\d{1,6})\b/g;
const RE_S2C = /\bS2C_?(\d{1,6})\b/g;
const RE_LISTEN = /(?:\.on|\.once|addListener|addEventListener|register\w*|bind\w*|listen\w*|handle\w*|dispatch\w*|set\w*Handler)\s*\(\s*(?:[\w$.]*\.)?S2C_?(\d{1,6})\b/g;
const RE_CASE = /\bcase\s+(\d{1,6})\s*(?::|->)/g;
const HANDLER_FILE = /Handler|Dispatch|Protocol|Packet|Opcode|Router/i;

function bump(map, id, file) {
  let e = map.get(id);
  if (!e) map.set(id, e = {count: 0, files: []});
  e.count++;
  if (e.files.length < 3 && !e.files.includes(file)) e.files.push(file);
}

export function scanSources(root, files, {javaCases = false, maxBytes = 64 * 1024 * 1024} = {}) {
  // LayaAir bundles often exceed 10 MiB in a *single* minified line. Never silently
  // report full protocol coverage from the first 8 MiB of the file.
  const r = {c2s: new Map(), s2c: new Map(), listen: new Map(), cases: new Map(), truncatedFiles: []};
  for (const f of files) {
    const rel = posix(relative(root, f));
    if (statSync(f).size > maxBytes) r.truncatedFiles.push(rel);
    const text = readUtf8(f, maxBytes);
    for (const m of text.matchAll(RE_C2S)) bump(r.c2s, +m[1], rel);
    for (const m of text.matchAll(RE_S2C)) bump(r.s2c, +m[1], rel);
    for (const m of text.matchAll(RE_LISTEN)) bump(r.listen, +m[1], rel);
    if (javaCases && HANDLER_FILE.test(f)) for (const m of text.matchAll(RE_CASE)) bump(r.cases, +m[1], rel);
  }
  return r;
}

export function computeParity(client, server, {requiredS2c = [150, 301], criticalC2s = []} = {}) {
  const sorted = a => [...a].sort((x, y) => x - y);
  const clientSendsUnhandled = sorted([...client.c2s.keys()].filter(id => !server.c2s.has(id) && !server.cases.has(id)));
  const serverSendsUnknownToClient = sorted([...server.s2c.keys()].filter(id => !client.s2c.has(id)));
  const listenIds = client.listen.size ? [...client.listen.keys()] : [];
  const clientListensNeverSent = sorted(listenIds.filter(id => !server.s2c.has(id)));
  const clientS2cNeverSent = sorted([...client.s2c.keys()].filter(id => !server.s2c.has(id)));
  const requiredMissing = sorted(requiredS2c.filter(id => !server.s2c.has(id)));
  const criticalUnhandled = sorted(criticalC2s.filter(id => client.c2s.has(id) && !server.c2s.has(id) && !server.cases.has(id)));
  const handledC2s = [...client.c2s.keys()].length - clientSendsUnhandled.length;
  return {
    clientSendsUnhandled, serverSendsUnknownToClient, clientListensNeverSent, clientS2cNeverSent, requiredMissing, criticalUnhandled,
    coverage: {clientC2s: client.c2s.size, handledC2s, c2sHandledPercent: client.c2s.size ? Math.round(1000 * handledC2s / client.c2s.size) / 10 : null, clientS2c: client.s2c.size, serverS2c: server.s2c.size},
  };
}

export async function protocolParity(ctx) {
  return guarded('protocol-parity', 'LayaAir client <-> Java server protocol parity', async c => {
    if (!ctx.client) return c.skip('--client not provided');
    const profile = ctx.profile || detectBackend(ctx.backend);
    const cl = ctx.clientProfile || detectClient(ctx.client);
    if (!profile.javaDirs.length) return c.skip('no Java sources found');
    const javaFiles = profile.javaDirs.flatMap(d => [...walk(d, {ext: /\.java$/})]);
    const clientData = scanSources(cl.root, cl.jsFiles);
    const serverData = scanSources(profile.root, javaFiles, {javaCases: true});
    const p = computeParity(clientData, serverData, {requiredS2c: ctx.requiredS2c ?? [150, 301], criticalC2s: ctx.criticalC2s ?? []});
    c.stats = {...p.coverage, clientTruncatedFiles: clientData.truncatedFiles.length, javaTruncatedFiles: serverData.truncatedFiles.length};
    for (const file of clientData.truncatedFiles) c.warn('CLIENT_SOURCE_TRUNCATED', `Client JS exceeded the 64 MiB analysis limit: ${file}. Protocol coverage is incomplete.`, null, file);
    for (const file of serverData.truncatedFiles) c.warn('JAVA_SOURCE_TRUNCATED', `Java file exceeded the 64 MiB analysis limit: ${file}. Protocol coverage is incomplete.`, null, file);
    if (!clientData.c2s.size && !clientData.s2c.size) c.warn('CLIENT_NO_OPCODES', 'No C2S<id>/S2C<id> tokens found in client JS (renamed/obfuscated bundle?). Parity cannot be judged.');
    if (!serverData.c2s.size && !serverData.s2c.size && !serverData.cases.size) c.warn('SERVER_NO_OPCODES', 'No C2S<id>/S2C<id> tokens or handler switch cases found in Java sources.');
    for (const id of p.requiredMissing) c.fail('REQUIRED_S2C_NOT_SENT', `Server never references S2C${id}, which the client needs during initialization.`, {opcode: `S2C${id}`}, `S2C${id}`);
    for (const id of p.criticalUnhandled) c.fail('CRITICAL_C2S_UNHANDLED', `Client sends critical C2S${id} but no Java handler/reference exists.`, clientData.c2s.get(id), `C2S${id}`);
    for (const id of p.clientSendsUnhandled) if (!p.criticalUnhandled.includes(id)) c.warn('C2S_UNHANDLED', `Client uses C2S${id} but no Java handler/reference was found.`, clientData.c2s.get(id), `C2S${id}`);
    for (const id of p.clientListensNeverSent) c.warn('S2C_LISTENER_NEVER_SENT', `Client registers a listener for S2C${id} but the server never references it.`, clientData.listen.get(id), `S2C${id}`);
    if (p.serverSendsUnknownToClient.length) c.info('S2C_UNKNOWN_TO_CLIENT', `${p.serverSendsUnknownToClient.length} S2C id(s) are referenced by Java but not found in the client JS.`, {ids: p.serverSendsUnknownToClient.slice(0, 50)});
    if (p.clientS2cNeverSent.length && !p.clientListensNeverSent.length) c.info('S2C_CLIENT_ONLY', `${p.clientS2cNeverSent.length} S2C id(s) appear in the client but not in Java (no listener evidence).`, {ids: p.clientS2cNeverSent.slice(0, 50)});
    c.artifact = {name: 'protocol-parity.json', data: {schemaVersion: 'autoforge.plus.protocol-parity.v1', evidence: 'STATIC_TOKEN_MATCH', limits: ['Numeric ids may collide between C2S and switch cases.', 'A token is a reference, not proof that the handler works.', 'Unrecognized/minified protocol names require an independent mapping; percentages are not gameplay coverage.'], truncatedClientFiles: clientData.truncatedFiles, truncatedJavaFiles: serverData.truncatedFiles, ...p}};
  });
}
