import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {defaultExerciseDefinitions} from '../data.js';
import {exerciseMuscleProfile,muscleMiniMarkup,muscleSetLevelsMarkup} from '../muscle-map.js';
import {completedMuscleSets,plannedMuscleSets,activeMuscleSets} from '../muscle-load.js';

test('every one of the 15 default exercises has audited muscle groups',()=>{
 const expected={
  'Chest Press':[['chest'],['triceps','delts']],
  'Lat Pulldown':[['lats'],['biceps','upperBack']],
  'Seated Row':[['upperBack','lats'],['biceps','delts']],
  'Shoulder Press':[['delts'],['triceps']],
  'Triceps Pushdown':[['triceps'],[]],
  'Bicep Curl':[['biceps'],[]],
  'Seated Leg Press':[['quads','glutes'],[]],
  'Leg Curl':[['hamstrings'],[]],
  'Glute Kickback':[['glutes'],[]],
  'Leg Extension':[['quads'],[]],
  'Hip Abduction':[['glutes'],[]],
  'Calf Extension':[['calves'],[]],
  'Torso Rotation':[['obliques'],[]],
  'Abdominal Crunch':[['abs'],[]],
  'Lateral Raise':[['delts'],[]]
 };
 const defaults=defaultExerciseDefinitions();
 assert.equal(defaults.length,15);
 for(const def of defaults){
  const profile=exerciseMuscleProfile(def.name);
  assert.ok(profile,'missing '+def.name);
  assert.deepEqual([profile.primary,profile.secondary],expected[def.name],def.name);
  for(const id of profile.primary)assert.ok(!profile.secondary.includes(id),'duplicated direct/supporting role for '+def.name);
 }
});

test('known machine aliases resolve but unsupported custom exercise names do not guess',()=>{
 assert.deepEqual(exerciseMuscleProfile('Machine Row'),exerciseMuscleProfile('Seated Row'));
 assert.deepEqual(exerciseMuscleProfile('Dumbbell Lateral Raise'),exerciseMuscleProfile('Lateral Raise'));
 assert.deepEqual(exerciseMuscleProfile('Seated Leg Curl'),exerciseMuscleProfile('Leg Curl'));
 assert.deepEqual(exerciseMuscleProfile('Lat Pull Down'),exerciseMuscleProfile('Lat Pulldown'));
 assert.equal(exerciseMuscleProfile('My Custom Movement'),null);
});

test('set exposure avoids stabilizer inflation and double-counting Buddy records',()=>{
 const day='2026-11-08';
 const lifts=[
  {exercise:'Chest Press',date:day,sets:[{},{}],buddySessionId:'a'},
  {exercise:'Leg Press',date:day,sets:[{},{}]}
 ];
 const active={id:'a',date:day,exercises:[
  {name:'Chest Press',equipment:'machine',sets:[{},{}]},
  {name:'Lat Pulldown',equipment:'machine',sets:[{}]},
  {name:'Triceps Pushdown',equipment:'cable',sets:[]}
 ]};
 const got=completedMuscleSets(lifts,active,day,day);
 assert.equal(got.chest.direct,2,'Buddy chest records counted once');
 assert.equal(got.triceps.supporting,2,'only substantial assisting work gets half-set credit');
 assert.equal(got.quads.direct,2);
 assert.equal(got.glutes.direct,2);
 assert.equal(got.hamstrings,undefined,'leg press does not credit hamstring hypertrophy by default');
 assert.equal(got.lats.direct,1);
 assert.equal(got.biceps.supporting,1);
 assert.equal(got.forearms,undefined,'gripping alone does not award forearm set equivalents');
 assert.deepEqual(completedMuscleSets(lifts,null,'2026-11-09','2026-11-09'),{});
});

test('planned and active sets use exercise definitions without writing to them',()=>{
 const list=[{name:'Chest Press',targetSets:2},{name:'Leg Curl',targetSets:3}];
 const before=JSON.stringify(list),planned=plannedMuscleSets(list);
 assert.equal(planned.chest.direct,2);
 assert.equal(planned.hamstrings.direct,3);
 assert.equal(planned.triceps.supporting,2);
 assert.equal(JSON.stringify(list),before);
 const active={exercises:[{name:'Chest Press',sets:[{}],targetSets:2},{name:'Leg Curl',sets:[],targetSets:3}]};
 assert.equal(activeMuscleSets(active).chest.direct,1);
 assert.equal(activeMuscleSets(active).hamstrings,undefined);
 const svg=muscleSetLevelsMarkup(activeMuscleSets(active),planned,{title:'Routine'});
 assert.match(svg,/Planned workload/);
 assert.match(svg,/Completed workload/);
 assert.match(svg,/1 \/ 2 sets/);
});

test('v122 anatomy contours and major muscle shapes restored, with new overlay isolated',async()=>{
 const source=await readFile(new URL('../muscle-map.js',import.meta.url),'utf8');
 for(const original of [
  'M67 73 Q75 65 88 70 L88 91',
  'M77 103 L103 103 103 141',
  'M66 180 Q78 174 88 181',
  'M79 79 L101 79 105 109',
  'M67 83 L76 91 77 114',
  'M90 55V143 M70 82Q90 91 110 82'
 ])assert.ok(source.includes(original),'missing original approved SVG path: '+original);
 assert.ok(!source.includes('M65 72 Q73 64 87 69'),'v123 chest geometry was not restored');
 const markup=muscleMiniMarkup('Chest Press');
 assert.equal((markup.match(/class="muscle-body"/g)||[]).length,2,'original front and rear views remain');
 assert.ok(!markup.includes('data-muscle="adductors"'),'extra adductor overlay does not change original chest geometry');
});
