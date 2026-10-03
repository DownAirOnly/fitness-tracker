import {decodeStoredData,encodeStoredData} from './storage-model.js?v=53';

export const KEY = 'everyday-fitness-v1';
export const defaultExerciseDefinitions = () => [
  {id:'exercise-machine-chest-press',name:'Chest Press',equipment:'machine'},
  {id:'exercise-machine-lat-pulldown',name:'Lat Pulldown',equipment:'machine'},
  {id:'exercise-machine-seated-row',name:'Seated Row',equipment:'machine',setup:'Setting 3'},
  {id:'exercise-machine-shoulder-press',name:'Shoulder Press',equipment:'machine'},
  {id:'exercise-cable-triceps-pushdown',name:'Triceps Pushdown',equipment:'cable'},
  {id:'exercise-dumbbell-bicep-curl',name:'Bicep Curl',equipment:'dumbbell'},
  {id:'exercise-machine-seated-leg-press',name:'Seated Leg Press',equipment:'machine'},
  {id:'exercise-machine-leg-curl',name:'Leg Curl',equipment:'machine'},
  {id:'exercise-machine-glute-kickback',name:'Glute Kickback',equipment:'machine'},
  {id:'exercise-machine-leg-extension',name:'Leg Extension',equipment:'machine'},
  {id:'exercise-machine-hip-abduction',name:'Hip Abduction',equipment:'machine'},
  {id:'exercise-machine-calf-extension',name:'Calf Extension',equipment:'machine'},
  {id:'exercise-machine-torso-rotation',name:'Torso Rotation',equipment:'machine'},
  {id:'exercise-machine-abdominal-crunch',name:'Abdominal Crunch',equipment:'machine'},
  {id:'exercise-dumbbell-lateral-raise',name:'Lateral Raise',equipment:'dumbbell'}
];
export const templateExercises = {
  Upper: [
    {exerciseId:'exercise-machine-chest-press',repMin:6,repMax:12,targetSets:2,restSeconds:90},
    {exerciseId:'exercise-machine-lat-pulldown',repMin:6,repMax:12,targetSets:2,restSeconds:90},
    {exerciseId:'exercise-machine-seated-row',repMin:6,repMax:12,targetSets:2,restSeconds:90},
    {exerciseId:'exercise-machine-shoulder-press',repMin:6,repMax:12,targetSets:2,restSeconds:90},
    {exerciseId:'exercise-cable-triceps-pushdown',repMin:6,repMax:12,targetSets:2,restSeconds:90},
    {exerciseId:'exercise-dumbbell-bicep-curl',repMin:6,repMax:12,targetSets:2,restSeconds:90}
  ],
  Lower: [
    {exerciseId:'exercise-machine-seated-leg-press',repMin:6,repMax:12,targetSets:2,restSeconds:90},
    {exerciseId:'exercise-machine-leg-curl',repMin:6,repMax:12,targetSets:2,restSeconds:90},
    {exerciseId:'exercise-machine-glute-kickback',repMin:6,repMax:12,targetSets:2,restSeconds:90},
    {exerciseId:'exercise-machine-leg-extension',repMin:6,repMax:12,targetSets:2,restSeconds:90},
    {exerciseId:'exercise-machine-hip-abduction',repMin:6,repMax:12,targetSets:2,restSeconds:90},
    {exerciseId:'exercise-machine-calf-extension',repMin:10,repMax:16,targetSets:2,restSeconds:90}
  ],
  'Full body': [
    {exerciseId:'exercise-machine-torso-rotation',repMin:6,repMax:12,targetSets:2,restSeconds:90},
    {exerciseId:'exercise-machine-chest-press',repMin:6,repMax:12,targetSets:2,restSeconds:90},
    {exerciseId:'exercise-machine-seated-leg-press',repMin:6,repMax:12,targetSets:2,restSeconds:90},
    {exerciseId:'exercise-machine-lat-pulldown',repMin:6,repMax:12,targetSets:2,restSeconds:90},
    {exerciseId:'exercise-machine-leg-curl',repMin:6,repMax:12,targetSets:2,restSeconds:90},
    {exerciseId:'exercise-machine-seated-row',repMin:6,repMax:12,targetSets:2,restSeconds:90},
    {exerciseId:'exercise-machine-abdominal-crunch',repMin:6,repMax:12,targetSets:2,restSeconds:90},
    {exerciseId:'exercise-dumbbell-lateral-raise',repMin:6,repMax:12,targetSets:2,restSeconds:90},
    {exerciseId:'exercise-machine-calf-extension',repMin:10,repMax:16,targetSets:2,restSeconds:90}
  ]
};
export const defaultWorkoutTemplates=()=>Object.entries(templateExercises).map(([name,exercises],index)=>({id:'workout-'+String(index+1).padStart(2,'0'),name,exercises:structuredClone(exercises)}));
export const emptyData = () => ({version: 1, settings: {calories: 1600, protein: 130, heightInches: 68, unit: 'lb', weekStart: 5, dayResetMinutes: 360}, foods: [], foodEntries: [], lifts: [], weights: [], bodyFat: [], exerciseDefinitions: defaultExerciseDefinitions(), workoutTemplates: defaultWorkoutTemplates(), activeWorkout: null, workoutHistory: [], notes: [], promptDate: ''});
export const id = () => globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
export const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export const trackingDate = (date = new Date(), resetMinutes = 360) => { const d=new Date(date), minutes=d.getHours()*60+d.getMinutes(); if(minutes<resetMinutes)d.setDate(d.getDate()-1); return localDate(d); };
export const niceDate = s => new Date(`${s}T12:00:00`).toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'});
export const validDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T12:00:00`)) && localDate(new Date(`${s}T12:00:00`)) === s;
export const round = n => Math.round((Number(n) + Number.EPSILON) * 10) / 10;
export function bmi(weight, heightInches, unit='lb') { return heightInches > 0 ? round((unit === 'kg' ? weight * 2.2046226218 : weight) * 703 / heightInches ** 2) : null; }
export function dailyTotals(entries, date) { return entries.filter(x=>x.date===date).reduce((a,x)=>({calories:a.calories+x.calories*x.quantity, protein:a.protein+x.protein*x.quantity}),{calories:0,protein:0}); }
export const weekDays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
export function startOfWeek(date, weekStart=5) {
  const d=new Date(`${date}T12:00:00`);
  d.setDate(d.getDate()-(d.getDay()-weekStart+7)%7);
  return localDate(d);
}
export function endOfWeek(start) {
  const d=new Date(`${start}T12:00:00`);d.setDate(d.getDate()+6);return localDate(d);
}
export function weeklyWeights(weights, height, unit='lb', weekStart=5) {
  const groups = new Map();
  for (const w of weights) {
    const week = startOfWeek(w.date,weekStart);
    if (!groups.has(week)) groups.set(week, []);
    groups.get(week).push(w.value);
  }
  return [...groups].sort(([a],[b])=>b.localeCompare(a)).map(([week,values])=>({week, average:round(values.reduce((a,b)=>a+b,0)/values.length), bmi:bmi(values.reduce((a,b)=>a+b,0)/values.length,height,unit), count:values.length}));
}
export function shouldPrompt(data, now = new Date()) { const reset=Number.isInteger(data.settings?.dayResetMinutes)?data.settings.dayResetMinutes:360, minutes=now.getHours()*60+now.getMinutes(), day=trackingDate(now,reset); return minutes>=reset && data.promptDate!==day && !data.weights.some(w=>w.date===day); }
export function parseCSV(raw) {
  const rows=[]; let row=[], value='', quote=false;
  for(let i=0;i<raw.length;i++) {
    const c=raw[i];
    if (c==='"') { if (quote && raw[i+1]==='"') { value+='"'; i++; } else quote=!quote; }
    else if(c===',' && !quote) { row.push(value); value=''; }
    else if((c==='\n'||c==='\r') && !quote) { if(c==='\r' && raw[i+1]==='\n') i++; row.push(value); if(row.some(v=>v.trim())) rows.push(row); row=[]; value=''; }
    else value+=c;
  }
  if(quote) throw new Error('CSV has an unclosed quote.');
  row.push(value); if(row.some(v=>v.trim())) rows.push(row);
  return rows;
}
export function parseFoodCSV(raw) {
  const rows=parseCSV(raw.replace(/^\uFEFF/,''));
  if(!rows.length) throw new Error('The CSV is empty.');
  const names=rows.shift().map(x=>x.trim().toLowerCase());
  for(const required of ['date','name','calories','protein']) if(!names.includes(required)) throw new Error(`Missing ${required} column.`);
  const errors=[], entries=[];
  rows.forEach((row,i)=>{
    const get=key => (row[names.indexOf(key)] || '').trim();
    const date=get('date'), name=get('name'), calories=Number(get('calories')), protein=Number(get('protein'));
    const quantity=names.includes('quantity') && get('quantity') ? Number(get('quantity')) : 1;
    if(!validDate(date)||!name||!get('calories')||!get('protein')||!Number.isFinite(calories)||calories<0||!Number.isFinite(protein)||protein<0||!Number.isFinite(quantity)||quantity<=0) errors.push(`Row ${i+2}: check date, name, calories, protein and quantity.`);
    else entries.push({id:id(),date,name,calories,protein,quantity});
  });
  return {entries,errors};
}
export function normalizeData(input) {
  input=decodeStoredData(input);
  if(!input || input.version!==1 || !Array.isArray(input.foods)||!Array.isArray(input.foodEntries)||!Array.isArray(input.lifts)||!Array.isArray(input.weights)||!input.settings || typeof input.settings!=='object') throw new Error('This is not an Everyday backup.');
  const data=emptyData();
  data.settings={...data.settings,...input.settings};
  if(![data.settings.calories,data.settings.protein,data.settings.heightInches].every(x=>Number.isFinite(Number(x)) && Number(x)>0) || !['lb','kg'].includes(data.settings.unit)) throw new Error('Backup settings are invalid.');
  if(input.settings.weekStart!=null&&(!Number.isInteger(input.settings.weekStart)||input.settings.weekStart<0||input.settings.weekStart>6)) throw new Error('Backup week start is invalid.');
  data.settings.weekStart=5;
  data.settings.dayResetMinutes=Number.isInteger(Number(data.settings.dayResetMinutes))?Number(data.settings.dayResetMinutes):360;
  if(data.settings.dayResetMinutes<0||data.settings.dayResetMinutes>1410||data.settings.dayResetMinutes%30!==0)throw new Error('Backup day reset time is invalid.');
  data.settings.calories=Number(data.settings.calories); data.settings.protein=Number(data.settings.protein); data.settings.heightInches=Number(data.settings.heightInches);
  for(const key of ['foods','foodEntries','lifts','weights']) {
    if(input[key].length>50000) throw new Error('Backup is too large.');
    data[key]=input[key];
  }
  data.bodyFat=Array.isArray(input.bodyFat)?input.bodyFat:[];
  if(data.bodyFat.length>50000)throw new Error('Backup is too large.');
  data.notes=Array.isArray(input.notes)?input.notes:[];
  if(data.notes.length>50000)throw new Error('Backup is too large.');
  // v49 compatibility: body fat was briefly stored on weight records. Migrate it
  // into the independent bodyFat collection using stable IDs, then strip it from weights.
  const existingBodyFatIds=new Set(data.bodyFat.map(x=>x.id));
  for(const w of data.weights){
    if(w.bodyFatPercent!=null){
      const migratedId='bodyfat-'+w.id;
      if(!existingBodyFatIds.has(migratedId)){
        const record={id:migratedId,date:w.date,value:w.bodyFatPercent};
        if(w.bodyFatRecordedAt){record.recordedAt=w.bodyFatRecordedAt;record.source='apple-health-shortcut';}
        data.bodyFat.push(record);existingBodyFatIds.add(migratedId);
      }
      delete w.bodyFatPercent;delete w.bodyFatRecordedAt;
    }
  }
  for(const f of data.foods){if(typeof f.id!=='string'||typeof f.name!=='string'||!Number.isFinite(f.calories)||f.calories<0||!Number.isFinite(f.protein)||f.protein<0)throw new Error('Backup has an invalid saved food.');f.kind=['food','drink'].includes(f.kind)?f.kind:'food';f.tags=Array.isArray(f.tags)?[...new Set(f.tags.filter(tag=>typeof tag==='string'&&tag.trim()).map(tag=>tag.trim().toLowerCase()))]:[];f.pinned=f.pinned===true;f.accuracy=['label','estimate'].includes(f.accuracy)?f.accuracy:'';if(f.tags.length>50||f.tags.some(tag=>tag.length>40))throw new Error('Backup has invalid food metadata.');}
  for(const e of data.foodEntries){if(typeof e.id!=='string'||!validDate(e.date)||typeof e.name!=='string'||!Number.isFinite(e.calories)||e.calories<0||!Number.isFinite(e.protein)||e.protein<0||!Number.isFinite(e.quantity)||e.quantity<=0)throw new Error('Backup has an invalid food entry.');if(e.t!=null&&(!Number.isInteger(e.t)||e.t<0||e.t>47))throw new Error('Backup has an invalid food time.');}
  for(const w of data.weights) if(typeof w.id!=='string'||!validDate(w.date)||!Number.isFinite(w.value)||w.value<=0) throw new Error('Backup has an invalid weigh-in.');
  for(const b of data.bodyFat) if(typeof b.id!=='string'||!validDate(b.date)||!Number.isFinite(b.value)||b.value<=0||b.value>100||(b.recordedAt!=null&&typeof b.recordedAt!=='string')||(b.source!=null&&typeof b.source!=='string')) throw new Error('Backup has an invalid body-fat reading.');
  for(const n of data.notes){
    if(!n||typeof n.id!=='string'||!n.id.trim()||!validDate(n.date)||!['day','meal'].includes(n.type)||typeof n.text!=='string'||!n.text.trim()||n.text.length>1200||(n.t!=null&&(!Number.isInteger(n.t)||n.t<0||n.t>47)))throw new Error('Backup has an invalid note.');
  }
  for(const l of data.lifts) if(typeof l.id!=='string'||!validDate(l.date)||typeof l.exercise!=='string'||!['machine','cable','dumbbell','bench','calisthenics','other'].includes(l.equipment||'other')||!Array.isArray(l.sets)||!l.sets.every(s=>Number.isFinite(s.weight)&&s.weight>=0&&Number.isInteger(s.reps)&&s.reps>0&&(s.difficulty==null||(Number.isInteger(s.difficulty)&&s.difficulty>=1&&s.difficulty<=7)))) throw new Error('Backup has an invalid lift.');
  // Transitional tolerance: old cloud records may still carry an exercise-level numeric difficulty.
  for(const l of data.lifts) if(l.difficulty!=null && (!Number.isFinite(l.difficulty)||l.difficulty<1)) throw new Error('Backup has an invalid difficulty.');
  const definitionByKey=new Map(data.exerciseDefinitions.map(e=>[e.name.toLowerCase()+'|'+e.equipment,e]));
  const idAliases=new Map(data.exerciseDefinitions.map(e=>[e.id,e.id]));
  if(Array.isArray(input.exerciseDefinitions)){
    if(input.exerciseDefinitions.length>10000)throw new Error('Backup has too many exercise definitions.');
    for(const e of input.exerciseDefinitions){
      const setup=e?.setup==null?'':String(e.setup);
      if(!e||typeof e.id!=='string'||!e.id.trim()||typeof e.name!=='string'||!e.name.trim()||!['machine','cable','dumbbell','bench','calisthenics','other'].includes(e.equipment)||setup.length>200)throw new Error('Backup has an invalid exercise definition.');
      const key=e.name.toLowerCase()+'|'+e.equipment,existing=definitionByKey.get(key);
      if(existing){
        idAliases.set(e.id,existing.id);
        if(setup)existing.setup=setup;else delete existing.setup;
      }else{
        const created={id:e.id,name:e.name,equipment:e.equipment,...(setup?{setup}:{})};
        data.exerciseDefinitions.push(created);definitionByKey.set(key,created);idAliases.set(e.id,e.id);
      }
    }
  }
  const definitionIds=new Set(data.exerciseDefinitions.map(e=>e.id));
  const fallbackWorkouts=new Map(defaultWorkoutTemplates().map(w=>[w.name,w]));
  if(Array.isArray(input.workoutTemplates)){
    if(input.workoutTemplates.length>100)throw new Error('Backup has too many workout templates.');
    data.workoutTemplates=input.workoutTemplates.map(w=>{
      if(!w||typeof w.id!=='string'||!w.id.trim()||typeof w.name!=='string'||!w.name.trim()||!Array.isArray(w.exercises)||w.exercises.length>100)throw new Error('Backup has an invalid workout template.');
      const fallback=fallbackWorkouts.get(w.name);
      return{id:w.id,name:w.name,exercises:w.exercises.map((e,index)=>{
        const fallbackItem=fallback?.exercises?.[index];
        let exerciseId=typeof e?.exerciseId==='string'?e.exerciseId:'';
        if(idAliases.has(exerciseId))exerciseId=idAliases.get(exerciseId);
        if(!definitionIds.has(exerciseId)&&typeof e?.name==='string'){
          const def=definitionByKey.get(e.name.toLowerCase()+'|'+(e.equipment||'other'));
          exerciseId=def?.id||exerciseId;
        }
        if(!definitionIds.has(exerciseId)&&fallbackItem?.exerciseId&&definitionIds.has(fallbackItem.exerciseId))exerciseId=fallbackItem.exerciseId;
        let repMin=Number(e?.repMin),repMax=Number(e?.repMax),targetSets=Number(e?.targetSets),restSeconds=Number(e?.restSeconds);
        if(!Number.isInteger(repMin)||!Number.isInteger(repMax)||repMin<1||repMax<repMin||repMax>100){
          repMin=fallbackItem?.repMin||6;repMax=fallbackItem?.repMax||12;
        }
        if(!Number.isInteger(targetSets)||targetSets<1||targetSets>10)targetSets=fallbackItem?.targetSets||2;
        if(!Number.isInteger(restSeconds)||restSeconds<0||restSeconds>1800)restSeconds=fallbackItem?.restSeconds??90;
        if(typeof exerciseId!=='string'||!definitionIds.has(exerciseId))throw new Error('Backup has an invalid workout exercise reference.');
        return{exerciseId,repMin,repMax,targetSets,restSeconds};
      })};
    });
  }
  data.activeWorkout=input.activeWorkout&&typeof input.activeWorkout==='object'?structuredClone(input.activeWorkout):null;
  if(data.activeWorkout?.exercises){
    for(const e of data.activeWorkout.exercises){
      const alias=idAliases.get(e.exerciseId)||e.exerciseId;
      const def=data.exerciseDefinitions.find(d=>d.id===alias)||definitionByKey.get(String(e.name||'').toLowerCase()+'|'+(e.equipment||'other'));
      if(def){e.exerciseId=def.id;e.name=def.name;e.equipment=def.equipment;if(def.setup)e.setup=def.setup;else delete e.setup;}
    }
  }
  data.workoutHistory=Array.isArray(input.workoutHistory)?input.workoutHistory:[];
  data.promptDate=validDate(input.promptDate)?input.promptDate:'';
  return data;
}
export function encodeData(data) { return encodeStoredData(normalizeData(structuredClone(data))); }
export function load() { try { const raw=localStorage.getItem(KEY); return raw?normalizeData(JSON.parse(raw)):emptyData(); } catch { return emptyData(); } }
export function save(data) { localStorage.setItem(KEY,JSON.stringify(encodeData(data))); }
