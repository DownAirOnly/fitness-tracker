import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFoodCSV,dailyTotals,weeklyWeights,bmi,shouldPrompt,emptyData,normalizeData} from '../data.js';

test('CSV supports quoted names and rejects malformed rows before import',()=>{
  const parsed=parseFoodCSV('date,name,calories,protein,quantity\r\n2026-09-25,"Chicken, rice",500,42,0.5\r\n2026-09-26,Bad,hi,4,1');
  assert.equal(parsed.entries.length,1);assert.equal(parsed.entries[0].name,'Chicken, rice');assert.equal(parsed.errors.length,1);
  assert.deepEqual(dailyTotals(parsed.entries,'2026-09-25'),{calories:250,protein:21});
});
test('weekly averages and BMI use entered weights and the configured height',()=>{
  const weeks=weeklyWeights([{date:'2026-09-21',value:184},{date:'2026-09-25',value:182},{date:'2026-09-20',value:186}],68);
  assert.equal(weeks.length,2);assert.equal(weeks[0].average,183);assert.equal(weeks[0].bmi,bmi(183,68));
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
test('old backups default to Monday; new week preference survives cloud and JSON',async()=>{
  const {encodeState,decodeState}=await import('../cloud-model.js');
  const data=emptyData();delete data.settings.weekStart;
  assert.equal(normalizeData(data).settings.weekStart,1);
  for(let day=0;day<7;day++){
    data.settings.weekStart=day;
    const restored=decodeState({schemaVersion:1,revision:1,payload:encodeState(data)}).data;
    assert.equal(restored.settings.weekStart,day);
  }
  for(const value of [-1,7,1.5,'Monday',null]){data.settings.weekStart=value;assert.throws(()=>normalizeData(data),/week start/);}
});
