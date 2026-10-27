import {emptyData,normalizeData,encodeData} from './data.js?v=84';

// A reproducible, fictional dataset. Never generated from a user's existing logs.
export const DEMO_LAST_DATE='2026-10-23';
const dateAt=offset=>new Date(Date.UTC(2026,8,12+offset)).toISOString().slice(0,10);
const nextDate=day=>new Date(Date.parse(day+'T12:00:00Z')+86400000).toISOString().slice(0,10);
const iso=(day,h,m=0)=>new Date(Date.parse(day+'T00:00:00-04:00')+(h*60+m)*60000).toISOString();
const catalog=[
 ['Core Power Elite 42g',230,42,'drink','label'],
 ['Grilled chicken rice bowl',620,49,'food','estimate'],
 ['Greek yogurt cup',110,16,'food','label'],
 ['Turkey and avocado sandwich',490,34,'food','estimate'],
 ['Banana',105,1,'food','estimate'],
 ['Protein chips',140,19,'food','label'],
 ['Salmon with potatoes',640,43,'food','estimate'],
 ['Chicken tacos (2)',530,37,'food','estimate'],
 ['Oatmeal and milk',360,17,'food','estimate'],
 ['Pasta with vegetables',570,22,'food','estimate'],
 ['Coffee with milk',75,4,'drink','estimate'],
 ['Zero-sugar soda',5,0,'drink','label'],
 ['Peanut butter toast',310,12,'food','estimate'],
 ['Mixed fruit cup',135,2,'food','estimate']
];
const baseWeights={'Chest Press':60,'Lat Pulldown':85,'Seated Row':85,'Shoulder Press':45,'Triceps Pushdown':50,'Bicep Curl':17.5,'Seated Leg Press':115,'Leg Curl':90,'Glute Kickback':90,'Leg Extension':60,'Hip Abduction':120,'Calf Extension':100,'Torso Rotation':55,'Abdominal Crunch':75,'Lateral Raise':12.5};
export function createDemoData(){
 const d=emptyData();
 d.foods=catalog.map(([name,calories,protein,kind,accuracy],i)=>({id:'demo-food-'+String(i+1).padStart(2,'0'),name,calories,protein,kind,accuracy,tags:kind==='drink'?['drink']:[],pinned:i<4,lastUsed:iso(dateAt(40),12)}));
 const addFood=(date,index,quantity,t,n)=>{const f=d.foods[index];d.foodEntries.push({id:'demo-entry-'+String(n).padStart(4,'0'),date,name:f.name,calories:f.calories,protein:f.protein,quantity,t});};
 let recordCount=0;
 for(let i=0;i<42;i++){
  if([2,13,22,23,25,26].includes(i))continue;
  const day=dateAt(i);
  addFood(day,i%3===0?8:0,1,16+(i%3)*2,++recordCount);
  addFood(day,[1,3,6,7][i%4],1,24+(i%4),++recordCount);
  addFood(day,i%5===0?4:2,1,32+(i%3),++recordCount);
  if(i%6!==4)addFood(day,[6,7,9,1][(i+1)%4],i%8===0?.75:1,38+(i%3),++recordCount);
  if(i%3===0)addFood(day,5,1,43,++recordCount);
  if(i%5===2)addFood(nextDate(day),11,1,1,++recordCount); // 00:30 next calendar date, same tracking day.
 }
 for(let i=0;i<42;i+=2){
  const wobble=[0,-.7,.2,-.3,.4,-.2][(i/2)%6];
  d.weights.push({id:'demo-weight-'+i,date:dateAt(i),value:Math.round((190.5-i*.19+wobble)*10)/10});
 }
 for(const i of [0,10,20,30,40])d.bodyFat.push({id:'demo-bodyfat-'+i,date:dateAt(i),value:Math.round((25.1-i*.054+(i%3)*.15)*10)/10});
 const sessionDays=[0,3,6,9,12,15,18,29,32,35,38,40],types=['Upper','Lower','Full body'];
 for(let s=0;s<sessionDays.length;s++){
  const day=dateAt(sessionDays[s]),template=d.workoutTemplates[s%3],items=template.exercises.map(x=>({...x,def:d.exerciseDefinitions.find(e=>e.id===x.exerciseId)})).filter(x=>x.def);
  const sequence=(s%4===1?[...items].reverse():items).slice(0,Math.min(items.length,s%3===2?6:5));
  const id='demo-session-'+String(s+1).padStart(3,'0'),startedAt=iso(day,18),exercises=[];
  for(let j=0;j<sequence.length;j++){
   const x=sequence[j],start=Date.parse(startedAt)+5*60000+j*7*60000,base=baseWeights[x.def.name]||50;
   const weight=Math.round((base+(s>=7?5:0)+(s%3===0?2.5:0))*2)/2;
   const reps1=8+(s+j)%4,reps2=Math.max(6,reps1-1-(s%3===1?1:0));
   const sets=[reps1,reps2].map((reps,n)=>({weight,reps,difficulty:Math.min(7,3+(s+j+n)%4),startedAt:new Date(start+n*150000).toISOString(),finishedAt:new Date(start+n*150000+52000).toISOString(),durationSeconds:52}));
   const notes=(j===1&&s%3===0)?'Adjusted grip; movement felt smoother.':(j===0&&s%5===0)?'Controlled tempo throughout.':'';
   exercises.push({exerciseId:x.def.id,name:x.def.name,equipment:x.def.equipment,repMin:x.repMin,repMax:x.repMax,targetSets:2,restSeconds:90,status:'done',selectedAt:new Date(start-30000).toISOString(),completedAt:sets[1].finishedAt,sets,notes,...(x.def.setup?{setup:x.def.setup}:{})});
   d.lifts.push({id:'demo-lift-'+s+'-'+j,exercise:x.def.name,equipment:x.def.equipment,date:day,sets:sets.map(({weight,reps,difficulty})=>({weight,reps,difficulty})),...(notes?{notes}:{}),buddySessionId:id});
  }
  d.workoutHistory.push({id,workoutId:template.id,type:template.name,date:day,startedAt,completedAt:new Date(Date.parse(exercises.at(-1).completedAt)+120000).toISOString(),phase:'complete',performedOrder:exercises.map(e=>e.name.toLowerCase()+'|'+e.equipment),selected:null,exercises});
 }
 d.exerciseDefinitions.find(e=>e.name==='Chest Press').setup='Seat notch 4; handles aligned with chest';
 d.exerciseDefinitions.find(e=>e.name==='Lat Pulldown').setup='Thigh pad setting 5; pull to upper chest';
 // Assert schema compatibility on every fresh load, without changing the dataset.
 return normalizeData(d);
}
export function stableDemoSnapshot(){return JSON.stringify(encodeData(createDemoData()));}
