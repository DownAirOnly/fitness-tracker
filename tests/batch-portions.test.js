import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData,normalizeData,encodeData} from '../data.js';
import {beginCooking,finishCooking} from '../cooking-model.js';
import {batchInventory,planBatchPortion} from '../batch-portion-model.js';
import {sectionPayloads,readSectionPayloads} from '../account-sections.js';
import {monthlyParts,readMonthlyParts} from '../account-monthly.js';
function setup(){
 const data=emptyData(),recipe={id:'fried-rice',name:'Egg Fried Rice',servings:4,instructions:'Cook rice.',ingredients:[
  {id:'rice',name:'Rice',calories:1000,protein:20,quantity:1},
  {id:'egg',name:'Eggs',calories:115,protein:19.1,quantity:1}
 ]};
 const cooking=beginCooking(recipe,'cook-1','2026-11-17T22:00:00Z');cooking.finishedGrams=840;
 const batch=finishCooking(cooking,'batch-1','2026-11-18T01:00:00Z');data.preparedBatches=[batch];
 return {data,batch};
}
test('finishing does not log food; explicit cross-date portions and grams consume leftovers',()=>{
 const {data,batch}=setup();assert.equal(data.foodEntries.length,0);
 const first=planBatchPortion(batch,[],{amount:1,date:'2026-11-18'});
 assert.equal(first.calories,1115/4);assert.equal(first.protein,39.1/4);
 data.foodEntries.push({id:'a',...first});
 const weighed=planBatchPortion(batch,data.foodEntries,{unit:'grams',amount:210,date:'2026-11-19',t:18});
 assert.equal(weighed.quantity,1);data.foodEntries.push({id:'b',...weighed});
 assert.equal(batchInventory(batch,data.foodEntries).remainingPortions,2);
 assert.equal(batchInventory(batch,data.foodEntries).remainingGrams,420);
 assert.throws(()=>planBatchPortion(batch,data.foodEntries,{amount:3,date:'2026-11-20'}),/Not enough/);
});
test('editing and deleting a food log restore batch remaining inventory',()=>{
 const {data,batch}=setup();
 data.foodEntries=[{id:'a',...planBatchPortion(batch,[],{amount:2,date:'2026-11-18'})}];
 const changed=planBatchPortion(batch,data.foodEntries,{amount:3,date:'2026-11-19',entryId:'a'});
 data.foodEntries[0]={id:'a',...changed};assert.equal(batchInventory(batch,data.foodEntries).remainingPortions,1);
 data.foodEntries=[];assert.equal(batchInventory(batch,data.foodEntries).remainingPortions,4);
});
test('weighed logging needs finished grams and date/amount validation',()=>{
 const {batch}=setup();delete batch.finishedGrams;
 assert.throws(()=>planBatchPortion(batch,[],{unit:'grams',amount:100,date:'2026-11-18'}),/no finished weight/);
 assert.throws(()=>planBatchPortion(batch,[],{amount:1,date:'2026-02-30'}),/valid date/);
 assert.throws(()=>planBatchPortion(batch,[],{amount:0,date:'2026-11-18'}),/positive/);
});
test('food log batch links persist through compact JSON and cloud snapshots',()=>{
 const {data,batch}=setup();
 const entry=planBatchPortion(batch,[],{unit:'grams',amount:315,date:'2026-11-20',t:22});
 data.foodEntries=[{id:'eaten',...entry}];
 const normalized=normalizeData(data),restored=normalizeData(encodeData(normalized));
 assert.deepEqual(restored.foodEntries,normalized.foodEntries);
 assert.deepEqual(readSectionPayloads(sectionPayloads(normalized)).foodEntries,normalized.foodEntries);
 const cloud=monthlyParts(normalized);
 assert.deepEqual(readMonthlyParts(cloud.parts,cloud.months).foodEntries,normalized.foodEntries);
 batch.recipe.ingredients[0].calories=3000;
 assert.equal(entry.calories,1115/4,'past food log calories are immutable');
 assert.equal(restored.foodEntries[0].batchGrams,315);
 assert.equal(restored.foodEntries[0].preparedBatchId,'batch-1');
});
