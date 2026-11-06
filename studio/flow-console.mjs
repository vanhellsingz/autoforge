// Read-only loopback console adapted from the user's V1 action-flow console.
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {json, noLinks, readBounded, options, only, requireValue} from './items/lib.mjs';
import {relativeFile, HASH} from './learning/evidence.mjs';

const assets = join(dirname(fileURLToPath(import.meta.url)), 'flow-console');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const MAX_PACKAGE_BYTES = 16 * 1024 * 1024;

export function readFlowPackage(directory) {
  const root = noLinks(directory);
  const manifestBytes = readBounded(join(root, 'manifest.json'), 1024 * 1024);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  if (manifest.schemaVersion !== 'autoforge.vertical-slice.v1' || !manifest.artifacts || typeof manifest.artifacts !== 'object' || Array.isArray(manifest.artifacts)) {
    throw Error('Expected an extract-flow manifest with artifact hashes');
  }
  const entries = Object.entries(manifest.artifacts);
  if (entries.length > 100) throw Error('Package artifact limit exceeded');
  const files = [{path: 'manifest.json', sha256: hash(manifestBytes), content: manifestBytes.toString('utf8')}];
  let total = manifestBytes.length;
  for (const [path, expectedHash] of entries) {
    if (!HASH.test(expectedHash) || path === 'manifest.json' || !/\.(json|md|txt|patch|java|mjs)$/i.test(path)) throw Error('Invalid package artifact descriptor');
    const bytes = readBounded(relativeFile(root, path), 4 * 1024 * 1024);
    total += bytes.length;
    if (total > MAX_PACKAGE_BYTES) throw Error('Package byte limit exceeded');
    if (hash(bytes) !== expectedHash) throw Error('Package artifact changed: ' + path);
    files.push({path, sha256: expectedHash, content: bytes.toString('utf8')});
  }
  const documents = Object.create(null);
  for (const file of files.filter(file => file.path.endsWith('.json'))) documents[file.path] = JSON.parse(file.content);
  if (!documents['flow.json'] || !documents['validation.json']) throw Error('Flow and validation artifacts required');
  return {
    manifest, documents, files,
    integrity: 'MANIFEST_ARTIFACT_HASHES_MATCH',
    execution: {runtime: 'NOT_ATTESTED_BY_CONSOLE', patchApplied: false},
  };
}

export function createFlowConsole({packageDirectory}) {
  // Validate once before listening. Each reload revalidates all served artifacts.
  readFlowPackage(packageDirectory);
  return createServer((request, response) => {
    const port = response.socket.localPort;
    const allowedHosts = new Set(['127.0.0.1:' + port, 'localhost:' + port]);
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'");
    if (!allowedHosts.has(request.headers.host)) {
      response.writeHead(403).end('Invalid host');
      return;
    }
    if (request.method !== 'GET') {
      response.setHeader('Allow', 'GET');
      response.writeHead(405).end('Read-only console');
      return;
    }
    try {
      const route = request.url.split('?')[0];
      if (route === '/api/package') {
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        response.end(JSON.stringify(readFlowPackage(packageDirectory)));
        return;
      }
      const routes = {
        '/': ['index.html', 'text/html'],
        '/console.css': ['console.css', 'text/css'],
        '/console.js': ['console.js', 'text/javascript'],
      };
      if (!Object.hasOwn(routes, route)) {
        response.writeHead(404).end('Not found');
        return;
      }
      const [file, type] = routes[route];
      response.setHeader('Content-Type', type + '; charset=utf-8');
      response.end(readFileSync(join(assets, file)));
    } catch (error) {
      response.writeHead(409, {'Content-Type': 'application/json; charset=utf-8'});
      response.end(JSON.stringify({error: error.message}));
    }
  });
}

export async function main(args) {
  const opts = options(args);
  only(opts, ['package', 'port']);
  const value = opts.port ?? '18768';
  if (!/^\d+$/.test(value) || Number(value) < 1024 || Number(value) > 65535) throw Error('Port must be 1024..65535');
  const server = createFlowConsole({packageDirectory: requireValue(opts, 'package')});
  await new Promise((accept, reject) => {
    server.once('error', reject);
    server.listen(Number(value), '127.0.0.1', accept);
  });
  console.log('AutoForge console: http://127.0.0.1:' + server.address().port);
  return server;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
}
