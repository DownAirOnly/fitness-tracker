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
 assert.equal(canUndoBuddyTransition(done),false,'completed exercises are never undoable');
 done.selected=key;assert.equal(canUndoBuddyTransition(done),false);
 const bike=session('bike finished',{phase:'picker',selected:null});
 bike.bikeCompletedAt='now';assert.equal(canUndoBuddyTransition(bike),true);
 bike.phase='exercise';assert.equal(canUndoBuddyTransition(bike),false);
});

test('multi-step Undo is available through unfinished selections and restores navigation',()=>{
 const before=exercise([]);before.status='pending';
 const active=exercise([]);
 const state={phase:'exercise',selected:key,exercises:[active],undoStack:[
  {label:'bike finished',phase:'bike',selected:null,exercises:[before]},
  {label:'start exercise',phase:'picker',selected:null,exercises:[before]}
 ]};
 assert.equal(canUndoBuddyTransition(state),true,'the last navigation step can be undone');
 active.activeSetStartedAt='now';
 state.undoStack.push({label:'start set 1',phase:'exercise',selected:key,exercises:[exercise([])]});
 assert.equal(canUndoBuddyTransition(state),true,'an active timed set can be undone');
 state.exercises[0].activeSetStartedAt=undefined;
 state.undoStack.pop();
 assert.equal(canUndoBuddyTransition(state),true,'the preceding start exercise remains undoable');
 state.undoStack=[{label:'view exercises',phase:'exercise',selected:key,exercises:[exercise([])]}];
 state.phase='picker';state.selected=null;
 assert.equal(canUndoBuddyTransition(state),true,'Undo can return from chooser to prior unfinished exercise');
});
test('Undo never changes a finalized exercise, including old or stale snapshots',()=>{
 const current=exercise([{weight:100,reps:8}]);current.status='done';
 const earlier=exercise([]);earlier.status='pending';
 const state={phase:'picker',selected:null,exercises:[current],undoStack:[
  {label:'view exercises',phase:'exercise',selected:key,exercises:[earlier]}
 ]};
 assert.equal(canUndoBuddyTransition(state),false,'stale snapshot cannot delete finalized sets');
 state.undoStack=[{label:'finish exercise',selected:key,exercises:[earlier]}];
 assert.equal(canUndoBuddyTransition(state),false,'legacy finish-exercise undo is blocked');
});

test('Undo stays available for an accidentally finished second set after opening Exercises',()=>{
 const first={weight:110,reps:9},second={weight:100,reps:8};
 const before=exercise([first]);before.activeSetStartedAt='2026-11-09T12:01:00Z';
 const duringReview=exercise([first,second]);duringReview.reviewSetIndex=1;
 const state={phase:'picker',selected:null,exercises:[duringReview],undoStack:[
  {label:'start set 2',phase:'exercise',selected:key,exercises:[exercise([first])]},
  {label:'finish set 2',phase:'exercise',selected:key,exercises:[before]}
 ]};
 assert.equal(canUndoBuddyTransition(state),true,'going to Exercises is not an Undo boundary');
 const reloaded=JSON.parse(JSON.stringify(state));
 assert.equal(canUndoBuddyTransition(reloaded),true,'same Undo works after PWA reload and restoration');
 reloaded.exercises[0].sets=[first];
 reloaded.exercises[0].activeSetStartedAt='now';
 delete reloaded.exercises[0].reviewSetIndex;
 reloaded.phase='exercise';reloaded.selected=key;
 reloaded.undoStack.pop();
 assert.equal(canUndoBuddyTransition(reloaded),true,'next Undo also reverses accidentally started second set');
});

test('Undo can reverse just the latest exercise finalization and protect prior completed exercises',()=>{
 const previousDone={...exercise([{weight:160,reps:8}]),name:'Chest Press',status:'done'};
 const reviewed=exercise([{weight:100,reps:10},{weight:95,reps:8}]);reviewed.reviewSetIndex=1;
 const finalized={...exercise(reviewed.sets),status:'done'};
 const snapshot={label:'finish exercise',phase:'exercise',selected:key,
  exercises:[previousDone,reviewed]};
 const state={phase:'picker',selected:null,exercises:[previousDone,finalized],
  undoStack:[snapshot]};
 assert.equal(canUndoBuddyTransition(state),true,'latest completed exercise can be un-finalized');
 state.phase='complete';assert.equal(canUndoBuddyTransition(state),true,'even when it completes the last routine exercise');
 state.exercises.push({...exercise([{weight:60,reps:12}]),name:'Lat Pulldown',status:'done'});
 assert.equal(canUndoBuddyTransition(state),false,'a stale snapshot never removes a later finalized exercise');
 state.exercises.pop();
 state.undoStack[0].exercises[0].status='pending';
 assert.equal(canUndoBuddyTransition(state),false,'cannot erase prior completed exercise history');
});

test('exercise-selection snapshots retain a target even when returning to the picker',()=>{
 const pending=exercise([]);pending.status='pending';
 const current=exercise([]);
 const state={phase:'picker',selected:null,exercises:[current],undoStack:[
  {label:'start exercise',target:key,phase:'picker',selected:null,exercises:[pending]}
 ]};
 assert.equal(canUndoBuddyTransition(state),true);
 state.exercises[0].activeSetStartedAt='now';
 assert.equal(canUndoBuddyTransition(state),false,'selection Undo must not throw away a started set');
});
