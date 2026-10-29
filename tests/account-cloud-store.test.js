import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData} from '../data.js';
import {decodeState,encodeState,CloudConflict} from '../cloud-model.js';
import {sectionRefs,readAccountServer,readAccountTransaction,commitAccountTransaction} from '../account-cloud-store.js';
const uid='alice';
function fake(){
 const docs=new Map();
 const ref=(...parts)=>parts.join('/');
 const snapshot=path=>({exists:()=>docs.has(path),data:()=>structuredClone(docs.get(path))});
 const sdk={doc:(_db,...path)=>ref(...path),getDocFromServer:async path=>snapshot(path),serverTimestamp:()=>Date.now()};
 const transaction=async(run)=>{
  const writes=[];
  const tx={get:async path=>snapshot(path),set:(path,value)=>writes.push([path,value])};
  const result=await run(tx);
  for(const [path,value]of writes)docs.set(path,structuredClone(value));
  return result;
 };
 return {docs,sdk,transaction};
}
const write=(f,expected,data)=>f.transaction(async tx=>{
 const refs=sectionRefs(f.sdk,null,uid),current=await readAccountTransaction(tx,refs);
 return commitAccountTransaction(tx,refs,current,expected,encodeState(data),f.sdk);
});
test('legacy main is read without migration until successful transactional write',async()=>{
 const f=fake(),refs=sectionRefs(f.sdk,null,uid);
 const legacy=emptyData();legacy.foodEntries.push({id:'food',date:'2026-10-29',name:'Chicken',calories:250,protein:40,quantity:1});
 legacy.transactions.push({id:'bank',date:'2026-10-29',kind:'expense',amountCents:719,description:'Wawa',category:'Household Supplies'});
 const old={schemaVersion:1,revision:4,payload:encodeState(legacy)};
 f.docs.set(refs.legacy,old);
 const initial=await readAccountServer(f.sdk,null,uid);
 assert.equal(initial.revision,4);assert.equal(initial.split,false);
 assert.equal(f.docs.has(refs.manifest),false);
 await write(f,4,initial.data);
 assert.deepEqual(f.docs.get(refs.legacy),old,'never delete or alter old combined state');
 const split=await readAccountServer(f.sdk,null,uid);
 assert.equal(split.revision,5);assert.equal(split.split,true);
 assert.deepEqual(split.data,decodeState(old).data);
 for(const section of ['nutrition','lifting','finances']){
  const doc=f.docs.get(refs.sections[section]);
  assert.equal(doc.revision,5);
  assert.equal(JSON.parse(doc.payload).section,section);
 }
});
test('atomic shared revision rejects stale writers and missing or mismatched section documents',async()=>{
 const f=fake(),refs=sectionRefs(f.sdk,null,uid),d=emptyData();
 await write(f,0,d);
 const stale=structuredClone(d);stale.transactions.push({id:'x',date:'2026-10-29',kind:'expense',amountCents:100,description:'Lunch',category:'Restaurants'});
 await write(f,1,stale);
 await assert.rejects(write(f,1,d),error=>error?.code==='conflict');
 assert.equal((await readAccountServer(f.sdk,null,uid)).data.transactions.length,1);
 f.docs.delete(refs.sections.lifting);
 await assert.rejects(readAccountServer(f.sdk,null,uid),/missing|differs/i);
 await assert.rejects(write(f,2,d),/missing|differs/i);
});
test('account documents remain isolated to the requested uid',()=>{
 const f=fake();const alice=sectionRefs(f.sdk,null,'alice'),bob=sectionRefs(f.sdk,null,'bob');
 assert.notEqual(alice.manifest,bob.manifest);
 assert.notEqual(alice.sections.nutrition,bob.sections.nutrition);
});
