import {load,save,id,localDate,trackingDate,niceDate,bmi,dailyTotals,weeklyWeights,shouldPrompt,parseFoodCSV,normalizeData,encodeData,templateExercises,round,emptyData,weekDays,startOfWeek,endOfWeek} from './data.js?v=51';

import {prepareImport,importSections} from './import-model.js?v=51';
import {hasRecords,mergeDeviceData,encodeState} from './cloud-model.js?v=51';
import {readCloudConfirmed,writeCloudConfirmed,readCloudRecovery,writeCloudRecovery,clearCloudRecovery,clearCloudLocal,sameCloudData,requestStorageProtection} from './durability.js?v=51';
const OFFLINE_WORKSPACE_KEY='everyday-offline-workspace-v1';
function readOfflineWorkspace(){
  try{
    const raw=localStorage.getItem(OFFLINE_WORKSPACE_KEY);if(!raw)return null;
    const stored=JSON.parse(raw),workspaceData=normalizeData(stored.data);
    return{filename:String(stored.filename||'everyday-backup.json').slice(0,180),dirty:stored.dirty===true,exportedAt:stored.exportedAt||'',data:workspaceData};
  }catch{try{localStorage.removeItem(OFFLINE_WORKSPACE_KEY);}catch{}return null;}
}
function storeOfflineWorkspace(workspaceData,markDirty=true){
  if(!offlineWorkspace)return;
  offlineWorkspace.data=structuredClone(workspaceData);
  if(markDirty)offlineWorkspace.dirty=true;
  localStorage.setItem(OFFLINE_WORKSPACE_KEY,JSON.stringify({version:1,filename:offlineWorkspace.filename,dirty:offlineWorkspace.dirty,exportedAt:offlineWorkspace.exportedAt||'',data:encodeData(workspaceData)}));
}
function offlineOutputName(){
  const base=(offlineWorkspace?.filename||'everyday-backup.json').replace(/\.json$/i,'').replace(/-updated-\d{4}-\d{2}-\d{2}$/i,'');
  return base+'-updated-'+localDate()+'.json';
}
function downloadJsonBackup(filename,markWorkspace=false,sourceData=data){
  const blob=new Blob([JSON.stringify(encodeData(sourceData),null,2)],{type:'application/json'}),link=document.createElement('a');
  link.href=URL.createObjectURL(blob);link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);
  if(markWorkspace&&offlineWorkspace&&sourceData===data){offlineWorkspace.dirty=false;offlineWorkspace.exportedAt=new Date().toISOString();storeOfflineWorkspace(data,false);render();}
}


