import {emptyData, normalizeData, encodeData, convertNotebookWeightUnit} from './data.js?v=98';

export const MAX_CLOUD_BYTES = 800000;
export class CloudConflict extends Error {
  constructor() { super('Another device saved a newer version. Export your unsaved changes, then load the latest cloud data before editing again.'); this.code='conflict'; }
}
export function encodeState(data) {
  const payload=JSON.stringify(encodeData(data));
  if(new TextEncoder().encode(payload).length>MAX_CLOUD_BYTES) throw new Error('This account has reached the current cloud storage limit. Export a backup before reducing its history.');
  return payload;
}
export function decodeState(record) {
  if(record==null) return {data:emptyData(),revision:0};
  if(record.schemaVersion!==1 || !Number.isSafeInteger(record.revision) || record.revision<1 || typeof record.payload!=='string') throw new Error('Cloud data has an unsupported format. Nothing was overwritten.');
  return {data:normalizeData(JSON.parse(record.payload)),revision:record.revision};
}
export function nextRecord(current,expected,payload) {
  const revision=decodeState(current).revision;
  if(revision!==expected) throw new CloudConflict();
  return {schemaVersion:1,revision:revision+1,payload};
}

export function hasRecords(data) { return ['foods','foodEntries','lifts','weights','bodyFat','transactions'].some(k=>(data[k]||[]).length>0); }
export function hasDeviceMigrationContent(data) {
 const defaults=emptyData();
 return hasRecords(data)||(data.classificationRules||[]).length>0||JSON.stringify(data.budgetPlan||{})!==JSON.stringify(emptyData().budgetPlan)||Boolean(data.activeWorkout)||(data.workoutHistory||[]).length>0||
  JSON.stringify(data.exerciseDefinitions||[])!==JSON.stringify(defaults.exerciseDefinitions)||
  JSON.stringify(data.workoutTemplates||[])!==JSON.stringify(defaults.workoutTemplates);
}

const migrationKeys=['foods','foodEntries','lifts','weights','bodyFat','transactions','exerciseDefinitions','workoutTemplates','workoutHistory'];
const exerciseKey=e=>String(e.name||'').trim().toLowerCase()+'|'+(e.equipment||'other');
const signature=value=>JSON.stringify(value,(key,value)=>{
 if(value&&typeof value==='object'&&!Array.isArray(value))
  return Object.fromEntries(Object.keys(value).sort().map(k=>[k,value[k]]));
 return value;
});
const withoutId=item=>{const copy=structuredClone(item);delete copy.id;return copy;};
function nextMigrationId(original,used) {
 const root=original+'-device';
 let candidate=root,suffix=2;
 while(used.has(candidate))candidate=root+'-'+suffix++;
 used.add(candidate);return candidate;
}
function uniqueDeviceRoutineName(name,names){
 if(!names.has(name.toLowerCase())){names.add(name.toLowerCase());return name;}
 const root=name+' (device)';let candidate=root,suffix=2;
 while(names.has(candidate.toLowerCase()))candidate=root+' '+suffix++;
 names.add(candidate.toLowerCase());return candidate;
}

/**
 * Compute a complete, non-destructive preview. Neither argument is modified.
 * The cloud takes precedence for matching records; distinct device objects are
 * copied with collision-safe IDs. Unsafe simultaneous live workouts block the merge.
 */
