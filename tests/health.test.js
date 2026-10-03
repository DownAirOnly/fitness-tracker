import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData,normalizeData} from '../data.js';
import {planHealthWeight,shortcutURL} from '../health-model.js';
const sample={value:188.3,unit:'lb',date:'2026-09-25',recordedAt:'2026-09-25T00:00:00-04:00'};
test('original local date, unrelated data, source and backup roundtrip',()=>{
 const original=emptyData();original.foods.push({id:'f',name:'Meal',calories:100,protein:10});
 const plan=planHealthWeight(original,sample);
 assert.equal(original.weights.length,0);assert.deepEqual(plan.candidate.foods,original.foods);
 assert.equal(plan.candidate.weights[0].date,'2026-09-25');assert.equal(plan.candidate.weights[0].value,188.3);
 assert.deepEqual(normalizeData(plan.candidate).weights,plan.candidate.weights);
});
test('repeat, older samples, and deleting a handled reading do not reimport',()=>{
 for(const current of [emptyData(),planHealthWeight(emptyData(),sample).candidate]){
  assert.equal(planHealthWeight(current,sample,sample.recordedAt).changed,false);
  assert.equal(planHealthWeight(current,{...sample,recordedAt:'2026-09-24T23:00:00-04:00'},sample.recordedAt).changed,false);
 }
});
test('manual weight kept; newer same-day synced sample replaces only synced weight',()=>{
 const current=emptyData();current.weights=[{id:'manual',date:sample.date,value:180}];
 assert.equal(planHealthWeight(current,sample).changed,false);assert.equal(current.weights[0].value,180);
 const synced=planHealthWeight(emptyData(),sample).candidate;
 const newer=planHealthWeight(synced,{...sample,value:188,recordedAt:'2026-09-25T08:00:00-04:00'},sample.recordedAt);
 assert.equal(newer.candidate.weights.length,1);assert.equal(newer.candidate.weights[0].value,188);
});
test('unit conversion and invalid payload rejection',()=>{
 const kg=emptyData();kg.settings.unit='kg';assert.equal(planHealthWeight(kg,sample).candidate.weights[0].value,85.4);
 for(const override of [{date:'2026-02-30'},{recordedAt:'bad'},{recordedAt:'2026-09-25'},{value:NaN},{value:0},{value:1501},{unit:'stone'}])assert.throws(()=>planHealthWeight(kg,{...sample,...override}));
 assert.throws(()=>shortcutURL('project','short'));assert.match(shortcutURL('project','a'.repeat(64)),/currentDocument.exists=true/);
});


test('Apple Health body fat is independent from weight and normalizes fractional percentages',()=>{
 const bodySample={bodyFatPercent:0.224,bodyFatDate:'2026-09-25',bodyFatRecordedAt:'2026-09-25T00:00:05-04:00'};
 const plan=planHealthWeight(emptyData(),bodySample);
 assert.equal(plan.candidate.weights.length,0);
 assert.equal(plan.candidate.bodyFat[0].value,22.4);
 assert.equal(plan.candidate.bodyFat[0].date,'2026-09-25');
 assert.equal(plan.candidate.bodyFat[0].recordedAt,bodySample.bodyFatRecordedAt);
 const combined=planHealthWeight(emptyData(),{...sample,...bodySample});
 assert.equal(combined.candidate.weights[0].value,188.3);
 assert.equal(combined.candidate.bodyFat[0].value,22.4);
 assert.equal(planHealthWeight(plan.candidate,bodySample,'',bodySample.bodyFatRecordedAt).changed,false);
});
