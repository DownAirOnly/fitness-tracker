import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFoodCSV,dailyTotals,foodTrackingDate,foodEntriesNewestFirst,stepFoodDateTime,foodCalendarDate,weeklyWeights,bmi,shouldPrompt,emptyData,normalizeData,encodeData,convertNotebookWeightUnit} from '../data.js';

test('CSV supports quoted names and rejects malformed rows before import',()=>{
  const parsed=parseFoodCSV('date,name,calories,protein,quantity\r\n2026-09-25,"Chicken, rice",500,42,0.5\r\n2026-09-26,Bad,hi,4,1');
  assert.equal(parsed.entries.length,1);assert.equal(parsed.entries[0].name,'Chicken, rice');assert.equal(parsed.errors.length,1);
  assert.deepEqual(dailyTotals(parsed.entries,'2026-09-25'),{calories:250,protein:21});
});
test('v59 food date and reset grouping preserves actual calendar dates',()=>{
 const midnight={date:'2026-10-13',t:0,calories:10,protein:0,quantity:1};
 const morning={date:'2026-10-13',t:12,calories:200,protein:12,quantity:1};
 const noTime={date:'2026-10-13',calories:30,protein:2,quantity:1};
 const entries=[midnight,morning,noTime],before=JSON.stringify(entries);
 assert.equal(foodTrackingDate(midnight,360),'2026-10-12');
 assert.equal(foodCalendarDate('2026-10-12',0,360),'2026-10-13');
 assert.equal(foodTrackingDate(noTime,360),'2026-10-13');
 assert.deepEqual(dailyTotals(entries,'2026-10-12',360),{calories:10,protein:0});
 assert.deepEqual(dailyTotals(entries,'2026-10-13',360),{calories:230,protein:14});
 assert.deepEqual(dailyTotals(entries,'2026-10-13',0),{calories:240,protein:14});
 assert.equal(foodTrackingDate({date:'2027-01-01',t:0},360),'2026-12-31');
 assert.equal(JSON.stringify(entries),before);
});
test('weekly averages and BMI use entered weights and the configured height',()=>{
  const weeks=weeklyWeights([{date:'2026-09-21',value:184},{date:'2026-09-25',value:182},{date:'2026-09-20',value:186}],68);
  assert.equal(weeks.length,2);assert.equal(weeks[0].average,182);assert.equal(weeks[0].bmi,bmi(182,68));
});
test('morning prompt respects the day-reset boundary',()=>{
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

test('stored schema uses canonical food and exercise references',()=>{const d=emptyData();d.foods=[{id:'f',name:'Meal',calories:150,protein:10}];d.foodEntries=[{id:'e',date:'2026-09-30',name:'Meal',calories:150,protein:10,quantity:1}];d.lifts=[{id:'l',date:'2026-09-30',exercise:'Chest Press',sets:[{weight:60,reps:10}]}];const s=encodeData(d);assert.equal(s.version,2);assert.equal(s.foodEntries[0].foodId,'f');assert.equal('name' in s.foodEntries[0],false);assert.ok(s.exercises.some(e=>e.name==='Chest Press'&&e.equipment==='machine'),'canonical Chest Press definition is stored');assert.ok(s.exercises.some(e=>e.id===s.lifts[0].exerciseId),'lift references a stored canonical exercise');assert.equal('exercise' in s.lifts[0],false);assert.equal(normalizeData(s).foodEntries[0].name,'Meal');});
test('changed saved-food values do not rewrite older logs',()=>{const d=emptyData();d.foods=[{id:'f',name:'Meal',calories:150,protein:10}];d.foodEntries=[{id:'e',date:'2026-09-30',name:'Meal',calories:100,protein:10,quantity:1}];const s=encodeData(d);assert.notEqual(s.foodEntries[0].foodId,'f');assert.equal(normalizeData(s).foodEntries[0].calories,100);});

test('paired v49 body fat migrates into independent records',()=>{
  const old=emptyData();old.weights=[{id:'w',date:'2026-09-25',value:180,bodyFatPercent:22.4,bodyFatRecordedAt:'2026-09-25T08:00:00-04:00'}];
  const migrated=normalizeData(old);
  assert.deepEqual(migrated.weights,[{id:'w',date:'2026-09-25',value:180}]);
  assert.deepEqual(migrated.bodyFat,[{id:'bodyfat-w',date:'2026-09-25',value:22.4,recordedAt:'2026-09-25T08:00:00-04:00',source:'apple-health-shortcut'}]);
  assert.deepEqual(normalizeData(encodeData(migrated)).bodyFat,migrated.bodyFat);
});


test('one-off food logs stay out of the saved-food library while remaining dictionary-compressed',()=>{
  const d=emptyData();
  d.foodEntries=[{id:'entry-one-off',date:'2026-10-12',name:'Cruise one-off dessert',calories:420,protein:6,quantity:1}];
  const stored=encodeData(d);
  assert.equal(stored.foods.length,1);
  assert.equal(stored.foods[0].saved,false);
  assert.equal(stored.foodEntries[0].foodId,stored.foods[0].id);
  const restored=normalizeData(stored);
  assert.equal(restored.foods.length,0,'hidden dictionary item does not become a Saved Food');
  assert.equal(restored.foodEntries[0].name,'Cruise one-off dessert');
  assert.equal(restored.foodEntries[0].calories,420);
});


test('retroactive food entries appear in real-time order without mutating records',()=>{
 const e=[{id:'dinner',date:'2026-10-25',t:38},{id:'breakfast',date:'2026-10-25',t:16},{id:'untimed',date:'2026-10-25'},{id:'after-midnight',date:'2026-10-26',t:2},{id:'retro-lunch',date:'2026-10-25',t:28}];
 assert.deepEqual(foodEntriesNewestFirst(e).map(x=>x.id),['untimed','after-midnight','dinner','retro-lunch','breakfast']);assert.equal(e[0].id,'dinner');
});
test('midnight rolls the real date, tracking days remain derived from reset time',()=>{
 assert.deepEqual(stepFoodDateTime('2026-10-25',47,1),{date:'2026-10-26',t:0});
 assert.deepEqual(stepFoodDateTime('2026-10-26',0,-1),{date:'2026-10-25',t:47});
 assert.equal(foodTrackingDate({date:'2026-10-26',t:0},360),'2026-10-25');
});

test('unit conversion includes body weights, mirrored lift logs and every Workout Buddy weight copy',()=>{
 const original=emptyData();
 original.weights=[{id:'w',date:'2026-10-25',value:180}];
 original.lifts=[{id:'l',exercise:'Chest Press',equipment:'machine',buddySessionId:'done',date:'2026-10-25',sets:[{weight:45,reps:10},{weight:60,reps:8}]}];
 const exercise={
  name:'Chest Press',equipment:'machine',
  sets:[{weight:45,reps:10,difficulty:4,startedAt:'2026-10-25T15:00:00Z',durationSeconds:40},{weight:60,reps:8,difficulty:6}],
  draft:{weight:65,reps:8,difficulty:5}
 };
 original.activeWorkout={id:'active',exercises:[structuredClone(exercise)],undo:{label:'start set',exercises:[structuredClone(exercise)]}};
 original.workoutHistory=[{id:'done',exercises:[structuredClone(exercise)],undo:{exercises:[structuredClone(exercise)]}}];
 original.bodyFat=[{id:'bf',date:'2026-10-25',value:21.5}];
 const input=JSON.stringify(original);
 const kg=convertNotebookWeightUnit(original,'kg');
 const expected=x=>Math.round((x/2.2046226218+Number.EPSILON)*10)/10;
 assert.equal(kg.settings.unit,'kg');
 assert.equal(kg.weights[0].value,expected(180));
 assert.deepEqual(kg.lifts[0].sets.map(s=>s.weight),[expected(45),expected(60)]);
 for(const ex of [kg.activeWorkout.exercises[0],kg.activeWorkout.undo.exercises[0],kg.workoutHistory[0].exercises[0],kg.workoutHistory[0].undo.exercises[0]]){
  assert.deepEqual(ex.sets.map(s=>s.weight),[expected(45),expected(60)]);
  assert.equal(ex.draft.weight,expected(65));
  assert.equal(ex.sets[0].startedAt,'2026-10-25T15:00:00Z');
  assert.equal(ex.sets[0].durationSeconds,40);
  assert.equal(ex.sets[0].difficulty,4);
 }
 assert.equal(kg.bodyFat[0].value,21.5);
 assert.equal(JSON.stringify(original),input,'converting must not mutate the old notebook');
 const lb=convertNotebookWeightUnit(kg,'lb');
 assert.equal(lb.settings.unit,'lb');
 assert.ok(Math.abs(lb.weights[0].value-180)<=0.2);
 assert.ok(Math.abs(lb.workoutHistory[0].exercises[0].sets[1].weight-60)<=0.2);
 assert.ok(Math.abs(lb.activeWorkout.undo.exercises[0].draft.weight-65)<=0.2);
 assert.equal(convertNotebookWeightUnit(lb,'lb'),lb,'same-unit conversion does not recalculate weights');
});

test('unit conversion refuses invalid weights without partially modifying data',()=>{
 const original=emptyData();
 original.weights=[{date:'2026-10-25',value:180}];
 original.workoutHistory=[{id:'bad',exercises:[{sets:[{weight:'oops',reps:8}]}]}];
 const before=JSON.stringify(original);
 assert.throws(()=>convertNotebookWeightUnit(original,'kg'),/invalid/i);
 assert.equal(JSON.stringify(original),before);
 assert.throws(()=>convertNotebookWeightUnit(original,'stone'),/lb or kg/);
});


const money=(id='purchase-1')=>({id,date:'2026-10-27',time:'02:13',kind:'expense',amountCents:719,
 description:'Wawa bottled water',category:'Household supplies',currency:'USD',merchant:'Wawa',note:'Two cases next time',source:'manual'});

test('v82: legacy v1 and compact v2 notebooks load with an empty financial collection',()=>{
 const old=emptyData();delete old.transactions;
 assert.deepEqual(normalizeData(old).transactions,[]);
 const compact=encodeData(old);delete compact.transactions;
 assert.equal(compact.version,2);
 assert.deepEqual(normalizeData(compact).transactions,[]);
 const original=JSON.stringify(old);normalizeData(old);assert.equal(JSON.stringify(old),original);
});

test('v82: exact-cent transactions preserve optional metadata in compact backups',()=>{
 const data=emptyData();data.transactions=[
   money(),{id:'paycheck',date:'2026-10-26',kind:'income',amountCents:152347,description:'Paycheck',category:'Income'},
   {id:'transfer',date:'2026-10-26',kind:'transfer',amountCents:10000,description:'Move to bills',category:'Transfers',externalId:'bank-ref-3',source:'import'}
 ];
 const original=structuredClone(data),stored=encodeData(data),restored=normalizeData(stored);
 assert.equal(stored.version,2);
 assert.deepEqual(restored.transactions,normalizeData(data).transactions);
 assert.equal(restored.transactions[0].amountCents,719);
 assert.equal(restored.transactions[0].time,'02:13');
 assert.equal(restored.transactions[1].currency,'USD');
 assert.equal(restored.transactions[1].time,undefined);
 assert.equal(restored.transactions[2].externalId,'bank-ref-3');
 assert.deepEqual(data,original,'encoding does not mutate inputs');
 assert.deepEqual(normalizeData(encodeData(restored)).transactions,restored.transactions,'round trips are idempotent');
});

test('v82: unsafe financial money, dates, kinds, currencies and duplicate IDs are rejected',()=>{
 const invalid=[
  {amountCents:7.19},{amountCents:-1},{amountCents:0},{amountCents:Number.MAX_SAFE_INTEGER+1},
  {kind:'purchase'},{date:'2026-02-30'},{time:'25:00'},{time:'02:60'},{currency:'EUR'},
  {description:'  '},{description:'z'.repeat(201)},{merchant:4},{note:'x'.repeat(501)},
  {category:7},{source:'bank'}, {externalId:4}
 ];
 for(const patch of invalid){
   const data=emptyData();data.transactions=[{...money(),...patch}];
   assert.throws(()=>normalizeData(data),/transaction|transactions/i,JSON.stringify(patch));
 }
 const data=emptyData();data.transactions=[money(),{...money(),date:'2026-10-28'}];
 assert.throws(()=>normalizeData(data),/duplicate transaction IDs/);
 data.transactions='not an array';assert.throws(()=>normalizeData(data),/transactions section/);
 data.transactions=null;assert.throws(()=>normalizeData(data),/transactions section/);
});

test('v82: non-transaction weight conversion leaves exact cents and transaction times unchanged',()=>{
 const data=emptyData();data.transactions=[money()];data.weights=[{id:'weight',date:'2026-10-27',value:180}];
 const changed=convertNotebookWeightUnit(data,'kg');
 assert.deepEqual(changed.transactions,normalizeData(data).transactions);
 assert.equal(changed.weights[0].value,81.6);
});


test('v84: bank metadata validates dates, bounded user classifications and receipt itemization',()=>{
 const valid={id:'bofa1',date:'2026-10-27',kind:'expense',amountCents:719,
  description:'Wawa water',bankDescription:'WAWA DEBIT POS #1111',
  accountLabel:'BofA Checking',statementLabel:'October 2026',
  category:'Household Supplies',subcategory:'Bottled Water',
  purchaseDate:'2026-10-26',time:'17:22',itemization:'2 water cases, 48 bottles',
  currency:'USD',source:'import'};
 const state=emptyData();state.transactions=[valid];
 const clean=normalizeData(encodeData(state)).transactions[0];
 assert.deepEqual(clean,valid);
 for(const invalid of [
  {bankDescription:'a'.repeat(241)}, {accountLabel:'b'.repeat(121)},
  {statementLabel:'c'.repeat(161)}, {subcategory:'d'.repeat(81)},
  {itemization:'e'.repeat(3001)}, {purchaseDate:'2026-02-30'},
  {purchaseDate:'not a date'}, {bankDescription:19},{itemization:null,subcategory:4}
 ]){
  const notebook=emptyData();notebook.transactions=[{...valid,...invalid}];
  if(invalid.itemization===null&&invalid.subcategory===4)
   assert.throws(()=>normalizeData(notebook),/subcategory/);
  else assert.throws(()=>normalizeData(notebook),/transaction/i);
 }
});
