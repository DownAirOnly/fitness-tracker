// v128 — Set defaults and safe, bounded multi-step Undo.
// Navigation to the exercise list is not a workout action and must not
// consume a reversible set. Finalizing the most recent exercise is reversible
// until the whole workout is saved.
export function nextBuddySetDraft(exercise,index,previousWorkout=null){
 const current=Array.isArray(exercise?.sets)?exercise.sets:[];
 const previous=Array.isArray(previousWorkout?.sets)?previousWorkout.sets:[];
 const source=current[index-1]||previous[index]||previous.at(-1)||{weight:0,reps:8};
 return {weight:Number(source.weight)||0,reps:Number(source.reps)||8,difficulty:Number(source.difficulty)||0};
}
const keyFor=e=>e?String(e.name||'').toLowerCase()+'|'+String(e.equipment||'other'):'';

export function canUndoBuddyTransition(session){
 if(!session)return false;
 const undo=(Array.isArray(session.undoStack)?session.undoStack.at(-1):null)||session.undo;
 const label=undo?.label;
 if(!label)return false;
 const before=undo.exercises||[],now=session.exercises||[];
 const beforeByKey=new Map(before.map(e=>[keyFor(e),e]));
 // Undo must never roll back a *different* finalized exercise.
 const completionTarget=label==='finish exercise'?undo.selected:null;
 if(now.some(e=>e.status==='done'&&
   (keyFor(e)!==completionTarget&&beforeByKey.get(keyFor(e))?.status!=='done')))return false;

 const phase=session.phase,key=session.selected;
 const target=undo.selected,current=now.find(e=>keyFor(e)===target),
  previous=beforeByKey.get(target);
 const onExercise=phase==='exercise'&&key===target;
 const onPicker=phase==='picker'&&!key;
 if(label==='bike finished')return onPicker&&Boolean(session.bikeCompletedAt);
 // Compatibility: sessions recorded before v128 may have an extra navigation
 // snapshot. They can still step back without damaging existing set history.
 if(label==='view exercises')return onPicker&&undo.phase==='exercise'&&current?.status==='active';

 if(label==='finish exercise'){
  // The last finalized exercise is recoverable, even if it completed the
  // routine. Undo restores its set-review screen and un-finalizes its lift.
  return (onPicker||(phase==='complete'&&!key))&&
   undo.phase==='exercise'&&previous?.status==='active'&&
   current?.status==='done'&&current.sets.length===previous.sets.length;
 }

 // Moving to Exercises is presentation-only. The latest set action must
 // remain reversible from the picker without first undoing the navigation.
 if(!onExercise&&!onPicker)return false;
 if(label==='start exercise'){
  if(!current||!previous||current.status!=='active'||
    current.activeSetStartedAt||Number.isInteger(current.reviewSetIndex))return false;
  return current.sets.length===previous.sets.length&&
   (undo.phase==='picker'||!undo.phase);
 }
 if(!current||current.status!=='active'||target===undefined)return false;
 const started=Boolean(current.activeSetStartedAt);
 if(label==='start next set')return started&&current.sets.length>0&&!Number.isInteger(current.reviewSetIndex);
 const startedSet=/^start set (\d+)$/.exec(label);
 if(startedSet)return started&&current.sets.length===Number(startedSet[1])-1&&!Number.isInteger(current.reviewSetIndex);
 const finishedSet=/^finish set (\d+)$/.exec(label);
 if(finishedSet)return !started&&Number.isInteger(current.reviewSetIndex)&&
  current.reviewSetIndex===Number(finishedSet[1])-1&&current.sets.length===Number(finishedSet[1]);
 return false;
}
