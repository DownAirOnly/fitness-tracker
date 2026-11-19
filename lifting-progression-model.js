// v153 — read-only, set-for-set lifting comparisons.
// No automatic weight changes, inferred PRs, or transformations of historical logs.
const finiteSet=set=>set&&Number.isFinite(set.weight)&&set.weight>=0&&Number.isInteger(set.reps)&&set.reps>=1;
const delta=(value,digits=1)=>Number(Math.abs(value).toFixed(digits)).toString();
const signed=(value,unit)=>value===0?'unchanged':(value>0?'+':'−')+delta(value)+(unit?' '+unit:'');
export function compareLiftSet(current,previous,unit='lb'){
 if(!finiteSet(current)||!finiteSet(previous))return null;
 const weightChange=Math.abs(current.weight-previous.weight)<0.000001?0:current.weight-previous.weight;
 const repsChange=current.reps-previous.reps;
 let label='',direction='mixed';
 if(weightChange===0){
  if(repsChange===0){label='Matched previous set';direction='same';}
  else {label='Same weight · '+signed(repsChange,'reps');direction=repsChange>0?'up':'down';}
 }else{
  const weight='Weight '+signed(weightChange,unit);
  const reps='reps '+signed(repsChange,'');
  label=weight+' · '+reps;
  if((weightChange>0&&repsChange>=0)||(weightChange>=0&&repsChange>0))direction='up';
  else if(weightChange<0&&repsChange<=0)direction='down';
  else direction='mixed';
 }
 return {label,direction,weightChange,repsChange};
}
export function compareLiftSessions(currentSets,previousSets,unit='lb'){
 return (Array.isArray(currentSets)?currentSets:[]).map((set,index)=>({
  setNumber:index+1,comparison:compareLiftSet(set,(previousSets||[])[index],unit)
 })).filter(row=>row.comparison);
}
export function repRangeProgress(sets,{min,max,plannedSets=2}={}){
 if(!Number.isInteger(min)||!Number.isInteger(max)||min<1||max<min||max>100||
  !Number.isInteger(plannedSets)||plannedSets<1||plannedSets>10)return null;
 const completed=(Array.isArray(sets)?sets:[]).filter(finiteSet);
 if(!completed.length)return {status:'not-started',label:'No sets logged yet',detail:''};
 const inRange=completed.filter(s=>s.reps>=min&&s.reps<=max).length;
 const below=completed.filter(s=>s.reps<min).length,above=completed.filter(s=>s.reps>max).length;
 const counts={completed:completed.length,inRange,below,above};
 if(below)return {status:'below',label:below+' set'+(below===1?'':'s')+' below '+min+' reps',
  detail:'Review load, technique and fatigue before changing anything.',...counts};
 if(completed.length<plannedSets)return {status:'in-progress',label:completed.length+'/'+plannedSets+' planned sets',
  detail:'Complete your planned sets before evaluating progression.',...counts};
 if(completed.slice(0,plannedSets).every(s=>s.reps>=max))return {status:'range-top',label:'Top of '+min+'–'+max+' on all planned sets',
  detail:'If form and effort were controlled, consider a small weight increase next time. No weight is changed automatically.',...counts};
 return {status:'in-range',label:inRange+' set'+(inRange===1?'':'s')+' in '+min+'–'+max,
  detail:above?'Some sets exceeded the upper target. Review consistency before progressing.':
   'Build reps toward the top of the range before increasing load.',...counts};
}
export function latestTopSetComparison(latest,previous,unit='lb'){
 const best=lift=>{
  const sets=(lift?.sets||[]).filter(finiteSet);
  if(!sets.length)return null;
  return [...sets].sort((a,b)=>b.weight-a.weight||b.reps-a.reps)[0];
 };
 const current=best(latest),prior=best(previous);
 if(!current||!prior)return null;
 return {current,previous:prior,comparison:compareLiftSet(current,prior,unit)};
}