export function planDeviceMigration(cloud,device) {
 const candidate=normalizeData(structuredClone(cloud));
 let incoming=normalizeData(structuredClone(device));
 const summary={added:Object.fromEntries(migrationKeys.map(k=>[k,0])),skipped:Object.fromEntries(migrationKeys.map(k=>[k,0])),
  idConflicts:0,renamedRoutines:0,setupConflicts:0,filledSetups:0,activeWorkout:'none',
  unitFrom:incoming.settings.unit,unitTo:candidate.settings.unit};
 // A brand-new cloud notebook has no personal settings to preserve.
 if(!hasDeviceMigrationContent(candidate)&&signature(candidate.settings)===signature(emptyData().settings))
  candidate.settings={...incoming.settings};
 if(incoming.settings.unit!==candidate.settings.unit)
  incoming=convertNotebookWeightUnit(incoming,candidate.settings.unit);

 const ids=key=>new Set((candidate[key]||[]).map(record=>record.id));
 const pushRecords=(key,options={})=>{
  const used=ids(key);
  for(const original of incoming[key]||[]){
   const entry=structuredClone(original);
   if(key==='weights'&&candidate.weights.some(w=>w.date===entry.date)){summary.skipped[key]++;continue;}
   const previous=(candidate[key]||[]).find(row=>row.id===entry.id);
   if(previous){
    if(signature(previous)===signature(entry)){summary.skipped[key]++;continue;}
    if(key!=='lifts'){summary.skipped[key]++;continue;}
   }
   if((candidate[key]||[]).some(row=>signature(withoutId(row))===signature(withoutId(entry)))){
    summary.skipped[key]++;continue;
   }
   if(used.has(entry.id)){entry.id=nextMigrationId(entry.id,used);summary.idConflicts++;}
   else used.add(entry.id);
   candidate[key].push(entry);summary.added[key]++;
  }
 };

 // Cloud saved definitions take precedence by canonical exercise identity.
 const defIds=ids('exerciseDefinitions'),defByKey=new Map(candidate.exerciseDefinitions.map(x=>[exerciseKey(x),x]));
 const exerciseAliases=new Map();
 for(const def of incoming.exerciseDefinitions){
  const matched=defByKey.get(exerciseKey(def));
  if(matched){
   exerciseAliases.set(def.id,matched.id);
   if(!matched.setup&&def.setup){matched.setup=def.setup;summary.filledSetups++;}
   else if(matched.setup&&def.setup&&matched.setup!==def.setup)summary.setupConflicts++;
   summary.skipped.exerciseDefinitions++;
   continue;
  }
  const created=structuredClone(def),source=created.id;
  if(defIds.has(created.id)){created.id=nextMigrationId(created.id,defIds);summary.idConflicts++;}
  else defIds.add(created.id);
  candidate.exerciseDefinitions.push(created);defByKey.set(exerciseKey(created),created);
  exerciseAliases.set(source,created.id);summary.added.exerciseDefinitions++;
 }
 const remapExercise=e=>{
  if(!e||typeof e!=='object')return;
  if(e.exerciseId&&exerciseAliases.has(e.exerciseId))e.exerciseId=exerciseAliases.get(e.exerciseId);
  if(e.exerciseId&&!candidate.exerciseDefinitions.some(def=>def.id===e.exerciseId)){
   const known=defByKey.get(exerciseKey(e));
   if(known)e.exerciseId=known.id;
   else throw Error('Device workout references an unknown exercise. The migration was not applied.');
  }
 };
 const remapSession=s=>{
  for(const e of s.exercises||[])remapExercise(e);
  for(const e of s.undo?.exercises||[])remapExercise(e);
 };
 const routineIds=ids('workoutTemplates'),routineNames=new Set(candidate.workoutTemplates.map(w=>w.name.toLowerCase()));
 const routineAliases=new Map();
 for(const source of incoming.workoutTemplates){
  const routine=structuredClone(source);
  for(const e of routine.exercises)remapExercise(e);
  const existingById=candidate.workoutTemplates.find(w=>w.id===routine.id);
  const duplicate=candidate.workoutTemplates.find(w=>signature(w.exercises)===signature(routine.exercises)&&
   (w.name===routine.name||w.name.startsWith(routine.name+' (device)')||w.id.startsWith(routine.id+'-device')));
  if(existingById&&signature(existingById)===signature(routine)){
   routineAliases.set(source.id,existingById.id);summary.skipped.workoutTemplates++;continue;
  }
  if(duplicate){
   routineAliases.set(source.id,duplicate.id);summary.skipped.workoutTemplates++;continue;
  }
  if(routineIds.has(routine.id)){routine.id=nextMigrationId(routine.id,routineIds);summary.idConflicts++;}
  else routineIds.add(routine.id);
  const previousName=routine.name;
  routine.name=uniqueDeviceRoutineName(routine.name,routineNames);
  if(previousName!==routine.name)summary.renamedRoutines++;
  candidate.workoutTemplates.push(routine);routineAliases.set(source.id,routine.id);summary.added.workoutTemplates++;
 }
 const remapRoutine=s=>{
  if(s?.workoutId&&routineAliases.has(s.workoutId)){
   s.workoutId=routineAliases.get(s.workoutId);
   const matched=candidate.workoutTemplates.find(w=>w.id===s.workoutId);
   if(matched)s.type=matched.name;
  }
 };

 // Saved session IDs also link Workout Buddy's ordinary lift records.
 // Reserve active IDs so neither a historic nor active record can collide.
 const reservedSessionIds=new Set(candidate.workoutHistory.map(s=>s.id));
 if(candidate.activeWorkout?.id)reservedSessionIds.add(candidate.activeWorkout.id);
 const sessionAliases=new Map();
 for(const source of incoming.workoutHistory){
  const item=structuredClone(source);remapSession(item);remapRoutine(item);
  const sameSession=candidate.workoutHistory.find(s=>s.id===item.id&&signature(s)===signature(item))||
   candidate.workoutHistory.find(s=>s.id!==item.id&&s.id.startsWith(source.id+'-device')&&signature(withoutId(s))===signature(withoutId(item)));
  if(sameSession){sessionAliases.set(source.id,sameSession.id);summary.skipped.workoutHistory++;continue;}
  if(reservedSessionIds.has(item.id)){item.id=nextMigrationId(item.id,reservedSessionIds);summary.idConflicts++;}
  else reservedSessionIds.add(item.id);
  candidate.workoutHistory.push(item);sessionAliases.set(source.id,item.id);summary.added.workoutHistory++;
 }

 if(incoming.activeWorkout){
  const live=structuredClone(incoming.activeWorkout);remapSession(live);remapRoutine(live);
  const current=candidate.activeWorkout;
  if(current){
   if(signature(current)===signature(live))summary.activeWorkout='already in cloud';
   else throw Error('Both the device and cloud contain different active workouts. Finish or safely export one before copying device logs; neither live session was changed.');
  }else{
   if(reservedSessionIds.has(live.id)){live.id=nextMigrationId(live.id,reservedSessionIds);summary.idConflicts++;}
   else reservedSessionIds.add(live.id);
   candidate.activeWorkout=live;summary.activeWorkout='imported';
  }
  sessionAliases.set(incoming.activeWorkout.id,candidate.activeWorkout.id);
 }else if(candidate.activeWorkout)summary.activeWorkout='kept cloud';

 // Apply session ID aliases to mirrored lift logs after session import.
 for(const lift of incoming.lifts){
  if(lift.buddySessionId&&sessionAliases.has(lift.buddySessionId))
   lift.buddySessionId=sessionAliases.get(lift.buddySessionId);
 }
 for(const key of ['foods','foodEntries','weights','bodyFat','lifts'])pushRecords(key);
 // Financial entries are not content-deduplicated: two identical purchases can be real.
 // Repeated imports are idempotent by original ID and deterministic "-device" aliases.
 // Different records sharing an ID are preserved rather than overwritten.
 const transactionIds=ids('transactions');
 for(const original of incoming.transactions){
   const entry=structuredClone(original);
   const matched=candidate.transactions.find(row=>row.id===entry.id&&signature(row)===signature(entry))||
     candidate.transactions.find(row=>row.id.startsWith(entry.id+'-device')&&
       signature(withoutId(row))===signature(withoutId(entry)));
   if(matched){summary.skipped.transactions++;continue;}
   if(transactionIds.has(entry.id)){entry.id=nextMigrationId(entry.id,transactionIds);summary.idConflicts++;}
   else transactionIds.add(entry.id);
   candidate.transactions.push(entry);summary.added.transactions++;
 }


 // Preserve rules saved on both devices; conflicts keep distinct copies for review.
 const ruleIds=new Set((candidate.classificationRules||[]).map(r=>r.id));
 for(const rule of incoming.classificationRules||[]){
  const copy=structuredClone(rule),prior=candidate.classificationRules.find(r=>r.id===copy.id);
  if(prior&&signature(prior)===signature(copy))continue;
  if(ruleIds.has(copy.id))copy.id=nextMigrationId(copy.id,ruleIds);
  else ruleIds.add(copy.id);
  candidate.classificationRules.push(copy);
 }
 // Cash-flow plans are unique per notebook. Copy only when cloud plan is blank; never merge monetary assumptions.
 if(signature(candidate.budgetPlan)===signature(emptyData().budgetPlan))candidate.budgetPlan=structuredClone(incoming.budgetPlan);
 // Validate all routine references and the encoded cloud payload BEFORE saving.
 // This rejects invalid merges atomically, including oversize backups.
 const verified=normalizeData(candidate);
 encodeState(verified);
 return {candidate:verified,summary};
}
export function mergeDeviceData(cloud,device){return planDeviceMigration(cloud,device).candidate;}

// A session captures an immutable owner UID. Async work from an older account
// cannot be redirected to a newly signed-in user's document.
export class CloudSession {
  constructor(uid,store) {this.uid=uid;this.store=store;this.ready=false;this.busy=false;this.revision=0;this.closed=false;}
  async load() {
    if(this.closed||this.busy) throw new Error('Account is busy.');
    this.ready=false;
    const result=decodeState(await this.store.read(this.uid));
    if(this.closed) throw new Error('Account changed. Please sign in again.');
    this.revision=result.revision;this.ready=true;return result.data;
  }
  async save(data) {
    if(this.closed||!this.ready||this.busy) throw new Error('Account is not ready to save.');
    const payload=encodeState(data);this.busy=true;
    try {
      const record=await this.store.write(this.uid,this.revision,payload);
      if(this.closed) throw new Error('Account changed while saving. Check your cloud data after signing in again.');
      this.revision=record.revision;
    } finally {this.busy=false;}
  }
  close() {this.closed=true;this.ready=false;}
}
