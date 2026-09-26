import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData} from '../data.js';
import {CloudSession,CloudConflict,nextRecord,encodeState,decodeState,mergeDeviceData} from '../cloud-model.js';

function memoryStore(){const records=new Map();return {records,async read(uid){return records.get(uid)||null;},async write(uid,expected,payload){const next=nextRecord(records.get(uid)||null,expected,payload);records.set(uid,next);return next;}};}
function food(id,name='Meal'){return {id,date:'2026-09-26',name,calories:300,protein:20,quantity:1};}

test('new and returning accounts never borrow another account’s records',async()=>{
 const store=memoryStore(),a=new CloudSession('alice',store),b=new CloudSession('bob',store);
 const data=await a.load();data.foodEntries.push(food('one'));await a.save(data);
 assert.equal((await b.load()).foodEntries.length,0);
 const returning=new CloudSession('alice',store);assert.equal((await returning.load()).foodEntries.length,1);
});
test('stale device cannot overwrite a newer save',async()=>{
 const store=memoryStore(),a=new CloudSession('same-user',store),b=new CloudSession('same-user',store);
 const one=await a.load(),two=await b.load();one.foodEntries.push(food('a'));await a.save(one);two.foodEntries.push(food('b'));
 await assert.rejects(()=>b.save(two),CloudConflict);
 assert.equal(decodeState(store.records.get('same-user')).data.foodEntries[0].id,'a');
});
test('failed loads and signed-out sessions cannot save',async()=>{
 const store=memoryStore(),a=new CloudSession('a',store);await assert.rejects(()=>a.save(emptyData()),/not ready/);
 await a.load();a.close();await assert.rejects(()=>a.save(emptyData()),/not ready/);
 const bad=new CloudSession('b',{read:async()=>{throw Error('offline');}});await assert.rejects(()=>bad.load(),/offline/);assert.equal(bad.ready,false);
});
test('failed saves preserve revision and allow retry',async()=>{
 const store=memoryStore();const original=store.write;let fail=true;store.write=async(...args)=>{if(fail)throw Error('offline');return original(...args);};
 const session=new CloudSession('a',store);const data=await session.load();data.foodEntries.push(food('a'));
 await assert.rejects(()=>session.save(data),/offline/);assert.equal(session.revision,0);assert.equal(session.busy,false);
 fail=false;await session.save(data);assert.equal(session.revision,1);
});
test('closing an account during load does not reveal its result',async()=>{
 let finish;const session=new CloudSession('a',{read:()=>new Promise(resolve=>finish=resolve)});
 const loading=session.load();session.close();finish(null);await assert.rejects(()=>loading,/Account changed/);
});
test('migration is repeat-safe, converts units, and preserves cloud conflicts',()=>{
 const cloud=emptyData(),device=emptyData();cloud.settings.unit='kg';cloud.foodEntries.push(food('a','Cloud'));
 cloud.weights.push({id:'w1',date:'2026-09-26',value:80});device.foodEntries.push(food('a','Device'),food('b'));
 device.weights.push({id:'w2',date:'2026-09-26',value:190},{id:'w3',date:'2026-09-25',value:220.46226218});
 const merged=mergeDeviceData(cloud,device);assert.equal(merged.foodEntries.length,2);assert.equal(merged.foodEntries[0].name,'Cloud');assert.equal(merged.weights[0].value,80);assert.equal(merged.weights[1].value,100);
 assert.deepEqual(mergeDeviceData(merged,device),merged);assert.equal(device.weights[1].value,220.46226218);
});
test('oversized or unsupported cloud data is rejected before writing',()=>{
 const data=emptyData();data.foodEntries.push(food('a','x'.repeat(800001)));assert.throws(()=>encodeState(data),/limit/);
 assert.throws(()=>decodeState({schemaVersion:99,revision:1,payload:'{}'}),/unsupported/);
});
