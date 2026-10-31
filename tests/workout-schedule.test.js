import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData,normalizeData,encodeData} from '../data.js';
import {exportSection,applySection,sectionPayloads,readSectionPayloads} from '../account-sections.js';
import {muscleRecoveryMarkup} from '../muscle-map.js';

test('weekly schedule survives compact backup, Lifting exports and account sections',()=>{
 const original=emptyData();
 const upper=original.workoutTemplates.find(x=>x.name==='Upper');
 original.workoutSchedule=[{day:1,routineId:upper?.id||'any'},{day:4,routineId:'any'}];
 const compact=encodeData(original),normalized=normalizeData(compact);
 assert.deepEqual(normalized.workoutSchedule,original.workoutSchedule,'compact backup preserves schedule');
 const lifting=exportSection(original,'lifting');
 assert.deepEqual(lifting.data.workoutSchedule,original.workoutSchedule);
 assert.deepEqual(applySection(emptyData(),lifting).workoutSchedule,original.workoutSchedule);
 const sections=readSectionPayloads(sectionPayloads(original));
 assert.deepEqual(sections.workoutSchedule,original.workoutSchedule,'cloud section roundtrip retains schedule');
});
test('older section and notebook payloads still load without schedule',()=>{
 const previous=emptyData(),lifting=exportSection(previous,'lifting');
 delete lifting.data.workoutSchedule;
 assert.deepEqual(applySection(emptyData(),lifting).workoutSchedule,[]);
 const compact=encodeData(previous);delete compact.workoutSchedule;
 assert.deepEqual(normalizeData(compact).workoutSchedule,[]);
});
test('invalid recurring schedule fails validation instead of changing records',()=>{
 const doc=emptyData();
 doc.workoutSchedule=[{day:1,routineId:'any'},{day:1,routineId:'any'}];
 assert.throws(()=>normalizeData(doc),/workout schedule/i);
 doc.workoutSchedule=[{day:8,routineId:'any'}];
 assert.throws(()=>normalizeData(doc),/workout schedule/i);
});
test('recent training map marks front/back anatomical regions with distinct colors',()=>{
 const html=muscleRecoveryMarkup({chest:'today',lats:'yesterday'});
 assert.match(html,/data-muscle="chest"/);
 assert.match(html,/data-muscle="lats"/);
 assert.match(html,/#f16c68/);
 assert.match(html,/#f0ca53/);
 assert.match(html,/trained today/);
 assert.match(html,/trained yesterday/);
});
