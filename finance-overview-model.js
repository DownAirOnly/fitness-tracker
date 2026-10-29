// v99 — read-only cash overview. Never infer a bank balance from transactions.
import {normalizeBudgetPlan,budgetOccurrences} from './budget-model.js?v=98';
const addDays=(date,days)=>new Date(Date.parse(date+'T00:00:00Z')+days*86400000).toISOString().slice(0,10);
export function financeOverviewSnapshot(input,today){
 const plan=normalizeBudgetPlan(input);
 const tomorrow=addDays(today,1);
 // An end-of-day manual balance already includes activity through its as-of date.
 const start=plan.balanceAsOf&&plan.balanceAsOf>=today?addDays(plan.balanceAsOf,1):today;
 const pending=budgetOccurrences(plan,start,addDays(start,60)).filter(event=>event.status==='pending');
 const nextPaycheck=pending.find(event=>event.kind==='income')||null;
 const soonEnd=addDays(start,14);
 const billsSoon=pending.filter(event=>event.kind==='expense'&&event.date<=soonEnd);
 // Deliberately ignore every future paycheck when estimating remaining current cash.
 const until=nextPaycheck?.date||soonEnd;
 const billsBeforeIncome=pending.filter(event=>event.kind==='expense'&&event.date<=until);
 const billsBeforeIncomeCents=billsBeforeIncome.reduce((sum,event)=>sum+event.amountCents,0);
 const balanceCurrent=plan.balanceCents!==null&&plan.balanceAsOf===today;
 const hasBills=plan.schedules.some(rule=>rule.kind==='expense');
 return {
  balanceCents:plan.balanceCents,balanceAsOf:plan.balanceAsOf,balanceCurrent,
  nextPaycheck,billsSoon,billsSoonCents:billsSoon.reduce((sum,event)=>sum+event.amountCents,0),
  upcoming:pending.slice(0,5),billsBeforeIncomeCents,
  spendingEstimateCents:balanceCurrent&&hasBills?plan.balanceCents-billsBeforeIncomeCents:null,
  estimateThrough:until,hasBills,hasSchedules:plan.schedules.length>0
 };
}
