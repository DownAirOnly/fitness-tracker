import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData,encodeData,normalizeData} from '../data.js';
import {prepareImport} from '../import-model.js';
import {FINANCE_CATEGORIES,parseFinanceAmount,formatFinanceAmount,financeCsvId,financeDuplicateKey} from '../finance-model.js';

const prepared=[
 'recordType,date,time,kind,amount,description,category,merchant,note,externalId',
 'transaction,2026-10-27,14:15,expense,7.19,Water cases,Household Supplies,Wawa,,bank-1',
 'transaction,2026-10-27,,income,1200.00,Paycheck,Income,,,bank-2'
].join('\n');

test('v83: dollars convert to exact cents without floating-point inference',()=>{
 assert.equal(parseFinanceAmount('7.19'),719);
 assert.equal(parseFinanceAmount('7.1'),710);
 assert.equal(parseFinanceAmount('$1,234.56'),123456);
 assert.equal(parseFinanceAmount('0.01'),1);
 assert.equal(parseFinanceAmount('400'),40000);
 assert.equal(formatFinanceAmount(719),'$7.19');
 assert.equal(formatFinanceAmount(123456),'$1,234.56');
 for(const bad of ['0','-7.19','7.199','1e3','7,19','Infinity','NaN','','4.','-$2','+2','0.00']){
  assert.throws(()=>parseFinanceAmount(bad),/positive amount|dollars/,bad);
 }
 assert.ok(FINANCE_CATEGORIES.includes('Convenience Food'));
});

test('v83: prepared ChatGPT transaction CSV parses and stages expense and income together',()=>{
 const current=emptyData(),preview=prepareImport('csv',prepared,current);
 assert.equal(preview.errors.length,0);
 assert.equal(preview.display.transactions,2);
 const group=preview.groups.find(g=>g.key==='transactions');
 assert.equal(group.rows.length,2);
 assert.equal(preview.candidate.transactions.length,2);
 assert.equal(preview.candidate.transactions[0].amountCents,719);
 assert.equal(preview.candidate.transactions[0].time,'14:15');
 assert.equal(preview.candidate.transactions[0].externalId,'bank-1');
 assert.equal(preview.candidate.transactions[0].source,'import');
 assert.equal(preview.candidate.transactions[1].kind,'income');
 assert.equal(preview.candidate.transactions[1].time,undefined);
 assert.equal(preview.candidate.transactions[1].amountCents,120000);
 assert.equal(current.transactions.length,0,'preview does not modify current notebook');
 assert.deepEqual(normalizeData(encodeData(preview.candidate)).transactions,preview.candidate.transactions);
});

test('v83: importing the same prepared batch twice does not duplicate its transactions',()=>{
 const first=prepareImport('csv',prepared,emptyData());
 assert.equal(first.errors.length,0);
 const again=prepareImport('csv',prepared,first.candidate);
 assert.equal(again.errors.length,0);
 assert.equal(again.groups.find(g=>g.key==='transactions').rows.length,0);
 assert.equal(again.display.count,0);
 assert.deepEqual(again.candidate.transactions,first.candidate.transactions);
 assert.equal(again.unchanged,2);
});

test('v83: identical same-day charges in one batch remain two real records',()=>{
 const csv=[
 'recordType,date,kind,amount,description,category',
 'transaction,2026-10-27,expense,5.00,Coffee,Restaurants',
 'transaction,2026-10-27,expense,5.00,Coffee,Restaurants'
 ].join('\n');
 const plan=prepareImport('csv',csv,emptyData());
 assert.equal(plan.errors.length,0);
 assert.equal(plan.candidate.transactions.length,2);
 assert.notEqual(plan.candidate.transactions[0].id,plan.candidate.transactions[1].id);
 const repeat=prepareImport('csv',csv,plan.candidate);
 assert.equal(repeat.display.count,0);
 assert.equal(repeat.candidate.transactions.length,2);
});

test('v83: potential overlap with manually recorded purchases is flagged, not silently removed',()=>{
 const existing=emptyData();
 existing.transactions=[{
  id:'manual-water',date:'2026-10-27',time:'14:15',kind:'expense',amountCents:719,
  description:'Water cases',category:'Household Supplies',merchant:'Wawa',currency:'USD',source:'manual'
 }];
 const plan=prepareImport('csv',prepared,existing);
 const water=plan.groups.find(g=>g.key==='transactions').rows.find(x=>x.record.description==='Water cases');
 assert.ok(water?.badges.includes('Possible duplicate'));
 assert.match(plan.warnings.join(' '),/looks like an existing transaction/);
 assert.equal(plan.candidate.transactions.length,3);
 assert.equal(existing.transactions.length,1);
});

test('v83: conflicting transaction IDs and invalid amounts block the entire CSV candidate',()=>{
 const first=prepareImport('csv',prepared,emptyData());
 const clash=[
  'recordType,id,date,kind,amount,description,category',
  'transaction,'+first.candidate.transactions[0].id+',2026-10-27,expense,9.00,Other purchase,Other'
 ].join('\n');
 const conflict=prepareImport('csv',clash,first.candidate);
 assert.equal(conflict.candidate,null);
 assert.match(conflict.errors.join(' '),/transaction ID already exists/);
 const mixed=[
  'recordType,date,kind,amount,description',
  'transaction,2026-10-27,expense,1.00,Valid',
  'transaction,2026-10-27,expense,-7.19,Invalid'
 ].join('\n');
 const bad=prepareImport('csv',mixed,emptyData());
 assert.equal(bad.candidate,null);
 assert.match(bad.errors.join(' '),/Row 3/);
 assert.throws(()=>prepareImport('csv','Date,Description,Amount\n2026-10-27,Raw bank charge,-7.19',emptyData()),/recordType column/);
});

test('v83: transaction aliases and cents-only rows can be safely imported',()=>{
 const csv='recordType,date,amountCents,description,category\nincome,2026-10-27,5125,Reimbursement,Income';
 const p=prepareImport('csv',csv,emptyData());
 assert.equal(p.errors.length,0);
 assert.deepEqual(p.candidate.transactions.map(x=>[x.kind,x.amountCents]),[['income',5125]]);
});

test('v83: fingerprint is independent of category edits but sensitive to bank identifiers',()=>{
 const tx={date:'2026-10-27',kind:'expense',amountCents:300,description:'Snack',category:'Food'};
 assert.equal(financeCsvId(tx),financeCsvId({...tx,category:'Convenience Food'}));
 assert.equal(financeDuplicateKey(tx),financeDuplicateKey({...tx,category:'Other'}));
 assert.notEqual(financeCsvId(tx),financeCsvId({...tx,externalId:'bank-ref'}));
 assert.notEqual(financeCsvId(tx,1),financeCsvId(tx,2));
});
