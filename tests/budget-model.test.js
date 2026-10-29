import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyBudgetPlan,normalizeBudgetPlan,budgetOccurrences,budgetForecast,budgetMonthSpending,forecastPurchase} from '../budget-model.js';
import {emptyData,normalizeData,encodeData} from '../data.js';
import {planDeviceMigration} from '../cloud-model.js';
const date='2026-10-28';
const bill=(extra={})=>({id:'car',name:'Car payment',kind:'expense',amountCents:36600,startDate:'2026-01-31',frequency:'monthly',occurrences:{},...extra});
const pay=(extra={})=>({id:'pay',name:'Payday',kind:'income',amountCents:130000,startDate:'2026-10-30',frequency:'biweekly',occurrences:{},...extra});
const plan=(extra={})=>({balanceCents:14814,balanceAsOf:date,categoryLimits:[{category:'Convenience Food',amountCents:10000}],schedules:[bill(),pay()],...extra});
test('legacy notebooks default safely and v98 compact backup preserves the full budget',()=>{
 const before=emptyData();delete before.budgetPlan;
 assert.deepEqual(normalizeData(before).budgetPlan,emptyBudgetPlan());
 const current=normalizeData({...emptyData(),budgetPlan:plan()});
 const restored=normalizeData(encodeData(current));
 assert.deepEqual(restored.budgetPlan,plan());
 assert.deepEqual(restored.transactions,[]);
});
test('monthly end-of-month dates are clamped, weekly/payday occurrences never multiply',()=>{
 const events=budgetOccurrences(plan(),'2026-10-28','2026-12-15');
 const dates=events.filter(x=>x.id==='car').map(x=>x.date);
 assert.deepEqual(dates,['2026-10-31','2026-11-30']);
 assert.deepEqual(events.filter(x=>x.id==='pay').map(x=>x.date),['2026-10-30','2026-11-13','2026-11-27','2026-12-11']);
});
test('manual opening balance produces a real projected shortfall with dates and does not double count bank activity',()=>{
 const p=plan();const original=JSON.stringify(p);
 const f=budgetForecast(p,date,35);
 assert.equal(f.configured,true);
 assert.equal(f.openingCents,14814);
 assert.equal(f.events.filter(x=>x.id==='car').length,2);
 assert.equal(f.pendingCount,5); // 2 payments + 3 paychecks in 35-day window
 assert.equal(f.shortfall,false);
 assert.equal(f.endCents,14814+3*130000-2*36600);
 const extra=forecastPurchase(p,date,35,400000);
 assert.equal(extra.shortfall,true);
 assert.equal(extra.endCents,f.endCents-400000);
 assert.equal(JSON.stringify(p),original);
});
test('paid/skipped markers only omit planned events, not the underlying bank ledger',()=>{
 const p=plan({schedules:[bill({occurrences:{'2026-10-31':'paid','2026-11-30':'skipped'}})]});
 const f=budgetForecast(p,date,40);
 assert.equal(f.pendingCount,0);
 assert.equal(f.endCents,p.balanceCents);
 const t=[{id:'x',date:'2026-10-31',kind:'expense',amountCents:36600,category:'Car & Insurance'}];
 const copy=JSON.stringify(t);
 assert.deepEqual(budgetMonthSpending(p,t,'2026-10'),[{category:'Convenience Food',limitCents:10000,actualCents:0,remainingCents:10000,percent:0}]);
 assert.equal(JSON.stringify(t),copy);
});
test('category limits only count recorded expenses from the selected month',()=>{
 const t=[{date:'2026-10-28',kind:'expense',amountCents:6500,category:'Convenience Food'},
 {date:'2026-10-20',kind:'expense',amountCents:5000,category:'Convenience Food'},
 {date:'2026-10-21',kind:'transfer',amountCents:15000,category:'Convenience Food'},
 {date:'2026-09-01',kind:'expense',amountCents:5000,category:'Convenience Food'}];
 const [b]=budgetMonthSpending(plan(),t,'2026-10');
 assert.equal(b.actualCents,11500);
 assert.equal(b.remainingCents,-1500);
 assert.equal(b.percent,115);
});
test('reject duplicate/invalid plans, and never infer a balance from current transactions',()=>{
 assert.deepEqual(budgetForecast(emptyBudgetPlan(),date),{configured:false,events:[],days:[],minimumCents:null,endCents:null,pendingCount:0});
 assert.throws(()=>normalizeBudgetPlan(plan({schedules:[bill(),bill()]})),/Duplicate|Invalid/i);
 assert.throws(()=>normalizeBudgetPlan(plan({schedules:[bill({amountCents:-1})]})),/Invalid/i);
 assert.throws(()=>normalizeBudgetPlan(plan({balanceAsOf:'2026-02-30'})),/Invalid/i);
 assert.throws(()=>budgetOccurrences(plan(),'2026-01-01','2028-01-01'),/Invalid/);
});
test('manual negative balance is supported and plan remains private when migrating a separate populated cloud budget',()=>{
 const device=normalizeData({...emptyData(),budgetPlan:plan({balanceCents:-10000})});
 const restored=normalizeData(encodeData(device));
 assert.equal(restored.budgetPlan.balanceCents,-10000);
 const incoming=planDeviceMigration(emptyData(),device);
 assert.deepEqual(incoming.candidate.budgetPlan,device.budgetPlan);
 const existing=normalizeData({...emptyData(),budgetPlan:plan({balanceCents:5000})});
 const collision=planDeviceMigration(existing,device);
 assert.equal(collision.candidate.budgetPlan.balanceCents,5000,'existing cloud assumptions always win');
});
