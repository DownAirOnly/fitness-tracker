/* Everyday v154.2 — observational progress intelligence.
   Read-only estimates; never adjust calorie or exercise targets.
   A day with food entries is treated as a complete logged day.
   Days without entries remain missing, never zero-calorie days. */
const dayMs=86400000;
function utcDate(date){
 if(typeof date!=='string'||!/^(\d{4})-(\d{2})-(\d{2})$/.test(date))return NaN;
 const n=Date.parse(date+'T12:00:00Z');
 return Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===date?n:NaN;
}
export function shiftInsightDate(date,offset){
 const n=utcDate(date);if(!Number.isFinite(n))return null;
 return new Date(n+offset*dayMs).toISOString().slice(0,10);
}
const span=(a,b)=>(utcDate(b)-utcDate(a))/dayMs;
const mean=arr=>arr.reduce((a,b)=>a+b,0)/arr.length;
const roundTo=(n,step)=>Math.round(n/step)*step;
const number=v=>typeof v==='number'?v:typeof v==='string'&&v.trim()?Number(v):NaN;
function weightRows(input,asOf){
 const byDate=new Map();
 for(const item of input||[]){
  const date=item?.date,value=number(item?.value);
  if(Number.isFinite(utcDate(date))&&date<=asOf&&Number.isFinite(value)&&value>0&&value<2000)
   byDate.set(date,{date,value});
 }
 return [...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
export function weightPace(weights,asOf,{days=28}={}){
 const start=shiftInsightDate(asOf,-days+1);
 if(!start||!Number.isInteger(days)||days<14)return null;
 const rows=weightRows(weights,asOf).filter(item=>item.date>=start);
 const edge=days===28?7:4;
 const first=rows.filter(item=>item.date<shiftInsightDate(start,edge));
 const last=rows.filter(item=>item.date>=shiftInsightDate(asOf,-edge+1));
 const minimum=days===28?3:2;
 if(first.length<minimum||last.length<minimum||rows.length<(days===28?8:5))
  return {ready:false,days,firstCount:first.length,lastCount:last.length,count:rows.length,
   minimumEdge:minimum,minimumOverall:days===28?8:5};
 const center=group=>mean(group.map(row=>utcDate(row.date)));
 const elapsed=(center(last)-center(first))/dayMs;
 if(elapsed<(days===28?16:7))return {ready:false,days,count:rows.length,firstCount:first.length,lastCount:last.length,
  minimumEdge:minimum,minimumOverall:days===28?8:5};
 const firstAverage=mean(first.map(x=>x.value)),lastAverage=mean(last.map(x=>x.value));
 return {ready:true,days,start,end:asOf,count:rows.length,
  firstCount:first.length,lastCount:last.length,firstAverage,lastAverage,
  latestAverage:lastAverage,lossPerWeek:(firstAverage-lastAverage)*7/elapsed,
  elapsedDays:elapsed};
}
function foodDays(entries,asOf,dayResetMinutes){
 const byDay=new Map();
 for(const row of entries||[]){
  let date=row?.date;
  if(!Number.isFinite(utcDate(date)))continue;
  const slot=number(row?.t);
  if(row?.t!==null&&row?.t!==undefined&&Number.isInteger(slot)&&slot>=0&&slot<48&&slot*30<dayResetMinutes)
   date=shiftInsightDate(date,-1);
  if(date>asOf)continue;
  const calories=number(row?.calories),quantity=number(row?.quantity);
  if(!Number.isFinite(calories)||calories<0||!Number.isFinite(quantity)||quantity<=0)continue;
  byDay.set(date,(byDay.get(date)||0)+calories*quantity);
 }
 return byDay;
}
export function energyExpenditureEstimate({weights=[],foodEntries=[],asOf,unit='lb',dayResetMinutes=360}={}){
 const end=shiftInsightDate(asOf,-1);
 if(!end||!['lb','kg'].includes(unit))return {ready:false,reason:'invalid-input'};
 const entries=foodDays(foodEntries,end,dayResetMinutes);
 let incomplete=null;
 // Prefer 28 days; allow an explicitly early, lower-confidence estimate
 // after about two weeks, rather than inferring missing food as zero.
 for(const {days,requiredDays} of [{days:28,requiredDays:24},{days:14,requiredDays:12}]){
  const start=shiftInsightDate(end,-days+1);
  const totals=[...entries].filter(([day])=>day>=start&&day<=end);
  const loggedDays=totals.length,pace=weightPace(weights,end,{days});
  const evidence={loggedDays,requiredDays,windowDays:days,weightCount:pace?.count||0,
   firstWeightCount:pace?.firstCount||0,lastWeightCount:pace?.lastCount||0,start,end};
  if(loggedDays<requiredDays||!pace?.ready){
   incomplete={ready:false,reason:loggedDays<requiredDays?'food':'weight',...evidence};continue;
  }
  const intake=mean(totals.map(([,calories])=>calories));
  const lossInLbPerWeek=pace.lossPerWeek*(unit==='kg'?2.2046226218:1);
  // Approximate retrospective conversion; not a metabolic simulation or a
  // prediction that the scale is recording only changes in body fat.
  const raw=intake+lossInLbPerWeek*3500/7;
  if(!Number.isFinite(raw)||raw<800||raw>7000)
   return {ready:false,reason:'implausible',...evidence,avgIntake:Math.round(intake)};
  return {ready:true,tdee:roundTo(raw,50),rawTdee:raw,avgIntake:Math.round(intake),
   coverage:loggedDays/days,quality:days===14?'early':loggedDays===28?'higher':'limited',
   lossPerWeek:pace.lossPerWeek,...evidence};
 }
 return incomplete||{ready:false,reason:'insufficient'};
}
export function progressIntelligence({weights=[],foodEntries=[],today,unit='lb',goalWeight=null,desiredWeeklyLoss=null,dayResetMinutes=360}={}){
 if(!Number.isFinite(utcDate(today))||!['lb','kg'].includes(unit))
  return {pace:null,tdee:{ready:false,reason:'invalid-input'},goal:{state:'unavailable'}};
 const current=weightRows(weights,today);
 const latest=current.at(-1)||null;
 let pace=weightPace(current,today,{days:28});
 if(!pace?.ready)pace=weightPace(current,today,{days:14});
 const recent=latest&&span(latest.date,today)<=7;
 if(!recent)pace=null;
 const tdee=energyExpenditureEstimate({weights,foodEntries,asOf:today,unit,dayResetMinutes});
 const goalNumber=number(goalWeight),desired=number(desiredWeeklyLoss);
 const goal={state:'unset'};
 if(Number.isFinite(goalNumber)&&goalNumber>0){
  goal.weight=goalNumber;
  if(!latest)goal.state='need-weight';
  else if(!pace?.ready){goal.state='need-trend';goal.remaining=Math.max(0,latest.value-goalNumber);}
  else {
   goal.remaining=Math.max(0,pace.latestAverage-goalNumber);
   goal.state=goal.remaining<=(unit==='kg'?0.05:0.1)?'reached':
    pace.lossPerWeek<=0.15*(unit==='kg'?1/2.2046226218:1)?'not-decreasing':'projecting';
   if(goal.state==='projecting'){
    const days=Math.ceil(goal.remaining/pace.lossPerWeek*7);
    if(days>0&&days<=730){goal.eta=shiftInsightDate(today,days);goal.weeks=days/7;}
    else goal.state='long-range';
   }
  }
 }
 const target=Number.isFinite(desired)&&desired>0&&pace?.ready?{
   rate:desired,difference:pace.lossPerWeek-desired,
   status:pace.lossPerWeek<desired*0.85?'below':pace.lossPerWeek>desired*1.15?'above':'on-pace'
 }:null;
 return {latest,pace:pace?.ready?pace:null,tdee,goal,target,unit};
}
