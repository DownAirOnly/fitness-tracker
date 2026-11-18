import test from 'node:test';
import assert from 'node:assert/strict';
import {ingredientSnapshot,normalizeRecipes,recipeTotals,beginCooking,finishCooking,normalizeCookingSession,normalizePreparedBatches,ingredientCategory,ingredientLibrary,resolveRecipeIngredients,cookingSteps,suggestRecipeIngredientMatches,linkSuggestedRecipeIngredients} from '../cooking-model.js';
import {COMMON_INGREDIENTS,commonIngredientById,findCommonIngredient,commonIngredientChoices} from '../common-ingredient-catalog.js';
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


test('ingredient categories and linked nutrition have one current source of truth',()=>{
 const butter={id:'butter',name:'Butter (1 tablespoon)',calories:100,protein:0.1,tags:['ingredient','ingredient-fats']};
 const rice={id:'rice',name:'Rice (1 cup)',calories:205,protein:4.3,tags:['ingredient','ingredient-grains']};
 const foods=[rice,butter,{id:'snack',name:'Snack',calories:10,protein:2,tags:[]}];
 assert.deepEqual(ingredientLibrary(foods).map(f=>f.id),['butter','rice']);
 assert.equal(ingredientCategory(butter),'fats');
 const recipe=normalizeRecipes([{id:'dish',name:'Test rice',servings:2,instructions:'Cook.',
   ingredients:[ingredientSnapshot(butter,'i1',2),ingredientSnapshot(rice,'i2',1)]}])[0];
 const before=beginCooking(resolveRecipeIngredients(recipe,foods),'started');
 const cooked=finishCooking(before,'batch');
 const revised=foods.map(f=>f.id==='butter'?{...f,calories:110,protein:0.2}:f);
 const linked=resolveRecipeIngredients(recipe,revised);
 assert.equal(linked.ingredients[0].calories,110,'a recipe reads updated Ingredient Library nutrition');
 assert.equal(linked.ingredients[0].quantity,2,'serving amount remains recipe-specific');
 assert.equal(recipe.ingredients[0].calories,100,'original portable ingredient snapshot is unchanged');
 assert.equal(cooked.recipe.ingredients[0].calories,100,'prepared batch keeps historical nutrition');
});

test('numbered and line-separated cooking instructions generate a step checklist',()=>{
 assert.deepEqual(cookingSteps('1. Cook rice.\n2. Add eggs.\n3. Stir and serve.'),['Cook rice.','Add eggs.','Stir and serve.']);
 assert.deepEqual(cookingSteps('Heat oil. Add rice. Stir well.'),['Heat oil.','Add rice.','Stir well.']);
 assert.deepEqual(cookingSteps(''),[]);
});

test('completed cooking steps survive local and account/cloud round trips',()=>{
 const data=emptyData();data.recipes=[sample()];
 data.activeCooking=beginCooking(data.recipes[0],'step-session','2026-11-18T03:00:00.000Z');
 data.activeCooking.completedSteps=[2,0,2];
 const normalized=normalizeData(data);
 assert.deepEqual(normalized.activeCooking.completedSteps,[0,2]);
 assert.deepEqual(normalizeData(encodeData(normalized)).activeCooking.completedSteps,[0,2]);
 assert.deepEqual(readSectionPayloads(sectionPayloads(normalized)).activeCooking.completedSteps,[0,2]);
 const {parts,months}=monthlyParts(normalized);
 assert.deepEqual(readMonthlyParts(parts,months).activeCooking.completedSteps,[0,2]);
 assert.throws(()=>normalizeCookingSession({...normalized.activeCooking,completedSteps:[-1]}),/Invalid completed/);
});


