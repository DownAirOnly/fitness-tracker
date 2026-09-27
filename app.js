import {load,save,id,localDate,niceDate,bmi,dailyTotals,weeklyWeights,shouldPrompt,parseFoodCSV,normalizeData,templateExercises,round,emptyData,weekDays,startOfWeek,endOfWeek} from './data.js?v=10';

import {hasRecords,mergeDeviceData} from './cloud-model.js?v=10';

let deviceData=load();
let describeCloudError=error=>error?.message||'Cloud access failed. Please retry.';
let cloudApi=null, account=null, session=null, cloudBusy=false, cloudPending=false, cloudMessage='Connecting account service…', cloudReady=false, authChecked=false;
let modalBack=null;
let data=deviceData, page='home', chosenDate=localDate(), workout='Upper', pendingImport=null;
const app=document.querySelector('#app');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number.isInteger(n)?String(n):round(n).toFixed(1).replace(/\.0$/,'');
const button=(label,action,cls='',attrs='')=>`<button type="button" class="${cls}" data-action="${action}" ${attrs}>${label}</button>`;
const input=(label,name,value='',type='text',extra='')=>`<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
const empty=message=>`<p class="empty">${message}</p>`;
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
  modalBack=null;
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
function foodLog(){
  const entries=data.foodEntries.filter(e=>e.date===chosenDate).slice().reverse();
  modal(`Food log · ${niceDate(chosenDate)}`,`<div class="food-log-totals">${foodTotals(dailyTotals(data.foodEntries,chosenDate))}</div><p class="hint">${esc(chosenDate)} · ${entries.length} entr${entries.length===1?'y':'ies'} · newest added first</p><div class="full-food-log">${entries.length?entries.map(e=>`<div class="list-row"><span><strong>${esc(e.name)}</strong><small>${foodEntryDetail(e)}</small></span>${button('Edit','edit-entry','text-btn',`data-id="${esc(e.id)}" aria-label="Edit ${esc(e.name)}"`)}</div>`).join(''):empty('Nothing logged for this date yet.')}</div><div class="form-actions spaced">${button('+ Add food','new-food','primary')}</div>`);
}
function food() {
  const totals=dailyTotals(data.foodEntries,chosenDate), entries=data.foodEntries.filter(x=>x.date===chosenDate).slice().reverse();
  const foods=[...data.foods].sort((a,b)=>(b.lastUsed||'').localeCompare(a.lastUsed||'')||a.name.localeCompare(b.name));
  return `<div class="page-head food-page-head"><p class="eyebrow">NUTRITION</p><h1>Food tracking<span class="accent">.</span></h1></div>${dateHeader('Viewing')}<section class="food-day"><button type="button" class="daily-food-card" data-action="food-log" aria-label="Open complete food log for ${esc(chosenDate)}" aria-haspopup="dialog">${foodTotals(totals)}<span class="food-preview-heading"><strong>${chosenDate===localDate()?"Today's food log":'Food log · '+esc(niceDate(chosenDate))}</strong><small>${entries.length} entr${entries.length===1?'y':'ies'}</small></span><span class="food-preview">${entries.length?entries.slice(0,3).map(e=>`<span class="food-preview-row"><strong>${esc(e.name)}</strong><small>${foodEntryDetail(e)}</small></span>`).join(''):'<span class="food-preview-empty">Nothing logged for this date yet.</span>'}</span><span class="food-log-open">${entries.length>3?`View all ${entries.length} entries`:'Open full food log'} <span aria-hidden="true">↗</span></span></button><div class="food-add-row">${button('+ Add food','new-food','primary small')}</div></section><section><div class="section-head"><div><p class="eyebrow">ONE TAP TO REPEAT</p><h2>Saved foods</h2></div>${button('+ New food','new-food','primary small')}</div>${foods.length?`<div class="food-grid">${foods.map(f=>`<div class="food-card"><button class="food-main" data-action="add-saved" data-id="${esc(f.id)}"><strong>${esc(f.name)}</strong><small>${fmt(f.calories)} cal · ${fmt(f.protein)}g protein</small><span>+ Add to ${chosenDate===localDate()?'today':niceDate(chosenDate)}</span></button><button class="card-edit" data-action="edit-card" data-id="${esc(f.id)}" aria-label="Edit ${esc(f.name)}">•••</button></div>`).join('')}</div>`:empty('Your food cards appear here automatically after you log a new food.')}</section>`;
}
function gym() {
  const logs=data.lifts.filter(x=>x.date===chosenDate).slice().reverse();
  const exercises=templateExercises[workout];
  return `<div class="page-head"><p class="eyebrow">TRAINING</p><h1>Lift tracking<span class="accent">.</span></h1><p>Pick an exercise, see last time, and log the sets you actually did.</p></div>${dateHeader('Workout date')}<div class="workout-tabs">${Object.keys(templateExercises).map(x=>button(esc(x),'workout',workout===x?'selected':'',`data-workout="${esc(x)}"`)).join('')}</div><section><div class="section-head"><div><p class="eyebrow">${esc(workout.toUpperCase())} DAY</p><h2>Choose an exercise</h2></div>${button('+ Custom','custom-lift','outline small')}</div><div class="exercise-list">${exercises.map(e=>{const prior=lastLift(e);return `<button class="exercise" data-action="new-lift" data-name="${esc(e)}"><span><strong>${esc(e)}</strong><small>${prior?`Last: ${describeLift(prior)}`:'First time — start where you are'}</small></span><b>+</b></button>`}).join('')}</div></section><section class="log-section"><div class="section-head"><div><p class="eyebrow">${esc(niceDate(chosenDate).toUpperCase())}</p><h2>Logged lifts</h2></div></div>${logs.length?logs.map(l=>`<div class="list-row"><span><strong>${esc(l.exercise)}</strong><small>${describeLift(l)}${l.difficulty?` · Difficulty ${l.difficulty}/10`:''}</small></span>${button('Edit','edit-lift','text-btn',`data-id="${esc(l.id)}"`)}</div>`).join(''):empty('Your sets will show up here as you log them.')}</section>`;
}
function describeLift(l) { return l.sets.map(s=>`${fmt(s.weight)} ${data.settings.unit} × ${s.reps}`).join(' · '); }
function lastLift(name,excludeId='') {return data.lifts.filter(l=>l.exercise.toLowerCase()===name.toLowerCase() && l.id!==excludeId && l.date<=chosenDate).sort((a,b)=>b.date.localeCompare(a.date))[0];}
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
  return `<div class="page-head"><p class="eyebrow">MAKE IT YOURS</p><h1>Settings<span class="accent">.</span></h1><p>${account?'Your logs are saved to your Google account’s private cloud space.':'Device mode: these logs are only in this browser. Sign in to save them online.'} Export backups regularly.</p></div>${accountPanel()}${appearancePanel()}${weekSettingsPanel()}<section class="panel"><h2>Your goals</h2><form data-form="settings" class="form"><div class="form-grid">${input('Daily calories','calories',data.settings.calories,'number','min="1" step="1" required')}${input('Daily protein (g)','protein',data.settings.protein,'number','min="1" step="1" required')}${input('Height (inches)','heightInches',data.settings.heightInches,'number','min="1" step="0.01" required')}<label class="field"><span>Weight unit</span><select name="unit"><option value="lb" ${data.settings.unit==='lb'?'selected':''}>Pounds (lb)</option><option value="kg" ${data.settings.unit==='kg'?'selected':''}>Kilograms (kg)</option></select></label></div><button class="primary" type="submit">Save goals</button></form><p class="hint">Changing the weight unit converts existing weights and lift sets. BMI uses height in inches.</p></section><section class="panel spaced"><p class="eyebrow">MOVE YOUR DATA</p><h2>Import & backup</h2><p class="body-copy">Import dated food rows from a CSV, or restore a complete Everyday JSON backup. Check the preview before anything is saved.</p>${button('Import food CSV','import-csv','outline')}${button('Export JSON backup','export','outline')}${button('Restore JSON backup','restore','outline')}<p class="hint">CSV columns: <code>date,name,calories,protein,quantity</code>. Dates use YYYY-MM-DD; quantity is optional. Calories and protein are per serving. Import adds rows and may create new saved food cards.</p></section><section class="panel spaced"><h2>About this version</h2><p class="body-copy">Google sign-in saves your records to a private Firebase account space. Cloud viewing and saving require a connection; signed-in fitness records are not kept in browser storage. Device mode still works offline. Export backups for an independent copy. This version supports up to about 800 KB of logs per account.</p></section>`;
}
function modal(title,body,onBack=null) {modalBack=onBack;document.querySelector('#overlay').innerHTML=`<div class="scrim" data-action="close"></div><div class="modal" tabindex="-1" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-top"><h2>${esc(title)}</h2>${button('✕','close','close-btn','aria-label="Close"')}</div>${body}</div>`;document.querySelector('.modal')?.focus({preventScroll:true});}
function close(all=false) {const back=modalBack;modalBack=null;document.querySelector('#overlay').innerHTML='';pendingImport=null;if(!all&&back)back();}
function foodForm(entry=null,card=null) {
  const onBack=document.querySelector('.full-food-log')?()=>foodLog():null;
  modal(entry?'Edit food log':card?'Edit saved food':'Add food',`<form class="form" data-form="food"><input type="hidden" name="entryId" value="${esc(entry?.id||'')}"><input type="hidden" name="cardId" value="${esc(card?.id||'')}"><input type="hidden" name="cardOnly" value="${card && !entry?'yes':''}">${input('Food name','name',entry?.name||card?.name||'','text','maxlength="100" required') }<div class="form-grid">${input('Calories per serving','calories',entry?.calories??card?.calories??'','number','min="0" step="0.1" required')}${input('Protein (g) per serving','protein',entry?.protein??card?.protein??'','number','min="0" step="0.1" required')}</div>${card&&!entry?'':`<div class="form-grid">${input('Servings','quantity',entry?.quantity??1,'number','min="0.01" step="0.01" required')}${input('Date','date',entry?.date||chosenDate,'date','required')}</div>`}<div class="form-actions"><button class="primary" type="submit">${card&&!entry?'Save card':'Save food log'}</button>${entry?button('Delete log','delete-entry','danger',`data-id="${esc(entry.id)}"`):card?button('Delete card','delete-card','danger',`data-id="${esc(card.id)}"`):''}</div></form><p class="hint">Saved cards remember these per-serving values. Earlier entries keep their original values when a card changes.</p>`,onBack);
}
function liftForm(lift=null,name='') {
  const exercise=lift?.exercise||name, prior=lastLift(exercise,lift?.id), sets=lift?.sets||prior?.sets||[{weight:0,reps:8},{weight:0,reps:8}];
  modal(lift?'Edit lift':'Log lift',`<form class="form" data-form="lift"><input type="hidden" name="liftId" value="${esc(lift?.id||'')}">${input('Exercise','exercise',exercise,'text','maxlength="100" required')}${input('Date','date',lift?.date||chosenDate,'date','required')}${prior?`<p class="prior">Last time · ${niceDate(prior.date)}<br><strong>${describeLift(prior)}</strong>${prior.difficulty?` · Difficulty ${prior.difficulty}/10`:''}</p>`:''}<div class="section-head"><h3>Sets</h3>${button('+ Add set','add-set','text-btn')}</div><div id="sets">${sets.map((s,i)=>setRow(i,s)).join('')}</div><div class="form-grid">${input('Difficulty (1–10)','difficulty',lift?.difficulty??'','number','min="1" max="10" step="0.5"')}${input('Notes (optional)','notes',lift?.notes||'','text','maxlength="200"')}</div><div class="form-actions"><button class="primary" type="submit">Save lift</button>${lift?button('Delete lift','delete-lift','danger',`data-id="${esc(lift.id)}"`):''}</div></form>`);
}
function setRow(i,s={weight:'',reps:''}) {return `<div class="set-row"><span>${i+1}</span>${input('Weight ('+data.settings.unit+')','weight',s.weight,'number','min="0" step="0.5" required')}${input('Reps','reps',s.reps,'number','min="1" step="1" required')}${button('−','remove-set','remove-set','aria-label="Remove set"')}</div>`;}
function weightForm(w=null) {modal(w?'Edit weigh-in':'Log your weight',`<form class="form" data-form="weight"><input type="hidden" name="weightId" value="${esc(w?.id||'')}">${input(`Weight (${data.settings.unit})`,'value',w?.value??'','number','min="1" step="0.1" required')}${input('Date','date',w?.date||localDate(),'date','required')}<div class="form-actions"><button class="primary" type="submit">Save weigh-in</button>${w?button('Delete','delete-weight','danger',`data-id="${esc(w.id)}"`):button('Enter later','later','outline')}</div></form><p class="hint">Same-day weigh-ins replace the earlier value. Your weekly average and BMI update automatically.</p>`);}
function importModal(kind) {modal(kind==='csv'?'Import food CSV':'Restore backup',`<form class="form" data-form="import"><input type="hidden" name="kind" value="${kind}"><label class="field"><span>${kind==='csv'?'Choose a .csv file':'Choose an Everyday .json backup'}</span><input type="file" name="file" accept="${kind==='csv'?'.csv,text/csv':'.json,application/json'}" required></label><button type="submit" class="primary">Preview import</button></form><div id="preview"></div>`);}

