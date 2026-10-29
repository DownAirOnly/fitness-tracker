import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData} from '../data.js';
import {accountSectionUsage,MAX_CLOUD_BYTES,encodeState} from '../cloud-model.js';
import {ACCOUNT_SECTIONS,sectionPayloads} from '../account-sections.js';

test('reported Firestore usage equals the exact UTF-8 bytes of each uploaded section',()=>{
 const data=emptyData();
 data.foodEntries.push({id:'meal',date:'2026-10-29',name:'Café',calories:140,protein:8,quantity:1});
 data.transactions.push({id:'bank',date:'2026-10-29',kind:'expense',amountCents:719,description:'Crème',category:'Groceries'});
 const sizes=accountSectionUsage(data),payloads=sectionPayloads(data);
 assert.deepEqual(Object.keys(sizes.sections),ACCOUNT_SECTIONS);
 for(const section of ACCOUNT_SECTIONS){
  const bytes=new TextEncoder().encode(payloads[section]).length;
  assert.equal(sizes.sections[section].bytes,bytes);
  assert.equal(sizes.sections[section].percent,bytes/MAX_CLOUD_BYTES*100);
 }
 assert.equal(sizes.totalBytes,Object.values(sizes.sections).reduce((sum,s)=>sum+s.bytes,0));
 assert.equal(typeof encodeState(data),'string');
});
test('large combined accounts are allowed, but one oversized Unicode section is rejected',()=>{
 const data=emptyData();
 for(let i=0;i<4000;i++)data.foodEntries.push({id:'meal-'+i,date:'2026-10-29',name:'Yogurt '+i,calories:100,protein:10,quantity:1});
 for(let i=0;i<2700;i++)data.transactions.push({id:'bank-'+i,date:'2026-10-29',kind:'expense',amountCents:719,description:'Groceries '+i,category:'Groceries'});
 const usage=accountSectionUsage(data);
 assert.ok(usage.sections.nutrition.bytes<MAX_CLOUD_BYTES);
 assert.ok(usage.sections.finances.bytes<MAX_CLOUD_BYTES);
 assert.ok(usage.totalBytes>MAX_CLOUD_BYTES);
 assert.doesNotThrow(()=>encodeState(data));
 const oversized=emptyData();
 for(let i=0;i<350;i++)oversized.transactions.push({
  id:'unicode-'+i,date:'2026-10-29',kind:'expense',amountCents:100,
  description:'Café',category:'Groceries',itemization:'é'.repeat(1200)
 });
 const huge=accountSectionUsage(oversized);
 assert.ok(huge.sections.finances.bytes>MAX_CLOUD_BYTES);
 assert.throws(()=>encodeState(oversized),/finances.*800 KB/);
});
