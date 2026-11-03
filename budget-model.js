// v98 — cash-flow plans are explicitly entered projections, never inferred bank balances.
const DAY=86_400_000;
const dateOK=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&
 new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const day=x=>Date.parse(x+'T00:00:00Z')/DAY;
const iso=x=>new Date(x*DAY).toISOString().slice(0,10);
const money=x=>Number.isSafeInteger(x)&&x>=0&&x<=10_000_000_000;
const signedBalance=x=>Number.isSafeInteger(x)&&Math.abs(x)<=10_000_000_000;
const sameMonth=(x,m)=>x.slice(0,7)===m;
export const emptyBudgetPlan=()=>({balanceCents:null,balanceAsOf:'',categoryLimits:[],schedules:[],
 paycheckAmounts:{},billAssignments:{},unresolvedBankRows:[]});
export function normalizeBudgetPlan(input){
 if(input==null)return emptyBudgetPlan();
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid budget plan.');
 const balanceCents=input.balanceCents==null?null:input.balanceCents;
 const balanceAsOf=input.balanceAsOf||'';
 if((balanceCents!==null&&!signedBalance(balanceCents))||
    (balanceCents===null&&balanceAsOf)||(balanceCents!==null&&!dateOK(balanceAsOf)))throw Error('Invalid manual balance date or amount.');
 if(!Array.isArray(input.categoryLimits)||input.categoryLimits.length>60||
    !Array.isArray(input.schedules)||input.schedules.length>250)throw Error('Budget plan is too large.');
 const paycheckAmounts=input.paycheckAmounts??{},billAssignments=input.billAssignments??{},
  unresolvedBankRows=input.unresolvedBankRows??[];
 const validEntries=value=>value&&typeof value==='object'&&!Array.isArray(value)&&
  Object.keys(value).length<=1500&&Object.keys(value).every(k=>k.length<=180&&k.includes('|')&&dateOK(k.split('|').at(-1)));
 if(!validEntries(paycheckAmounts)||Object.values(paycheckAmounts).some(n=>!money(n)||n===0)||
    !validEntries(billAssignments)||Object.values(billAssignments).some(d=>!dateOK(d))||
    !Array.isArray(unresolvedBankRows)||unresolvedBankRows.length>500)
  throw Error('Invalid paycheck allocations or unresolved bank records.');
 const bankIds=new Set();
 for(const row of unresolvedBankRows){
  if(!row||typeof row!=='object'||Array.isArray(row)||typeof row.id!=='string'||!row.id.startsWith('bofa-')||
   bankIds.has(row.id)||!dateOK(row.date)||!money(row.amountCents)||row.amountCents===0||
   !['expense','income','transfer'].includes(row.kind)||!['debit','credit'].includes(row.bankDirection)||
   typeof row.bankDescription!=='string'||!row.bankDescription.trim()||row.bankDescription.length>240||
   typeof row.accountLabel!=='string'||!row.accountLabel.trim()||row.accountLabel.length>120||
   typeof row.statementLabel!=='string'||row.statementLabel.length>160)
   throw Error('Invalid unresolved bank record.');
  bankIds.add(row.id);
 }
 const names=new Set(),ids=new Set();
 const categoryLimits=input.categoryLimits.map(r=>{
  if(!r||typeof r.category!=='string'||!r.category.trim()||r.category.length>80||
    !money(r.amountCents)||r.amountCents===0)throw Error('Invalid monthly category budget.');
  const category=r.category.trim(),key=category.toLocaleLowerCase();
  if(names.has(key))throw Error('Duplicate category budget.');
  names.add(key);return{category,amountCents:r.amountCents};
 });
 const schedules=input.schedules.map(r=>{
  if(!r||typeof r.id!=='string'||!r.id.trim()||r.id.length>160||ids.has(r.id)||
   typeof r.name!=='string'||!r.name.trim()||r.name.length>120||
   !['expense','income'].includes(r.kind)||!money(r.amountCents)||!r.amountCents||
   !dateOK(r.startDate)||!['once','weekly','biweekly','monthly'].includes(r.frequency)||
   (r.endDate!=null&&(!dateOK(r.endDate)||r.endDate<r.startDate)))
   throw Error('Invalid scheduled budget item.');
  if(!r.occurrences||typeof r.occurrences!=='object'||Array.isArray(r.occurrences))throw Error('Invalid budget occurrence statuses.');
  const statuses=Object.entries(r.occurrences);
  if(statuses.length>520||statuses.some(([date,status])=>!dateOK(date)||!['paid','skipped'].includes(status)))
   throw Error('Invalid scheduled payment status.');
  ids.add(r.id);
  return{id:r.id,name:r.name.trim(),kind:r.kind,amountCents:r.amountCents,
   startDate:r.startDate,frequency:r.frequency,
   ...(r.endDate?{endDate:r.endDate}:{}),occurrences:Object.fromEntries(statuses)};
 });
 return{balanceCents,balanceAsOf,categoryLimits,schedules,
  paycheckAmounts:{...paycheckAmounts},billAssignments:{...billAssignments},
  unresolvedBankRows:structuredClone(unresolvedBankRows)};
}
function occursOn(r,d){
 if(d<r.startDate||r.endDate&&d>r.endDate)return false;
 const distance=day(d)-day(r.startDate);
 if(r.frequency==='once')return distance===0;
 if(r.frequency==='weekly')return distance%7===0;
 if(r.frequency==='biweekly')return distance%14===0;
 const monthIndex=d=>Number(d.slice(0,4))*12+Number(d.slice(5,7))-1;
 const delta=monthIndex(d)-monthIndex(r.startDate);
 if(delta<0)return false;
 const originDay=Number(r.startDate.slice(8,10));
 const year=Number(d.slice(0,4)),month=Number(d.slice(5,7));
 const lastDay=new Date(Date.UTC(year,month,0)).getUTCDate();
 return Number(d.slice(8,10))===Math.min(originDay,lastDay);
}
export function budgetOccurrences(plan,start,end){
 const p=normalizeBudgetPlan(plan);
 if(!dateOK(start)||!dateOK(end)||end<start||day(end)-day(start)>370)throw Error('Invalid cash-flow range.');
 const events=[];
 for(let d=day(start);d<=day(end);d++){
  const date=iso(d);
  for(const r of p.schedules)if(occursOn(r,date))
   events.push({id:r.id,date,name:r.name,kind:r.kind,
    amountCents:r.kind==='income'?(p.paycheckAmounts[r.id+'|'+date]??r.amountCents):r.amountCents,
    status:r.occurrences[date]||'pending'});
 }
 return events.sort((a,b)=>a.date.localeCompare(b.date)||a.name.localeCompare(b.name));
}
// The balance is explicitly supplied by the user as of end-of-day on balanceAsOf.
// Only *future scheduled occurrences* are added; actual bank records are never
// included as a second change to this manually entered balance.
export function budgetForecast(plan,today,horizon=35){
 const p=normalizeBudgetPlan(plan);
 if(!dateOK(today)||!Number.isInteger(horizon)||horizon<1||horizon>180)throw Error('Invalid forecast date or window.');
 if(p.balanceCents===null)return{configured:false,events:[],days:[],minimumCents:null,endCents:null,pendingCount:0};
 const start=iso(day(p.balanceAsOf)+1);
 const end=iso(Math.max(day(today),day(p.balanceAsOf))+horizon);
 if(day(end)-day(start)>370)throw Error('The balance is too old. Refresh your manual available cash amount.');
 const events=budgetOccurrences(p,start,end);
 const byDate=new Map();
 for(const event of events){
  if(!byDate.has(event.date))byDate.set(event.date,[]);
  byDate.get(event.date).push(event);
 }
 const days=[];let balance=p.balanceCents,min=balance,pendingCount=0;
 for(let d=day(start);d<=day(end);d++){
  const date=iso(d),items=byDate.get(date)||[];
  for(const event of items){
   if(event.status!=='pending')continue;
   balance+=event.kind==='income'?event.amountCents:-event.amountCents;
   pendingCount++;
  }
  min=Math.min(min,balance);
  days.push({date,balanceCents:balance,events:items});
 }
 return{configured:true,asOf:p.balanceAsOf,openingCents:p.balanceCents,
  events,days,minimumCents:min,endCents:balance,pendingCount,shortfall:min<0,
  stale:p.balanceAsOf!==today};
}
export function budgetMonthSpending(plan,transactions,month){
 const p=normalizeBudgetPlan(plan);
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error('Invalid budget month.');
 const expenses=transactions.filter(tx=>tx.kind==='expense'&&sameMonth(tx.purchaseDate||tx.date,month));
 return p.categoryLimits.map(limit=>{
  const category=limit.category.toLocaleLowerCase();
  const actualCents=expenses.reduce((sum,tx)=>{
   if(Array.isArray(tx.items)&&tx.items.length){
    const itemTotal=tx.items.reduce((n,item)=>n+item.amountCents,0);
    const itemSpend=tx.items.filter(item=>item.category.toLocaleLowerCase()===category)
     .reduce((n,item)=>n+item.amountCents,0);
    const remainder=tx.amountCents-itemTotal;
    return sum+itemSpend+((tx.adjustmentCategory||'Uncategorized').toLocaleLowerCase()===category?remainder:0);
   }
   return sum+(String(tx.category||'').trim().toLocaleLowerCase()===category?tx.amountCents:0);
  },0);
  return{category:limit.category,limitCents:limit.amountCents,actualCents,
   remainingCents:limit.amountCents-actualCents,percent:100*actualCents/limit.amountCents};
 }).sort((a,b)=>b.percent-a.percent||a.category.localeCompare(b.category));
}
export function forecastPurchase(plan,today,horizon,purchaseCents){
 if(!money(purchaseCents))throw Error('Invalid planned purchase.');
 const f=budgetForecast(plan,today,horizon);
 if(!f.configured)return f;
 return{...f,minimumCents:f.minimumCents-purchaseCents,
  endCents:f.endCents-purchaseCents,shortfall:f.minimumCents-purchaseCents<0};
}
