// v111: paycheck periods are a ledger view, not a bank balance.
// Each scheduled paycheck owns a period; paid bills remain allocated and bank
// matches/receipts keep one stable purchase ID.
import {normalizeBudgetPlan,budgetOccurrences} from './budget-model.js?v=111';

const DAY=86400000;
export const shiftPayday=(date,days)=>new Date(Date.parse(date+'T00:00:00Z')+days*DAY).toISOString().slice(0,10);
const effectiveDate=tx=>tx.purchaseDate||tx.date;
const billKey=e=>e.id+'|'+e.date;
const sum=(items,fn)=>items.reduce((n,item)=>n+fn(item),0);

function datesForPaychecks(plan,today){
 const start=shiftPayday(today,-180),end=shiftPayday(today,180);
 const events=budgetOccurrences(plan,start,end).filter(e=>e.kind==='income'&&e.status!=='skipped');
 const recurring=new Set(plan.schedules.filter(r=>r.kind==='income'&&['weekly','biweekly'].includes(r.frequency)).map(r=>r.id));
 const preferred=events.filter(e=>recurring.has(e.id));
 const chosen=preferred.length?preferred:events;
 const dates=[...new Set(chosen.map(e=>e.date))].sort();
 return{events:chosen,dates};
}
export function paycheckWindows(input,transactions,today,count=1){
 const plan=normalizeBudgetPlan(input);
 if(!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(today)||![1,2].includes(count))throw Error('Invalid paycheck view.');
 const {events,dates}=datesForPaychecks(plan,today);
 if(!dates.length)return{configured:false,periods:[],heldBackCents:null};
 let index=dates.findLastIndex(date=>date<=today);
 const future=index<0;
 if(future)index=0;
 const starts=dates.slice(Math.max(0,index-1),Math.min(dates.length,index+count+1));
 const makePeriod=start=>{
  const di=dates.indexOf(start),end=dates[di+1]||shiftPayday(start,7);
  const paycheckEvents=events.filter(e=>e.date===start);
  const expectedCents=sum(paycheckEvents,e=>{
   const rule=plan.schedules.find(r=>r.id===e.id);
   return rule?.amountCents??e.amountCents;
  });
  const incomeCents=sum(paycheckEvents,e=>e.amountCents);
  const received=paycheckEvents.length>0&&paycheckEvents.every(e=>e.status==='paid');
  // Assignment overrides are period dates; old due-date default is always preserved.
  const allBills=budgetOccurrences(plan,shiftPayday(start,-90),shiftPayday(end,90))
   .filter(e=>e.kind==='expense');
  const bills=allBills.filter(e=>{
   const assigned=plan.billAssignments[billKey(e)];
   return assigned?assigned===start:e.date>=start&&e.date<end;
  }).map(e=>({...e,key:billKey(e)}));
  const chargedBills=bills.filter(e=>e.status!=='skipped');
  const billedKeys=new Set(chargedBills.map(e=>e.key));
  const spend=transactions.filter(tx=>{
   if(tx.kind!=='expense')return false;
   const purchase=tx.paycheckDate||effectiveDate(tx);
   return purchase>=start&&purchase<end&&(!tx.billKey||!billedKeys.has(tx.billKey));
  });
  const billCents=sum(chargedBills,e=>e.amountCents);
  const otherCents=sum(spend,tx=>tx.amountCents);
  return {start,end,endInclusive:shiftPayday(end,-1),paycheckEvents,
   expectedCents,incomeCents,received,bills,spending:spend,billCents,
   otherCents,leftCents:incomeCents-billCents-otherCents,
   future:start>today};
 };
 const period=makePeriod(dates[index]),previous=index>0?makePeriod(dates[index-1]):null;
 return{configured:true,periods:dates.slice(index,index+count).map(makePeriod),
  heldBackCents:previous?.leftCents??null,heldBackPeriod:previous?.start||null,
  future};
}
export function paycheckWhatIf(period,amountCents){
 if(!Number.isSafeInteger(amountCents)||amountCents<0)throw Error('Invalid purchase amount.');
 return period.leftCents-amountCents;
}
