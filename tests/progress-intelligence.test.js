import test from 'node:test';
import assert from 'node:assert/strict';
import {shiftInsightDate,weightPace,energyExpenditureEstimate,progressIntelligence} from '../progress-intelligence-model.js';
const add=(date,n)=>shiftInsightDate(date,n);
const start='2026-10-01',today='2026-10-29';
const weights=(count=29,poundsPerWeek=1.4)=>Array.from({length:count},(_,i)=>({date:add(start,i),value:180-poundsPerWeek*i/7}));
const food=(count=28,calories=1800)=>Array.from({length:count},(_,i)=>({date:add(start,i),calories,quantity:1}));
test('date arithmetic is stable across calendar boundaries',()=>{
 assert.equal(shiftInsightDate('2026-03-01',-1),'2026-02-28');
 assert.equal(shiftInsightDate('2026-01-01',-1),'2025-12-31');
});
test('steady loss gives a sensible retrospective expenditure estimate and goal ETA',()=>{
 const result=progressIntelligence({weights:weights(),foodEntries:food(),today,goalWeight:170,desiredWeeklyLoss:1.4});
 assert.ok(result.pace.ready);
 assert.ok(Math.abs(result.pace.lossPerWeek-1.4)<.00001);
 assert.equal(result.tdee.ready,true);
 assert.equal(result.tdee.loggedDays,28);
 assert.equal(result.tdee.tdee,2500);
 assert.equal(result.goal.state,'projecting');
 assert.ok(result.goal.eta>today);
 assert.equal(result.target.status,'on-pace');
});
test('no logs are missing days not zero calories',()=>{
 const entries=food().filter((_,i)=>i%2===0);
 const value=energyExpenditureEstimate({weights:weights(),foodEntries:entries,asOf:today});
 assert.equal(value.ready,false);
 assert.equal(value.reason,'food');
 assert.equal(value.loggedDays,14);
});
test('TDEE withholds until both weight edges are supported',()=>{
 const latest=weights().filter((_,i)=>i>=10);
 const value=energyExpenditureEstimate({weights:latest,foodEntries:food(),asOf:today});
 assert.equal(value.ready,false);
 assert.equal(value.reason,'weight');
});
test('partial but sufficiently logged nutrition window is marked limited',()=>{
 const rows=food().slice(3);
 const value=energyExpenditureEstimate({weights:weights(),foodEntries:rows,asOf:today});
 assert.equal(value.ready,true);
 assert.equal(value.loggedDays,25);
 assert.equal(value.quality,'limited');
});
test('weight pace uses separate start and end samples rather than single daily spikes',()=>{
 const readings=weights().map(x=>({...x}));
 readings.at(-1).value+=1.5;
 const result=weightPace(readings,today);
 assert.equal(result.ready,true);
 assert.ok(result.lossPerWeek>0&&result.lossPerWeek<1.4);
});
test('future weigh-ins and food logs cannot contaminate the estimate',()=>{
 const w=[...weights(),{date:add(today,20),value:110}];
 const f=[...food(),{date:add(today,15),calories:50000,quantity:1}];
 const result=progressIntelligence({weights:w,foodEntries:f,today});
 assert.equal(result.latest.date,today);
 assert.equal(result.tdee.tdee,2500);
});
test('food day reset shifts timed entries, while untimed entries stay on calendar date',()=>{
 const rows=food().slice(0,27);
 // The final entry belongs to Oct 28 tracking day, despite Oct 29 01:00 time.
 rows.push({date:today,t:2,calories:1800,quantity:1});
 const value=energyExpenditureEstimate({weights:weights(),foodEntries:rows,asOf:today,dayResetMinutes:360});
 assert.equal(value.loggedDays,28);
 assert.equal(value.tdee,2500);
});
test('kg units and reached goals are handled in the selected unit',()=>{
 const w=weights().map(x=>({...x,value:x.value/2.2046226218}));
 const result=progressIntelligence({weights:w,foodEntries:food(),today,unit:'kg',goalWeight:79});
 assert.equal(result.tdee.ready,true);
 assert.equal(result.tdee.tdee,2500);
 assert.equal(result.goal.state,'reached');
});
test('plateau or upward trend has no misleading ETA',()=>{
 const flat=weights().map(x=>({...x,value:175}));
 const result=progressIntelligence({weights:flat,foodEntries:food(),today,goalWeight:160});
 assert.equal(result.goal.state,'not-decreasing');
 assert.equal(result.goal.eta,undefined);
 const gain=progressIntelligence({weights:weights(29,-.5),foodEntries:food(),today,goalWeight:165});
 assert.equal(gain.goal.eta,undefined);
});
test('no goal and sparse records remain neutral',()=>{
 const x=progressIntelligence({weights:weights(3),foodEntries:food(2),today});
 assert.equal(x.goal.state,'unset');
 assert.equal(x.tdee.ready,false);
 assert.equal(x.pace,null);
});