let deviceData=load(),offlineWorkspace=readOfflineWorkspace();
let describeCloudError=error=>error?.message||'Cloud access failed. Please retry.';
let cloudApi=null, account=null, session=null, cloudBusy=false, cloudPending=false, cloudMessage=offlineWorkspace?'Offline JSON workspace · cloud saving paused':'Connecting account service…', cloudReady=false, authChecked=false;
let cloudConfirmed=null,cloudRecovery=null,cloudRecoveryConflict=null;
let storageProtection={supported:false,persisted:null,usage:null,quota:null,error:''};
let healthState={enabled:false,status:''}, healthCheckedAt=0;
let modalBack=null, importReadToken=0, importSaving=false, foodUndoTimer=null;
let data=offlineWorkspace?structuredClone(offlineWorkspace.data):deviceData, page='home', chosenDate=trackingDate(new Date(),(offlineWorkspace?.data||deviceData).settings?.dayResetMinutes??360), workout='Upper', pendingImport=null;
let foodSort='recent',foodLibrarySort='name',exerciseLibrarySort='name',foodSuggestionState=null,foodProgressPeriod='week',foodProgressOffset=0;
let foodLibrarySearch='',foodLibraryFilter='all',exerciseLibrarySearch='',exerciseLibraryFilter='all',workoutEditorState=null;
const app=document.querySelector('#app');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number.isInteger(n)?String(n):round(n).toFixed(1).replace(/\.0$/,'');
const button=(label,action,cls='',attrs='')=>`<button type="button" class="${cls}" data-action="${action}" ${attrs}>${label}</button>`;
const input=(label,name,value='',type='text',extra='')=>`<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
const empty=message=>`<p class="empty">${message}</p>`;
const currentCloudRevision=()=>session?.ready&&Number.isSafeInteger(session.revision)?session.revision:Number.isSafeInteger(cloudConfirmed?.revision)?cloudConfirmed.revision:Number.isSafeInteger(cloudRecovery?.revision)?cloudRecovery.revision:0;
function saveCloudRecoveryLocally(markMessage=true){
  if(!account?.uid)return null;
  cloudRecovery=writeCloudRecovery(account.uid,currentCloudRevision(),data);
  if(markMessage){cloudPending=true;cloudMessage=session?.ready?'Saved on this device · waiting for cloud':'Saved on this device · cloud unavailable';}
  return cloudRecovery;
}
function saveCriticalLocalCopy(){
  try{
    if(offlineWorkspace){storeOfflineWorkspace(data,true);return true;}
    if(!account){save(data);deviceData=structuredClone(data);return true;}
    saveCloudRecoveryLocally(true);return true;
  }catch{return false;}
}
function captureCriticalLocalState(){
  if(!data.activeWorkout)return;
  buddyReadEditor();buddyReadNotes();saveCriticalLocalCopy();
}
async function refreshStorageProtection(request=true){
  storageProtection=await requestStorageProtection(request);
  if(page==='settings'&&!document.querySelector('.modal'))render();
  return storageProtection;
}
const currentTrackingDate=(now=new Date())=>trackingDate(now,data.settings.dayResetMinutes??360);
const weightPromptSeenKey=()=>`everyday-weight-prompt-seen:${offlineWorkspace?'offline-workspace':account?.uid||'device'}`;
function weightPromptSeen(date){try{return localStorage.getItem(weightPromptSeenKey())===date;}catch{return false;}}
function markWeightPromptSeen(date){try{localStorage.setItem(weightPromptSeenKey(),date);}catch{}data.promptDate=date;}
const currentFoodSlot=(now=new Date())=>Math.floor((now.getHours()*60+now.getMinutes())/30);
const clockLabel=minutes=>{minutes=((minutes%1440)+1440)%1440;const h=Math.floor(minutes/60),m=minutes%60,period=h>=12?'PM':'AM',hour=h%12||12;return hour+':'+String(m).padStart(2,'0')+' '+period;};
const foodTimeLabel=slot=>Number.isInteger(slot)&&slot>=0&&slot<48?clockLabel(slot*30):'No time';
const foodTimeOptions=value=>'<option value="" '+(value==null?'selected':'')+'>No time</option>'+Array.from({length:48},(_,slot)=>'<option value="'+slot+'" '+(slot===value?'selected':'')+'>'+foodTimeLabel(slot)+'</option>').join('');
const resetTimeOptions=value=>Array.from({length:48},(_,slot)=>{const minutes=slot*30;return '<option value="'+minutes+'" '+(minutes===value?'selected':'')+'>'+clockLabel(minutes)+'</option>';}).join('');

const FIXED_WEEK_START=5;
const effortLabels={1:'Light',2:'Comfortable',3:'Challenging',4:'Hard',5:'Very Hard',6:'Limit',7:'Failure'};
const effortChartColors={1:'#bbdabb',2:'#cadba8',3:'#dcd99f',4:'#e1c58d',5:'#e2ad84',6:'#db927e',7:'#d57878'};
const effortChartColor=value=>effortChartColors[Number(value)]||'#91a096';
const effortText=value=>effortLabels[value]||'';
const effortOptions=value=>'<option value="">Effort</option>'+Object.entries(effortLabels).map(([n,label])=>`<option value="${n}" ${Number(value)===Number(n)?'selected':''}>${label}</option>`).join('');
const persist=async()=>{
  if(offlineWorkspace){try{storeOfflineWorkspace(data,true);cloudMessage='Offline JSON workspace · saved on this device';render();return true;}catch{alert('This device could not save the offline workspace. Export your JSON before leaving.');return false;}}
  if(!account){try{save(data);deviceData=structuredClone(data);render();return true;}catch{alert('This device could not save the change. Export a backup before leaving.');return false;}}
  let localSafe=true;
  try{saveCloudRecoveryLocally(false);cloudPending=true;}catch{localSafe=false;cloudPending=true;}
  if(!session?.ready){cloudMessage=localSafe?'Saved on this device · cloud unavailable':'Cloud unavailable and the device recovery copy could not be saved. Export a backup now.';render();return localSafe;}
  if(cloudBusy){cloudMessage=localSafe?'Saved on this device · waiting for cloud':'Cloud save in progress; the device recovery copy could not be updated.';render();return localSafe;}
  const active=session,snapshot=structuredClone(data);cloudBusy=true;cloudPending=true;cloudMessage='Saving to your account…';render();let queueAgain=false;
  try{
    await active.save(snapshot);if(session!==active)return false;
    try{cloudConfirmed=writeCloudConfirmed(active.uid,active.revision,snapshot);}catch{cloudConfirmed={uid:active.uid,revision:active.revision,updatedAt:isoNow(),data:structuredClone(snapshot)};}
    if(sameCloudData(data,snapshot)){
      clearCloudRecovery(active.uid);cloudRecovery=null;cloudRecoveryConflict=null;cloudPending=false;cloudMessage='Saved to your account';
    }else{
      try{cloudRecovery=writeCloudRecovery(active.uid,active.revision,data);}catch{}
      cloudPending=true;cloudMessage='Newer changes are safe on this device · syncing…';queueAgain=true;
    }
    return true;
  }
  catch(error){if(session===active){cloudMessage=describeCloudError(error)+(localSafe?' Device recovery kept.':' Device recovery also failed; export a backup now.');cloudPending=true;}return false;}
  finally{if(session===active){cloudBusy=false;render();if(queueAgain)setTimeout(()=>{if(session===active&&!cloudBusy&&cloudPending)void persist();},0);}}
};
const progressBar=(value,goal,color)=>`<div class="bar"><span style="width:${Math.min(100,Math.max(0,value/goal*100))}%;background:${color}"></span></div>`;

function hasLocalCloudFallback(){return Boolean(account&&(cloudRecovery||cloudConfirmed));}
function isLoading(){return offlineWorkspace?false:!authChecked || Boolean(account && !session?.ready && !hasLocalCloudFallback());}
function shell(content) {
  app.innerHTML=`<div class="shell"><header class="top"><button class="brand" data-action="home"><span class="mark">✳</span> everyday<span class="brand-dot">.</span></button><button class="top-date" data-action="history">${niceDate(currentTrackingDate())} <span>↗</span></button></header>${page==='home'?'':accountBanner()}${cloudSaveWarning()}<main aria-busy="${isLoading()}">${content}</main>${page==='home'?accountBanner():''}<nav class="nav" aria-label="Main navigation">${[['home','⌂','Home'],['food','◒','Food'],['gym','▣','Lifting'],['progress','↗','Progress'],['settings','⚙','More']].map(([p,icon,label])=>`<button class="${page===p?'active':''}" data-action="${p}" ${isLoading()?'disabled':''} aria-label="${label}" ${page===p?'aria-current="page"':''}><span>${icon}</span><small>${label}</small></button>`).join('')}</nav></div><div id="overlay"></div>`;
}
function render() {
  modalBack=null;pendingImport=null;importReadToken++;
  if(isLoading()){
    const error=account&&!cloudBusy?`<section class="panel" role="alert"><p class="body-copy">${esc(cloudMessage)}</p>${button('Retry loading','cloud-load','primary')}</section>`:'';
    const offlineOption=!offlineWorkspace?`<section class="panel loading-offline-option"><h2>Need to work offline?</h2><p class="body-copy">Open an Everyday JSON backup in a separate local workspace while cloud access is unavailable.</p>${button('Open offline JSON workspace','offline-start','outline')}</section>`:'';
    shell((page==='home'?home(true):`<section class="panel"><h2>Loading your account</h2><p class="body-copy">Please wait…</p></section>`)+offlineOption+error);return;
  }
  const views={home,food,gym,progress,history,settings};
  shell(views[page]?.()||home());
}
function home(loading=false) {
  const today=currentTrackingDate(),totals=dailyTotals(data.foodEntries,today),latest=[...data.weights].sort((a,b)=>b.date.localeCompare(a.date))[0];
  const calRemaining=Math.round(data.settings.calories-totals.calories),proteinRemaining=Math.round(data.settings.protein-totals.protein);
  const remainingBadges='<div class="home-remaining" aria-label="Daily goals remaining"><span class="'+(calRemaining<0?'over':'')+'"><small>CALORIES</small><strong>'+(loading?'—':calRemaining>=0?calRemaining+' left':(-calRemaining)+' over')+'</strong></span><span class="'+(proteinRemaining<=0?'reached':'')+'"><small>PROTEIN</small><strong>'+(loading?'—':proteinRemaining>0?proteinRemaining+'g left':'Goal reached')+'</strong></span></div>';
  return `<section class="home-actions" aria-label="What do you want to log?"><button class="big-action food-action" data-action="food" ${loading?'disabled':''}><span class="action-icon">◒</span><span><strong>Food</strong><small>Calories, protein & saved foods</small></span><b>↗</b></button><button class="big-action lift-action" data-action="gym" ${loading?'disabled':''}><span class="action-icon">▣</span><span><strong>Lifting</strong><small>Sets, reps & previous workouts</small></span><b>↗</b></button></section><section class="today-card"><div class="section-head"><div><p class="eyebrow">AT A GLANCE</p><h2>Today so far</h2></div>${button('View day ↗','history','text-btn',loading?'disabled':'')}</div><div class="metric-row"><div><b>${loading?'—':Math.round(totals.calories).toLocaleString()}</b><small>of ${loading?'—':data.settings.calories} cal</small>${progressBar(loading?0:totals.calories,data.settings.calories,'#d8eb86')}</div><div><b>${loading?'—':Math.round(totals.protein)}<em>g</em></b><small>of ${loading?'—':data.settings.protein}g protein</small>${progressBar(loading?0:totals.protein,data.settings.protein,'#9fd9bf')}</div></div>${remainingBadges}</section><section class="weight-strip"><div><span class="small-icon">⚖</span><span><strong>${loading?'—':latest?`${fmt(latest.value)} ${data.settings.unit}`:'No weigh-in yet'}</strong><small>${loading?'—':latest?`Last logged ${niceDate(latest.date)}`:'A morning check-in when you are ready'}</small></span></div>${button('Log weight','weight','outline small',loading?'disabled':'')}</section>${loading?'':travelNotesPanel(today,true)}`;
}
function foodTotals(totals){
  return `<span class="food-total-grid"><span><small>CALORIES</small><span class="food-total-number"><strong>${Math.round(totals.calories)}</strong><span>/ ${data.settings.calories}</span></span><span class="bar"><span style="width:${Math.min(100,Math.max(0,totals.calories/data.settings.calories*100))}%;background:#d8eb86"></span></span></span><span><small>PROTEIN</small><span class="food-total-number"><strong>${Math.round(totals.protein)}g</strong><span>/ ${data.settings.protein}g</span></span><span class="bar"><span style="width:${Math.min(100,Math.max(0,totals.protein/data.settings.protein*100))}%;background:#9fd9bf"></span></span></span></span>`;
}
function foodEntryDetail(e){return `${e.t!=null?foodTimeLabel(e.t)+' · ':''}${fmt(e.calories*e.quantity)} cal · ${fmt(e.protein*e.quantity)}g protein${e.quantity!==1?` · ${fmt(e.quantity)} servings`:''}`;}
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

const foodKindLabel=kind=>kind==='drink'?'Drink':'Food';
const foodAccuracyLabel=accuracy=>accuracy==='label'?'Label exact':accuracy==='estimate'?'Estimated':'Unspecified';
const foodMetaSummary=food=>[foodKindLabel(food.kind),hasFoodTag(food,'ingredient')?'Ingredient':'',food.accuracy?foodAccuracyLabel(food.accuracy):''].filter(Boolean).join(' · ');
function nutritionAccuracyIcon(food){
 const accuracy=food?.accuracy||'',label=foodAccuracyLabel(accuracy);
 if(accuracy==='label')return '<span class="nutrition-accuracy nutrition-accuracy-label" aria-label="'+esc(label)+'"><svg viewBox="0 0 18 20" aria-hidden="true"><rect x="2.5" y="1.5" width="13" height="17" rx="1.8"></rect><path d="M5 5h8M5 8h8M5 11h5M5 14h8"></path></svg></span>';
 if(accuracy==='estimate')return '<span class="nutrition-accuracy nutrition-accuracy-estimate" aria-label="'+esc(label)+'"><span aria-hidden="true">~</span></span>';
 return '<span class="nutrition-accuracy nutrition-accuracy-unknown" aria-label="'+esc(label)+'"><span aria-hidden="true"></span></span>';
}
function foodQuickCard(food,pinned=false){
 return '<div class="food-card '+(pinned?'food-card-pinned':'')+'"><div class="food-card-controls"><button class="food-favorite '+(food.pinned?'selected':'')+'" data-action="toggle-favorite" data-id="'+esc(food.id)+'" aria-label="'+(food.pinned?'Remove '+esc(food.name)+' from favorites':'Add '+esc(food.name)+' to favorites')+'" aria-pressed="'+(food.pinned?'true':'false')+'">'+(food.pinned?'★':'☆')+'</button><button class="card-edit" data-action="edit-card" data-id="'+esc(food.id)+'" aria-label="Edit '+esc(food.name)+'">•••</button></div><button class="food-main" data-action="add-saved" data-id="'+esc(food.id)+'"><strong>'+esc(food.name)+'</strong><span class="food-card-nutrition"><span>'+fmt(food.calories)+' cal · '+fmt(food.protein)+'g protein</span></span>'+(hasFoodTag(food,'ingredient')?'<small class="food-card-tag">Ingredient</small>':'')+'<span class="food-card-add">+ Add to '+(chosenDate===currentTrackingDate()?'today':niceDate(chosenDate))+'</span></button><span class="food-card-accuracy-corner" aria-hidden="true">'+nutritionAccuracyIcon(food)+'</span></div>';
}
const hasFoodTag=(food,tag)=>Array.isArray(food.tags)&&food.tags.includes(tag);
function sortFoods(list,mode){
 const copy=[...list];
 if(mode==='name')return copy.sort((a,b)=>a.name.localeCompare(b.name));
 if(mode==='calories-low')return copy.sort((a,b)=>a.calories-b.calories||a.name.localeCompare(b.name));
 if(mode==='protein-high')return copy.sort((a,b)=>b.protein-a.protein||a.name.localeCompare(b.name));
 if(mode==='kind')return copy.sort((a,b)=>(a.kind||'food').localeCompare(b.kind||'food')||a.name.localeCompare(b.name));
 return copy.sort((a,b)=>(b.lastUsed||'').localeCompare(a.lastUsed||'')||a.name.localeCompare(b.name));
}
function foodSortControl(value,scope){
 const opts=[['recent','Recent'],['name','A–Z'],['calories-low','Calories'],['protein-high','Protein'],['kind','Food / drink']];
 return '<label class="sort-control"><span>Sort</span><select data-sort-scope="'+scope+'">'+opts.map(([v,l])=>'<option value="'+v+'" '+(v===value?'selected':'')+'>'+l+'</option>').join('')+'</select></label>';
}

const foodNameKey=value=>String(value||'').trim().toLowerCase();
const dateDistanceDays=(a,b)=>Math.abs(Math.round((Date.parse(a+'T12:00:00')-Date.parse(b+'T12:00:00'))/86400000));
function recentSuggestionFoods(limit=8){
 const byName=new Map(data.foods.map(f=>[foodNameKey(f.name),f])),seen=new Set(),out=[];
 for(let i=data.foodEntries.length-1;i>=0&&out.length<limit;i--){const f=byName.get(foodNameKey(data.foodEntries[i].name));if(f&&!seen.has(f.id)){seen.add(f.id);out.push(f);}}
 return out;
}
function pairCompatibility(a,b,entriesByName){
 const left=entriesByName.get(foodNameKey(a.name))||[],right=entriesByName.get(foodNameKey(b.name))||[];
 if(!left.length||!right.length)return .45;
 const rightByDate=new Map();for(const e of right){if(!rightByDate.has(e.date))rightByDate.set(e.date,[]);rightByDate.get(e.date).push(e);}
 let sharedDates=0,timedDates=0,nearDates=0;
 for(const date of new Set(left.map(e=>e.date))){const l=left.filter(e=>e.date===date),r=rightByDate.get(date);if(!r?.length)continue;sharedDates++;let best=99,hasTimed=false;for(const x of l)for(const y of r)if(Number.isInteger(x.t)&&Number.isInteger(y.t)){hasTimed=true;const d=Math.abs(x.t-y.t);best=Math.min(best,Math.min(d,48-d));}if(hasTimed){timedDates++;if(best<=4)nearDates++;}}
 if(timedDates)return nearDates/timedDates;
 if(sharedDates)return .55;
 return left.length>=3&&right.length>=3?.35:.45;
}
function suggestionHistoryMap(foods,timeSlot,anchor){
 const entriesByName=new Map();
 for(const e of data.foodEntries){const key=foodNameKey(e.name);if(!entriesByName.has(key))entriesByName.set(key,[]);entriesByName.get(key).push(e);}
 const map=new Map();
 for(const food of foods){
   const matches=entriesByName.get(foodNameKey(food.name))||[],count=matches.length,last=matches.map(e=>e.date).sort().at(-1),days=last?dateDistanceDays(chosenDate,last):365;
   const frequency=Math.min(1,Math.log1p(count)/Math.log(12)),recency=Math.exp(-days/18),timed=matches.filter(e=>Number.isInteger(e.t));
   let timeAffinity=.35;if(timeSlot!=null&&timed.length)timeAffinity=timed.reduce((sum,e)=>{const d=Math.abs(e.t-timeSlot),circular=Math.min(d,48-d);return sum+Math.exp(-circular/4);},0)/timed.length;
   const co=anchor?(anchor.id===food.id?1:pairCompatibility(food,anchor,entriesByName)):.3,todayCount=matches.filter(e=>e.date===chosenDate).length;
   map.set(food.id,{count,frequency,recency,timeAffinity,co,todayCount,affinity:frequency*.30+recency*.25+timeAffinity*.25+co*.20});
 }
 return{stats:map,entriesByName};
}
function suggestionReason(combo,anchor,timeSlot,stats,proteinLeft){
 if(anchor)return 'Built around '+anchor.name;
 const values=combo.items.map(x=>stats.get(x.food.id));
 if(timeSlot!=null&&values.some(s=>s?.timeAffinity>.7))return 'Often logged around this time';
 if(values.some(s=>s?.frequency>.65))return 'Common for you';
 if(combo.protein>=Math.max(20,proteinLeft*.8))return 'Strong protein fit';
 return 'Good goal fit';
}
function suggestionCombos(anchorId='',timeSlot=null,feedback={}){
 const totals=dailyTotals(data.foodEntries,chosenDate),calLeft=Math.max(0,data.settings.calories-totals.calories),proteinLeft=Math.max(0,data.settings.protein-totals.protein);
 const excluded=new Set(feedback.excludedIds||[]),preferred=new Set(feedback.preferIds||[]),hiddenShapes=new Set(feedback.hiddenShapes||[]);
 const all=sortFoods(data.foods.filter(f=>!excluded.has(f.id)&&Number.isFinite(f.calories)&&f.calories>=0&&Number.isFinite(f.protein)&&f.protein>=0),'recent').slice(0,60),anchor=all.find(f=>f.id===anchorId)||null;
 if(!all.length)return[];
 const context=suggestionHistoryMap(all,timeSlot,anchor),stats=context.stats;
 const ranked=all.map(food=>({food,stats:stats.get(food.id)})).sort((a,b)=>b.stats.affinity-a.stats.affinity||b.food.protein-a.food.protein).slice(0,28);
 if(anchor&&!ranked.some(x=>x.food.id===anchor.id))ranked.unshift({food:anchor,stats:stats.get(anchor.id)});
 const candidates=[];
 const singleQ=food=>food.kind==='drink'&&!hasFoodTag(food,'ingredient')?[1,2]:[0.5,1,1.5,2];
 for(const {food} of ranked)for(const q of singleQ(food))candidates.push([{food,q}]);
 const multiQ=food=>hasFoodTag(food,'ingredient')?[0.5,1,1.5]:[1];
 const pairBase=ranked.slice(0,22).map(x=>x.food);
 for(let i=0;i<pairBase.length;i++)for(let j=i+1;j<pairBase.length;j++)for(const q1 of multiQ(pairBase[i]))for(const q2 of multiQ(pairBase[j]))candidates.push([{food:pairBase[i],q:q1},{food:pairBase[j],q:q2}]);
 const tripleBase=ranked.slice(0,12).map(x=>x.food);
 for(let i=0;i<tripleBase.length;i++)for(let j=i+1;j<tripleBase.length;j++)for(let k=j+1;k<tripleBase.length;k++){
   const qs=[multiQ(tripleBase[i]).slice(0,2),multiQ(tripleBase[j]).slice(0,2),multiQ(tripleBase[k]).slice(0,2)];
   for(const q1 of qs[0])for(const q2 of qs[1])for(const q3 of qs[2])candidates.push([{food:tripleBase[i],q:q1},{food:tripleBase[j],q:q2},{food:tripleBase[k],q:q3}]);
 }
 const scored=candidates.filter(items=>!anchor||items.some(x=>x.food.id===anchor.id)).map(items=>{
   const calories=items.reduce((s,x)=>s+x.food.calories*x.q,0),protein=items.reduce((s,x)=>s+x.food.protein*x.q,0);
   const calFit=Math.abs(calories-calLeft)/Math.max(250,calLeft||250),proteinShort=Math.max(0,proteinLeft-protein)/Math.max(25,proteinLeft||25),overCal=Math.max(0,calories-calLeft)/Math.max(150,calLeft||150);
   const affinity=items.reduce((sum,x)=>sum+(stats.get(x.food.id)?.affinity||0),0)/items.length;
   const repeatPenalty=items.reduce((sum,x)=>sum+Math.min(.12,(stats.get(x.food.id)?.todayCount||0)*.04),0);
   let compatibility=1,pairs=0;if(items.length>1){let total=0;for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){total+=pairCompatibility(items[i].food,items[j].food,context.entriesByName);pairs++;}compatibility=pairs?total/pairs:1;}
   const sizePenalty=Math.max(0,items.length-2)*.025,compatibilityPenalty=(1-compatibility)*.22,preferenceBonus=items.some(x=>preferred.has(x.food.id))?.14:0;
   return{items,calories,protein,score:calFit*.50+proteinShort*.38+overCal*.80+repeatPenalty+sizePenalty+compatibilityPenalty-affinity*.24-preferenceBonus};
 }).filter(x=>x.calories>0).sort((a,b)=>a.score-b.score);
 const seen=new Set(),shapeCounts=new Map(),appearances=new Map(),out=[];
 for(const s of scored){
   const key=s.items.map(x=>x.food.id+':'+x.q).sort().join('|'),shape=s.items.map(x=>x.food.id).sort().join('|');if(hiddenShapes.has(shape)||seen.has(key)||(shapeCounts.get(shape)||0)>=2)continue;
   if(!anchor&&s.items.some(x=>(appearances.get(x.food.id)||0)>=7))continue;
   seen.add(key);shapeCounts.set(shape,(shapeCounts.get(shape)||0)+1);s.reason=suggestionReason(s,anchor,timeSlot,stats,proteinLeft);out.push(s);
   for(const x of s.items)appearances.set(x.food.id,(appearances.get(x.food.id)||0)+1);
   if(out.length>=15)break;
 }
 return out;
}
function suggestionShape(suggestion){return suggestion.items.map(x=>x.food.id).sort().join('|');}
function suggestionFoodSearch(query,excludedIds=[]){
 const q=String(query||'').trim().toLowerCase();if(!q)return[];
 const excluded=new Set(excludedIds),ranked=data.foods.filter(f=>!excluded.has(f.id)&&f.name.toLowerCase().includes(q)).map(f=>({f,score:f.name.toLowerCase()===q?0:f.name.toLowerCase().startsWith(q)?1:2})).sort((a,b)=>a.score-b.score||Number(b.f.pinned)-Number(a.f.pinned)||(b.f.lastUsed||'').localeCompare(a.f.lastUsed||'')||a.f.name.localeCompare(b.f.name));
 return ranked.slice(0,8).map(x=>x.f);
}
function suggestionSearchRows(query,excludedIds=[]){
 const matches=suggestionFoodSearch(query,excludedIds);
 if(!String(query||'').trim())return '<p class="suggestion-search-hint">Search the full Saved Foods library to force a specific starting item.</p>';
 return matches.length?matches.map(f=>'<button type="button" class="suggestion-search-result" data-action="food-suggest-anchor" data-id="'+esc(f.id)+'"><span><strong>'+esc(f.name)+(f.pinned?' ★':'')+'</strong><small>'+esc(foodMetaSummary(f))+' · '+fmt(f.calories)+' cal · '+fmt(f.protein)+'g</small></span><b>Use</b></button>').join(''):'<p class="suggestion-search-hint">No saved foods match that search.</p>';
}
function refreshSuggestionSearch(){
 const input=document.querySelector('[data-suggestion-search]'),box=document.querySelector('[data-suggestion-search-results]');if(!input||!box||!foodSuggestionState)return;
 foodSuggestionState.searchQuery=input.value;box.innerHTML=suggestionSearchRows(input.value,foodSuggestionState.excludedIds||[]);
}
function foodSuggestions(state=null){
 const defaults={anchorId:'',timeSlot:chosenDate===currentTrackingDate()?currentFoodSlot():null,preferIds:[],excludedIds:[],hiddenShapes:[],searchQuery:''};
 const next={...defaults,...(state||{})};next.preferIds=[...new Set(next.preferIds||[])];next.excludedIds=[...new Set(next.excludedIds||[])];next.hiddenShapes=[...new Set(next.hiddenShapes||[])];
 if(next.excludedIds.includes(next.anchorId))next.anchorId='';
 foodSuggestionState=next;
 const totals=dailyTotals(data.foodEntries,chosenDate),calLeft=Math.max(0,data.settings.calories-totals.calories),proteinLeft=Math.max(0,data.settings.protein-totals.protein),recent=recentSuggestionFoods(),suggestions=suggestionCombos(next.anchorId,next.timeSlot,next);
 foodSuggestionState.suggestions=suggestions;
 const anchor=next.anchorId,anchorFood=data.foods.find(f=>f.id===anchor),excluded=next.excludedIds.map(id=>data.foods.find(f=>f.id===id)).filter(Boolean),preferred=next.preferIds.map(id=>data.foods.find(f=>f.id===id)).filter(Boolean);
 const feedbackSummary=(excluded.length||preferred.length)?'<div class="suggestion-feedback-summary">'+(preferred.length?'<div><small>Favoring</small>'+preferred.map(f=>'<button type="button" data-action="food-suggest-unprefer" data-id="'+esc(f.id)+'">'+esc(f.name)+' ×</button>').join('')+'</div>':'')+(excluded.length?'<div><small>Avoiding this round</small>'+excluded.map(f=>'<button type="button" data-action="food-suggest-restore" data-id="'+esc(f.id)+'">'+esc(f.name)+' ×</button>').join('')+'</div>':'')+'</div>':'';
 const selectedAnchor=anchorFood?'<div class="suggestion-selected-anchor"><span><small>Starting with</small><strong>'+esc(anchorFood.name)+'</strong></span><button type="button" class="text-btn" data-action="food-suggest-anchor" data-id="">Clear</button></div>':'';
 modal('Fill the rest of your day','<div class="food-suggestions"><div class="suggestion-target"><span><small>Calories left</small><strong>'+Math.round(calLeft)+'</strong></span><span><small>Protein left</small><strong>'+Math.round(proteinLeft)+'g</strong></span></div><div class="suggestion-time"><label class="field"><span>Meal time</span><select data-suggestion-time>'+foodTimeOptions(next.timeSlot)+'</select></label><small>One time is applied to every item you add.</small></div><div class="suggestion-anchor"><span class="buddy-mini-label">START WITH</span><label class="suggestion-search"><span>Find any saved food</span><input type="search" data-suggestion-search value="'+esc(next.searchQuery||'')+'" placeholder="Search Saved Foods"></label><div class="suggestion-search-results" data-suggestion-search-results>'+suggestionSearchRows(next.searchQuery,next.excludedIds)+'</div>'+selectedAnchor+'<div class="suggestion-anchor-recent"><small>Recent</small><div class="suggestion-chips"><button type="button" class="'+(!anchor?'selected':'')+'" data-action="food-suggest-anchor" data-id="">Anything</button>'+recent.filter(f=>!next.excludedIds.includes(f.id)).map(f=>'<button type="button" class="'+(anchor===f.id?'selected':'')+'" data-action="food-suggest-anchor" data-id="'+esc(f.id)+'">'+esc(f.name)+'</button>').join('')+'</div></div></div>'+feedbackSummary+'<p class="body-copy">Ranked from your remaining goals plus your own logging history. Search or Recent can force a specific starting food. Feedback below only changes this suggestion round.</p>'+(suggestions.length?'<div class="suggestion-list">'+suggestions.map((s,i)=>'<article class="suggestion-card suggestion-card-feedback"><div class="suggestion-card-copy"><span>'+s.items.map(x=>'<strong>'+(x.q===1?'':fmt(x.q)+'× ')+esc(x.food.name)+'</strong>').join('')+'</span><em>'+esc(s.reason)+'</em></div><div class="suggestion-card-macros">'+Math.round(s.calories)+' cal · '+Math.round(s.protein)+'g protein</div><div class="suggestion-card-actions"><button type="button" class="primary small" data-action="apply-food-suggestion" data-index="'+i+'">Add</button><button type="button" class="text-btn" data-action="food-suggest-more" data-index="'+i+'">More like this</button><button type="button" class="text-btn" data-action="food-suggest-avoid" data-index="'+i+'">Avoid…</button><button type="button" class="text-btn" data-action="food-suggest-skip" data-index="'+i+'">Skip</button></div></article>').join('')+'</div>':'<p class="empty">No combinations match the current feedback. Remove an avoided item or reset Start with to Anything.</p>')+'</div>');
}
function foodSuggestionAvoidPicker(index){
 const suggestion=foodSuggestionState?.suggestions?.[index];if(!suggestion)return;
 if(suggestion.items.length===1){foodSuggestions({...foodSuggestionState,excludedIds:[...(foodSuggestionState.excludedIds||[]),suggestion.items[0].food.id]});return;}
 const snapshot={...foodSuggestionState};
 modal('Avoid an item', '<div class="suggestion-avoid-picker"><p class="body-copy">Exclude one item from this suggestion round. This does not change the saved food itself.</p>'+suggestion.items.map(x=>'<button type="button" class="food-library-item" data-action="food-suggest-exclude" data-id="'+esc(x.food.id)+'"><span><strong>'+esc(x.food.name)+'</strong><small>Hide from current suggestions</small></span><b>×</b></button>').join('')+'</div>',()=>foodSuggestions(snapshot));
}

function food() {
  const totals=dailyTotals(data.foodEntries,chosenDate),entries=data.foodEntries.filter(x=>x.date===chosenDate).slice().reverse();
  const pinned=sortFoods(data.foods.filter(f=>f.pinned===true),foodSort),foods=sortFoods(data.foods.filter(f=>f.pinned!==true),foodSort);
  const pinnedSection=pinned.length?'<section class="pinned-foods"><div class="section-head food-section-title"><h2>Favorites</h2></div><div class="food-grid pinned-food-grid">'+pinned.map(f=>foodQuickCard(f,true)).join('')+'</div></section>':'';
  return '<div class="page-head food-page-head"><p class="eyebrow">NUTRITION</p><h1>Food tracking<span class="accent">.</span></h1></div>'+dateHeader('Viewing')+'<section class="food-day"><button type="button" class="daily-food-card" data-action="food-log" aria-label="Open complete food log for '+esc(chosenDate)+'" aria-haspopup="dialog">'+foodTotals(totals)+'<span class="food-preview-heading"><strong>'+(chosenDate===currentTrackingDate()?"Today's food log":'Food log · '+esc(niceDate(chosenDate)))+'</strong><small>'+entries.length+' entr'+(entries.length===1?'y':'ies')+'</small></span><span class="food-preview">'+(entries.length?entries.slice(0,3).map(e=>'<span class="food-preview-row"><strong>'+esc(e.name)+'</strong><small>'+foodEntryDetail(e)+'</small></span>').join(''):'<span class="food-preview-empty">Nothing logged for this date yet.</span>')+'</span><span class="food-log-open">'+(entries.length>3?'View all '+entries.length+' entries':'Open full food log')+' <span aria-hidden="true">↗</span></span></button><div class="food-add-row">'+button('+ Log food','new-food','primary small')+button('Suggest rest of day','food-suggest','outline small')+'</div></section>'+travelNotesPanel(chosenDate)+pinnedSection+'<section><div class="section-head food-section-title"><h2>More foods</h2><div class="section-actions">'+foodSortControl(foodSort,'food-page')+button('Food Library','food-library','outline small')+'</div></div>'+(foods.length?'<div class="food-grid">'+foods.map(f=>foodQuickCard(f)).join('')+'</div>':pinned.length?'<p class="hint">All saved foods are in Favorites.</p>':empty('Saved foods appear here for quick logging. Use Food Library to create definitions without adding them to a day.'))+'</section>';
}
function savedWorkouts(){return Array.isArray(data.workoutTemplates)&&data.workoutTemplates.length?data.workoutTemplates:Object.entries(templateExercises).map(([name,exercises],i)=>({id:'legacy-'+i,name,exercises}));}
function workoutByName(name){const list=savedWorkouts();return list.find(w=>w.name===name)||list[0];}
function exerciseDefinition(exerciseId){return data.exerciseDefinitions?.find(e=>e.id===exerciseId);}
function resolveWorkoutExercise(item){const def=exerciseDefinition(item.exerciseId);return def?{...def,repMin:item.repMin,repMax:item.repMax,targetSets:item.targetSets||2,restSeconds:item.restSeconds??90}:null;}
function workoutExercises(w){return (w?.exercises||[]).map(resolveWorkoutExercise).filter(Boolean);}
function exerciseCatalog(){const map=new Map();for(const e of data.exerciseDefinitions||[])map.set(e.name.toLowerCase()+'|'+e.equipment,e);for(const l of data.lifts){const e={name:l.exercise,equipment:l.equipment||'other'},key=e.name.toLowerCase()+'|'+e.equipment;if(!map.has(key))map.set(key,e);}return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name)||a.equipment.localeCompare(b.equipment));}
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

function filteredExerciseLibrary(){
 let defs=[...(data.exerciseDefinitions||[])],q=exerciseLibrarySearch.trim().toLowerCase();
 if(q)defs=defs.filter(e=>e.name.toLowerCase().includes(q)||equipmentLabel(e.equipment).toLowerCase().includes(q)||(e.setup||'').toLowerCase().includes(q));
 if(exerciseLibraryFilter!=='all')defs=defs.filter(e=>e.equipment===exerciseLibraryFilter);
 return defs.sort((a,b)=>exerciseLibrarySort==='equipment'?a.equipment.localeCompare(b.equipment)||a.name.localeCompare(b.name):a.name.localeCompare(b.name)||a.equipment.localeCompare(b.equipment));
}
function exerciseLibraryRows(){
 const defs=filteredExerciseLibrary();
 return defs.length?defs.map(e=>`<button type="button" class="exercise library-exercise equipment-${esc(e.equipment)}" data-action="edit-exercise-def" data-id="${esc(e.id)}"><span class="equipment-art" aria-hidden="true">${equipmentGlyph(e.equipment)}</span><span class="exercise-copy"><small class="equipment-label">${equipmentLabel(e.equipment)}</small><strong>${esc(e.name)}</strong><small>${e.setup?'Setup: '+esc(e.setup):'No setup saved'}</small></span><b>›</b></button>`).join(''):'<p class="empty">No exercises match these filters.</p>';
}
function refreshExerciseLibraryList(){
 const list=document.querySelector('.exercise-library-list'),count=document.querySelector('[data-exercise-library-count]');if(list)list.innerHTML=exerciseLibraryRows();if(count)count.textContent=filteredExerciseLibrary().length+' shown';
}
function exerciseLibrary(){
 const equipment=['all','machine','cable','dumbbell','bench','calisthenics','other'];
 modal('Exercise Library',`<div class="exercise-library"><div class="library-intro"><p class="body-copy">Canonical exercise definitions live here. Editing one changes the exercise used by every workout that references it, without logging anything today.</p><button type="button" class="primary small" data-action="new-exercise-def">+ New exercise</button></div><div class="library-search-row"><label class="library-search"><span>Search</span><input type="search" data-library-search="exercise" value="${esc(exerciseLibrarySearch)}" placeholder="Search exercises"></label><label class="sort-control"><span>Filter</span><select data-library-filter="exercise">${equipment.map(x=>`<option value="${x}" ${exerciseLibraryFilter===x?'selected':''}>${x==='all'?'All equipment':equipmentLabel(x)}</option>`).join('')}</select></label><label class="sort-control"><span>Sort</span><select data-sort-scope="exercise-library"><option value="name" ${exerciseLibrarySort==='name'?'selected':''}>A–Z</option><option value="equipment" ${exerciseLibrarySort==='equipment'?'selected':''}>Equipment</option></select></label></div><div class="library-result-count" data-exercise-library-count>${filteredExerciseLibrary().length} shown</div><div class="exercise-library-list">${exerciseLibraryRows()}</div></div>`);
}
function exerciseDefinitionForm(def=null){
 const options=['machine','cable','dumbbell','bench','calisthenics','other'].map(x=>`<option value="${x}" ${x===(def?.equipment||'machine')?'selected':''}>${equipmentLabel(x)}</option>`).join('');
 modal(def?'Edit exercise':'New exercise',`<form class="form exercise-definition-form" data-form="exercise-definition"><input type="hidden" name="exerciseId" value="${esc(def?.id||'')}">${input('Exercise name','name',def?.name||'','text','maxlength="100" required')}<label class="field"><span>Equipment</span><select name="equipment">${options}</select></label><label class="field"><span>Setup / machine setting</span><input name="setup" type="text" maxlength="200" value="${esc(def?.setup||'')}" placeholder="Seat position, handle, machine setting…"></label><p class="hint">This is the shared exercise definition. Workout-specific rep ranges are edited on the workout itself.</p><div class="form-actions"><button class="primary" type="submit">Save exercise</button></div></form>`,()=>exerciseLibrary());
}
function workoutEditorCapture(){
 const form=document.querySelector('form[data-form="workout-template"]');if(!form||!workoutEditorState)return;
 [...form.querySelectorAll('[data-workout-row]')].forEach(row=>{
   const i=Number(row.dataset.workoutRow),item=workoutEditorState.exercises[i];if(!item)return;
   const min=Number(row.querySelector('[name=repMin]')?.value),max=Number(row.querySelector('[name=repMax]')?.value),sets=Number(row.querySelector('[name=targetSets]')?.value),rest=Number(row.querySelector('[name=restSeconds]')?.value);
   if(Number.isInteger(min))item.repMin=min;if(Number.isInteger(max))item.repMax=max;if(Number.isInteger(sets))item.targetSets=sets;if(Number.isInteger(rest))item.restSeconds=rest;
 });
}
function workoutEditorRow(item,i,total){
 const e=resolveWorkoutExercise(item);if(!e)return'';
 return `<section class="workout-template-row" data-workout-row="${i}"><div class="workout-template-head"><div class="workout-template-title"><span class="equipment-mini">${equipmentGlyph(e.equipment)}</span><span><small>${equipmentLabel(e.equipment)}</small><strong>${esc(e.name)}</strong>${e.setup?`<em>Setup: ${esc(e.setup)}</em>`:''}</span></div><div class="workout-order-actions"><button type="button" data-action="workout-move" data-index="${i}" data-direction="-1" ${i===0?'disabled':''} aria-label="Move ${esc(e.name)} up">↑</button><button type="button" data-action="workout-move" data-index="${i}" data-direction="1" ${i===total-1?'disabled':''} aria-label="Move ${esc(e.name)} down">↓</button><button type="button" class="remove" data-action="workout-remove" data-index="${i}" aria-label="Remove ${esc(e.name)}">×</button></div></div><div class="workout-program-grid"><label class="field"><span>Min reps</span><input name="repMin" type="number" min="1" max="100" step="1" value="${item.repMin||6}"></label><label class="field"><span>Max reps</span><input name="repMax" type="number" min="1" max="100" step="1" value="${item.repMax||12}"></label><label class="field"><span>Sets</span><input name="targetSets" type="number" min="1" max="10" step="1" value="${item.targetSets||2}"></label><label class="field"><span>Rest (sec)</span><input name="restSeconds" type="number" min="0" max="1800" step="15" value="${item.restSeconds??90}"></label></div></section>`;
}
function workoutTemplateForm(name=null,preserve=false){
 if(!preserve){
   const w=workoutByName(name);if(!w)return;
   workoutEditorState={id:w.id,name:w.name,exercises:structuredClone(w.exercises)};
 }
 if(!workoutEditorState)return;
 const state=workoutEditorState;
 modal('Edit '+state.name+' workout',`<form class="form workout-template-form" data-form="workout-template"><p class="hint">Exercises are references to your Exercise Library. Order, rep range, target sets, and rest time belong to this workout.</p><div class="workout-template-list">${state.exercises.length?state.exercises.map((item,i)=>workoutEditorRow(item,i,state.exercises.length)).join(''):'<p class="empty">This workout has no exercises yet.</p>'}</div><div class="workout-editor-actions"><button type="button" class="outline" data-action="workout-add-picker">+ Add exercise</button><button class="primary" type="submit">Save workout</button></div></form>`);
}
function workoutExercisePicker(){
 if(!workoutEditorState)return;
 workoutEditorCapture();
 const used=new Set(workoutEditorState.exercises.map(x=>x.exerciseId)),defs=[...(data.exerciseDefinitions||[])].filter(e=>!used.has(e.id)).sort((a,b)=>a.name.localeCompare(b.name));
 modal('Add exercise',`<div class="workout-add-picker"><label class="library-search"><span>Search Exercise Library</span><input type="search" data-workout-add-search placeholder="Search exercises"></label><div class="workout-add-list">${defs.length?defs.map(e=>`<button type="button" class="exercise library-exercise equipment-${esc(e.equipment)} workout-add-item" data-action="workout-add-exercise" data-id="${esc(e.id)}" data-search="${esc((e.name+' '+equipmentLabel(e.equipment)+' '+(e.setup||'')).toLowerCase())}"><span class="equipment-art" aria-hidden="true">${equipmentGlyph(e.equipment)}</span><span class="exercise-copy"><small class="equipment-label">${equipmentLabel(e.equipment)}</small><strong>${esc(e.name)}</strong><small>${e.setup?'Setup: '+esc(e.setup):'No setup saved'}</small></span><b>+</b></button>`).join(''):'<p class="empty">Every exercise in your library is already in this workout.</p>'}</div></div>`,()=>workoutTemplateForm(null,true));
}
const isoNow=()=>new Date().toISOString();
const buddySeconds=(a,b=isoNow())=>a&&b?Math.max(0,Math.round((new Date(b)-new Date(a))/1000)):0;
const buddyClock=value=>{value=Math.max(0,Math.floor(value||0));const h=Math.floor(value/3600),m=Math.floor(value%3600/60),s=value%60;return h?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${m}:${String(s).padStart(2,'0')}`;};
const buddyKey=e=>`${e.name.toLowerCase()}|${e.equipment}`;
const buddyFind=(s,key)=>s.exercises.find(e=>buddyKey(e)===key);
function buddyPrior(e){return data.lifts.filter(l=>l.exercise.toLowerCase()===e.name.toLowerCase()&&(l.equipment||'other')===e.equipment&&l.date<=currentTrackingDate()).sort((a,b)=>b.date.localeCompare(a.date))[0];}
function buddyTargetSets(e){const sets=Number(e.targetSets);return Number.isInteger(sets)&&sets>=1&&sets<=10?sets:2;}
function buddyRepRange(e){return {min:Number(e.repMin)||(e.name==='Calf Extension'?10:6),max:Number(e.repMax)||(e.name==='Calf Extension'?16:12)};}
function buddyEffortButtons(value){return Object.entries(effortLabels).map(([n,label])=>`<button type="button" class="buddy-effort effort-${n} ${Number(value)===Number(n)?'selected':''}" data-action="buddy-effort" data-value="${n}" aria-pressed="${Number(value)===Number(n)}"><b>${n}</b><span>${label}</span></button>`).join('');}
function buddyReadNotes(){const s=data.activeWorkout,field=document.querySelector('[name=buddyNotes]');if(!s||!field||!s.selected)return;const e=buddyFind(s,s.selected);if(e)e.notes=field.value.slice(0,500);}
function buddyCaptureUndo(s,label){const snapshot={label,phase:s.phase,selected:s.selected,exercises:structuredClone(s.exercises)};if(s.completedAt)snapshot.completedAt=s.completedAt;s.undo=snapshot;}
function buddyUndo(s){if(!s?.undo)return;const u=s.undo;s.phase=u.phase;s.selected=u.selected;s.exercises=structuredClone(u.exercises);if(u.completedAt)s.completedAt=u.completedAt;else delete s.completedAt;delete s.undo;data.lifts=data.lifts.filter(l=>l.buddySessionId!==s.id);for(const e of s.exercises)if(e.status==='done')buddyUpsertLift(s,e);}
function buddyUndoControl(s){return s.undo?`<button type="button" class="buddy-undo" data-action="buddy-undo">↶ Undo ${esc(s.undo.label||'last action')}</button>`:'';}
function buddyDraft(e,index){const prior=buddyPrior(e),source=e.sets[index-1]||prior?.sets?.[index]||prior?.sets?.at(-1)||{weight:0,reps:8};return{weight:Number(source.weight)||0,reps:Number(source.reps)||8,difficulty:Number(source.difficulty)||0};}
function buddyStart(type){const w=workoutByName(type);if(!w)return;data.activeWorkout={id:id(),workoutId:w.id,type:w.name,date:currentTrackingDate(),startedAt:isoNow(),phase:'bike',selected:null,exercises:workoutExercises(w).map(e=>({exerciseId:e.id,name:e.name,equipment:e.equipment,repMin:e.repMin||6,repMax:e.repMax||12,targetSets:e.targetSets||2,restSeconds:e.restSeconds??90,...(e.setup?{setup:e.setup}:{}),status:'pending',sets:[]}))};persist();}
function buddyReadEditor(){const s=data.activeWorkout,root=document.querySelector('.buddy-set-editor');if(!s||!root||!s.selected)return;const e=buddyFind(s,s.selected);if(!e)return;const d=e.draft||buddyDraft(e,e.sets.length);d.weight=Number(root.querySelector('[name=buddyWeight]')?.value)||0;d.reps=Math.max(1,Number(root.querySelector('[name=buddyReps]')?.value)||1);d.difficulty=Number(root.querySelector('[name=buddyDifficulty]')?.value)||0;e.draft=d;}
function buddyRender(){
 const s=data.activeWorkout;if(!s)return'';const done=s.exercises.filter(e=>e.status==='done').length,total=s.exercises.length;
 const head=`<header class="buddy-head"><span><small>${esc(s.type.toUpperCase())}</small><strong>Workout Buddy</strong></span><span class="buddy-head-actions"><span class="buddy-elapsed" data-buddy-elapsed>${buddyClock(buddySeconds(s.startedAt))}</span><button type="button" class="buddy-exit" data-action="buddy-exit">Exit</button></span></header>`;
 if(s.phase==='bike')return `<div class="buddy-screen">${head}<main class="buddy-main buddy-bike"><div class="buddy-step"><span class="buddy-step-number">01</span><p class="eyebrow">WARM-UP</p><h1>Bike · 5 min</h1><p>Head to the bike. Use the bike's timer for five minutes, then continue when you're ready to lift.</p></div><button class="buddy-a" data-action="buddy-bike-done"><span>Bike finished</span><b>Continue</b></button></main></div>`;
 if(s.phase==='picker'){const remaining=s.exercises.filter(e=>e.status!=='done');return `<div class="buddy-screen">${head}<main class="buddy-main"><div class="buddy-progress"><span>${done} of ${total} exercises</span><span>${total-done} remaining</span></div>${buddyUndoControl(s)}<div class="buddy-picker-head"><p class="eyebrow">${done?'CHOOSE WHAT’S NEXT':'READY TO LIFT'}</p><h1>${done?'Next exercise':'Choose your first exercise'}</h1><p>Select what’s available. Timing starts when you start the set.</p></div><div class="buddy-exercise-list">${remaining.map(e=>{const prior=buddyPrior(e);return `<button class="buddy-exercise exercise equipment-${esc(e.equipment)}" data-action="buddy-choose" data-key="${esc(buddyKey(e))}"><span class="equipment-art" aria-hidden="true">${equipmentGlyph(e.equipment)}</span><span class="exercise-copy"><small class="equipment-label">${equipmentLabel(e.equipment)}</small><strong>${esc(e.name)}</strong><small>${prior?`Last: ${describeLift(prior)}`:'No previous log'}</small>${e.setup?`<small class="exercise-setup">Setup: ${esc(e.setup)}</small>`:''}</span><b>›</b></button>`}).join('')}</div></main></div>`;}
 if(s.phase==='complete')return `<div class="buddy-screen">${head}<main class="buddy-main buddy-complete"><div><p class="eyebrow">CIRCUIT COMPLETE</p><h1>${esc(s.type)} finished</h1><p>${done} exercises · ${buddyClock(buddySeconds(s.startedAt,s.completedAt))} total</p></div>${buddyUndoControl(s)}<button class="buddy-a" data-action="buddy-confirm-finish"><span>Ready to wrap up?</span><b>Finish workout</b></button><button class="buddy-secondary" data-action="buddy-back-picker">Back to exercises</button></main></div>`;
 const e=buddyFind(s,s.selected);if(!e)return'';const i=e.sets.length,target=buddyTargetSets(e),d=e.draft||buddyDraft(e,i),prior=buddyPrior(e),running=Boolean(e.activeSetStartedAt),resting=Boolean(e.restStartedAt&&!running),left=resting?Math.max(0,(e.restSeconds||90)-buddySeconds(e.restStartedAt)):0,range=buddyRepRange(e);
 const state=running?`Set ${i+1} in progress`:resting?(left?`Rest · ${buddyClock(left)} remaining`:'Rest complete'):`Set ${i+1} of ${target}`,action=running?`Finish set ${i+1}`:`Start set ${i+1}`;
 const weightStep=data.settings.unit==='kg'?1.1:2.5;
 const completedSets=e.sets.length?`<div class="buddy-completed-sets"><span class="buddy-mini-label">COMPLETED SETS</span>${e.sets.map((set,n)=>`<div class="buddy-completed-set"><b>Set ${n+1}</b><span>${fmt(set.weight)} ${esc(data.settings.unit)} × ${set.reps}</span><span>${set.difficulty?effortText(set.difficulty):'No effort'}</span><time>${buddyClock(set.durationSeconds||0)}</time></div>`).join('')}</div>`:'';
 const setProgress=`<div class="buddy-set-status"><span>SET ${Math.min(i+1,target)} OF ${target}</span><div class="buddy-set-bars" aria-hidden="true">${Array.from({length:target},(_,n)=>`<i class="${n<i?'done':n===i?'current':''}"></i>`).join('')}</div></div>`;
 const notes=e.notesOpen?`<div class="buddy-notes-wrap"><div class="buddy-notes-editor"><textarea name="buddyNotes" maxlength="500" rows="2" placeholder="Form, pain, setup, anything worth remembering">${esc(e.notes||'')}</textarea><button type="button" class="buddy-notes-done" data-action="buddy-notes-toggle">Done</button></div></div>`:`<div class="buddy-notes-wrap"><button type="button" class="buddy-notes-toggle ${e.notes?'has-note':''}" data-action="buddy-notes-toggle"><span><b>${e.notes?'Notes saved':'Add notes'}</b><small>${e.notes?'Tap to review or edit':'Form, setup, pain, or anything worth remembering'}</small></span><strong aria-hidden="true">${e.notes?'✓':'＋'}</strong></button></div>`;
 const undo=s.undo?`<div class="buddy-action-tools">${buddyUndoControl(s)}</div>`:'';
 return `<div class="buddy-screen">${head}<main class="buddy-main buddy-exercise-view"><button class="buddy-back" data-action="buddy-picker">‹ Exercises</button>${setProgress}<div class="buddy-exercise-title"><small>${equipmentLabel(e.equipment)}</small><h1>${esc(e.name)}</h1><div class="buddy-meta-row"><div class="buddy-rep-range"><span>REP RANGE</span><strong>${range.min}–${range.max}</strong></div>${e.setup?`<div class="buddy-setup"><span>SETUP</span><strong>${esc(e.setup)}</strong></div>`:''}</div>${prior?`<p>Last · ${describeLift(prior)}</p>`:''}</div>${resting?`<div class="buddy-rest-timer"><small>REST</small><strong data-buddy-rest>${left?buddyClock(left):'Ready'}</strong></div>`:''}${completedSets}<div class="buddy-set-editor"><div class="buddy-number-field"><span>Weight</span><div class="buddy-stepper"><button type="button" data-action="buddy-adjust" data-field="weight" data-delta="-${weightStep}">−</button><button type="button" data-action="buddy-adjust" data-field="weight" data-delta="${weightStep}">+</button></div><div class="buddy-number-input"><input name="buddyWeight" type="number" min="0" step="${weightStep}" inputmode="decimal" value="${esc(d.weight)}"><small>${esc(data.settings.unit)}</small></div></div><div class="buddy-number-field"><span>Reps</span><div class="buddy-stepper"><button type="button" data-action="buddy-adjust" data-field="reps" data-delta="-1">−</button><button type="button" data-action="buddy-adjust" data-field="reps" data-delta="1">+</button></div><input name="buddyReps" type="number" min="1" step="1" inputmode="numeric" value="${esc(d.reps)}"></div><input type="hidden" name="buddyDifficulty" value="${d.difficulty||0}"></div><div class="buddy-effort-wrap"><span>PERCEIVED EFFORT</span><div class="buddy-effort-grid">${buddyEffortButtons(d.difficulty)}</div></div>${notes}${undo}<button class="buddy-a" data-action="buddy-a"><span data-buddy-state>${state}</span><b>${action}</b></button>${resting?'<p class="buddy-rest-note">The timer is only a guide. Start whenever you’re ready.</p>':''}</main></div>`;
}
let buddyTicker=null;
function buddyOpen(){document.documentElement.classList.add('buddy-active');document.body.classList.add('buddy-active');document.querySelector('#buddy-root').innerHTML=buddyRender();clearInterval(buddyTicker);buddyTicker=setInterval(()=>{const s=data.activeWorkout;if(!s)return clearInterval(buddyTicker);const elapsed=document.querySelector('[data-buddy-elapsed]');if(elapsed)elapsed.textContent=buddyClock(buddySeconds(s.startedAt));const state=document.querySelector('[data-buddy-state]');if(state&&s.phase==='exercise'){const e=buddyFind(s,s.selected);if(e?.restStartedAt&&!e.activeSetStartedAt){const left=Math.max(0,(e.restSeconds||90)-buddySeconds(e.restStartedAt));state.textContent=left?`Rest · ${buddyClock(left)} remaining`:'Rest complete';const rest=document.querySelector('[data-buddy-rest]');if(rest)rest.textContent=left?buddyClock(left):'Ready';}}},1000);}
function buddyClose(){document.documentElement.classList.remove('buddy-active');document.body.classList.remove('buddy-active');document.querySelector('#buddy-root').innerHTML='';clearInterval(buddyTicker);buddyTicker=null;}
async function buddyPersist(){await persist();if(data.activeWorkout)buddyOpen();}
function buddyUpsertLift(s,e){if(!e.sets?.length)return;const record={exercise:e.name,equipment:e.equipment,date:s.date,sets:e.sets.map(x=>({weight:x.weight,reps:x.reps,...(x.difficulty?{difficulty:x.difficulty}:{})})),notes:e.notes||'',buddySessionId:s.id};const existing=data.lifts.find(l=>l.buddySessionId===s.id&&l.exercise===e.name&&(l.equipment||'other')===e.equipment);if(existing)Object.assign(existing,record);else data.lifts.push({id:id(),...record});}
function buddyCompleteExercise(s,e){e.status='done';e.completedAt=isoNow();delete e.activeSetStartedAt;delete e.restStartedAt;delete e.draft;buddyUpsertLift(s,e);s.selected=null;s.phase=s.exercises.every(x=>x.status==='done')?'complete':'picker';if(s.phase==='complete')s.completedAt=isoNow();}
function buddyEndOptions(){modal('End workout',`<div class="buddy-end-options"><p class="body-copy">Save the workout to keep completed sets and timing, or delete this Workout Buddy session.</p><button type="button" class="primary" data-action="buddy-save-end">Save workout</button><button type="button" class="danger" data-action="buddy-delete-prompt">Delete workout</button><button type="button" class="outline" data-action="close">Cancel</button></div>`);}
function buddyDeletePrompt(){modal('Delete workout?',`<div class="buddy-delete-confirm"><p class="body-copy"><strong>Are you sure?</strong> This removes this Workout Buddy session and its Buddy-created lift records.</p><button type="button" id="buddy-delete-confirm" class="danger" data-action="buddy-delete-confirm" disabled>Delete workout · 3</button><button type="button" class="outline" data-action="close">Cancel</button></div>`);const btn=document.querySelector('#buddy-delete-confirm');if(!btn)return;setTimeout(()=>{if(btn.isConnected)btn.textContent='Delete workout · 2';},1000);setTimeout(()=>{if(btn.isConnected)btn.textContent='Delete workout · 1';},2000);setTimeout(()=>{if(btn.isConnected){btn.disabled=false;btn.textContent='Delete workout';}},3000);}


