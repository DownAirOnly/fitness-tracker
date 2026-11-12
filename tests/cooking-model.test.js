import test from 'node:test';
import assert from 'node:assert/strict';
import {ingredientSnapshot,normalizeRecipes,recipeTotals} from '../cooking-model.js';
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
