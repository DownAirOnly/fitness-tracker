import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData} from '../data.js';
import {accountSectionUsage,MAX_CLOUD_BYTES,encodeState} from '../cloud-model.js';
import {monthlyParts} from '../account-monthly.js';

test('reported Firestore usage equals the exact UTF-8 bytes of each uploaded section',()=>{
 const data=emptyData();
 data.foodEntries.push({id:'meal',date:'2026-10-29',name:'Café',calories:140,protein:8,quantity:1});
 data.transactions.push({id:'bank',date:'2026-10-29',kind:'expense',amountCents:719,description:'Crème',category:'Groceries'});
 const sizes=accountSectionUsage(data),payloads=monthlyParts(data).parts;
 assert.deepEqual(Object.keys(sizes.sections),['settings','catalog','routines','financeConfig','month-2026-10']);
 for(const section of Object.keys(payloads)){
  const bytes=new TextEncoder().encode(payloads[section]).length;
  assert.equal(sizes.sections[section].bytes,bytes);
  assert.equal(sizes.sections[section].percent,bytes/MAX_CLOUD_BYTES*100);
 }
 assert.equal(sizes.totalBytes,Object.values(sizes.sections).reduce((sum,s)=>sum+s.bytes,0));
 assert.equal(typeof encodeState(data),'string');
});
test('large combined accounts are allowed, but one oversized Unicode section is rejected',()=>{
 const data=emptyData();
 for(let i=0;i<5200;i++)data.foodEntries.push({id:'meal-'+i,date:'2026-'+String(Math.floor(i/500)+1).padStart(2,'0')+'-29',name:'Yogurt serving '+i+' '+('s'.repeat(18)),calories:100,protein:10,quantity:1});
 for(let i=0;i<3800;i++)data.transactions.push({id:'bank-'+i,date:'2026-'+String(Math.floor(i/350)+1).padStart(2,'0')+'-29',kind:'expense',amountCents:719,description:'Groceries purchase '+i+' '+('z'.repeat(25)),category:'Groceries'});
 const usage=accountSectionUsage(data);
 assert.ok(Object.values(usage.sections).every(file=>file.bytes<MAX_CLOUD_BYTES));
 assert.equal(usage.months.length,11);
 assert.ok(usage.totalBytes>MAX_CLOUD_BYTES);
 assert.doesNotThrow(()=>encodeState(data));
 const oversized=emptyData();
 for(let i=0;i<350;i++)oversized.transactions.push({
  id:'unicode-'+i,date:'2026-10-29',kind:'expense',amountCents:100,
  description:'Café',category:'Groceries',itemization:'é'.repeat(1200)
 });
 const huge=accountSectionUsage(oversized);
 assert.ok(huge.sections['month-2026-10'].bytes>MAX_CLOUD_BYTES);
 assert.throws(()=>encodeState(oversized),/month-2026-10.*800 KB/);
});
