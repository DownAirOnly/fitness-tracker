import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData,normalizeData,encodeData} from '../data.js';
import {emptyBudgetPlan,budgetMonthSpending} from '../budget-model.js';
import {paycheckWindows,paycheckWhatIf} from '../paycheck-model.js';
import {prepareImport,prepareBankImport,prepareSavedBankReview} from '../import-model.js';
import {bankChoose} from '../bank-reconcile.js';

const schedule={
 id:'salary',name:'Paycheck',kind:'income',amountCents:60000,
 startDate:'2026-10-23',frequency:'weekly',occurrences:{}
};
const bill={
 id:'car',name:'Car',kind:'expense',amountCents:10000,
 startDate:'2026-11-05',frequency:'monthly',occurrences:{}
};
const budget=(extras={})=>({...emptyBudgetPlan(),schedules:[schedule,bill],...extras});
const expense=(id,date,amountCents,extras={})=>({
 id,date,kind:'expense',amountCents,description:'Purchase',category:'Other',currency:'USD',...extras
});
const baseline=()=>normalizeData({...emptyData(),budgetPlan:budget(),
 transactions:[expense('prior','2026-10-27',50000),expense('current','2026-11-03',2000)]});
const bank=(merchant,amount,posted)=>[
 'Date,Description,Amount',
 posted.replace(/(\d{4})-(\d{2})-(\d{2})/,'$2/$3/$1')+','+merchant+',-'+amount
].join('\n');

test('v111: one check excludes next income and keeps last week held back',()=>{
 const data=baseline(),view=paycheckWindows(data.budgetPlan,data.transactions,'2026-11-03',2);
 assert.equal(view.periods.length,2);
 assert.equal(view.periods[0].start,'2026-10-30');
 assert.equal(view.periods[0].expectedCents,60000);
 assert.equal(view.periods[0].billCents,10000);
 assert.equal(view.periods[0].otherCents,2000);
 assert.equal(view.periods[0].leftCents,48000);
 assert.equal(view.heldBackCents,10000);
 assert.equal(view.periods[1].incomeCents,60000,'next paycheck remains separate');
 assert.equal(paycheckWhatIf(view.periods[0],1800),46200);
 assert.equal(view.periods[0].received,false);
});

test('v111: actual payday override is only for that occurrence',()=>{
 const d=baseline();
 d.budgetPlan.paycheckAmounts['salary|2026-10-30']=57000;
 d.budgetPlan.schedules[0].occurrences['2026-10-30']='paid';
 const view=paycheckWindows(d.budgetPlan,d.transactions,'2026-11-03',2);
 assert.equal(view.periods[0].incomeCents,57000);
 assert.equal(view.periods[0].leftCents,45000);
 assert.equal(view.periods[0].received,true);
 assert.equal(view.periods[1].expectedCents,60000);
 assert.equal(view.periods[1].incomeCents,60000);
 assert.deepEqual(normalizeData(encodeData(d)).budgetPlan.paycheckAmounts,d.budgetPlan.paycheckAmounts);
});

test('v111: paid status and a linked posted bill never deduct the same payment twice',()=>{
 const d=baseline();
 d.budgetPlan.schedules[1].occurrences['2026-11-05']='paid';
 let p=paycheckWindows(d.budgetPlan,d.transactions,'2026-11-03').periods[0];
 assert.equal(p.leftCents,48000,'paid marker changes status, not allocation');
 d.transactions.push(expense('bank-car','2026-11-05',10000,{
  billKey:'car|2026-11-05',bankDescription:'AUTO LOAN',bankDirection:'debit',accountLabel:'BofA Checking'
 }));
 p=paycheckWindows(d.budgetPlan,d.transactions,'2026-11-03').periods[0];
 assert.equal(p.leftCents,48000,'posted bill is not second discretionary spending');
 assert.equal(p.otherCents,2000);
});

test('v111: a bill posted across payday stays in its assigned week at the actual posted amount',()=>{
 const d=baseline();
 d.transactions.push(expense('late-car','2026-11-07',10450,{
  billKey:'car|2026-11-05',bankDescription:'AUTO LOAN',bankDirection:'debit',
  postedDate:'2026-11-07',accountLabel:'BofA Checking'
 }));
 const periods=paycheckWindows(d.budgetPlan,d.transactions,'2026-11-03',2).periods;
 assert.equal(periods[0].billCents,10450);
 assert.equal(periods[0].leftCents,47550);
 assert.equal(periods[0].bills[0].bankLinked,true);
 assert.equal(periods[0].bills[0].status,'paid');
 assert.equal(periods[1].otherCents,0,'a late-posted bill does not become next week discretionary spending');
});

