import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData,normalizeData,encodeData} from '../data.js';
import {sectionPayloads,ACCOUNT_SECTIONS} from '../account-sections.js';
import {monthlyParts,readMonthlyParts,exportMonth,importMonth} from '../account-monthly.js';
import {encodeState} from '../cloud-model.js';
import {sectionRefs,readAccountServer,readAccountTransaction,commitAccountTransaction} from '../account-cloud-store.js';

function fixture(){
 const d=emptyData();
 d.settings.calories=1650;d.preferences={homeDashboard:'lifting',homeFoodIds:['saved-one'],theme:'dark',legacyImported:true};
 d.foods.push({id:'saved-one',name:'Protein',calories:140,protein:25,kind:'food'});
 d.foodEntries.push({id:'food-oct',date:'2026-10-31',name:'Protein',calories:140,protein:25,quantity:1});
 d.weights.push({id:'w-oct',date:'2026-10-31',value:179});
 d.bodyFat.push({id:'bf-nov',date:'2026-11-01',value:22.1});
 d.lifts.push({id:'lift-nov',date:'2026-11-02',exercise:'Chest Press',equipment:'machine',sets:[{weight:60,reps:8}]});
 d.workoutHistory.push({id:'session-nov',date:'2026-11-02',type:'Upper',exercises:[]});
 d.transactions.push({id:'tx-oct',date:'2026-10-31',kind:'expense',amountCents:719,
  description:'Water',category:'Household Supplies',currency:'USD'});
 return normalizeData(d);
}
function harness(){
 const docs=new Map(),writes=[];
 const sdk={
  doc:(_db,...parts)=>parts.join('/'),serverTimestamp:()=> 'SERVER_TIMESTAMP',
  getDocFromServer:async ref=>({exists:()=>docs.has(ref),data:()=>structuredClone(docs.get(ref))})
 };
 const snap=ref=>({exists:()=>docs.has(ref),data:()=>structuredClone(docs.get(ref))});
 function transaction(){
  const pending=[];
  return{get:async ref=>snap(ref),set:(ref,data)=>pending.push({ref,data:structuredClone(data)}),
   apply:()=>{writes.push(pending.map(e=>e.ref));for(const x of pending)docs.set(x.ref,x.data);return pending;}};
 }
 return {docs,writes,sdk,transaction};
}