function gym() {
 const templates=savedWorkouts(),selected=workoutByName(workout);if(selected)workout=selected.name;const logs=data.lifts.filter(x=>x.date===chosenDate).slice().reverse(),exercises=workoutExercises(selected);
 return `<div class="page-head"><p class="eyebrow">TRAINING</p><h1>Lift tracking<span class="accent">.</span></h1><p>Pick an exercise, see last time, and log the sets you actually did.</p></div><section class="buddy-entry"><div><p class="eyebrow">LIVE WORKOUT</p><h2>Workout Buddy</h2><p>${data.activeWorkout?`${esc(data.activeWorkout.type)} workout in progress`:'Fast set entry, rest timing, and exercise transitions.'}</p></div>${data.activeWorkout?`<div class="buddy-entry-actions">${button('Resume','buddy-launch','primary')}${button('End workout','buddy-end','outline small')}</div>`:button('Start','buddy-launch','primary')}</section>${dateHeader('Workout date')}<div class="workout-tabs">${templates.map(x=>button(esc(x.name),'workout',workout===x.name?'selected':'',`data-workout="${esc(x.name)}"`)).join('')}</div><section><div class="section-head"><div><p class="eyebrow">${esc(workout.toUpperCase())} DAY</p><h2>Choose an exercise</h2></div><div class="section-actions">${button('Exercises','exercise-library','outline small')}${button('Edit workout','edit-workout','outline small')}${button('+ Custom','custom-lift','outline small')}</div></div><div class="exercise-list">${exercises.map(exerciseCard).join('')}</div></section><section class="log-section"><div class="section-head"><div><p class="eyebrow">${esc(niceDate(chosenDate).toUpperCase())}</p><h2>Logged lifts</h2></div></div>${logs.length?logs.map(l=>`<div class="list-row"><span><strong>${esc(l.exercise)}</strong><small>${equipmentLabel(l.equipment)} · ${describeLift(l)}</small></span>${button('Edit','edit-lift','text-btn',`data-id="${esc(l.id)}"`)}</div>`).join(''):empty('Your sets will show up here as you log them.')}</section>`;
}
function describeLift(l){return l.sets.map(s=>`${fmt(s.weight)} ${data.settings.unit} × ${s.reps}${s.difficulty?` · ${effortText(s.difficulty)}`:''}`).join(' · ');}
function lastLift(name,excludeId='',equipment=''){return data.lifts.filter(l=>l.exercise.toLowerCase()===name.toLowerCase()&&(!equipment||(l.equipment||'other')===equipment)&&l.id!==excludeId&&l.date<=chosenDate).sort((a,b)=>b.date.localeCompare(a.date))[0];}

const exerciseHistoryKey=(name,equipment='other')=>String(name||'').trim().toLowerCase()+'|'+(equipment||'other');
function exerciseProgressGroups(){
 const map=new Map();
 for(const lift of data.lifts){
   const key=exerciseHistoryKey(lift.exercise,lift.equipment),existing=map.get(key)||{key,name:lift.exercise,equipment:lift.equipment||'other',lifts:[]};
   existing.lifts.push(lift);map.set(key,existing);
 }
 for(const group of map.values()){
   group.lifts.sort((a,b)=>a.date.localeCompare(b.date));
   group.latest=group.lifts.at(-1);
   group.definition=(data.exerciseDefinitions||[]).find(e=>exerciseHistoryKey(e.name,e.equipment)===group.key)||null;
 }
 return [...map.values()].sort((a,b)=>b.latest.date.localeCompare(a.latest.date)||a.name.localeCompare(b.name));
}
function bestLiftSet(lift){
 const sets=(lift?.sets||[]).filter(s=>Number.isFinite(s.weight)&&Number.isInteger(s.reps));
 if(!sets.length)return null;
 return [...sets].sort((a,b)=>b.weight-a.weight||b.reps-a.reps)[0];
}
function exerciseProgressChart(group){
 const points=group.lifts.map(l=>({date:l.date,set:bestLiftSet(l)})).filter(x=>x.set);
 if(!points.length)return'';
 const weighted=points.some(x=>x.set.weight>0),weightValues=points.map(x=>weighted?x.set.weight:x.set.reps),repValues=points.map(x=>x.set.reps);
 const wMin=Math.min(...weightValues),wMax=Math.max(...weightValues),wRange=Math.max(1,wMax-wMin),rMin=Math.min(...repValues),rMax=Math.max(...repValues),rRange=Math.max(1,rMax-rMin),w=300,h=108,p=12;
 const xFor=i=>points.length===1?w/2:p+i*(w-2*p)/(points.length-1);
 const weightCoords=weightValues.map((v,i)=>({x:xFor(i),y:h-p-(v-wMin)/wRange*(h-2*p)}));
 const repCoords=repValues.map((v,i)=>({x:xFor(i),y:h-p-(v-rMin)/rRange*(h-2*p),difficulty:points[i].set.difficulty||0}));
 const weightPoly=weightCoords.map(pt=>pt.x.toFixed(1)+','+pt.y.toFixed(1)).join(' ');
 const repSegments=[];
 for(let i=0;i<repCoords.length-1;i++){
   const a=repCoords[i],b=repCoords[i+1],mid=(a.x+b.x)/2,effort=b.difficulty||a.difficulty||0,color=effortChartColor(effort);
   const width=effort?5.8:4.8,opacity=effort?.96:.45;
   repSegments.push('<path class="exercise-rep-segment" d="M '+a.x.toFixed(1)+' '+a.y.toFixed(1)+' C '+mid.toFixed(1)+' '+a.y.toFixed(1)+' '+mid.toFixed(1)+' '+b.y.toFixed(1)+' '+b.x.toFixed(1)+' '+b.y.toFixed(1)+'" style="stroke:'+color+';opacity:'+opacity+';stroke-width:'+width+'"></path>');
 }
 const latest=points.at(-1).set,latestEffort=latest.difficulty?effortText(latest.difficulty):'No effort';
 const repLegend=points.length>1?'<span class="exercise-chart-legend-item rep"><i></i><span><b>Reps</b><small>'+latest.reps+' latest · color follows effort</small></span></span>':'';
 return '<div class="exercise-progress-chart"><div class="exercise-chart-head"><small>'+(weighted?'Top set weight':'Top set reps')+'</small><strong>'+fmt(weightValues.at(-1))+(weighted?' '+data.settings.unit:' reps')+'</strong></div><div class="exercise-chart-legend"><span class="exercise-chart-legend-item weight"><i></i><span><b>'+(weighted?'Weight':'Top reps')+'</b><small>Exact session values</small></span></span>'+repLegend+'<span class="exercise-chart-effort"><small>Latest effort</small><b>'+esc(latestEffort)+'</b></span></div><svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="'+esc(group.name)+' '+(weighted?'weight and reps':'reps')+' trend">'+repSegments.join('')+'<polyline class="exercise-weight-line" points="'+weightPoly+'" fill="none" vector-effect="non-scaling-stroke"></polyline>'+weightCoords.map(pt=>'<circle class="exercise-weight-dot" cx="'+pt.x.toFixed(1)+'" cy="'+pt.y.toFixed(1)+'" r="3"></circle>').join('')+'</svg><div class="exercise-chart-range"><span>'+niceDate(points[0].date)+'</span><span>'+niceDate(points.at(-1).date)+'</span></div><p class="exercise-chart-note">The smooth rep curve uses its own scale. Green means lighter effort and red means harder effort, matching Workout Buddy’s difficulty scale.</p></div>';
}

