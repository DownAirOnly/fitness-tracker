import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeServing,portionFor} from '../food-portion-model.js';
import {emptyData,normalizeData,encodeData} from '../data.js';
import {exportSection,applySection,sectionPayloads,readSectionPayloads} from '../account-sections.js';
const food={id:'test-food',name:'Example ingredient',calories:120,protein:24,serving:{amount:100,unit:'g',text:'',state:'cooked'}};
test('reference servings, compatible units, targets and legacy foods agree',()=>{
 assert.deepEqual(portionFor(food,{value:250,unit:'g'}),{quantity:2.5,amount:250,unit:'g',calories:300,protein:60});
 assert.equal(portionFor(food,{value:.25,unit:'kg'}).calories,300);
 assert.equal(portionFor(food,{mode:'protein',value:60}).amount,250);
 assert.equal(portionFor(food,{mode:'calories',value:300}).protein,60);
 assert.equal(portionFor({...food,serving:undefined},{value:2}).calories,240);
 const perServing={...food,calories:60,protein:12,serving:{amount:1,unit:'item',grams:50}};
 assert.equal(portionFor(perServing,{value:250,unit:'g'}).calories,300);
 assert.equal(portionFor({...food,serving:{amount:250,unit:'ml'}},{value:.5,unit:'l'}).quantity,2);
});
test('missing nutrition, impossible targets and incompatible units never produce fabricated totals',()=>{
 for(const value of [0,-1,NaN,Infinity])assert.throws(()=>portionFor(food,{value}));
 assert.throws(()=>portionFor({...food,protein:null},{value:1}),/missing/);
 assert.throws(()=>portionFor({...food,protein:0},{mode:'protein',value:20}),/zero/);
 assert.throws(()=>portionFor(food,{value:100,unit:'ml'}),/compatible/);
 assert.throws(()=>normalizeServing({amount:100,unit:'g',grams:50}),/conflicts/);
 assert.throws(()=>normalizeServing({amount:0,unit:'g'}));
});
test('serving metadata survives compact, section and cloud payloads without rewriting history',()=>{
 const data=emptyData();data.foods=[structuredClone(food)];data.foodEntries=[{id:'entry',name:food.name,calories:120,protein:24,quantity:2,date:'2026-11-11'}];
 for(const result of [normalizeData(encodeData(data)),applySection(emptyData(),exportSection(data,'nutrition')),readSectionPayloads(sectionPayloads(data))]){
  assert.deepEqual(result.foods[0].serving,food.serving);assert.deepEqual(result.foodEntries,data.foodEntries);
 }
 data.foods[0].calories=200;data.foods[0].serving.amount=200;
 const restored=normalizeData(encodeData(data));assert.equal(restored.foodEntries[0].calories,120);assert.equal(restored.foods[0].serving.amount,200);
 const bad=encodeData(data);bad.foods[0].serving.amount=-10;assert.throws(()=>normalizeData(bad));
});
