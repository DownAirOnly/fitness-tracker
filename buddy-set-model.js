// v92: Workout Buddy set defaults and contextual undo visibility.
// Pure helpers: no changes to workout history or notebook persistence.
export function nextBuddySetDraft(exercise,index,previousWorkout=null){
 const current=Array.isArray(exercise?.sets)?exercise.sets:[];
 const previous=Array.isArray(previousWorkout?.sets)?previousWorkout.sets:[];
 // A completed set in this session always wins over the same numbered old set.
 const source=current[index-1]||previous[index]||previous.at(-1)||{weight:0,reps:8};
 return {weight:Number(source.weight)||0,reps:Number(source.reps)||8,difficulty:Number(source.difficulty)||0};
}
const keyFor=e=>e?String(e.name||'').toLowerCase()+'|'+String(e.equipment||'other'):'';
export function canUndoBuddyTransition(session){
 const undo=session?.undo,label=undo?.label;
 if(!label)return false;
 const phase=session.phase,key=session.selected;
 const current=(session.exercises||[]).find(e=>keyFor(e)===key);
 if(label==='bike finished')return phase==='picker'&&!key&&Boolean(session.bikeCompletedAt);
 if(label==='start exercise'){
  return phase==='exercise'&&current?.status==='active'&&
   !current.activeSetStartedAt&&!Number.isInteger(current.reviewSetIndex)&&current.sets.length===0;
 }
 if(label==='finish exercise'){
  const completed=(session.exercises||[]).find(e=>keyFor(e)===undo.selected);
  return (phase==='picker'||phase==='complete')&&!key&&completed?.status==='done';
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
