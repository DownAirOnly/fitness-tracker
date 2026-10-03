import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData} from '../data.js';
import {prepareImport,reviewImport} from '../import-model.js';
const meal=(id='meal')=>({id,date:'2026-09-27',name:'Yogurt',calories:150,protein:20,quantity:2});
const csv='date,name,calories,protein,quantity\n2026-09-27,Yogurt,150,20,2';
test('small CSV is staged without mutation and preserves every other section',()=>{
 const current=emptyData();current.weights=[{id:'w',date:'2026-09-27',value:180}];const before=structuredClone(current);
 const p=prepareImport('csv',csv,current);
 assert.deepEqual(current,before);assert.equal(p.candidate.foodEntries.length,1);assert.equal(p.candidate.foods.length,1);assert.deepEqual(p.candidate.weights,before.weights);
 assert.deepEqual(p.candidate.settings,before.settings);
 p.candidate.weights[0].value=999;assert.deepEqual(current,before,'candidate is isolated');
});
test('mixed JSON reports replacements, removed records, settings and empty sections',()=>{
 const current=emptyData();current.foodEntries=[meal(),meal('missing')];
 const incoming=emptyData();incoming.foodEntries=[{...meal(),calories:200}];incoming.lifts=[{id:'l',date:'2026-09-27',exercise:'Press',sets:[{weight:45,reps:8}],difficulty:7,notes:'Test notes'}];incoming.weights=[{id:'w',date:'2026-09-27',value:180}];incoming.settings.dayResetMinutes=390;
 const snapshot=structuredClone(current),p=prepareImport('json',JSON.stringify(incoming),current);
 assert.equal(p.replaced,1);assert.equal(p.removed,1);assert.equal(p.groups.find(g=>g.key==='foods').rows.length,0);assert.equal(p.groups[1].rows[0].previous.calories,150);
 assert.deepEqual(p.candidate,incoming);assert.deepEqual(current,snapshot);
});
test('duplicate content is flagged but preserved; ambiguous duplicate IDs block JSON',()=>{
 const current=emptyData();current.foodEntries=[meal()];
 let p=prepareImport('csv',csv+'\n2026-09-27,Yogurt,150,20,2',current);
 assert.equal(p.duplicates,2);assert.equal(p.candidate.foodEntries.length,3);
 const raw=emptyData();raw.foodEntries=[meal(),meal()];p=reviewImport('json',raw,current);
 assert.equal(p.candidate,null);assert.match(p.errors.join(' '),/Duplicate ID/);
});
test('malformed, mixed invalid, and empty imports cannot commit a partial candidate',()=>{
 const current=emptyData();assert.throws(()=>prepareImport('json','{',current),/not valid JSON/);
 assert.throws(()=>prepareImport('json','{}',current),/not an Everyday backup/);
 let p=prepareImport('csv',csv+'\n2026-09-28,Invalid,-1,10,1',current);assert.equal(p.candidate,null);assert.equal(p.groups[1].rows.length,1);assert.match(p.errors[0],/Row 3/);
 const raw=emptyData();raw.foodEntries=[meal(),{...meal('bad'),calories:-5}];p=reviewImport('json',raw,current);assert.equal(p.candidate,null);assert.match(p.errors[0],/calories.*-5/);
 assert.equal(prepareImport('csv','date,name,calories,protein',current).candidate,null);
 assert.deepEqual(reviewImport('json',emptyData(),current).candidate,current,'empty JSON is a valid full replacement');
});
test('large import retains all records and efficiently detects duplicates',()=>{
 const text='date,name,calories,protein\n'+Array.from({length:2000},(_,i)=>`2026-09-27,Food ${i},100,10`).join('\n');
 const p=prepareImport('csv',text,emptyData());assert.equal(p.candidate.foodEntries.length,2000);assert.equal(p.groups[1].rows.length,2000);assert.equal(p.errors.length,0);
});
test('CSV saved-card conflicts are disclosed without replacing card values',()=>{
 const current=emptyData();current.foods=[{id:'f',name:'Yogurt',calories:100,protein:10}];const p=prepareImport('csv',csv,current);
 assert.match(p.warnings.join(' '),/different per-serving values/);assert.equal(p.candidate.foods[0].calories,100);assert.equal(p.candidate.foodEntries[0].calories,150);
});


test('universal CSV can add definitions, workout templates, lift sets, saved foods, food logs and body composition',()=>{
 const current=emptyData();
 const mixed=[
  'recordType,date,name,calories,protein,quantity,exercise,equipment,workout,order,repMin,repMax,targetSets,restSeconds,group,set,weight,reps,effort,notes,bodyFatPercent,kind,tags,favorite,accuracy',
  'savedFood,,Core Test,230,42,,,,,,,,,,,,,,,,,food,protein|drink,true,label',
  'foodLog,2026-10-02,Core Test,230,42,1,,,,,,,,,,,,,,,,,,,',
  'exercise,,,,,,,machine,Test Day,,,,,,,,,,,,,,,',
  'exercise,,,,,,Chest Test,machine,,,,,,,,,,,,,,,,',
  'workout,,,,,,Chest Test,machine,Test Day,1,6,12,2,90,,,,,,,,,,,',
  'lift,2026-10-02,,,,,Chest Test,machine,,,,,,,press-1,1,60,10,4,first set,,,,',
  'lift,2026-10-02,,,,,Chest Test,machine,,,,,,,press-1,2,60,8,5,,,,,',
  'weight,2026-10-02,,,,,,,,,,,,,,,181.5,,,,22.4,,,,'
 ].join('\n');
 const p=prepareImport('csv',mixed,current);
 assert.equal(p.errors.length,0,p.errors.join(' | '));assert.ok(p.candidate);
 assert.ok(p.candidate.foods.some(f=>f.name==='Core Test'&&f.pinned===true&&f.accuracy==='label'));
 assert.ok(p.candidate.foodEntries.some(e=>e.name==='Core Test'));
 assert.ok(p.candidate.exerciseDefinitions.some(e=>e.name==='Chest Test'&&e.equipment==='machine'));
 assert.ok(p.candidate.workoutTemplates.some(w=>w.name==='Test Day'&&w.exercises.length===1));
 const lift=p.candidate.lifts.find(l=>l.exercise==='Chest Test');assert.equal(lift.sets.length,2);assert.equal(lift.sets[1].difficulty,5);
 const weight=p.candidate.weights.find(w=>w.date==='2026-10-02');assert.equal(weight.value,181.5);assert.equal(weight.bodyFatPercent,22.4);
});
