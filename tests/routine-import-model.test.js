import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData,normalizeData,encodeData} from '../data.js';
import {parseRoutineCSV,prepareRoutineImport} from '../routine-import-model.js';

const headers=['recordType','id','workoutId','workout','exercise','equipment','order','targetSets','repMin','repMax','restSeconds','setup','notes','movement','movementPattern','primaryMuscles','secondaryMuscles','safetyNote','routineCue','routineColor','weekday'];
const csv=rows=>[headers.join(','),...rows.map(row=>headers.map(h=>{
 const v=String(row[h]??'');
 return /[",\n]/.test(v)?'"'+v.replaceAll('"','""')+'"':v;
}).join(','))].join('\n');
const program=csv([
 {recordType:'exercise',id:'exercise-machine-seated-row',exercise:'Seated Row',equipment:'machine',setup:'New seat number',notes:'Imported public note',movement:'pull',movementPattern:'horizontal_pull',primaryMuscles:'midBack',secondaryMuscles:'lats|biceps'},
 {recordType:'exercise',id:'exercise-test-hip-adduction',exercise:'Hip Adduction',equipment:'machine',setup:'New exercise setup',notes:'Practice with a comfortable range',movement:'neutral',movementPattern:'hip_adduction',primaryMuscles:'adductors'},
 {recordType:'workout',workoutId:'workout-upper-a',workout:'Upper A',exercise:'Seated Row',equipment:'machine',order:1,targetSets:2,repMin:8,repMax:12,restSeconds:150,routineCue:'Chest supported, elbows wider',routineColor:'#5296CB',weekday:6},
 {recordType:'workout',workoutId:'workout-lower-a',workout:'Lower A',exercise:'Hip Adduction',equipment:'machine',order:1,targetSets:2,repMin:10,repMax:15,restSeconds:90,routineColor:'#6FA985',weekday:0}
]);
const base=()=>{
 const data=normalizeData(emptyData());
 const row=data.exerciseDefinitions.find(x=>x.name==='Seated Row'&&x.equipment==='machine');
 row.setup='Seat 3';row.notes='Personal shared note';
 data.lifts.push({id:'lift-history-row',date:'2026-11-10',exercise:'Seated Row',equipment:'machine',sets:[{weight:80,reps:10}],notes:'Old set notes'});
 data.workoutSchedule=[{day:2,routineId:'workout-01'}];
 return data;
};

test('four-day-style CSV finds shared exercises and creates only missing definitions and routines',()=>{
 const input=base(),priorId=input.exerciseDefinitions.find(x=>x.name==='Seated Row').id;
 const plan=prepareRoutineImport(program,input);
 assert.deepEqual(plan.errors,[]);
 assert.equal(plan.counts.reusedExercises,1);
 assert.equal(plan.counts.createdExercises,1);
 assert.equal(plan.counts.createdRoutines,2);
 assert.equal(plan.candidate.exerciseDefinitions.find(x=>x.name==='Seated Row').id,priorId);
 assert.equal(plan.candidate.exerciseDefinitions.find(x=>x.name==='Seated Row').setup,'Seat 3');
 assert.equal(plan.candidate.exerciseDefinitions.find(x=>x.name==='Seated Row').notes,'Personal shared note');
 assert.equal(plan.candidate.exerciseDefinitions.find(x=>x.name==='Seated Row').meta.movement,'pull');
 assert.deepEqual(plan.candidate.lifts,input.lifts,'recorded weights, sets, effort and notes retained');
 assert.deepEqual(plan.candidate.workoutSchedule,input.workoutSchedule,'schedule must be opt-in');
 assert.deepEqual(plan.candidate.settings,input.settings);
 assert.deepEqual(plan.candidate.workoutHistory,input.workoutHistory);
 const upper=plan.candidate.workoutTemplates.find(x=>x.name==='Upper A');
 assert.equal(upper.exercises[0].exerciseId,priorId);
 assert.equal(upper.exercises[0].cue,'Chest supported, elbows wider');
 assert.equal(upper.exercises[0].restSeconds,150);
});

test('workout import is idempotent unless updating an existing routine is selected',()=>{
 const first=prepareRoutineImport(program,base());
 const again=prepareRoutineImport(program,first.candidate);
 assert.deepEqual(again.errors,[]);
 assert.equal(again.counts.createdExercises,0);
 assert.equal(again.counts.createdRoutines,0);
 assert.equal(again.counts.updatedRoutines,0);
 assert.equal(again.changeCount,0,'reimport does not duplicate a routine');
 const original=first.candidate.workoutTemplates.find(w=>w.name==='Upper A');
 const changed=program.replace('Chest supported, elbows wider','Control the movement');
 const updated=prepareRoutineImport(changed,first.candidate,{routineActions:{'upper a':'update'}});
 const same=updated.candidate.workoutTemplates.find(w=>w.name==='Upper A');
 assert.equal(same.id,original.id);
 assert.equal(same.color,original.color);
 assert.equal(same.exercises[0].cue,'Control the movement');
 assert.deepEqual(updated.candidate.lifts,first.candidate.lifts);
});

test('opt-in schedule updates only specified weekdays and preserves unmentioned days',()=>{
 const current=base(),plan=prepareRoutineImport(program,current,{applySchedule:true});
 assert.deepEqual(plan.errors,[]);
 assert.equal(plan.candidate.workoutSchedule.length,3);
 assert.equal(plan.candidate.workoutSchedule.find(x=>x.day===2).routineId,'workout-01');
 assert.equal(plan.candidate.workoutSchedule.find(x=>x.day===6).routineId,plan.candidate.workoutTemplates.find(x=>x.name==='Upper A').id);
 assert.equal(plan.candidate.workoutSchedule.find(x=>x.day===0).routineId,plan.candidate.workoutTemplates.find(x=>x.name==='Lower A').id);
});

test('manually mapped renamed exercises reuse their existing ID and do not overwrite personal setup',()=>{
 const current=base(),aliasCsv=csv([
  {recordType:'workout',workout:'Upper B',exercise:'Chest-supported Row',equipment:'machine',order:1,targetSets:2,repMin:8,repMax:12,restSeconds:90}
 ]);
 const key='chest-supported row|machine',row=current.exerciseDefinitions.find(x=>x.name==='Seated Row');
 const plan=prepareRoutineImport(aliasCsv,current,{exerciseMatches:{[key]:row.id}});
 assert.deepEqual(plan.errors,[]);
 assert.equal(plan.counts.createdExercises,0);
 assert.equal(plan.candidate.workoutTemplates.find(w=>w.name==='Upper B').exercises[0].exerciseId,row.id);
 assert.equal(plan.candidate.exerciseDefinitions.find(x=>x.id===row.id).setup,'Seat 3');
});

test('equipment differences do not silently match different machines or cables',()=>{
 const current=base(),csvText=csv([{recordType:'workout',workout:'Pull Session',exercise:'Lat Pulldown',equipment:'cable',order:1}]);
 const plan=prepareRoutineImport(csvText,current);
 assert.deepEqual(plan.errors,[]);
 assert.equal(plan.counts.createdExercises,1);
 assert.equal(plan.candidate.exerciseDefinitions.filter(x=>x.name==='Lat Pulldown').length,2);
 assert.match(plan.warnings.join(' '),/different equipment/);
});

test('exercise profiles and routine cues survive encoded backups',()=>{
 const candidate=prepareRoutineImport(program,base()).candidate;
 const restored=normalizeData(encodeData(candidate));
 const def=restored.exerciseDefinitions.find(x=>x.name==='Seated Row');
 assert.equal(def.meta.pattern,'horizontal_pull');
 assert.deepEqual(def.meta.primaryMuscles,['midBack']);
 assert.equal(restored.workoutTemplates.find(w=>w.name==='Upper A').exercises[0].cue,'Chest supported, elbows wider');
});

test('invalid CSV blocks the entire import instead of applying partial rows',()=>{
 const current=base(),bad=csv([{recordType:'workout',workout:'Bad',exercise:'Hip Adduction',equipment:'machine',order:1,repMin:16,repMax:8}]);
 const plan=prepareRoutineImport(bad,current);
 assert.ok(plan.errors.length);
 assert.equal(plan.candidate,null);
 assert.equal(current.workoutTemplates.some(w=>w.name==='Bad'),false);
 assert.throws(()=>parseRoutineCSV('recordType,workout\nworkout,Bad'),/recordType, workout, exercise/);
});


test('explicit equipment reclassification keeps canonical ID, old lifts and compact-backup history',()=>{
 const current=base(),sourceId='saved-incline-press';
 current.exerciseDefinitions.push({id:sourceId,name:'Incline Chest Press',equipment:'machine',setup:'Current seat 3',notes:'Personal setup'});
 current.lifts.push({id:'old-incline-lift',date:'2026-11-09',exercise:'Incline Chest Press',equipment:'machine',sets:[{weight:50,reps:8}]});
 const text=csv([
  {recordType:'exercise',exercise:'Incline Chest Press',equipment:'bench',movement:'push',primaryMuscles:'chest',secondaryMuscles:'triceps|frontDelts',setup:'Imported Smith setup'},
  {recordType:'workout',workout:'Upper B',exercise:'Incline Chest Press',equipment:'bench',order:1,repMin:8,repMax:12,targetSets:2}
 ]);
 const automatic=prepareRoutineImport(text,current);
 assert.deepEqual(automatic.errors,[]);
 assert.equal(automatic.counts.createdExercises,1,'cross-equipment changes are never automatic');
 const plan=prepareRoutineImport(text,current,{exerciseMatches:{'incline chest press|bench':'reclassify:'+sourceId}});
 assert.deepEqual(plan.errors,[]);
 assert.equal(plan.counts.reclassifiedExercises,1);
 assert.equal(plan.counts.createdExercises,0);
 assert.equal(plan.candidate.exerciseDefinitions.filter(x=>x.name==='Incline Chest Press').length,1);
 assert.equal(plan.candidate.exerciseDefinitions.find(x=>x.id===sourceId).equipment,'bench');
 assert.equal(plan.candidate.exerciseDefinitions.find(x=>x.id===sourceId).setup,'Current seat 3');
 assert.equal(plan.candidate.exerciseDefinitions.find(x=>x.id===sourceId).notes,'Personal setup');
 assert.deepEqual(plan.candidate.lifts,current.lifts,'historical lifts never silently reclassified');
 assert.equal(plan.candidate.workoutTemplates.find(x=>x.name==='Upper B').exercises[0].exerciseId,sourceId);
 const restored=normalizeData(encodeData(plan.candidate));
 assert.equal(restored.exerciseDefinitions.filter(x=>x.name==='Incline Chest Press').length,1);
 assert.equal(restored.exerciseDefinitions.find(x=>x.id===sourceId).equipment,'bench');
 assert.equal(restored.lifts.find(x=>x.id==='old-incline-lift').equipment,'machine');
 assert.equal(restored.lifts.find(x=>x.id==='old-incline-lift').sets[0].weight,50);
});
