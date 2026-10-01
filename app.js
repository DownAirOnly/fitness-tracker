import {load,save,id,localDate,niceDate,bmi,dailyTotals,weeklyWeights,shouldPrompt,parseFoodCSV,normalizeData,encodeData,templateExercises,round,emptyData,weekDays,startOfWeek,endOfWeek} from './data.js?v=29';

import {prepareImport,importSections} from './import-model.js?v=29';
import {hasRecords,mergeDeviceData,encodeState} from './cloud-model.js?v=29';

let deviceData=load();
let describeCloudError=error=>error?.message||'Cloud access failed. Please retry.';
let cloudApi=null, account=null, session=null, cloudBusy=false, cloudPending=false, cloudMessage='Connecting account service…', cloudReady=false, authChecked=false;
let healthState={enabled:false,status:''}, healthCheckedAt=0;
let modalBack=null, importReadToken=0, importSaving=false;
let data=deviceData, page='home', chosenDate=localDate(), workout='Upper', pendingImport=null;
const app=document.querySelector('#app');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number.isInteger(n)?String(n):round(n).toFixed(1).replace(/\.0$/,'');
const button=(label,action,cls='',attrs='')=>`<button type="button" class="${cls}" data-action="${action}" ${attrs}>${label}</button>`;
const input=(label,name,value='',type='text',extra='')=>`<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
const empty=message=>`<p class="empty">${message}</p>`;
const effortLabels={1:'Light',2:'Comfortable',3:'Challenging',4:'Hard',5:'Very Hard',6:'Limit',7:'Failure'};
const effortText=value=>effortLabels[value]||'';
const effortOptions=value=>'<option value="">Effort</option>'+Object.entries(effortLabels).map(([n,label])=>`<option value="${n}" ${Number(value)===Number(n)?'selected':''}>${label}</option>`).join('');
const persist=async()=>{
  if(!account){try{save(data);deviceData=structuredClone(data);render();return true;}catch{alert('This device could not save the change. Export a backup before leaving.');return false;}}
  if(!session?.ready || cloudBusy) return false;
  const active=session;cloudBusy=true;cloudPending=true;cloudMessage='Saving to your account…';render();
  try{await active.save(data);if(session!==active)return false;cloudPending=false;cloudMessage='Saved to your account';return true;}
  catch(error){if(session===active){cloudMessage=describeCloudError(error);cloudPending=true;}return false;}
  finally{if(session===active){cloudBusy=false;render();}}
};
const progressBar=(value,goal,color)=>`<div class="bar"><span style="width:${Math.min(100,Math.max(0,value/goal*100))}%;background:${color}"></span></div>`;

function isLoading(){return !authChecked || Boolean(account && !session?.ready);}
function shell(content) {
  app.innerHTML=`<div class="shell"><header class="top"><button class="brand" data-action="home"><span class="mark">✳</span> everyday<span class="brand-dot">.</span></button><button class="top-date" data-action="history">${niceDate(localDate())} <span>↗</span></button></header>${page==='home'?'':accountBanner()}${cloudSaveWarning()}<main aria-busy="${isLoading()}">${content}</main>${page==='home'?accountBanner():''}<nav class="nav" aria-label="Main navigation">${[['home','⌂','Home'],['food','◒','Food'],['gym','▣','Lifting'],['progress','↗','Progress'],['settings','⚙','More']].map(([p,icon,label])=>`<button class="${page===p?'active':''}" data-action="${p}" ${isLoading()?'disabled':''} aria-label="${label}" ${page===p?'aria-current="page"':''}><span>${icon}</span><small>${label}</small></button>`).join('')}</nav></div><div id="overlay"></div>`;
}
function render() {
  modalBack=null;pendingImport=null;importReadToken++;
  if(isLoading()){
    const error=account&&!cloudBusy?`<section class="panel" role="alert"><p class="body-copy">${esc(cloudMessage)}</p>${button('Retry loading','cloud-load','primary')}</section>`:'';
    shell((page==='home'?home(true):`<section class="panel"><h2>Loading your account</h2><p class="body-copy">Please wait…</p></section>`)+error);return;
  }
  const views={home,food,gym,progress,history,settings};
  shell(views[page]?.()||home());
}
function home(loading=false) {
  const today=localDate(), totals=dailyTotals(data.foodEntries,today), latest=[...data.weights].sort((a,b)=>b.date.localeCompare(a.date))[0];
  const remaining=Math.round(data.settings.calories-totals.calories);
  return `<section class="home-actions" aria-label="What do you want to log?"><button class="big-action food-action" data-action="food" ${loading?'disabled':''}><span class="action-icon">◒</span><span><strong>Food</strong><small>Calories, protein & saved foods</small></span><b>↗</b></button><button class="big-action lift-action" data-action="gym" ${loading?'disabled':''}><span class="action-icon">▣</span><span><strong>Lifting</strong><small>Sets, reps & previous workouts</small></span><b>↗</b></button></section><section class="today-card"><div class="section-head"><div><p class="eyebrow">AT A GLANCE</p><h2>Today so far</h2></div>${button('View day ↗','history','text-btn',loading?'disabled':'')}</div><div class="metric-row"><div><b>${loading?'—':Math.round(totals.calories).toLocaleString()}</b><small>of ${loading?'—':data.settings.calories} cal</small>${progressBar(loading?0:totals.calories,data.settings.calories,'#d8eb86')}</div><div><b>${loading?'—':Math.round(totals.protein)}<em>g</em></b><small>of ${loading?'—':data.settings.protein}g protein</small>${progressBar(loading?0:totals.protein,data.settings.protein,'#9fd9bf')}</div></div><p class="hint">${loading?'—':remaining>=0?`${remaining} calories left in your daily goal`:`${-remaining} calories above your daily goal`}</p></section><section class="weight-strip"><div><span class="small-icon">⚖</span><span><strong>${loading?'—':latest?`${fmt(latest.value)} ${data.settings.unit}`:'No weigh-in yet'}</strong><small>${loading?'—':latest?`Last logged ${niceDate(latest.date)}`:'A morning check-in when you are ready'}</small></span></div>${button('Log weight','weight','outline small',loading?'disabled':'')}</section>`;
}
function foodTotals(totals){
  return `<span class="food-total-grid"><span><small>CALORIES</small><span class="food-total-number"><strong>${Math.round(totals.calories)}</strong><span>/ ${data.settings.calories}</span></span><span class="bar"><span style="width:${Math.min(100,Math.max(0,totals.calories/data.settings.calories*100))}%;background:#d8eb86"></span></span></span><span><small>PROTEIN</small><span class="food-total-number"><strong>${Math.round(totals.protein)}g</strong><span>/ ${data.settings.protein}g</span></span><span class="bar"><span style="width:${Math.min(100,Math.max(0,totals.protein/data.settings.protein*100))}%;background:#9fd9bf"></span></span></span></span>`;
}
function foodEntryDetail(e){return `${fmt(e.calories*e.quantity)} cal · ${fmt(e.protein*e.quantity)}g protein${e.quantity!==1?` · ${fmt(e.quantity)} servings`:''}`;}
function foodMatches(name){
 const normalize=value=>value.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(),wanted=normalize(name);if(wanted.length<2)return [];const wantedWords=new Set(wanted.split(' ').filter(Boolean));
 return data.foods.map(food=>{const candidate=normalize(food.name),words=new Set(candidate.split(' ').filter(Boolean)),shared=[...wantedWords].filter(word=>words.has(word)).length,union=new Set([...wantedWords,...words]).size;const score=wanted===candidate?1:candidate.startsWith(wanted)?.95:candidate.includes(wanted)?.9:wanted.includes(candidate)?.85:union?shared/union:0;return{food,score};}).filter(x=>x.score>=.35).sort((a,b)=>b.score-a.score||(b.food.lastUsed||'').localeCompare(a.food.lastUsed||'')).slice(0,5).map(x=>x.food);
}
function renderFoodMatches(form){
 const box=form.querySelector('.food-matches'),matches=foodMatches(form.elements.name.value);form.elements.cardId.value='';
 box.innerHTML=matches.length?'<span class="food-match-label">Saved foods</span>'+matches.map(food=>'<button type="button" class="food-match" data-action="choose-food-match" data-id="'+esc(food.id)+'"><span><strong>'+esc(food.name)+'</strong><small>'+fmt(food.calories)+' cal · '+fmt(food.protein)+'g protein</small></span><b>Use</b></button>').join(''):'';
}
function foodLog(){
  const entries=data.foodEntries.filter(e=>e.date===chosenDate).slice().reverse();
  modal(`Food log · ${niceDate(chosenDate)}`,`<div class="food-log-totals">${foodTotals(dailyTotals(data.foodEntries,chosenDate))}</div><p class="hint">${esc(chosenDate)} · ${entries.length} entr${entries.length===1?'y':'ies'} · newest added first</p><div class="full-food-log">${entries.length?entries.map(e=>`<div class="list-row"><span><strong>${esc(e.name)}</strong><small>${foodEntryDetail(e)}</small></span>${button('Edit','edit-entry','text-btn',`data-id="${esc(e.id)}" aria-label="Edit ${esc(e.name)}"`)}</div>`).join(''):empty('Nothing logged for this date yet.')}</div><div class="form-actions spaced">${button('+ Add food','new-food','primary')}</div>`);
}
function food() {
  const totals=dailyTotals(data.foodEntries,chosenDate), entries=data.foodEntries.filter(x=>x.date===chosenDate).slice().reverse();
  const foods=[...data.foods].sort((a,b)=>(b.lastUsed||'').localeCompare(a.lastUsed||'')||a.name.localeCompare(b.name));
  return `<div class="page-head food-page-head"><p class="eyebrow">NUTRITION</p><h1>Food tracking<span class="accent">.</span></h1></div>${dateHeader('Viewing')}<section class="food-day"><button type="button" class="daily-food-card" data-action="food-log" aria-label="Open complete food log for ${esc(chosenDate)}" aria-haspopup="dialog">${foodTotals(totals)}<span class="food-preview-heading"><strong>${chosenDate===localDate()?"Today's food log":'Food log · '+esc(niceDate(chosenDate))}</strong><small>${entries.length} entr${entries.length===1?'y':'ies'}</small></span><span class="food-preview">${entries.length?entries.slice(0,3).map(e=>`<span class="food-preview-row"><strong>${esc(e.name)}</strong><small>${foodEntryDetail(e)}</small></span>`).join(''):'<span class="food-preview-empty">Nothing logged for this date yet.</span>'}</span><span class="food-log-open">${entries.length>3?`View all ${entries.length} entries`:'Open full food log'} <span aria-hidden="true">↗</span></span></button><div class="food-add-row">${button('+ Add food','new-food','primary small')}</div></section><section><div class="section-head"><div><p class="eyebrow">ONE TAP TO REPEAT</p><h2>Saved foods</h2></div>${button('+ New food','new-food','primary small')}</div>${foods.length?`<div class="food-grid">${foods.map(f=>`<div class="food-card"><button class="food-main" data-action="add-saved" data-id="${esc(f.id)}"><strong>${esc(f.name)}</strong><small>${fmt(f.calories)} cal · ${fmt(f.protein)}g protein</small><span>+ Add to ${chosenDate===localDate()?'today':niceDate(chosenDate)}</span></button><button class="card-edit" data-action="edit-card" data-id="${esc(f.id)}" aria-label="Edit ${esc(f.name)}">•••</button></div>`).join('')}</div>`:empty('Your food cards appear here automatically after you log a new food.')}</section>`;
}
function savedWorkouts(){return Array.isArray(data.workoutTemplates)&&data.workoutTemplates.length?data.workoutTemplates:Object.entries(templateExercises).map(([name,exercises],i)=>({id:'legacy-'+i,name,exercises}));}
function workoutByName(name){const list=savedWorkouts();return list.find(w=>w.name===name)||list[0];}
function exerciseCatalog(){const map=new Map();for(const e of savedWorkouts().flatMap(w=>w.exercises))map.set(e.name.toLowerCase()+'|'+e.equipment,e);for(const l of data.lifts){const e={name:l.exercise,equipment:l.equipment||'other'},key=e.name.toLowerCase()+'|'+e.equipment;if(!map.has(key))map.set(key,e);}return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name)||a.equipment.localeCompare(b.equipment));}
function equipmentLabel(type){return ({machine:'Machine',cable:'Cable',dumbbell:'Dumbbell',bench:'Bench',calisthenics:'Calisthenics',other:'Other'})[type]||'Other';}
function equipmentGlyph(type){
 const icons={
  dumbbell:'<svg viewBox="0 0 120 72" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"><path d="M37 36h46"/><path d="M30 21v30M20 26v20M90 21v30M100 26v20"/></g></svg>',
  cable:'<svg viewBox="0 0 120 72" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 47L34 36H86L103 47"/><path d="M34 36L43 30M86 36L77 30"/></g></svg>',
  machine:'<svg viewBox="0 0 120 100" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><path d="M25 89V15h66v74"/><rect x="31" y="28" width="13" height="47" rx="3"/><path d="M66 30v24M53 54h31M57 54v28M80 54v28M51 82h35"/></g></svg>',
  bench:'<svg viewBox="0 0 120 72" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"><path d="M24 37h72M35 37l-8 25M85 37l8 25"/></g></svg>',
  calisthenics:'<svg viewBox="0 0 120 90" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"><circle cx="60" cy="18" r="8"/><path d="M60 27v27M60 36L37 48M60 36l23 12M60 54L43 78M60 54l17 24"/></g></svg>',
  other:'<svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="24" fill="none" stroke="currentColor" stroke-width="6"/></svg>'
 };return icons[type]||icons.other;
}
function exerciseMatches(name){const normalize=v=>v.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(),wanted=normalize(name);if(wanted.length<2)return [];const wantedWords=new Set(wanted.split(' ').filter(Boolean));return exerciseCatalog().map(exercise=>{const candidate=normalize(exercise.name),words=new Set(candidate.split(' ').filter(Boolean)),shared=[...wantedWords].filter(word=>words.has(word)).length,union=new Set([...wantedWords,...words]).size;const score=wanted===candidate?1:candidate.startsWith(wanted)?.95:candidate.includes(wanted)?.9:wanted.includes(candidate)?.85:union?shared/union:0;return{exercise,score};}).filter(x=>x.score>=.35).sort((a,b)=>b.score-a.score||a.exercise.name.localeCompare(b.exercise.name)).slice(0,6).map(x=>x.exercise);}
function renderExerciseMatches(form){const box=form.querySelector('.exercise-matches'),matches=exerciseMatches(form.elements.exercise.value);box.innerHTML=matches.length?'<span class="food-match-label">Existing exercises</span>'+matches.map(e=>'<button type="button" class="food-match" data-action="choose-exercise-match" data-name="'+esc(e.name)+'" data-equipment="'+esc(e.equipment)+'"><span><strong>'+esc(e.name)+'</strong><small>'+equipmentLabel(e.equipment)+(lastLift(e.name,'',e.equipment)?.date?' · Last logged '+niceDate(lastLift(e.name,'',e.equipment).date):'')+'</small></span><b>Use</b></button>').join(''):'';}
function exerciseCard(e){const prior=lastLift(e.name,'',e.equipment);return `<button class="exercise equipment-${esc(e.equipment)}" data-action="new-lift" data-name="${esc(e.name)}" data-equipment="${esc(e.equipment)}"><span class="equipment-art" aria-hidden="true">${equipmentGlyph(e.equipment)}</span><span class="exercise-copy"><small class="equipment-label">${equipmentLabel(e.equipment)}</small><strong>${esc(e.name)}</strong><small>${prior?`Last: ${describeLift(prior)}`:'First time · start where you are'}</small>${e.setup?`<small class="exercise-setup">Setup: ${esc(e.setup)}</small>`:''}</span><b>+</b></button>`;}

function workoutTemplateForm(name){
 const w=workoutByName(name);if(!w)return;
 modal('Edit '+w.name+' workout',`<form class="form workout-template-form" data-form="workout-template"><input type="hidden" name="workoutId" value="${esc(w.id)}"><p class="hint">These values belong to this workout. Workout Buddy copies them when a session starts.</p><div class="workout-template-list">${w.exercises.map((e,i)=>`<section class="workout-template-row"><div class="workout-template-title"><span class="equipment-mini">${equipmentGlyph(e.equipment)}</span><span><small>${equipmentLabel(e.equipment)}</small><strong>${esc(e.name)}</strong></span></div><label class="field"><span>Setup / machine setting</span><input name="setup-${i}" type="text" maxlength="200" value="${esc(e.setup||'')}" placeholder="Seat 3, pin position, handle…"></label><div class="workout-range-edit"><label class="field"><span>Min reps</span><input name="repMin-${i}" type="number" min="1" max="100" step="1" value="${e.repMin||6}"></label><label class="field"><span>Max reps</span><input name="repMax-${i}" type="number" min="1" max="100" step="1" value="${e.repMax||12}"></label></div></section>`).join('')}</div><div class="form-actions"><button class="primary" type="submit">Save workout</button></div></form>`);
}
const isoNow=()=>new Date().toISOString();
const buddySeconds=(a,b=isoNow())=>a&&b?Math.max(0,Math.round((new Date(b)-new Date(a))/1000)):0;
const buddyClock=value=>{value=Math.max(0,Math.floor(value||0));const h=Math.floor(value/3600),m=Math.floor(value%3600/60),s=value%60;return h?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${m}:${String(s).padStart(2,'0')}`;};
const buddyKey=e=>`${e.name.toLowerCase()}|${e.equipment}`;
const buddyFind=(s,key)=>s.exercises.find(e=>buddyKey(e)===key);
function buddyPrior(e){return data.lifts.filter(l=>l.exercise.toLowerCase()===e.name.toLowerCase()&&(l.equipment||'other')===e.equipment&&l.date<=localDate()).sort((a,b)=>b.date.localeCompare(a.date))[0];}
function buddyTargetSets(e){return Math.max(2,buddyPrior(e)?.sets?.length||2);}
function buddyRepRange(e){return {min:Number(e.repMin)||(e.name==='Calf Extension'?10:6),max:Number(e.repMax)||(e.name==='Calf Extension'?16:12)};}
function buddyEffortButtons(value){return Object.entries(effortLabels).map(([n,label])=>`<button type="button" class="buddy-effort effort-${n} ${Number(value)===Number(n)?'selected':''}" data-action="buddy-effort" data-value="${n}" aria-pressed="${Number(value)===Number(n)}"><b>${n}</b><span>${label}</span></button>`).join('');}
function buddyDraft(e,index){const prior=buddyPrior(e),source=e.sets[index-1]||prior?.sets?.[index]||prior?.sets?.at(-1)||{weight:0,reps:8};return{weight:Number(source.weight)||0,reps:Number(source.reps)||8,difficulty:Number(source.difficulty)||0};}
function buddyStart(type){const w=workoutByName(type);if(!w)return;data.activeWorkout={id:id(),workoutId:w.id,type:w.name,date:localDate(),startedAt:isoNow(),phase:'bike',selected:null,exercises:w.exercises.map(e=>({name:e.name,equipment:e.equipment,repMin:e.repMin||6,repMax:e.repMax||12,...(e.setup?{setup:e.setup}:{}),status:'pending',sets:[]}))};persist();}
function buddyReadEditor(){const s=data.activeWorkout,root=document.querySelector('.buddy-set-editor');if(!s||!root||!s.selected)return;const e=buddyFind(s,s.selected);if(!e)return;const d=e.draft||buddyDraft(e,e.sets.length);d.weight=Number(root.querySelector('[name=buddyWeight]')?.value)||0;d.reps=Math.max(1,Number(root.querySelector('[name=buddyReps]')?.value)||1);d.difficulty=Number(root.querySelector('[name=buddyDifficulty]')?.value)||0;e.draft=d;}
function buddyRender(){
 const s=data.activeWorkout;if(!s)return'';const done=s.exercises.filter(e=>e.status==='done').length,total=s.exercises.length;
 const head=`<header class="buddy-head"><span><small>${esc(s.type.toUpperCase())}</small><strong>Workout Buddy</strong></span><span class="buddy-head-actions"><span class="buddy-elapsed" data-buddy-elapsed>${buddyClock(buddySeconds(s.startedAt))}</span><button type="button" class="buddy-exit" data-action="buddy-exit">Exit</button></span></header>`;
 if(s.phase==='bike')return `<div class="buddy-screen">${head}<main class="buddy-main buddy-bike"><div class="buddy-step"><span class="buddy-step-number">01</span><p class="eyebrow">WARM-UP</p><h1>Bike · 5 min</h1><p>Head to the bike. Use the bike's timer for five minutes, then continue when you're ready to lift.</p></div><button class="buddy-a" data-action="buddy-bike-done"><span>Bike finished</span><b>Continue</b></button></main></div>`;
 if(s.phase==='picker'){const remaining=s.exercises.filter(e=>e.status!=='done');return `<div class="buddy-screen">${head}<main class="buddy-main"><div class="buddy-progress"><span>${done} of ${total} exercises</span><span>${total-done} remaining</span></div><div class="buddy-picker-head"><p class="eyebrow">${done?'CHOOSE WHAT’S NEXT':'READY TO LIFT'}</p><h1>${done?'Next exercise':'Choose your first exercise'}</h1><p>Select what’s available. Timing starts when you start the set.</p></div><div class="buddy-exercise-list">${remaining.map(e=>{const prior=buddyPrior(e);return `<button class="buddy-exercise exercise equipment-${esc(e.equipment)}" data-action="buddy-choose" data-key="${esc(buddyKey(e))}"><span class="equipment-art" aria-hidden="true">${equipmentGlyph(e.equipment)}</span><span class="exercise-copy"><small class="equipment-label">${equipmentLabel(e.equipment)}</small><strong>${esc(e.name)}</strong><small>${prior?`Last: ${describeLift(prior)}`:'No previous log'}</small>${e.setup?`<small class="exercise-setup">Setup: ${esc(e.setup)}</small>`:''}</span><b>›</b></button>`}).join('')}</div></main></div>`;}
 if(s.phase==='complete')return `<div class="buddy-screen">${head}<main class="buddy-main buddy-complete"><div><p class="eyebrow">CIRCUIT COMPLETE</p><h1>${esc(s.type)} finished</h1><p>${done} exercises · ${buddyClock(buddySeconds(s.startedAt,s.completedAt))} total</p></div><button class="buddy-a" data-action="buddy-confirm-finish"><span>Ready to wrap up?</span><b>Finish workout</b></button><button class="buddy-secondary" data-action="buddy-back-picker">Back to exercises</button></main></div>`;
 const e=buddyFind(s,s.selected);if(!e)return'';const i=e.sets.length,target=buddyTargetSets(e),d=e.draft||buddyDraft(e,i),prior=buddyPrior(e),running=Boolean(e.activeSetStartedAt),resting=Boolean(e.restStartedAt&&!running),left=resting?Math.max(0,(e.restSeconds||90)-buddySeconds(e.restStartedAt)):0,range=buddyRepRange(e);
 const state=running?`Set ${i+1} in progress`:resting?(left?`Rest · ${buddyClock(left)} remaining`:'Rest complete'):`Set ${i+1} of ${target}`,action=running?`Finish set ${i+1}`:`Start set ${i+1}`;
 const weightStep=data.settings.unit==='kg'?1.1:2.5;
 return `<div class="buddy-screen">${head}<main class="buddy-main buddy-exercise-view"><button class="buddy-back" data-action="buddy-picker">‹ Exercises</button><div class="buddy-exercise-title"><small>${equipmentLabel(e.equipment)}</small><h1>${esc(e.name)}</h1><div class="buddy-meta-row"><div class="buddy-rep-range"><span>REP RANGE</span><strong>${range.min}–${range.max}</strong></div>${e.setup?`<div class="buddy-setup"><span>SETUP</span><strong>${esc(e.setup)}</strong></div>`:''}</div>${prior?`<p>Last · ${describeLift(prior)}</p>`:''}</div>${resting?`<div class="buddy-rest-timer"><small>REST</small><strong data-buddy-rest>${left?buddyClock(left):'Ready'}</strong></div>`:''}<div class="buddy-set-editor"><div class="buddy-number-field"><span>Weight</span><div class="buddy-stepper"><button type="button" data-action="buddy-adjust" data-field="weight" data-delta="-${weightStep}">−</button><button type="button" data-action="buddy-adjust" data-field="weight" data-delta="${weightStep}">+</button></div><div class="buddy-number-input"><input name="buddyWeight" type="number" min="0" step="${weightStep}" inputmode="decimal" value="${esc(d.weight)}"><small>${esc(data.settings.unit)}</small></div></div><div class="buddy-number-field"><span>Reps</span><div class="buddy-stepper"><button type="button" data-action="buddy-adjust" data-field="reps" data-delta="-1">−</button><button type="button" data-action="buddy-adjust" data-field="reps" data-delta="1">+</button></div><input name="buddyReps" type="number" min="1" step="1" inputmode="numeric" value="${esc(d.reps)}"></div><input type="hidden" name="buddyDifficulty" value="${d.difficulty||0}"></div><div class="buddy-effort-wrap"><span>PERCEIVED EFFORT</span><div class="buddy-effort-grid">${buddyEffortButtons(d.difficulty)}</div></div><div class="buddy-set-dots">${Array.from({length:target},(_,n)=>`<span class="${n<i?'done':n===i?'current':''}">${n+1}</span>`).join('')}</div><button class="buddy-a" data-action="buddy-a"><span data-buddy-state>${state}</span><b>${action}</b></button>${resting?'<p class="buddy-rest-note">The timer is only a guide. Start whenever you’re ready.</p>':''}</main></div>`;
}
let buddyTicker=null;
function buddyOpen(){document.documentElement.classList.add('buddy-active');document.body.classList.add('buddy-active');document.querySelector('#buddy-root').innerHTML=buddyRender();clearInterval(buddyTicker);buddyTicker=setInterval(()=>{const s=data.activeWorkout;if(!s)return clearInterval(buddyTicker);const elapsed=document.querySelector('[data-buddy-elapsed]');if(elapsed)elapsed.textContent=buddyClock(buddySeconds(s.startedAt));const state=document.querySelector('[data-buddy-state]');if(state&&s.phase==='exercise'){const e=buddyFind(s,s.selected);if(e?.restStartedAt&&!e.activeSetStartedAt){const left=Math.max(0,(e.restSeconds||90)-buddySeconds(e.restStartedAt));state.textContent=left?`Rest · ${buddyClock(left)} remaining`:'Rest complete';const rest=document.querySelector('[data-buddy-rest]');if(rest)rest.textContent=left?buddyClock(left):'Ready';}}},1000);}
function buddyClose(){document.documentElement.classList.remove('buddy-active');document.body.classList.remove('buddy-active');document.querySelector('#buddy-root').innerHTML='';clearInterval(buddyTicker);buddyTicker=null;}
async function buddyPersist(){await persist();if(data.activeWorkout)buddyOpen();}
function buddyUpsertLift(s,e){if(!e.sets?.length)return;const record={exercise:e.name,equipment:e.equipment,date:s.date,sets:e.sets.map(x=>({weight:x.weight,reps:x.reps,...(x.difficulty?{difficulty:x.difficulty}:{})})),notes:'',buddySessionId:s.id};const existing=data.lifts.find(l=>l.buddySessionId===s.id&&l.exercise===e.name&&(l.equipment||'other')===e.equipment);if(existing)Object.assign(existing,record);else data.lifts.push({id:id(),...record});}
function buddyCompleteExercise(s,e){e.status='done';e.completedAt=isoNow();delete e.activeSetStartedAt;delete e.restStartedAt;delete e.draft;buddyUpsertLift(s,e);s.selected=null;s.phase=s.exercises.every(x=>x.status==='done')?'complete':'picker';if(s.phase==='complete')s.completedAt=isoNow();}
function buddyEndOptions(){modal('End workout',`<div class="buddy-end-options"><p class="body-copy">Save the workout to keep completed sets and timing, or delete this Workout Buddy session.</p><button type="button" class="primary" data-action="buddy-save-end">Save workout</button><button type="button" class="danger" data-action="buddy-delete-prompt">Delete workout</button><button type="button" class="outline" data-action="close">Cancel</button></div>`);}
function buddyDeletePrompt(){modal('Delete workout?',`<div class="buddy-delete-confirm"><p class="body-copy"><strong>Are you sure?</strong> This removes this Workout Buddy session and its Buddy-created lift records.</p><button type="button" id="buddy-delete-confirm" class="danger" data-action="buddy-delete-confirm" disabled>Delete workout · 3</button><button type="button" class="outline" data-action="close">Cancel</button></div>`);const btn=document.querySelector('#buddy-delete-confirm');if(!btn)return;setTimeout(()=>{if(btn.isConnected)btn.textContent='Delete workout · 2';},1000);setTimeout(()=>{if(btn.isConnected)btn.textContent='Delete workout · 1';},2000);setTimeout(()=>{if(btn.isConnected){btn.disabled=false;btn.textContent='Delete workout';}},3000);}