test('v111: receipt itemization is one purchase and category caps split by items',()=>{
 const receipt=[
 'recordType,date,kind,amount,description,category,merchant,accountLabel,purchaseId,itemName,itemCategory,itemAmount',
 'purchase,2026-11-03,expense,30.00,Walmart visit,Uncategorized,Walmart,BofA Checking,w1,,,',
 'receiptItem,,,,,,,,w1,Groceries,Groceries,18.00',
 'receiptItem,,,,,,,,w1,Paper towels,Household Supplies,12.00'
 ].join('\n');
 const plan=prepareImport('csv',receipt,emptyData());
 assert.deepEqual(plan.errors,[]);
 assert.equal(plan.candidate.transactions.length,1);
 const tx=plan.candidate.transactions[0];
 assert.equal(tx.items.length,2);
 const capPlan=budget({categoryLimits:[
  {category:'Groceries',amountCents:2500},{category:'Household Supplies',amountCents:2000}
 ]});
 const totals=budgetMonthSpending(capPlan,plan.candidate.transactions,'2026-11');
 assert.equal(totals.find(x=>x.category==='Groceries').actualCents,1800);
 assert.equal(totals.find(x=>x.category==='Household Supplies').actualCents,1200);
 const imported=prepareBankImport(bank('WALMART STORE', '30.00','2026-11-05'),plan.candidate,
  {accountLabel:'BofA Checking',statementLabel:'Nov 2026'});
 assert.deepEqual(imported.errors,[]);
 assert.equal(imported.bankReview.matched.length,1);
 assert.equal(imported.candidate.transactions.length,1,'bank match upgrades same purchase ID');
 assert.equal(imported.candidate.transactions[0].id,tx.id);
 assert.equal(imported.candidate.transactions[0].postedDate,'2026-11-05');
 assert.equal(imported.candidate.transactions[0].purchaseDate,'2026-11-03');
 const repeat=prepareBankImport(bank('WALMART STORE','30.00','2026-11-05'),imported.candidate,
  {accountLabel:'BofA Checking',statementLabel:'Nov 2026'});
 assert.equal(repeat.bankReview.newRows.length,0);
 assert.equal(repeat.unchanged,1);
 assert.equal(repeat.candidate.transactions.length,1);
});

test('v111: $20 receipt can be manually matched to $24 bank charge with unknown $4 adjustment',()=>{
 const d=normalizeData({...emptyData(),transactions:[expense('dinner','2026-11-02',2000,{
  description:'Dinner',merchant:'Restaurant',category:'Restaurants',accountLabel:'BofA Checking',
  items:[{name:'Food',category:'Restaurants',amountCents:2000}]
 })]});
 const b=bank('RESTAURANT','24.00','2026-11-04');
 const preview=prepareBankImport(b,d,{accountLabel:'BofA Checking',statementLabel:'Nov'});
 assert.equal(preview.bankReview.needsReview.length,1);
 bankChoose(preview,d,preview.bankRecords[0].id,'match','dinner','Uncategorized','No assumption');
 assert.equal(preview.errors.length,0);
 assert.equal(preview.candidate.transactions.length,1);
 assert.equal(preview.candidate.transactions[0].amountCents,2400);
 assert.equal(preview.candidate.transactions[0].receiptAmountCents,2000);
 const limits=budgetMonthSpending(budget({categoryLimits:[
  {category:'Restaurants',amountCents:3000},{category:'Uncategorized',amountCents:1000}
 ]}),preview.candidate.transactions,'2026-11');
 assert.equal(limits.find(x=>x.category==='Restaurants').actualCents,2000);
 assert.equal(limits.find(x=>x.category==='Uncategorized').actualCents,400);
});

test('v111: ambiguous exact matches stay reviewable; defer persists through backup and reimport',()=>{
 const d=normalizeData({...emptyData(),transactions:[
  expense('coffee-one','2026-11-02',2000,{merchant:'Cafe',accountLabel:'BofA Checking'}),
  expense('coffee-two','2026-11-03',2000,{merchant:'Cafe',accountLabel:'BofA Checking'})
 ]});
 const statement=bank('CAFE','20.00','2026-11-04');
 const p=prepareBankImport(statement,d,{accountLabel:'BofA Checking',statementLabel:'Nov'});
 assert.equal(p.bankReview.matched.length,0);
 assert.equal(p.bankReview.needsReview.length,1);
 assert.equal(p.bankReview.needsReview[0].candidates.length,2);
 const deferred=p.candidate;
 assert.equal(deferred.budgetPlan.unresolvedBankRows.length,1);
 const restored=normalizeData(encodeData(deferred));
 const after=prepareSavedBankReview(restored);
 assert.equal(after.bankReview.needsReview.length,1);
 const bankId=after.bankRecords[0].id;
 bankChoose(after,restored,bankId,'match','coffee-two');
 assert.equal(after.errors.length,0);
 assert.equal(after.candidate.transactions.length,2);
 assert.equal(after.candidate.transactions.find(x=>x.id==='coffee-two').matchedBankId,bankId);
 assert.equal(after.candidate.budgetPlan.unresolvedBankRows.length,0);
 const reimport=prepareBankImport(statement,after.candidate,{accountLabel:'BofA Checking',statementLabel:'Nov'});
 assert.equal(reimport.unchanged,1);
 assert.equal(reimport.candidate.transactions.length,2);
});
