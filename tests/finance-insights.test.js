import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeFinanceInsights,financeInsightPeriods} from '../finance-insights-model.js';

const tx=(id,date,kind,amountCents,category,extra={})=>({
 id,date,kind,amountCents,category,description:'Transaction '+id,...extra
});
const transactions=[
 tx('a','2026-10-28','expense',719,'Household Supplies',{merchant:'Wawa',bankDescription:'WAWA STORE'}),
 tx('b','2026-10-27','expense',1400,'Convenience Food',{merchant:'365 Market'}),
 tx('c','2026-10-20','expense',1200,'Uncategorized',{bankDescription:'365 MARKET'}),
 tx('d','2026-10-22','transfer',10000,'Transfers',{bankDirection:'debit',bankDescription:'DISCOVER E-PAYMENT'}),
 tx('e','2026-10-21','transfer',10000,'Transfers',{bankDirection:'credit',bankDescription:'OVERDRAFT PROTECTION FROM SAVINGS'}),
 tx('f','2026-10-22','transfer',2500,'Transfers'),
 tx('g','2026-10-28','income',150000,'Income',{merchant:'Employer'}),
 tx('h','2026-07-12','expense',2500,'Restaurants',{merchant:'Cafe'}),
 tx('i','2026-09-30','expense',1900,'Convenience Food',{merchant:'365 Market'})
];
test('spending totals only count expense; income and transfers are separate',()=>{
 const result=summarizeFinanceInsights(transactions,'all','2026-10-28');
 assert.equal(result.recordCount,9);
 assert.equal(result.expenseCents,719+1400+1200+2500+1900);
 assert.equal(result.incomeCents,150000);
 assert.equal(result.transferOutCents,10000);
 assert.equal(result.transferInCents,10000);
 assert.equal(result.unknownTransferCents,2500);
 assert.equal(result.unknownTransferCount,1);
 assert.equal(result.convenienceCents,3300);
 assert.equal(result.uncategorizedCount,1);
 assert.equal(result.uncategorizedCents,1200);
 assert.equal(result.categories.reduce((n,c)=>n+c.amountCents,0),result.expenseCents);
 assert.equal(result.merchants.reduce((n,c)=>n+c.amountCents,0),result.expenseCents);
 assert.equal(result.merchants[0].name,'365 Market');
 assert.equal(result.merchants[0].amountCents,3300);
 assert.ok(result.reviewCount>=1);
});
test('30 and 90 calendar day windows are inclusive of today, not future dates',()=>{
 const records=[tx('a','2026-10-28','expense',1,'Other'),
  tx('b','2026-09-29','expense',2,'Other'),
  tx('c','2026-09-28','expense',3,'Other'),
  tx('d','2026-07-30','expense',4,'Other'),
  tx('e','2026-07-29','expense',5,'Other'),
  tx('f','2026-10-29','expense',6,'Other')];
 assert.equal(summarizeFinanceInsights(records,'30d','2026-10-28').expenseCents,3);
 assert.equal(summarizeFinanceInsights(records,'90d','2026-10-28').expenseCents,6);
 assert.equal(summarizeFinanceInsights(records,'all','2026-10-28').expenseCents,21);
});
test('exact calendar months use saved dates and do not alter originals',()=>{
 const before=JSON.stringify(transactions);
 const october=summarizeFinanceInsights(transactions,'month:2026-10','2026-10-28');
 assert.equal(october.recordCount,7);
 assert.equal(october.expenseCents,3319);
 const months=financeInsightPeriods(transactions);
 assert.ok(months.some(p=>p.value==='month:2026-09'));
 assert.equal(months[0].value,'all');
 assert.equal(JSON.stringify(transactions),before);
 assert.throws(()=>summarizeFinanceInsights(transactions,'invalid'),/Unknown/);
});
test('manual transfers without bank direction are not silently assigned to cash out',()=>{
 const report=summarizeFinanceInsights([tx('x','2026-10-28','transfer',777,'Transfers')]);
 assert.equal(report.expenseCents,0);
 assert.equal(report.transferOutCents,0);
 assert.equal(report.transferInCents,0);
 assert.equal(report.unknownTransferCents,777);
});