function gym() {
 const templates=savedWorkouts(),selected=workoutByName(workout);if(selected)workout=selected.name;const logs=data.lifts.filter(x=>x.date===chosenDate).slice().reverse(),exercises=selected?.exercises||[];
 return `<div class="page-head"><p class="eyebrow">TRAINING</p><h1>Lift tracking<span class="accent">.</span></h1><p>Pick an exercise, see last time, and log the sets you actually did.</p></div><section class="buddy-entry"><div><p class="eyebrow">LIVE WORKOUT</p><h2>Workout Buddy</h2><p>${data.activeWorkout?`${esc(data.activeWorkout.type)} workout in progress`:'Fast set entry, rest timing, and exercise transitions.'}</p></div>${data.activeWorkout?`<div class="buddy-entry-actions">${button('Resume','buddy-launch','primary')}${button('End workout','buddy-end','outline small')}</div>`:button('Start','buddy-launch','primary')}</section>${dateHeader('Workout date')}<div class="workout-tabs">${templates.map(x=>button(esc(x.name),'workout',workout===x.name?'selected':'',`data-workout="${esc(x.name)}"`)).join('')}</div><section><div class="section-head"><div><p class="eyebrow">${esc(workout.toUpperCase())} DAY</p><h2>Choose an exercise</h2></div><div class="section-actions">${button('Edit workout','edit-workout','outline small')}${button('+ Custom','custom-lift','outline small')}</div></div><div class="exercise-list">${exercises.map(exerciseCard).join('')}</div></section><section class="log-section"><div class="section-head"><div><p class="eyebrow">${esc(niceDate(chosenDate).toUpperCase())}</p><h2>Logged lifts</h2></div></div>${logs.length?logs.map(l=>`<div class="list-row"><span><strong>${esc(l.exercise)}</strong><small>${equipmentLabel(l.equipment)} · ${describeLift(l)}</small></span>${button('Edit','edit-lift','text-btn',`data-id="${esc(l.id)}"`)}</div>`).join(''):empty('Your sets will show up here as you log them.')}</section>`;
}
function describeLift(l){return l.sets.map(s=>`${fmt(s.weight)} ${data.settings.unit} × ${s.reps}${s.difficulty?` · ${effortText(s.difficulty)}`:''}`).join(' · ');}
function lastLift(name,excludeId='',equipment=''){return data.lifts.filter(l=>l.exercise.toLowerCase()===name.toLowerCase()&&(!equipment||(l.equipment||'other')===equipment)&&l.id!==excludeId&&l.date<=chosenDate).sort((a,b)=>b.date.localeCompare(a.date))[0];}
function progress() {
  const weeks=weeklyWeights(data.weights,data.settings.heightInches,data.settings.unit,data.settings.weekStart), weights=[...data.weights].sort((a,b)=>b.date.localeCompare(a.date));
  const currentWeek=startOfWeek(localDate(),data.settings.weekStart), latest=weeks[0], previous=weeks[1];
  const change=previous?round(latest.average-previous.average):null;
  const days=[...new Set(data.foodEntries.map(x=>x.date))].sort().reverse().slice(0,7);
  const range=w=>`${niceDate(w.week)} – ${niceDate(endOfWeek(w.week))}`;
  return `<div class="page-head progress-head"><p class="eyebrow">THE BIG PICTURE</p><h1>Progress<span class="accent">.</span></h1><p>Weekly averages put daily changes in perspective.</p></div><section class="panel progress-trend"><div class="section-head"><div><p class="eyebrow">BODY WEIGHT</p><h2>Weekly trend</h2></div>${button('+ Weigh in','weight','primary small')}</div><p class="week-setting">Weeks start ${weekDays[data.settings.weekStart]} · ${button('Change','settings','text-btn')}</p>${latest?`<div class="trend-highlight"><p class="eyebrow">${latest.week===currentWeek?'CURRENT WEEK':'LATEST LOGGED WEEK'}</p><p class="trend-range">${range(latest)}</p><div class="trend-metrics"><div><strong>${fmt(latest.average)} <em>${data.settings.unit}</em></strong><small>Average weight · ${latest.count} weigh-in${latest.count===1?'':'s'}</small></div><div><strong>${latest.bmi??'—'}</strong><small>Average BMI</small></div></div><p class="trend-change">${change===null?'Log another week to compare averages.':`${change>0?'↑':change<0?'↓':'→'} ${fmt(Math.abs(change))} ${data.settings.unit} ${change>0?'higher':change<0?'lower':'change'} than the previous logged week`}</p></div><div class="week-list">${weeks.map(w=>`<div class="week-row" data-week="${w.week}"><span><strong>${range(w)}</strong><small>${w.week.slice(0,4)}${w.week.slice(0,4)!==endOfWeek(w.week).slice(0,4)?'–'+endOfWeek(w.week).slice(0,4):''} · ${w.count} weigh-in${w.count===1?'':'s'}${w.week===currentWeek?' · Current week':''}</small></span><span class="week-values"><strong>${fmt(w.average)} ${data.settings.unit}</strong><small>BMI ${w.bmi??'—'}</small></span></div>`).join('')}</div>`:empty('Add a weigh-in to see weekly average weight and BMI.')}<p class="hint">Averages use logged weigh-ins only. BMI uses your height in Settings.</p></section><section class="panel progress-details"><div class="section-head"><h2>Individual weigh-ins</h2><span class="progress-count">${weights.length} total</span></div>${weights.length?weights.map(w=>`<div class="list-row"><span><strong>${fmt(w.value)} ${data.settings.unit}</strong><small>${niceDate(w.date)} · ${w.date.slice(0,4)} · BMI ${bmi(w.value,data.settings.heightInches,data.settings.unit)}</small></span>${button('Edit','edit-weight','text-btn',`data-id="${esc(w.id)}"`)}</div>`).join(''):empty('No weigh-ins yet.')}</section><section class="panel progress-details"><div class="section-head"><h2>Recent food days</h2>${button('All dates ↗','history','text-btn')}</div>${days.length?days.map(day=>{const t=dailyTotals(data.foodEntries,day);return `<button class="day-link" data-action="go-date" data-date="${day}"><span>${niceDate(day)}</span><strong>${Math.round(t.calories)} cal · ${Math.round(t.protein)}g</strong></button>`}).join(''):empty('Food totals will appear once you start logging.')}</section>`;
}
function history() {
  const dates=[...new Set([...data.foodEntries,...data.lifts,...data.weights].map(x=>x.date))].sort().reverse();
  return `<div class="page-head"><p class="eyebrow">EVERY DAY COUNTS</p><h1>History<span class="accent">.</span></h1><p>Choose any date to view or correct what you logged.</p></div><div class="date-row">${input('Jump to date','date',chosenDate,'date','required')}${button('Open food','food','outline small')}</div>${dates.length?dates.map(date=>{const t=dailyTotals(data.foodEntries,date), lifts=data.lifts.filter(x=>x.date===date).length, w=data.weights.find(x=>x.date===date);return `<button class="history-day" data-action="go-date" data-date="${date}"><strong>${niceDate(date)}</strong><span>${Math.round(t.calories)} cal · ${Math.round(t.protein)}g protein<br>${lifts} lift${lifts===1?'':'s'}${w?` · ${fmt(w.value)} ${data.settings.unit}`:''}</span><b>↗</b></button>`}).join(''):empty('Your logged days will show up here.')}`;
}
function settings() {
  return `<div class="page-head"><p class="eyebrow">MAKE IT YOURS</p><h1>Settings<span class="accent">.</span></h1><p>${account?'Your logs are saved to your Google account’s private cloud space.':'Device mode: these logs are only in this browser. Sign in to save them online.'} Export backups regularly.</p></div>${accountPanel()}${healthPanel()}${appearancePanel()}${weekSettingsPanel()}<section class="panel"><h2>Your goals</h2><form data-form="settings" class="form"><div class="form-grid">${input('Daily calories','calories',data.settings.calories,'number','min="1" step="1" required')}${input('Daily protein (g)','protein',data.settings.protein,'number','min="1" step="1" required')}${input('Height (inches)','heightInches',data.settings.heightInches,'number','min="1" step="0.01" required')}<label class="field"><span>Weight unit</span><select name="unit"><option value="lb" ${data.settings.unit==='lb'?'selected':''}>Pounds (lb)</option><option value="kg" ${data.settings.unit==='kg'?'selected':''}>Kilograms (kg)</option></select></label></div><button class="primary" type="submit">Save goals</button></form><p class="hint">Changing the weight unit converts existing weights and lift sets. BMI uses height in inches.</p></section><section class="panel spaced"><p class="eyebrow">MOVE YOUR DATA</p><h2>Import & backup</h2><p class="body-copy">Import dated food rows from a CSV, or restore a complete Everyday JSON backup. Check the preview before anything is saved.</p>${button('Import food CSV','import-csv','outline')}${button('Export JSON backup','export','outline')}${button('Restore JSON backup','restore','outline')}<p class="hint">CSV columns: <code>date,name,calories,protein,quantity</code>. Dates use YYYY-MM-DD; quantity is optional. Calories and protein are per serving. Import adds rows and may create new saved food cards.</p></section><section class="panel spaced"><h2>About this version</h2><p class="body-copy">Google sign-in saves your records to a private Firebase account space. Cloud viewing and saving require a connection; signed-in fitness records are not kept in browser storage. Device mode still works offline. Export backups for an independent copy. This version supports up to about 800 KB of logs per account.</p></section>`;
}
function modal(title,body,onBack=null) {modalBack=onBack;document.querySelector('#overlay').innerHTML=`<div class="scrim" data-action="close"></div><div class="modal" tabindex="-1" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-top"><h2>${esc(title)}</h2>${button('✕','close','close-btn','aria-label="Close"')}</div>${body}</div>`;document.querySelector('.modal')?.focus({preventScroll:true});}
function close(all=false) {importReadToken++;const back=modalBack;modalBack=null;document.querySelector('#overlay').innerHTML='';pendingImport=null;if(!all&&back)back();}
function foodForm(entry=null,card=null) {
  const onBack=document.querySelector('.full-food-log')?()=>foodLog():null;
  modal(entry?'Edit food log':card?'Edit saved food':'Add food',`<form class="form" data-form="food"><input type="hidden" name="entryId" value="${esc(entry?.id||'')}"><input type="hidden" name="cardId" value="${esc(card?.id||'')}"><input type="hidden" name="cardOnly" value="${card && !entry?'yes':''}">${input('Food name','name',entry?.name||card?.name||'','text','maxlength="100" autocomplete="off" required') }${!entry&&!card?'<div class="food-matches" role="listbox" aria-label="Matching saved foods"></div>':''}<div class="form-grid">${input('Calories per serving','calories',entry?.calories??card?.calories??'','number','min="0" step="0.1" required')}${input('Protein (g) per serving','protein',entry?.protein??card?.protein??'','number','min="0" step="0.1" required')}</div>${card&&!entry?'':`<div class="form-grid">${input('Servings','quantity',entry?.quantity??1,'number','min="0.01" step="0.01" required')}${input('Date','date',entry?.date||chosenDate,'date','required')}</div>`}<div class="form-actions"><button class="primary" type="submit">${card&&!entry?'Save card':'Save food log'}</button>${entry?button('Delete log','delete-entry','danger',`data-id="${esc(entry.id)}"`):card?button('Delete card','delete-card','danger',`data-id="${esc(card.id)}"`):''}</div></form><p class="hint">Saved cards remember these per-serving values. Earlier entries keep their original values when a card changes.</p>`,onBack);
}
function liftForm(lift=null,name='',equipment='other') {
 const exercise=lift?.exercise||name,type=lift?.equipment||equipment||'other',prior=lastLift(exercise,lift?.id,type),sets=lift?.sets||prior?.sets||[{weight:0,reps:8},{weight:0,reps:8}],options=['machine','cable','dumbbell','bench','calisthenics','other'].map(x=>`<option value="${x}" ${x===type?'selected':''}>${equipmentLabel(x)}</option>`).join('');
 modal(lift?'Edit lift':'Log lift',`<form class="form lift-form" data-form="lift"><input type="hidden" name="liftId" value="${esc(lift?.id||'')}">${input('Exercise','exercise',exercise,'text','maxlength="100" autocomplete="off" required')}${!lift?'<div class="exercise-matches" role="listbox" aria-label="Matching exercises"></div>':''}<label class="field"><span>Equipment</span><select name="equipment">${options}</select></label>${input('Date','date',lift?.date||chosenDate,'date','required')}${prior?`<p class="prior">Last time · ${niceDate(prior.date)}<br><strong>${describeLift(prior)}</strong></p>`:''}<div class="section-head"><h3>Sets</h3>${button('+ Add set','add-set','text-btn')}</div><div id="sets">${sets.map((s,i)=>setRow(i,s)).join('')}</div><div class="form-grid"><label class="field lift-notes"><span>Notes (optional)</span><textarea name="notes" rows="1" maxlength="500" placeholder="Form, setup, pain, anything worth remembering">${esc(lift?.notes||'')}</textarea></label></div><div class="form-actions"><button class="primary" type="submit">Save lift</button>${lift?button('Delete lift','delete-lift','danger',`data-id="${esc(lift.id)}"`):''}</div></form>`);document.querySelector('.modal')?.classList.add('lift-dialog');
}
function setRow(i,s={weight:'',reps:'',difficulty:''}) {return `<div class="set-row"><span>${i+1}</span>${input('Weight ('+data.settings.unit+')','weight',s.weight,'number','min="0" step="0.5" inputmode="decimal" required')}${input('Reps','reps',s.reps,'number','min="1" step="1" inputmode="numeric" required')}<label class="field effort-field"><span>Effort</span><select name="difficulty" class="effort-select effort-${Number(s.difficulty)||0}" aria-label="Set ${i+1} effort">${effortOptions(s.difficulty)}</select></label>${button('−','remove-set','remove-set','aria-label="Remove set"')}</div>`;}
function weightForm(w=null) {modal(w?'Edit weigh-in':'Log your weight',`<form class="form" data-form="weight"><input type="hidden" name="weightId" value="${esc(w?.id||'')}">${input(`Weight (${data.settings.unit})`,'value',w?.value??'','number','min="1" step="0.1" required')}${input('Date','date',w?.date||localDate(),'date','required')}<div class="form-actions"><button class="primary" type="submit">Save weigh-in</button>${w?button('Delete','delete-weight','danger',`data-id="${esc(w.id)}"`):button('Enter later','later','outline')}</div></form><p class="hint">Same-day weigh-ins replace the earlier value. Your weekly average and BMI update automatically.</p>`);}
function importModal(kind) {pendingImport=null;importReadToken++;modal(kind==='csv'?'Import food CSV':'Restore backup',`<form class="form" data-form="import"><input type="hidden" name="kind" value="${kind}"><label class="field"><span>${kind==='csv'?'Choose a .csv file':'Choose an Everyday .json backup'}</span><input type="file" name="file" accept="${kind==='csv'?'.csv,text/csv':'.json,application/json'}" required></label><button type="submit" class="primary">Preview import</button></form><div id="preview" role="status"></div>`);}

