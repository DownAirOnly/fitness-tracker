import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFoodCSV,dailyTotals,weeklyWeights,bmi,shouldPrompt,emptyData,normalizeData,encodeData} from '../data.js';

test('CSV supports quoted names and rejects malformed rows before import',()=>{
  const parsed=parseFoodCSV('date,name,calories,protein,quantity\r\n2026-09-25,"Chicken, rice",500,42,0.5\r\n2026-09-26,Bad,hi,4,1');
  assert.equal(parsed.entries.length,1);assert.equal(parsed.entries[0].name,'Chicken, rice');assert.equal(parsed.errors.length,1);
  assert.deepEqual(dailyTotals(parsed.entries,'2026-09-25'),{calories:250,protein:21});
});
test('weekly averages and BMI use entered weights and the configured height',()=>{
  const weeks=weeklyWeights([{date:'2026-09-21',value:184},{date:'2026-09-25',value:182},{date:'2026-09-20',value:186}],68);
  assert.equal(weeks.length,2);assert.equal(weeks[0].average,182);assert.equal(weeks[0].bmi,bmi(182,68));
});
test('morning prompt respects six AM and once per local date',()=>{
  const data=emptyData();const early=new Date(2026,8,25,5,59),late=new Date(2026,8,25,6,1);
  assert.equal(shouldPrompt(data,early),false);assert.equal(shouldPrompt(data,late),true);
  data.promptDate='2026-09-25';assert.equal(shouldPrompt(data,late),false);
  data.promptDate='';data.weights.push({date:'2026-09-25',value:183});assert.equal(shouldPrompt(data,late),false);
});
test('backup validator rejects corrupt records',()=>{
  const data=emptyData();data.foodEntries.push({id:'a',date:'2026-09-25',name:'Food',calories:100,protein:10,quantity:1});
  assert.equal(normalizeData(data).foodEntries.length,1);
  data.foodEntries[0].calories=-10;assert.throws(()=>normalizeData(data),/invalid food entry/);
  const body=emptyData();body.bodyFat=[{id:'bf',date:'2026-09-25',value:22.4}];assert.equal(normalizeData(body).bodyFat[0].value,22.4);body.bodyFat[0].value=101;assert.throws(()=>normalizeData(body),/invalid body-fat reading/);
});

test('all seven week starts regroup historical data without mutation',async()=>{
  const {startOfWeek,endOfWeek}=await import('../data.js');
  const weights=[{id:'sun',date:'2026-09-20',value:186},{id:'mon',date:'2026-09-21',value:184},{id:'tue',date:'2026-09-22',value:182}];
  const before=JSON.stringify(weights);
  assert.deepEqual(weeklyWeights(weights,68,'lb',1).map(w=>[w.week,w.average,w.count]),[['2026-09-21',183,2],['2026-09-14',186,1]]);
  assert.deepEqual(weeklyWeights(weights,68,'lb',0).map(w=>[w.week,w.average,w.count]),[['2026-09-20',184,3]]);
  assert.deepEqual(weeklyWeights(weights,68,'lb',2).map(w=>[w.week,w.average,w.count]),[['2026-09-22',182,1],['2026-09-15',185,2]]);
  for(let day=0;day<7;day++){
    const start=`2026-09-${20+day}`,prior=`2026-09-${19+day}`;
    assert.equal(startOfWeek(start,day),start);
    assert.notEqual(startOfWeek(prior,day),start);
    assert.equal(startOfWeek(endOfWeek(start),day),start);
    const result=weeklyWeights(weights,68,'lb',day);
    assert.equal(result.reduce((n,w)=>n+w.count,0),3);
  }
  assert.equal(startOfWeek('2026-01-01',1),'2025-12-29');
  assert.equal(endOfWeek('2025-12-29'),'2026-01-04');
  assert.equal(startOfWeek('2024-03-01',4),'2024-02-29');
  assert.equal(startOfWeek('2026-03-08',1),'2026-03-02');
  assert.equal(endOfWeek('2026-03-02'),'2026-03-08');
  assert.equal(startOfWeek('2026-11-01',1),'2026-10-26');
  assert.equal(endOfWeek('2026-10-26'),'2026-11-01');
  assert.equal(JSON.stringify(weights),before);
});
test('week boundaries are canonically Friday across old and imported data',async()=>{
  const {encodeState,decodeState}=await import('../cloud-model.js');
  const data=emptyData();delete data.settings.weekStart;
  assert.equal(normalizeData(data).settings.weekStart,5);
  for(let day=0;day<7;day++){
    data.settings.weekStart=day;
    const restored=decodeState({schemaVersion:1,revision:1,payload:encodeState(data)}).data;
    assert.equal(restored.settings.weekStart,5);
  }
  for(const value of [-1,7,1.5,'Monday']){data.settings.weekStart=value;assert.throws(()=>normalizeData(data),/week start/);}
  data.settings.weekStart=null;assert.equal(normalizeData(data).settings.weekStart,5);
});

test('stored schema uses canonical food and exercise references',()=>{const d=emptyData();d.foods=[{id:'f',name:'Meal',calories:150,protein:10}];d.foodEntries=[{id:'e',date:'2026-09-30',name:'Meal',calories:150,protein:10,quantity:1}];d.lifts=[{id:'l',date:'2026-09-30',exercise:'Chest Press',sets:[{weight:60,reps:10}]}];const s=encodeData(d);assert.equal(s.version,2);assert.equal(s.foodEntries[0].foodId,'f');assert.equal('name' in s.foodEntries[0],false);assert.equal(s.exercises.length,1);assert.equal('exercise' in s.lifts[0],false);assert.equal(normalizeData(s).foodEntries[0].name,'Meal');});
test('changed saved-food values do not rewrite older logs',()=>{const d=emptyData();d.foods=[{id:'f',name:'Meal',calories:150,protein:10}];d.foodEntries=[{id:'e',date:'2026-09-30',name:'Meal',calories:100,protein:10,quantity:1}];const s=encodeData(d);assert.notEqual(s.foodEntries[0].foodId,'f');assert.equal(normalizeData(s).foodEntries[0].calories,100);});

test('paired v49 body fat migrates into independent records',()=>{
  const old=emptyData();old.weights=[{id:'w',date:'2026-09-25',value:180,bodyFatPercent:22.4,bodyFatRecordedAt:'2026-09-25T08:00:00-04:00'}];
  const migrated=normalizeData(old);
  assert.deepEqual(migrated.weights,[{id:'w',date:'2026-09-25',value:180}]);
  assert.deepEqual(migrated.bodyFat,[{id:'bodyfat-w',date:'2026-09-25',value:22.4,recordedAt:'2026-09-25T08:00:00-04:00',source:'apple-health-shortcut'}]);
  assert.deepEqual(normalizeData(encodeData(migrated)).bodyFat,migrated.bodyFat);
});
