import test from 'node:test';
import assert from 'node:assert/strict';
import {financeOverviewSnapshot} from '../finance-overview-model.js';

const plan=(balanceCents=14000,balanceAsOf='2026-10-29')=>({
 balanceCents,balanceAsOf,categoryLimits:[],schedules:[
  {id:'b',name:'Bill',kind:'expense',amountCents:10000,startDate:'2026-10-30',frequency:'once',occurrences:{}},
  {id:'i',name:'Paycheck',kind:'income',amountCents:250000,startDate:'2026-10-31',frequency:'once',occurrences:{}}
 ]
});
test('overview excludes expected paycheck from available cash and spending estimate',()=>{
 const result=financeOverviewSnapshot(plan(),'2026-10-29');
 assert.equal(result.balanceCents,14000);
 assert.equal(result.nextPaycheck.amountCents,250000);
 assert.equal(result.spendingEstimateCents,4000);
 assert.equal(result.billsSoonCents,10000);
});
test('stale or absent manual balances never show a spend estimate',()=>{
 assert.equal(financeOverviewSnapshot(plan(14000,'2026-10-28'),'2026-10-29').spendingEstimateCents,null);
 assert.equal(financeOverviewSnapshot({...plan(),balanceCents:null,balanceAsOf:''},'2026-10-29').spendingEstimateCents,null);
});
test('missing scheduled expenses cannot be interpreted as free money',()=>{
 const p=plan();p.schedules=p.schedules.filter(x=>x.kind==='income');
 assert.equal(financeOverviewSnapshot(p,'2026-10-29').spendingEstimateCents,null);
});
test('completed occurrences are not subtracted; a same-day end-of-day balance is not double counted',()=>{
 const p=plan();p.schedules[0].occurrences['2026-10-30']='paid';
 assert.equal(financeOverviewSnapshot(p,'2026-10-29').spendingEstimateCents,14000);
 const sameDay=plan();sameDay.schedules[0].startDate='2026-10-29';
 assert.equal(financeOverviewSnapshot(sameDay,'2026-10-29').spendingEstimateCents,14000);
});
test('no plans change saved budget or bank transaction records',()=>{
 const p=plan(),before=JSON.stringify(p);
 financeOverviewSnapshot(p,'2026-10-29');
 assert.equal(JSON.stringify(p),before);
});