function exerciseProgressModal(name,equipment){
 const group=exerciseProgressGroups().find(g=>g.key===exerciseHistoryKey(name,equipment));if(!group)return;
 const best=[...group.lifts].map(l=>({lift:l,set:bestLiftSet(l)})).filter(x=>x.set).sort((a,b)=>b.set.weight-a.set.weight||b.set.reps-a.set.reps)[0];
 modal(group.name+' progress','<div class="exercise-progress-modal"><div class="exercise-progress-summary"><span><small>Equipment</small><strong>'+equipmentLabel(group.equipment)+'</strong></span><span><small>Sessions</small><strong>'+group.lifts.length+'</strong></span><span><small>Best set</small><strong>'+(best?fmt(best.set.weight)+' '+data.settings.unit+' × '+best.set.reps:'—')+'</strong></span></div>'+(group.definition?.setup?'<p class="exercise-progress-setup"><strong>Current setup:</strong> '+esc(group.definition.setup)+'</p>':'')+exerciseProgressChart(group)+'<div class="exercise-progress-history">'+[...group.lifts].reverse().map(l=>'<div class="exercise-progress-session"><div><strong>'+niceDate(l.date)+'</strong><small>'+l.date+'</small></div><div class="exercise-progress-sets">'+l.sets.map((s,i)=>'<span><b>Set '+(i+1)+'</b> '+fmt(s.weight)+' '+data.settings.unit+' × '+s.reps+(s.difficulty?' · '+effortText(s.difficulty):'')+'</span>').join('')+'</div>'+(l.notes?'<p>'+esc(l.notes)+'</p>':'')+'</div>').join('')+'</div></div>');
}
function exerciseProgressLink(group){
 const set=bestLiftSet(group.latest);
 return '<button type="button" class="exercise exercise-progress-link progress-exercise-card equipment-'+esc(group.equipment)+'" data-action="exercise-progress" data-name="'+esc(group.name)+'" data-equipment="'+esc(group.equipment)+'"><span class="equipment-art" aria-hidden="true">'+equipmentGlyph(group.equipment)+'</span><span class="exercise-copy"><small class="equipment-label">'+equipmentLabel(group.equipment)+'</small><strong>'+esc(group.name)+'</strong><small>Last '+niceDate(group.latest.date)+' · '+group.lifts.length+' session'+(group.lifts.length===1?'':'s')+'</small></span><span class="progress-exercise-value"><b>'+(set?fmt(set.weight)+' '+data.settings.unit+' × '+set.reps:'—')+'</b><small>Latest top set</small></span></button>';
}
function exerciseProgressPanel(){
 const groups=exerciseProgressGroups();
 if(!groups.length)return '<section class="panel progress-details exercise-progress-panel"><div class="section-head"><div><p class="eyebrow">LIFTING</p><h2>Exercise progress</h2></div></div>'+empty('Log some lifts to build exercise history.')+'</section>';
 const shown=groups.slice(0,4);
 return '<section class="panel progress-details exercise-progress-panel"><div class="section-head"><div><p class="eyebrow">LIFTING</p><h2>Exercise progress</h2></div><span class="progress-count">'+groups.length+' exercises</span></div><div class="exercise-progress-list">'+shown.map(exerciseProgressLink).join('')+'</div>'+(groups.length>4?'<button type="button" class="text-btn exercise-progress-all" data-action="exercise-progress-all">View all '+groups.length+' exercises</button>':'')+'</section>';
}
function exerciseProgressAll(){
 const groups=exerciseProgressGroups();
 modal('Exercise progress','<div class="exercise-progress-all-list exercise-progress-card-list">'+groups.map(exerciseProgressLink).join('')+'</div>');
}
function validTime(value){return typeof value==='string'&&Number.isFinite(Date.parse(value));}
function workoutTiming(session){
 if(!session||!validTime(session.startedAt))return null;
 const end=session.completedAt||session.endedAt;if(!validTime(end))return null;
 const exercises=(session.exercises||[]).map(e=>{
  const sets=(e.sets||[]).filter(s=>validTime(s.startedAt)&&validTime(s.finishedAt)).slice().sort((a,b)=>Date.parse(a.startedAt)-Date.parse(b.startedAt));
  if(!sets.length)return null;
  const rests=[];for(let i=1;i<sets.length;i++){const seconds=Math.max(0,Math.round((Date.parse(sets[i].startedAt)-Date.parse(sets[i-1].finishedAt))/1000));if(Number.isFinite(seconds))rests.push(seconds);}
  return{name:e.name,first:sets[0].startedAt,last:sets.at(-1).finishedAt,rests,sets};
 }).filter(Boolean).sort((a,b)=>Date.parse(a.first)-Date.parse(b.first));
 const transitions=[];for(let i=1;i<exercises.length;i++){const seconds=Math.max(0,Math.round((Date.parse(exercises[i].first)-Date.parse(exercises[i-1].last))/1000));if(Number.isFinite(seconds))transitions.push(seconds);}
 const rests=exercises.flatMap(e=>e.rests),duration=Math.max(0,Math.round((Date.parse(end)-Date.parse(session.startedAt))/1000));
 return{session,duration,rests,transitions,exerciseCount:exercises.length};
}
const timingAverage=values=>values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length):null;
const timingText=seconds=>seconds==null?'—':buddyClock(seconds);
function workoutTimingPanel(){
 const sessions=(data.workoutHistory||[]).map(workoutTiming).filter(Boolean).sort((a,b)=>Date.parse(b.session.completedAt||b.session.endedAt)-Date.parse(a.session.completedAt||a.session.endedAt));
 if(!sessions.length)return `<section class="panel progress-details timing-panel"><div class="section-head"><div><p class="eyebrow">WORKOUT BUDDY</p><h2>Workout timing</h2></div></div>${empty('Finish a Workout Buddy session to start building timing statistics.')}</section>`;
 const allRests=sessions.flatMap(x=>x.rests),allTransitions=sessions.flatMap(x=>x.transitions),latest=sessions[0],recent=sessions.slice(0,5);
 return `<section class="panel progress-details timing-panel"><div class="section-head"><div><p class="eyebrow">WORKOUT BUDDY</p><h2>Workout timing</h2></div><span class="progress-count">${sessions.length} session${sessions.length===1?'':'s'}</span></div><div class="timing-summary"><div><small>Latest workout</small><strong>${timingText(latest.duration)}</strong></div><div><small>Average workout</small><strong>${timingText(timingAverage(sessions.map(x=>x.duration)))}</strong></div><div><small>Average rest</small><strong>${timingText(timingAverage(allRests))}</strong></div><div><small>Average transition</small><strong>${timingText(timingAverage(allTransitions))}</strong></div></div><p class="hint">Rest is measured from one finished set to the next set start in the same exercise. Transition is measured from the last set of one exercise to the first set of the next exercise actually performed.</p><div class="timing-history">${recent.map(x=>`<div class="timing-row"><span><strong>${esc(x.session.type||'Workout')}</strong><small>${niceDate(x.session.date)} · ${x.exerciseCount} exercise${x.exerciseCount===1?'':'s'}${x.session.savedEarly?' · Saved early':''}</small></span><span><b>${timingText(x.duration)}</b><small>rest ${timingText(timingAverage(x.rests))} · move ${timingText(timingAverage(x.transitions))}</small></span></div>`).join('')}</div></section>`;
}
function weightSmoothPath(points){
 if(!points.length)return'';
 if(points.length===1)return'M '+points[0].x.toFixed(1)+' '+points[0].y.toFixed(1);
 if(points.length===2)return'M '+points[0].x.toFixed(1)+' '+points[0].y.toFixed(1)+' L '+points[1].x.toFixed(1)+' '+points[1].y.toFixed(1);
 let path='M '+points[0].x.toFixed(1)+' '+points[0].y.toFixed(1);
 for(let i=0;i<points.length-1;i++){
  const p0=points[i-1]||points[i],p1=points[i],p2=points[i+1],p3=points[i+2]||p2;
  const c1x=p1.x+(p2.x-p0.x)/6,c1y=p1.y+(p2.y-p0.y)/6,c2x=p2.x-(p3.x-p1.x)/6,c2y=p2.y-(p3.y-p1.y)/6;
  path+=' C '+c1x.toFixed(1)+' '+c1y.toFixed(1)+' '+c2x.toFixed(1)+' '+c2y.toFixed(1)+' '+p2.x.toFixed(1)+' '+p2.y.toFixed(1);
 }
 return path;
}
function weightTrendSeries(points,windowSize=7){
 return points.map((point,index)=>{
  const slice=points.slice(Math.max(0,index-windowSize+1),index+1),value=slice.reduce((sum,item)=>sum+item.value,0)/slice.length;
  return{...point,trend:value};
 });
}
function weightProgressChart(weights){
 const points=[...weights].sort((a,b)=>a.date.localeCompare(b.date)).map(item=>({date:item.date,value:Number(item.value)})).filter(item=>Number.isFinite(item.value));
 if(!points.length)return'';
 const trend=weightTrendSeries(points),values=points.map(x=>x.value),trendValues=trend.map(x=>x.trend),all=[...values,...trendValues];
 const minValue=Math.min(...all),maxValue=Math.max(...all),spread=Math.max(data.settings.unit==='kg'?.45:1,maxValue-minValue),padY=Math.max(data.settings.unit==='kg'?.25:.5,spread*.16);
 const yMin=minValue-padY,yMax=maxValue+padY,yRange=Math.max(.001,yMax-yMin),w=320,h=132,pX=13,pY=14;
 const firstTime=Date.parse(points[0].date+'T12:00:00'),lastTime=Date.parse(points.at(-1).date+'T12:00:00'),timeRange=Math.max(1,lastTime-firstTime);
 const xFor=date=>points.length===1?w/2:pX+(Date.parse(date+'T12:00:00')-firstTime)/timeRange*(w-2*pX);
 const yFor=value=>h-pY-(value-yMin)/yRange*(h-2*pY);
 const actualCoords=points.map(item=>({x:xFor(item.date),y:yFor(item.value),...item}));
 const trendCoords=trend.map(item=>({x:xFor(item.date),y:yFor(item.trend),...item}));
 const actualLine=actualCoords.map(pt=>pt.x.toFixed(1)+','+pt.y.toFixed(1)).join(' ');
 const latest=points.at(-1),latestTrend=trend.at(-1),change=points.length>1?round(latest.value-points[0].value):null;
 const changeText=change==null?'First weigh-in':change===0?'No net change':(change>0?'+':'')+fmt(change)+' '+data.settings.unit+' since '+niceDate(points[0].date);
 const trendLabel=points.length>=3?fmt(latestTrend.trend)+' '+data.settings.unit:'Building trend';
 const trendPath=points.length>=2?'<path class="weight-trend-line" d="'+weightSmoothPath(trendCoords)+'"></path>':'';
 return '<div class="weight-progress-chart"><div class="weight-chart-head"><span><small>LATEST</small><strong>'+fmt(latest.value)+' '+esc(data.settings.unit)+'</strong></span><span><small>SMOOTHED TREND</small><strong>'+trendLabel+'</strong></span></div><div class="weight-chart-legend"><span class="weight-chart-key actual"><i></i><b>Actual weigh-ins</b></span><span class="weight-chart-key trend"><i></i><b>Trend</b></span></div><svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Individual weight history with smoothed trend">'+trendPath+(actualCoords.length>1?'<polyline class="weight-actual-line" points="'+actualLine+'"></polyline>':'')+actualCoords.map(pt=>'<circle class="weight-actual-dot" cx="'+pt.x.toFixed(1)+'" cy="'+pt.y.toFixed(1)+'" r="3.6"><title>'+niceDate(pt.date)+' · '+fmt(pt.value)+' '+esc(data.settings.unit)+'</title></circle>').join('')+'</svg><div class="weight-chart-range"><span>'+niceDate(points[0].date)+'</span><span>'+esc(changeText)+'</span><span>'+niceDate(points.at(-1).date)+'</span></div><p class="weight-chart-note">Dots and straight segments are your exact weigh-ins. The curved line is a rolling '+Math.min(7,points.length)+'-weigh-in average to make the longer trend easier to see.</p></div>';
}
function bodyFatProgressChart(entries){
 const points=[...entries].filter(b=>Number.isFinite(b.value)).sort((a,b)=>a.date.localeCompare(b.date)).map(b=>({date:b.date,value:Number(b.value)}));
 if(!points.length)return'';
 const values=points.map(p=>p.value),min=Math.min(...values),max=Math.max(...values),spread=Math.max(1,max-min),pad=Math.max(.5,spread*.18),yMin=min-pad,yMax=max+pad,w=320,h=92,pX=13,pY=12;
 const first=Date.parse(points[0].date+'T12:00:00'),last=Date.parse(points.at(-1).date+'T12:00:00'),range=Math.max(1,last-first),x=date=>points.length===1?w/2:pX+(Date.parse(date+'T12:00:00')-first)/range*(w-2*pX),y=value=>h-pY-(value-yMin)/(yMax-yMin)*(h-2*pY);
 const coords=points.map(p=>({x:x(p.date),y:y(p.value),...p})),line=coords.map(p=>p.x.toFixed(1)+','+p.y.toFixed(1)).join(' ');
 return '<div class="bodyfat-progress-chart"><div class="weight-chart-head"><span><small>BODY FAT</small><strong>'+fmt(points.at(-1).value)+'%</strong></span><span><small>READINGS</small><strong>'+points.length+'</strong></span></div><svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Body fat percentage history">'+(coords.length>1?'<polyline class="bodyfat-line" points="'+line+'"></polyline>':'')+coords.map(p=>'<circle class="bodyfat-dot" cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="3.4"><title>'+niceDate(p.date)+' · '+fmt(p.value)+'% body fat</title></circle>').join('')+'</svg><div class="weight-chart-range"><span>'+niceDate(points[0].date)+'</span><span>Body composition</span><span>'+niceDate(points.at(-1).date)+'</span></div></div>';
}

function shiftDate(date,days){const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+days);return localDate(d);}
function foodProgressWindow(period=foodProgressPeriod,offset=foodProgressOffset){
 const today=currentTrackingDate(),base=new Date(today+'T12:00:00');let start,end,label,granularity;
 if(period==='week'){
   start=shiftDate(startOfWeek(today,FIXED_WEEK_START),offset*7);end=shiftDate(start,6);
   label=niceDate(start)+' – '+niceDate(end);granularity='day';
 }else if(period==='month'){
   const d=new Date(base.getFullYear(),base.getMonth()+offset,1,12);start=localDate(d);end=localDate(new Date(d.getFullYear(),d.getMonth()+1,0,12));
   label=d.toLocaleDateString(undefined,{month:'long',year:'numeric'});granularity='day';
 }else if(period==='quarter'){
   const currentQuarter=Math.floor(base.getMonth()/3),index=currentQuarter+offset,qYear=base.getFullYear()+Math.floor(index/4),q=((index%4)+4)%4;
   const d=new Date(qYear,q*3,1,12),last=new Date(qYear,q*3+3,0,12);start=localDate(d);end=localDate(last);
   label='Q'+(q+1)+' '+qYear;granularity='week';
 }else{
   const year=base.getFullYear()+offset;start=year+'-01-01';end=year+'-12-31';label=String(year);granularity='month';
 }
 return{period,offset,start,end,label,granularity,isCurrent:offset===0};
}
function foodProgressPoints(window){
 const byDate=new Map();
 for(const entry of data.foodEntries){
   if(entry.date<window.start||entry.date>window.end)continue;
   const current=byDate.get(entry.date)||{calories:0,protein:0};
   current.calories+=entry.calories*entry.quantity;current.protein+=entry.protein*entry.quantity;byDate.set(entry.date,current);
 }
 if(window.granularity==='day'){
   return [...byDate].sort(([a],[b])=>a.localeCompare(b)).map(([date,totals])=>({
     date,label:niceDate(date),calories:totals.calories,protein:totals.protein,loggedDays:1,
     calPct:data.settings.calories?totals.calories/data.settings.calories*100:0,
     proteinPct:data.settings.protein?totals.protein/data.settings.protein*100:0
   }));
 }
 const buckets=new Map();
 for(const [date,totals] of byDate){
   let key,label;
   if(window.granularity==='week'){
     key=startOfWeek(date,FIXED_WEEK_START);const clippedStart=key<window.start?window.start:key,rawEnd=endOfWeek(key),clippedEnd=rawEnd>window.end?window.end:rawEnd;
     label=niceDate(clippedStart)+' – '+niceDate(clippedEnd);
   }else{
     key=date.slice(0,7);label=new Date(date+'T12:00:00').toLocaleDateString(undefined,{month:'short'});
   }
   const bucket=buckets.get(key)||{key,label,calories:0,protein:0,loggedDays:0};
   bucket.calories+=totals.calories;bucket.protein+=totals.protein;bucket.loggedDays++;buckets.set(key,bucket);
 }
 return [...buckets.values()].sort((a,b)=>a.key.localeCompare(b.key)).map(bucket=>{
   const calories=bucket.calories/bucket.loggedDays,protein=bucket.protein/bucket.loggedDays;
   return{date:bucket.key,label:bucket.label,calories,protein,loggedDays:bucket.loggedDays,
     calPct:data.settings.calories?calories/data.settings.calories*100:0,
     proteinPct:data.settings.protein?protein/data.settings.protein*100:0};
 });
}
function recentFoodChart(window){
 const points=foodProgressPoints(window);
 if(!points.length)return'<div class="food-progress-chart-empty">'+empty('No food logs in '+esc(window.label)+'.')+'</div>';
 const maxPct=Math.max(120,...points.flatMap(p=>[p.calPct,p.proteinPct])),w=320,h=118,pX=13,pY=13;
 const xFor=(point,index)=>points.length===1?w/2:pX+index*(w-2*pX)/(points.length-1),yFor=pct=>h-pY-Math.min(maxPct,Math.max(0,pct))/maxPct*(h-2*pY);
 const cal=points.map((p,i)=>({x:xFor(p,i),y:yFor(p.calPct),...p})),protein=points.map((p,i)=>({x:xFor(p,i),y:yFor(p.proteinPct),...p}));
 const line=coords=>coords.map(pt=>pt.x.toFixed(1)+','+pt.y.toFixed(1)).join(' '),goalY=yFor(100).toFixed(1);
 const aggregate=window.granularity!=='day',pointTitle=(pt,metric)=>pt.label+' · '+(aggregate?'avg ':'')+(metric==='cal'?Math.round(pt.calories)+' cal · '+Math.round(pt.calPct)+'% of calorie goal':Math.round(pt.protein)+'g protein · '+Math.round(pt.proteinPct)+'% of protein goal')+(aggregate?' · '+pt.loggedDays+' logged day'+(pt.loggedDays===1?'':'s'):'');
 return '<div class="food-progress-chart"><div class="food-chart-legend"><span class="food-chart-key calories"><i></i><b>Calories</b></span><span class="food-chart-key protein"><i></i><b>Protein</b></span><span class="food-chart-key goal"><i></i><b>100% goal</b></span></div><svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="'+esc(window.label)+' calorie and protein progress"><line class="food-goal-line" x1="'+pX+'" x2="'+(w-pX)+'" y1="'+goalY+'" y2="'+goalY+'"></line>'+(cal.length>1?'<polyline class="food-calorie-line" points="'+line(cal)+'"></polyline><polyline class="food-protein-line" points="'+line(protein)+'"></polyline>':'')+cal.map(pt=>'<circle class="food-calorie-dot" cx="'+pt.x.toFixed(1)+'" cy="'+pt.y.toFixed(1)+'" r="3.2"><title>'+esc(pointTitle(pt,'cal'))+'</title></circle>').join('')+protein.map(pt=>'<circle class="food-protein-dot" cx="'+pt.x.toFixed(1)+'" cy="'+pt.y.toFixed(1)+'" r="3.2"><title>'+esc(pointTitle(pt,'protein'))+'</title></circle>').join('')+'</svg><div class="food-chart-range"><span>'+esc(points[0].label)+'</span><span>'+esc(points.at(-1).label)+'</span></div><p class="food-chart-note">'+(aggregate?'Quarter and year views average only days that contain food logs. Missing days are not treated as zero.':'Each point is an exact logged day relative to your calorie and protein goals.')+'</p></div>';
}
function foodProgressControls(window){
 const periods=[['week','Week'],['month','Month'],['quarter','Quarter'],['year','Year']];
 return '<div class="food-period-controls"><div class="food-period-tabs" role="group" aria-label="Nutrition chart period">'+periods.map(([value,label])=>'<button type="button" data-action="food-progress-period" data-period="'+value+'" class="'+(foodProgressPeriod===value?'active':'')+'" aria-pressed="'+(foodProgressPeriod===value)+'">'+label+'</button>').join('')+'</div><div class="food-period-nav"><button type="button" data-action="food-progress-nav" data-delta="-1" aria-label="Previous '+esc(foodProgressPeriod)+'">‹</button><strong>'+esc(window.label)+'</strong><button type="button" data-action="food-progress-nav" data-delta="1" aria-label="Next '+esc(foodProgressPeriod)+'" '+(foodProgressOffset>=0?'disabled':'')+'>›</button></div>'+(foodProgressOffset!==0?'<button type="button" class="text-btn food-period-current" data-action="food-progress-current">Current '+esc(foodProgressPeriod)+'</button>':'')+'</div>';
}
function weightHistoryAll(){
 const weights=[...data.weights].sort((a,b)=>b.date.localeCompare(a.date));
 modal('All weigh-ins','<div class="weight-all-list">'+(weights.length?weights.map(w=>'<div class="list-row"><span><strong>'+fmt(w.value)+' '+esc(data.settings.unit)+'</strong><small>'+niceDate(w.date)+' · '+w.date.slice(0,4)+' · BMI '+bmi(w.value,data.settings.heightInches,data.settings.unit)+'</small></span>'+button('Edit','edit-weight','text-btn','data-id="'+esc(w.id)+'"')+'</div>').join(''):empty('No weigh-ins yet.'))+'</div>');
}
function progress() {
  const weeks=weeklyWeights(data.weights,data.settings.heightInches,data.settings.unit,FIXED_WEEK_START), visibleWeeks=weeks.slice(0,6), weights=[...data.weights].sort((a,b)=>b.date.localeCompare(a.date)), recentWeights=weights.slice(0,5), bodyFat=[...(data.bodyFat||[])].sort((a,b)=>b.date.localeCompare(a.date)), recentBodyFat=bodyFat.slice(0,5);
  const currentWeek=startOfWeek(currentTrackingDate(),FIXED_WEEK_START), latest=weeks[0], previous=weeks[1];
  const change=previous?round(latest.average-previous.average):null;
  const days=[...new Set(data.foodEntries.map(x=>x.date))].sort().reverse().slice(0,7),foodWindow=foodProgressWindow();
  const range=w=>`${niceDate(w.week)} – ${niceDate(endOfWeek(w.week))}`;
  const chartStart=visibleWeeks.at(-1)?.week||weights.at(-1)?.date,chartEnd=visibleWeeks[0]?endOfWeek(visibleWeeks[0].week):weights[0]?.date;
  const chartWeights=chartStart&&chartEnd?weights.filter(w=>w.date>=chartStart&&w.date<=chartEnd):weights,chartBodyFat=chartStart&&chartEnd?bodyFat.filter(b=>b.date>=chartStart&&b.date<=chartEnd):bodyFat;
  return `<div class="page-head progress-head"><p class="eyebrow">THE BIG PICTURE</p><h1>Progress<span class="accent">.</span></h1><p>Weekly averages put daily changes in perspective.</p></div><section class="panel progress-trend"><div class="section-head"><div><p class="eyebrow">BODY WEIGHT</p><h2>Weekly trend</h2></div>${button('+ Weigh in','weight','primary small')}</div><p class="week-setting">Weeks start Friday</p>${latest?`<div class="trend-highlight"><p class="eyebrow">${latest.week===currentWeek?'CURRENT WEEK':'LATEST LOGGED WEEK'}</p><p class="trend-range">${range(latest)}</p><div class="trend-metrics"><div><strong>${fmt(latest.average)} <em>${data.settings.unit}</em></strong><small>Average weight · ${latest.count} weigh-in${latest.count===1?'':'s'}</small></div><div><strong>${latest.bmi??'—'}</strong><small>Average BMI</small></div></div><p class="trend-change">${change===null?'Log another week to compare averages.':`${change>0?'↑':change<0?'↓':'→'} ${fmt(Math.abs(change))} ${data.settings.unit} ${change>0?'higher':change<0?'lower':'change'} than the previous logged week`}</p></div>${chartWeights.length?weightProgressChart(chartWeights):''}${chartBodyFat.length?bodyFatProgressChart(chartBodyFat):''}<div class="week-list">${visibleWeeks.map(w=>`<div class="week-row" data-week="${w.week}"><span><strong>${range(w)}</strong><small>${w.week.slice(0,4)}${w.week.slice(0,4)!==endOfWeek(w.week).slice(0,4)?'–'+endOfWeek(w.week).slice(0,4):''} · ${w.count} weigh-in${w.count===1?'':'s'}${w.week===currentWeek?' · Current week':''}</small></span><span class="week-values"><strong>${fmt(w.average)} ${data.settings.unit}</strong><small>BMI ${w.bmi??'—'}</small></span></div>`).join('')}</div>`:empty('Add a weigh-in to see weekly average weight and BMI.')}<p class="hint">Showing up to the last 6 Friday–Thursday weeks. Averages use logged weigh-ins only. BMI uses your height in Settings.</p></section><section class="panel progress-details weight-progress-panel"><div class="section-head"><h2>Individual weigh-ins</h2><div class="progress-head-actions"><span class="progress-count">${Math.min(5,weights.length)} shown${weights.length>5?' · '+weights.length+' total':''}</span>${weights.length>5?button('See all','weight-all','text-btn'):''}</div></div>${recentWeights.length?recentWeights.map(w=>`<div class="list-row"><span><strong>${fmt(w.value)} ${data.settings.unit}</strong><small>${niceDate(w.date)} · ${w.date.slice(0,4)} · BMI ${bmi(w.value,data.settings.heightInches,data.settings.unit)}</small></span>${button('Edit','edit-weight','text-btn',`data-id="${esc(w.id)}"`)}</div>`).join(''):empty('No weigh-ins yet.')}</section><section class="panel progress-details bodyfat-progress-panel"><div class="section-head"><div><p class="eyebrow">BODY COMPOSITION</p><h2>Body fat</h2></div>${button('+ Body fat','body-fat','outline small')}</div>${recentBodyFat.length?recentBodyFat.map(b=>`<div class="list-row"><span><strong>${fmt(b.value)}%</strong><small>${niceDate(b.date)} · ${b.date.slice(0,4)}</small></span>${button('Edit','edit-body-fat','text-btn',`data-id="${esc(b.id)}"`)}</div>`).join(''):empty('No body-fat readings yet.')}</section>${workoutTimingPanel()}${exerciseProgressPanel()}<section class="panel progress-details food-progress-panel"><div class="section-head"><div><p class="eyebrow">NUTRITION</p><h2>Calories & protein</h2></div>${button('All dates ↗','history','text-btn')}</div>${data.foodEntries.length?foodProgressControls(foodWindow)+recentFoodChart(foodWindow)+'<div class="recent-food-days"><p class="eyebrow">RECENT LOGGED DAYS</p>'+days.map(day=>{const t=dailyTotals(data.foodEntries,day);return `<button class="day-link" data-action="go-date" data-date="${day}"><span>${niceDate(day)}</span><strong>${Math.round(t.calories)} cal · ${Math.round(t.protein)}g</strong></button>`;}).join('')+'</div>':empty('Food totals will appear once you start logging.')}</section>`;
}
function history() {
  const dates=[...new Set([...data.foodEntries,...data.lifts,...data.weights,...(data.bodyFat||[]),...(data.notes||[])].map(x=>x.date))].sort().reverse();
  return `<div class="page-head"><p class="eyebrow">EVERY DAY COUNTS</p><h1>History<span class="accent">.</span></h1><p>Choose any date to view or correct what you logged.</p></div><div class="date-row">${input('Jump to date','date',chosenDate,'date','required')}${button('Open food','food','outline small')}</div>${dates.length?dates.map(date=>{const t=dailyTotals(data.foodEntries,date), lifts=data.lifts.filter(x=>x.date===date).length, w=data.weights.find(x=>x.date===date),bf=(data.bodyFat||[]).filter(x=>x.date===date).at(-1),mealNotes=notesForDate(date,'meal').length,dayNote=dayNoteForDate(date);return `<button class="history-day" data-action="go-date" data-date="${date}"><strong>${niceDate(date)}</strong><span>${Math.round(t.calories)} cal · ${Math.round(t.protein)}g protein<br>${lifts} lift${lifts===1?'':'s'}${w?` · ${fmt(w.value)} ${data.settings.unit}`:''}${bf?` · ${fmt(bf.value)}% BF`:''}${mealNotes?` · ${mealNotes} meal memor${mealNotes===1?'y':'ies'}`:''}${dayNote?' · day note':''}</span><b>↗</b></button>`}).join(''):empty('Your logged days will show up here.')}`;
}

