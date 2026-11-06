// Data-only evidence boundary shared by map auditing and accumulated knowledge.
import {createHash} from 'node:crypto';
import {join,isAbsolute} from 'node:path';
import {readBounded,noLinks} from '../items/lib.mjs';

export const HASH=/^[a-f0-9]{64}$/;
export const COMMIT=/^[a-f0-9]{40,64}$/;
export function canonical(value){
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
 return JSON.stringify(value);
}
export const digest=value=>createHash('sha256').update(Buffer.isBuffer(value)?value:canonical(value)).digest('hex');
export function relativeFile(root,path){
 if(typeof path!=='string'||!path||isAbsolute(path)||/[\\:]/.test(path)||path.split('/').some(p=>!p||p==='.'||p==='..'))throw Error('Safe relative artifact path required');
 return noLinks(join(noLinks(root),path));
}
export function artifactJson(root,descriptor){
 if(!descriptor||!HASH.test(descriptor.sha256??''))throw Error('Artifact SHA-256 required');
 const bytes=readBounded(relativeFile(root,descriptor.path),16*1024*1024);
 if(digest(bytes)!==descriptor.sha256)throw Error('Artifact hash mismatch: '+descriptor.path);
 const value=JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/,''));
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Structured artifact object required');
 return value;
}
export function validIdentity(identity){
 return !!identity&&COMMIT.test(identity.commit??'')&&typeof identity.testId==='string'&&identity.testId.trim().length>0&&
 typeof identity.environment?.name==='string'&&identity.environment.name.trim().length>0&&
 typeof identity.environment?.kind==='string'&&identity.environment.kind.trim().length>0;
}
export const EVIDENCE_LIMITATION='SHA-256, identity and recorded results are checked. External execution and truth of gameplay are not independently authenticated.';
