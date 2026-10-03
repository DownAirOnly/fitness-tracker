import {emptyData,normalizeData,parseCSV,id,validDate} from './data.js?v=55';

export const importSections={foods:'Saved Foods',foodEntries:'Food Entries',lifts:'Lifting Entries',weights:'Weight Entries',bodyFat:'Body Fat Entries',notes:'Notes'};
const signature=(key,r)=>JSON.stringify(key==='foods'?[r.name.toLowerCase(),r.calories,r.protein,r.kind||'food',r.tags||[],r.pinned===true,r.accuracy||'']:key==='foodEntries'?[r.date,r.name.toLowerCase(),r.calories,r.protein,r.quantity,r.t??null]:key==='weights'?[r.date,r.value]:key==='bodyFat'?[r.date,r.value]:key==='notes'?[r.date,r.type,r.text,r.t??null]:[r.date,r.exercise.toLowerCase(),r.equipment||'other',r.sets,r.difficulty??null,r.notes??'']);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

// File adapters only parse; all sources feed the same review/candidate pipeline.
const csvEquipment=new Set(['machine','cable','dumbbell','bench','calisthenics','other']);
const csvTypeAliases=new Map([
 ['savedfood','savedFood'],['food','savedFood'],['fooddefinition','savedFood'],
 ['foodlog','foodLog'],['foodentry','foodLog'],['meal','foodLog'],
 ['exercise','exercise'],['exercisedefinition','exercise'],
 ['workout','workout'],['workouttemplate','workout'],
 ['lift','lift'],['lifting','lift'],['liftset','lift'],
 ['weight','weight'],['weighin','weight'],['bodyweight','weight'],
 ['bodyfat','bodyFat'],['bodyfatpercentage','bodyFat'],['fatpercentage','bodyFat'],
 ['note','note'],['daynote','dayNote'],['mealnote','mealNote'],['mealmemory','mealNote']
]);
const csvBool=value=>['1','true','yes','y','on','favorite','pinned'].includes(String(value||'').trim().toLowerCase());
const csvTags=value=>String(value||'').split(/[|;]/).map(x=>x.trim().toLowerCase()).filter(Boolean);
function csvNumber(value,label,{required=true,min=-Infinity,max=Infinity,integer=false}={}){
 const text=String(value??'').trim();if(!text){if(required)throw Error(label+' is required.');return null;}
 const n=Number(text);if(!Number.isFinite(n)||(integer?!Number.isInteger(n):false)||n<min||n>max)throw Error(label+' is invalid.');
 return n;
}
function csvTime(value){
 const text=String(value||'').trim();if(!text)return null;
 if(/^\d+$/.test(text)){const slot=Number(text);if(Number.isInteger(slot)&&slot>=0&&slot<48)return slot;}
 const match=text.match(/^(\d{1,2}):(\d{2})$/);if(!match)throw Error('time must be HH:MM or a 0–47 half-hour slot.');
 const hour=Number(match[1]),minute=Number(match[2]);if(hour>23||![0,30].includes(minute))throw Error('time must use a valid 30-minute slot.');
 return (hour*60+minute)/30;
}
function parseUniversalCSV(text,current){
 const rows=parseCSV(text.replace(/^\uFEFF/,''));
 if(!rows.length)throw Error('The CSV is empty.');
 const headers=rows.shift().map(x=>x.trim().toLowerCase());
 const index=new Map(headers.map((name,i)=>[name,i]));
 const legacy=!index.has('recordtype')&&['date','name','calories','protein'].every(x=>index.has(x));
 if(!legacy&&!index.has('recordtype'))throw Error('Universal CSV needs a recordType column. Legacy food CSVs are still accepted.');
 const raw=emptyData();raw.foods=[];raw.foodEntries=[];raw.lifts=[];raw.weights=[];raw.bodyFat=[];raw.notes=[];raw.exerciseDefinitions=[];raw.workoutTemplates=[];
 const errors=[],warnings=[],workouts=new Map(),liftGroups=new Map();
 const currentExercises=new Map((current.exerciseDefinitions||[]).map(e=>[(e.name.trim().toLowerCase()+'|'+(e.equipment||'other')),e]));
 const importedExercises=new Map();
 const getFrom=(row,...names)=>{for(const name of names){const i=index.get(name.toLowerCase());if(i!=null)return String(row[i]??'').trim();}return '';};
 const exerciseFor=(name,equipment='other')=>{
   const clean=String(name||'').trim(),type=csvEquipment.has(equipment)?equipment:'other',key=clean.toLowerCase()+'|'+type;
   if(!clean)throw Error('exercise is required.');
   const existing=currentExercises.get(key)||importedExercises.get(key);if(existing)return existing;
   const created={id:id(),name:clean,equipment:type};raw.exerciseDefinitions.push(created);importedExercises.set(key,created);return created;
 };
 rows.forEach((row,rowIndex)=>{
  const line=rowIndex+2,get=(...names)=>getFrom(row,...names);
  try{
   const requested=legacy?'foodlog':get('recordType').replace(/[ _-]+/g,'').toLowerCase(),type=csvTypeAliases.get(requested);
   if(!type)throw Error('recordType is not supported.');
   if(type==='savedFood'){
    const name=get('name'),calories=csvNumber(get('calories'),'calories',{min:0}),protein=csvNumber(get('protein'),'protein',{min:0});
    if(!name)throw Error('name is required.');
    const kind=(get('kind')||'food').toLowerCase(),accuracy=(get('accuracy')||'').toLowerCase();if(!['food','drink'].includes(kind))throw Error('kind must be food or drink.');if(!['','label','estimate'].includes(accuracy))throw Error('accuracy must be label, estimate, or blank.');
    const record={id:get('id')||id(),name,calories,protein,kind,tags:csvTags(get('tags')),pinned:csvBool(get('favorite','pinned')),accuracy};
    const lastUsed=get('lastUsed');if(lastUsed)record.lastUsed=lastUsed;raw.foods.push(record);
   }else if(type==='foodLog'){
    const date=get('date'),name=get('name'),calories=csvNumber(get('calories'),'calories',{min:0}),protein=csvNumber(get('protein'),'protein',{min:0}),quantity=csvNumber(get('quantity'),'quantity',{required:false,min:0.000001})??1;
    if(!validDate(date))throw Error('date must be YYYY-MM-DD.');if(!name)throw Error('name is required.');
    const record={id:get('id')||id(),date,name,calories,protein,quantity},time=csvTime(get('time','foodTime'));if(time!=null)record.t=time;raw.foodEntries.push(record);
   }else if(type==='exercise'){
    const name=get('exercise','name'),equipment=(get('equipment')||'other').toLowerCase(),setup=get('setup');if(!name)throw Error('exercise is required.');if(!csvEquipment.has(equipment))throw Error('equipment is invalid.');if(setup.length>200)throw Error('setup is too long.');
    const record={id:get('id')||id(),name,equipment};if(setup)record.setup=setup;raw.exerciseDefinitions.push(record);importedExercises.set(name.toLowerCase()+'|'+equipment,record);
   }else if(type==='workout'){
    const workout=get('workout','workoutName'),exercise=get('exercise','exerciseName'),equipment=(get('equipment')||'other').toLowerCase();if(!workout)throw Error('workout is required.');if(!csvEquipment.has(equipment))throw Error('equipment is invalid.');
    const def=exerciseFor(exercise,equipment),item={exerciseId:def.id,repMin:csvNumber(get('repMin'),'repMin',{required:false,min:1,max:100,integer:true})??6,repMax:csvNumber(get('repMax'),'repMax',{required:false,min:1,max:100,integer:true})??12,targetSets:csvNumber(get('targetSets'),'targetSets',{required:false,min:1,max:10,integer:true})??2,restSeconds:csvNumber(get('restSeconds'),'restSeconds',{required:false,min:0,max:1800,integer:true})??90,order:csvNumber(get('order'),'order',{required:false,min:1,max:1000,integer:true})??line};
    if(item.repMax<item.repMin)throw Error('repMax must be at least repMin.');
    if(!workouts.has(workout.toLowerCase()))workouts.set(workout.toLowerCase(),{id:get('workoutId')||id(),name:workout,items:[]});
    workouts.get(workout.toLowerCase()).items.push(item);
   }else if(type==='lift'){
    const date=get('date'),exercise=get('exercise','name'),equipment=(get('equipment')||'other').toLowerCase(),group=get('group','groupId')||('row-'+line);if(!validDate(date))throw Error('date must be YYYY-MM-DD.');if(!exercise)throw Error('exercise is required.');if(!csvEquipment.has(equipment))throw Error('equipment is invalid.');
    const set={weight:csvNumber(get('weight'),'weight',{min:0}),reps:csvNumber(get('reps'),'reps',{min:1,max:1000,integer:true})},effort=csvNumber(get('effort','difficulty'),'effort',{required:false,min:1,max:7,integer:true});if(effort!=null)set.difficulty=effort;
    const notes=get('notes'),setOrder=csvNumber(get('set','setNumber'),'set',{required:false,min:1,max:1000,integer:true})??line,key=group.toLowerCase();
    if(!liftGroups.has(key))liftGroups.set(key,{id:get('id')||id(),date,exercise,equipment,notes,sets:[]});
    const lift=liftGroups.get(key);if(lift.date!==date||lift.exercise.toLowerCase()!==exercise.toLowerCase()||lift.equipment!==equipment)throw Error('rows sharing a lift group must use the same date, exercise, and equipment.');
    if(notes&&!lift.notes)lift.notes=notes;lift.sets.push({order:setOrder,set});
   }else if(type==='weight'){
    const date=get('date'),value=csvNumber(get('weight','value'),'weight',{required:false,min:0.000001}),bodyFat=csvNumber(get('bodyFatPercent','bodyFat'),'bodyFatPercent',{required:false,min:0.000001,max:100});
    if(!validDate(date))throw Error('date must be YYYY-MM-DD.');
    if(value==null&&bodyFat==null)throw Error('weight or bodyFatPercent is required.');
    if(value!=null)raw.weights.push({id:get('id')||id(),date,value});
    // v49 CSV compatibility: a weight row containing only bodyFatPercent, or both
    // measurements, is split into independent records instead of pairing them.
    if(bodyFat!=null)raw.bodyFat.push({id:value==null?(get('id')||id()):id(),date,value:bodyFat});
   }else if(type==='bodyFat'){
    const date=get('date'),value=csvNumber(get('bodyFatPercent','bodyFat','value'),'bodyFatPercent',{min:0.000001,max:100});
    if(!validDate(date))throw Error('date must be YYYY-MM-DD.');
    raw.bodyFat.push({id:get('id')||id(),date,value});
   }else if(type==='note'||type==='dayNote'||type==='mealNote'){
    const date=get('date'),text=get('text','note','notes');
    if(!validDate(date))throw Error('date must be YYYY-MM-DD.');
    if(!text||text.length>1200)throw Error('note text is required and must be 1–1200 characters.');
    const noteType=type==='mealNote'?'meal':type==='dayNote'?'day':((get('noteType','type')||'day').toLowerCase());
    if(!['day','meal'].includes(noteType))throw Error('noteType must be day or meal.');
    const record={id:get('id')||id(),date,type:noteType,text},time=csvTime(get('time','noteTime'));
    if(time!=null)record.t=time;raw.notes.push(record);
   }
  }catch(error){errors.push('Row '+line+': '+error.message);}
 });
 for(const bucket of workouts.values())raw.workoutTemplates.push({id:bucket.id,name:bucket.name,exercises:bucket.items.sort((a,b)=>a.order-b.order).map(({order,...item})=>item)});
 for(const lift of liftGroups.values())raw.lifts.push({id:lift.id,date:lift.date,exercise:lift.exercise,equipment:lift.equipment,sets:lift.sets.sort((a,b)=>a.order-b.order).map(x=>x.set),notes:lift.notes||''});
 const count=raw.foods.length+raw.foodEntries.length+raw.exerciseDefinitions.length+raw.workoutTemplates.length+raw.lifts.length+raw.weights.length+raw.bodyFat.length+raw.notes.length;
 if(!count&&!errors.length)errors.push('No supported rows found.');
 return{raw,errors,warnings};
}
function reviewCSVImport(raw,current,initialErrors=[],initialWarnings=[]){
 const errors=[...initialErrors],warnings=[...initialWarnings],candidate=structuredClone(current),groups=[],otherChanges=[];let duplicates=0,replaced=0,added=0,unchanged=0;
 const foodRows=[],foodByName=new Map(candidate.foods.map(f=>[f.name.trim().toLowerCase(),f]));
 for(const record of raw.foods){
  const key=record.name.trim().toLowerCase(),prior=foodByName.get(key);
  if(prior){
   const next={...prior,...structuredClone(record),id:prior.id,lastUsed:record.lastUsed??prior.lastUsed};
   if(same(prior,next)){unchanged++;continue;}
   const snapshot=structuredClone(prior);Object.assign(prior,next);foodRows.push({record:structuredClone(prior),badges:['Replaces existing'],previous:snapshot});replaced++;
  }else{const created=structuredClone(record);candidate.foods.push(created);foodByName.set(key,created);foodRows.push({record:created,badges:['Adds new record']});added++;}
 }
 const entryRows=[],currentEntrySigs=new Set(current.foodEntries.map(r=>signature('foodEntries',r)));
 for(const record of raw.foodEntries){
  const created=structuredClone(record),sig=signature('foodEntries',created),badges=['Adds new record'];if(currentEntrySigs.has(sig)){badges.push('Possible duplicate');duplicates++;}
  candidate.foodEntries.push(created);entryRows.push({record:created,badges});added++;
  const key=created.name.trim().toLowerCase();if(!foodByName.has(key)){const card={id:id(),name:created.name,calories:created.calories,protein:created.protein,kind:'food',tags:[],pinned:false,accuracy:'',lastUsed:created.date};candidate.foods.push(card);foodByName.set(key,card);foodRows.push({record:structuredClone(card),badges:['Adds saved food from log']});added++;}
  else{const card=foodByName.get(key);if(card.calories!==created.calories||card.protein!==created.protein)warnings.push(created.name+': imported log keeps its own nutrition; the saved food definition is unchanged.');}
 }
 const exerciseIdMap=new Map(),exerciseByKey=new Map((candidate.exerciseDefinitions||[]).map(e=>[e.name.trim().toLowerCase()+'|'+e.equipment,e]));
 for(const record of raw.exerciseDefinitions){
  const key=record.name.trim().toLowerCase()+'|'+record.equipment,prior=exerciseByKey.get(key);
  if(prior){exerciseIdMap.set(record.id,prior.id);if(record.setup!=null&&record.setup!==(prior.setup||'')){const before=prior.setup||'';if(record.setup)prior.setup=record.setup;else delete prior.setup;otherChanges.push({key:'exerciseDefinitions',label:'Exercise Library · '+record.name,from:before||'No setup',to:record.setup||'No setup',detail:'Updates '+record.name+' ('+record.equipment+') setup'});replaced++;}else unchanged++;}
  else{const created=structuredClone(record);candidate.exerciseDefinitions.push(created);exerciseByKey.set(key,created);exerciseIdMap.set(record.id,created.id);otherChanges.push({key:'exerciseDefinitions',label:'Exercise Library · '+created.name,from:(candidate.exerciseDefinitions.length-1),to:candidate.exerciseDefinitions.length,detail:'Adds '+created.name+' ('+created.equipment+')'});added++;}
 }
 const workoutByName=new Map((candidate.workoutTemplates||[]).map(w=>[w.name.trim().toLowerCase(),w]));
 for(const record of raw.workoutTemplates){
  const next=structuredClone(record);next.exercises=next.exercises.map(item=>({...item,exerciseId:exerciseIdMap.get(item.exerciseId)||item.exerciseId}));
  const prior=workoutByName.get(next.name.trim().toLowerCase());
  if(prior){const updated={...next,id:prior.id};if(same(prior,updated)){unchanged++;continue;}const index=candidate.workoutTemplates.findIndex(w=>w.id===prior.id);candidate.workoutTemplates[index]=updated;workoutByName.set(updated.name.trim().toLowerCase(),updated);otherChanges.push({key:'workoutTemplates',label:'Workout template · '+updated.name,from:prior.exercises.length,to:updated.exercises.length,detail:'Replaces '+updated.name+' with '+updated.exercises.length+' exercise'+(updated.exercises.length===1?'':'s')});replaced++;}
  else{candidate.workoutTemplates.push(next);workoutByName.set(next.name.trim().toLowerCase(),next);otherChanges.push({key:'workoutTemplates',label:'Workout template · '+next.name,from:0,to:next.exercises.length,detail:'Adds '+next.name+' with '+next.exercises.length+' exercise'+(next.exercises.length===1?'':'s')});added++;}
 }
 const liftRows=[],currentLiftSigs=new Set(current.lifts.map(r=>signature('lifts',r)));
 for(const record of raw.lifts){const created=structuredClone(record),sig=signature('lifts',created),badges=['Adds new record'];if(currentLiftSigs.has(sig)){badges.push('Possible duplicate');duplicates++;}candidate.lifts.push(created);liftRows.push({record:created,badges});added++;}
 const weightRows=[],currentWeightSigs=new Set(current.weights.map(r=>signature('weights',r))),weightDates=new Set();
 for(const record of raw.weights){const created=structuredClone(record),sig=signature('weights',created),badges=['Adds new record'];if(currentWeightSigs.has(sig)){badges.push('Possible duplicate');duplicates++;}if(weightDates.has(created.date)||current.weights.some(w=>w.date===created.date))badges.push('Multiple weights on this date');weightDates.add(created.date);candidate.weights.push(created);weightRows.push({record:created,badges});added++;}
 const bodyFatRows=[],currentBodyFatSigs=new Set((current.bodyFat||[]).map(r=>signature('bodyFat',r)));
 for(const record of raw.bodyFat){const created=structuredClone(record),sig=signature('bodyFat',created),badges=['Adds new record'];if(currentBodyFatSigs.has(sig)){badges.push('Possible duplicate');duplicates++;}candidate.bodyFat.push(created);bodyFatRows.push({record:created,badges});added++;}
 const noteRows=[],currentNoteSigs=new Set((current.notes||[]).map(r=>signature('notes',r)));
 for(const record of raw.notes){
   const created=structuredClone(record),sig=signature('notes',created),badges=['Adds new record'];
   if(currentNoteSigs.has(sig)){badges.push('Possible duplicate');duplicates++;}
   if(created.type==='day'){
     const existing=candidate.notes.find(n=>n.type==='day'&&n.date===created.date);
     if(existing){const previous=structuredClone(existing);Object.assign(existing,created,{id:existing.id});noteRows.push({record:structuredClone(existing),badges:['Replaces day note'],previous});replaced++;continue;}
   }
   candidate.notes.push(created);noteRows.push({record:created,badges});added++;
 }
 groups.push({key:'foods',label:'Saved Foods',rows:foodRows,removedRows:[],total:foodRows.length,unchangedCount:0},{key:'foodEntries',label:'Food Entries',rows:entryRows,removedRows:[],total:entryRows.length,unchangedCount:0},{key:'lifts',label:'Lifting Entries',rows:liftRows,removedRows:[],total:liftRows.length,unchangedCount:0},{key:'weights',label:'Weight Entries',rows:weightRows,removedRows:[],total:weightRows.length,unchangedCount:0},{key:'bodyFat',label:'Body Fat Entries',rows:bodyFatRows,removedRows:[],total:bodyFatRows.length,unchangedCount:0},{key:'notes',label:'Notes',rows:noteRows,removedRows:[],total:noteRows.length,unchangedCount:0});
 if(duplicates)warnings.unshift(duplicates+' possible duplicate record'+(duplicates===1?'':'s')+' will be kept if you confirm. Nothing is automatically deduplicated.');
 let normalized=null;if(!errors.length){try{normalized=normalizeData(candidate);}catch(error){errors.push(error.message);}}
 const changeCount=groups.reduce((n,g)=>n+g.rows.length,0)+otherChanges.length;
 return{kind:'csv',base:JSON.stringify(current),candidate:errors.length?null:normalized,groups,errors,warnings:[...new Set(warnings)],duplicates,replaced,removed:0,added,unchanged,changeCount,settingChanges:[],otherChanges,promptChanged:false,settings:structuredClone(current.settings),promptDate:current.promptDate||'',currentSettings:structuredClone(current.settings),currentPromptDate:current.promptDate};
}

