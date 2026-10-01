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
 for(const food of input.foods){if(!food||typeof food.id!=='string'||!food.id.trim()||typeof food.name!=='string'||!food.name.trim()||!Number.isFinite(food.calories)||food.calories<0||!Number.isFinite(food.protein)||food.protein<0||food.saved!=null&&typeof food.saved!=='boolean')throw Error('Backup has an invalid food dictionary item.');if(foodMap.has(food.id))throw Error('Backup has duplicate food dictionary IDs.');foodMap.set(food.id,food);if(food.saved!==false){const card={id:food.id,name:food.name,calories:food.calories,protein:food.protein};if(food.lastUsed!=null)card.lastUsed=food.lastUsed;foods.push(card);}}
 const foodEntries=input.foodEntries.map(entry=>{if(!entry||typeof entry.foodId!=='string'||!foodMap.has(entry.foodId))throw Error('Backup food entry references a missing food.');const food=foodMap.get(entry.foodId);return{id:entry.id,date:entry.date,name:food.name,calories:food.calories,protein:food.protein,quantity:entry.quantity};});
 const exerciseMap=new Map();for(const exercise of input.exercises){if(!exercise||typeof exercise.id!=='string'||!exercise.id.trim()||typeof exercise.name!=='string'||!exercise.name.trim())throw Error('Backup has an invalid exercise dictionary item.');if(exerciseMap.has(exercise.id))throw Error('Backup has duplicate exercise dictionary IDs.');const normalized=inferExercise(exercise.name),equipment=equipmentTypes.has(exercise.equipment)?exercise.equipment:normalized.equipment;exerciseMap.set(exercise.id,{name:normalized.name,equipment});}
 const lifts=input.lifts.map(lift=>{if(!lift||typeof lift.exerciseId!=='string'||!exerciseMap.has(lift.exerciseId))throw Error('Backup lift references a missing exercise.');const exercise=exerciseMap.get(lift.exerciseId),record={id:lift.id,date:lift.date,exercise:exercise.name,equipment:exercise.equipment,sets:structuredClone(lift.sets)};if(lift.difficulty!=null)record.difficulty=lift.difficulty;if(lift.notes!=null)record.notes=lift.notes;if(lift.buddySessionId!=null)record.buddySessionId=lift.buddySessionId;return record;});
 return{version:1,settings:structuredClone(input.settings),foods,foodEntries,lifts,weights:structuredClone(input.weights),workoutTemplates:Array.isArray(input.workoutTemplates)?structuredClone(input.workoutTemplates):undefined,activeWorkout:input.activeWorkout?structuredClone(input.activeWorkout):null,workoutHistory:Array.isArray(input.workoutHistory)?structuredClone(input.workoutHistory):[],promptDate:input.promptDate??''};
}
export function encodeStoredData(data){
 const foods=[],foodByKey=new Map(),usedFoodIds=new Set();
 for(const food of data.foods){const def={id:food.id,name:food.name,calories:food.calories,protein:food.protein};if(food.lastUsed!=null)def.lastUsed=food.lastUsed;foods.push(def);usedFoodIds.add(def.id);if(!foodByKey.has(foodKey(def)))foodByKey.set(foodKey(def),def.id);}
 const foodEntries=data.foodEntries.map(entry=>{const key=foodKey(entry);let foodId=foodByKey.get(key);if(!foodId){foodId=nextStableId('food',key,usedFoodIds);usedFoodIds.add(foodId);foods.push({id:foodId,name:entry.name,calories:entry.calories,protein:entry.protein,saved:false});foodByKey.set(key,foodId);}return{id:entry.id,date:entry.date,foodId,quantity:entry.quantity};});
 const exercises=[],exerciseByKey=new Map(),usedExerciseIds=new Set();
 const lifts=data.lifts.map(lift=>{const normalized=inferExercise(lift.exercise),exercise={name:normalized.name,equipment:equipmentTypes.has(lift.equipment)?lift.equipment:normalized.equipment},key=exerciseKey(exercise);let exerciseId=exerciseByKey.get(key);if(!exerciseId){exerciseId=nextStableId('exercise',key,usedExerciseIds);usedExerciseIds.add(exerciseId);exercises.push({id:exerciseId,...exercise});exerciseByKey.set(key,exerciseId);}const record={id:lift.id,date:lift.date,exerciseId,sets:structuredClone(lift.sets)};if(lift.difficulty!=null)record.difficulty=lift.difficulty;if(lift.notes)record.notes=lift.notes;if(lift.buddySessionId)record.buddySessionId=lift.buddySessionId;return record;});
 return{version:2,settings:structuredClone(data.settings),foods,foodEntries,exercises,lifts,weights:structuredClone(data.weights),workoutTemplates:Array.isArray(data.workoutTemplates)?structuredClone(data.workoutTemplates):[],activeWorkout:data.activeWorkout?structuredClone(data.activeWorkout):null,workoutHistory:Array.isArray(data.workoutHistory)?structuredClone(data.workoutHistory):[],promptDate:data.promptDate||''};
}