function dataDiagnostics(){
 const issues=[],warnings=[];
 let payloadBytes=0;try{payloadBytes=new TextEncoder().encode(JSON.stringify(encodeData(data))).length;}catch(error){issues.push('Current data cannot be encoded: '+error.message);}
 const defs=data.exerciseDefinitions||[],defIds=new Set(defs.map(e=>e.id));
 for(const w of data.workoutTemplates||[])for(const item of w.exercises||[])if(!defIds.has(item.exerciseId))issues.push(w.name+' references a missing exercise: '+item.exerciseId);
 const foodGroups=new Map();for(const f of data.foods){const key=f.name.trim().toLowerCase();if(!foodGroups.has(key))foodGroups.set(key,[]);foodGroups.get(key).push(f);}
 for(const [name,items] of foodGroups)if(items.length>1)warnings.push('Possible duplicate saved food: '+items[0].name+' ('+items.length+')');
 const exerciseGroups=new Map();for(const e of defs){const key=exerciseHistoryKey(e.name,e.equipment);if(!exerciseGroups.has(key))exerciseGroups.set(key,[]);exerciseGroups.get(key).push(e);}
 for(const items of exerciseGroups.values())if(items.length>1)warnings.push('Duplicate exercise definition: '+items[0].name+' / '+equipmentLabel(items[0].equipment));
 const invalidFoodTimes=data.foodEntries.filter(e=>e.t!=null&&(!Number.isInteger(e.t)||e.t<0||e.t>47)).length;if(invalidFoodTimes)issues.push(invalidFoodTimes+' food entr'+(invalidFoodTimes===1?'y has':'ies have')+' an invalid time slot.');
 const workoutRefs=(data.workoutTemplates||[]).reduce((n,w)=>n+(w.exercises?.length||0),0);
 const counts={foods:data.foods.length,foodEntries:data.foodEntries.length,lifts:data.lifts.length,weights:data.weights.length,bodyFat:(data.bodyFat||[]).length,exerciseDefinitions:defs.length,workoutTemplates:(data.workoutTemplates||[]).length,workoutRefs,workoutHistory:(data.workoutHistory||[]).length,notes:(data.notes||[]).length};
 return{issues,warnings,payloadBytes,percent:Math.min(100,payloadBytes/800000*100),counts};
}
function dataHealthPanel(){
 const d=dataDiagnostics(),status=d.issues.length?'Needs attention':d.warnings.length?'Review suggested':'Looks healthy',tone=d.issues.length?'bad':d.warnings.length?'warn':'good';
 return '<section class="panel spaced data-health-panel"><div class="section-head"><div><p class="eyebrow">DATA HEALTH</p><h2>Diagnostics</h2></div><span class="health-status '+tone+'">'+status+'</span></div><div class="storage-meter"><div><span style="width:'+d.percent.toFixed(1)+'%"></span></div><p><strong>'+Math.round(d.payloadBytes/1024)+' KB</strong> of the app’s 781 KB cloud-payload limit · '+d.percent.toFixed(1)+'%</p></div><div class="diagnostic-counts"><span><strong>'+d.counts.foodEntries+'</strong><small>food logs</small></span><span><strong>'+d.counts.lifts+'</strong><small>lift logs</small></span><span><strong>'+d.counts.weights+'</strong><small>weights</small></span><span><strong>'+d.counts.bodyFat+'</strong><small>body fat</small></span></div>'+button('View diagnostic details','data-health-details','outline small')+'<p class="hint">Diagnostics are read-only. Nothing is repaired, deleted, or merged automatically.</p></section>';
}
function dataHealthDetails(){
 const d=dataDiagnostics(),rows=[['Cloud payload',Math.round(d.payloadBytes/1024)+' KB / ~781 KB'],['Saved foods',d.counts.foods],['Food entries',d.counts.foodEntries],['Exercise definitions',d.counts.exerciseDefinitions],['Workout templates',d.counts.workoutTemplates],['Workout exercise references',d.counts.workoutRefs],['Lift entries',d.counts.lifts],['Weight entries',d.counts.weights],['Body-fat entries',d.counts.bodyFat],['Notes',d.counts.notes],['Workout Buddy history',d.counts.workoutHistory]];
 modal('Data diagnostics','<div class="diagnostic-details"><div class="diagnostic-table">'+rows.map(([k,v])=>'<div><span>'+esc(k)+'</span><strong>'+esc(v)+'</strong></div>').join('')+'</div><section><h3>Errors</h3>'+(d.issues.length?'<ul>'+d.issues.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'<p class="empty">No structural errors found.</p>')+'</section><section><h3>Things to review</h3>'+(d.warnings.length?'<ul>'+d.warnings.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'<p class="empty">No duplicate definitions detected.</p>')+'</section></div>');
}
function offlineWorkspacePanel(){
  if(offlineWorkspace){
    const status=offlineWorkspace.dirty?'Changes since last export':'No changes since last export/load';
    return '<section class="panel spaced offline-workspace-panel active"><div class="section-head"><div><p class="eyebrow">OFFLINE JSON</p><h2>Workspace active</h2></div><span class="workspace-status '+(offlineWorkspace.dirty?'dirty':'clean')+'">'+(offlineWorkspace.dirty?'Export needed':'Up to date')+'</span></div><p class="body-copy"><strong>'+esc(offlineWorkspace.filename)+'</strong><br>'+esc(status)+'. All edits are saved only on this device while this workspace is active. Firebase and Apple Health are paused.</p><div class="offline-workspace-actions">'+button('Export updated JSON','offline-export','primary')+button('Replace workspace JSON','offline-replace','outline')+button('Exit offline mode','offline-exit','outline')+'</div><p class="hint">After exiting, use the normal Restore JSON backup flow if you want these changes applied to your account. Nothing syncs automatically. For travel, add Everyday to your iPhone Home Screen and open it once online after updates; the cached app can reopen without internet.</p></section>';
  }
  return '<section class="panel spaced offline-workspace-panel"><p class="eyebrow">OFFLINE JSON</p><h2>Work from a backup</h2><p class="body-copy">Load an Everyday JSON backup into a separate local workspace. You can use the normal tracker, edit everything, and export a new JSON without writing to Firebase.</p>'+button('Start offline JSON workspace','offline-start','outline')+'<p class="hint">This is a deliberate mode, not an automatic network fallback. Your current device or cloud data stays untouched. For a trip, add Everyday to your iPhone Home Screen, open it once while online, and keep the JSON backup downloaded in Files on the phone.</p></section>';
}
function offlineWorkspaceModal(replace=false){
  const warning=offlineWorkspace?.dirty&&replace?'<div class="import-alert"><strong>Unexported workspace changes</strong><p>Replacing the workspace will discard them. Export first if you want to keep them.</p></div>':'';
  modal(replace?'Replace offline workspace':'Start offline workspace',warning+'<form class="form" data-form="offline-workspace"><input type="hidden" name="replace" value="'+(replace?'yes':'no')+'"><label class="field"><span>Choose an Everyday .json backup</span><input type="file" name="file" accept=".json,application/json" required></label><button type="submit" class="primary">'+(replace?'Replace workspace':'Open offline workspace')+'</button></form><div id="offline-workspace-preview" role="status"></div>');
}
async function exitOfflineWorkspace(){
  if(!offlineWorkspace)return;
  if(offlineWorkspace.dirty&&!confirm('This workspace has changes since the last export. Exit anyway?'))return;
  try{localStorage.removeItem(OFFLINE_WORKSPACE_KEY);}catch{}
  offlineWorkspace=null;pendingImport=null;cloudMessage=account?'Returning to your cloud account…':'Only on this device · sign in for cloud saving';
  if(account){data=emptyData();render();await loadAccount();}
  else{data=structuredClone(deviceData);chosenDate=currentTrackingDate();render();promptWeight();}
}
function storageProtectionPanel(){
  const status=storageProtection.persisted===true?'Protected':storageProtection.supported?'Best effort':'Unavailable',tone=storageProtection.persisted===true?'good':storageProtection.supported?'warn':'bad';
  const usage=Number.isFinite(storageProtection.usage)?Math.round(storageProtection.usage/1024)+' KB used':'Usage unavailable';
  const quota=Number.isFinite(storageProtection.quota)?' · '+Math.round(storageProtection.quota/1024/1024)+' MB quota':'';
  const detail=storageProtection.persisted===true?'iOS/browser storage eviction protection is active for this app origin.':storageProtection.supported?'Everyday asked for persistent storage, but the browser has not granted it yet. Home Screen use can improve WebKit’s decision.':'This browser does not expose the persistent-storage API.';
  return '<section class="panel spaced"><div class="section-head"><div><p class="eyebrow">DEVICE STORAGE</p><h2>Offline protection</h2></div><span class="health-status '+tone+'">'+status+'</span></div><p class="body-copy">'+esc(detail)+'</p><p class="hint">'+esc(usage+quota+(storageProtection.error?' · '+storageProtection.error:''))+'</p>'+(storageProtection.supported&&storageProtection.persisted!==true?button('Ask for persistent storage','storage-persist','outline small'):'')+'</section>';
}
function settings() {
  const intro=offlineWorkspace?'Offline JSON workspace is active. Changes are local to this workspace until you export a new JSON.':account?'Your logs are saved to your Google account’s private cloud space.':'Device mode: these logs are only in this browser. Sign in to save them online.';
  return `<div class="page-head"><p class="eyebrow">MAKE IT YOURS</p><h1>Settings<span class="accent">.</span></h1><p>${esc(intro)} Export backups regularly.</p></div>${accountPanel()}${offlineWorkspacePanel()}${storageProtectionPanel()}${healthPanel()}${appearancePanel()}${weekSettingsPanel()}<section class="panel"><h2>Your goals</h2><form data-form="settings" class="form"><div class="form-grid">${input('Daily calories','calories',data.settings.calories,'number','min="1" step="1" required')}${input('Daily protein (g)','protein',data.settings.protein,'number','min="1" step="1" required')}${input('Height (inches)','heightInches',data.settings.heightInches,'number','min="1" step="0.01" required')}<label class="field"><span>Weight unit</span><select name="unit"><option value="lb" ${data.settings.unit==='lb'?'selected':''}>Pounds (lb)</option><option value="kg" ${data.settings.unit==='kg'?'selected':''}>Kilograms (kg)</option></select></label></div><button class="primary" type="submit">Save goals</button></form><p class="hint">Changing the weight unit converts existing weights and lift sets. BMI uses height in inches.</p></section>${dataHealthPanel()}<section class="panel spaced"><p class="eyebrow">MOVE YOUR DATA</p><h2>Import & backup</h2><p class="body-copy">Import Everyday data from a file or pasted text. CSV imports are additive; JSON restore is a full replacement. Both use the review screen before saving.</p>${button('Import data','import-data','outline')}${button(offlineWorkspace?'Export workspace JSON':'Export JSON backup','export','outline')}<p class="hint">Universal CSV can add saved foods, food logs, exercises, workout templates, lift logs, and independent weight and body-fat records. Legacy food CSVs still work.</p></section><section class="panel spaced"><h2>About this version</h2><p class="body-copy">Google sign-in saves account records to private Firebase space and keeps account-scoped recovery copies on this device while you are signed in. Offline JSON workspace data remains separate and never syncs automatically. Export backups for an independent copy. Cloud accounts support up to about 800 KB of logs.</p></section>`;
}
function modal(title,body,onBack=null) {modalBack=onBack;document.querySelector('#overlay').innerHTML=`<div class="scrim" data-action="close"></div><div class="modal" tabindex="-1" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-top"><h2>${esc(title)}</h2>${button('✕','close','close-btn','aria-label="Close"')}</div>${body}</div>`;document.querySelector('.modal')?.focus({preventScroll:true});}
function close(all=false) {importReadToken++;const back=modalBack;modalBack=null;document.querySelector('#overlay').innerHTML='';pendingImport=null;if(!all&&back)back();}
function filteredFoodLibrary(){
 let foods=sortFoods(data.foods,foodLibrarySort),q=foodLibrarySearch.trim().toLowerCase();
 if(q)foods=foods.filter(f=>f.name.toLowerCase().includes(q)||foodKindLabel(f.kind).toLowerCase().includes(q)||foodAccuracyLabel(f.accuracy).toLowerCase().includes(q)||(f.tags||[]).some(tag=>tag.includes(q))||(f.pinned&&'pinned'.includes(q)));
 if(foodLibraryFilter==='food')foods=foods.filter(f=>(f.kind||'food')==='food');
 else if(foodLibraryFilter==='drink')foods=foods.filter(f=>f.kind==='drink');
 else if(foodLibraryFilter==='ingredient')foods=foods.filter(f=>hasFoodTag(f,'ingredient'));
 else if(foodLibraryFilter==='pinned')foods=foods.filter(f=>f.pinned===true);
 else if(foodLibraryFilter==='label')foods=foods.filter(f=>f.accuracy==='label');
 else if(foodLibraryFilter==='estimate')foods=foods.filter(f=>f.accuracy==='estimate');
 return foods;
}
function foodLibraryRows(){
 const foods=filteredFoodLibrary();
 return foods.length?foods.map(f=>'<button type="button" class="food-library-item" data-action="edit-food-def" data-id="'+esc(f.id)+'"><span><strong>'+esc(f.name)+(f.pinned?' <em class="pin-mark">★</em>':'')+'</strong><small>'+esc(foodMetaSummary(f))+' · '+fmt(f.calories)+' cal · '+fmt(f.protein)+'g protein</small></span><b>›</b></button>').join(''):'<p class="empty">No saved foods match these filters.</p>';
}
function refreshFoodLibraryList(){
 const list=document.querySelector('.food-library-list'),count=document.querySelector('[data-food-library-count]');if(list)list.innerHTML=foodLibraryRows();if(count)count.textContent=filteredFoodLibrary().length+' shown';
}
function foodLibrary(){
 modal('Food Library','<div class="food-library"><div class="library-intro"><p class="body-copy">Edit reusable food definitions here without adding anything to the selected day. Pin frequent items for one-tap access and mark whether nutrition is label-exact or estimated.</p><button type="button" class="primary small" data-action="new-food-def">+ New saved food</button></div><div class="library-search-row"><label class="library-search"><span>Search</span><input type="search" data-library-search="food" value="'+esc(foodLibrarySearch)+'" placeholder="Search saved foods"></label><label class="sort-control"><span>Filter</span><select data-library-filter="food"><option value="all" '+(foodLibraryFilter==='all'?'selected':'')+'>All</option><option value="pinned" '+(foodLibraryFilter==='pinned'?'selected':'')+'>Favorites</option><option value="food" '+(foodLibraryFilter==='food'?'selected':'')+'>Food</option><option value="drink" '+(foodLibraryFilter==='drink'?'selected':'')+'>Drink</option><option value="ingredient" '+(foodLibraryFilter==='ingredient'?'selected':'')+'>Ingredients</option><option value="label" '+(foodLibraryFilter==='label'?'selected':'')+'>Label exact</option><option value="estimate" '+(foodLibraryFilter==='estimate'?'selected':'')+'>Estimated</option></select></label>'+foodSortControl(foodLibrarySort,'food-library')+'</div><div class="library-result-count" data-food-library-count>'+filteredFoodLibrary().length+' shown</div><div class="food-library-list">'+foodLibraryRows()+'</div></div>');
}
function foodDefinitionForm(food=null,origin='food'){
 const tags=new Set(food?.tags||[]),back=origin==='library'?()=>foodLibrary():null;
 modal(food?'Edit saved food':'New saved food','<form class="form" data-form="food-definition"><input type="hidden" name="foodId" value="'+esc(food?.id||'')+'"><input type="hidden" name="origin" value="'+esc(origin)+'">'+input('Food name','name',food?.name||'','text','maxlength="100" required')+'<div class="form-grid">'+input('Calories per serving','calories',food?.calories??'','number','min="0" step="0.1" required')+input('Protein (g) per serving','protein',food?.protein??'','number','min="0" step="0.1" required')+'</div><div class="form-grid"><label class="field"><span>Type</span><select name="kind"><option value="food" '+(food?.kind!=='drink'?'selected':'')+'>Food</option><option value="drink" '+(food?.kind==='drink'?'selected':'')+'>Drink</option></select></label><label class="field"><span>Nutrition accuracy</span><select name="accuracy"><option value="" '+(!food?.accuracy?'selected':'')+'>Unspecified</option><option value="label" '+(food?.accuracy==='label'?'selected':'')+'>Label exact</option><option value="estimate" '+(food?.accuracy==='estimate'?'selected':'')+'>Estimated</option></select></label></div><label class="tag-check"><input type="checkbox" name="pinned" value="yes" '+(food?.pinned?'checked':'')+'><span><strong>Favorite</strong><small>Shows this item in Favorites at the top of the Food page.</small></span></label><label class="tag-check"><input type="checkbox" name="ingredient" value="yes" '+(tags.has('ingredient')?'checked':'')+'><span><strong>Ingredient</strong><small>Useful as part of meals or recipes. This does not exclude it from suggestions.</small></span></label><div class="form-actions"><button class="primary" type="submit">Save definition</button>'+(food?button('Delete saved food','delete-food-def','danger','data-id="'+esc(food.id)+'" data-origin="'+esc(origin)+'"'):'')+'</div></form><p class="hint">Label exact means the nutrition came from a package, manufacturer, or restaurant listing. Estimated means the values are an approximation. Historical food-log entries keep their original nutrition.</p>',back);
}
function foodForm(entry=null,card=null) {
  const onBack=document.querySelector('.full-food-log')?()=>foodLog():null;
  const dateValue=entry?.date||chosenDate,timeValue=entry?(entry.t??null):(dateValue===currentTrackingDate()?currentFoodSlot():null);
  modal(entry?'Edit food log':card?'Log saved food':'Add food',`<form class="form" data-form="food"><input type="hidden" name="entryId" value="${esc(entry?.id||'')}"><input type="hidden" name="cardId" value="${esc(card?.id||'')}">${input('Food name','name',entry?.name||card?.name||'','text','maxlength="100" autocomplete="off" required')}${!entry&&!card?'<div class="food-matches" role="listbox" aria-label="Matching saved foods"></div>':''}<div class="form-grid">${input('Calories per serving','calories',entry?.calories??card?.calories??'','number','min="0" step="0.1" required')}${input('Protein (g) per serving','protein',entry?.protein??card?.protein??'','number','min="0" step="0.1" required')}</div><div class="form-grid">${input('Servings','quantity',entry?.quantity??1,'number','min="0.01" step="0.01" required')}${input('Date','date',dateValue,'date','required')}</div><label class="field"><span>Time</span><select name="foodTime">${foodTimeOptions(timeValue)}</select></label><div class="form-actions"><button class="primary" type="submit">Save food log</button>${entry?button('Delete log','delete-entry','danger',`data-id="${esc(entry.id)}"`):''}</div></form><p class="hint">Saved-food details are copied into this log. Changing servings, date, time, or nutrition here does not rewrite the saved food definition.</p>`,onBack);
}
function showFoodUndo(entryId,name){
 clearTimeout(foodUndoTimer);const root=document.querySelector('#overlay');if(!root)return;
 root.innerHTML='<div class="food-undo-toast" role="status"><span><strong>Added '+esc(name)+'</strong><small>Saved to the food log.</small></span><button type="button" data-action="undo-food-add" data-id="'+esc(entryId)+'">Undo</button></div>';
 foodUndoTimer=setTimeout(()=>{const toast=document.querySelector('.food-undo-toast'),undo=toast?.querySelector('[data-action="undo-food-add"]');if(undo?.dataset.id===entryId)root.innerHTML='';},5000);
}
function liftForm(lift=null,name='',equipment='other') {
 const exercise=lift?.exercise||name,type=lift?.equipment||equipment||'other',prior=lastLift(exercise,lift?.id,type),sets=lift?.sets||prior?.sets||[{weight:0,reps:8},{weight:0,reps:8}],options=['machine','cable','dumbbell','bench','calisthenics','other'].map(x=>`<option value="${x}" ${x===type?'selected':''}>${equipmentLabel(x)}</option>`).join('');
 modal(lift?'Edit lift':'Log lift',`<form class="form lift-form" data-form="lift"><input type="hidden" name="liftId" value="${esc(lift?.id||'')}">${input('Exercise','exercise',exercise,'text','maxlength="100" autocomplete="off" required')}${!lift?'<div class="exercise-matches" role="listbox" aria-label="Matching exercises"></div>':''}<label class="field"><span>Equipment</span><select name="equipment">${options}</select></label>${input('Date','date',lift?.date||chosenDate,'date','required')}${prior?`<p class="prior">Last time · ${niceDate(prior.date)}<br><strong>${describeLift(prior)}</strong></p>`:''}<div class="section-head"><h3>Sets</h3>${button('+ Add set','add-set','text-btn')}</div><div id="sets">${sets.map((s,i)=>setRow(i,s)).join('')}</div><div class="form-grid"><label class="field lift-notes"><span>Notes (optional)</span><textarea name="notes" rows="1" maxlength="500" placeholder="Form, setup, pain, anything worth remembering">${esc(lift?.notes||'')}</textarea></label></div><div class="form-actions"><button class="primary" type="submit">Save lift</button>${lift?button('Delete lift','delete-lift','danger',`data-id="${esc(lift.id)}"`):''}</div></form>`);document.querySelector('.modal')?.classList.add('lift-dialog');
}
function setRow(i,s={weight:'',reps:'',difficulty:''}) {return `<div class="set-row"><span>${i+1}</span>${input('Weight ('+data.settings.unit+')','weight',s.weight,'number','min="0" step="0.5" inputmode="decimal" required')}${input('Reps','reps',s.reps,'number','min="1" step="1" inputmode="numeric" required')}<label class="field effort-field"><span>Effort</span><select name="difficulty" class="effort-select effort-${Number(s.difficulty)||0}" aria-label="Set ${i+1} effort">${effortOptions(s.difficulty)}</select></label>${button('−','remove-set','remove-set','aria-label="Remove set"')}</div>`;}
function weightForm(w=null,prompt=false) {modal(w?'Edit weigh-in':'Log your weight',`<form class="form" data-form="weight"><input type="hidden" name="weightId" value="${esc(w?.id||'')}">${input(`Weight (${data.settings.unit})`,'value',w?.value??'','number','min="1" step="0.1" required')}${input('Date','date',w?.date||currentTrackingDate(),'date','required')}<div class="form-actions"><button class="primary" type="submit">Save weigh-in</button>${w?button('Delete','delete-weight','danger',`data-id="${esc(w.id)}"`):button('Enter later','later','outline')}</div></form><p class="hint">${prompt?'This is today’s only automatic weight prompt. Close it or choose Enter later and Everyday will not ask again until the next tracking day. ':''}Weight is stored independently from body-fat measurements. Same-day weigh-ins replace the earlier weight value.</p>`);}
function bodyFatForm(b=null){modal(b?'Edit body fat':'Log body fat',`<form class="form" data-form="body-fat"><input type="hidden" name="bodyFatId" value="${esc(b?.id||'')}">${input('Body fat %','value',b?.value??'','number','min="0.1" max="100" step="0.1" required')}${input('Date','date',b?.date||currentTrackingDate(),'date','required')}<div class="form-actions"><button class="primary" type="submit">Save body fat</button>${b?button('Delete','delete-body-fat','danger',`data-id="${esc(b.id)}"`):''}</div></form><p class="hint">Body fat is its own measurement stream. It does not require or modify a weight record.</p>`);}
function notesForDate(date,type=''){return (data.notes||[]).filter(n=>n.date===date&&(!type||n.type===type)).sort((a,b)=>(a.t??99)-(b.t??99));}
function dayNoteForDate(date){return notesForDate(date,'day')[0]||null;}
function dayNoteForm(date=chosenDate){
 const existing=dayNoteForDate(date);
 modal(existing?'Edit day note':'Add day note',`<form class="form" data-form="day-note"><input type="hidden" name="noteId" value="${esc(existing?.id||'')}">${input('Date','date',existing?.date||date,'date','required')}<label class="field"><span>Day note</span><textarea name="text" rows="5" maxlength="1200" required placeholder="Port day, lots of walking, late dinner, rough seas…">${esc(existing?.text||'')}</textarea></label><div class="form-actions"><button class="primary" type="submit">Save note</button>${existing?button('Delete','delete-note','danger',`data-id="${esc(existing.id)}"`):''}</div></form><p class="hint">A lightweight note for context. It does not affect nutrition, weight, or workout totals.</p>`);
}
function mealMemoryForm(note=null,date=chosenDate){
 const selectedDate=note?.date||date,time=note?.t??(selectedDate===currentTrackingDate()?currentFoodSlot():null);
 modal(note?'Edit meal memory':'Add meal memory',`<form class="form" data-form="meal-memory"><input type="hidden" name="noteId" value="${esc(note?.id||'')}"><label class="field"><span>What do you want to remember?</span><textarea name="text" rows="4" maxlength="1200" required placeholder="Animator’s Palate dinner · photographed menu + plate">${esc(note?.text||'')}</textarea></label><div class="form-grid">${input('Date','date',selectedDate,'date','required')}<label class="field"><span>Time</span><select name="noteTime">${foodTimeOptions(time)}</select></label></div><div class="form-actions"><button class="primary" type="submit">Save meal memory</button>${note?button('Delete','delete-note','danger',`data-id="${esc(note.id)}"`):''}</div></form><p class="hint">This is a text-only breadcrumb for photos and menu descriptions. It adds zero calories and zero protein until you deliberately log or reconstruct the meal later.</p>`);
}
function travelNotesPanel(date,compact=false){
 const day=dayNoteForDate(date),meals=notesForDate(date,'meal');
 const dayPreview=day?'<button type="button" class="travel-note-preview" data-action="day-note" data-date="'+esc(date)+'"><small>DAY NOTE</small><strong>'+esc(day.text)+'</strong></button>':'';
 const mealRows=meals.map(n=>'<button type="button" class="meal-memory-row" data-action="edit-meal-memory" data-id="'+esc(n.id)+'"><span><small>'+(n.t!=null?esc(foodTimeLabel(n.t)):'Meal memory')+'</small><strong>'+esc(n.text)+'</strong></span><b>›</b></button>').join('');
 return '<section class="panel travel-notes-panel '+(compact?'travel-notes-compact':'')+'"><div class="section-head"><div><p class="eyebrow">TRIP NOTES</p><h2>'+esc(niceDate(date))+'</h2></div></div><div class="travel-note-actions">'+button(day?'Edit day note':'Day note','day-note','outline small','data-date="'+esc(date)+'"')+button('+ Meal memory','meal-memory','outline small','data-date="'+esc(date)+'"')+'</div>'+dayPreview+(mealRows?'<div class="meal-memory-list">'+mealRows+'</div>':'')+(!day&&!meals.length?'<p class="hint">Optional breadcrumbs for the trip. Notes stay offline-safe and do not change your fitness totals.</p>':'')+'</section>';
}
function importHub(){
 modal('Import data','<div class="import-source-grid"><button type="button" class="outline" data-action="import-csv"><strong>CSV file</strong><small>Mixed Everyday records or legacy food CSV</small></button><button type="button" class="outline" data-action="paste-csv"><strong>Paste CSV</strong><small>Paste CSV text directly</small></button><button type="button" class="outline" data-action="restore"><strong>JSON backup</strong><small>Preview a full backup replacement</small></button><button type="button" class="outline" data-action="paste-json"><strong>Paste JSON</strong><small>Paste a complete Everyday backup</small></button></div><p class="hint">Universal CSV supports saved foods, food logs, exercises, workout templates, lift sets, and independent weight and body-fat records, plus day and meal notes. Every import still goes through the same review screen.</p>');
}
function importModal(kind,source='file') {
 pendingImport=null;importReadToken++;const paste=source==='paste',title=(paste?'Paste ':'Import ')+(kind==='csv'?'CSV':'JSON');
 modal(title,`<form class="form" data-form="import"><input type="hidden" name="kind" value="${kind}"><input type="hidden" name="source" value="${source}">${paste?'<label class="field"><span>Paste '+kind.toUpperCase()+'</span><textarea name="text" rows="12" maxlength="5000000" spellcheck="false" required placeholder="Paste '+kind.toUpperCase()+' here"></textarea></label>':'<label class="field"><span>Choose a .'+kind+' file</span><input type="file" name="file" accept="'+(kind==='csv'?'.csv,text/csv':'.json,application/json')+'" required></label>'}<button type="submit" class="primary">Preview import</button></form><div id="preview" role="status"></div>`);
}
app.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.querySelector('.modal')){event.preventDefault();close();}});
app.addEventListener('input',event=>{if(event.target.matches('[data-suggestion-search]')){refreshSuggestionSearch();return;}if(event.target.matches('[data-library-search]')){if(event.target.dataset.librarySearch==='food'){foodLibrarySearch=event.target.value;refreshFoodLibraryList();}else{exerciseLibrarySearch=event.target.value;refreshExerciseLibraryList();}return;}if(event.target.matches('[data-workout-add-search]')){const q=event.target.value.trim().toLowerCase();document.querySelectorAll('.workout-add-item').forEach(row=>row.hidden=q&&!row.dataset.search.includes(q));return;}if(event.target.matches('.lift-notes textarea')){const field=event.target;field.style.height='0px';field.style.height=field.scrollHeight+'px';requestAnimationFrame(()=>field.scrollIntoView({block:'nearest',behavior:'smooth'}));}if(event.target.name==='name'&&event.target.closest('form[data-form="food"]')?.querySelector('.food-matches'))renderFoodMatches(event.target.form);if(event.target.name==='exercise'&&event.target.closest('form[data-form="lift"]')?.querySelector('.exercise-matches'))renderExerciseMatches(event.target.form);});
function syncLiftViewport(){const dialog=document.querySelector('.lift-dialog');if(!dialog)return;const vv=window.visualViewport;if(vv)dialog.style.maxHeight=Math.max(260,vv.height-8)+'px';const field=document.activeElement;if(field?.closest?.('.lift-dialog')&&field.matches('input,textarea,select'))requestAnimationFrame(()=>field.scrollIntoView({block:'nearest',behavior:'smooth'}));}
app.addEventListener('focusin',event=>{if(!event.target.closest('.lift-dialog')||!event.target.matches('input,textarea,select'))return;setTimeout(syncLiftViewport,220);});
app.addEventListener('change',event=>{if(event.target.matches('.effort-select'))event.target.className='effort-select effort-'+(event.target.value||0);if(event.target.closest('.buddy-set-editor')){buddyReadEditor();persist();}if(event.target.matches('[name=buddyNotes]')){buddyReadNotes();persist();}});
if(window.visualViewport){window.visualViewport.addEventListener('resize',()=>setTimeout(syncLiftViewport,40));window.visualViewport.addEventListener('scroll',syncLiftViewport);}
app.addEventListener('change',event=>{if(event.target.dataset.libraryFilter){if(event.target.dataset.libraryFilter==='food'){foodLibraryFilter=event.target.value;refreshFoodLibraryList();}else{exerciseLibraryFilter=event.target.value;refreshExerciseLibraryList();}return;}if(event.target.matches('[data-suggestion-time]')){if(!foodSuggestionState)return;foodSuggestions({...foodSuggestionState,timeSlot:event.target.value===''?null:Number(event.target.value)});return;}if(event.target.dataset.sortScope){const scope=event.target.dataset.sortScope;if(scope==='food-page'){foodSort=event.target.value;render();}else if(scope==='food-library'){foodLibrarySort=event.target.value;foodLibrary();}else if(scope==='exercise-library'){exerciseLibrarySort=event.target.value;exerciseLibrary();}return;}if(event.target.name==='date'&&event.target.closest('form[data-form="food"]')&&!event.target.form.elements.entryId.value){const time=event.target.form.elements.foodTime;if(time)time.value=event.target.value===currentTrackingDate()?String(currentFoodSlot()):'';return;}if(event.target.name==='file'){pendingImport=null;importReadToken++;const preview=document.querySelector('#preview')||document.querySelector('#offline-workspace-preview');if(preview)preview.textContent='';return;}if(event.target.name==='appearance'){window.everydayTheme?.set(event.target.value);return;}if(event.target.name==='date' && !event.target.closest('.modal')) {if(event.target.value) {chosenDate=event.target.value;render();}}});
document.addEventListener('click',async event=>{
  const el=event.target.closest('[data-action]'); if(!el)return;const action=el.dataset.action;if((!authChecked&&!offlineWorkspace&&action!=='offline-start')||importSaving)return;
  if(action==='sign-in'){if(offlineWorkspace)return alert('Exit the offline JSON workspace before changing cloud sign-in.');if(!cloudApi)return;try{await cloudApi.signIn();}catch(error){cloudMessage=describeCloudError(error);render();}return;}
  if(action==='sign-out'){if(offlineWorkspace)return alert('Exit the offline JSON workspace before changing cloud sign-in.');if(cloudBusy||cloudPending)return alert('Finish saving, or export your changes and load cloud data, before signing out.');const uid=account?.uid;try{await cloudApi.signOut();if(uid)clearCloudLocal(uid);}catch(error){cloudMessage=describeCloudError(error);render();}return;}
  if(action==='account'){page='settings';render();return;}
  if(action==='offline-start'){if(!offlineWorkspace&&account&&(cloudBusy||cloudPending))return alert('Finish or resolve the current cloud save before opening a separate workspace.');void refreshStorageProtection(true);offlineWorkspaceModal(false);return;}
  if(action==='offline-replace'){offlineWorkspaceModal(true);return;}
  if(action==='offline-export'){if(!offlineWorkspace)return;downloadJsonBackup(offlineOutputName(),true);return;}
  if(action==='offline-exit'){await exitOfflineWorkspace();return;}
  if(action==='cloud-load'){if(offlineWorkspace)return;if(cloudBusy)return;if(cloudPending){if(!confirm('Discard these unsaved device changes and load the latest cloud version? Export first if you want to keep them.'))return;if(account?.uid)clearCloudRecovery(account.uid);cloudRecovery=null;cloudRecoveryConflict=null;cloudPending=false;}await loadAccount();return;}
  if(action==='cloud-retry'){if(offlineWorkspace)return;if(!session?.ready){await loadAccount();if(session?.ready&&cloudPending&&!cloudRecoveryConflict)await persist();return;}await persist();return;}
  if(action==='cloud-recovery-export'){const recovery=cloudRecoveryConflict||cloudRecovery;if(!recovery)return;downloadJsonBackup('everyday-device-recovery-'+localDate()+'.json',false,recovery.data);return;}
  if(action==='cloud-recovery-discard'){if(!account?.uid||!cloudRecoveryConflict)return;if(!confirm('Discard the saved device recovery copy and keep the cloud version?'))return;clearCloudRecovery(account.uid);cloudRecovery=null;cloudRecoveryConflict=null;cloudPending=false;cloudMessage=session?.ready?'Loaded from your account':'Using the last confirmed device copy';render();return;}
  if(action==='storage-persist'){await refreshStorageProtection(true);return;}
  if(action==='migrate-device'){
    if(offlineWorkspace||!session?.ready||cloudBusy||cloudPending)return;
    if(!confirm(`Copy this device’s original logs into ${account.email}? Existing cloud entries with the same ID and same-day cloud weigh-ins will be kept.`))return;
    data=mergeDeviceData(data,deviceData);
    if(await persist()){try{localStorage.setItem('everyday-migrated:'+account.uid,'yes');}catch{}render();}return;
  }
  if(!offlineWorkspace&&account&&(cloudRecoveryConflict||(!session?.ready&&!hasLocalCloudFallback()))&&!['home','food','gym','progress','history','settings','account','export','close','edit-workout','workout-move','workout-remove','workout-add-picker','workout-add-exercise','food-library','exercise-library','exercise-progress','exercise-progress-all','data-health-details','food-suggest','food-suggest-anchor','food-suggest-more','food-suggest-skip','food-suggest-avoid','food-suggest-exclude','food-suggest-restore','food-suggest-unprefer'].includes(action))return;
  if(['home','food','gym','progress','history','settings'].includes(action)){page=action;render();return;}
  if(action==='close'){close();return;}
  if(action.startsWith('health-')){await healthAction(action);return;}
  if(action==='today'){chosenDate=currentTrackingDate();render();return;}
  if(action==='go-date'){chosenDate=el.dataset.date;page='food';render();return;}
  if(action==='exercise-progress'){exerciseProgressModal(el.dataset.name,el.dataset.equipment);return;}
  if(action==='exercise-progress-all'){exerciseProgressAll();return;}
  if(action==='data-health-details'){dataHealthDetails();return;}
  if(action==='workout'){workout=el.dataset.workout;render();return;}

  if(action==='buddy-exit'){buddyReadEditor();buddyReadNotes();await persist();buddyClose();render();return;}
  if(action==='buddy-end'){if(!data.activeWorkout)return;buddyEndOptions();return;}
  if(action==='buddy-save-end'){const s=data.activeWorkout;if(!s)return;s.exercises.forEach(e=>buddyUpsertLift(s,e));s.endedAt=isoNow();s.savedEarly=true;data.workoutHistory.push(structuredClone(s));data.activeWorkout=null;close(true);buddyClose();await persist();render();return;}
  if(action==='buddy-delete-prompt'){if(!data.activeWorkout)return;buddyDeletePrompt();return;}
  if(action==='buddy-delete-confirm'){const s=data.activeWorkout;if(!s)return;data.lifts=data.lifts.filter(l=>l.buddySessionId!==s.id);data.activeWorkout=null;close(true);buddyClose();await persist();render();return;}
  if(action==='exercise-library'){exerciseLibrary();return;}
  if(action==='new-exercise-def'){exerciseDefinitionForm();return;}
  if(action==='edit-exercise-def'){exerciseDefinitionForm(data.exerciseDefinitions?.find(x=>x.id===el.dataset.id));return;}
  if(action==='edit-workout'){workoutTemplateForm(workout);return;}
  if(action==='workout-move'){workoutEditorCapture();const i=Number(el.dataset.index),d=Number(el.dataset.direction),j=i+d;if(!workoutEditorState||!Number.isInteger(i)||!Number.isInteger(j)||j<0||j>=workoutEditorState.exercises.length)return;[workoutEditorState.exercises[i],workoutEditorState.exercises[j]]=[workoutEditorState.exercises[j],workoutEditorState.exercises[i]];workoutTemplateForm(null,true);return;}
  if(action==='workout-remove'){workoutEditorCapture();const i=Number(el.dataset.index);if(!workoutEditorState||!Number.isInteger(i)||i<0||i>=workoutEditorState.exercises.length)return;workoutEditorState.exercises.splice(i,1);workoutTemplateForm(null,true);return;}
  if(action==='workout-add-picker'){workoutExercisePicker();return;}
  if(action==='workout-add-exercise'){const def=data.exerciseDefinitions?.find(x=>x.id===el.dataset.id);if(!def||!workoutEditorState||workoutEditorState.exercises.some(x=>x.exerciseId===def.id))return;workoutEditorState.exercises.push({exerciseId:def.id,repMin:def.name==='Calf Extension'?10:6,repMax:def.name==='Calf Extension'?16:12,targetSets:2,restSeconds:90});workoutTemplateForm(null,true);return;}
  if(action==='buddy-launch'){if(data.activeWorkout){buddyOpen();return;}modal('Start Workout Buddy',`<div class="buddy-start-list">${savedWorkouts().map(x=>`<button data-action="buddy-start" data-workout="${esc(x.name)}"><span><strong>${esc(x.name)}</strong><small>${x.exercises.length} exercises · Bike warm-up first</small></span><b>›</b></button>`).join('')}</div>`);return;}
  if(action==='buddy-start'){close(true);void refreshStorageProtection(true);buddyStart(el.dataset.workout);buddyOpen();return;}
  if(action==='buddy-bike-done'){data.activeWorkout.phase='picker';data.activeWorkout.bikeCompletedAt=isoNow();await buddyPersist();return;}
  if(action==='buddy-choose'){const s=data.activeWorkout,e=buddyFind(s,el.dataset.key);if(!e)return;e.status='active';e.selectedAt=isoNow();e.draft=buddyDraft(e,e.sets.length);s.selected=el.dataset.key;s.phase='exercise';await buddyPersist();return;}
  if(action==='buddy-adjust'){const root=el.closest('.buddy-set-editor');if(!root)return;const field=el.dataset.field==='weight'?'buddyWeight':'buddyReps',input=root.querySelector('[name='+field+']');if(!input)return;const delta=Number(el.dataset.delta)||0,current=Number(input.value)||0,next=el.dataset.field==='weight'?Math.max(0,Math.round((current+delta)*10)/10):Math.max(1,Math.round(current+delta));input.value=next;buddyReadEditor();persist();return;}
  if(action==='buddy-effort'){const root=el.closest('.buddy-exercise-view'),input=root?.querySelector('[name=buddyDifficulty]');if(!input)return;input.value=el.dataset.value;root.querySelectorAll('.buddy-effort').forEach(btn=>{const selected=btn===el;btn.classList.toggle('selected',selected);btn.setAttribute('aria-pressed',selected?'true':'false');});buddyReadEditor();persist();return;}
  if(action==='buddy-notes-toggle'){buddyReadNotes();const s=data.activeWorkout,e=s&&s.selected?buddyFind(s,s.selected):null;if(!e)return;const opening=!e.notesOpen;e.notesOpen=opening;await buddyPersist();if(opening)requestAnimationFrame(()=>document.querySelector('[name=buddyNotes]')?.focus({preventScroll:true}));return;}
  if(action==='buddy-undo'){buddyReadNotes();const s=data.activeWorkout;if(!s?.undo)return;buddyUndo(s);await buddyPersist();return;}
  if(action==='buddy-picker'){buddyReadEditor();buddyReadNotes();const s=data.activeWorkout;if(s){s.phase='picker';s.selected=null;}await buddyPersist();return;}
  if(action==='buddy-back-picker'){const s=data.activeWorkout;if(s){s.phase='picker';delete s.completedAt;}await buddyPersist();return;}
  if(action==='buddy-a'){buddyReadEditor();buddyReadNotes();const s=data.activeWorkout,e=buddyFind(s,s.selected);if(!e)return;const i=e.sets.length,d=e.draft||buddyDraft(e,i);buddyCaptureUndo(s,e.activeSetStartedAt?`finish set ${i+1}`:`start set ${i+1}`);if(!e.activeSetStartedAt){e.activeSetStartedAt=isoNow();e.restStartedAt=null;e.status='active';await buddyPersist();return;}const finishedAt=isoNow();e.sets.push({weight:d.weight,reps:d.reps,...(d.difficulty?{difficulty:d.difficulty}:{}),startedAt:e.activeSetStartedAt,finishedAt,durationSeconds:buddySeconds(e.activeSetStartedAt,finishedAt)});delete e.activeSetStartedAt;delete e.draft;if(e.sets.length>=buddyTargetSets(e)){buddyCompleteExercise(s,e);await buddyPersist();return;}e.restStartedAt=finishedAt;e.restSeconds=Number.isInteger(e.restSeconds)?e.restSeconds:90;e.draft=buddyDraft(e,e.sets.length);await buddyPersist();return;}
  if(action==='buddy-confirm-finish'){const s=data.activeWorkout;if(!s)return;s.completedAt=s.completedAt||isoNow();data.workoutHistory.push(structuredClone(s));data.activeWorkout=null;await persist();buddyClose();render();return;}

  if(action==='food-progress-period'){foodProgressPeriod=el.dataset.period||'week';foodProgressOffset=0;render();return;}
  if(action==='food-progress-nav'){foodProgressOffset=Math.min(0,foodProgressOffset+Number(el.dataset.delta||0));render();return;}
  if(action==='food-progress-current'){foodProgressOffset=0;render();return;}
  if(action==='weight-all'){weightHistoryAll();return;}
  if(action==='weight'){weightForm();return;}
  if(action==='body-fat'){bodyFatForm();return;}
  if(action==='day-note'){dayNoteForm(el.dataset.date||chosenDate);return;}
  if(action==='meal-memory'){mealMemoryForm(null,el.dataset.date||chosenDate);return;}
  if(action==='edit-meal-memory'){mealMemoryForm((data.notes||[]).find(n=>n.id===el.dataset.id));return;}
  if(action==='later'){markWeightPromptSeen(currentTrackingDate());close(true);return;}
  if(action==='edit-weight'){weightForm(data.weights.find(x=>x.id===el.dataset.id));return;}
  if(action==='edit-body-fat'){bodyFatForm((data.bodyFat||[]).find(x=>x.id===el.dataset.id));return;}
  if(action==='food-log'){foodLog();return;}
  if(action==='food-library'){foodLibrary();return;}
  if(action==='food-suggest'){foodSuggestions();return;}
  if(action==='food-suggest-anchor'){if(!foodSuggestionState)return;foodSuggestions({...foodSuggestionState,anchorId:el.dataset.id||''});return;}
  if(action==='food-suggest-more'){const s=foodSuggestionState?.suggestions?.[Number(el.dataset.index)];if(!s)return;foodSuggestions({...foodSuggestionState,preferIds:[...(foodSuggestionState.preferIds||[]),...s.items.map(x=>x.food.id)]});return;}
  if(action==='food-suggest-skip'){const s=foodSuggestionState?.suggestions?.[Number(el.dataset.index)];if(!s)return;foodSuggestions({...foodSuggestionState,hiddenShapes:[...(foodSuggestionState.hiddenShapes||[]),suggestionShape(s)]});return;}
  if(action==='food-suggest-avoid'){foodSuggestionAvoidPicker(Number(el.dataset.index));return;}
  if(action==='food-suggest-exclude'){if(!foodSuggestionState)return;foodSuggestions({...foodSuggestionState,excludedIds:[...(foodSuggestionState.excludedIds||[]),el.dataset.id]});return;}
  if(action==='food-suggest-restore'){if(!foodSuggestionState)return;foodSuggestions({...foodSuggestionState,excludedIds:(foodSuggestionState.excludedIds||[]).filter(id=>id!==el.dataset.id)});return;}
  if(action==='food-suggest-unprefer'){if(!foodSuggestionState)return;foodSuggestions({...foodSuggestionState,preferIds:(foodSuggestionState.preferIds||[]).filter(id=>id!==el.dataset.id)});return;}
  if(action==='apply-food-suggestion'){const suggestion=foodSuggestionState?.suggestions?.[Number(el.dataset.index)];if(!suggestion)return;for(const item of suggestion.items){const record={id:id(),date:chosenDate,name:item.food.name,calories:item.food.calories,protein:item.food.protein,quantity:item.q};if(foodSuggestionState.timeSlot!=null)record.t=foodSuggestionState.timeSlot;data.foodEntries.push(record);item.food.lastUsed=new Date().toISOString();}foodSuggestionState=null;close(true);await persist();render();return;}
  if(action==='new-food-def'){foodDefinitionForm(null,'library');return;}
  if(action==='edit-food-def'){foodDefinitionForm(data.foods.find(x=>x.id===el.dataset.id),'library');return;}
  if(action==='delete-food-def'){const origin=el.dataset.origin||'library';data.foods=data.foods.filter(x=>x.id!==el.dataset.id);close(true);await persist();if(origin==='library')foodLibrary();else render();return;}
  if(action==='new-food'){foodForm();return;}
  if(action==='choose-food-match'){const form=el.closest('form[data-form="food"]'),food=data.foods.find(x=>x.id===el.dataset.id);if(!form||!food)return;form.elements.cardId.value=food.id;form.elements.name.value=food.name;form.elements.calories.value=food.calories;form.elements.protein.value=food.protein;form.querySelector('.food-matches').innerHTML='<div class="food-match-selected"><span><strong>'+esc(food.name)+'</strong><small>Using saved food · '+fmt(food.calories)+' cal · '+fmt(food.protein)+'g protein</small></span><button type="button" class="text-btn" data-action="clear-food-match">Change</button></div>';return;}
  if(action==='clear-food-match'){const form=el.closest('form[data-form="food"]');form.elements.cardId.value='';renderFoodMatches(form);form.elements.name.focus();return;}
  if(action==='edit-card'){foodDefinitionForm(data.foods.find(x=>x.id===el.dataset.id),'food');return;}
  if(action==='toggle-favorite'){const f=data.foods.find(x=>x.id===el.dataset.id);if(!f)return;f.pinned=!f.pinned;await persist();render();return;}
  if(action==='undo-food-add'){clearTimeout(foodUndoTimer);data.foodEntries=data.foodEntries.filter(x=>x.id!==el.dataset.id);document.querySelector('#overlay').innerHTML='';await persist();return;}
  if(action==='edit-entry'){foodForm(data.foodEntries.find(x=>x.id===el.dataset.id));return;}
  if(action==='add-saved'){const f=data.foods.find(x=>x.id===el.dataset.id);if(f)foodForm(null,f);return;}
  if(action==='custom-lift'){liftForm();return;}
  if(action==='choose-exercise-match'){const form=el.closest('form[data-form="lift"]'),name=el.dataset.name,equipment=el.dataset.equipment;if(!form||!name)return;form.elements.exercise.value=name;form.elements.equipment.value=equipment;form.querySelector('.exercise-matches').innerHTML='<div class="food-match-selected"><span><strong>'+esc(name)+'</strong><small>'+equipmentLabel(equipment)+' · Using canonical exercise</small></span><button type="button" class="text-btn" data-action="clear-exercise-match">Change</button></div>';return;}
  if(action==='clear-exercise-match'){const form=el.closest('form[data-form="lift"]');renderExerciseMatches(form);form.elements.exercise.focus();return;}
  if(action==='new-lift'){liftForm(null,el.dataset.name,el.dataset.equipment);return;}
  if(action==='edit-lift'){liftForm(data.lifts.find(x=>x.id===el.dataset.id));return;}
  if(action==='add-set'){const wrap=document.querySelector('#sets'),last=wrap.lastElementChild;wrap.insertAdjacentHTML('beforeend',setRow(wrap.children.length,{weight:last?.querySelector('[name=weight]')?.value||0,reps:last?.querySelector('[name=reps]')?.value||8,difficulty:last?.querySelector('[name=difficulty]')?.value||''}));const row=wrap.lastElementChild;requestAnimationFrame(()=>row.querySelector('[name=weight]')?.focus());return;}
  if(action==='remove-set'){const wrap=document.querySelector('#sets');if(wrap.children.length>1){el.closest('.set-row').remove();[...wrap.children].forEach((r,i)=>r.firstElementChild.textContent=i+1);}return;}
  if(action.startsWith('delete-')) {if(!confirm('Delete this item?'))return;const key={'delete-entry':'foodEntries','delete-card':'foods','delete-lift':'lifts','delete-weight':'weights','delete-body-fat':'bodyFat','delete-note':'notes'}[action];data[key]=data[key].filter(x=>x.id!==el.dataset.id);close(true);persist();return;}
  if(action==='import-data'){importHub();return;}
  if(action==='import-csv'){importModal('csv','file');return;}
  if(action==='paste-csv'){importModal('csv','paste');return;}
  if(action==='restore'){importModal('json','file');return;}
  if(action==='paste-json'){importModal('json','paste');return;}
  if(action==='export'){downloadJsonBackup(offlineWorkspace?offlineOutputName():`everyday-backup-${localDate()}.json`,Boolean(offlineWorkspace));return;}
  if(action==='import-more'){expandImportGroup(el);return;}
  if(action==='choose-import'){importModal(el.dataset.kind,el.dataset.source||'file');return;}
  if(action==='commit-import'){await commitImport();return;}
});
app.addEventListener('submit',async event=>{
  const form=event.target;if(!form.dataset.form)return;event.preventDefault();if(importSaving||(!offlineWorkspace&&account&&(cloudBusy||cloudPending||!session?.ready)))return;const v=Object.fromEntries(new FormData(form));
  if(form.dataset.form==='offline-workspace'){
    const file=form.querySelector('[name=file]').files[0],replace=v.replace==='yes',preview=document.querySelector('#offline-workspace-preview');if(!file)return;
    if(replace&&offlineWorkspace?.dirty&&!confirm('Replace this workspace and discard its changes since the last export?'))return;
    try{
      if(file.size>5_000_000)throw Error('The file must be under 5 MB.');
      const raw=JSON.parse(await file.text()),candidate=normalizeData(raw);encodeData(candidate);
      const next={filename:(file.name||'everyday-backup.json').slice(0,180),dirty:false,exportedAt:'',data:structuredClone(candidate)};
      localStorage.setItem(OFFLINE_WORKSPACE_KEY,JSON.stringify({version:1,filename:next.filename,dirty:false,exportedAt:'',data:encodeData(candidate)}));
      offlineWorkspace=next;data=structuredClone(candidate);chosenDate=currentTrackingDate();page='home';cloudMessage='Offline JSON workspace · cloud saving paused';close(true);render();promptWeight();
    }catch(error){if(preview){preview.textContent=error instanceof SyntaxError?'This file is not valid JSON.':error.message;preview.setAttribute('role','alert');}}
    return;
  }
  if(form.dataset.form==='exercise-definition'){const name=v.name.trim(),equipment=v.equipment||'other',setup=(v.setup||'').trim(),existing=data.exerciseDefinitions?.find(x=>x.id===v.exerciseId);if(!name||name.length>100||!['machine','cable','dumbbell','bench','calisthenics','other'].includes(equipment)||setup.length>200)return alert('Check the exercise definition.');const duplicate=data.exerciseDefinitions?.find(x=>x.id!==v.exerciseId&&x.name.toLowerCase()===name.toLowerCase()&&x.equipment===equipment);if(duplicate)return alert('That exercise already exists with this equipment.');if(existing){const oldName=existing.name,oldEquipment=existing.equipment;Object.assign(existing,{name,equipment});if(setup)existing.setup=setup;else delete existing.setup;data.lifts.forEach(l=>{if(l.exercise.toLowerCase()===oldName.toLowerCase()&&(l.equipment||'other')===oldEquipment){l.exercise=name;l.equipment=equipment;}});}else data.exerciseDefinitions.push({id:id(),name,equipment,...(setup?{setup}:{})});close(true);await persist();render();return;}
  if(form.dataset.form==='workout-template'){workoutEditorCapture();if(!workoutEditorState)return;const seen=new Set();for(const item of workoutEditorState.exercises){const def=data.exerciseDefinitions?.find(x=>x.id===item.exerciseId);if(!def||seen.has(item.exerciseId)||!Number.isInteger(item.repMin)||!Number.isInteger(item.repMax)||item.repMin<1||item.repMax<item.repMin||item.repMax>100||!Number.isInteger(item.targetSets)||item.targetSets<1||item.targetSets>10||!Number.isInteger(item.restSeconds)||item.restSeconds<0||item.restSeconds>1800)return alert('Check the workout exercises, rep ranges, sets, and rest times.');seen.add(item.exerciseId);}const w=data.workoutTemplates?.find(x=>x.id===workoutEditorState.id);if(!w)return;w.exercises=structuredClone(workoutEditorState.exercises);workoutEditorState=null;close(true);await persist();render();return;}
  if(form.dataset.form==='week-settings'){const dayResetMinutes=Number(v.dayResetMinutes);if(!Number.isInteger(dayResetMinutes)||dayResetMinutes<0||dayResetMinutes>1410||dayResetMinutes%30!==0)return;const oldToday=currentTrackingDate();data.settings.weekStart=FIXED_WEEK_START;data.settings.dayResetMinutes=dayResetMinutes;if(chosenDate===oldToday)chosenDate=currentTrackingDate();await persist();return;}
  if(form.dataset.form==='settings') {const calories=Number(v.calories),protein=Number(v.protein),heightInches=Number(v.heightInches);if([calories,protein,heightInches].some(x=>!Number.isFinite(x)||x<=0))return alert('Enter positive goals and height.');if(v.unit!==data.settings.unit){const factor=v.unit==='kg'?1/2.2046226218:2.2046226218;data.weights.forEach(w=>w.value=round(w.value*factor));data.lifts.forEach(l=>l.sets.forEach(s=>s.weight=round(s.weight*factor)));}data.settings={...data.settings,calories,protein,heightInches,unit:v.unit};persist();return;}
  if(form.dataset.form==='food-definition'){const name=v.name.trim(),calories=Number(v.calories),protein=Number(v.protein),kind=v.kind==='drink'?'drink':'food',tags=v.ingredient==='yes'?['ingredient']:[],pinned=v.pinned==='yes',accuracy=['label','estimate'].includes(v.accuracy)?v.accuracy:'',origin=v.origin||'food',existing=data.foods.find(x=>x.id===v.foodId);if(!name||name.length>100||!Number.isFinite(calories)||calories<0||!Number.isFinite(protein)||protein<0)return alert('Check the food definition.');const duplicate=data.foods.find(x=>x.id!==v.foodId&&x.name.toLowerCase()===name.toLowerCase()&&x.calories===calories&&x.protein===protein);if(duplicate)return alert('That saved food already exists.');if(existing)Object.assign(existing,{name,calories,protein,kind,tags,pinned,accuracy,lastUsed:existing.lastUsed||new Date().toISOString()});else data.foods.push({id:id(),name,calories,protein,kind,tags,pinned,accuracy,lastUsed:new Date().toISOString()});close(true);await persist();if(origin==='library')foodLibrary();else render();return;}
  if(form.dataset.form==='food') {
    const name=v.name.trim(),calories=Number(v.calories),protein=Number(v.protein),quantity=Number(v.quantity||1),time=v.foodTime===''||v.foodTime==null?null:Number(v.foodTime);
    if(!name||!Number.isFinite(calories)||calories<0||!Number.isFinite(protein)||protein<0||!Number.isFinite(quantity)||quantity<=0||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(v.date)||(time!=null&&(!Number.isInteger(time)||time<0||time>47)))return alert('Check the food values, date, and time.');
    const record={name,calories,protein,quantity,date:v.date};if(time!=null)record.t=time;
    const item=data.foodEntries.find(x=>x.id===v.entryId),card=data.foods.find(x=>x.id===v.cardId);
    if(item){Object.assign(item,record);if(time==null)delete item.t;chosenDate=v.date;close(true);await persist();return;}
    if(!card){data.foods.push({id:id(),name,calories,protein,kind:'food',tags:[],pinned:false,accuracy:'',lastUsed:new Date().toISOString()});}
    else card.lastUsed=new Date().toISOString();
    const created={id:id(),...record};data.foodEntries.push(created);chosenDate=v.date;close(true);await persist();if(card)showFoodUndo(created.id,record.name);return;
  }
  if(form.dataset.form==='lift') {const rows=[...form.querySelectorAll('.set-row')],sets=rows.map(r=>{const difficulty=Number(r.querySelector('[name=difficulty]').value);const set={weight:Number(r.querySelector('[name=weight]').value),reps:Number(r.querySelector('[name=reps]').value)};if(Number.isInteger(difficulty)&&difficulty>=1&&difficulty<=7)set.difficulty=difficulty;return set;});if(!v.exercise.trim()||!v.date||!sets.length||sets.some(s=>!Number.isFinite(s.weight)||s.weight<0||!Number.isInteger(s.reps)||s.reps<1))return alert('Check the exercise, date, and sets.');const item=data.lifts.find(x=>x.id===v.liftId);const record={exercise:v.exercise.trim(),equipment:v.equipment||'other',date:v.date,sets,notes:v.notes.trim()};if(item){Object.assign(item,record);delete item.difficulty;}else data.lifts.push({id:id(),...record});chosenDate=v.date;close(true);persist();return;}
  if(form.dataset.form==='weight') {const value=Number(v.value);if(!Number.isFinite(value)||value<=0||!v.date)return alert('Enter a positive weight and date.');const item=data.weights.find(x=>x.id===v.weightId)||data.weights.find(x=>x.date===v.date);const next={date:v.date,value};if(item){Object.assign(item,next);delete item.source;delete item.recordedAt;}else data.weights.push({id:id(),...next});if(v.date===currentTrackingDate())markWeightPromptSeen(currentTrackingDate());close(true);persist();return;}
  if(form.dataset.form==='body-fat'){const value=Number(v.value);if(!Number.isFinite(value)||value<=0||value>100||!v.date)return alert('Enter a body-fat percentage from 0.1 to 100 and a date.');const item=(data.bodyFat||[]).find(x=>x.id===v.bodyFatId);const next={date:v.date,value};if(item){Object.assign(item,next);delete item.source;delete item.recordedAt;}else data.bodyFat.push({id:id(),...next});close(true);persist();return;}
  if(form.dataset.form==='day-note'){const text=(v.text||'').trim();if(!v.date||!text||text.length>1200)return alert('Enter a date and a note up to 1,200 characters.');let item=(data.notes||[]).find(n=>n.id===v.noteId)||(data.notes||[]).find(n=>n.type==='day'&&n.date===v.date);const next={date:v.date,type:'day',text};if(item){Object.assign(item,next);delete item.t;}else data.notes.push({id:id(),...next});chosenDate=v.date;close(true);persist();return;}
  if(form.dataset.form==='meal-memory'){const text=(v.text||'').trim(),time=v.noteTime===''||v.noteTime==null?null:Number(v.noteTime);if(!v.date||!text||text.length>1200||(time!=null&&(!Number.isInteger(time)||time<0||time>47)))return alert('Check the meal memory, date, and time.');const item=(data.notes||[]).find(n=>n.id===v.noteId),next={date:v.date,type:'meal',text};if(time!=null)next.t=time;if(item){Object.assign(item,next);if(time==null)delete item.t;}else data.notes.push({id:id(),...next});chosenDate=v.date;close(true);persist();return;}
  if(form.dataset.form==='import') {
    const pasted=v.source==='paste',file=pasted?null:form.querySelector('[name=file]')?.files?.[0];if(!pasted&&!file)return;
    pendingImport=null;const token=++importReadToken,preview=form.parentElement.querySelector('#preview');preview.textContent=pasted?'Reading pasted text…':'Reading file…';
    try{
      if(file?.size>5_000_000)throw Error('The file must be under 5 MB.');
      const raw=pasted?String(v.text||''):await file.text();if(new TextEncoder().encode(raw).length>5_000_000)throw Error('The import must be under 5 MB.');if(token!==importReadToken||!form.isConnected)return;
      const plan=prepareImport(v.kind,raw,data);plan.filename=pasted?'Pasted '+v.kind.toUpperCase():(file.name||'Selected file');plan.source=pasted?'paste':'file';
      if(!offlineWorkspace&&account&&plan.candidate){try{encodeState(plan.candidate);}catch(e){plan.errors.push(e.message);plan.candidate=null;}}
      pendingImport=plan;showImportReview(plan);
    }catch(error){if(token===importReadToken&&form.isConnected){pendingImport=null;preview.textContent=error.message;preview.setAttribute('role','alert');}}
    return;
  }
});

