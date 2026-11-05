import { readFileSync, readdirSync, lstatSync } from 'node:fs';
import { join, dirname, basename, resolve, relative, isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export function asset(root, requested) {
  const dir=dirname(requested), stem=basename(requested).replace(/-[a-f0-9]{10}(?=\.)/, '');
  const names=readdirSync(join(root,dir)).filter(n=>n.replace(/-[a-f0-9]{10}(?=\.)/, '')===stem);
  if(names.length!==1) throw Error(`Expected one asset ${dir}/${stem}, found ${names.length}`);
  const path=join(dir,names[0]).replaceAll('\\','/'), absolute=resolve(root,path);
  let at=resolve(root);
  for(const part of path.split('/')) { at=join(at,part); if(lstatSync(at).isSymbolicLink()) throw Error(`Symlink source rejected: ${path}`); }
  const bytes=readFileSync(absolute);
  return {text:bytes.toString('utf8'),path,sha256:sha256(bytes)};
}
export function assertSeparateOutput(client,out) {
  const rel=relative(resolve(client),resolve(out));
  if(!rel || (!isAbsolute(rel) && rel!=='..' && !rel.startsWith('..'+(process.platform==='win32'?'\\':'/')))) throw Error('Output must be outside the client tree');
}