export function prepareImport(kind,text,current){
  if(kind==='csv'){
    const parsed=parseUniversalCSV(text,current);
    return reviewCSVImport(parsed.raw,current,parsed.errors,parsed.warnings);
  }
  if(kind!=='json')throw Error('Unsupported import format.');
  let raw;try{raw=JSON.parse(text);}catch{throw Error('This file is not valid JSON. Check its syntax and try again. Nothing was imported.');}
  return reviewImport(kind,normalizeData(raw),current);
}
export function reviewImport(kind,raw,current,initialErrors=[]){
  const errors=[...initialErrors], warnings=[], incoming=emptyData(), groups=[];
  if(!raw||raw.version!==1||!raw.settings||typeof raw.settings!=='object'||Object.keys(importSections).some(k=>!Array.isArray(raw[k])))throw Error('This is not an Everyday backup. Expected version 1, settings, foods, foodEntries, lifts and weights.');
  try{incoming.settings=normalizeData({...emptyData(),settings:raw.settings}).settings;}catch(e){errors.push(e.message);}
  incoming.promptDate=normalizeData({...emptyData(),promptDate:raw.promptDate}).promptDate;
  if(kind==='json'&&raw.promptDate&&raw.promptDate!==incoming.promptDate)warnings.push('Invalid weight-prompt date will be reset.');
  for(const [key,label]of Object.entries(importSections)){
    if(raw[key].length>50000)throw Error(`${label}: the section exceeds 50,000 records.`);
    const ids=new Set();
    raw[key].forEach((record,index)=>{
      try{
        if(!record||typeof record!=='object')throw Error('Record must be an object.');
        if(typeof record.id!=='string')throw Error('ID must be text.');
        if(key==='foods'||key==='foodEntries'){
          if(typeof record.name!=='string')throw Error('Food name must be text.');
          for(const field of ['calories','protein'])if(!Number.isFinite(record[field])||record[field]<0)throw Error(`${field} must be a nonnegative number (received ${String(record[field])}).`);
        }
        if(key!=='foods'&&!validDate(record.date))throw Error(`Invalid date: ${String(record.date)}. Use YYYY-MM-DD.`);
        if(key==='foodEntries'&&(!Number.isFinite(record.quantity)||record.quantity<=0))throw Error(`Servings must be positive (received ${String(record.quantity)}).`);
        if(key==='weights'&&(!Number.isFinite(record.value)||record.value<=0))throw Error(`Weight must be positive (received ${String(record.value)}).`);
        normalizeData({...emptyData(),[key]:[record]});
        if(!record.id.trim())throw Error('ID cannot be empty.');
        if((key==='foods'||key==='foodEntries')&&!record.name.trim())throw Error('Food name cannot be empty.');
        if(key==='lifts'&&(!record.exercise.trim()||!record.sets.length))throw Error('Exercise and at least one set are required.');
        if(key==='lifts'&&record.notes!=null&&typeof record.notes!=='string')throw Error('Notes must be text.');
        if(key==='foods'&&record.lastUsed!=null&&typeof record.lastUsed!=='string')throw Error('Last-used date must be text.');
        if(ids.has(record.id))throw Error('Duplicate ID in this section; each record needs a unique ID.');
        ids.add(record.id);incoming[key].push(structuredClone(record));
      }catch(e){errors.push(`${label} · record ${index+1}${typeof record?.name==='string'?` (${record.name})`:''}: ${e.message}`);}
    });
  }
  let candidate=kind==='csv'?structuredClone(current):structuredClone(raw);
  if(kind==='csv'){
    if(!incoming.foodEntries.length&&!errors.length)errors.push('No food rows found.');
    const names=new Set(current.foods.map(f=>f.name.toLowerCase()));
    for(const e of incoming.foodEntries){
      candidate.foodEntries.push(structuredClone(e));
      if(!names.has(e.name.toLowerCase())){
        names.add(e.name.toLowerCase());const f={id:id(),name:e.name,calories:e.calories,protein:e.protein,lastUsed:e.date};
        incoming.foods.push(f);candidate.foods.push(structuredClone(f));
      }
    }
    const currentCards=new Map(current.foods.map(f=>[f.name.toLowerCase(),f]));
    const variations=new Map();
    for(const e of incoming.foodEntries){
      const prior=currentCards.get(e.name.toLowerCase())||variations.get(e.name.toLowerCase());
      if(prior&&(prior.calories!==e.calories||prior.protein!==e.protein))warnings.push(`${e.name}: different per-serving values. Each imported log keeps its values; the saved card keeps ${prior.calories} cal / ${prior.protein}g protein.`);
      if(!variations.has(e.name.toLowerCase()))variations.set(e.name.toLowerCase(),e);
    }
  }
  const weightDates=new Map();for(const w of incoming.weights)weightDates.set(w.date,(weightDates.get(w.date)||0)+1);
  let duplicates=0,replaced=0,removed=0,added=0,unchanged=0;
  for(const [key,label]of Object.entries(importSections)){
    const currentIds=new Map(current[key].map(r=>[r.id,r])),currentSignatures=new Set(current[key].map(r=>signature(key,r))),seen=new Set(),rows=[];
    for(const record of incoming[key]){
      const sig=signature(key,record),existing=currentIds.get(record.id),badges=[],isSame=kind==='json'&&existing&&same(existing,record);
      if(isSame){unchanged++;seen.add(sig);continue;}
      if(kind==='json'&&existing){badges.push('Replaces existing');replaced++;}
      else{badges.push(kind==='csv'?'Adds new record':'New in backup');added++;}
      if(seen.has(sig)||(currentSignatures.has(sig)&&(kind==='csv'||!existing))){badges.push('Possible duplicate');duplicates++;}
      if(key==='weights'&&weightDates.get(record.date)>1)badges.push('Multiple weights on this date');
      seen.add(sig);rows.push({record,badges,previous:kind==='json'&&existing?existing:null});
    }
    const incomingIds=new Set(incoming[key].map(r=>r.id));
    const removedRows=kind==='json'?current[key].filter(r=>!incomingIds.has(r.id)).map(record=>({record,badges:['Removed by restore']})):[];
    removed+=removedRows.length;
    groups.push({key,label,rows,removedRows,total:incoming[key].length,unchangedCount:kind==='json'?incoming[key].length-rows.length:0});
  }
  const settingChanges=[];
  if(kind==='json')for(const [key,value] of Object.entries(incoming.settings)){
    if(!same(current.settings?.[key],value))settingChanges.push({key,from:current.settings?.[key],to:value});
    else unchanged++;
  }
  const promptChanged=kind==='json'&&!same(current.promptDate||'',incoming.promptDate||'');
  if(kind==='json'&&!promptChanged)unchanged++;
  const otherChanges=[];
  if(kind==='json'){
    for(const [key,label] of [['exerciseDefinitions','Exercise Library'],['workoutTemplates','Workout templates']]){
      if(!same(current[key],raw[key])){
        const before=new Map((current[key]||[]).map(x=>[x.id,x])),after=new Map((raw[key]||[]).map(x=>[x.id,x])),parts=[];
        for(const item of raw[key]||[]){const prior=before.get(item.id),name=item.name||item.id;if(!prior)parts.push('Adds '+name);else if(!same(prior,item))parts.push('Updates '+name);}
        for(const item of current[key]||[])if(!after.has(item.id))parts.push('Removes '+(item.name||item.id));
        otherChanges.push({key,label,from:(current[key]||[]).length,to:(raw[key]||[]).length,detail:parts.slice(0,6).join(' · ')+(parts.length>6?' · +'+(parts.length-6)+' more':'')});
      }else unchanged++;
    }
    for(const [key,label] of [['activeWorkout','Active Workout Buddy session'],['workoutHistory','Workout Buddy history']]){
      if(!same(current[key],raw[key])){
        const from=Array.isArray(current[key])?current[key].length:(current[key]?1:0),to=Array.isArray(raw[key])?raw[key].length:(raw[key]?1:0);
        otherChanges.push({key,label,from,to,detail:key==='activeWorkout'?(raw[key]?'Restores active session':'Clears active session'):(from+' → '+to+' sessions')});
      }else unchanged++;
    }
  }
  if(duplicates)warnings.unshift(duplicates+' possible duplicate record'+(duplicates===1?'':'s')+' will be kept if you confirm. Nothing is automatically deduplicated.');
  if(incoming.weights.length!==new Set(incoming.weights.map(w=>w.date)).size)warnings.push('Multiple weigh-ins share a date. All will be restored and included in weekly averages.');
  const changeCount=groups.reduce((n,g)=>n+g.rows.length+g.removedRows.length,0)+settingChanges.length+otherChanges.length+(promptChanged?1:0);
  return {kind,base:JSON.stringify(current),candidate:errors.length?null:candidate,groups,errors,warnings:[...new Set(warnings)],duplicates,replaced,removed,added,unchanged,changeCount,settingChanges,otherChanges,promptChanged,settings:incoming.settings,promptDate:incoming.promptDate,currentSettings:structuredClone(current.settings),currentPromptDate:current.promptDate};
}
