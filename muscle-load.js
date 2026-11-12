/* Read-only muscle workload estimates. A primary set counts as 1 direct set;
   supporting muscles count as 0.5 equivalent sets. No training targets inferred. */
import {exerciseMuscleProfile} from './muscle-map.js?v=138';
const normalize=(value)=>String(value||'').trim().toLowerCase();
export function addMuscleSets(target,name,sets=0){
 const profile=exerciseMuscleProfile(name),number=Number(sets);
 if(!profile||!Number.isFinite(number)||number<=0)return target;
 for(const [ids,role,weight] of [[profile.primary,'direct',1],[profile.secondary,'supporting',0.5]]){
  for(const id of ids){
   const entry=target[id]||(target[id]={direct:0,supporting:0,effective:0});
   entry[role]+=number;entry.effective+=number*weight;
  }
 }
 return target;
}
function confirmedSetCount(exercise){
 const count=exercise?.sets?.length||0,reviewIndex=exercise?.reviewSetIndex;
 return Number.isInteger(reviewIndex)?Math.min(count,Math.max(0,reviewIndex)):count;
}
export function completedMuscleSets(lifts,active=null,from='',through=''){
 const result={};
 const validDate=date=>(!from||date>=from)&&(!through||date<=through);
 const recorded=new Set();
 for(const item of lifts||[]){
  if(!validDate(item.date))continue;
  addMuscleSets(result,item.exercise,item.sets?.length||0);
  if(item.buddySessionId){
   const base=item.buddySessionId+'|'+normalize(item.exercise);
   recorded.add(base+'|'+normalize(item.equipment||'other'));
   // Legacy Buddy lifts without an equipment field must not be counted again
   // as an active exercise of the same name from the same session.
   if(!item.equipment)recorded.add(base+'|*');
  }
 }
 if(active&&validDate(active.date)){
  for(const e of active.exercises||[]){
   const base=active.id+'|'+normalize(e.name);
   if(recorded.has(base+'|'+normalize(e.equipment||'other'))||recorded.has(base+'|*'))continue;
   addMuscleSets(result,e,confirmedSetCount(e));
  }
 }
 return result;
}
export function plannedMuscleSets(exercises=[]){
 const result={};
 for(const e of exercises)addMuscleSets(result,e,Math.max(0,Number(e.targetSets)||0));
 return result;
}
export function activeMuscleSets(active){
 const result={};
 for(const e of active?.exercises||[])addMuscleSets(result,e,confirmedSetCount(e));
 return result;
}
