import test from 'node:test';
import assert from 'node:assert/strict';
import {extractCapacity,referenceCapacity} from '../capacity.mjs';

const method=(name,body)=>name+'(t){'+body+'}';
const names=['calculatePlayerFightCapacity','calculateGuardFightCapacity','calculateRareWeaponFightCapacity'];
const source=names.map(n=>method(n,'let e=t.attack,i=0;return i+=2*t.fireResi,e+Math.floor(i/5)')).join('');
test('extracts pure linear methods with explicit indexed inputs',()=>{const rules=extractCapacity(source);assert.equal(rules.length,3);assert.match(rules[0].java,/stats\[5\]/);assert.match(rules[0].java,/stats\[13\]/);assert.ok(rules[0].source.sha256);});
test('fails closed for missing or duplicate definitions',()=>{assert.throws(()=>extractCapacity(''));assert.throws(()=>extractCapacity(source+source));});
test('rejects unreviewed calls, side effects, and control flow',()=>{for(const body of ['let e=evil();return e','let e=t.attack;return t.attack+=1,e','let e=0;return this.unknown(t)','if(t)return 1;return 0'])assert.throws(()=>extractCapacity(source.replace('let e=t.attack,i=0;return i+=2*t.fireResi,e+Math.floor(i/5)',body)));});
test('reference separates rare-weapon primary weights from guard',()=>{const s=Array(23).fill(0);s[0]=1;s[1]=2;s[2]=3;s[3]=4;assert.equal(referenceCapacity('guard',s,[],[]),0);assert.equal(referenceCapacity('rareWeapon',s,[],[]),52);});
