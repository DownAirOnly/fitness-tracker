// v103: Workout Buddy set defaults and bounded multi-step undo visibility.
// A finalized exercise is never reversed by Undo.
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
 if(!label||label==='finish exercise')return false;
 // Never replace an already finalized exercise with an earlier snapshot.
 const completed=(session.exercises||[]).filter(e=>e.status==='done');
 const previous=undo.exercises||[];
 if(completed.some(e=>!previous.some(old=>keyFor(old)===keyFor(e)&&old.status==='done')))return false;
 const phase=session.phase,key=session.selected;
 const current=(session.exercises||[]).find(e=>keyFor(e)===key);
 if(label==='bike finished')return phase==='picker'&&!key&&Boolean(session.bikeCompletedAt);
 if(label==='view exercises'){
  const prev=(session.exercises||[]).find(e=>keyFor(e)===undo.selected);
  return phase==='picker'&&!key&&undo.phase==='exercise'&&prev?.status==='active';
 }
 if(label==='start exercise'){
  return phase==='exercise'&&current?.status==='active'&&
   !current.activeSetStartedAt&&!Number.isInteger(current.reviewSetIndex)&&current.sets.length===0;
 }
 if(phase!=='exercise'||!current||undo.selected!==key)return false;
 const started=Boolean(current.activeSetStartedAt);
 if(label==='start next set')return started&&current.sets.length>0&&!Number.isInteger(current.reviewSetIndex);
 const start=/^start set (\d+)$/.exec(label);
 if(start)return started&&current.sets.length===Number(start[1])-1&&!Number.isInteger(current.reviewSetIndex);
 const finished=/^finish set (\d+)$/.exec(label);
 if(finished)return !started&&Number.isInteger(current.reviewSetIndex)&&
  current.reviewSetIndex===Number(finished[1])-1&&current.sets.length===Number(finished[1]);
 return false;
}
