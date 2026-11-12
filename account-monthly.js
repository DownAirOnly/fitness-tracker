// v112 — Firestore v3 account layout. Dated history is partitioned by calendar
// month; global definitions and preferences are in small account-scoped files.
// This module never mutates the user's normalized notebook.
import {emptyData,normalizeData,validDate} from './data.js?v=142';
export const MONTHLY_KEYS=['foodEntries','weights','bodyFat','lifts','transactions','workoutHistory'];
export const STATIC_PARTS=['settings','catalog','routines','financeConfig'];
export const MONTH_FORMAT='everyday-month-v1';
const monthOK=m=>/^\d{4}-(0[1-9]|1[0-2])$/.test(m);
const orderedKeys=()=>Object.fromEntries(MONTHLY_KEYS.map(key=>[key,[]]));
const recordMonth=(record,key)=>{
 // Use the actual purchase month for receipts; delayed bank posting remains
 // separately preserved on the transaction and must not move the purchase.
 if(key==='transactions'&&validDate(record?.purchaseDate))return record.purchaseDate.slice(0,7);
 const date=validDate(record?.date)?record.date:
  typeof record?.startedAt==='string'&&validDate(record.startedAt.slice(0,10))?record.startedAt.slice(0,10):'';
 return date?date.slice(0,7):null;
};
export function monthlyParts(input){
 const data=normalizeData(input),buckets=new Map(),undated=[];
 for(const key of MONTHLY_KEYS){
  for(const record of data[key]||[]){
   const month=recordMonth(record,key);
   if(!month){
    if(key==='workoutHistory'){undated.push(structuredClone(record));continue;}
    throw Error('A dated '+key+' record is missing a valid date.');
   }
   if(!buckets.has(month))buckets.set(month,orderedKeys());
   buckets.get(month)[key].push(structuredClone(record));
  }
 }
 const parts={
  settings:JSON.stringify({settings:data.settings,preferences:data.preferences,promptDate:data.promptDate}),
  catalog:JSON.stringify({foods:data.foods,recipes:data.recipes}),
  routines:JSON.stringify({exerciseDefinitions:data.exerciseDefinitions,
   workoutTemplates:data.workoutTemplates,activeWorkout:data.activeWorkout,
   workoutSchedule:data.workoutSchedule,undatedWorkoutHistory:undated}),
  financeConfig:JSON.stringify({classificationRules:data.classificationRules,budgetPlan:data.budgetPlan})
 };
 const months=[...buckets.keys()].sort();
 for(const month of months){
  parts['month-'+month]=JSON.stringify({format:MONTH_FORMAT,month,records:buckets.get(month)});
 }
 return{parts,months};
}
export function readMonthlyParts(parts,months){
 if(!Array.isArray(months)||months.length>400||months.some(m=>!monthOK(m))||
  new Set(months).size!==months.length||months.join('|')!==[...months].sort().join('|'))
  throw Error('Cloud month index is invalid.');
 for(const name of STATIC_PARTS)if(typeof parts?.[name]!=='string')throw Error('Cloud account file '+name+' is missing.');
 const settings=JSON.parse(parts.settings),catalog=JSON.parse(parts.catalog),
  routines=JSON.parse(parts.routines),finance=JSON.parse(parts.financeConfig);
 const raw=emptyData();
 if(!settings||!settings.settings||!catalog||!routines||!finance)throw Error('Cloud settings or catalog is malformed.');
 Object.assign(raw,{
  settings:settings.settings,preferences:settings.preferences,
  promptDate:settings.promptDate||'',foods:catalog.foods,recipes:catalog.recipes??[],
  exerciseDefinitions:routines.exerciseDefinitions,workoutTemplates:routines.workoutTemplates,
  activeWorkout:routines.activeWorkout,workoutSchedule:routines.workoutSchedule,
  classificationRules:finance.classificationRules,budgetPlan:finance.budgetPlan
 });
 const seenIds=Object.fromEntries(MONTHLY_KEYS.map(key=>[key,new Set()]));
 for(const month of months){
  const content=parts['month-'+month];
  if(typeof content!=='string')throw Error('Cloud month '+month+' is missing.');
  const block=JSON.parse(content);
  if(block?.format!==MONTH_FORMAT||block.month!==month||!block.records||typeof block.records!=='object')
   throw Error('Cloud month '+month+' is malformed.');
  for(const key of MONTHLY_KEYS){
   const entries=block.records[key];
   if(!Array.isArray(entries))throw Error('Month '+month+' is missing '+key+'.');
   for(const record of entries){
    if(recordMonth(record,key)!==month||typeof record?.id!=='string'||seenIds[key].has(record.id))
     throw Error('Month '+month+' has an invalid or duplicate '+key+' record.');
    seenIds[key].add(record.id);
    raw[key].push(record);
   }
  }
 }
 if(!Array.isArray(routines.undatedWorkoutHistory||[]))throw Error('Invalid undated workout history.');
 raw.workoutHistory.push(...(routines.undatedWorkoutHistory||[]));
 return normalizeData(raw);
}
export function availableMonths(data){
 return monthlyParts(data).months;
}
export function exportMonth(input,month){
 if(!monthOK(month))throw Error('Choose a valid month.');
 const content=monthlyParts(input).parts['month-'+month];
 return content?JSON.parse(content):{format:MONTH_FORMAT,month,records:orderedKeys()};
}
export function importMonth(current,backup){
 if(backup?.format!==MONTH_FORMAT||!monthOK(backup.month)||!backup.records||
  typeof backup.records!=='object')throw Error('Not an Everyday monthly backup.');
 const data=normalizeData(current),month=backup.month;
 for(const key of MONTHLY_KEYS){
  if(!Array.isArray(backup.records[key]))throw Error('Invalid monthly '+key+' records.');
  data[key]=data[key].filter(item=>recordMonth(item,key)!==month)
   .concat(structuredClone(backup.records[key]));
 }
 // Validation also catches a wrong-month entry and any broken cross-record ID.
 const checked=normalizeData(data),roundTrip=exportMonth(checked,month);
 if(JSON.stringify(roundTrip)!==JSON.stringify(backup))
  throw Error('Monthly file does not match the selected month.');
 return checked;
}