test('v112: calendar month partition preserves stable IDs, categories, and account preferences',()=>{
 const data=fixture(),{parts,months}=monthlyParts(data);
 assert.deepEqual(months,['2026-10','2026-11']);
 assert.equal(JSON.parse(parts.settings).preferences.theme,'dark');
 assert.equal(JSON.parse(parts['month-2026-10']).records.transactions[0].id,'tx-oct');
 assert.equal(JSON.parse(parts['month-2026-11']).records.transactions.length,0);
 assert.deepEqual(readMonthlyParts(parts,months),data);
 assert.deepEqual(normalizeData(encodeData(readMonthlyParts(parts,months))),data);
 assert.equal(exportMonth(data,'2026-10').records.transactions.length,1);
 const changed=fixture();changed.transactions[0].description='Different';
 const imported=importMonth(changed,exportMonth(data,'2026-10'));
 assert.deepEqual(imported.transactions,data.transactions,'selected month restore does not change unrelated months');
 assert.equal(imported.bodyFat[0].id,'bf-nov');
});
test('v112: bank posting after month-end leaves a receipt in the original purchase month',()=>{
 const input=fixture();
 input.transactions.push({
  id:'delayed-receipt',date:'2026-11-02',purchaseDate:'2026-10-31',
  postedDate:'2026-11-02',kind:'expense',amountCents:2400,
  description:'Restaurant charge',merchant:'Restaurant',category:'Restaurants',
  currency:'USD',bankDescription:'RESTAURANT',accountLabel:'BofA Checking',
  bankDirection:'debit'
 });
 const {parts,months}=monthlyParts(input);
 assert.deepEqual(months,['2026-10','2026-11']);
 const october=JSON.parse(parts['month-2026-10']).records.transactions;
 const november=JSON.parse(parts['month-2026-11']).records.transactions;
 assert.equal(october.some(tx=>tx.id==='delayed-receipt'),true);
 assert.equal(november.some(tx=>tx.id==='delayed-receipt'),false);
 const restored=readMonthlyParts(parts,months);
 const receipt=restored.transactions.find(tx=>tx.id==='delayed-receipt');
 assert.equal(receipt.purchaseDate,'2026-10-31');
 assert.equal(receipt.postedDate,'2026-11-02');
 assert.equal(receipt.amountCents,2400);
});
test('v112: first signed-in save atomically migrates v2 files and retains rollback documents',async()=>{
 const {docs,sdk,transaction}=harness(),refs=sectionRefs(sdk,{},'alice'),data=fixture(),legacyParts=sectionPayloads(data);
 docs.set(refs.manifest,{schemaVersion:2,revision:7,updatedAt:'old'});
 for(const name of ACCOUNT_SECTIONS)docs.set(refs.sections[name],{
  schemaVersion:2,revision:7,payload:legacyParts[name],updatedAt:'old'
 });
 const oldNutrition=structuredClone(docs.get(refs.sections.nutrition));
 const tx=transaction(),read=await readAccountTransaction(tx,refs);
 assert.equal(read.layout,2);
 const result=commitAccountTransaction(tx,refs,read,7,encodeState(data),sdk);
 const wrote=tx.apply();
 assert.equal(result.revision,8);
 assert.equal(wrote.length,7,'manifest, 4 account docs and 2 month docs are committed together');
 assert.deepEqual(docs.get(refs.sections.nutrition),oldNutrition,'original v2 section is still available for rollback');
 assert.equal(docs.get(refs.manifest).schemaVersion,3);
 assert.deepEqual(docs.get(refs.manifest).months,['2026-10','2026-11']);
 const loaded=await readAccountServer(sdk,{},'alice');
 assert.deepEqual(loaded.data,data);
 assert.equal(loaded.revision,8);
});
test('v112: changing one dated record rewrites only its month and the manifest',async()=>{
 const {docs,sdk,transaction}=harness(),refs=sectionRefs(sdk,{},'alice');
 const start=fixture(),tx=transaction();
 commitAccountTransaction(tx,refs,{revision:0,layout:0,partPayloads:{},partVersions:{}},0,encodeState(start),sdk);
 tx.apply();
 const oldSettings=structuredClone(docs.get(refs.part('settings')));
 const changed=fixture();changed.transactions[0].amountCents=815;
 const tx2=transaction(),read=await readAccountTransaction(tx2,refs);
 commitAccountTransaction(tx2,refs,read,1,encodeState(changed),sdk);
 const writes=tx2.apply().map(x=>x.ref);
 assert.deepEqual(writes,[refs.manifest,refs.part('month-2026-10')]);
 assert.deepEqual(docs.get(refs.part('settings')),oldSettings);
 assert.equal((await readAccountServer(sdk,{},'alice')).data.transactions[0].amountCents,815);
 const updated=fixture();updated.preferences.theme='system';
 const tx3=transaction(),state=await readAccountTransaction(tx3,refs);
 commitAccountTransaction(tx3,refs,state,2,encodeState(updated),sdk);
 const changedRefs=tx3.apply().map(x=>x.ref);
 assert.deepEqual(changedRefs,[refs.manifest,refs.part('settings'),refs.part('month-2026-10')],
  'undoing the purchase amount and editing a theme rewrites only their two affected files');
});
test('v112: removing a last month drops it from the manifest but never deletes old month snapshots',async()=>{
 const {docs,sdk,transaction}=harness(),refs=sectionRefs(sdk,{},'alice'),data=fixture();
 const tx=transaction();commitAccountTransaction(tx,refs,{revision:0,layout:0,partPayloads:{},partVersions:{}},0,encodeState(data),sdk);tx.apply();
 const oldMonth=structuredClone(docs.get(refs.part('month-2026-10')));
 const next=fixture();next.foodEntries=[];next.weights=[];next.transactions=[];
 const t2=transaction(),read=await readAccountTransaction(t2,refs);
 commitAccountTransaction(t2,refs,read,1,encodeState(next),sdk);t2.apply();
 assert.deepEqual(docs.get(refs.manifest).months,['2026-11']);
 assert.deepEqual(docs.get(refs.part('month-2026-10')),oldMonth,'old monthly document remains an independent historical recovery copy');
 assert.deepEqual((await readAccountServer(sdk,{},'alice')).data,next);
});