render();
startCloud();
void refreshStorageProtection(true);
if('serviceWorker' in navigator && location.protocol==='https:'){navigator.serviceWorker.register('./sw.js?v=52',{updateViaCache:'none'}).then(reg=>reg.update()).catch(()=>{});navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!sessionStorage.getItem('everyday-sw-refresh')){sessionStorage.setItem('everyday-sw-refresh','1');location.reload();}});}

function accountBanner(){
  if(offlineWorkspace)return '<div class="account-banner offline-workspace-banner" role="status"><span>Offline JSON workspace<small>'+esc(offlineWorkspace.filename)+' · '+(offlineWorkspace.dirty?'changes since export':'saved locally')+'</small></span>'+button('Workspace','account','text-btn')+'</div>';
  return `<div class="account-banner" role="status"><span>${esc(!authChecked?'—':account?account.email:'Device mode')}<small>${esc(isLoading()?'—':cloudMessage)}</small></span>${account?button('Account','account','text-btn'):cloudReady?button('Sign in with Google','sign-in','outline small'):button('Account','account','text-btn','disabled')}</div>`;
}
function cloudSaveWarning(){
  if(offlineWorkspace||!account)return '';
  if(cloudRecoveryConflict)return `<div class="save-warning" role="alert"><strong>A device recovery copy needs review.</strong><p>The cloud changed after this device recovery was created, so Everyday did not overwrite either copy. Export the recovery JSON before discarding it if you may need those changes.</p>${button('Export device recovery','cloud-recovery-export','outline small')}${button('Keep cloud · discard recovery','cloud-recovery-discard','outline small')}</div>`;
  if(cloudPending&&!cloudBusy)return `<div class="save-warning" role="alert"><strong>Changes are safe on this device but not confirmed online.</strong><p>${esc(cloudMessage)}</p>${button(session?.ready?'Retry cloud save':'Reconnect & sync','cloud-retry','outline small')}${button('Export unsaved backup','export','outline small')}${button('Load latest cloud data','cloud-load','outline small')}</div>`;
  return '';
}
function accountPanel(){
  if(offlineWorkspace){
    const cloudLine=account?'Signed in as '+account.email+'. Cloud loading and saving resume after you exit this workspace.':'Cloud account access is paused while this workspace is active.';
    return '<section class="panel"><h2>Cloud account paused</h2><p class="body-copy">'+esc(cloudLine)+'</p><p class="hint">Workspace edits cannot overwrite Firebase by accident. Export the workspace JSON, exit offline mode, then use the normal restore preview to apply it deliberately.</p></section>';
  }
  let migrated=false;try{migrated=localStorage.getItem('everyday-migrated:'+account?.uid)==='yes';}catch{}
  return `<section class="panel"><h2>${account?'Your account':'Save across devices'}</h2><p class="body-copy">${account?esc(account.email):'Sign in with Google to keep food, lifting and weight logs in your own cloud account. Each person gets separate records.'}</p>${account?`${button('Refresh from cloud','cloud-load','outline')}${button('Sign out','sign-out','outline')}${hasRecords(deviceData)&&!migrated?`<p class="body-copy">Original device logs found. You can copy them into this account. This keeps the device copy as a backup.</p>${button('Copy device logs to this account','migrate-device','primary')}`:''}`:cloudReady?button('Sign in with Google','sign-in','primary'):`<p>${esc(cloudMessage)}</p>`}<p class="hint">Google manages sign-in. Firebase stores account logs. While you stay signed in, Everyday also keeps a last-confirmed device copy plus any unsaved recovery copy so an offline refresh does not depend on RAM. Signing out clears those account-specific device copies.</p></section>`;
}
async function loadAccount(){
  if(offlineWorkspace)return;const active=session;if(!active)return;cloudBusy=true;cloudMessage='Loading your cloud logs…';render();
  try{
    const loaded=await active.load();if(session!==active)return;
    const recovery=readCloudRecovery(active.uid);cloudRecovery=recovery;cloudRecoveryConflict=null;
    try{cloudConfirmed=writeCloudConfirmed(active.uid,active.revision,loaded);}catch{cloudConfirmed={uid:active.uid,revision:active.revision,updatedAt:isoNow(),data:structuredClone(loaded)};}
    if(recovery&&sameCloudData(recovery.data,loaded)){
      clearCloudRecovery(active.uid);cloudRecovery=null;data=loaded;cloudPending=false;cloudMessage='Loaded from your account';
    }else if(recovery&&recovery.revision===active.revision){
      data=structuredClone(recovery.data);cloudPending=true;cloudMessage='Recovered unsaved changes from this device · ready to sync';
    }else if(recovery){
      data=loaded;cloudRecoveryConflict=recovery;cloudPending=false;cloudMessage='Loaded cloud data · device recovery needs review';
    }else{
      data=loaded;cloudPending=false;cloudMessage='Loaded from your account';
    }
    chosenDate=currentTrackingDate();
  }
  catch(error){
    if(session===active){
      const recovery=readCloudRecovery(active.uid),confirmed=readCloudConfirmed(active.uid),fallback=recovery||confirmed;
      cloudRecovery=recovery;cloudConfirmed=confirmed;cloudRecoveryConflict=null;
      if(fallback){data=structuredClone(fallback.data);chosenDate=currentTrackingDate();cloudPending=Boolean(recovery);cloudMessage=recovery?'Cloud unavailable · recovered unsaved device changes':'Cloud unavailable · using last confirmed device copy';}
      else cloudMessage=describeCloudError(error);
    }
  }
  finally{if(session===active){cloudBusy=false;render();if(active.ready){void syncHealth();promptWeight();}else if(hasLocalCloudFallback())promptWeight();}}
}
function promptWeight(){const day=currentTrackingDate();if(shouldPrompt(data)&&!weightPromptSeen(day))setTimeout(()=>{const currentDay=currentTrackingDate();if(!shouldPrompt(data)||weightPromptSeen(currentDay)||cloudBusy||cloudPending||!(offlineWorkspace||!account||session?.ready)||document.querySelector('.modal'))return;markWeightPromptSeen(currentDay);weightForm(null,true);},300);}
async function startCloud(){
  try{
    const cloud=await import('./cloud.js?v=51');describeCloudError=cloud.cloudError;
    cloudApi=await cloud.connectCloud(async(user,nextSession)=>{
      const previousUid=account?.uid;session?.close();session=nextSession;account=user;authChecked=true;cloudPending=false;cloudBusy=false;pendingImport=null;
      if(previousUid&&previousUid!==user?.uid)clearCloudLocal(previousUid);
      cloudConfirmed=null;cloudRecovery=null;cloudRecoveryConflict=null;
      healthState={enabled:false,status:''};healthCheckedAt=0;
      if(offlineWorkspace){data=structuredClone(offlineWorkspace.data);cloudMessage='Offline JSON workspace · cloud saving paused';render();promptWeight();return;}
      data=user?emptyData():structuredClone(deviceData);
      if(user)await loadAccount();else{cloudMessage='Only on this device · sign in for cloud saving';render();promptWeight();}
    });
    cloudReady=true;render();if(!offlineWorkspace)void syncHealth();
  }catch(error){authChecked=true;cloudMessage=offlineWorkspace?'Offline JSON workspace · cloud unavailable, local editing still works':'Cloud login unavailable. Device logs still work. Reload to retry.';render();promptWeight();}
}
window.addEventListener('beforeunload',event=>{captureCriticalLocalState();if(!offlineWorkspace&&(cloudPending||cloudBusy)){event.preventDefault();event.returnValue='';}});
window.addEventListener('pagehide',()=>captureCriticalLocalState());
window.addEventListener('online',()=>{if(offlineWorkspace||!account)return;if(session?.ready&&cloudPending&&!cloudRecoveryConflict)void persist();else if(!session?.ready)void loadAccount();});

