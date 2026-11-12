import {emptyData,id,normalizeData,parseCSV} from './data.js?v=142';
import {mergeMissingExerciseMeta,normalizeExerciseMeta,normalizeRoutineCue} from './exercise-import-meta.js?v=142';

const equipmentTypes=new Set(['machine','cable','dumbbell','bench','calisthenics','other']);
const normalizeName=value=>String(value||'').trim().replace(/\s+/g,' ').toLowerCase();
const exerciseKey=(name,equipment)=>normalizeName(name)+'|'+equipment;
const number=(text,label,{min=0,max=Infinity,integer=false,fallback=null}={})=>{
 if(text===''||text==null){if(fallback!=null)return fallback;throw Error(label+' is required.');}
 const v=Number(text);
 if(!Number.isFinite(v)||v<min||v>max||(integer&&!Number.isInteger(v)))throw Error(label+' is invalid.');
 return v;
};
function parseProfile(get){
 const meta={};
 if(get('movement'))meta.movement=get('movement').toLowerCase();
 if(get('movementPattern'))meta.pattern=get('movementPattern').toLowerCase();
 if(get('primaryMuscles'))meta.primaryMuscles=get('primaryMuscles').split('|').map(x=>x.trim()).filter(Boolean);
 if(get('secondaryMuscles'))meta.secondaryMuscles=get('secondaryMuscles').split('|').map(x=>x.trim()).filter(Boolean);
 if(get('safetyNote'))meta.safetyNote=get('safetyNote');
 return normalizeExerciseMeta(meta);
}
export function parseRoutineCSV(text){
 const lines=parseCSV(String(text||'').replace(/^\uFEFF/,''));
 if(!lines.length)throw Error('The routine CSV is empty.');
 const headers=lines.shift().map(x=>x.trim().toLowerCase());
 const idx=new Map(headers.map((h,i)=>[h,i]));
 if(!['recordtype','exercise','equipment'].every(h=>idx.has(h))||!idx.has('workout'))
  throw Error('Choose a routine CSV with recordType, workout, exercise and equipment columns.');
 if(lines.length>400)throw Error('Routine CSV cannot exceed 400 rows.');
 const definitions=new Map(),routines=new Map(),errors=[];
 const getFrom=(row,name)=>String(row[idx.get(name.toLowerCase())]??'').trim();
 for(const [i,row]of lines.entries()){
  const line=i+2,get=name=>idx.has(name.toLowerCase())?getFrom(row,name):'';
  try{
   if(row.every(x=>!String(x??'').trim()))continue;
   if(row.length>headers.length)throw Error('Too many columns.');
   const kind=get('recordType').toLowerCase().replace(/[\s_-]/g,'');
   if(!['exercise','exercisedefinition','workout','workouttemplate'].includes(kind))
    throw Error('Only exercise and workout rows are allowed in a routine import.');
   const name=get('exercise')||get('name'),equipment=(get('equipment')||'other').toLowerCase();
   if(!name||name.length>100)throw Error('Exercise name is missing or too long.');
   if(!equipmentTypes.has(equipment))throw Error('Unsupported equipment type.');
   const key=exerciseKey(name,equipment);
   let def=definitions.get(key);
   if(!def){
    def={key,name,equipment,importedId:get('id'),setup:'',notes:'',meta:undefined};
    definitions.set(key,def);
   }
   const meta=parseProfile(get);
   def.meta=mergeMissingExerciseMeta(def.meta,meta);
   const newSetup=get('setup'),newNotes=get('notes');
   if(newSetup.length>200||newNotes.length>500)throw Error('Setup or exercise notes are too long.');
   if(kind==='exercise'||kind==='exercisedefinition'){
    if(newSetup)def.setup=newSetup;
    if(newNotes)def.notes=newNotes;
    if(get('id'))def.importedId=get('id');
    continue;
   }
   const workout=get('workout');
   if(!workout||workout.length>80)throw Error('Workout name is missing or too long.');
   const workoutKey=normalizeName(workout),rawWorkoutId=get('workoutId'),color=get('routineColor');
   const weekday=get('weekday')===''?null:number(get('weekday'),'Weekday',{min:0,max:6,integer:true});
   if(color&&!/^#[0-9a-f]{6}$/i.test(color))throw Error('Routine color must be a six-digit hex color.');
   const order=number(get('order'),'Exercise order',{min:1,max:1000,integer:true,fallback:line});
   const repMin=number(get('repMin'),'Min reps',{min:1,max:100,integer:true,fallback:6});
   const repMax=number(get('repMax'),'Max reps',{min:1,max:100,integer:true,fallback:12});
   const targetSets=number(get('targetSets'),'Sets',{min:1,max:10,integer:true,fallback:2});
   const restSeconds=number(get('restSeconds'),'Rest',{min:0,max:1800,integer:true,fallback:90});
   if(repMax<repMin)throw Error('Max reps cannot be less than min reps.');
   const cue=normalizeRoutineCue(get('routineCue'));
   let routine=routines.get(workoutKey);
   if(!routine){
    routine={key:workoutKey,id:rawWorkoutId,name:workout,color:color||'',weekday,items:[],orders:new Set(),usedExercises:new Set()};
    routines.set(workoutKey,routine);
   }
   if(routine.id&&rawWorkoutId&&routine.id!==rawWorkoutId)throw Error('Rows for '+workout+' have conflicting workoutId values.');
   if(!routine.id)routine.id=rawWorkoutId;
   if(color&&routine.color&&color.toLowerCase()!==routine.color.toLowerCase())throw Error('Rows for '+workout+' have conflicting colors.');
   if(color)routine.color=color;
   if(weekday!==null&&routine.weekday!==null&&weekday!==routine.weekday)throw Error('Rows for '+workout+' have conflicting weekdays.');
   if(routine.weekday===null)routine.weekday=weekday;
   if(routine.usedExercises.has(key))throw Error('Duplicate exercise in '+workout+'.');
   if(routine.orders.has(order))throw Error('Duplicate exercise order in '+workout+'.');
   routine.usedExercises.add(key);routine.orders.add(order);
   routine.items.push({key,order,repMin,repMax,targetSets,restSeconds,...(cue?{cue}:{})});
  }catch(error){errors.push('Row '+line+': '+error.message);}
 }
 if(!routines.size&&!errors.length)errors.push('No workout rows were found.');
 if(routines.size>100||definitions.size>10000)errors.push('Routine import exceeds library limits.');
 for(const w of routines.values())w.items.sort((a,b)=>a.order-b.order);
 return{definitions:[...definitions.values()],routines:[...routines.values()].map(({orders,usedExercises,...item})=>item),errors};
}
const uniqueRoutineName=(base,used)=>{
 let candidate=base,n=2;
 while(used.has(normalizeName(candidate)))candidate=base+' (Imported '+n+++')';
 used.add(normalizeName(candidate));return candidate;
};
export function prepareRoutineImport(text,current,options={}){
 const source=parseRoutineCSV(text),errors=[...source.errors],warnings=[],candidate=structuredClone(current);
 const matches=options.exerciseMatches||{},actions=options.routineActions||{},applySchedule=options.applySchedule===true;
 const currentDefs=candidate.exerciseDefinitions||[],currentRoutines=candidate.workoutTemplates||[];
 const existingIds=new Set(currentDefs.map(x=>x.id)),existingRoutineIds=new Set(currentRoutines.map(x=>x.id));
 const byExerciseKey=new Map(currentDefs.map(def=>[exerciseKey(def.name,def.equipment),def]));
 const byExerciseId=new Map(currentDefs.map(def=>[def.id,def]));
 const byRoutineKey=new Map(currentRoutines.map(w=>[normalizeName(w.name),w]));
 const byRoutineId=new Map(currentRoutines.map(w=>[w.id,w]));
 const usedRoutineNames=new Set(currentRoutines.map(w=>normalizeName(w.name)));
 const exerciseMap=new Map(),exercisePreview=[],routinePreview=[],schedulePreview=[];
 let createdExercises=0,reusedExercises=0,enrichedExercises=0,reclassifiedExercises=0,createdRoutines=0,updatedRoutines=0,unchangedRoutines=0;
 const usedNewExerciseIds=new Set(),touchedRoutineIds=new Set();
 for(const def of source.definitions){
  const exact=byExerciseKey.get(def.key),choice=matches[def.key];
  let prior=exact||null,reclassify=false,oldEquipment='';
  if(choice!==undefined){
   if(choice==='new'){if(exact)errors.push('Cannot create a duplicate '+def.name+' ('+def.equipment+').');prior=null;}
   else if(choice.startsWith('reclassify:')){
    prior=byExerciseId.get(choice.slice('reclassify:'.length))||null;
    if(!prior||normalizeName(prior.name)!==normalizeName(def.name)||exact&&exact.id!==prior.id)
     errors.push('Equipment reclassification must target the same named exercise without a duplicate.');
    else if(prior.equipment!==def.equipment){reclassify=true;oldEquipment=prior.equipment;}
   }else{
    prior=byExerciseId.get(choice)||null;
    if(!prior||prior.equipment!==def.equipment)errors.push('Invalid exercise match for '+def.name+' ('+def.equipment+').');
   }
  }
  if(prior){
   exerciseMap.set(def.key,prior.id);reusedExercises++;
   if(reclassify){
    prior.equipment=def.equipment;reclassifiedExercises++;
    warnings.push('Changing '+def.name+' from '+oldEquipment+' to '+def.equipment+' updates the saved exercise. Historical lift equipment and weights stay unchanged.');
   }
   const merged=mergeMissingExerciseMeta(prior.meta,def.meta);
   let enriched=false;
   if(JSON.stringify(prior.meta||null)!==JSON.stringify(merged||null)){prior.meta=merged;enriched=true;enrichedExercises++;}
   // Never import over a person's machine setup or shared exercise notes.
   exercisePreview.push({key:def.key,name:def.name,equipment:def.equipment,matchId:prior.id,matchName:prior.name,action:reclassify?'reclassify':enriched?'enrich':'reuse',exact:prior.id===exact?.id,oldEquipment,meta:merged||def.meta});
  }else{
   const requested=def.importedId||'';
   const fresh=requested&&!existingIds.has(requested)&&!usedNewExerciseIds.has(requested)?requested:id();
   usedNewExerciseIds.add(fresh);existingIds.add(fresh);
   const newDef={id:fresh,name:def.name,equipment:def.equipment,...(def.setup?{setup:def.setup}:{}),...(def.notes?{notes:def.notes}:{}),...(def.meta?{meta:def.meta}:{})};
   candidate.exerciseDefinitions.push(newDef);exerciseMap.set(def.key,fresh);createdExercises++;
   exercisePreview.push({key:def.key,name:def.name,equipment:def.equipment,matchId:null,matchName:null,action:'create',meta:def.meta});
   if(currentDefs.some(x=>normalizeName(x.name)===normalizeName(def.name)&&x.equipment!==def.equipment))
    warnings.push(def.name+': existing exercise uses different equipment. Created a separate definition instead of merging them.');
  }
 }
 if(candidate.exerciseDefinitions.length>10000)errors.push('Exercise Library cannot exceed 10,000 definitions.');
 for(const routine of source.routines){
  const exact=byRoutineKey.get(routine.key),choice=actions[routine.key];
  let action=choice||(exact?'keep':'create'),prior=null;
  if(action==='keep')prior=exact;
  else if(action.startsWith('update:')){prior=byRoutineId.get(action.slice(7));action='update';}
  else if(action==='update')prior=exact;
  else if(!['create','copy'].includes(action))errors.push('Invalid routine action for '+routine.name+'.');
  if((action==='keep'||action==='update')&&!prior){errors.push('Existing routine not found for '+routine.name+'.');continue;}
  if(prior&&touchedRoutineIds.has(prior.id)){errors.push('Multiple imported routines target '+prior.name+'.');continue;}
  if(prior)touchedRoutineIds.add(prior.id);
  const mapped=routine.items.map(item=>({...item,exerciseId:exerciseMap.get(item.key)}));
  if(mapped.some(x=>!x.exerciseId)||new Set(mapped.map(x=>x.exerciseId)).size!==mapped.length)errors.push('Routine '+routine.name+' has unresolved or duplicate exercise matches.');
  const entries=mapped.map(({key,order,...item})=>item);
  let resultingId=prior?.id;
  let name=prior?.name||routine.name;
  if(action==='create'||action==='copy'){
   if(candidate.workoutTemplates.length>=100){errors.push('Routine Library cannot exceed 100 routines.');continue;}
   resultingId=routine.id&&!existingRoutineIds.has(routine.id)?routine.id:id();
   existingRoutineIds.add(resultingId);
   name=uniqueRoutineName(routine.name,usedRoutineNames);
   candidate.workoutTemplates.push({id:resultingId,name,...(routine.color?{color:routine.color}:{}),exercises:entries});createdRoutines++;
  }else if(action==='update'){
   const old=structuredClone(prior);
   prior.exercises=entries;
   // Existing routine names, IDs, colors, and unrelated records are retained.
   if(JSON.stringify(old)!==JSON.stringify(prior))updatedRoutines++;else unchangedRoutines++;
   if(current.activeWorkout?.workoutId===prior.id)
    warnings.push(prior.name+' is currently active. The active session remains unchanged; the saved routine will update for future sessions.');
  }else unchangedRoutines++;
  routinePreview.push({key:routine.key,sourceName:routine.name,name,action,id:resultingId,existingId:exact?.id||null,previousCount:prior?.exercises.length||0,incomingCount:entries.length,weekday:routine.weekday});
  if(routine.weekday!==null)schedulePreview.push({day:routine.weekday,routineId:resultingId,name});
 }
 if(schedulePreview.length){
  const days=new Set();
  for(const entry of schedulePreview){
   if(days.has(entry.day))errors.push('Multiple imported routines are assigned to the same weekday.');
   days.add(entry.day);
  }
  if(applySchedule&&!errors.length){
   const changedDays=new Set(schedulePreview.map(x=>x.day));
   candidate.workoutSchedule=[...(candidate.workoutSchedule||[]).filter(x=>!changedDays.has(x.day)),...schedulePreview.map(({day,routineId})=>({day,routineId}))].sort((a,b)=>a.day-b.day);
  }
 }
 const originalHistory=JSON.stringify({lifts:current.lifts,workoutHistory:current.workoutHistory,activeWorkout:current.activeWorkout,settings:current.settings,preferences:current.preferences});
 const candidateHistory=JSON.stringify({lifts:candidate.lifts,workoutHistory:candidate.workoutHistory,activeWorkout:candidate.activeWorkout,settings:candidate.settings,preferences:candidate.preferences});
 if(originalHistory!==candidateHistory)errors.push('Import attempted to change protected settings or workout history.');
 let normalized=null;
 if(!errors.length)try{normalized=normalizeData(candidate);}catch(error){errors.push(error.message);}
 const changeCount=createdExercises+enrichedExercises+reclassifiedExercises+createdRoutines+updatedRoutines+(applySchedule?schedulePreview.length:0);
 return{kind:'routine-csv',base:JSON.stringify(current),candidate:errors.length?null:normalized,groups:[],errors,warnings,
  exercisePreview,routinePreview,schedulePreview,options:{exerciseMatches:structuredClone(matches),routineActions:structuredClone(actions),applySchedule},
  counts:{createdExercises,reusedExercises,enrichedExercises,reclassifiedExercises,createdRoutines,updatedRoutines,unchangedRoutines},
  added:createdExercises+createdRoutines,replaced:updatedRoutines+enrichedExercises+reclassifiedExercises,unchanged:reusedExercises+unchangedRoutines,
  changeCount,display:{count:changeCount,label:changeCount+' workout import change'+(changeCount===1?'':'s')},
  otherChanges:[],settingChanges:[],promptChanged:false,settings:structuredClone(current.settings),
  currentSettings:structuredClone(current.settings),promptDate:current.promptDate||'',currentPromptDate:current.promptDate||''};
}
