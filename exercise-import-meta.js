// Version-independent optional exercise guidance. Never treat this as a
// prescription or infer it from exercise names during a backup migration.
const movementTypes=new Set(['push','pull','neutral']);
const cleanText=(value,max,label)=>{
 if(typeof value!=='string'||value.length>max)throw Error('Invalid '+label+'.');
 return value.trim();
};
const cleanMuscles=(value,label)=>{
 if(!Array.isArray(value)||value.length>24||value.some(x=>typeof x!=='string'||!/^[a-z][a-zA-Z0-9]{0,39}$/.test(x)))
  throw Error('Invalid '+label+'.');
 return [...new Set(value)];
};
export function normalizeExerciseMeta(value){
 if(value==null)return undefined;
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid exercise training profile.');
 const result={};
 if(value.movement!=null&&value.movement!==''){
  if(!movementTypes.has(value.movement))throw Error('Invalid exercise movement.');
  result.movement=value.movement;
 }
 if(value.pattern!=null&&value.pattern!==''){
  const pattern=cleanText(value.pattern,70,'movement pattern');
  if(!/^[a-z][a-z0-9_]*$/.test(pattern))throw Error('Invalid movement pattern.');
  result.pattern=pattern;
 }
 if(value.primaryMuscles!=null)result.primaryMuscles=cleanMuscles(value.primaryMuscles,'primary muscles');
 if(value.secondaryMuscles!=null)result.secondaryMuscles=cleanMuscles(value.secondaryMuscles,'secondary muscles');
 if(value.safetyNote!=null&&value.safetyNote!=='')result.safetyNote=cleanText(value.safetyNote,500,'safety note');
 return Object.keys(result).length?result:undefined;
}
export function normalizeRoutineCue(value){
 if(value==null||value==='')return undefined;
 return cleanText(value,500,'routine cue')||undefined;
}
export function mergeMissingExerciseMeta(previous,incoming){
 const old=normalizeExerciseMeta(previous)||{},next=normalizeExerciseMeta(incoming)||{};
 return normalizeExerciseMeta({...next,...old});
}