function appearancePanel(){
  const selected=window.everydayTheme?.preference || 'system';
  return `<section class="panel"><h2>Appearance</h2><label class="field spaced"><span>Theme</span><select name="appearance">${[['system','System — follow device'],['dark','Dark'],['light','Light']].map(([value,label])=>`<option value="${value}" ${selected===value?'selected':''}>${label}</option>`).join('')}</select></label><p class="hint">Saved on this device. System follows your phone’s light or dark appearance.</p></section>`;
}

function dateHeader(label){
  return `<div class="date-row tracking-date">${input(label,'date',chosenDate,'date','required')}${button('Today','today','outline small','aria-label="Go to today"')}</div>`;
}

function weekSettingsPanel(){
  return `<section class="panel spaced"><h2>Your calendar</h2><form data-form="week-settings" class="form"><p class="body-copy"><strong>Weeks start Friday.</strong></p><label class="field"><span>Day resets at</span><select name="dayResetMinutes">${resetTimeOptions(data.settings.dayResetMinutes??360)}</select></label><button class="primary" type="submit">Save calendar settings</button></form><p class="hint">The reset time defines your tracking day. With a 6:00 AM reset, a 2:30 AM food log still belongs to the previous day.</p></section>`;
}

function importRecord(key,item,unit){
  const r=item.record;
  const title=key==='foods'||key==='foodEntries'?r.name:key==='lifts'?r.exercise:key==='bodyFat'?`${fmt(r.value)}% body fat`:key==='notes'?(r.type==='meal'?'Meal memory':'Day note'):`${fmt(r.value)} ${unit}`;
  const details=key==='foods'?`${fmt(r.calories)} cal · ${fmt(r.protein)}g protein per serving${r.lastUsed?' · Last used '+r.lastUsed:''}`:key==='foodEntries'?`${r.date} · ${foodEntryDetail(r)} · Per serving: ${fmt(r.calories)} cal / ${fmt(r.protein)}g`:key==='lifts'?`${r.date} · ${r.sets.map(set=>`${fmt(set.weight)} ${unit} × ${set.reps}${set.difficulty?` · effort ${set.difficulty}`:''}`).join(' · ')}`:key==='weights'?r.date:key==='bodyFat'?`${r.date} · Body-fat measurement`:key==='notes'?`${r.date}${r.t!=null?' · '+foodTimeLabel(r.t):''} · ${r.text}`:r.date;
  return `<div class="list-row import-record"><div><strong>${esc(title)}</strong><small>${esc(details)}</small>${key==='lifts'&&r.notes?`<p class="import-note">${esc(r.notes)}</p>`:''}<div class="import-badges">${item.badges.map(b=>`<span class="import-badge ${/duplicate|Replaces|Removed|Multiple/.test(b)?'attention':''}">${esc(b)}</span>`).join('')}</div>${item.previous?`<details class="import-previous"><summary>Existing record being replaced</summary>${importRecord(key,{record:item.previous,badges:[]},pendingImport.currentSettings.unit)}</details>`:''}</div></div>`;
}
function importGroup(group,removed=false){
  const rows=removed?group.removedRows:group.rows;if(!rows.length)return'';
  const key=group.key+(removed?'-removed':''),unit=removed?pendingImport.currentSettings.unit:pendingImport.kind==='json'?pendingImport.settings.unit:data.settings.unit;
  const title=removed?'Removed '+group.label:(pendingImport.kind==='json'?'Changed '+group.label:group.label);
  return '<details class="import-group" open><summary>'+esc(title)+'<span>'+rows.length+'</span></summary><div id="import-'+key+'">'+rows.slice(0,50).map(row=>importRecord(group.key,row,unit)).join('')+'</div>'+(rows.length>50?button('Show next '+Math.min(50,rows.length-50)+' (50 of '+rows.length+' shown)','import-more','outline small','data-group="'+group.key+'" data-removed="'+removed+'" data-shown="50"'):'')+'</details>';
}
function expandImportGroup(el){
  if(!pendingImport)return;const g=pendingImport.groups.find(g=>g.key===el.dataset.group);if(!g)return;
  const removed=el.dataset.removed==='true',rows=removed?g.removedRows:g.rows,shown=Number(el.dataset.shown),next=Math.min(shown+50,rows.length);
  const unit=removed?pendingImport.currentSettings.unit:pendingImport.kind==='json'?pendingImport.settings.unit:data.settings.unit;
  document.querySelector('#import-'+g.key+(removed?'-removed':'')).insertAdjacentHTML('beforeend',rows.slice(shown,next).map(r=>importRecord(g.key,r,unit)).join(''));
  if(next===rows.length)el.remove();else{el.dataset.shown=next;el.textContent='Show next '+Math.min(50,rows.length-next)+' ('+next+' of '+rows.length+' shown)';}
}
function showImportReview(plan,saveError=''){
  const json=plan.kind==='json',incomingCount=json?plan.groups.reduce((n,g)=>n+g.total,0):plan.changeCount;
  const labels={calories:'Daily calories',protein:'Daily protein (g)',heightInches:'Height (inches)',unit:'Weight unit',weekStart:'Week starts on',dayResetMinutes:'Day resets at'};
  const settingValue=(key,value)=>key==='weekStart'?weekDays[value]:key==='dayResetMinutes'?clockLabel(value):typeof value==='object'?JSON.stringify(value):String(value);
  const settingsChanges=plan.settingChanges.map(change=>'<div class="list-row import-record"><div><strong>'+esc(labels[change.key]||change.key)+'</strong><small>'+esc(settingValue(change.key,change.from))+' → '+esc(settingValue(change.key,change.to))+'</small><span class="import-badge attention">Replaces setting</span></div></div>').join('');
  const promptChange=plan.promptChanged?'<div class="list-row import-record"><div><strong>Daily weight-prompt date</strong><small>'+esc(plan.currentPromptDate||'Not set')+' → '+esc(plan.promptDate||'Not set')+'</small><span class="import-badge attention">Changes</span></div></div>':'';
  const otherChanges=plan.otherChanges.map(change=>'<div class="list-row import-record"><div><strong>'+esc(change.label)+'</strong><small>'+esc(change.detail||change.from+' → '+change.to)+'</small><span class="import-badge attention">Changes</span></div></div>').join('');
  const changedGroups=plan.groups.map(g=>importGroup(g)).join('');
  const removedGroups=json?plan.groups.map(g=>importGroup(g,true)).join(''):'';
  const changesBody=plan.changeCount?settingsChanges+promptChange+otherChanges+changedGroups+removedGroups:'<p class="empty">No data changes detected in this file.</p>';
  const summary='<div class="import-summary import-summary-compact"><p class="eyebrow">'+(json?'JSON BACKUP':'CSV IMPORT')+'</p><p>'+incomingCount+' '+(json?'incoming tracked records':'proposed changes')+(json?' · '+plan.unchanged+' unchanged items omitted':'')+(plan.duplicates?' · '+plan.duplicates+' possible duplicates':'')+'</p><strong>Nothing has been imported yet.</strong></div>';
  const errors=plan.errors.length?'<div class="import-alert" role="alert"><strong>Cannot import · '+plan.errors.length+' issue'+(plan.errors.length===1?'':'s')+'</strong><p>Fix the file and preview it again. No records will be committed, including the valid changes shown above.</p><ul>'+plan.errors.map(e=>'<li>'+esc(e)+'</li>').join('')+'</ul></div>':'';
  const warnings=plan.warnings.length?'<details class="import-alert"><summary>Review '+plan.warnings.length+' warning'+(plan.warnings.length===1?'':'s')+'</summary><ul>'+plan.warnings.map(w=>'<li>'+esc(w)+'</li>').join('')+'</ul></details>':'';
  const saveAlert=saveError?'<div class="import-alert" role="alert"><strong>Import was not saved</strong><p>'+esc(saveError)+'</p><p>Your current in-memory records are unchanged.</p></div>':'';
  modal('Review import','<p class="import-filename">'+esc(plan.filename)+'</p><div class="import-scroll" tabindex="0" aria-label="Import changes"><section class="import-changes"><div class="import-changes-head"><p class="eyebrow">CHANGES</p><h3>'+plan.changeCount+' proposed change'+(plan.changeCount===1?'':'s')+'</h3></div>'+changesBody+'</section>'+summary+saveAlert+errors+warnings+'</div><div class="import-footer"><p>'+(json?'Confirmation replaces the current data with this backup. Unchanged items are omitted from the preview.':'Review the additions above before confirming.')+'</p><div class="form-actions">'+(plan.candidate?button(json?'Confirm replacement':'Confirm import','commit-import',json?'danger filled':'primary'):button('Choose another file','choose-import','primary','data-kind="'+plan.kind+'" data-source="'+esc(plan.source||'file')+'"'))+button('Cancel','close','outline')+'</div></div>');
  document.querySelector('.modal').classList.add('import-dialog');
}
async function commitImport(){
  const plan=pendingImport;if(!plan?.candidate||importSaving)return;
  if(plan.base!==JSON.stringify(data)){plan.errors.push('Current data changed. Cancel and preview this file again.');plan.candidate=null;showImportReview(plan);return;}
  const active=session,owner=account?.uid,candidate=structuredClone(plan.candidate),workspaceMode=Boolean(offlineWorkspace);
  close(true);importSaving=true;cloudBusy=!workspaceMode&&Boolean(account);render();
  try{
    if(workspaceMode){
      data=candidate;storeOfflineWorkspace(data,true);cloudMessage='Offline JSON workspace · saved on this device';
    }else if(account)await active.save(candidate);else save(candidate);
    if(!workspaceMode&&(session!==active||account?.uid!==owner))return;
    data=candidate;if(!workspaceMode&&!account)deviceData=structuredClone(candidate);else if(!workspaceMode)cloudMessage='Saved to your account';
    importSaving=false;cloudBusy=false;render();
    alert(plan.kind==='json'?(workspaceMode?'Workspace JSON replaced.':'Backup restored.'):`${plan.changeCount} change${plan.changeCount===1?'':'s'} imported.`);
  }catch(error){
    if(!workspaceMode&&(session!==active||account?.uid!==owner))return;
    importSaving=false;cloudBusy=false;render();pendingImport=plan;showImportReview(plan,workspaceMode?error.message:describeCloudError(error));
  }finally{importSaving=false;if(!workspaceMode&&session===active)cloudBusy=false;}
}

