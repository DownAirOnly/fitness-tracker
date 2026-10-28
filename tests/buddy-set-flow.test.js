import test from 'node:test';
import assert from 'node:assert/strict';
import {nextBuddySetDraft,canUndoBuddyTransition} from '../buddy-set-model.js';

const exercise=(sets=[])=>({name:'Abdominal Crunch',equipment:'machine',status:'active',sets});
const key='abdominal crunch|machine';
const session=(label,options={})=>{
 const e=exercise(options.sets??[]);
 if(options.running)e.activeSetStartedAt='2026-10-28T12:00:00Z';
 if(Number.isInteger(options.review))e.reviewSetIndex=options.review;
 return {phase:options.phase||'exercise',selected:options.selected===undefined?key:options.selected,
  exercises:[e],undo:label?{label,selected:options.undoSelected===undefined?key:options.undoSelected}:null};
};

test('first set uses previous same-numbered set, while next sets follow current workout',()=>{
 const prior={sets:[{weight:100,reps:12,difficulty:3},{weight:90,reps:10,difficulty:5}]};
 const e=exercise([]);
 assert.deepEqual(nextBuddySetDraft(e,0,prior),{weight:100,reps:12,difficulty:3});
 e.sets.push({weight:110,reps:9,difficulty:4});
 assert.deepEqual(nextBuddySetDraft(e,1,prior),{weight:110,reps:9,difficulty:4});
 e.sets.push({weight:115,reps:8,difficulty:5});
 assert.deepEqual(nextBuddySetDraft(e,2,prior),{weight:115,reps:8,difficulty:5});
 assert.equal(prior.sets[1].weight,90,'previous workout is unchanged');
});
test('review edits to a completed current set are used without changing historical data',()=>{
 const prior={sets:[{weight:100,reps:12},{weight:90,reps:10}]};
 const e=exercise([{weight:110,reps:11}]);
 e.sets[0].weight=120;
 assert.equal(nextBuddySetDraft(e,1,prior).weight,120);
 assert.deepEqual(nextBuddySetDraft(exercise([]),0,null),{weight:0,reps:8,difficulty:0});
 assert.equal(nextBuddySetDraft(exercise([]),2,prior).weight,90);
});
test('Undo start only appears on the matching running set, not after completion or navigation',()=>{
 const active=session('start set 1',{running:true});
 assert.equal(canUndoBuddyTransition(active),true);
 active.exercises[0].activeSetStartedAt=null;active.exercises[0].reviewSetIndex=0;active.exercises[0].sets=[{weight:110,reps:9}];
 assert.equal(canUndoBuddyTransition(active),false);
 active.phase='picker';active.selected=null;
 assert.equal(canUndoBuddyTransition(active),false);
});
test('Undo finish and start next set are available only at their immediate transitions',()=>{
 const review=session('finish set 1',{review:0,sets:[{weight:110,reps:9}]});
 assert.equal(canUndoBuddyTransition(review),true);
 review.exercises[0].reviewSetIndex=undefined;review.exercises[0].activeSetStartedAt='now';
 assert.equal(canUndoBuddyTransition(review),false);
 review.undo.label='start next set';
 assert.equal(canUndoBuddyTransition(review),true);
 review.exercises[0].activeSetStartedAt=null;
 assert.equal(canUndoBuddyTransition(review),false);
});
test('undo exercise and workout transitions are contextual',()=>{
 const ready=session('start exercise',{sets:[]});assert.equal(canUndoBuddyTransition(ready),true);
 ready.exercises[0].sets=[{weight:100,reps:8}];assert.equal(canUndoBuddyTransition(ready),false);
 const done=session('finish exercise',{phase:'picker',selected:null,sets:[{weight:100,reps:8}]});done.exercises[0].status='done';
 assert.equal(canUndoBuddyTransition(done),true);
 done.selected=key;assert.equal(canUndoBuddyTransition(done),false);
 const bike=session('bike finished',{phase:'picker',selected:null});
 bike.bikeCompletedAt='now';assert.equal(canUndoBuddyTransition(bike),true);
 bike.phase='exercise';assert.equal(canUndoBuddyTransition(bike),false);
});
