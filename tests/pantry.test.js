import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePantry,pantryCoverage,deductPantryForBatch,exportPortablePantry,importPortablePantry} from '../pantry-model.js';
import {normalizeRecipes,normalizePreparedBatches,beginCooking,finishCooking} from '../cooking-model.js';
import {emptyData,normalizeData,encodeData} from '../data.js';
import {sectionPayloads,readSectionPayloads,exportSection,applySection} from '../account-sections.js';
import {monthlyParts,readMonthlyParts} from '../account-monthly.js';
import {planDeviceMigration} from '../cloud-model.js';

const egg={id:'test-egg',name:'Large egg',calories:70,protein:6,serving:{text:'1 egg'}};
const butter={id:'test-butter',name:'Butter',calories:100,protein:0,serving:{text:'1 tbsp'}};
const recipe=normalizeRecipes([{
 id:'recipe-test',name:'Egg dish',servings:2,creator:'Recipe author',showCreator:false,
 instructions:'Cook.',ingredients:[
 {id:'egg',name:'Large egg',calories:70,protein:6,quantity:2,sourceFoodId:egg.id},
 {id:'egg-again',name:'Large egg',calories:70,protein:6,quantity:1,sourceFoodId:egg.id},
 {id:'butter',name:'Butter',calories:100,protein:0,quantity:0.5,sourceFoodId:butter.id},
 {id:'unlinked',name:'Salt',calories:0,protein:0,quantity:1}
]}])[0];
const pantry=()=>normalizePantry([
 {id:'stock-eggs',name:'Large egg',sourceFoodId:egg.id,quantity:6,servingLabel:'1 egg'},
 {id:'stock-butter',name:'Butter',sourceFoodId:butter.id,quantity:1,servingLabel:'1 tbsp'},
 {id:'stock-salt',name:'Salt',quantity:20}
]);

test('pantry accepts empty stock and rejects malformed or duplicate linked entries',()=>{
 assert.equal(normalizePantry([{id:'stock',name:'Rice',quantity:0}])[0].quantity,0);
 assert.throws(()=>normalizePantry([{id:'x',name:'Rice',quantity:-1}]),/between 0/);
 assert.throws(()=>normalizePantry([{id:'x',name:'Rice',quantity:NaN}]),/between 0/);
 assert.throws(()=>normalizePantry([{id:'x',name:'Rice',quantity:1,sourceFoodId:'food'},
  {id:'y',name:'Rice',quantity:2,sourceFoodId:'food'}]),/already in the pantry/);
});

test('opt-in Pantry deduction sums repeated ingredients and leaves unlinked items alone',()=>{
 const planned=pantryCoverage(recipe,pantry());
 assert.equal(planned.matched,2);
 assert.equal(planned.rows.find(x=>x.sourceFoodId===egg.id).needed,3);
 assert.deepEqual(planned.untracked,['Salt']);
 assert.deepEqual(planned.shortfalls,[]);
 const current=pantry(),result=deductPantryForBatch(recipe,current);
 assert.equal(current[0].quantity,6,'source remains unchanged');
 assert.equal(result.pantry[0].quantity,3);
 assert.equal(result.pantry[1].quantity,0.5);
 assert.equal(result.pantry[2].quantity,20,'unlinked stock is not consumed');
 assert.equal(result.deductions.length,2);
 assert.throws(()=>deductPantryForBatch(recipe,[{...current[0],quantity:2},current[1],current[2]]),/Not enough/);
 assert.throws(()=>deductPantryForBatch(recipe,[current[2]]),/No linked ingredients/);
});

test('recipe creator credit, hidden display choice, and batch deduction history survive normalization',()=>{
 assert.equal(recipe.creator,'Recipe author');
 assert.equal(recipe.showCreator,false);
 const cooking=beginCooking(recipe,'session-test','2026-11-18T10:00:00Z');
 const batch=finishCooking(cooking,'batch-test','2026-11-18T11:00:00Z');
 batch.pantryDeductions=deductPantryForBatch(recipe,pantry()).deductions;
 const normalized=normalizePreparedBatches([batch])[0];
 assert.equal(normalized.recipe.creator,'Recipe author');
 assert.equal(normalized.recipe.showCreator,false);
 assert.equal(normalized.pantryDeductions.length,2);
 assert.equal(normalizePreparedBatches([normalized])[0].pantryDeductions[0].quantity,3);
 assert.equal(normalizeRecipes([{...recipe,creator:undefined}])[0].creator,undefined);
 assert.throws(()=>normalizeRecipes([{...recipe,creator:'x'.repeat(81)}]),/creator/);
});

test('pantry is round-tripped through compact backup, Nutrition section and cloud catalog',()=>{
 const data=emptyData();data.pantry=pantry();data.recipes=[recipe];
 const normalized=normalizeData(data),compact=normalizeData(encodeData(normalized));
 assert.deepEqual(compact.pantry,normalized.pantry);
 assert.deepEqual(compact.recipes,normalized.recipes);
 assert.deepEqual(readSectionPayloads(sectionPayloads(normalized)).pantry,normalized.pantry);
 assert.deepEqual(applySection(emptyData(),exportSection(normalized,'nutrition')).pantry,normalized.pantry);
 const parts=monthlyParts(normalized);
 assert.deepEqual(readMonthlyParts(parts.parts,parts.months).pantry,normalized.pantry);
 const legacy=normalizeData({...normalized,pantry:undefined});
 assert.deepEqual(legacy.pantry,[]);
 const legacyCatalog={...parts.parts,catalog:JSON.stringify({foods:[],recipes:[],activeCooking:null})};
 assert.deepEqual(readMonthlyParts(legacyCatalog,parts.months).pantry,[]);
});

test('portable Pantry sharing excludes IDs and re-links only exact compatible serving definitions',()=>{
 const source=exportPortablePantry(pantry());
 assert.equal(source.format,'everyday-pantry-v1');
 assert.equal(JSON.stringify(source).includes('sourceFoodId'),false);
 assert.equal(JSON.stringify(source).includes('stock-eggs'),false);
 let n=0;
 const linked=importPortablePantry(source,[egg,butter],()=>String(++n));
 assert.deepEqual(linked.map(x=>x.sourceFoodId),[egg.id,butter.id,undefined]);
 const mismatched=importPortablePantry(source,[{...egg,serving:{text:'100 g'}},butter],()=>String(++n));
 assert.equal(mismatched[0].sourceFoodId,undefined);
 assert.throws(()=>importPortablePantry({format:'everyday-pantry-v1',items:[source.items[0],source.items[0]]},[egg],()=>String(++n)),/duplicate item names/);
});

test('device migration brings new Pantry stock without adding stale quantities to tracked cloud items',()=>{
 const cloud=emptyData(),device=emptyData();
 cloud.pantry=[{id:'cloud-eggs',name:'Large egg',sourceFoodId:egg.id,quantity:2}];
 device.pantry=[{id:'device-eggs',name:'Large egg',sourceFoodId:egg.id,quantity:9},
  {id:'device-butter',name:'Butter',sourceFoodId:butter.id,quantity:4}];
 const plan=planDeviceMigration(cloud,device);
 assert.equal(plan.candidate.pantry.length,2);
 assert.equal(plan.candidate.pantry.find(x=>x.name==='Large egg').quantity,2);
 assert.equal(plan.candidate.pantry.find(x=>x.name==='Butter').quantity,4);
 assert.equal(plan.summary.added.pantry,1);
 assert.equal(plan.summary.skipped.pantry,1);
});
