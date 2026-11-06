import {readFileSync,lstatSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join,parse,sep} from 'node:path';
import {assertOutside} from '../../plus/lib.mjs';
export function noLinks(value){const p=resolve(value);let at=parse(p).root;for(const part of p.slice(at.length).split(sep).filter(Boolean)){at=join(at,part);if(existsSync(at)&&lstatSync(at).isSymbolicLink())throw Error('Linked source/output refused');}return p;}
export function readBounded(file,max=64*1024*1024){const p=noLinks(file),s=lstatSync(p);if(!s.isFile()||s.size>max)throw Error('Input must be bounded regular file');return readFileSync(p);}
export const json=file=>JSON.parse(readBounded(file).toString('utf8').replace(/^\uFEFF/,''));
export function output(dir,inputs=[]){const p=noLinks(dir);assertOutside(p,inputs.filter(Boolean));if(existsSync(p))throw Error('Use a new output directory');mkdirSync(p,{recursive:true});return p;}
export const save=(dir,name,value)=>writeFileSync(join(dir,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
export function options(args){const result={};for(let i=0;i<args.length;i++){const flag=args[i];if(!/^--[a-z][a-z0-9-]*$/.test(flag)||Object.hasOwn(result,flag.slice(2)))throw Error('Invalid/repeated option '+flag);const value=args[++i];if(!value||value.startsWith('--'))throw Error('Value required for '+flag);result[flag.slice(2)]=value;}return result;}
export function requireValue(o,name){if(typeof o[name]!=='string'||!o[name])throw Error('Missing --'+name);return o[name];}
export function only(o,names){for(const key of Object.keys(o))if(!names.includes(key))throw Error('Unknown option --'+key);}