test('offline common ingredient catalog has stable distinct references, explicit serving, and fried rice entries',()=>{
 assert.equal(COMMON_INGREDIENTS.length,102);
 assert.equal(new Set(COMMON_INGREDIENTS.map(f=>f.id)).size,102);
 for(const food of COMMON_INGREDIENTS){
  assert.ok(food.id.startsWith('builtin:'));
  assert.ok(food.serving?.text);
  assert.ok(Number.isFinite(food.calories)&&food.calories>=0);
  assert.ok(Number.isFinite(food.protein)&&food.protein>=0);
 }
 for(const name of [
  'Cooked white rice (1 cup)','Large egg (1 egg)','Frozen peas and carrots (1 cup)','Green onion (1 stalk)',
  'Vegetable oil (1 tbsp)','Sesame oil (1 tsp)','Soy sauce (1 tbsp)','Garlic (1 clove)'
 ])assert.ok(findCommonIngredient(name),name+' is native to the app');
 assert.equal(findCommonIngredient('butter (1 tbsp)').tags[1],'ingredient-fats');
 assert.equal(commonIngredientById('builtin:missing'),null);
});

test('previously imported Egg Fried Rice can be updated in place with eight safe library links',()=>{
 const rows=[
  ['Cooked white rice (1 cup)',205,4.3,3],
  ['Large egg (1 egg)',72,6.3,3],
  ['Frozen peas and carrots (1 cup)',80,4,1],
  ['Green onion (1 stalk)',5,0.3,3],
  ['Vegetable oil (1 tbsp)',120,0,1],
  ['Sesame oil (1 tsp)',40,0,1],
  ['Soy sauce (1 tbsp)',10,1,2],
  ['Garlic (1 clove)',4.5,0.2,2]
 ];
 const old=normalizeRecipes([{id:'egg-fried-rice-old',name:'Egg Fried Rice',servings:4,
  instructions:'Cook rice. Scramble eggs. Toss.',ingredients:rows.map(([name,calories,protein,quantity],i)=>({id:'item-'+i,name,calories,protein,quantity}))}])[0];
 assert.equal(recipeTotals(old).calories,1115);
 assert.equal(Math.round(recipeTotals(old).protein*10)/10,39.1);
 const oldJson=JSON.stringify(old);
 const proposals=suggestRecipeIngredientMatches(old,[]);
 assert.equal(proposals.length,8);
 const result=linkSuggestedRecipeIngredients(old,[]);
 assert.equal(result.recipe.id,old.id,'matching updates existing recipe identity');
 assert.equal(result.recipe.ingredients.length,8);
 assert.ok(result.recipe.ingredients.every(i=>i.sourceFoodId.startsWith('builtin:')));
 assert.equal(recipeTotals(resolveRecipeIngredients(result.recipe,[])).calories,1115);
 assert.equal(JSON.stringify(old),oldJson,'preview/matching does not mutate original');
 assert.equal(suggestRecipeIngredientMatches(result.recipe,[]).length,0,'second matching is idempotent');
 const notebook=emptyData();
 notebook.recipes=[result.recipe];notebook.preparedBatches=[
  finishCooking(beginCooking(old,'old-session','2026-11-17T20:00:00.000Z'),'old-batch','2026-11-17T21:00:00.000Z')
 ];
 const restored=normalizeData(encodeData(notebook));
 assert.deepEqual(restored.recipes[0],result.recipe,'linked IDs survive backup');
 assert.deepEqual(restored.preparedBatches[0].recipe,old,'older prepared batch remains frozen');
 assert.equal(restored.foodEntries.length,0,'matching never logs food');
});

test('local saved ingredient overrides common exact-name suggestion without copying defaults into account',()=>{
 const recipe=normalizeRecipes([{id:'r',name:'Test',servings:2,instructions:'Cook.',
  ingredients:[{id:'a',name:'Cooked white rice (1 cup)',calories:205,protein:4.3,quantity:2}]}])[0];
 const local={id:'personal-rice',name:'Cooked white rice (1 cup)',calories:220,protein:5,
  tags:['ingredient','ingredient-grains']};
 assert.equal(suggestRecipeIngredientMatches(recipe,[local])[0].targetId,'personal-rice');
 const linked=linkSuggestedRecipeIngredients(recipe,[local]).recipe;
 assert.equal(linked.ingredients[0].calories,220);
 assert.equal(resolveRecipeIngredients(linked,[local]).ingredients[0].calories,220);
 assert.equal(commonIngredientChoices([local]).some(x=>x.name===local.name),false);
 assert.equal(findCommonIngredient('rice product with no specified preparation'),null,
  'unknown foods are never fuzzily matched');
});
