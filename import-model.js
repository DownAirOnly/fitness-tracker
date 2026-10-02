import {emptyData,normalizeData,parseFoodCSV,id,validDate} from './data.js?v=42';

export const importSections={foods:'Saved Foods',foodEntries:'Food Entries',lifts:'Lifting Entries',weights:'Weight Entries'};
const signature=(key,r)=>JSON.stringify(key==='foods'?[r.name.toLowerCase(),r.calories,r.protein,r.kind||'food',r.tags||[],r.pinned===true,r.accuracy||'']:key==='foodEntries'?[r.date,r.name.toLowerCase(),r.calories,r.protein,r.quantity,r.t??null]:key==='weights'?[r.date,r.value]:[r.date,r.exercise.toLowerCase(),r.sets,r.difficulty??null,r.notes??'']);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

// File adapters only parse; all sources feed the same review/candidate pipeline.
export function prepareImport(kind,text,current){
  if(kind==='csv'){
    const result=parseFoodCSV(text);
    return reviewImport(kind,{...emptyData(),foodEntries:result.entries},current,result.errors);
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
