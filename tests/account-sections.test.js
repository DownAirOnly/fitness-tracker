import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData,normalizeData} from '../data.js';
import {ACCOUNT_SECTIONS,exportSection,applySection,mergeSections,sectionPayloads,readSectionPayloads,SECTION_FORMAT} from '../account-sections.js';
import {encodeState,decodeState,accountSectionUsage,MAX_CLOUD_BYTES} from '../cloud-model.js';

function sample(){
 const d=emptyData();
 d.foodEntries.push({id:'food-1',date:'2026-10-29',name:'Snack',calories:120,protein:20,quantity:1});
 d.weights.push({id:'weight-1',date:'2026-10-29',value:176});
 d.lifts.push({id:'lift-1',date:'2026-10-29',exercise:'Chest Press',equipment:'machine',sets:[{weight:60,reps:8}]});
 d.workoutHistory.push({id:'session-1',date:'2026-10-29',type:'Upper',exercises:[]});
 d.transactions.push({id:'tx-1',date:'2026-10-29',kind:'expense',amountCents:719,description:'Wawa water',
  bankDescription:'WAWA 42',bankDirection:'debit',category:'Household Supplies'});
 d.budgetPlan.balanceCents=14814;d.budgetPlan.balanceAsOf='2026-10-29';
 d.classificationRules.push({id:'rule-1',name:'Water',matchText:'Wawa',matchField:'any',category:'Household Supplies',subcategory:'Water',merchant:'Wawa',enabled:true});
 return normalizeData(d);
}
test('all three JSON exports reconstruct every canonical field without mixing data',()=>{
 const data=sample(),before=JSON.stringify(data);
 const files=ACCOUNT_SECTIONS.map(section=>exportSection(data,section));
 assert.deepEqual(files.map(x=>x.section),ACCOUNT_SECTIONS);
 assert.ok(files.every(x=>x.format===SECTION_FORMAT));
 assert.ok(!JSON.stringify(files[0]).includes('"transactions"'));
 assert.ok(!JSON.stringify(files[1]).includes('"foodEntries"'));
 assert.ok(!JSON.stringify(files[2]).includes('"workoutHistory"'));
 assert.deepEqual(mergeSections(files),data);
 assert.deepEqual(readSectionPayloads(sectionPayloads(data)),data);
 assert.equal(JSON.stringify(data),before);
});
test('single section import is full replacement of ONLY its own records',()=>{
 const data=sample();
 const nutrition=exportSection(data,'nutrition');
 nutrition.data.foodEntries=[{id:'meal2',date:'2026-10-29',name:'Yogurt',calories:90,protein:15,quantity:1}];
 const result=applySection(data,nutrition);
 assert.deepEqual(result.transactions,data.transactions);
 assert.deepEqual(result.workoutHistory,data.workoutHistory);
 assert.equal(result.foodEntries[0].id,'meal2');
 assert.equal(data.foodEntries[0].id,'food-1');
});
test('never silently accept unversioned, wrong-section, partial or duplicate files',()=>{
 const d=sample(),valid=exportSection(d,'finances');
 assert.throws(()=>applySection(d,{section:'finances',data:valid.data}),/supported/);
 assert.throws(()=>applySection(d,{...valid,data:{transactions:[]}}),/Missing/);
 assert.throws(()=>applySection(d,{...valid,data:{...valid.data,foods:[]}}),/Unexpected/);
 assert.throws(()=>mergeSections([valid,valid]),/exactly once/);
 const bad=exportSection(d,'finances');bad.data.transactions[0].amountCents=-100;
 assert.throws(()=>applySection(d,bad),/invalid/i);
});
test('v112: total account can exceed 800 KB when safely split into months',()=>{
 const data=sample();
 for(let i=0;i<4800;i++){
  const month=String(Math.floor(i/400)+1).padStart(2,'0');
  data.transactions.push({id:'trans-'+i,date:'2026-'+month+'-10',
   kind:'expense',amountCents:100,description:'Food purchase '+i+' '+('x'.repeat(110)),
   category:'Groceries'});
 }
 const usage=accountSectionUsage(data);
 assert.equal(usage.months.length,12);
 assert.ok(usage.totalBytes>MAX_CLOUD_BYTES);
 assert.ok(Object.values(usage.sections).every(x=>x.bytes<MAX_CLOUD_BYTES));
 assert.ok(typeof encodeState(data)==='string');
 const huge=sample();
 huge.transactions=Array.from({length:350},(_,i)=>({id:'large-'+i,date:'2026-10-29',
  kind:'expense',amountCents:100,description:'Groceries',itemization:'x'.repeat(2700),category:'Groceries'}));
 assert.throws(()=>encodeState(huge),/month-2026-10.*800 KB/);
});
test('weight units are checked across separate Nutrition and Lifting files',()=>{
 const d=sample();
 const lifting=exportSection(d,'lifting');
 assert.equal(lifting.data.weightUnit,'lb');
 assert.throws(()=>applySection(d,{...lifting,data:{...lifting.data,weightUnit:'kg'}}),/weight unit/i);
 const nutrition=exportSection(d,'nutrition');nutrition.data.settings.unit='kg';
 assert.throws(()=>applySection(d,nutrition),/weight unit/i);
 const adjustedLifting={...lifting,data:{...lifting.data,weightUnit:'kg'}};
 assert.equal(mergeSections([nutrition,adjustedLifting,exportSection(d,'finances')]).settings.unit,'kg');
});
test('legacy combined cloud payload remains readable',()=>{
 const d=sample();
 const old={schemaVersion:1,revision:7,payload:JSON.stringify(d)};
 const loaded=decodeState(old);
 assert.equal(loaded.revision,7);
 assert.deepEqual(loaded.data,d);
});
