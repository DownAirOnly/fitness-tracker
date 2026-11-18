// The prepared-batch inventory is derived from actual eating logs, not a mutable counter.
import {recipeTotals} from './cooking-model.js?v=151';
const round=n=>Math.round((n+Number.EPSILON)*1e9)/1e9;
const dayOK=date=>typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&
 !Number.isNaN(Date.parse(date+'T00:00:00Z'))&&new Date(date+'T00:00:00Z').toISOString().slice(0,10)===date;
const positive=(n,label)=>{if(!Number.isFinite(n)||n<=0||n>1e6)throw Error('Enter a valid positive '+label+'.');return n;};
export function batchInventory(batch,foodEntries=[],excludeEntryId=null){
 if(!batch?.id||!batch?.recipe)throw Error('Prepared batch not found.');
 const totalPortions=positive(batch.recipe.servings,'batch size');
 const usedPortions=(foodEntries||[]).reduce((sum,e)=>e?.preparedBatchId===batch.id&&e.id!==excludeEntryId?sum+Number(e.quantity||0):sum,0);
 const remainingPortions=Math.max(0,round(totalPortions-usedPortions));
 return {totalPortions,consumedPortions:round(usedPortions),remainingPortions,
  remainingGrams:batch.finishedGrams==null?null:round(batch.finishedGrams*remainingPortions/totalPortions),
  overLogged:usedPortions>totalPortions+1e-7};
}
export function planBatchPortion(batch,foodEntries,{unit='portions',amount,date,t,entryId=null}){
 if(!dayOK(date))throw Error('Choose a valid date.');
 if(!['portions','grams'].includes(unit))throw Error('Choose portions or weighed grams.');
 const numeric=positive(Number(amount),unit==='grams'?'gram amount':'portion amount');
 if(unit==='grams'&&!batch.finishedGrams)throw Error('This batch has no finished weight. Log portions instead.');
 const quantity=round(unit==='grams'?numeric*batch.recipe.servings/batch.finishedGrams:numeric);
 if(quantity<=0)throw Error('This amount is too small to log accurately.');
 const inventory=batchInventory(batch,foodEntries,entryId);
 if(quantity>inventory.remainingPortions+1e-7)throw Error('Not enough left in this batch. Check already logged portions.');
 if(t!==''&&t!=null&&(!Number.isInteger(Number(t))||Number(t)<0||Number(t)>47))throw Error('Choose a valid logging time.');
 const nutrition=recipeTotals(batch.recipe);
 const result={date,name:batch.recipe.name,calories:nutrition.perPortionCalories,
  protein:nutrition.perPortionProtein,quantity,preparedBatchId:batch.id};
 if(unit==='grams')result.batchGrams=numeric;
 if(t!==''&&t!=null)result.t=Number(t);
 return result;
}
