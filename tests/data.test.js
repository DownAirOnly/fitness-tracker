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