app.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.querySelector('.modal')){event.preventDefault();close();}});
app.addEventListener('input',event=>{if(event.target.matches('.lift-notes textarea')){const field=event.target;field.style.height='0px';field.style.height=field.scrollHeight+'px';requestAnimationFrame(()=>field.scrollIntoView({block:'nearest',behavior:'smooth'}));}if(event.target.name==='name'&&event.target.closest('form[data-form="food"]')?.querySelector('.food-matches'))renderFoodMatches(event.target.form);if(event.target.name==='exercise'&&event.target.closest('form[data-form="lift"]')?.querySelector('.exercise-matches'))renderExerciseMatches(event.target.form);});
function syncLiftViewport(){const dialog=document.querySelector('.lift-dialog');if(!dialog)return;const vv=window.visualViewport;if(vv)dialog.style.maxHeight=Math.max(260,vv.height-8)+'px';const field=document.activeElement;if(field?.closest?.('.lift-dialog')&&field.matches('input,textarea,select'))requestAnimationFrame(()=>field.scrollIntoView({block:'nearest',behavior:'smooth'}));}
app.addEventListener('focusin',event=>{if(!event.target.closest('.lift-dialog')||!event.target.matches('input,textarea,select'))return;setTimeout(syncLiftViewport,220);});
app.addEventListener('change',event=>{if(event.target.matches('.effort-select'))event.target.className='effort-select effort-'+(event.target.value||0);if(event.target.closest('.buddy-set-editor')){buddyReadEditor();persist();}});
if(window.visualViewport){window.visualViewport.addEventListener('resize',()=>setTimeout(syncLiftViewport,40));window.visualViewport.addEventListener('scroll',syncLiftViewport);}
app.addEventListener('change',event=>{if(event.target.name==='file'){pendingImport=null;importReadToken++;const preview=document.querySelector('#preview');if(preview)preview.textContent='';return;}if(event.target.name==='appearance'){window.everydayTheme?.set(event.target.value);return;}if(event.target.name==='date' && !event.target.closest('.modal')) {if(event.target.value) {chosenDate=event.target.value;render();}}});
document.addEventListener('click',async event=>{
  const el=event.target.closest('[data-action]'); if(!el)return;const action=el.dataset.action;if(!authChecked||importSaving)return;
  if(action==='sign-in'){if(!cloudApi)return;try{await cloudApi.signIn();}catch(error){cloudMessage=describeCloudError(error);render();}return;}
  if(action==='sign-out'){if(cloudBusy||cloudPending)return alert('Finish saving, or export your changes and load cloud data, before signing out.');try{await cloudApi.signOut();}catch(error){cloudMessage=describeCloudError(error);render();}return;}
  if(action==='account'){page='settings';render();return;}
  if(action==='cloud-load'){if(cloudBusy)return;if(cloudPending&&!confirm('Discard these unsaved changes and load the latest cloud version? Export first if you want to keep them.'))return;await loadAccount();return;}
  if(action==='cloud-retry'){await persist();return;}
  if(action==='migrate-device'){
    if(!session?.ready||cloudBusy||cloudPending)return;
    if(!confirm(`Copy this device’s original logs into ${account.email}? Existing cloud entries with the same ID and same-day cloud weigh-ins will be kept.`))return;
    data=mergeDeviceData(data,deviceData);
    if(await persist()){try{localStorage.setItem('everyday-migrated:'+account.uid,'yes');}catch{}render();}return;
  }
  if(account&&(cloudBusy||cloudPending||!session?.ready)&&!['home','food','gym','progress','history','settings','account','export','close'].includes(action))return;
  if(['home','food','gym','progress','history','settings'].includes(action)){page=action;render();return;}
  if(action==='close'){close();return;}
  if(action.startsWith('health-')){await healthAction(action);return;}
  if(action==='today'){chosenDate=localDate();render();return;}
  if(action==='go-date'){chosenDate=el.dataset.date;page='food';render();return;}
  if(action==='workout'){workout=el.dataset.workout;render();return;}

  if(action==='buddy-exit'){buddyReadEditor();await persist();buddyClose();render();return;}
  if(action==='buddy-end'){if(!data.activeWorkout)return;buddyEndOptions();return;}
  if(action==='buddy-save-end'){const s=data.activeWorkout;if(!s)return;s.exercises.forEach(e=>buddyUpsertLift(s,e));s.endedAt=isoNow();s.savedEarly=true;data.workoutHistory.push(structuredClone(s));data.activeWorkout=null;close(true);buddyClose();await persist();render();return;}
  if(action==='buddy-delete-prompt'){if(!data.activeWorkout)return;buddyDeletePrompt();return;}
  if(action==='buddy-delete-confirm'){const s=data.activeWorkout;if(!s)return;data.lifts=data.lifts.filter(l=>l.buddySessionId!==s.id);data.activeWorkout=null;close(true);buddyClose();await persist();render();return;}
  if(action==='edit-workout'){workoutTemplateForm(workout);return;}
  if(action==='buddy-launch'){if(data.activeWorkout){buddyOpen();return;}modal('Start Workout Buddy',`<div class="buddy-start-list">${savedWorkouts().map(x=>`<button data-action="buddy-start" data-workout="${esc(x.name)}"><span><strong>${esc(x.name)}</strong><small>${x.exercises.length} exercises · Bike warm-up first</small></span><b>›</b></button>`).join('')}</div>`);return;}
  if(action==='buddy-start'){close(true);buddyStart(el.dataset.workout);buddyOpen();return;}
  if(action==='buddy-bike-done'){data.activeWorkout.phase='picker';data.activeWorkout.bikeCompletedAt=isoNow();await buddyPersist();return;}
  if(action==='buddy-choose'){const s=data.activeWorkout,e=buddyFind(s,el.dataset.key);if(!e)return;e.status='active';e.selectedAt=isoNow();e.draft=buddyDraft(e,e.sets.length);s.selected=el.dataset.key;s.phase='exercise';await buddyPersist();return;}
  if(action==='buddy-adjust'){const root=el.closest('.buddy-set-editor');if(!root)return;const field=el.dataset.field==='weight'?'buddyWeight':'buddyReps',input=root.querySelector('[name='+field+']');if(!input)return;const delta=Number(el.dataset.delta)||0,current=Number(input.value)||0,next=el.dataset.field==='weight'?Math.max(0,Math.round((current+delta)*10)/10):Math.max(1,Math.round(current+delta));input.value=next;buddyReadEditor();persist();return;}
  if(action==='buddy-effort'){const root=el.closest('.buddy-exercise-view'),input=root?.querySelector('[name=buddyDifficulty]');if(!input)return;input.value=el.dataset.value;root.querySelectorAll('.buddy-effort').forEach(btn=>{const selected=btn===el;btn.classList.toggle('selected',selected);btn.setAttribute('aria-pressed',selected?'true':'false');});buddyReadEditor();persist();return;}
  if(action==='buddy-picker'){buddyReadEditor();const s=data.activeWorkout;if(s){s.phase='picker';s.selected=null;}await buddyPersist();return;}
  if(action==='buddy-back-picker'){const s=data.activeWorkout;if(s){s.phase='picker';delete s.completedAt;}await buddyPersist();return;}
  if(action==='buddy-a'){buddyReadEditor();const s=data.activeWorkout,e=buddyFind(s,s.selected);if(!e)return;const i=e.sets.length,d=e.draft||buddyDraft(e,i);if(!e.activeSetStartedAt){e.activeSetStartedAt=isoNow();e.restStartedAt=null;e.status='active';await buddyPersist();return;}const finishedAt=isoNow();e.sets.push({weight:d.weight,reps:d.reps,...(d.difficulty?{difficulty:d.difficulty}:{}),startedAt:e.activeSetStartedAt,finishedAt,durationSeconds:buddySeconds(e.activeSetStartedAt,finishedAt)});delete e.activeSetStartedAt;delete e.draft;if(e.sets.length>=buddyTargetSets(e)){buddyCompleteExercise(s,e);await buddyPersist();return;}e.restStartedAt=finishedAt;e.restSeconds=90;e.draft=buddyDraft(e,e.sets.length);await buddyPersist();return;}
  if(action==='buddy-confirm-finish'){const s=data.activeWorkout;if(!s)return;s.completedAt=s.completedAt||isoNow();data.workoutHistory.push(structuredClone(s));data.activeWorkout=null;await persist();buddyClose();render();return;}

  if(action==='weight'){weightForm();return;}
  if(action==='later'){data.promptDate=localDate();persist();close(true);return;}
  if(action==='edit-weight'){weightForm(data.weights.find(x=>x.id===el.dataset.id));return;}
  if(action==='food-log'){foodLog();return;}
  if(action==='new-food'){foodForm();return;}
  if(action==='choose-food-match'){const form=el.closest('form[data-form="food"]'),food=data.foods.find(x=>x.id===el.dataset.id);if(!form||!food)return;form.elements.cardId.value=food.id;form.elements.name.value=food.name;form.elements.calories.value=food.calories;form.elements.protein.value=food.protein;form.querySelector('.food-matches').innerHTML='<div class="food-match-selected"><span><strong>'+esc(food.name)+'</strong><small>Using saved food · '+fmt(food.calories)+' cal · '+fmt(food.protein)+'g protein</small></span><button type="button" class="text-btn" data-action="clear-food-match">Change</button></div>';return;}
  if(action==='clear-food-match'){const form=el.closest('form[data-form="food"]');form.elements.cardId.value='';renderFoodMatches(form);form.elements.name.focus();return;}
  if(action==='edit-card'){foodForm(null,data.foods.find(x=>x.id===el.dataset.id));return;}
  if(action==='edit-entry'){foodForm(data.foodEntries.find(x=>x.id===el.dataset.id));return;}
  if(action==='add-saved'){const f=data.foods.find(x=>x.id===el.dataset.id);data.foodEntries.push({id:id(),date:chosenDate,name:f.name,calories:f.calories,protein:f.protein,quantity:1});f.lastUsed=new Date().toISOString();persist();return;}
  if(action==='custom-lift'){liftForm();return;}
  if(action==='choose-exercise-match'){const form=el.closest('form[data-form="lift"]'),name=el.dataset.name,equipment=el.dataset.equipment;if(!form||!name)return;form.elements.exercise.value=name;form.elements.equipment.value=equipment;form.querySelector('.exercise-matches').innerHTML='<div class="food-match-selected"><span><strong>'+esc(name)+'</strong><small>'+equipmentLabel(equipment)+' · Using canonical exercise</small></span><button type="button" class="text-btn" data-action="clear-exercise-match">Change</button></div>';return;}
  if(action==='clear-exercise-match'){const form=el.closest('form[data-form="lift"]');renderExerciseMatches(form);form.elements.exercise.focus();return;}
  if(action==='new-lift'){liftForm(null,el.dataset.name,el.dataset.equipment);return;}
  if(action==='edit-lift'){liftForm(data.lifts.find(x=>x.id===el.dataset.id));return;}
  if(action==='add-set'){const wrap=document.querySelector('#sets'),last=wrap.lastElementChild;wrap.insertAdjacentHTML('beforeend',setRow(wrap.children.length,{weight:last?.querySelector('[name=weight]')?.value||0,reps:last?.querySelector('[name=reps]')?.value||8,difficulty:last?.querySelector('[name=difficulty]')?.value||''}));const row=wrap.lastElementChild;requestAnimationFrame(()=>row.querySelector('[name=weight]')?.focus());return;}
  if(action==='remove-set'){const wrap=document.querySelector('#sets');if(wrap.children.length>1){el.closest('.set-row').remove();[...wrap.children].forEach((r,i)=>r.firstElementChild.textContent=i+1);}return;}
  if(action.startsWith('delete-')) {if(!confirm('Delete this item?'))return;const key={'delete-entry':'foodEntries','delete-card':'foods','delete-lift':'lifts','delete-weight':'weights'}[action];data[key]=data[key].filter(x=>x.id!==el.dataset.id);close(true);persist();return;}
  if(action==='import-csv'){importModal('csv');return;}
  if(action==='restore'){importModal('json');return;}
  if(action==='export'){const blob=new Blob([JSON.stringify(encodeData(data),null,2)],{type:'application/json'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`everyday-backup-${localDate()}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);return;}
  if(action==='import-more'){expandImportGroup(el);return;}
  if(action==='choose-import'){importModal(el.dataset.kind);return;}
  if(action==='commit-import'){await commitImport();return;}
});
app.addEventListener('submit',async event=>{
  const form=event.target;if(!form.dataset.form)return;event.preventDefault();if(importSaving||account&&(cloudBusy||cloudPending||!session?.ready))return;const v=Object.fromEntries(new FormData(form));
  if(form.dataset.form==='workout-template'){const w=data.workoutTemplates?.find(x=>x.id===v.workoutId);if(!w)return;for(let i=0;i<w.exercises.length;i++){const min=Number(form.elements['repMin-'+i]?.value),max=Number(form.elements['repMax-'+i]?.value),setup=(form.elements['setup-'+i]?.value||'').trim();if(!Number.isInteger(min)||!Number.isInteger(max)||min<1||max<min||max>100||setup.length>200)return alert('Check the rep ranges and setup notes.');w.exercises[i].repMin=min;w.exercises[i].repMax=max;if(setup)w.exercises[i].setup=setup;else delete w.exercises[i].setup;}close(true);await persist();render();return;}
  if(form.dataset.form==='week-settings'){const weekStart=Number(v.weekStart);if(!Number.isInteger(weekStart)||weekStart<0||weekStart>6)return;data.settings.weekStart=weekStart;await persist();return;}
  if(form.dataset.form==='settings') {const calories=Number(v.calories),protein=Number(v.protein),heightInches=Number(v.heightInches);if([calories,protein,heightInches].some(x=>!Number.isFinite(x)||x<=0))return alert('Enter positive goals and height.');if(v.unit!==data.settings.unit){const factor=v.unit==='kg'?1/2.2046226218:2.2046226218;data.weights.forEach(w=>w.value=round(w.value*factor));data.lifts.forEach(l=>l.sets.forEach(s=>s.weight=round(s.weight*factor)));}data.settings={...data.settings,calories,protein,heightInches,unit:v.unit};persist();return;}
  if(form.dataset.form==='food') {const name=v.name.trim(),calories=Number(v.calories),protein=Number(v.protein),quantity=Number(v.quantity||1);if(!name||!Number.isFinite(calories)||calories<0||!Number.isFinite(protein)||protein<0||!Number.isFinite(quantity)||quantity<=0||(!v.cardOnly&&!/^\d{4}-\d{2}-\d{2}$/.test(v.date)))return alert('Check the food values and date.');const card=data.foods.find(x=>x.id===v.cardId);if(card){if(v.cardOnly){card.name=name;card.calories=calories;card.protein=protein;card.lastUsed=new Date().toISOString();}else if(!v.entryId){card.lastUsed=new Date().toISOString();data.foodEntries.push({id:id(),name:card.name,calories:card.calories,protein:card.protein,quantity,date:v.date});chosenDate=v.date;close(true);persist();return;}}else if(!v.entryId&&!v.cardOnly)data.foods.push({id:id(),name,calories,protein,lastUsed:new Date().toISOString()});if(!v.cardOnly){const item=data.foodEntries.find(x=>x.id===v.entryId);if(item)Object.assign(item,{name,calories,protein,quantity,date:v.date});else data.foodEntries.push({id:id(),name,calories,protein,quantity,date:v.date});chosenDate=v.date;}close(true);persist();return;}
  if(form.dataset.form==='lift') {const rows=[...form.querySelectorAll('.set-row')],sets=rows.map(r=>{const difficulty=Number(r.querySelector('[name=difficulty]').value);const set={weight:Number(r.querySelector('[name=weight]').value),reps:Number(r.querySelector('[name=reps]').value)};if(Number.isInteger(difficulty)&&difficulty>=1&&difficulty<=7)set.difficulty=difficulty;return set;});if(!v.exercise.trim()||!v.date||!sets.length||sets.some(s=>!Number.isFinite(s.weight)||s.weight<0||!Number.isInteger(s.reps)||s.reps<1))return alert('Check the exercise, date, and sets.');const item=data.lifts.find(x=>x.id===v.liftId);const record={exercise:v.exercise.trim(),equipment:v.equipment||'other',date:v.date,sets,notes:v.notes.trim()};if(item){Object.assign(item,record);delete item.difficulty;}else data.lifts.push({id:id(),...record});chosenDate=v.date;close(true);persist();return;}
  if(form.dataset.form==='weight') {const value=Number(v.value);if(!Number.isFinite(value)||value<=0||!v.date)return alert('Enter a positive weight and date.');const item=data.weights.find(x=>x.id===v.weightId)||data.weights.find(x=>x.date===v.date);if(item){Object.assign(item,{date:v.date,value});delete item.source;delete item.recordedAt;}else data.weights.push({id:id(),date:v.date,value});data.promptDate=localDate();close(true);persist();return;}
  if(form.dataset.form==='import') {
    const file=form.querySelector('[name=file]').files[0];if(!file)return;
    pendingImport=null;const token=++importReadToken, preview=form.parentElement.querySelector('#preview');preview.textContent='Reading file…';
    try{
      if(file.size>5_000_000)throw Error('The file must be under 5 MB.');
      const raw=await file.text();if(token!==importReadToken||!form.isConnected)return;
      const plan=prepareImport(v.kind,raw,data);plan.filename=file.name||'Selected file';
      if(account&&plan.candidate){try{encodeState(plan.candidate);}catch(e){plan.errors.push(e.message);plan.candidate=null;}}
      pendingImport=plan;showImportReview(plan);
    }catch(error){if(token===importReadToken&&form.isConnected){pendingImport=null;preview.textContent=error.message;preview.setAttribute('role','alert');}}
    return;
  }
});

render();
startCloud();
if('serviceWorker' in navigator && location.protocol==='https:'){navigator.serviceWorker.register('./sw.js?v=29',{updateViaCache:'none'}).then(reg=>reg.update()).catch(()=>{});navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!sessionStorage.getItem('everyday-sw-refresh')){sessionStorage.setItem('everyday-sw-refresh','1');location.reload();}});}

function accountBanner(){
  return `<div class="account-banner" role="status"><span>${esc(!authChecked?'—':account?account.email:'Device mode')}<small>${esc(isLoading()?'—':cloudMessage)}</small></span>${account?button('Account','account','text-btn'):cloudReady?button('Sign in with Google','sign-in','outline small'):button('Account','account','text-btn','disabled')}</div>`;
}
function cloudSaveWarning(){return `${account&&cloudPending&&!cloudBusy?`<div class="save-warning" role="alert"><strong>Changes are not saved online.</strong><p>${esc(cloudMessage)}</p>${button('Retry save','cloud-retry','outline small')}${button('Export unsaved backup','export','outline small')}${button('Load latest cloud data','cloud-load','outline small')}</div>`:''}`;
}
function accountPanel(){
  let migrated=false;try{migrated=localStorage.getItem('everyday-migrated:'+account?.uid)==='yes';}catch{}
  return `<section class="panel"><h2>${account?'Your account':'Save across devices'}</h2><p class="body-copy">${account?esc(account.email):'Sign in with Google to keep food, lifting and weight logs in your own cloud account. Each person gets separate records.'}</p>${account?`${button('Refresh from cloud','cloud-load','outline')}${button('Sign out','sign-out','outline')}${hasRecords(deviceData)&&!migrated?`<p class="body-copy">Original device logs found. You can copy them into this account. This keeps the device copy as a backup.</p>${button('Copy device logs to this account','migrate-device','primary')}`:''}`:cloudReady?button('Sign in with Google','sign-in','primary'):`<p>${esc(cloudMessage)}</p>`}<p class="hint">Google manages sign-in. Firebase stores account logs; other app users cannot access them when the private database rules are installed. Your browser remembers your sign-in until you sign out.</p></section>`;
}
async function loadAccount(){
  const active=session;if(!active)return;cloudBusy=true;cloudMessage='Loading your cloud logs…';render();
  try{const loaded=await active.load();if(session!==active)return;data=loaded;cloudPending=false;cloudMessage='Loaded from your account';}
  catch(error){if(session===active)cloudMessage=describeCloudError(error);}
  finally{if(session===active){cloudBusy=false;render();if(active.ready){void syncHealth();promptWeight();}}}
}
function promptWeight(){if(shouldPrompt(data))setTimeout(()=>{if(!cloudBusy&&!cloudPending&&(!account||session?.ready)&&!document.querySelector('.modal'))weightForm();},300);}
async function startCloud(){
  try{
    const cloud=await import('./cloud.js?v=29');describeCloudError=cloud.cloudError;
    cloudApi=await cloud.connectCloud(async(user,nextSession)=>{
      session?.close();session=nextSession;account=user;authChecked=true;cloudPending=false;cloudBusy=false;pendingImport=null;
      healthState={enabled:false,status:''};healthCheckedAt=0;
      data=user?emptyData():structuredClone(deviceData);
      if(user)await loadAccount();else{cloudMessage='Only on this device · sign in for cloud saving';render();promptWeight();}
    });
    cloudReady=true;render();void syncHealth();
  }catch(error){authChecked=true;cloudMessage='Cloud login unavailable. Device logs still work. Reload to retry.';render();promptWeight();}
}
window.addEventListener('beforeunload',event=>{if(cloudPending||cloudBusy){event.preventDefault();event.returnValue='';}});

function appearancePanel(){
  const selected=window.everydayTheme?.preference || 'system';
  return `<section class="panel"><h2>Appearance</h2><label class="field spaced"><span>Theme</span><select name="appearance">${[['system','System — follow device'],['dark','Dark'],['light','Light']].map(([value,label])=>`<option value="${value}" ${selected===value?'selected':''}>${label}</option>`).join('')}</select></label><p class="hint">Saved on this device. System follows your phone’s light or dark appearance.</p></section>`;
}

function dateHeader(label){
  return `<div class="date-row tracking-date">${input(label,'date',chosenDate,'date','required')}${button('Today','today','outline small','aria-label="Go to today"')}</div>`;
}

function weekSettingsPanel(){
  return `<section class="panel spaced"><h2>Your week</h2><form data-form="week-settings" class="form"><label class="field"><span>Week starts on</span><select name="weekStart">${[1,2,3,4,5,6,0].map(day=>`<option value="${day}" ${data.settings.weekStart===day?'selected':''}>${weekDays[day]}</option>`).join('')}</select></label><button class="primary" type="submit">Save week setting</button></form><p class="hint">Regroups weekly averages in Progress. Your original log dates and values stay the same.</p></section>`;
}

function importRecord(key,item,unit){
  const r=item.record;
  const title=key==='foods'||key==='foodEntries'?r.name:key==='lifts'?r.exercise:`${fmt(r.value)} ${unit}`;
  const details=key==='foods'?`${fmt(r.calories)} cal · ${fmt(r.protein)}g protein per serving${r.lastUsed?' · Last used '+r.lastUsed:''}`:key==='foodEntries'?`${r.date} · ${foodEntryDetail(r)} · Per serving: ${fmt(r.calories)} cal / ${fmt(r.protein)}g`:key==='lifts'?`${r.date} · ${r.sets.map(set=>`${fmt(set.weight)} ${unit} × ${set.reps}`).join(' · ')}${r.difficulty!=null?` · Difficulty ${r.difficulty}/10`:''}`:r.date;
  return `<div class="list-row import-record"><div><strong>${esc(title)}</strong><small>${esc(details)}</small>${key==='lifts'&&r.notes?`<p class="import-note">${esc(r.notes)}</p>`:''}<div class="import-badges">${item.badges.map(b=>`<span class="import-badge ${/duplicate|Replaces|Removed|Multiple/.test(b)?'attention':''}">${esc(b)}</span>`).join('')}</div>${item.previous?`<details class="import-previous"><summary>Existing record being replaced</summary>${importRecord(key,{record:item.previous,badges:[]},pendingImport.currentSettings.unit)}</details>`:''}</div></div>`;
}
function importGroup(group,removed=false){
  const rows=removed?group.removedRows:group.rows,key=group.key+(removed?'-removed':'');
  const unit=removed?pendingImport.currentSettings.unit:pendingImport.kind==='json'?pendingImport.settings.unit:data.settings.unit;
  return `<details class="import-group" ${removed?'':'open'}><summary>${removed?'Removed '+group.label:group.label}<span>${rows.length}</span></summary>${group.unchanged?'<p class="hint">Unchanged by CSV import.</p>':rows.length?`<div id="import-${key}">${rows.slice(0,50).map(row=>importRecord(group.key,row,unit)).join('')}</div>${rows.length>50?button(`Show next ${Math.min(50,rows.length-50)} (${50} of ${rows.length} shown)`,'import-more','outline small',`data-group="${group.key}" data-removed="${removed}" data-shown="50"`):''}`:'<p class="hint">No incoming records.</p>'}</details>`;
}
function expandImportGroup(el){
  if(!pendingImport)return;const g=pendingImport.groups.find(g=>g.key===el.dataset.group);if(!g)return;
  const removed=el.dataset.removed==='true',rows=removed?g.removedRows:g.rows,shown=Number(el.dataset.shown),next=Math.min(shown+50,rows.length);
  const unit=removed?pendingImport.currentSettings.unit:pendingImport.kind==='json'?pendingImport.settings.unit:data.settings.unit;
  document.querySelector(`#import-${g.key}${removed?'-removed':''}`).insertAdjacentHTML('beforeend',rows.slice(shown,next).map(r=>importRecord(g.key,r,unit)).join(''));
  if(next===rows.length)el.remove();else{el.dataset.shown=next;el.textContent=`Show next ${Math.min(50,rows.length-next)} (${next} of ${rows.length} shown)`;}
}
function showImportReview(plan,saveError=''){
  const json=plan.kind==='json',count=plan.groups.reduce((n,g)=>n+g.rows.length,0);
  const labels={calories:'Daily calories',protein:'Daily protein (g)',heightInches:'Height (inches)',unit:'Weight unit',weekStart:'Week starts on'};
  const settingValue=(key,value)=>key==='weekStart'?weekDays[value]:typeof value==='object'?JSON.stringify(value):String(value);
  modal('Review import',`<p class="import-filename">${esc(plan.filename)}</p><div class="import-scroll" tabindex="0" aria-label="Import records"><div class="import-summary"><p class="eyebrow">${json?'REPLACE FROM JSON BACKUP':'ADD FROM CSV'}</p><h3>${count} incoming records</h3><p>${json?'This replaces all Saved Foods, Food Entries, Lifting Entries, Weight Entries and settings. Records missing from the backup will be removed.':'Adds food entries and creates saved cards for new food names. Existing records and settings stay unchanged.'}</p><p>${json?`${plan.replaced} changed records · ${plan.removed} records removed · `:''}${plan.duplicates} possible duplicates</p><strong>Nothing has been imported yet.</strong></div>${saveError?`<div class="import-alert" role="alert"><strong>Import was not saved</strong><p>${esc(saveError)}</p><p>Your current in-memory records are unchanged.</p></div>`:''}${plan.errors.length?`<div class="import-alert" role="alert"><strong>Cannot import · ${plan.errors.length} issue${plan.errors.length===1?'':'s'}</strong><p>Fix the file and preview it again. No records will be committed, including the valid records shown below.</p><ul>${plan.errors.map(e=>`<li>${esc(e)}</li>`).join('')}</ul></div>`:''}${plan.warnings.length?`<details class="import-alert" open><summary>Review ${plan.warnings.length} warning${plan.warnings.length===1?'':'s'}</summary><ul>${plan.warnings.map(w=>`<li>${esc(w)}</li>`).join('')}</ul></details>`:''}${plan.groups.map(g=>importGroup(g)).join('')}${json?`<details class="import-group" open><summary>Settings & other data<span>${Object.keys(plan.settings).length+1}</span></summary>${Object.entries(plan.settings).map(([key,value])=>`<div class="list-row import-record"><div><strong>${esc(labels[key]||key)}</strong><small>${esc(settingValue(key,plan.currentSettings[key]))} → ${esc(settingValue(key,value))}</small><span class="import-badge ${JSON.stringify(plan.currentSettings[key])!==JSON.stringify(value)?'attention':''}">${JSON.stringify(plan.currentSettings[key])===JSON.stringify(value)?'Unchanged':'Replaces setting'}</span></div></div>`).join('')}<div class="list-row import-record"><div><strong>Daily weight-prompt date</strong><small>${esc(plan.currentPromptDate||'Not set')} → ${esc(plan.promptDate||'Not set')}</small></div></div></details>${plan.groups.filter(g=>g.removedRows.length).map(g=>importGroup(g,true)).join('')}`:'<p class="hint">Settings and weight-prompt date are unchanged.</p>'}</div><div class="import-footer"><p>${json?'Confirmation replaces the current data. Export a backup first if needed.':'Possible duplicates will also be added. Review them before confirming.'}</p><div class="form-actions">${plan.candidate?button(json?'Confirm replacement':'Confirm import','commit-import',json?'danger filled':'primary'):button('Choose another file','choose-import','primary',`data-kind="${plan.kind}"`)}${button('Cancel','close','outline')}</div></div>`);
  document.querySelector('.modal').classList.add('import-dialog');
}
async function commitImport(){
  const plan=pendingImport;if(!plan?.candidate||importSaving)return;
  if(plan.base!==JSON.stringify(data)){plan.errors.push('Current data changed. Cancel and preview this file again.');plan.candidate=null;showImportReview(plan);return;}
  const active=session,owner=account?.uid, candidate=structuredClone(plan.candidate);
  close(true);importSaving=true;cloudBusy=Boolean(account);render();
  try{
    if(account)await active.save(candidate);else save(candidate);
    if(session!==active||account?.uid!==owner)return;
    data=candidate;if(!account)deviceData=structuredClone(candidate);else cloudMessage='Saved to your account';
    importSaving=false;cloudBusy=false;render();
    alert(plan.kind==='json'?'Backup restored.':`${plan.groups.find(g=>g.key==='foodEntries').rows.length} food rows imported.`);
  }catch(error){
    if(session!==active||account?.uid!==owner)return;
    importSaving=false;cloudBusy=false;render();pendingImport=plan;showImportReview(plan,describeCloudError(error));
  }finally{importSaving=false;if(session===active)cloudBusy=false;}
}

function healthPanel(){
  if(!account)return '';
  return `<section class="panel spaced"><p class="eyebrow">APPLE HEALTH</p><h2>Weight sync</h2><p class="body-copy">Use an iPhone Shortcut to send your latest weight. Everyday checks when you open or return to the app. Your Home Screen icon stays the same.</p><p role="status">${esc(healthState.status||'Not connected. Weight access is granted in Shortcuts on your iPhone.')}</p>${healthState.enabled?`${button('Check for weight','health-check','outline')}${button('Shortcut setup','health-setup','outline')}${button('Disconnect','health-disconnect','text-btn')}`:button('Connect weight Shortcut','health-enable','primary')}<p class="hint">Latest reading only, with its original date. Existing manual weigh-ins are kept. Newer synced readings on the same day replace earlier synced readings. This does not read other Health measurements or write back to Apple Health.</p></section>`;
}
async function syncHealth(force=false){
  if(!cloudApi?.health||!account||!session?.ready||cloudBusy||cloudPending||importSaving||document.querySelector('.modal'))return;
  if(!force&&(page==='settings'||document.activeElement?.matches('input,textarea,select')||Date.now()-healthCheckedAt<30000))return;
  const active=session;healthCheckedAt=Date.now();cloudBusy=true;
  try{
    const result=await cloudApi.health.pull(active.uid,active.revision);
    if(session!==active)return;
    healthState=result;
    if(result.data){data=result.data;active.revision=result.revision;cloudMessage='Saved to your account';}
  }catch(error){if(session===active)healthState={...healthState,status:error.code==='permission-denied'?'Setup needs the updated Firebase rules. Existing tracking still works.':describeCloudError(error)};}
  finally{if(session===active){cloudBusy=false;if(!document.querySelector('.modal'))render();promptWeight();}}
}
async function healthAction(action){
  if(!account||!session?.ready||!cloudApi?.health)return;
  if(action==='health-check'){await syncHealth(true);return;}
  if(action==='health-setup'){showHealthSetup();return;}
  if(action==='health-copy'){
    try{await navigator.clipboard.writeText(cloudApi.health.url(healthState.token));document.querySelector('#health-copy-status').textContent='Copied. Paste it only into your own Shortcut.';}
    catch{document.querySelector('#health-copy-status').textContent='Copy the address from the field below.';document.querySelector('#health-url').select();}return;
  }
  if(action==='health-enable'&&!confirm('Connect Apple Health weight? Your Shortcut will upload weight and its date to Firebase. Anyone with the private sync address can submit weight to this connection, so keep it private. You can revoke it with Disconnect.'))return;
  if(action==='health-disconnect'&&!confirm('Disconnect this Shortcut? Its sync address will stop working. Previously imported weights will remain.'))return;
  const active=session;cloudBusy=true;
  try{
    if(action==='health-enable'){
      const token=await cloudApi.health.enable(active.uid);if(session!==active)return;
      healthState={enabled:true,token,status:'Waiting for your first Shortcut sync.'};
    }else if(action==='health-disconnect'){
      await cloudApi.health.disable(active.uid);if(session!==active)return;
      healthState={enabled:false,status:'Disconnected. Previously imported weights are unchanged.'};
    }
  }catch(error){if(session===active)healthState={...healthState,status:describeCloudError(error)};}
  finally{if(session===active){cloudBusy=false;render();if(action==='health-enable'&&healthState.enabled)showHealthSetup();}}
}
function showHealthSetup(){
  if(!healthState.token)return;
  modal('Set up weight sync',`<p class="body-copy">Keep your existing Everyday Home Screen icon. Use a separate Sync Everyday Weight Shortcut to send your latest reading.</p><p class="hint">This private address permits weight submissions. Do not share it or publish a Shortcut containing it. Disconnect revokes it.</p>${button('Copy private sync address','health-copy','primary')}<p id="health-copy-status" role="status"></p><label class="field"><span>Private sync address</span><textarea id="health-url" readonly rows="3">${esc(cloudApi.health.url(healthState.token))}</textarea></label><p class="body-copy">Follow the <a href="health-shortcut.html" target="_blank" rel="noopener">Shortcut setup instructions</a>. You will need the sample’s Value and Start Date, plus this address. No Google password or Firebase administrator key goes into the Shortcut.</p><p class="hint">Only the latest submitted reading waits here. Open Everyday after syncing to import it. Repeated or older readings are ignored; historical backfill and Health deletions are not synced.</p>`);
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void syncHealth();});
window.addEventListener('pageshow',()=>{void syncHealth();});
window.addEventListener('focus',()=>{void syncHealth();});
