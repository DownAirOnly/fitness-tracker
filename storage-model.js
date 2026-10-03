const cleanName=value=>typeof value==='string'?value.trim():'';
const foodKey=record=>`${cleanName(record.name).toLowerCase()}\u0000${record.calories}\u0000${record.protein}`;
const equipmentTypes=new Set(['machine','cable','dumbbell','bench','calisthenics','other']);
const inferExercise=value=>{
 let name=cleanName(value),equipment='other';
 const rules=[[/^machine\s+/i,'machine'],[/^cable\s+/i,'cable'],[/^dumbbell\s+/i,'dumbbell'],[/^db\s+/i,'dumbbell']];
 for(const [pattern,type] of rules)if(pattern.test(name)){name=name.replace(pattern,'').trim();equipment=type;break;}
 const aliases=new Map([
  ['calf raise',['Calf Extension','machine']],['calf extension',['Calf Extension','machine']],
  ['leg press',['Seated Leg Press','machine']],['seated leg press',['Seated Leg Press','machine']],
  ['chest press',['Chest Press','machine']],['lat pulldown',['Lat Pulldown','machine']],['seated row',['Seated Row','machine']],
  ['shoulder press',['Shoulder Press','machine']],['triceps pushdown',['Triceps Pushdown','cable']],['lat pushdown',['Triceps Pushdown','cable']],
  ['bicep curl',['Bicep Curl','dumbbell']],['bicep curls',['Bicep Curl','dumbbell']],['leg curl',['Leg Curl','machine']],
  ['glute kickback',['Glute Kickback','machine']],['leg extension',['Leg Extension','machine']],['hip abduction',['Hip Abduction','machine']],
  ['torso rotation',['Torso Rotation','machine']],['abdominal crunch',['Abdominal Crunch','machine']],['lateral raise',['Lateral Raise','dumbbell']]
 ]);
 const alias=aliases.get(name.toLowerCase());if(alias){name=alias[0];if(equipment==='other')equipment=alias[1];}
 return{name,equipment};
};
const exerciseKey=record=>`${cleanName(record.name).toLowerCase()}\u0000${record.equipment||'other'}`;
function stableId(prefix,key){let hash=2166136261;for(let i=0;i<key.length;i++){hash^=key.charCodeAt(i);hash=Math.imul(hash,16777619);}return `${prefix}-${(hash>>>0).toString(36)}`;}
function nextStableId(prefix,key,used){const base=stableId(prefix,key);let candidate=base,n=2;while(used.has(candidate))candidate=`${base}-${n++}`;return candidate;}
export function decodeStoredData(input){
 if(!input||input.version!==2)return input;
 if(!Array.isArray(input.foods)||!Array.isArray(input.foodEntries)||!Array.isArray(input.exercises)||!Array.isArray(input.lifts)||!Array.isArray(input.weights)||!input.settings||typeof input.settings!=='object')throw Error('This is not an Everyday backup.');
 const foodMap=new Map(),foods=[];
 for(const food of input.foods){
  if(!food||typeof food.id!=='string'||!food.id.trim()||typeof food.name!=='string'||!food.name.trim()||!Number.isFinite(food.calories)||food.calories<0||!Number.isFinite(food.protein)||food.protein<0||food.saved!=null&&typeof food.saved!=='boolean')throw Error('Backup has an invalid food dictionary item.');
  const kind=food.kind==null?'food':food.kind,tags=food.tags==null?[]:food.tags,accuracy=food.accuracy==null?'':food.accuracy,pinned=food.pinned===true;
  if(!['food','drink'].includes(kind)||!Array.isArray(tags)||tags.length>50||tags.some(tag=>typeof tag!=='string'||!tag.trim()||tag.length>40)||!['','label','estimate'].includes(accuracy)||food.pinned!=null&&typeof food.pinned!=='boolean')throw Error('Backup has invalid food metadata.');
  if(foodMap.has(food.id))throw Error('Backup has duplicate food dictionary IDs.');
  const normalized={...food,kind,tags:[...new Set(tags.map(tag=>tag.trim().toLowerCase()))],pinned,accuracy};
  foodMap.set(food.id,normalized);
  if(food.saved!==false){const card={id:food.id,name:food.name,calories:food.calories,protein:food.protein,kind:normalized.kind,tags:structuredClone(normalized.tags)};if(normalized.pinned)card.pinned=true;if(normalized.accuracy)card.accuracy=normalized.accuracy;if(food.lastUsed!=null)card.lastUsed=food.lastUsed;foods.push(card);}
 }
 const foodEntries=input.foodEntries.map(entry=>{if(!entry||typeof entry.foodId!=='string'||!foodMap.has(entry.foodId))throw Error('Backup food entry references a missing food.');if(entry.t!=null&&(!Number.isInteger(entry.t)||entry.t<0||entry.t>47))throw Error('Backup food entry has an invalid time.');const food=foodMap.get(entry.foodId),record={id:entry.id,date:entry.date,name:food.name,calories:food.calories,protein:food.protein,quantity:entry.quantity};if(entry.t!=null)record.t=entry.t;return record;});
 const exerciseMap=new Map(),exerciseDefinitions=[],usedExerciseIds=new Set();
 for(const exercise of input.exercises){
  if(!exercise||typeof exercise.id!=='string'||!exercise.id.trim()||typeof exercise.name!=='string'||!exercise.name.trim())throw Error('Backup has an invalid exercise dictionary item.');
  if(exerciseMap.has(exercise.id))throw Error('Backup has duplicate exercise dictionary IDs.');
  const normalized=inferExercise(exercise.name),equipment=equipmentTypes.has(exercise.equipment)?exercise.equipment:normalized.equipment,setup=exercise.setup==null?'':String(exercise.setup);
  if(setup.length>200)throw Error('Backup has an invalid exercise setup.');
  const def={id:exercise.id,name:normalized.name,equipment,...(setup?{setup}:{})};
  exerciseMap.set(exercise.id,def);exerciseDefinitions.push(def);usedExerciseIds.add(exercise.id);
 }
 const exerciseIdByKey=new Map(exerciseDefinitions.map(e=>[exerciseKey(e),e.id]));
 const ensureExercise=(name,equipment='other')=>{
  const normalized=inferExercise(name),def={name:normalized.name,equipment:equipmentTypes.has(equipment)?equipment:normalized.equipment},key=exerciseKey(def);
  let exerciseId=exerciseIdByKey.get(key);
  if(!exerciseId){exerciseId=nextStableId('exercise',key,usedExerciseIds);usedExerciseIds.add(exerciseId);const created={id:exerciseId,...def};exerciseDefinitions.push(created);exerciseMap.set(exerciseId,created);exerciseIdByKey.set(key,exerciseId);}
  return exerciseId;
 };
 const legacySetupValues=new Map();
 if(Array.isArray(input.workoutTemplates))for(const w of input.workoutTemplates)for(const item of Array.isArray(w?.exercises)?w.exercises:[]){
  if(item?.exerciseId||typeof item?.name!=='string'||!item.setup)continue;
  const normalized=inferExercise(item.name),equipment=equipmentTypes.has(item.equipment)?item.equipment:normalized.equipment,key=exerciseKey({name:normalized.name,equipment});
  if(!legacySetupValues.has(key))legacySetupValues.set(key,new Set());
  legacySetupValues.get(key).add(String(item.setup).trim());
 }
 for(const [key,values] of legacySetupValues){
  const clean=[...values].filter(Boolean);
  if(clean.length!==1)continue;
  const exerciseId=exerciseIdByKey.get(key);if(!exerciseId)continue;
  const def=exerciseMap.get(exerciseId);if(def&&!def.setup)def.setup=clean[0];
 }
 const workoutTemplates=Array.isArray(input.workoutTemplates)?input.workoutTemplates.map((w,wi)=>({
  id:typeof w?.id==='string'&&w.id.trim()?w.id:'workout-'+String(wi+1).padStart(2,'0'),
  name:typeof w?.name==='string'&&w.name.trim()?w.name:'Workout '+(wi+1),
  exercises:(Array.isArray(w?.exercises)?w.exercises:[]).map(item=>{
   let exerciseId='';
   if(typeof item?.exerciseId==='string'&&item.exerciseId)exerciseId=item.exerciseId;
   else if(typeof item?.name==='string'&&item.name.trim())exerciseId=ensureExercise(item.name,item?.equipment||'other');
   const targetSets=Number(item?.targetSets),restSeconds=Number(item?.restSeconds);
   return{exerciseId,repMin:Number(item?.repMin)||6,repMax:Number(item?.repMax)||12,targetSets:Number.isInteger(targetSets)&&targetSets>=1&&targetSets<=10?targetSets:2,restSeconds:Number.isInteger(restSeconds)&&restSeconds>=0&&restSeconds<=1800?restSeconds:90};
  })
 })):undefined;
 const lifts=input.lifts.map(lift=>{if(!lift||typeof lift.exerciseId!=='string'||!exerciseMap.has(lift.exerciseId))throw Error('Backup lift references a missing exercise.');const exercise=exerciseMap.get(lift.exerciseId),record={id:lift.id,date:lift.date,exercise:exercise.name,equipment:exercise.equipment,sets:structuredClone(lift.sets)};if(lift.difficulty!=null)record.difficulty=lift.difficulty;if(lift.notes!=null)record.notes=lift.notes;if(lift.buddySessionId!=null)record.buddySessionId=lift.buddySessionId;return record;});
 return{version:1,settings:structuredClone(input.settings),foods,foodEntries,lifts,weights:structuredClone(input.weights),bodyFat:Array.isArray(input.bodyFat)?structuredClone(input.bodyFat):[],exerciseDefinitions,workoutTemplates,activeWorkout:input.activeWorkout?structuredClone(input.activeWorkout):null,workoutHistory:Array.isArray(input.workoutHistory)?structuredClone(input.workoutHistory):[],promptDate:input.promptDate??''};
}
export function encodeStoredData(data){
 const foods=[],foodByKey=new Map(),usedFoodIds=new Set();
 for(const food of data.foods){
  const def={id:food.id,name:food.name,calories:food.calories,protein:food.protein,kind:['food','drink'].includes(food.kind)?food.kind:'food',tags:Array.isArray(food.tags)?[...new Set(food.tags.filter(tag=>typeof tag==='string'&&tag.trim()).map(tag=>tag.trim().toLowerCase()))]:[]};
  if(food.pinned===true)def.pinned=true;
  if(['label','estimate'].includes(food.accuracy))def.accuracy=food.accuracy;
  if(food.lastUsed!=null)def.lastUsed=food.lastUsed;
  foods.push(def);usedFoodIds.add(def.id);if(!foodByKey.has(foodKey(def)))foodByKey.set(foodKey(def),def.id);
 }
 const foodEntries=data.foodEntries.map(entry=>{const key=foodKey(entry);let foodId=foodByKey.get(key);if(!foodId){foodId=nextStableId('food',key,usedFoodIds);usedFoodIds.add(foodId);foods.push({id:foodId,name:entry.name,calories:entry.calories,protein:entry.protein,saved:false});foodByKey.set(key,foodId);}const record={id:entry.id,date:entry.date,foodId,quantity:entry.quantity};if(Number.isInteger(entry.t)&&entry.t>=0&&entry.t<=47)record.t=entry.t;return record;});
 const exercises=[],exerciseByKey=new Map(),exerciseById=new Map(),usedExerciseIds=new Set();
 for(const def of Array.isArray(data.exerciseDefinitions)?data.exerciseDefinitions:[]){
  const normalized=inferExercise(def.name),exercise={id:def.id,name:normalized.name,equipment:equipmentTypes.has(def.equipment)?def.equipment:normalized.equipment,...(def.setup?{setup:def.setup}:{})},key=exerciseKey(exercise);
  if(!exercise.id||usedExerciseIds.has(exercise.id))continue;
  exercises.push(exercise);usedExerciseIds.add(exercise.id);exerciseByKey.set(key,exercise.id);exerciseById.set(exercise.id,exercise);
 }
 const lifts=data.lifts.map(lift=>{const normalized=inferExercise(lift.exercise),exercise={name:normalized.name,equipment:equipmentTypes.has(lift.equipment)?lift.equipment:normalized.equipment},key=exerciseKey(exercise);let exerciseId=exerciseByKey.get(key);if(!exerciseId){exerciseId=nextStableId('exercise',key,usedExerciseIds);usedExerciseIds.add(exerciseId);const created={id:exerciseId,...exercise};exercises.push(created);exerciseByKey.set(key,exerciseId);exerciseById.set(exerciseId,created);}const record={id:lift.id,date:lift.date,exerciseId,sets:structuredClone(lift.sets)};if(lift.difficulty!=null)record.difficulty=lift.difficulty;if(lift.notes)record.notes=lift.notes;if(lift.buddySessionId)record.buddySessionId=lift.buddySessionId;return record;});
 const workoutTemplates=Array.isArray(data.workoutTemplates)?data.workoutTemplates.map(w=>({id:w.id,name:w.name,exercises:(Array.isArray(w.exercises)?w.exercises:[]).map(item=>{const record={exerciseId:item.exerciseId,repMin:item.repMin,repMax:item.repMax};if(item.targetSets!==2)record.targetSets=item.targetSets;if(item.restSeconds!==90)record.restSeconds=item.restSeconds;return record;})})):[];
 return{version:2,settings:structuredClone(data.settings),foods,foodEntries,exercises,lifts,weights:structuredClone(data.weights),bodyFat:Array.isArray(data.bodyFat)?structuredClone(data.bodyFat):[],workoutTemplates,activeWorkout:data.activeWorkout?structuredClone(data.activeWorkout):null,workoutHistory:Array.isArray(data.workoutHistory)?structuredClone(data.workoutHistory):[],promptDate:data.promptDate||''};
}