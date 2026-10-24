import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoData,DEMO_LAST_DATE,stableDemoSnapshot} from '../demo-mode.js';
import {encodeData,normalizeData,foodTrackingDate} from '../data.js';

test('demo fixture is fixed, realistic, and reproducible',()=>{
 const first=createDemoData(),second=createDemoData();
 assert.equal(DEMO_LAST_DATE,'2026-10-23');
 assert.deepEqual(first,second);
 assert.equal(stableDemoSnapshot(),stableDemoSnapshot());
 assert.equal(first.foods.length,14);
 assert.equal(first.foodEntries.length,158);
 assert.equal(first.weights.length,21);
 assert.equal(first.lifts.length,64);
 assert.equal(first.workoutHistory.length,12);
 assert.ok(first.bodyFat.length>0 && first.notes.length>0);
 assert.ok(first.foodEntries.some(entry=>entry.t===1 && foodTrackingDate(entry,360)!==entry.date),'test midnight grouping');
 first.foodEntries[0].quantity=99;
 assert.notEqual(createDemoData().foodEntries[0].quantity,99,'new load restores the fixture');
});

test('demo data survives normal JSON backup encode/decode without missing relationships',()=>{
 const first=createDemoData(),restored=normalizeData(encodeData(first));
 for(const key of ['foods','foodEntries','lifts','weights','bodyFat','notes','workoutHistory','exerciseDefinitions','workoutTemplates'])
   assert.deepEqual(restored[key],first[key],key+' must roundtrip through normal storage');
 assert.equal(restored.activeWorkout,null);
});