function healthPanel(){
  if(offlineWorkspace||!account)return '';
  return `<section class="panel spaced"><p class="eyebrow">APPLE HEALTH</p><h2>Weight & body fat sync</h2><p class="body-copy">Use an iPhone Shortcut to send your latest weight and, when available, body-fat percentage. Everyday checks when you open or return to the app. Your Home Screen icon stays the same.</p><p role="status">${esc(healthState.status||'Not connected. Weight access is granted in Shortcuts on your iPhone.')}</p>${healthState.enabled?`${button('Check Health','health-check','outline')}${button('Shortcut setup','health-setup','outline')}${button('Disconnect','health-disconnect','text-btn')}`:button('Connect Health Shortcut','health-enable','primary')}<p class="hint">Weight and body fat sync independently and may have different dates. Either measurement may be submitted by itself. Existing manual readings of the same type/date are kept. Everyday does not write back to Apple Health.</p></section>`;
}
async function syncHealth(force=false){
  if(offlineWorkspace||!cloudApi?.health||!account||!session?.ready||cloudBusy||cloudPending||importSaving||document.querySelector('.modal'))return;
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
  if(offlineWorkspace||!account||!session?.ready||!cloudApi?.health)return;
  if(action==='health-check'){await syncHealth(true);return;}
  if(action==='health-setup'){showHealthSetup();return;}
  if(action==='health-copy'){
    try{await navigator.clipboard.writeText(cloudApi.health.url(healthState.token));document.querySelector('#health-copy-status').textContent='Copied. Paste it only into your own Shortcut.';}
    catch{document.querySelector('#health-copy-status').textContent='Copy the address from the field below.';document.querySelector('#health-url').select();}return;
  }
  if(action==='health-enable'&&!confirm('Connect Apple Health measurements? Your Shortcut may upload weight and/or body-fat percentage with their own dates to Firebase. Anyone with the private sync address can submit weight to this connection, so keep it private. You can revoke it with Disconnect.'))return;
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
  modal('Set up Health sync',`<p class="body-copy">Keep your existing Everyday Home Screen icon. Use a separate Sync Everyday Health Shortcut to send your latest scale readings.</p><p class="hint">This private address permits weight and body-fat submissions. Do not share it or publish a Shortcut containing it. Disconnect revokes it.</p>${button('Copy private sync address','health-copy','primary')}<p id="health-copy-status" role="status"></p><label class="field"><span>Private sync address</span><textarea id="health-url" readonly rows="3">${esc(cloudApi.health.url(healthState.token))}</textarea></label><p class="body-copy">Follow the <a href="health-shortcut.html" target="_blank" rel="noopener">Shortcut setup instructions</a>. You can send Weight and Body Fat Percentage independently, each with its own Value and Start Date, using this address. No Google password or Firebase administrator key goes into the Shortcut.</p><p class="hint">Only the latest submitted scale reading waits here. Open Everyday after syncing to import it. Repeated or older readings are ignored; historical backfill and Health deletions are not synced.</p>`);
}
document.addEventListener('input',event=>{if(event.target.matches?.('[name=buddyWeight],[name=buddyReps],[name=buddyNotes]')){buddyReadEditor();buddyReadNotes();saveCriticalLocalCopy();}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')captureCriticalLocalState();else{void syncHealth();void refreshStorageProtection(false);}});
window.addEventListener('pageshow',()=>{void syncHealth();void refreshStorageProtection(false);});
window.addEventListener('focus',()=>{void syncHealth();});
