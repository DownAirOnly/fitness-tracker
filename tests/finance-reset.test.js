import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData,resetFinanceData} from '../data.js';
import {emptyBudgetPlan} from '../budget-model.js';
import {monthlyParts,readMonthlyParts} from '../account-monthly.js';

test('v113: resetting Finance leaves Food, Lifting, Progress and preferences untouched',()=>{
 const before=emptyData();
 before.preferences.theme='dark';
 before.settings.calories=1780;
 before.foods.push({id:'food',name:'Protein drink',calories:230,protein:42,kind:'drink',pinned:true});
 before.foodEntries.push({id:'food-log',date:'2026-11-01',name:'Protein drink',calories:230,protein:42,quantity:1});
 before.weights.push({id:'weigh',date:'2026-11-02',value:175});
 before.bodyFat.push({id:'bodyfat',date:'2026-11-02',value:24});
 before.lifts.push({id:'lift',date:'2026-11-02',exercise:'Chest Press',equipment:'machine',sets:[{weight:60,reps:10}]});
 before.transactions.push({id:'bank',date:'2026-10-31',kind:'expense',amountCents:1150,description:'Groceries',category:'Groceries'});
 before.classificationRules.push({id:'old-rule',description:'Store'});
 before.budgetPlan.balanceCents=12400;
 before.budgetPlan.balanceAsOf='2026-11-03';
 before.budgetPlan.categoryLimits.push({category:'Restaurants',amountCents:20000});
 before.budgetPlan.unresolvedBankRows.push({id:'pending-bank'});
 const snapshot=structuredClone(before);
 const after=resetFinanceData(before);
 assert.deepEqual(before,snapshot,'reset does not mutate original records');
 assert.deepEqual(after.transactions,[]);
 assert.deepEqual(after.classificationRules,[]);
 assert.deepEqual(after.budgetPlan,emptyBudgetPlan(),'reset removes all payday, bill, bank review and budget state');
 for(const key of ['preferences','settings','foods','foodEntries','weights','bodyFat','lifts',
  'exerciseDefinitions','workoutTemplates','workoutSchedule','activeWorkout','workoutHistory','promptDate']){
  assert.deepEqual(after[key],before[key],key+' is unchanged');
 }
 assert.notStrictEqual(after,before,'creates a new notebook candidate');
});

test('v113: monthly Firestore partition excludes reset transactions but retains fitness history',()=>{
 const before=emptyData();
 before.foodEntries.push({id:'food-oct',date:'2026-10-23',name:'Meal',calories:350,protein:30,quantity:1});
 before.weights.push({id:'weight-nov',date:'2026-11-02',value:175});
 before.transactions.push({id:'finance-oct',date:'2026-10-24',kind:'expense',amountCents:500,description:'Old',category:'Other'});
 before.transactions.push({id:'finance-sep',date:'2026-09-24',kind:'income',amountCents:40000,description:'Old paycheck',category:'Income'});
 const after=resetFinanceData(before),{parts,months}=monthlyParts(after);
 assert.deepEqual(months,['2026-10','2026-11'],'finance-only month falls out of the active manifest');
 assert.deepEqual(JSON.parse(parts['month-2026-10']).transactions||[],[]);
 assert.deepEqual(JSON.parse(parts['month-2026-11']).transactions||[],[]);
 const loaded=readMonthlyParts(parts,months);
 assert.deepEqual(loaded.transactions,[]);
 assert.equal(loaded.foodEntries[0].id,'food-oct');
 assert.equal(loaded.weights[0].id,'weight-nov');
});
