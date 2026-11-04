import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyBudgetPlan} from '../budget-model.js';
import {paycheckWindows,combinePaycheckPeriods,paycheckWhatIf} from '../paycheck-model.js';

test('v115: two-week view combines totals into one ledger without altering weekly allocations',()=>{
 const plan=emptyBudgetPlan();
 plan.schedules=[
  {id:'salary',name:'Paycheck',kind:'income',amountCents:57500,frequency:'weekly',startDate:'2026-10-30',occurrences:{'2026-10-30':'paid'}},
  {id:'bill',name:'Bill',kind:'expense',amountCents:10000,frequency:'weekly',startDate:'2026-10-31',occurrences:{}}
 ];
 const tx=[
  {id:'a',date:'2026-11-01',kind:'expense',amountCents:2500},
  {id:'b',date:'2026-11-08',kind:'expense',amountCents:1500}
 ];
 const view=paycheckWindows(plan,tx,'2026-11-03',2);
 assert.equal(view.periods.length,2);
 const original=structuredClone(view.periods);
 const combined=combinePaycheckPeriods(view.periods);
 assert.equal(combined.periodCount,2);
 assert.equal(combined.start,'2026-10-30');
 assert.equal(combined.endInclusive,'2026-11-12');
 assert.equal(combined.incomeCents,115000);
 assert.equal(combined.billCents,20000);
 assert.equal(combined.otherCents,4000);
 assert.equal(combined.leftCents,91000);
 assert.equal(combined.paycheckEvents.length,2);
 assert.equal(combined.bills.length,2);
 assert.equal(combined.spending.length,2);
 assert.equal(combined.received,false,'one received and one expected is not fully received');
 assert.equal(combined.receivedCount,1);
 assert.equal(paycheckWhatIf(combined,2000),89000,'what-if uses combined remainder');
 assert.deepEqual(view.periods,original,'per-paycheck allocations remain unchanged');
});

test('v115: one available period stays a single paycheck and an empty window is safe',()=>{
 const plan=emptyBudgetPlan();
 plan.schedules=[{id:'one',name:'Bonus',kind:'income',amountCents:12000,frequency:'once',startDate:'2026-11-06',occurrences:{}}];
 const view=paycheckWindows(plan,[],'2026-11-03',2);
 assert.equal(view.periods.length,1);
 assert.equal(combinePaycheckPeriods(view.periods).periodCount,1);
 assert.equal(combinePaycheckPeriods([]),null);
});
