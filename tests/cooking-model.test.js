import test from 'node:test';
import assert from 'node:assert/strict';
import {ingredientSnapshot,normalizeRecipes,recipeTotals,beginCooking,finishCooking,normalizeCookingSession,normalizePreparedBatches} from '../cooking-model.js';
import {emptyData,encodeData,normalizeData} from '../data.js';
import {sectionPayloads,readSectionPayloads,exportSection,applySection} from '../account-sections.js';
import {monthlyParts,readMonthlyParts} from '../account-monthly.js';
import {planDeviceMigration} from '../cloud-model.js';

const sample=()=>{
 const rice={id:'rice',name:'Rice',calories:200,protein:4,serving:{amount:100,unit:'g',state:'cooked',text:'weighed'}};
 const ingredient=ingredientSnapshot(rice,'ingredient-1',1.5);
 rice.calories=900;
 return normalizeRecipes([{id:'recipe-1',name:'Fried rice',servings:3,instructions:'Cook together.',ingredients:[
  ingredient,{id:'egg',name:'Egg',calories:70,protein:6,quantity:2}
 ]}])[0];
};

test('recipe ingredient snapshots and per-portion nutrition remain stable',()=>{
 const recipe=sample();
 assert.deepEqual(recipeTotals(recipe),{calories:440,protein:18,perPortionCalories:440/3,perPortionProtein:6});
 assert.equal(recipe.ingredients[0].calories,200);
 assert.equal(recipe.ingredients[0].serving.state,'cooked');
});

test('invalid quantities, nutrition, and duplicates reject before save',()=>{
 const valid=sample();
 assert.throws(()=>normalizeRecipes([valid,valid]),/Duplicate recipe/);
 assert.throws(()=>normalizeRecipes([{...valid,servings:0}]),/positive number/);
 assert.throws(()=>normalizeRecipes([{...valid,ingredients:[{id:'bad',name:'Food',quantity:1,calories:NaN,protein:2}]}]),/valid calories/);
});

test('recipe retains snapshots through compact JSON and account section/cloud catalog',()=>{
 const data=emptyData();data.recipes=[sample()];
 const decoded=normalizeData(encodeData(data));
 assert.deepEqual(decoded.recipes,data.recipes);
 assert.deepEqual(readSectionPayloads(sectionPayloads(data)).recipes,data.recipes);
 assert.deepEqual(applySection(emptyData(),exportSection(data,'nutrition')).recipes,data.recipes);
 const {parts,months}=monthlyParts(data);
 assert.deepEqual(readMonthlyParts(parts,months).recipes,data.recipes);
});

test('older data without recipes stays valid and device migration includes recipe records',()=>{
 assert.deepEqual(normalizeData({...emptyData(),recipes:undefined}).recipes,[]);
 const device=emptyData();device.recipes=[sample()];
 const plan=planDeviceMigration(emptyData(),device);
 assert.equal(plan.candidate.recipes.length,1);
 assert.equal(plan.summary.added.recipes,1);
});


test('cooking edits are independent of saved recipes and finishing does not log food',()=>{
 const data=emptyData();data.recipes=[sample()];
 data.activeCooking=beginCooking(data.recipes[0],'session-1','2026-11-17T22:00:00.000Z');
 data.activeCooking.recipe.ingredients[0].quantity=2.5;
 data.activeCooking.recipe.servings=4;
 data.activeCooking.finishedGrams=680;
 assert.equal(data.recipes[0].ingredients[0].quantity,1.5,'the saved recipe stays unchanged');
 const batch=finishCooking(data.activeCooking,'batch-1','2026-11-17T23:00:00.000Z');
 data.preparedBatches=[batch];data.activeCooking=null;
 assert.equal(recipeTotals(batch.recipe).calories,640);
 assert.equal(recipeTotals(batch.recipe).perPortionCalories,160);
 assert.equal(batch.finishedGrams,680);
 assert.equal(data.foodEntries.length,0,'finishing never logs food');
 assert.deepEqual(normalizePreparedBatches(data.preparedBatches),data.preparedBatches);
});

test('prepared batches and the active session round-trip through every backup and cloud section',()=>{
 const data=emptyData();data.recipes=[sample()];
 data.preparedBatches=[finishCooking(beginCooking(data.recipes[0],'session-old','2026-11-15T10:00:00.000Z'),'batch-old','2026-11-15T12:00:00.000Z')];
 data.activeCooking=beginCooking(data.recipes[0],'session-new','2026-11-17T18:00:00.000Z');
 const norm=normalizeData(data),compact=normalizeData(encodeData(norm));
 assert.deepEqual(compact.activeCooking,norm.activeCooking);
 assert.deepEqual(compact.preparedBatches,norm.preparedBatches);
 const fromSections=readSectionPayloads(sectionPayloads(norm));
 assert.deepEqual(fromSections.activeCooking,norm.activeCooking);
 assert.deepEqual(fromSections.preparedBatches,norm.preparedBatches);
 const parts=monthlyParts(norm),cloud=readMonthlyParts(parts.parts,parts.months);
 assert.deepEqual(cloud.activeCooking,norm.activeCooking);
 assert.deepEqual(cloud.preparedBatches,norm.preparedBatches);
 const olderParts=structuredClone(parts.parts);
 const month='month-2026-11',legacy=JSON.parse(olderParts[month]);
 delete legacy.records.preparedBatches;olderParts[month]=JSON.stringify(legacy);
 assert.deepEqual(readMonthlyParts(olderParts,parts.months).preparedBatches,[],
  'older cloud months lacking prepared batches still open');
});

test('invalid cooking and conflicting unfinished sessions fail safely',()=>{
 const data=emptyData();data.recipes=[sample()];
 const active=beginCooking(data.recipes[0],'session-1');
 assert.throws(()=>normalizeCookingSession({...active,finishedGrams:0}),/Finished weight/);
 assert.throws(()=>normalizeCookingSession({...active,recipe:{...active.recipe,servings:0}}),/positive number/);
 assert.throws(()=>normalizePreparedBatches([finishCooking(active,'batch'),finishCooking(active,'other')]),/Duplicate prepared batch/);
 const finished=finishCooking(active,'batch');
 assert.throws(()=>normalizeData({...data,activeCooking:active,preparedBatches:[finished]}),/already been finished/);
 const cloud=emptyData();cloud.activeCooking=active;
 const device=emptyData();device.activeCooking=beginCooking(data.recipes[0],'session-2');
 assert.throws(()=>planDeviceMigration(cloud,device),/different active cooking sessions/);
});

test('legacy nutrition section and backups without cooking fields remain compatible',()=>{
 const data=emptyData();data.recipes=[sample()];
 const legacy=exportSection(data,'nutrition');delete legacy.data.activeCooking;delete legacy.data.preparedBatches;
 const restored=applySection(emptyData(),legacy);
 assert.equal(restored.activeCooking,null);
 assert.deepEqual(restored.preparedBatches,[]);
 const old=structuredClone(data);delete old.activeCooking;delete old.preparedBatches;
 assert.deepEqual(normalizeData(encodeData(old)).preparedBatches,[]);
});
