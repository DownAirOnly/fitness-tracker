import test from 'node:test';
import assert from 'node:assert/strict';
import {compareLiftSet,compareLiftSessions,repRangeProgress,latestTopSetComparison} from '../lifting-progression-model.js';

test('same-load repetitions compare equal positions without editing source sets',()=>{
 const old=[{weight:100,reps:9},{weight:95,reps:8}];
 const now=[{weight:100,reps:11},{weight:95,reps:8}];
 const original=structuredClone(now);
 const result=compareLiftSessions(now,old,'lb');
 assert.equal(result[0].setNumber,1);
 assert.equal(result[0].comparison.label,'Same weight · +2 reps');
 assert.equal(result[0].comparison.direction,'up');
 assert.equal(result[1].comparison.direction,'same');
 assert.deepEqual(now,original);
 assert.equal(compareLiftSet({weight:100,reps:9},{weight:100,reps:11}).direction,'down');
 assert.equal(compareLiftSet({weight:0,reps:12},{weight:0,reps:10}).label,'Same weight · +2 reps');
});
test('weight/rep tradeoffs stay descriptive rather than claiming a strength PR',()=>{
 const mixed=compareLiftSet({weight:110,reps:8},{weight:100,reps:12},'lb');
 assert.equal(mixed.direction,'mixed');
 assert.match(mixed.label,/Weight \+10 lb · reps −4/);
 assert.equal(compareLiftSet({weight:110,reps:12},{weight:100,reps:12},'lb').direction,'up');
 assert.equal(compareLiftSet({weight:90,reps:8},{weight:100,reps:10},'lb').direction,'down');
 assert.equal(compareLiftSet({weight:101.1,reps:10},{weight:100,reps:10},'kg').label,'Weight +1.1 kg · reps unchanged');
 assert.equal(compareLiftSet(null,{weight:100,reps:10}),null);
 assert.equal(compareLiftSet({weight:100,reps:0},{weight:100,reps:10}),null);
});
test('rep range progression is informational and waits for the planned set count',()=>{
 const set=reps=>({weight:100,reps});
 assert.equal(repRangeProgress([set(12)],{min:8,max:12,plannedSets:2}).status,'in-progress');
 const topped=repRangeProgress([set(12),set(12)],{min:8,max:12,plannedSets:2});
 assert.equal(topped.status,'range-top');
 assert.match(topped.detail,/No weight is changed automatically/);
 assert.equal(repRangeProgress([set(11),set(10)],{min:8,max:12,plannedSets:2}).status,'in-range');
 assert.equal(repRangeProgress([set(7),set(10)],{min:8,max:12,plannedSets:2}).status,'below');
 assert.equal(repRangeProgress([set(16),set(15)],{min:10,max:16,plannedSets:2}).status,'in-range');
 assert.equal(repRangeProgress([], {min:8,max:12,plannedSets:2}).status,'not-started');
 assert.equal(repRangeProgress([set(10)],{min:12,max:8,plannedSets:2}),null);
});
test('recent top sets use historical sessions without assuming same weight means equal effort',()=>{
 const latest={sets:[{weight:95,reps:12},{weight:100,reps:10}]};
 const previous={sets:[{weight:100,reps:9},{weight:90,reps:11}]};
 const comparison=latestTopSetComparison(latest,previous);
 assert.deepEqual(comparison.current,{weight:100,reps:10});
 assert.equal(comparison.comparison.label,'Same weight · +1 reps');
 assert.equal(latestTopSetComparison(latest,{sets:[]}),null);
});