app.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.querySelector('.modal')){event.preventDefault();close();}});
app.addEventListener('change',event=>{if(event.target.name==='appearance'){window.everydayTheme?.set(event.target.value);return;}if(event.target.name==='date' && !event.target.closest('.modal')) {if(event.target.value) {chosenDate=event.target.value;render();}}});
app.addEventListener('click',async event=>{
  const el=event.target.closest('[data-action]'); if(!el)return;const action=el.dataset.action;if(!authChecked)return;
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
  if(action==='today'){chosenDate=localDate();render();return;}
  if(action==='go-date'){chosenDate=el.dataset.date;page='food';render();return;}
  if(action==='workout'){workout=el.dataset.workout;render();return;}
  if(action==='weight'){weightForm();return;}
  if(action==='later'){data.promptDate=localDate();persist();close(true);return;}
  if(action==='edit-weight'){weightForm(data.weights.find(x=>x.id===el.dataset.id));return;}
  if(action==='food-log'){foodLog();return;}
  if(action==='new-food'){foodForm();return;}
  if(action==='edit-card'){foodForm(null,data.foods.find(x=>x.id===el.dataset.id));return;}
  if(action==='edit-entry'){foodForm(data.foodEntries.find(x=>x.id===el.dataset.id));return;}
  if(action==='add-saved'){const f=data.foods.find(x=>x.id===el.dataset.id);data.foodEntries.push({id:id(),date:chosenDate,name:f.name,calories:f.calories,protein:f.protein,quantity:1});f.lastUsed=new Date().toISOString();persist();return;}
  if(action==='custom-lift'){liftForm();return;}
  if(action==='new-lift'){liftForm(null,el.dataset.name);return;}
  if(action==='edit-lift'){liftForm(data.lifts.find(x=>x.id===el.dataset.id));return;}
  if(action==='add-set'){const wrap=document.querySelector('#sets');wrap.insertAdjacentHTML('beforeend',setRow(wrap.children.length,{weight:wrap.lastElementChild?.querySelector('[name=weight]')?.value||0,reps:8}));return;}
  if(action==='remove-set'){const wrap=document.querySelector('#sets');if(wrap.children.length>1){el.closest('.set-row').remove();[...wrap.children].forEach((r,i)=>r.firstElementChild.textContent=i+1);}return;}
  if(action.startsWith('delete-')) {if(!confirm('Delete this item?'))return;const key={'delete-entry':'foodEntries','delete-card':'foods','delete-lift':'lifts','delete-weight':'weights'}[action];data[key]=data[key].filter(x=>x.id!==el.dataset.id);close(true);persist();return;}
  if(action==='import-csv'){importModal('csv');return;}
  if(action==='restore'){importModal('json');return;}
  if(action==='export'){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`everyday-backup-${localDate()}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);return;}
  if(action==='commit-import') {if(!pendingImport)return;if(pendingImport.kind==='json'){data=pendingImport.data;}else{for(const e of pendingImport.entries){data.foodEntries.push(e);if(!data.foods.some(f=>f.name.toLowerCase()===e.name.toLowerCase()))data.foods.push({id:id(),name:e.name,calories:e.calories,protein:e.protein,lastUsed:e.date});}}const count=pendingImport.kind==='csv'?pendingImport.entries.length:null;close(true);if(await persist())alert(count===null?'Backup restored.':`${count} food row${count===1?'':'s'} imported.`);return;}
});
app.addEventListener('submit',async event=>{
  const form=event.target;if(!form.dataset.form)return;event.preventDefault();if(account&&(cloudBusy||cloudPending||!session?.ready))return;const v=Object.fromEntries(new FormData(form));
  if(form.dataset.form==='week-settings'){const weekStart=Number(v.weekStart);if(!Number.isInteger(weekStart)||weekStart<0||weekStart>6)return;data.settings.weekStart=weekStart;await persist();return;}
  if(form.dataset.form==='settings') {const calories=Number(v.calories),protein=Number(v.protein),heightInches=Number(v.heightInches);if([calories,protein,heightInches].some(x=>!Number.isFinite(x)||x<=0))return alert('Enter positive goals and height.');if(v.unit!==data.settings.unit){const factor=v.unit==='kg'?1/2.2046226218:2.2046226218;data.weights.forEach(w=>w.value=round(w.value*factor));data.lifts.forEach(l=>l.sets.forEach(s=>s.weight=round(s.weight*factor)));}data.settings={...data.settings,calories,protein,heightInches,unit:v.unit};persist();return;}
  if(form.dataset.form==='food') {const name=v.name.trim(),calories=Number(v.calories),protein=Number(v.protein),quantity=Number(v.quantity||1);if(!name||!Number.isFinite(calories)||calories<0||!Number.isFinite(protein)||protein<0||!Number.isFinite(quantity)||quantity<=0||(!v.cardOnly&&!/^\d{4}-\d{2}-\d{2}$/.test(v.date)))return alert('Check the food values and date.');const card=data.foods.find(x=>x.id===v.cardId) || data.foods.find(x=>x.name.toLowerCase()===name.toLowerCase());if(card){if(v.cardOnly || !v.entryId){card.name=name;card.calories=calories;card.protein=protein;card.lastUsed=new Date().toISOString();}}else if(!v.entryId && !v.cardOnly)data.foods.push({id:id(),name,calories,protein,lastUsed:new Date().toISOString()});if(!v.cardOnly){const item=data.foodEntries.find(x=>x.id===v.entryId);if(item)Object.assign(item,{name,calories,protein,quantity,date:v.date});else data.foodEntries.push({id:id(),name,calories,protein,quantity,date:v.date});chosenDate=v.date;}close(true);persist();return;}
  if(form.dataset.form==='lift') {const rows=[...form.querySelectorAll('.set-row')],sets=rows.map(r=>({weight:Number(r.querySelector('[name=weight]').value),reps:Number(r.querySelector('[name=reps]').value)}));if(!v.exercise.trim()||!v.date||!sets.length||sets.some(s=>!Number.isFinite(s.weight)||s.weight<0||!Number.isInteger(s.reps)||s.reps<1)||v.difficulty && (Number(v.difficulty)<1||Number(v.difficulty)>10))return alert('Check the exercise, date, and sets.');const item=data.lifts.find(x=>x.id===v.liftId);const record={exercise:v.exercise.trim(),date:v.date,sets,difficulty:v.difficulty?Number(v.difficulty):null,notes:v.notes.trim()};if(item)Object.assign(item,record);else data.lifts.push({id:id(),...record});chosenDate=v.date;close(true);persist();return;}
  if(form.dataset.form==='weight') {const value=Number(v.value);if(!Number.isFinite(value)||value<=0||!v.date)return alert('Enter a positive weight and date.');const item=data.weights.find(x=>x.id===v.weightId)||data.weights.find(x=>x.date===v.date);if(item)Object.assign(item,{date:v.date,value});else data.weights.push({id:id(),date:v.date,value});data.promptDate=localDate();close(true);persist();return;}
  if(form.dataset.form==='import') {const file=form.querySelector('[name=file]').files[0];if(!file)return;try{if(file.size>5_000_000)throw Error('The file must be under 5 MB.');const raw=await file.text();if(v.kind==='csv'){const result=parseFoodCSV(raw);if(result.errors.length)throw Error(result.errors.slice(0,5).join('\n')+(result.errors.length>5?`\n…and ${result.errors.length-5} more.`:''));if(!result.entries.length)throw Error('No food rows found.');pendingImport={kind:'csv',entries:result.entries};document.querySelector('#preview').innerHTML=`<div class="import-preview"><strong>${result.entries.length} rows ready</strong><p>${esc(result.entries.slice(0,3).map(e=>`${e.date}: ${e.name} (${e.calories} cal, ${e.protein}g × ${e.quantity})`).join(' · '))}</p>${button('Import these rows','commit-import','primary')}</div>`;}else{const restored=normalizeData(JSON.parse(raw));pendingImport={kind:'json',data:restored};document.querySelector('#preview').innerHTML=`<div class="import-preview"><strong>Replace current data?</strong><p>Backup contains ${restored.foodEntries.length} food logs, ${restored.lifts.length} lifts and ${restored.weights.length} weigh-ins. This replaces the logs currently shown, including cloud logs when signed in. Export your current backup first if needed.</p>${button('Replace with backup','commit-import','danger filled')}</div>`;}}catch(error){pendingImport=null;document.querySelector('#preview').textContent=error.message;}return;}
});

render();
startCloud();
if('serviceWorker' in navigator && location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});

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
  finally{if(session===active){cloudBusy=false;render();if(active.ready)promptWeight();}}
}
function promptWeight(){if(shouldPrompt(data))setTimeout(()=>{if(!cloudBusy&&!cloudPending&&(!account||session?.ready)&&!document.querySelector('.modal'))weightForm();},300);}
async function startCloud(){
  try{
    const cloud=await import('./cloud.js?v=10');describeCloudError=cloud.cloudError;
    cloudApi=await cloud.connectCloud(async(user,nextSession)=>{
      session?.close();session=nextSession;account=user;authChecked=true;cloudPending=false;cloudBusy=false;pendingImport=null;
      data=user?emptyData():structuredClone(deviceData);
      if(user)await loadAccount();else{cloudMessage='Only on this device · sign in for cloud saving';render();promptWeight();}
    });
    cloudReady=true;render();
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
