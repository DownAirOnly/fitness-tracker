import {load,save,id,localDate,trackingDate,foodTrackingDate,foodCalendarDate,foodEntriesNewestFirst,stepFoodDateTime,niceDate,bmi,dailyTotals,weeklyWeights,shouldPrompt,parseFoodCSV,parseCSV,normalizeData,encodeData,templateExercises,round,emptyData,weekDays,startOfWeek,endOfWeek,convertNotebookWeightUnit} from './data.js?v=98';

import {muscleGuideMarkup,muscleMiniMarkup,exerciseMuscleProfile,muscleGroupDetailsMarkup,muscleGroupLabel} from './muscle-map.js?v=80';
import {prepareImport,prepareBankImport,prepareRuleReview,importSections} from './import-model.js?v=98';
import {financeEnrichmentCSV,inferBofaStatementLabel,financeReviewFlags} from './bank-import.js?v=96';
import {classificationRuleProposals,normalizeClassificationRules} from './classification-model.js?v=96';
import {financeInsightPeriods,summarizeFinanceInsights} from './finance-insights-model.js?v=97';
import {ACCOUNT_SECTIONS,SECTION_KEYS,exportSection,applySection} from './account-sections.js?v=98.2';
import {normalizeBudgetPlan,budgetForecast,budgetOccurrences,budgetMonthSpending,forecastPurchase} from './budget-model.js?v=98';
import {nextBuddySetDraft,canUndoBuddyTransition} from './buddy-set-model.js?v=92';
import {FINANCE_CATEGORIES,FINANCE_KINDS,parseFinanceAmount,formatFinanceAmount} from './finance-model.js?v=83';
import {createDemoData,DEMO_LAST_DATE} from './demo-mode.js?v=98';
import {hasRecords,hasDeviceMigrationContent,planDeviceMigration,encodeState,accountSectionUsage,MAX_CLOUD_BYTES} from './cloud-model.js?v=98.2';
import {readCloudConfirmed,writeCloudConfirmed,readCloudRecovery,writeCloudRecovery,clearCloudRecovery,clearCloudLocal,sameCloudData,requestStorageProtection} from './durability.js?v=72';
const OFFLINE_WORKSPACE_KEY='everyday-offline-workspace-v1';
const DEMO_WORKSPACE_KEY='everyday-demo-workspace-v1';
function readDemoWorkspace(){
 try{const saved=localStorage.getItem(DEMO_WORKSPACE_KEY);if(!saved)return null;const state=JSON.parse(saved);return state.active===true?normalizeData(state.data):null;}catch{return null;}
}
function storeDemoWorkspace(next){localStorage.setItem(DEMO_WORKSPACE_KEY,JSON.stringify({active:true,data:encodeData(next)}));}

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
function downloadSectionBackup(section){
 const file=exportSection(data,section);
 const bytes=JSON.stringify(file,null,2),blob=new Blob([bytes],{type:'application/json'});
 const link=document.createElement('a');link.href=URL.createObjectURL(blob);
 link.download='everyday-'+section+'-'+localDate()+'.json';link.click();
 setTimeout(()=>URL.revokeObjectURL(link.href),1000);
}
function sectionImportModal(){
 pendingImport=null;importReadToken++;
 modal('Import separate JSON files','<form class="form" data-form="section-import">'+
  '<p class="body-copy">Choose one, two or all three Everyday section files. Selected sections replace only their own saved records; the others stay unchanged.</p>'+
  '<label class="field"><span>Nutrition / Lifting / Finances JSON</span>'+
  '<input type="file" name="files" accept=".json,application/json" multiple required></label>'+
  '<p class="hint">Use only versioned everyday-section-v1 files. Check the section names and replacement counts before confirming. Export a complete backup first.</p>'+
  '<button type="submit" class="primary">Preview selected sections</button></form><div id="preview" role="status"></div>');
}

function downloadJsonBackup(filename,markWorkspace=false,sourceData=data){
  const blob=new Blob([JSON.stringify(encodeData(sourceData),null,2)],{type:'application/json'}),link=document.createElement('a');
  link.href=URL.createObjectURL(blob);link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);
  if(markWorkspace&&offlineWorkspace&&sourceData===data){offlineWorkspace.dirty=false;offlineWorkspace.exportedAt=new Date().toISOString();storeOfflineWorkspace(data,false);render();}
}


let deviceData=load(),offlineWorkspace=readOfflineWorkspace(),existingDemo=offlineWorkspace?null:readDemoWorkspace(),demoMode=Boolean(existingDemo);
let describeCloudError=error=>error?.message||'Cloud access failed. Please retry.';
let cloudApi=null, account=null, session=null, cloudBusy=false, cloudPending=false, cloudMessage=offlineWorkspace?'Offline JSON workspace · cloud saving paused':'Connecting account service…', cloudReady=false, authChecked=false;
let cloudConfirmed=null,cloudRecovery=null,cloudRecoveryConflict=null;
let storageProtection={supported:false,persisted:null,usage:null,quota:null,error:''};
let healthState={enabled:false,status:''}, healthCheckedAt=0;
let modalBack=null, importReadToken=0, importSaving=false, foodUndoTimer=null, offlineExitTimer=null;
let data=offlineWorkspace?structuredClone(offlineWorkspace.data):demoMode?structuredClone(existingDemo):deviceData, page='home', chosenDate=demoMode?DEMO_LAST_DATE:trackingDate(new Date(),(offlineWorkspace?.data||deviceData).settings?.dayResetMinutes??360), workout='Upper', pendingImport=null, pendingDeviceMigration=null;
let foodSort='recent',foodLibrarySort='name',exerciseLibrarySort='name',foodSuggestionState=null,foodBatch=[],foodProgressPeriod='week',foodProgressOffset=0,financeNotice='';
let classificationReviewVisible=50,financeInsightPeriod='all',budgetMonth=localDate().slice(0,7);
let financeHistoryQuery='',financeHistoryKind='all',financeHistoryMonth='all',financeHistoryCategory='all',financeHistoryReview='all',financeHistorySort='newest',financeHistoryVisible=50;
let foodLibrarySearch='',foodLibraryFilter='all',exerciseLibrarySearch='',exerciseLibraryFilter='all',workoutEditorState=null,routineDeletedStack=[],buddyMuscleView=null,buddyMuscleGroupView=null;
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
  // If a conflict was already detected, keep its recoverable copy current.
  if(cloudRecoveryConflict)cloudRecoveryConflict=cloudRecovery;
  if(markMessage){cloudPending=true;cloudMessage=session?.ready?'Saved on this device · waiting for cloud':'Saved on this device · cloud unavailable';}
  return cloudRecovery;
}
function saveCriticalLocalCopy(){
  try{
    if(offlineWorkspace){storeOfflineWorkspace(data,true);return true;}
    if(demoMode){storeDemoWorkspace(data);return true;}
    if(!account){save(data);deviceData=structuredClone(data);return true;}
    saveCloudRecoveryLocally(true);return true;
  }catch{return false;}
}
function captureCriticalLocalState(){
  if(!data.activeWorkout)return;
  buddyReadEditor();buddyReadNotes();buddyReadSetupDraft();saveCriticalLocalCopy();
}
async function refreshStorageProtection(request=true){
  storageProtection=await requestStorageProtection(request);
  if(page==='settings'&&!document.querySelector('.modal'))render();
  return storageProtection;
}
const currentTrackingDate=(now=new Date())=>trackingDate(now,data.settings.dayResetMinutes??360);
const currentFoodTrackingDate=entry=>foodTrackingDate(entry,data.settings.dayResetMinutes??360);
const foodDayTotals=date=>dailyTotals(data.foodEntries,date,data.settings.dayResetMinutes??360);
const weightPromptSeenKey=()=>`everyday-weight-prompt-seen:${demoMode?'demo':offlineWorkspace?'offline-workspace':account?.uid||'device'}`;
function weightPromptSeen(date){try{return localStorage.getItem(weightPromptSeenKey())===date;}catch{return false;}}
function markWeightPromptSeen(date){try{localStorage.setItem(weightPromptSeenKey(),date);}catch{}data.promptDate=date;}
const currentFoodSlot=(now=new Date())=>Math.floor((now.getHours()*60+now.getMinutes())/30);
const clockLabel=minutes=>{minutes=((minutes%1440)+1440)%1440;const h=Math.floor(minutes/60),m=minutes%60,period=h>=12?'PM':'AM',hour=h%12||12;return hour+':'+String(m).padStart(2,'0')+' '+period;};
const foodTimeLabel=slot=>Number.isInteger(slot)&&slot>=0&&slot<48?clockLabel(slot*30):'No time';
const foodTimeOptions=value=>'<option value="" '+(value==null?'selected':'')+'>No time</option>'+Array.from({length:48},(_,slot)=>'<option value="'+slot+'" '+(slot===value?'selected':'')+'>'+foodTimeLabel(slot)+'</option>').join('');
const resetTimeOptions=value=>Array.from({length:48},(_,slot)=>{const minutes=slot*30;return '<option value="'+minutes+'" '+(minutes===value?'selected':'')+'>'+clockLabel(minutes)+'</option>';}).join('');

function timeControl(name,value,{label='Time',minutes=false,optional=true}={}){
 const raw=value==null?'':String(value);
 const display=raw===''?'No time':clockLabel(Number(raw)*(minutes?1:30));
 return '<div class="field time-step-control" data-time-stepper data-time-unit="'+(minutes?'minutes':'slot')+'"><span>'+esc(label)+'</span>'+
 '<div class="time-step-row"><button type="button" data-action="time-step" data-delta="-1" aria-label="'+esc(label)+' minus 30 minutes">−</button><strong data-time-display aria-live="polite">'+esc(display)+'</strong><button type="button" data-action="time-step" data-delta="1" aria-label="'+esc(label)+' plus 30 minutes">+</button></div>'+
 '<input type="hidden" name="'+esc(name)+'" data-time-value value="'+esc(raw)+'">'+
 (optional?'<div class="time-step-options"><button type="button" data-action="time-now">Now</button><button type="button" data-action="time-clear">No time</button></div>':'')+'</div>';
}
function syncTimeControl(input){
 const wrap=input?.closest('[data-time-stepper]'),label=wrap?.querySelector('[data-time-display]');
 if(!wrap||!label)return;
 const raw=input.value;
 label.textContent=raw===''?'No time':clockLabel(Number(raw)*(wrap.dataset.timeUnit==='minutes'?1:30));
}


const APP_VERSION='v'+(new URL(import.meta.url).searchParams.get('v')||'dev');

let latestRelease='', releaseProbe=null, lastReleaseProbe=0, releaseReloading=false;
function safeToUpdate(){
  return authChecked && !offlineWorkspace && !data.activeWorkout && !importSaving &&
    !cloudBusy && !cloudPending && !document.querySelector('.modal,.food-undo-toast') &&
    !document.activeElement?.matches?.('input,textarea,select');
}
function showReleaseNotice(){
  let node=document.querySelector('#app-update-notice');
  if(!latestRelease || document.querySelector('.modal') || data.activeWorkout){
    node?.remove();return;
  }
  if(!node){
    node=document.createElement('div');node.id='app-update-notice';node.setAttribute('role','status');
    node.innerHTML='<span></span><button type="button">Refresh</button>';
    node.querySelector('button').addEventListener('click',()=>tryRefreshRelease());
    document.body.appendChild(node);
  }
  node.querySelector('span').textContent=safeToUpdate()?'Update '+latestRelease+' is ready':'Update '+latestRelease+' available · finish saving first';
  node.querySelector('button').disabled=!safeToUpdate();
}
function tryRefreshRelease(){
  if(!latestRelease||releaseReloading)return;
  if(!safeToUpdate()){showReleaseNotice();return;}
  releaseReloading=true;
  captureCriticalLocalState();
  // Bypass an older service worker's cached navigation on the first upgrade.
  const url=new URL(location.href);
  url.searchParams.set('appUpdate',latestRelease);
  location.replace(url.href);
}
function checkLatestRelease(){
  if(releaseProbe || document.visibilityState==='hidden' || navigator.onLine===false ||
     Date.now()-lastReleaseProbe<1500)return releaseProbe;
  lastReleaseProbe=Date.now();
  releaseProbe=(async()=>{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4500);
    try{
      // This file is intentionally not intercepted or cached by the service worker.
      const response=await fetch('./version.json?check='+Date.now(),{cache:'no-store',signal:controller.signal});
      if(!response.ok)return;
      const manifest=await response.json(),next=manifest?.version;
      if(!/^v\d+(?:\.\d+)?$/.test(next))return;
      const number=v=>v.slice(1).split('.').map(Number);
      const [nextMajor,nextMinor=0]=number(next),[currentMajor,currentMinor=0]=number(APP_VERSION);
      if(nextMajor<currentMajor||(nextMajor===currentMajor&&nextMinor<=currentMinor))return;
      latestRelease=next;
      if('serviceWorker' in navigator){
        void navigator.serviceWorker.getRegistration().then(reg=>reg?.update()).catch(()=>{});
      }
      tryRefreshRelease();
      if(!releaseReloading)setTimeout(tryRefreshRelease,6000);
    }catch{ /* Offline, slow, or blocked checks leave the local app running. */ }
    finally{clearTimeout(timer);releaseProbe=null;}
  })();
  return releaseProbe;
}

const FIXED_WEEK_START=5;
const effortLabels={1:'Light',2:'Comfortable',3:'Challenging',4:'Hard',5:'Very Hard',6:'Limit',7:'Failure'};
const effortChartColors={1:'#bbdabb',2:'#cadba8',3:'#dcd99f',4:'#e1c58d',5:'#e2ad84',6:'#db927e',7:'#d57878'};
const effortChartColor=value=>effortChartColors[Number(value)]||'#91a096';
const effortText=value=>effortLabels[value]||'';
const effortOptions=value=>'<option value="">Effort</option>'+Object.entries(effortLabels).map(([n,label])=>`<option value="${n}" ${Number(value)===Number(n)?'selected':''}>${label}</option>`).join('');
const persist=async()=>{
  if(demoMode){try{storeDemoWorkspace(data);render();return true;}catch{alert('Demo changes could not be saved on this device.');return false;}}
  if(offlineWorkspace){try{storeOfflineWorkspace(data,true);cloudMessage='Offline JSON workspace · saved on this device';render();return true;}catch{alert('This device could not save the offline workspace. Export your JSON before leaving.');return false;}}
  if(!account){try{save(data);deviceData=structuredClone(data);render();return true;}catch{alert('This device could not save the change. Export a backup before leaving.');return false;}}
  let localSafe=true;
  try{saveCloudRecoveryLocally(false);cloudPending=true;}catch{localSafe=false;cloudPending=true;}
  if(cloudRecoveryConflict){
    cloudMessage='Saved on this device · resolve cloud recovery before syncing';render();return localSafe;
  }
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
function isLoading(){return demoMode||offlineWorkspace?false:!authChecked || Boolean(account && !session?.ready && !hasLocalCloudFallback());}
function shell(content) {
  const navItems=[['home','⌂','Home'],['food','◒','Food'],['gym','▣','Lifting'],['finances','$','Finances'],['progress','↗','Progress']];
  app.innerHTML=`<div class="shell"><header class="top"><button class="brand" data-action="home"><span class="mark">✳</span> everyday<span class="brand-dot">.</span></button><div class="top-actions"><button class="top-date" data-action="history">${niceDate(currentTrackingDate())} <span>↗</span></button><button type="button" class="home-settings${page==='settings'?' active':''}" data-action="settings" aria-label="Settings" title="Settings" ${isLoading()?'disabled':''} ${page==='settings'?'aria-current="page"':''}><span aria-hidden="true">⚙</span></button></div></header>${page==='home'?'':accountBanner()}${cloudSaveWarning()}<main aria-busy="${isLoading()}">${content}</main>${page==='home'?accountBanner():''}<nav class="nav" aria-label="Main navigation">${navItems.map(([p,icon,label])=>`<button class="${(page===p||(p==='finances'&&['financeHistory','classificationReview','classificationRules','financeInsights','financeBudget'].includes(page)))?'active':''}" data-action="${p}" ${isLoading()?'disabled':''} aria-label="${label}" ${(page===p||(p==='finances'&&['financeHistory','classificationReview','classificationRules','financeInsights','financeBudget'].includes(page)))?'aria-current="page"':''}><span>${icon}</span><small>${label}</small></button>`).join('')}</nav></div><div id="overlay"></div>`;
}
function render() {
  modalBack=null;pendingImport=null;importReadToken++;
  if(isLoading()){
    const error=account&&!cloudBusy?`<section class="panel" role="alert"><p class="body-copy">${esc(cloudMessage)}</p>${button('Retry loading','cloud-load','primary')}</section>`:'';
    const offlineOption=!offlineWorkspace?`<section class="panel loading-offline-option"><h2>Need to work offline?</h2><p class="body-copy">Open an Everyday JSON backup in a separate local workspace while cloud access is unavailable.</p>${button('Open offline JSON workspace','offline-start','outline')}</section>`:'';
    shell((page==='home'?home(true):`<section class="panel"><h2>Loading your account</h2><p class="body-copy">Please wait…</p></section>`)+offlineOption+error);return;
  }
  const views={home,food,gym,progress,finances,financeHistory,classificationReview,classificationRules,financeInsights,financeBudget,history,settings};
  shell(views[page]?.()||home());
  if(latestRelease)setTimeout(tryRefreshRelease,400);
}
function home(loading=false) {
  const today=currentTrackingDate();
  const totals=foodDayTotals(today),latest=[...data.weights].sort((a,b)=>b.date.localeCompare(a.date))[0];
  const calRemaining=Math.round(data.settings.calories-totals.calories),proteinRemaining=Math.round(data.settings.protein-totals.protein);
  const remainingBadges='<div class="home-remaining" aria-label="Daily goals remaining"><span class="'+(calRemaining<0?'over':'')+'"><small>CALORIES</small><strong>'+(loading?'—':calRemaining>=0?calRemaining+' left':(-calRemaining)+' over')+'</strong></span><span class="'+(proteinRemaining<=0?'reached':'')+'"><small>PROTEIN</small><strong>'+(loading?'—':proteinRemaining>0?proteinRemaining+'g left':'Goal reached')+'</strong></span></div>';
  return `<section class="home-actions" aria-label="What do you want to log?"><button class="big-action food-action" data-action="food" ${loading?'disabled':''}><span class="action-icon">◒</span><span><strong>Food</strong><small>Calories, protein & saved foods</small></span><b>↗</b></button><button class="big-action lift-action" data-action="gym" ${loading?'disabled':''}><span class="action-icon">▣</span><span><strong>Lifting</strong><small>Sets, reps & previous workouts</small></span><b>↗</b></button></section>${!account&&!demoMode&&!offlineWorkspace&&authChecked?'<section class="demo-entry"><span><strong>Try Everyday with sample logs</strong><small>Fictional food, weight and workout history · your records stay untouched</small></span>'+button('Load demo data','demo-start','outline small')+'</section>':''}<section class="today-card"><div class="section-head"><div><p class="eyebrow">AT A GLANCE</p><h2>Today so far</h2></div>${button('View day ↗','history','text-btn',loading?'disabled':'')}</div><div class="metric-row"><div><b>${loading?'—':Math.round(totals.calories).toLocaleString()}</b><small>of ${loading?'—':data.settings.calories} cal</small>${progressBar(loading?0:totals.calories,data.settings.calories,'#d8eb86')}</div><div><b>${loading?'—':Math.round(totals.protein)}<em>g</em></b><small>of ${loading?'—':data.settings.protein}g protein</small>${progressBar(loading?0:totals.protein,data.settings.protein,'#9fd9bf')}</div></div>${remainingBadges}</section><section class="weight-strip"><div><span class="small-icon">⚖</span><span><strong>${loading?'—':latest?`${fmt(latest.value)} ${data.settings.unit}`:'No weigh-in yet'}</strong><small>${loading?'—':latest?`Last logged ${niceDate(latest.date)}`:'A morning check-in when you are ready'}</small></span></div>${button('Log weight','weight','outline small',loading?'disabled':'')}</section>`;
}
// Pass 3.3: usable daily transaction logging and reviewed ChatGPT CSV entry.
const financeNowTime=(date=new Date())=>String(date.getHours()).padStart(2,'0')+':'+String(date.getMinutes()).padStart(2,'0');
const financeKindLabels={expense:'Expense',income:'Income',transfer:'Transfer'};
const FINANCE_CSV_SAMPLE='recordType,date,time,kind,amount,description,category,merchant,note,externalId\n'+
 'transaction,2026-10-27,14:15,expense,7.19,Water cases,Household Supplies,Wawa,,\n'+
 'transaction,2026-10-27,,income,100.00,Paycheck,Income,,,';
function financeFields(tx=null,scope='quick'){
 const isBank=Boolean(tx?.bankDescription),catId='finance-category-'+scope;
 const categoryOptions='<datalist id="'+catId+'">'+FINANCE_CATEGORIES.map(c=>'<option value="'+esc(c)+'"></option>').join('')+'</datalist>';
 const amount=tx?formatFinanceAmount(tx.amountCents).slice(1):'',kind=tx?.kind||'expense';
 const bankFacts=isBank?'<section class="finance-bank-facts"><strong>Original bank record · locked</strong><p>'+esc(tx.bankDescription)+'</p>'+
   '<small>'+esc(tx.accountLabel||'Bank of America')+' · Posted '+esc(tx.date)+' · '+formatFinanceAmount(tx.amountCents)+' · '+esc(tx.statementLabel||'')+'</small></section>'+
   '<input type="hidden" name="amount" value="'+esc(amount)+'"><input type="hidden" name="date" value="'+esc(tx.date)+'">':'';
 const amountInput=isBank?'':'<label class="field"><span>Amount (USD)</span><span class="finance-money-input"><strong aria-hidden="true">$</strong><input type="text" name="amount" inputmode="decimal" autocomplete="off" maxlength="20" required value="'+esc(amount)+'" placeholder="0.00" aria-label="Amount in US dollars"></span></label>';
 const kindInput='<label class="field"><span>Type (editable classification)</span><select name="kind">'+FINANCE_KINDS.map(k=>'<option value="'+k+'" '+(kind===k?'selected':'')+'>'+({expense:'Expense',income:'Income',transfer:'Transfer'}[k])+'</option>').join('')+'</select></label>';
 const postedInput=isBank?'':input('Calendar date','date',tx?.date||localDate(),'date','required');
 return bankFacts+'<div class="finance-quick-fields '+(isBank?'bank-edit':'')+'">'+amountInput+
  input(isBank?'Your description':'What was it?','description',tx?.description||'','text','placeholder="e.g. Water and protein snacks" maxlength="200" required autocomplete="off"')+
  '</div><details class="finance-more" '+(tx?'open':'')+'><summary>Category, date & more</summary><div class="finance-extra-fields">'+kindInput+postedInput+
  input('Purchase date (if different)','purchaseDate',tx?.purchaseDate||'','date','')+
  input('Time (receipt or purchase)','time',tx?tx.time||'':financeNowTime(),'time','step="60"')+
  '<label class="field"><span>Category</span><input name="category" list="'+catId+'" maxlength="80" value="'+esc(tx?.category||'Uncategorized')+'" autocomplete="off"></label>'+categoryOptions+
  input('Subcategory','subcategory',tx?.subcategory||'','text','maxlength="80" placeholder="e.g. Energy drinks"')+
  input('Merchant (optional)','merchant',tx?.merchant||'','text','maxlength="160" placeholder="Store or payee"')+
  '<label class="field finance-note"><span>Note (optional)</span><textarea name="note" rows="2" maxlength="500" placeholder="Anything useful to remember">'+esc(tx?.note||'')+'</textarea></label>'+
  '<label class="field finance-note"><span>Receipt itemization</span><textarea name="itemization" rows="3" maxlength="3000" placeholder="Example: 2 × water cases — $14.38; snack — $2.49">'+esc(tx?.itemization||'')+'</textarea></label>'+
  '</div></details>';
}
function financeRecordFromForm(v,existing=null){
 const next={id:existing?.id||id(),date:String(v.date||''),kind:String(v.kind||'expense'),
  amountCents:parseFinanceAmount(v.amount),description:String(v.description||'').trim(),
  category:String(v.category||'').trim()||'Uncategorized',currency:'USD',source:existing?.source||'manual'};
 if(existing){
  for(const key of ['externalId','bankDescription','accountLabel','statementLabel','bankDirection'])if(existing[key])next[key]=existing[key];
  if(existing.bankDescription){
   next.date=existing.date;next.amountCents=existing.amountCents;
  }
 }
 for(const key of ['time','merchant','note','purchaseDate','subcategory','itemization']){
  const val=String(v[key]||'').trim();if(val)next[key]=val;
 }
 if(!next.description)throw Error('Describe the transaction before saving.');
 return normalizeData({...emptyData(),transactions:[next]}).transactions[0];
}
// Reuse the same compact, source-preserving transaction row in Recent and History.
function financeRow(tx,showReview=false){
 const displayDate=new Date(tx.date+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
 const raw=tx.bankDescription&&tx.bankDescription.trim()!==tx.description.trim()?
  '<span class="finance-raw-description">'+esc(tx.bankDescription)+'</span>':'';
 const category=tx.category&&tx.category.toLowerCase()!=='uncategorized'?
  '<span class="finance-row-category">'+esc(tx.category)+(tx.subcategory?' / '+esc(tx.subcategory):'')+'</span>':'';
 const details=raw||category?'<small class="finance-row-details">'+raw+(raw&&category?' · ':'')+category+'</small>':'';
 const itemized=tx.itemization?'<small class="finance-itemized">'+esc(tx.itemization)+'</small>':'';
 const review=showReview?financeReviewFlags(tx).map(flag=>'<small class="finance-review-flag">'+(flag==='uncategorized'?'Category needed':'Check possible transfer')+'</small>').join(''):'';
 return '<div class="finance-row"><div class="finance-row-main"><small class="finance-row-date">'+esc(displayDate)+(tx.time?' · '+esc(tx.time):'')+'</small>'+
  '<strong>'+esc(tx.description)+'</strong>'+details+itemized+review+'</div>'+
  '<div class="finance-row-side"><b class="'+esc(tx.kind)+'">'+(tx.kind==='income'?'+':tx.kind==='expense'?'−':'')+
  formatFinanceAmount(tx.amountCents)+'</b>'+
  button('Edit','finance-edit','text-btn small','data-id="'+esc(tx.id)+'"')+'</div></div>';
}
function financeNewestFirst(transactions){
 return [...transactions].sort((a,b)=>(b.date+'T'+(b.time||'00:00')).localeCompare(a.date+'T'+(a.time||'00:00'))||a.id.localeCompare(b.id));
}
function financeRecent(){
 const all=financeNewestFirst(data.transactions||[]);
 const needReview=all.filter(tx=>financeReviewFlags(tx).length).length;
 return '<section class="panel finance-recent"><div class="section-head"><div><p class="eyebrow">RECENT TRANSACTIONS</p><h2>Latest entries</h2></div><span class="finance-count">'+all.length+' total</span></div>'+
  (all.length?'<div class="finance-recent-list">'+all.slice(0,10).map(financeRow).join('')+'</div>':empty('No transactions yet. Your first entry will appear here.'))+
  (all.length>10?'<p class="hint">Showing the 10 newest entries.</p>':'')+
  button('View all transactions','finance-history-open','outline finance-history-open')+
  (needReview?button('Review classifications · '+needReview,'finance-review-open','outline finance-review-open'):'')+'</section>';
}
function financeHistoryOptions(values,selected,allLabel){
 return '<option value="all"'+(selected==='all'?' selected':'')+'>'+esc(allLabel)+'</option>'+
  values.map(value=>'<option value="'+esc(value)+'"'+(value===selected?' selected':'')+'>'+esc(value)+'</option>').join('');
}
function financeHistoryMatches(){
 const query=financeHistoryQuery.trim().toLocaleLowerCase();
 const matches=(data.transactions||[]).filter(tx=>{
  if(financeHistoryKind!=='all'&&tx.kind!==financeHistoryKind)return false;
  if(financeHistoryMonth!=='all'&&!tx.date.startsWith(financeHistoryMonth))return false;
  if(financeHistoryCategory!=='all'&&(tx.category||'Uncategorized')!==financeHistoryCategory)return false;
  if(financeHistoryReview!=='all'){
   const flags=financeReviewFlags(tx);
   if(financeHistoryReview==='needs-review'?!flags.length:!flags.includes(financeHistoryReview))return false;
  }
  if(!query)return true;
  const text=[tx.description,tx.bankDescription,tx.category,tx.subcategory,tx.merchant,tx.note,
   tx.itemization,tx.purchaseDate,tx.date,tx.amountCents?formatFinanceAmount(tx.amountCents):'']
   .filter(Boolean).join(' ').toLocaleLowerCase();
  return text.includes(query);
 });
 const sorted=financeNewestFirst(matches);
 return financeHistorySort==='oldest'?sorted.reverse():sorted;
}
function financeHistoryListMarkup(matches){
 if(!matches.length)return '<p class="empty">No transactions match these filters. Try a different search, month, type, or category.</p>';
 const shown=matches.slice(0,financeHistoryVisible);
 return shown.map(tx=>financeRow(tx,financeHistoryReview!=='all')).join('')+
  (matches.length>shown.length?button('Show '+Math.min(50,matches.length-shown.length)+' more','finance-history-more','outline finance-history-more'):'');
}
function financeHistory(){
 const all=data.transactions||[];
 const months=[...new Set(all.map(tx=>tx.date.slice(0,7)))].sort().reverse();
 const categories=[...new Set(all.map(tx=>tx.category||'Uncategorized'))].sort((a,b)=>a.localeCompare(b));
 const monthOptions=financeHistoryOptions(months,financeHistoryMonth,'All months');
 const categoryOptions=financeHistoryOptions(categories,financeHistoryCategory,'All categories');
 const matches=financeHistoryMatches();
 const needReview=all.filter(tx=>financeReviewFlags(tx).length).length;
 return '<div class="page-head finances-page-head"><p class="eyebrow">YOUR MONEY</p><h1>Transaction history<span class="accent">.</span></h1>'+
  '<p>Search and review every saved purchase, payment, and transfer.</p>'+button('← Back to Finances','finance-history-back','outline finance-history-back')+'</div>'+
  '<section class="panel finance-history"><label class="field finance-history-search"><span>Search transactions</span>'+
  '<input type="search" data-finance-history-search placeholder="Merchant, bank description, amount…" value="'+esc(financeHistoryQuery)+'" autocomplete="off"></label>'+
  '<div class="finance-history-filters"><label class="field"><span>Type</span><select data-finance-history-filter="kind">'+
  financeHistoryOptions(['expense','income','transfer'],financeHistoryKind,'All types')+'</select></label>'+
  '<label class="field"><span>Month</span><select data-finance-history-filter="month">'+monthOptions+'</select></label>'+
  '<label class="field"><span>Category</span><select data-finance-history-filter="category">'+categoryOptions+'</select></label>'+
  '<label class="field"><span>Review</span><select data-finance-history-filter="review">'+
  financeHistoryOptions(['needs-review','uncategorized','transfer-check'],financeHistoryReview,'All records').replace('>needs-review<','>Needs review<').replace('>uncategorized<','>Uncategorized<').replace('>transfer-check<','>Possible transfers<')+'</select></label>'+
  '<label class="field"><span>Order</span><select data-finance-history-filter="sort"><option value="newest"'+(financeHistorySort==='newest'?' selected':'')+'>Newest first</option><option value="oldest"'+(financeHistorySort==='oldest'?' selected':'')+'>Oldest first</option></select></label></div>'+
  '<p class="finance-review-help">'+needReview+' transaction'+(needReview===1?'':'s')+' to review. Suggested transfers require confirmation.</p>'+
  '<div class="finance-history-summary" data-finance-history-summary role="status">'+matches.length+' of '+all.length+' transactions</div>'+
  '<div class="finance-recent-list finance-history-list" data-finance-history-list>'+financeHistoryListMarkup(matches)+'</div>'+
  '<p class="hint">Dates are bank-posted dates when imported. Review hints and filters never change saved records. Edit individual entries to correct a classification.</p></section>';
}
function refreshFinanceHistoryList(){
 const list=document.querySelector('[data-finance-history-list]');
 if(!list)return;
 const matches=financeHistoryMatches();
 list.innerHTML=financeHistoryListMarkup(matches);
 const summary=document.querySelector('[data-finance-history-summary]');
 if(summary)summary.textContent=matches.length+' of '+(data.transactions||[]).length+' transactions';
}

function classificationRules(){
 const rules=data.classificationRules||[];
 return '<div class="page-head finances-page-head"><p class="eyebrow">YOUR MONEY</p><h1>Merchant rules<span class="accent">.</span></h1>'+
  '<p>Rules suggest categories for every matching transaction. Nothing changes until you review and apply.</p>'+
  button('← Back to Finances','classification-back','outline')+'</div>'+
  '<section class="panel finance-recent"><div class="section-head"><h2>Saved rules</h2>'+button('Add a rule','classification-new','primary')+'</div>'+
  (rules.length?'<div class="finance-recent-list">'+rules.map(rule=>
   '<div class="finance-row"><div class="finance-row-main"><div><strong>'+esc(rule.name)+'</strong>'+
   '<small>'+esc(rule.matchField)+' contains "'+esc(rule.matchText)+'"'+
    (rule.amountCents?' · '+formatFinanceAmount(rule.amountCents):'')+
   '</small><small>'+esc(rule.category)+(rule.subcategory?' / '+esc(rule.subcategory):'')+(rule.enabled?'':' · Disabled')+'</small></div>'+
   '<div class="finance-row-side">'+button('Edit','classification-edit','text-btn small','data-id="'+esc(rule.id)+'"')+
    button(rule.enabled?'Disable':'Enable','classification-toggle','text-btn small','data-id="'+esc(rule.id)+'"')+
    button('Delete','classification-delete','text-btn small','data-id="'+esc(rule.id)+'"')+'</div></div></div>'
  ).join('')+'</div>':empty('No rules yet. Add one to propose classifications for similar transactions.'))+
  '<div class="form-actions">'+button('Review suggestions','classification-review-open','outline')+'</div></section>';
}
function classificationRuleForm(rule=null){
 const f=rule||{name:'',matchField:'any',matchText:'',category:'',subcategory:'',merchant:'',amountCents:null,enabled:true};
 modal(rule?'Edit merchant rule':'Add merchant rule','<form class="form" data-form="classification-rule">'+
  '<input type="hidden" name="ruleId" value="'+esc(rule?.id||'')+'">'+
  input('Rule name','name',f.name,'text','required maxlength="100" placeholder="Wawa bottled water"')+
  '<label class="field"><span>Where to match</span><select name="matchField">'+
   [['any','Merchant or description'],['merchant','Merchant / manual description'],['bankDescription','Original bank description']].map(([value,label])=>
    '<option value="'+value+'"'+(f.matchField===value?' selected':'')+'>'+label+'</option>').join('')+'</select></label>'+
  input('Contains text','matchText',f.matchText,'text','required minlength="2" maxlength="120" placeholder="WAWA"')+
  input('Exact amount in dollars (optional)','ruleAmount',f.amountCents!=null?formatFinanceAmount(f.amountCents).slice(1):'','text','inputmode="decimal" placeholder="Any amount"')+
  input('Category','category',f.category,'text','required maxlength="80" placeholder="Household Supplies"')+
  input('Subcategory (optional)','subcategory',f.subcategory,'text','maxlength="80" placeholder="Bottled water"')+
  input('Merchant label (optional)','merchant',f.merchant,'text','maxlength="160" placeholder="Wawa"')+
  '<p class="hint">Matching suggestions never apply automatically. Bank amounts, source descriptions, and transaction types are protected.</p>'+
  '<button type="submit" class="primary">Save rule</button></form>');
}
function classificationReview(){
 const all=classificationRuleProposals(data.transactions||[],data.classificationRules||[]);
 const ambiguous=all.filter(p=>p.conflicts.length);
 const changes=all.filter(p=>!p.conflicts.length&&Object.keys(p.changes).length);
 const needsManual=(data.transactions||[]).filter(tx=>financeReviewFlags(tx).length).length;
 return '<div class="page-head finances-page-head"><p class="eyebrow">YOUR MONEY</p><h1>Classification review<span class="accent">.</span></h1>'+
  '<p>Review suggestions across all imported and manually entered transactions before changing anything.</p>'+
  button('← Back to Finances','classification-back','outline')+'</div>'+
  '<section class="panel finance-recent"><h2>Review queue</h2><p class="body-copy">'+changes.length+
  ' rule suggestion'+(changes.length===1?'':'s')+' · '+ambiguous.length+' conflicting rule match'+
  (ambiguous.length===1?'':'es')+' · '+needsManual+' categorization/transfer flag'+(needsManual===1?'':'s')+'.</p>'+
  '<div class="form-actions">'+button('Manage merchant rules','classification-rules-open','outline')+
  button('Review history flags','finance-review-open','outline')+'</div>'+
  (changes.length?'<div class="finance-recent-list">'+changes.slice(0,classificationReviewVisible).map(p=>{
   const tx=p.transaction,details=Object.entries(p.changes).map(([field,change])=>
    esc(field)+': '+esc(change.before||'(blank)')+' → '+esc(change.after)).join(' · ');
   return '<div class="finance-row"><div class="finance-row-main"><div><strong>'+esc(tx.description)+'</strong>'+
    '<small>'+esc(tx.date)+' · '+formatFinanceAmount(tx.amountCents)+' · '+esc(p.ruleNames.join(', '))+'</small>'+
    '<small>'+details+'</small></div></div></div>';
  }).join('')+'</div>':empty('No actionable merchant-rule suggestions. The full ledger remains unchanged.'))+
  (changes.length>classificationReviewVisible?button('Show more','classification-review-more','outline'):'')+
  (changes.length?'<div class="form-actions">'+button('Preview '+changes.length+' rule suggestions','classification-preview','primary')+'</div>':'')+
  (ambiguous.length?'<p class="hint">Conflicting rules were excluded. Edit those rules before trying again.</p>':'')+
  '</section>';
}


function financeInsightBreakdown(title,groups,total){
 const visible=groups.slice(0,12),rest=groups.slice(12);
 if(rest.length)visible.push({name:'Remaining '+(title==='Categories'?'categories':'merchants'),
  amountCents:rest.reduce((n,g)=>n+g.amountCents,0),count:rest.reduce((n,g)=>n+g.count,0)});
 return '<section class="panel finance-insight-section"><h2>'+esc(title)+'</h2>'+
  (visible.length?'<div class="finance-insight-breakdown">'+visible.map(g=>{
    const percent=total>0?Math.min(100,100*g.amountCents/total):0;
    return '<div class="finance-insight-breakdown-item"><div class="finance-insight-breakdown-text"><strong>'+esc(g.name)+
     '</strong><b>'+formatFinanceAmount(g.amountCents)+'</b></div>'+
     '<div class="finance-insight-meter" role="img" aria-label="'+esc(g.name)+': '+percent.toFixed(1)+' percent of recorded expenses">'+
     '<span style="width:'+percent.toFixed(1)+'%"></span></div>'+
     '<small>'+g.count+' transaction'+(g.count===1?'':'s')+' · '+percent.toFixed(1)+'% of expenses</small></div>';
  }).join('')+'</div>':empty('No expenses in this range.'))+'</section>';
}
function financeInsights(){
 const periods=financeInsightPeriods(data.transactions||[]);
 if(!periods.some(p=>p.value===financeInsightPeriod))financeInsightPeriod='all';
 const r=summarizeFinanceInsights(data.transactions||[],financeInsightPeriod,localDate());
 const card=(label,value,detail)=>'<div class="finance-insight-metric"><small>'+esc(label)+'</small>'+
   '<strong>'+formatFinanceAmount(value)+'</strong><span>'+esc(detail)+'</span></div>';
 return '<div class="page-head finances-page-head"><p class="eyebrow">YOUR MONEY</p><h1>Spending insights<span class="accent">.</span></h1>'+
  '<p>Read-only summaries of saved classifications, not estimates of individual purchases.</p>'+
  button('← Back to Finances','finance-insights-back','outline finance-history-back')+'</div>'+
  '<section class="panel finance-insight-intro"><label class="field"><span>Date range</span>'+
  '<select data-finance-insight-period aria-label="Spending insights date range">'+periods.map(p=>
   '<option value="'+esc(p.value)+'"'+(p.value===financeInsightPeriod?' selected':'')+'>'+esc(p.label)+'</option>').join('')+
  '</select></label><p class="hint">Imported bank records use posted dates; receipt purchase dates may differ.</p>'+
  '<div class="finance-insight-cards">'+
  card('Expenses',r.expenseCents,'Saved as expense')+
  card('Income / credits',r.incomeCents,'Includes refunds if categorized as income')+
  card('Transfers out',r.transferOutCents,'Original bank debits only')+
  card('Transfers in',r.transferInCents,'Original bank credits only')+'</div>'+
  '<p class="finance-insight-footnote">'+r.recordCount+' transactions in range. Transfers are not spending or earned income.'+
  (r.unknownTransferCount?' '+r.unknownTransferCount+' transfer'+(r.unknownTransferCount===1?'':'s')+
    ' totaling '+formatFinanceAmount(r.unknownTransferCents)+' lack a direction and are excluded from transfer in/out.':'')+
  '</p></section>'+
  '<section class="panel finance-insight-quality"><p class="eyebrow">DATA QUALITY</p><h2>Classification coverage</h2>'+
  '<p>'+r.uncategorizedCount+' uncategorized expense'+(r.uncategorizedCount===1?'':'s')+' ('+
   formatFinanceAmount(r.uncategorizedCents)+') · '+r.reviewCount+' flagged transaction'+(r.reviewCount===1?'':'s')+'</p>'+
  (r.reviewCount?button('Review flagged transactions','finance-review-open','outline'):'')+
  '<p class="hint">Review flags are incomplete: some incorrect categories may not be detected. Results can change as you clarify transactions.</p></section>'+
  '<section class="panel finance-insight-convenience"><p class="eyebrow">CONVENIENCE FOOD</p><h2>'+formatFinanceAmount(r.convenienceCents)+'</h2>'+
  '<p>Only saved Convenience Food expenses. Restaurants, groceries, and mixed purchases remain separate.</p></section>'+
  financeInsightBreakdown('Categories',r.categories,r.expenseCents)+
  financeInsightBreakdown('Merchants',r.merchants,r.expenseCents);
}


const budgetMoney=cents=>(cents<0?'−':'')+formatFinanceAmount(Math.abs(cents));
const budgetValue=cents=>cents===null?'':(Math.abs(cents)/100).toFixed(2).replace(/\.00$/,'');
const budgetDollar=value=>{
 const trimmed=String(value||'').trim(),negative=trimmed.startsWith('-');
 if(/^[-+]?0(?:\.0{1,2})?$/.test(trimmed))return 0;
 return(negative?-1:1)*parseFinanceAmount(negative?trimmed.slice(1):trimmed);
};
async function budgetCommit(plan){
 const next=structuredClone(data);next.budgetPlan=normalizeBudgetPlan(plan);
 const normalized=normalizeData(next);
 if(account&&!offlineWorkspace)encodeState(normalized);
 data=normalized;
 await persist();
}
function budgetScheduleForm(rule=null){
 const r=rule||{id:'',name:'',kind:'expense',amountCents:0,frequency:'monthly',startDate:localDate(),occurrences:{}};
 modal(rule?'Edit scheduled item':'Schedule a bill or payday','<form class="form" data-form="budget-schedule">'+
  '<input type="hidden" name="budgetId" value="'+esc(r.id)+'">'+
  input('Name','budgetName',r.name,'text','maxlength="120" required placeholder="Car payment"')+
  '<label class="field"><span>Type</span><select name="budgetKind"><option value="expense"'+(r.kind==='expense'?' selected':'')+'>Payment / expense</option>'+
   '<option value="income"'+(r.kind==='income'?' selected':'')+'>Paycheck / incoming money</option></select></label>'+
  input('Amount (USD)','budgetAmount',budgetValue(r.amountCents),'text','required inputmode="decimal" placeholder="366.00"')+
  input('First due date','budgetStartDate',r.startDate,'date','required')+
  '<label class="field"><span>Repeat</span><select name="budgetFrequency">'+
   [['once','One time'],['weekly','Weekly'],['biweekly','Every two weeks'],['monthly','Monthly']].map(([value,label])=>
   '<option value="'+value+'"'+(r.frequency===value?' selected':'')+'>'+label+'</option>').join('')+'</select></label>'+
  '<p class="hint">Monthly payments repeat on the same day number, or the last day of shorter months. Updating an item preserves already marked payment dates.</p>'+
  '<button type="submit" class="primary">Save schedule</button></form>');
}
function financeBudget(){
 const plan=data.budgetPlan,day=localDate(),report=budgetForecast(plan,day,35),month=budgetMonth;
 const limits=budgetMonthSpending(plan,data.transactions||[],month);
 const events=budgetOccurrences(plan,day,new Date(Date.parse(day+'T00:00:00Z')+35*86400000).toISOString().slice(0,10));
 const pending=events.filter(e=>e.status==='pending'),upcoming=pending.slice(0,18);
 const monthText=new Date(month+'-01T12:00:00Z').toLocaleDateString('en-US',{month:'long',year:'numeric',timeZone:'UTC'});
 return '<div class="page-head finances-page-head"><p class="eyebrow">YOUR MONEY</p><h1>Budget & cash flow<span class="accent">.</span></h1>'+
  '<p>Plan bills, paydays and spending before they happen. Nothing here is a live bank balance.</p>'+
  button('← Back to Finances','budget-back','outline finance-history-back')+'</div>'+
  '<section class="panel budget-overview"><div class="section-head"><div><p class="eyebrow">MANUAL AVAILABLE CASH</p>'+
  '<h2>'+(plan.balanceCents===null?'Not set':budgetMoney(plan.balanceCents))+'</h2></div>'+
   button(plan.balanceCents===null?'Set balance':'Update balance','budget-balance','outline')+'</div>'+
  '<p class="hint">'+(plan.balanceCents===null?'Enter a known available amount to enable forecasting.':
    'Your own estimate as of end of '+esc(plan.balanceAsOf)+'. Refresh after real bank activity.')+'</p>'+
  (report.configured?
   '<div class="budget-metrics"><div><small>Projected in 35 days</small><strong>'+budgetMoney(report.endCents)+'</strong></div>'+
    '<div><small>Lowest projected balance</small><strong class="'+(report.minimumCents<0?'budget-negative':'')+'">'+budgetMoney(report.minimumCents)+'</strong></div></div>'+
   (report.shortfall?'<p class="budget-warning" role="status">Projected cash shortfall. Review upcoming payments and your starting balance.</p>':'')+
   (report.stale?'<p class="budget-warning">Your manual balance is not dated today. The forecast begins from that earlier amount.</p>':''):'')+
  '<form class="budget-what-if" data-form="budget-scenario"><label class="field"><span>What if I spent…?</span>'+
   '<input type="text" name="scenarioAmount" inputmode="decimal" placeholder="25.00" required></label>'+
   '<button class="outline" type="submit"'+(report.configured?'':' disabled')+'>Test purchase</button></form>'+
  '<p class="hint">Projections use scheduled obligations, not imported transaction totals. Marking a payment paid only removes its planned occurrence; it never creates a bank entry.</p></section>'+
  '<section class="panel budget-schedules"><div class="section-head"><h2>Upcoming cash flow</h2>'+button('Add bill or payday','budget-schedule-new','primary')+'</div>'+
   (plan.schedules.length?'<div class="finance-recent-list">'+plan.schedules.map(x=>
    '<div class="budget-rule-row"><div><strong>'+esc(x.name)+'</strong><small>'+esc(x.frequency)+' · '+esc(x.startDate)+
     ' · '+budgetMoney(x.amountCents)+' '+(x.kind==='income'?'incoming':'outgoing')+'</small></div>'+
    '<div class="budget-row-actions">'+button('Edit','budget-schedule-edit','text-btn small','data-id="'+esc(x.id)+'"')+
     button('Remove','budget-schedule-delete','text-btn small','data-id="'+esc(x.id)+'"')+'</div></div>').join('')+'</div>':
    empty('Add recurring bills and paydays to build your financial calendar.'))+
   (upcoming.length?'<h3>Next scheduled dates</h3><div class="budget-occurrences">'+upcoming.map(e=>
    '<div class="budget-event"><div><strong>'+esc(e.name)+'</strong><small>'+esc(e.date)+' · '+(e.kind==='income'?'+':'−')+
    formatFinanceAmount(e.amountCents)+'</small></div>'+
    '<div class="budget-row-actions">'+button('Paid','budget-mark-paid','outline small','data-id="'+esc(e.id)+'" data-date="'+esc(e.date)+'"')+
    button('Skip','budget-mark-skipped','text-btn small','data-id="'+esc(e.id)+'" data-date="'+esc(e.date)+'"')+'</div></div>').join('')+
    '</div>':'')+
   (events.some(e=>e.status!=='pending')?'<details class="budget-completed"><summary>Paid or skipped planned dates</summary>'+
    events.filter(e=>e.status!=='pending').map(e=>'<div class="budget-event"><span>'+esc(e.date)+' · '+esc(e.name)+' · '+esc(e.status)+'</span>'+
    button('Undo','budget-mark-pending','text-btn small','data-id="'+esc(e.id)+'" data-date="'+esc(e.date)+'"')+'</div>').join('')+'</details>':'')+
   '<p class="hint">Paid and skipped are manual planning markers—not confirmations from the bank or edits to the transaction ledger.</p></section>'+
  '<section class="panel budget-limits"><div class="section-head"><div><p class="eyebrow">MONTHLY CATEGORY LIMITS</p><h2>'+esc(monthText)+'</h2></div>'+
   button('Add category limit','budget-limit-new','primary')+'</div>'+
   '<label class="field"><span>Month to review</span><input type="month" data-budget-month value="'+esc(month)+'"></label>'+
   (limits.length?'<div class="finance-insight-breakdown">'+limits.map(row=>{
    const percent=Math.max(0,Math.min(100,row.percent));
    return '<div class="finance-insight-breakdown-item"><div class="finance-insight-breakdown-text"><strong>'+esc(row.category)+
     '</strong><b>'+formatFinanceAmount(row.actualCents)+' / '+formatFinanceAmount(row.limitCents)+'</b></div>'+
     '<div class="finance-insight-meter"><span style="width:'+percent.toFixed(1)+'%"></span></div>'+
     '<small>'+(row.remainingCents<0?'Over by '+budgetMoney(-row.remainingCents):budgetMoney(row.remainingCents)+' remaining')+
     ' · '+row.percent.toFixed(0)+'% used</small>'+
     '<div class="budget-row-actions">'+button('Edit','budget-limit-edit','text-btn small','data-category="'+esc(row.category)+'"')+
      button('Remove','budget-limit-delete','text-btn small','data-category="'+esc(row.category)+'"')+'</div></div>';
   }).join('')+'</div>':empty('Set a monthly category limit to compare with logged expenses.'))+
   '<p class="hint">Limits use classified expenses from the transaction ledger, not cash-flow projections. Uncategorized expenses can make these totals incomplete.</p></section>';
}
function budgetLimitForm(item=null){
 modal(item?'Edit category limit':'Add category limit','<form class="form" data-form="budget-limit">'+
  '<input type="hidden" name="previousCategory" value="'+esc(item?.category||'')+'">'+
  '<label class="field"><span>Category</span><select name="category">'+FINANCE_CATEGORIES.filter(x=>!['Uncategorized','Income','Transfers'].includes(x)).map(x=>
   '<option value="'+esc(x)+'"'+(item?.category===x?' selected':'')+'>'+esc(x)+'</option>').join('')+'</select></label>'+
  input('Monthly limit (USD)','budgetAmount',budgetValue(item?.amountCents||0),'text','required inputmode="decimal" placeholder="200.00"')+
  '<button class="primary" type="submit">Save monthly limit</button></form>');
}

function finances(){
 return '<div class="page-head finances-page-head"><p class="eyebrow">YOUR MONEY</p><h1>Finances<span class="accent">.</span></h1><p>Bank records and personal labels, together without losing the originals.</p></div>'+
 '<section class="panel finance-log"><div class="section-head"><div><p class="eyebrow">QUICK LOG</p><h2>New transaction</h2></div><span class="finance-count">USD</span></div>'+
 (financeNotice?'<p class="finance-notice" role="status">'+esc(financeNotice)+'</p>':'')+
 '<form class="finance-form" data-form="finance">'+financeFields()+'<button class="primary finance-save" type="submit">Save transaction</button></form>'+
 '<p class="hint">Enter an amount and your own description. Expand for category, subcategory, receipt date/time, and itemization.</p></section>'+
 financeRecent()+
 '<section class="panel budget-shortcut"><p class="eyebrow">PLAN AHEAD</p><h2>Budget & cash flow</h2>'+
 '<p>See upcoming bills, paydays, category limits and projected available cash.</p>'+
 button('Open budget planner','budget-open','primary')+'</section>'+
 '<section class="panel finance-insights-shortcut"><p class="eyebrow">SPENDING</p><h2>Where your money goes</h2>'+
 '<p>See spending by category and merchant with transfers separated.</p>'+
 button('View spending insights','finance-insights-open','primary')+'</section>'+
 '<section class="panel finance-import-card"><p class="eyebrow">BANK STATEMENTS</p><h2>Bank of America</h2>'+
 '<p class="body-copy">Import an original Bank of America transaction CSV, then give the same statement and your receipt photos to ChatGPT. The bank wording stays untouched; your label appears above it.</p>'+
 '<div class="finance-import-actions">'+button('Import bank CSV','finance-bofa-import','primary')+
 button('Export for ChatGPT','finance-export-enrichment','outline')+
 button('Classification review','classification-review-open','outline')+
 button('Manage merchant rules','classification-rules-open','outline')+
 button('Paste clarifications','finance-enrichment-paste','outline')+'</div>'+
 '<p class="hint">Assign an account and statement label before importing. Every import and every clarification shows a review before saving. Repeated overlapping bank exports won’t replace your personal descriptions.</p>'+
 '<details class="finance-more finance-legacy-csv"><summary>Other prepared CSV</summary><p class="body-copy">You can still import ordinary Everyday transaction CSV prepared from screenshots.</p><div class="finance-import-actions">'+
 button('Paste prepared CSV','finance-paste-csv','outline')+button('View CSV example','finance-csv-example','text-btn')+
 '</div></details></section>';
}
function financeEditForm(tx){
 if(!tx)return;
 modal('Edit transaction','<form class="form finance-edit-form" data-form="finance-edit"><input type="hidden" name="transactionId" value="'+esc(tx.id)+'">'+financeFields(tx,'edit')+
  '<div class="form-actions"><button class="primary" type="submit">Save changes</button>'+
  button('Delete','finance-delete','danger','data-id="'+esc(tx.id)+'"')+'</div></form>');
}
function financeCsvExample(){
 modal('Everyday transaction CSV','<p class="body-copy">This is the format ChatGPT can prepare from your bank screenshots or statement. Amount is positive; kind says expense, income or transfer.</p>'+
  '<label class="field"><span>Example</span><textarea class="finance-sample" rows="5" readonly spellcheck="false">'+esc(FINANCE_CSV_SAMPLE)+'</textarea></label>'+
  '<p class="hint">Dates: YYYY-MM-DD. Optional times: HH:MM. An externalId can identify a unique bank transaction. Check uncertain values before importing.</p>'+
  '<div class="form-actions">'+button('Paste prepared CSV','finance-paste-csv','primary')+button('Close','close','outline')+'</div>');
}
function financeBankModal(){
 pendingImport=null;importReadToken++;
 modal('Import Bank of America CSV','<form class="form finance-bank-import" data-form="finance-bank-import">'+
 '<p class="body-copy">Choose the CSV downloaded from Bank of America. The bank name, posted date and exact amount stay as imported; personal labels can be added separately.</p>'+
 input('Account label','accountLabel','BofA Checking','text','maxlength="120" placeholder="e.g. BofA Checking" required')+
 '<label class="field"><span>Bank statement CSV</span><input name="file" type="file" accept=".csv,text/csv" required></label>'+
 input('Statement / batch label','statementLabel','','text','maxlength="160" placeholder="Automatically suggested from CSV dates"')+
 '<p class="hint" data-bank-label-status aria-live="polite">This label will be filled from the statement dates after you select a CSV. You can edit it.</p>'+
 '<p class="hint">Summary lines before the real Date/Description/Amount header will be skipped. Checking, savings and common card exports are recognized. Review credits, payments and transfers carefully.</p>'+
 '<button type="submit" class="primary">Preview bank records</button></form><div id="preview" role="status"></div>');
}
// Automatically name the statement from its actual dates without changing record IDs.
// If the user wrote their own label, never replace it with an inferred suggestion.
async function inferSelectedBankLabel(form,file,token){
 const label=form.elements.statementLabel,status=form.querySelector('[data-bank-label-status]');
 if(!file)return;
 if(file.size>5_000_000){if(status)status.textContent='File exceeds the 5 MB import limit.';return;}
 try{
  const text=await file.text();
  if(token!==importReadToken||!form.isConnected)return;
  const suggested=inferBofaStatementLabel(text);
  if(!suggested){
   if(status)status.textContent='Could not determine the statement dates. Enter a batch label manually before previewing.';
   return;
  }
  if(!label.value.trim()||label.value===label.dataset.autoLabel){
   label.value=suggested;label.dataset.autoLabel=suggested;
   if(status)status.textContent='Suggested from the bank statement dates. Edit this label if you prefer.';
  }else if(status)status.textContent='Custom label retained. Suggested date range: '+suggested+'.';
 }catch(error){
  if(token===importReadToken&&form.isConnected&&status)status.textContent='Could not read the selected file: '+error.message;
 }
}
function financeEnrichmentPaste(){
 importModal('enrichment','paste');
 const dialog=document.querySelector('.modal'),title=dialog?.querySelector('.modal-top h2');
 if(title)title.textContent='Paste transaction clarifications';
 const form=dialog?.querySelector('form[data-form="import"]');
 if(!form)return;
 form.querySelector('textarea[name="text"]').placeholder='recordType,id,postedDate,kind,amountCents,bankDescription,accountLabel,statementLabel,bankDirection,description,category,subcategory,merchant,note,purchaseDate,time,itemization\n'+
  'enrichment,bofa-...,2026-10-27,expense,719,RAW BANK DESCRIPTION,BofA Checking,October 2026,debit,Water cases,Household Supplies,Water,Wawa,,2026-10-26,15:30,"2 water cases — $7.19"';
 form.insertAdjacentHTML('afterbegin','<p class="body-copy">Paste the enrichment CSV returned by ChatGPT using the Everyday export. Rows update existing IDs only. Bank descriptions, bank dates and bank amounts are checked and protected.</p>');
}
function financeExportEnrichment(){
 if(!(data.transactions||[]).length){alert('Import or log transactions first so there are record IDs to clarify.');return;}
 const csv=financeEnrichmentCSV(data.transactions);
 const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),link=document.createElement('a');
 link.href=URL.createObjectURL(blob);
 link.download='everyday-finance-for-chatgpt-'+localDate()+'.csv';
 link.click();
 setTimeout(()=>URL.revokeObjectURL(link.href),1000);
}
function financeCsvPaste(){
 importModal('csv','paste');
 const dialog=document.querySelector('.modal'),title=dialog?.querySelector('.modal-top h2');
 if(title)title.textContent='Paste prepared transactions';
 const form=dialog?.querySelector('form[data-form="import"]');
 if(!form)return;
 form.querySelector('textarea[name="text"]').placeholder=FINANCE_CSV_SAMPLE;
 form.insertAdjacentHTML('afterbegin','<p class="body-copy">Paste prepared transaction CSV from ChatGPT, preview the rows, then confirm. Screenshots are processed in ChatGPT, not uploaded to Everyday.</p>');
}

function foodTotals(totals){
  return `<span class="food-total-grid"><span><small>CALORIES</small><span class="food-total-number"><strong>${Math.round(totals.calories)}</strong><span>/ ${data.settings.calories}</span></span><span class="bar"><span style="width:${Math.min(100,Math.max(0,totals.calories/data.settings.calories*100))}%;background:#d8eb86"></span></span></span><span><small>PROTEIN</small><span class="food-total-number"><strong>${Math.round(totals.protein)}g</strong><span>/ ${data.settings.protein}g</span></span><span class="bar"><span style="width:${Math.min(100,Math.max(0,totals.protein/data.settings.protein*100))}%;background:#9fd9bf"></span></span></span></span>`;
}
function foodEntryDetail(e){return `${e.t!=null?(currentFoodTrackingDate(e)!==e.date?niceDate(e.date)+' · ':'')+foodTimeLabel(e.t)+' · ':''}${fmt(e.calories*e.quantity)} cal · ${fmt(e.protein*e.quantity)}g protein${e.quantity!==1?` · ${fmt(e.quantity)} servings`:''}`;}
function foodMatches(name){
 const normalize=value=>value.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(),wanted=normalize(name);if(wanted.length<2)return [];const wantedWords=new Set(wanted.split(' ').filter(Boolean));
 return data.foods.map(food=>{const candidate=normalize(food.name),words=new Set(candidate.split(' ').filter(Boolean)),shared=[...wantedWords].filter(word=>words.has(word)).length,union=new Set([...wantedWords,...words]).size;const score=wanted===candidate?1:candidate.startsWith(wanted)?.95:candidate.includes(wanted)?.9:wanted.includes(candidate)?.85:union?shared/union:0;return{food,score};}).filter(x=>x.score>=.35).sort((a,b)=>b.score-a.score||(b.food.lastUsed||'').localeCompare(a.food.lastUsed||'')).slice(0,5).map(x=>x.food);
}
function renderFoodMatches(form){
 const box=form.querySelector('.food-matches'),matches=foodMatches(form.elements.name.value);form.elements.cardId.value='';
 const saveOption=form.querySelector('.save-new-food-option');if(saveOption)saveOption.hidden=false;
 box.innerHTML=matches.length?'<span class="food-match-label">Saved foods</span>'+matches.map(food=>'<button type="button" class="food-match" data-action="choose-food-match" data-id="'+esc(food.id)+'"><span><strong>'+esc(food.name)+'</strong><small>'+fmt(food.calories)+' cal · '+fmt(food.protein)+'g protein</small></span><b>Use</b></button>').join(''):'';
}
function foodLog(){
  const entries=foodEntriesNewestFirst(data.foodEntries.filter(e=>currentFoodTrackingDate(e)===chosenDate));
  modal(`Food log · ${niceDate(chosenDate)}`,`<div class="food-log-totals">${foodTotals(foodDayTotals(chosenDate))}</div><p class="hint">${esc(chosenDate)} · ${entries.length} entr${entries.length===1?'y':'ies'} · untimed entries first · then newest recorded time</p><div class="full-food-log">${entries.length?entries.map(e=>`<div class="list-row"><span><strong>${esc(e.name)}</strong><small>${foodEntryDetail(e)}</small></span>${button('Edit','edit-entry','text-btn',`data-id="${esc(e.id)}" aria-label="Edit ${esc(e.name)}"`)}</div>`).join(''):empty('Nothing logged for this date yet.')}</div><div class="form-actions spaced">${button('+ Add food','new-food','primary')}</div>`);
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
 const totals=foodDayTotals(chosenDate),calLeft=Math.max(0,data.settings.calories-totals.calories),proteinLeft=Math.max(0,data.settings.protein-totals.protein);
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
 const defaults={anchorId:'',preferIds:[],excludedIds:[],hiddenShapes:[],searchQuery:''};
 const next={...defaults,...(state||{})};next.preferIds=[...new Set(next.preferIds||[])];next.excludedIds=[...new Set(next.excludedIds||[])];next.hiddenShapes=[...new Set(next.hiddenShapes||[])];
 if(next.excludedIds.includes(next.anchorId))next.anchorId='';
 foodSuggestionState=next;
 const totals=foodDayTotals(chosenDate),calLeft=Math.max(0,data.settings.calories-totals.calories),proteinLeft=Math.max(0,data.settings.protein-totals.protein),recent=recentSuggestionFoods(),suggestions=suggestionCombos(next.anchorId,null,next);
 foodSuggestionState.suggestions=suggestions;
 const anchor=next.anchorId,anchorFood=data.foods.find(f=>f.id===anchor),excluded=next.excludedIds.map(id=>data.foods.find(f=>f.id===id)).filter(Boolean),preferred=next.preferIds.map(id=>data.foods.find(f=>f.id===id)).filter(Boolean);
 const feedbackSummary=(excluded.length||preferred.length)?'<div class="suggestion-feedback-summary">'+(preferred.length?'<div><small>Favoring</small>'+preferred.map(f=>'<button type="button" data-action="food-suggest-unprefer" data-id="'+esc(f.id)+'">'+esc(f.name)+' ×</button>').join('')+'</div>':'')+(excluded.length?'<div><small>Avoiding this round</small>'+excluded.map(f=>'<button type="button" data-action="food-suggest-restore" data-id="'+esc(f.id)+'">'+esc(f.name)+' ×</button>').join('')+'</div>':'')+'</div>':'';
 const selectedAnchor=anchorFood?'<div class="suggestion-selected-anchor"><span><small>Starting with</small><strong>'+esc(anchorFood.name)+'</strong></span><button type="button" class="text-btn" data-action="food-suggest-anchor" data-id="">Clear</button></div>':'';
 modal('Fill the rest of your day','<div class="food-suggestions"><div class="suggestion-target"><span><small>Calories left</small><strong>'+Math.round(calLeft)+'</strong></span><span><small>Protein left</small><strong>'+Math.round(proteinLeft)+'g</strong></span></div><div class="suggestion-anchor"><span class="buddy-mini-label">START WITH</span><label class="suggestion-search"><span>Find any saved food</span><input type="search" data-suggestion-search value="'+esc(next.searchQuery||'')+'" placeholder="Search Saved Foods"></label><div class="suggestion-search-results" data-suggestion-search-results>'+suggestionSearchRows(next.searchQuery,next.excludedIds)+'</div>'+selectedAnchor+'<div class="suggestion-anchor-recent"><small>Recent</small><div class="suggestion-chips"><button type="button" class="'+(!anchor?'selected':'')+'" data-action="food-suggest-anchor" data-id="">Anything</button>'+recent.filter(f=>!next.excludedIds.includes(f.id)).map(f=>'<button type="button" class="'+(anchor===f.id?'selected':'')+'" data-action="food-suggest-anchor" data-id="'+esc(f.id)+'">'+esc(f.name)+'</button>').join('')+'</div></div></div>'+feedbackSummary+'<p class="body-copy">Ranked from your remaining goals plus your own logging history. Search or Recent can force a specific starting food. Feedback below only changes this suggestion round.</p>'+(suggestions.length?'<div class="suggestion-list">'+suggestions.map((s,i)=>'<article class="suggestion-card suggestion-card-feedback"><div class="suggestion-card-copy"><span>'+s.items.map(x=>'<strong>'+(x.q===1?'':fmt(x.q)+'× ')+esc(x.food.name)+'</strong>').join('')+'</span><em>'+esc(s.reason)+'</em></div><div class="suggestion-card-macros">'+Math.round(s.calories)+' cal · '+Math.round(s.protein)+'g protein</div><div class="suggestion-card-actions"><button type="button" class="primary small" data-action="apply-food-suggestion" data-index="'+i+'">Add</button><button type="button" class="text-btn" data-action="food-suggest-more" data-index="'+i+'">More like this</button><button type="button" class="text-btn" data-action="food-suggest-avoid" data-index="'+i+'">Avoid…</button><button type="button" class="text-btn" data-action="food-suggest-skip" data-index="'+i+'">Skip</button></div></article>').join('')+'</div>':'<p class="empty">No combinations match the current feedback. Remove an avoided item or reset Start with to Anything.</p>')+'</div>');
}
function foodSuggestionAvoidPicker(index){
 const suggestion=foodSuggestionState?.suggestions?.[index];if(!suggestion)return;
 if(suggestion.items.length===1){foodSuggestions({...foodSuggestionState,excludedIds:[...(foodSuggestionState.excludedIds||[]),suggestion.items[0].food.id]});return;}
 const snapshot={...foodSuggestionState};
 modal('Avoid an item', '<div class="suggestion-avoid-picker"><p class="body-copy">Exclude one item from this suggestion round. This does not change the saved food itself.</p>'+suggestion.items.map(x=>'<button type="button" class="food-library-item" data-action="food-suggest-exclude" data-id="'+esc(x.food.id)+'"><span><strong>'+esc(x.food.name)+'</strong><small>Hide from current suggestions</small></span><b>×</b></button>').join('')+'</div>',()=>foodSuggestions(snapshot));
}

function food() {
  const totals=foodDayTotals(chosenDate),entries=foodEntriesNewestFirst(data.foodEntries.filter(x=>currentFoodTrackingDate(x)===chosenDate));
  const pinned=sortFoods(data.foods.filter(f=>f.pinned===true),foodSort),foods=sortFoods(data.foods.filter(f=>f.pinned!==true),foodSort);
  const pinnedSection=pinned.length?'<section class="pinned-foods"><div class="section-head food-section-title"><h2>Favorites</h2></div><div class="food-grid pinned-food-grid">'+pinned.map(f=>foodQuickCard(f,true)).join('')+'</div></section>':'';
  return '<div class="page-head food-page-head"><p class="eyebrow">NUTRITION</p><h1>Food tracking<span class="accent">.</span></h1></div>'+dateHeader('Viewing')+'<section class="food-day"><button type="button" class="daily-food-card" data-action="food-log" aria-label="Open complete food log for '+esc(chosenDate)+'" aria-haspopup="dialog">'+foodTotals(totals)+'<span class="food-preview-heading"><strong>'+(chosenDate===currentTrackingDate()?"Today's food log":'Food log · '+esc(niceDate(chosenDate)))+'</strong><small>'+entries.length+' entr'+(entries.length===1?'y':'ies')+'</small></span><span class="food-preview">'+(entries.length?entries.slice(0,3).map(e=>'<span class="food-preview-row"><strong>'+esc(e.name)+'</strong><small>'+foodEntryDetail(e)+'</small></span>').join(''):'<span class="food-preview-empty">Nothing logged for this date yet.</span>')+'</span><span class="food-log-open">'+(entries.length>3?'View all '+entries.length+' entries':'Open full food log')+' <span aria-hidden="true">↗</span></span></button><div class="food-add-row">'+button('+ Log food','new-food','primary small')+button('Suggest rest of day','food-suggest','outline small')+'</div></section>'+pinnedSection+'<section><div class="section-head food-section-title"><h2>More foods</h2><div class="section-actions">'+foodSortControl(foodSort,'food-page')+button('Food Library','food-library','outline small')+'</div></div>'+(foods.length?'<div class="food-grid">'+foods.map(f=>foodQuickCard(f)).join('')+'</div>':pinned.length?'<p class="hint">All saved foods are in Favorites.</p>':empty('Saved foods appear here for quick logging. Use Food Library to create definitions without adding them to a day.'))+'</section>';
}
function savedWorkouts(){return Array.isArray(data.workoutTemplates)?data.workoutTemplates:Object.entries(templateExercises).map(([name,exercises],i)=>({id:'legacy-'+i,name,exercises}));}
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

/* One canonical exercise-card renderer, shared by Lifting, Buddy, Library, and Progress. */
function buddyMovementLabel(e){
 const type=buddyMovement(e);if(type==='neutral')return '';
 return '<span class="exercise-movement-label movement-'+type+'" aria-label="'+type+' movement"><b aria-hidden="true">'+(type==='push'?'↗':'↙')+'</b> '+type.toUpperCase()+'</span>';
}
function exerciseCardMarkup(e,{action,attrs='',modifier='',summary='',trailing='›',right='',setup=e.setup||''}={}){
 const equipment=esc(e.equipment||'other'),name=esc(e.name),movement=buddyMovement(e);
 return `<button type="button" class="exercise exercise-card ${esc(modifier)} equipment-${equipment} movement-${movement}" data-action="${esc(action)}" ${attrs}><span class="equipment-art" aria-hidden="true">${equipmentGlyph(e.equipment)}</span><span class="exercise-copy"><span class="exercise-card-type-row"><small class="equipment-label">${equipmentLabel(e.equipment)}</small>${buddyMovementLabel(e)}</span><span class="exercise-name-row"><strong>${name}</strong>${setup?`<small class="exercise-setup-inline">${esc(setup)}</small>`:''}</span>${summary?`<small class="exercise-card-summary">${summary}</small>`:''}</span>${right||`<b class="exercise-card-trailing" aria-hidden="true">${esc(trailing)}</b>`}</button>`;
}

function exerciseCardWithMuscles(e,card){
 return '<div class="exercise-muscle-wrapper">'+card+
 '<button type="button" class="exercise-muscle-peek" data-action="muscle-guide" data-name="'+esc(e.name)+'" data-equipment="'+esc(e.equipment||'other')+'" aria-label="Show muscle diagram for '+esc(e.name)+'" title="Muscle groups">'+muscleMiniMarkup(e.name)+'</button></div>';
}
function openMuscleGuide(name,equipment='other',onBack=null){
 if(!name)return;
 modal(name+' · Muscles',muscleGuideMarkup(name),onBack);
}
function muscleRelatedExercises(group){
 return (data.exerciseDefinitions||[]).flatMap(e=>{
  const profile=exerciseMuscleProfile(e.name);
  const role=profile?.primary.includes(group)?'primary':profile?.secondary.includes(group)?'secondary':null;
  return role?[{name:e.name,equipment:e.equipment||'other',role}]:[];
 }).sort((a,b)=>a.name.localeCompare(b.name));
}
function openMuscleGroupDetail(group,name){
 if(!group||!name)return;
 modal(muscleGroupLabel(group),muscleGroupDetailsMarkup(group,muscleRelatedExercises(group)),()=>openMuscleGuide(name));
}
function exerciseCard(e){const prior=lastLift(e.name,'',e.equipment);return exerciseCardMarkup(e,{action:'new-lift',attrs:`data-name="${esc(e.name)}" data-equipment="${esc(e.equipment)}"`,summary:esc(prior?`Last: ${describeLift(prior)}`:'First time · start where you are'),trailing:'+'});}

function filteredExerciseLibrary(){
 let defs=[...(data.exerciseDefinitions||[])],q=exerciseLibrarySearch.trim().toLowerCase();
 if(q)defs=defs.filter(e=>e.name.toLowerCase().includes(q)||equipmentLabel(e.equipment).toLowerCase().includes(q)||(e.setup||'').toLowerCase().includes(q));
 if(exerciseLibraryFilter!=='all')defs=defs.filter(e=>e.equipment===exerciseLibraryFilter);
 return defs.sort((a,b)=>exerciseLibrarySort==='equipment'?a.equipment.localeCompare(b.equipment)||a.name.localeCompare(b.name):a.name.localeCompare(b.name)||a.equipment.localeCompare(b.equipment));
}
function exerciseLibraryRows(){
 const defs=filteredExerciseLibrary();
 return defs.length?defs.map(e=>exerciseCardMarkup(e,{action:'edit-exercise-def',attrs:`data-id="${esc(e.id)}"`,modifier:'library-exercise',summary:e.setup?'':esc('No setup saved')})).join(''):'<p class="empty">No exercises match these filters.</p>';
}
function refreshExerciseLibraryList(){
 const list=document.querySelector('.exercise-library-list'),count=document.querySelector('[data-exercise-library-count]');if(list)list.innerHTML=exerciseLibraryRows();if(count)count.textContent=filteredExerciseLibrary().length+' shown';
}
function exerciseLibrary(){
 const equipment=['all','machine','cable','dumbbell','bench','calisthenics','other'];
 modal('Exercise Library',`<div class="exercise-library"><div class="library-intro"><p class="body-copy">Canonical exercise definitions live here. Editing one changes the exercise used by every workout that references it, without logging anything today.</p><button type="button" class="primary small" data-action="new-exercise-def">+ New exercise</button></div><div class="library-search-row"><label class="library-search"><span>Search</span><input type="search" data-library-search="exercise" value="${esc(exerciseLibrarySearch)}" placeholder="Search exercises"></label><label class="sort-control"><span>Filter</span><select data-library-filter="exercise">${equipment.map(x=>`<option value="${x}" ${exerciseLibraryFilter===x?'selected':''}>${x==='all'?'All equipment':equipmentLabel(x)}</option>`).join('')}</select></label><label class="sort-control"><span>Sort</span><select data-sort-scope="exercise-library"><option value="name" ${exerciseLibrarySort==='name'?'selected':''}>A–Z</option><option value="equipment" ${exerciseLibrarySort==='equipment'?'selected':''}>Equipment</option></select></label></div><div class="library-result-count" data-exercise-library-count>${filteredExerciseLibrary().length} shown</div><div class="exercise-library-list">${exerciseLibraryRows()}</div></div>`);
}
function exerciseDefinitionForm(def=null,returnTo='library'){
 const options=['machine','cable','dumbbell','bench','calisthenics','other'].map(x=>`<option value="${x}" ${x===(def?.equipment||'machine')?'selected':''}>${equipmentLabel(x)}</option>`).join('');
 modal(def?'Edit exercise':'New exercise',`<form class="form exercise-definition-form" data-form="exercise-definition"><input type="hidden" name="exerciseId" value="${esc(def?.id||'')}"><input type="hidden" name="returnTo" value="${esc(returnTo)}">${input('Exercise name','name',def?.name||'','text','maxlength="100" required')}<label class="field"><span>Equipment</span><select name="equipment">${options}</select></label><label class="field"><span>Setup / machine setting</span><input name="setup" type="text" maxlength="200" value="${esc(def?.setup||'')}" placeholder="Seat position, handle, machine setting…"></label><p class="hint">This is the shared exercise definition. Workout-specific rep ranges are edited on the workout itself.</p><div class="form-actions"><button class="primary" type="submit">Save exercise</button></div></form>`,()=>returnTo==='routine'?workoutExercisePicker():exerciseLibrary());
}

const routinePresets=[
 {key:'blank',name:'Blank routine',description:'Build your own exercise list',exercises:[]},
 {key:'upper',name:'Upper body',description:'Pressing, pulling and arms',source:'Upper'},
 {key:'lower',name:'Lower body',description:'Legs, glutes and calves',source:'Lower'},
 {key:'full',name:'Full body',description:'Upper body, lower body and core',source:'Full body'},
 {key:'push',name:'Push day',description:'Chest, shoulders and triceps',ids:['exercise-machine-chest-press','exercise-machine-shoulder-press','exercise-cable-triceps-pushdown','exercise-dumbbell-lateral-raise']},
 {key:'pull',name:'Pull day',description:'Back and biceps',ids:['exercise-machine-lat-pulldown','exercise-machine-seated-row','exercise-dumbbell-bicep-curl']},
 {key:'legs',name:'Leg day',description:'Quads, hamstrings, glutes and calves',ids:['exercise-machine-seated-leg-press','exercise-machine-leg-curl','exercise-machine-leg-extension','exercise-machine-glute-kickback','exercise-machine-calf-extension']}
];
function nextRoutineName(base){
 const used=new Set((data.workoutTemplates||[]).map(w=>w.name.trim().toLowerCase()));
 const name=String(base||'New routine').trim().slice(0,70)||'New routine';
 if(!used.has(name.toLowerCase()))return name;
 let n=2;while(used.has((name+' '+n).toLowerCase()))n++;
 return name+' '+n;
}
function routinePresetExercises(preset){
 if(preset.source)return structuredClone(templateExercises[preset.source]||[]);
 if(Array.isArray(preset.ids))return preset.ids.filter(exerciseId=>data.exerciseDefinitions?.some(def=>def.id===exerciseId)).map(exerciseId=>({exerciseId,repMin:exerciseId==='exercise-machine-calf-extension'?10:6,repMax:exerciseId==='exercise-machine-calf-extension'?16:12,targetSets:2,restSeconds:90}));
 return [];
}
function routineStarterPicker(){
 modal('New routine','<div class="routine-library"><p class="body-copy">Start blank or use an editable framework. Nothing is saved until you confirm.</p><div class="routine-list">'+routinePresets.map(p=>'<button type="button" class="routine-starter" data-action="routine-starter" data-key="'+p.key+'"><span><strong>'+esc(p.name)+'</strong><small>'+esc(p.description)+'</small></span><b>＋</b></button>').join('')+'</div></div>',()=>routineManager());
}
function routineManager(){
 const items=savedWorkouts(),last=routineDeletedStack.at(-1);
 const undo=last?'<div class="routine-undo" role="status"><span><strong>'+esc(last.routine.name)+' deleted</strong><small>Undo is available until this tab is reloaded.</small></span><button type="button" data-action="routine-undo-delete">Undo</button></div>':'';
 modal('My routines','<div class="routine-library"><p class="body-copy">Edit, duplicate, or delete routines here. Choose a routine using the tabs on Lifting. Completed workout history is kept.</p><button type="button" class="primary routine-create" data-action="routine-new">+ Create routine</button>'+undo+'<div class="routine-list">'+(items.length?items.map(w=>'<div class="routine-library-row"><span><strong>'+esc(w.name)+'</strong><small>'+w.exercises.length+' exercise'+(w.exercises.length===1?'':'s')+'</small></span><div class="routine-row-actions"><button type="button" data-action="routine-edit" data-id="'+esc(w.id)+'">Edit</button><button type="button" data-action="routine-copy" data-id="'+esc(w.id)+'">Copy</button><button type="button" class="routine-delete" data-action="routine-delete-prompt" data-id="'+esc(w.id)+'">Delete</button></div></div>').join(''):'<p class="empty">No routines yet. Create one from a starter framework or a blank list.</p>')+'</div></div>');
}
function routineDeletePrompt(routine){
 if(!routine)return;
 if(data.activeWorkout?.workoutId===routine.id){alert('Finish or end the active workout before deleting its routine.');return;}
 modal('Delete routine?', '<div class="routine-delete-confirm"><p><strong>'+esc(routine.name)+'</strong> will be deleted from your routine library.</p><p class="hint">Your logged sets and completed workout history will not be deleted. You can undo this deletion until you reload Everyday.</p><button type="button" class="danger" id="routine-delete-confirm" data-action="routine-delete-confirm" data-id="'+esc(routine.id)+'" disabled>Delete routine · 3</button><button type="button" class="outline" data-action="close">Cancel</button></div>',()=>routineManager());
 const confirmButton=document.querySelector('#routine-delete-confirm');
 if(!confirmButton)return;
 for(let seconds=2;seconds>=0;seconds--){
  const delay=(3-seconds)*1000;
  setTimeout(()=>{if(!confirmButton.isConnected)return;if(seconds){confirmButton.textContent='Delete routine · '+seconds;}else{confirmButton.disabled=false;confirmButton.textContent='Delete routine';}},delay);
 }
}

function newRoutineEditor(name,exercises){
 workoutEditorState={id:null,isNew:true,name:nextRoutineName(name),exercises:structuredClone(exercises||[])};
 workoutTemplateForm(null,true);
}

function workoutEditorCapture(){
 const form=document.querySelector('form[data-form="workout-template"]');if(!form||!workoutEditorState)return;
 if(form.elements.workoutName)workoutEditorState.name=form.elements.workoutName.value;
 [...form.querySelectorAll('[data-workout-row]')].forEach(row=>{
   const i=Number(row.dataset.workoutRow),item=workoutEditorState.exercises[i];if(!item)return;
   const min=Number(row.querySelector('[name=repMin]')?.value),max=Number(row.querySelector('[name=repMax]')?.value),sets=Number(row.querySelector('[name=targetSets]')?.value),rest=Number(row.querySelector('[name=restSeconds]')?.value);
   if(Number.isInteger(min))item.repMin=min;if(Number.isInteger(max))item.repMax=max;if(Number.isInteger(sets))item.targetSets=sets;if(Number.isInteger(rest))item.restSeconds=rest;
 });
}
function workoutEditorRow(item,i,total){
 const e=resolveWorkoutExercise(item);if(!e)return'';
 return `<section class="workout-template-row exercise-card-surface equipment-${esc(e.equipment)} movement-${buddyMovement(e)}" data-workout-row="${i}">${buddyMovementCorner(e)}<div class="workout-template-head"><div class="workout-template-title"><span class="equipment-mini">${equipmentGlyph(e.equipment)}</span><span><small>${equipmentLabel(e.equipment)}</small><strong>${esc(e.name)}</strong>${e.setup?`<em>Setup: ${esc(e.setup)}</em>`:''}<button type="button" class="routine-muscle-link routine-muscle-mini" data-action="routine-muscle-guide" data-index="${i}" aria-label="Show muscles for ${esc(e.name)}">${muscleMiniMarkup(e.name)}</button></span></div><div class="workout-order-actions"><button type="button" data-action="workout-move" data-index="${i}" data-direction="-1" ${i===0?'disabled':''} aria-label="Move ${esc(e.name)} up">↑</button><button type="button" data-action="workout-move" data-index="${i}" data-direction="1" ${i===total-1?'disabled':''} aria-label="Move ${esc(e.name)} down">↓</button><button type="button" class="remove" data-action="workout-remove" data-index="${i}" aria-label="Remove ${esc(e.name)}">×</button></div></div><div class="workout-program-grid"><label class="field"><span>Min reps</span><input name="repMin" type="number" min="1" max="100" step="1" value="${item.repMin||6}"></label><label class="field"><span>Max reps</span><input name="repMax" type="number" min="1" max="100" step="1" value="${item.repMax||12}"></label><label class="field"><span>Sets</span><input name="targetSets" type="number" min="1" max="10" step="1" value="${item.targetSets||2}"></label><label class="field"><span>Rest (sec)</span><input name="restSeconds" type="number" min="0" max="1800" step="15" value="${item.restSeconds??90}"></label></div></section>`;
}
function workoutTemplateForm(name=null,preserve=false){
 if(!preserve){
   const w=workoutByName(name);if(!w)return;
   workoutEditorState={id:w.id,isNew:false,name:w.name,exercises:structuredClone(w.exercises)};
 }
 if(!workoutEditorState)return;
 const state=workoutEditorState;
 modal(state.isNew?'Create routine':'Edit routine',`<form class="form workout-template-form" data-form="workout-template">${input('Routine name','workoutName',state.name,'text','maxlength="80" required')}<p class="hint">Change the order, rep ranges, sets and rest times. Editing a routine never changes completed workout logs.</p><div class="workout-template-list">${state.exercises.length?state.exercises.map((item,i)=>workoutEditorRow(item,i,state.exercises.length)).join(''):'<p class="empty">This workout has no exercises yet.</p>'}</div><div class="workout-editor-actions"><button type="button" class="outline" data-action="workout-add-picker">+ Add exercise</button><button class="primary" type="submit">${state.isNew?'Create routine':'Save routine'}</button></div></form>`);
}
function workoutExercisePicker(){
 if(!workoutEditorState)return;
 workoutEditorCapture();
 const used=new Set(workoutEditorState.exercises.map(x=>x.exerciseId)),defs=[...(data.exerciseDefinitions||[])].filter(e=>!used.has(e.id)).sort((a,b)=>a.name.localeCompare(b.name));
 const cards=defs.length?defs.map(e=>exerciseCardMarkup(e,{
   action:'workout-add-exercise',
   attrs:'data-id="'+esc(e.id)+'" data-search="'+esc((e.name+' '+equipmentLabel(e.equipment)+' '+(e.setup||'')).toLowerCase())+'"',
   modifier:'library-exercise workout-add-item',
   summary:e.setup?'':'No setup saved',
   trailing:'+'
 })).join(''):'<p class="empty">Every exercise in your library is already in this workout.</p>';
 modal('Add exercise','<div class="workout-add-picker"><button type="button" class="primary routine-add-new" data-action="routine-new-exercise">+ New exercise</button><label class="library-search"><span>Search Exercise Library</span><input type="search" data-workout-add-search placeholder="Search exercises"></label><div class="workout-add-list">'+cards+'</div></div>',()=>workoutTemplateForm(null,true));
}
const isoNow=()=>new Date().toISOString();
const buddySeconds=(a,b=isoNow())=>a&&b?Math.max(0,Math.round((new Date(b)-new Date(a))/1000)):0;
const buddyClock=value=>{value=Math.max(0,Math.floor(value||0));const h=Math.floor(value/3600),m=Math.floor(value%3600/60),s=value%60;return h?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${m}:${String(s).padStart(2,'0')}`;};
const buddyKey=e=>`${e.name.toLowerCase()}|${e.equipment}`;
const buddyFind=(s,key)=>s.exercises.find(e=>buddyKey(e)===key);
function buddyPrior(e){return lastLift(e.name,'',e.equipment,currentTrackingDate());}

function buddyMovement(e){
 const name=e.name.toLowerCase();
 if(/press|extension|tricep|push|kickback/.test(name))return 'push';
 if(/row|pulldown|pull down|curl|deadlift/.test(name))return 'pull';
 return 'neutral';
}
function buddyMovementCorner(e){const type=buddyMovement(e);if(type==='neutral')return '';return '<span class="buddy-movement-corner" aria-label="'+type+' movement"><b>'+(type==='push'?'↗':'↙')+'</b>'+type.toUpperCase()+'</span>';}
function buddyHistory(e){
 const key=exerciseHistoryKey(e.name,e.equipment);
 return data.lifts.filter(l=>exerciseHistoryKey(l.exercise,l.equipment||'other')===key&&l.date<=(data.activeWorkout?.date||currentTrackingDate())&&l.buddySessionId!==data.activeWorkout?.id).sort((a,b)=>b.date.localeCompare(a.date));
}
function buddyLastTwo(lift){
 return (lift?.sets||[]).slice(-2).map(set=>fmt(set.weight)+' '+data.settings.unit+' × '+set.reps+(set.difficulty?' · '+effortText(set.difficulty):'')).join(' · ');
}
function buddyPreviousOrder(w){
 const previous=(data.workoutHistory||[]).filter(s=>s.workoutId===w.id||s.type===w.name).slice().sort((a,b)=>Date.parse(b.startedAt||0)-Date.parse(a.startedAt||0))[0];
 if(!previous)return[];
 if(Array.isArray(previous.performedOrder)&&previous.performedOrder.length)return previous.performedOrder;
 return(previous.exercises||[]).map(e=>({key:buddyKey(e),when:e.sets?.[0]?.startedAt||e.selectedAt||''})).filter(x=>x.when).sort((a,b)=>Date.parse(a.when)-Date.parse(b.when)).map(x=>x.key);
}
function buddyJournalScreen(head,e){
 const past=buddyHistory(e).slice(0,20);
 const rows=past.map(l=>'<article class="buddy-journal-row"><div><strong>'+esc(niceDate(l.date))+'</strong><small>'+esc((l.sets||[]).length+' sets')+'</small></div><p>'+esc(describeLift(l))+'</p>'+(l.notes?'<blockquote>'+esc(l.notes)+'</blockquote>':'')+'</article>').join('');
 return '<div class="buddy-screen">'+head+'<main class="buddy-main buddy-journal-view"><button class="buddy-back" data-action="buddy-journal-toggle">‹ Back to exercise</button><h1>'+esc(e.name)+'</h1><p class="body-copy">Dated sets, effort, and notes from previous sessions.</p>'+(e.notes?'<article class="buddy-journal-row"><strong>This session</strong><p>'+esc(e.notes)+'</p></article>':'')+(rows||'<p class="empty">No prior exercise logs yet.</p>')+'</main></div>';
}

function buddyTargetSets(e){const sets=Number(e.targetSets);return Number.isInteger(sets)&&sets>=1&&sets<=10?sets:2;}
function buddyRepRange(e){return {min:Number(e.repMin)||(e.name==='Calf Extension'?10:6),max:Number(e.repMax)||(e.name==='Calf Extension'?16:12)};}
function buddyEffortButtons(value){return Object.entries(effortLabels).map(([n,label])=>`<button type="button" class="buddy-effort effort-${n} ${Number(value)===Number(n)?'selected':''}" data-action="buddy-effort" data-value="${n}" aria-pressed="${Number(value)===Number(n)}"><b>${n}</b><span>${label}</span></button>`).join('');}

/* Reuse the exact set controls in Workout Buddy and archived exercise editing. */
function buddySetControlsMarkup(d){
 const weightStep=data.settings.unit==='kg'?1.1:2.5;
 return `<div class="buddy-set-editor"><div class="buddy-number-field"><span>Weight</span><div class="buddy-stepper"><button type="button" data-action="buddy-adjust" data-field="weight" data-delta="-${weightStep}">−</button><button type="button" data-action="buddy-adjust" data-field="weight" data-delta="${weightStep}">+</button></div><div class="buddy-number-input"><input name="buddyWeight" type="number" min="0" step="${weightStep}" inputmode="decimal" value="${esc(d.weight)}"><small>${esc(data.settings.unit)}</small></div></div><div class="buddy-number-field"><span>Reps</span><div class="buddy-stepper"><button type="button" data-action="buddy-adjust" data-field="reps" data-delta="-1">−</button><button type="button" data-action="buddy-adjust" data-field="reps" data-delta="1">+</button></div><input name="buddyReps" type="number" min="1" step="1" inputmode="numeric" value="${esc(d.reps)}"></div><input type="hidden" name="buddyDifficulty" value="${d.difficulty||0}"></div><div class="buddy-effort-wrap"><span>PERCEIVED EFFORT</span><div class="buddy-effort-grid">${buddyEffortButtons(d.difficulty)}</div></div>`;
}
function buddyReadNotes(){const s=data.activeWorkout,field=document.querySelector('[name=buddyNotes]');if(!s||!field||!s.selected)return;const e=buddyFind(s,s.selected);if(e)e.notes=field.value.slice(0,500);}
// Uncommitted Setup text stays in the active workout's recoverable draft.
// The exercise definition only changes after explicitly pressing Save.
function buddyReadSetupDraft(){
 const s=data.activeWorkout,field=document.querySelector('#buddy-root [name=buddySetup]');
 if(!s||!s.selected||!field)return;
 const e=buddyFind(s,s.selected);
 if(e?.setupEditing)e.setupDraft=field.value.slice(0,200);
}
function buddyCaptureUndo(s,label){const snapshot={label,phase:s.phase,selected:s.selected,exercises:structuredClone(s.exercises),performedOrder:structuredClone(s.performedOrder||[])};if(s.completedAt)snapshot.completedAt=s.completedAt;if(s.bikeCompletedAt)snapshot.bikeCompletedAt=s.bikeCompletedAt;s.undo=snapshot;}
function buddyUndo(s){if(!canUndoBuddyTransition(s))return;const u=s.undo;s.phase=u.phase;s.selected=u.selected;s.exercises=structuredClone(u.exercises);s.performedOrder=structuredClone(u.performedOrder||[]);if(u.completedAt)s.completedAt=u.completedAt;else delete s.completedAt;if(u.bikeCompletedAt)s.bikeCompletedAt=u.bikeCompletedAt;else delete s.bikeCompletedAt;delete s.undo;data.lifts=data.lifts.filter(l=>l.buddySessionId!==s.id);for(const e of s.exercises)if(e.status==='done')buddyUpsertLift(s,e);}
function buddyUndoControl(s){return canUndoBuddyTransition(s)?`<button type="button" class="buddy-undo" data-action="buddy-undo">↶ Undo ${esc(s.undo.label||'last action')}</button>`:'';}
function buddyDraft(e,index){return nextBuddySetDraft(e,index,buddyPrior(e));}
function buddyStart(type){const w=workoutByName(type);if(!w)return;const order=buddyPreviousOrder(w),rank=new Map(order.map((key,i)=>[key,i]));const exercises=workoutExercises(w).sort((a,b)=>(rank.get(buddyKey(a))??999)-(rank.get(buddyKey(b))??999));data.activeWorkout={id:id(),workoutId:w.id,type:w.name,date:currentTrackingDate(),startedAt:isoNow(),phase:'bike',selected:null,performedOrder:[],exercises:exercises.map(e=>({exerciseId:e.id,name:e.name,equipment:e.equipment,repMin:e.repMin||6,repMax:e.repMax||12,targetSets:e.targetSets||2,restSeconds:e.restSeconds??90,...(e.setup?{setup:e.setup}:{}),status:'pending',sets:[]}))};persist();}
function buddyReadEditor(){const s=data.activeWorkout,root=document.querySelector('.buddy-set-editor');if(!s||!root||!s.selected)return;const e=buddyFind(s,s.selected);if(!e)return;const reviewing=Number.isInteger(e.reviewSetIndex),d=reviewing?e.sets[e.reviewSetIndex]:e.draft||buddyDraft(e,e.sets.length);if(!d)return;d.weight=Math.max(0,Number(root.querySelector('[name=buddyWeight]')?.value)||0);d.reps=Math.max(1,Number(root.querySelector('[name=buddyReps]')?.value)||1);d.difficulty=Number(root.querySelector('[name=buddyDifficulty]')?.value)||0;if(!reviewing)e.draft=d;}
function buddyExerciseHeading(e){
 return '<div class="buddy-exercise-hero"><div class="buddy-hero-copy"><span class="buddy-hero-kicker"><small>'+equipmentLabel(e.equipment)+'</small>'+buddyMovementLabel(e)+'</span><h1>'+esc(e.name)+'</h1></div>'+
 '<button type="button" class="buddy-muscle-mini" data-action="muscle-guide" data-name="'+esc(e.name)+'" data-equipment="'+esc(e.equipment||'other')+'" aria-label="Show muscles for '+esc(e.name)+'">'+muscleMiniMarkup(e.name)+'</button></div>';
}
function buddyRender(){
 const s=data.activeWorkout;if(!s)return'';const done=s.exercises.filter(e=>e.status==='done').length,total=s.exercises.length;
 const head=`<header class="buddy-head"><span><small>${esc(s.type.toUpperCase())}</small><strong>Workout Buddy</strong></span><span class="buddy-head-actions"><span class="buddy-elapsed" data-buddy-elapsed>${buddyClock(buddySeconds(s.startedAt))}</span><button type="button" class="buddy-exit" data-action="buddy-exit">Exit</button></span></header>`;
 if(buddyMuscleView&&buddyMuscleGroupView)return `<div class="buddy-screen">${head}<main class="buddy-main buddy-muscle-screen"><button type="button" class="buddy-back" data-action="buddy-muscle-group-back">‹ Back to muscles</button><h1>${esc(muscleGroupLabel(buddyMuscleGroupView))}</h1>${muscleGroupDetailsMarkup(buddyMuscleGroupView,muscleRelatedExercises(buddyMuscleGroupView))}</main></div>`;
 if(buddyMuscleView)return `<div class="buddy-screen">${head}<main class="buddy-main buddy-muscle-screen"><button type="button" class="buddy-back" data-action="buddy-muscle-back">‹ Back to workout</button><h1>${esc(buddyMuscleView)}</h1>${muscleGuideMarkup(buddyMuscleView)}</main></div>`;
 if(s.phase==='bike')return `<div class="buddy-screen">${head}<main class="buddy-main buddy-bike"><div class="buddy-step"><span class="buddy-step-number">01</span><p class="eyebrow">WARM-UP</p><h1>Bike · 5 min</h1><p>Head to the bike. Use the bike's timer for five minutes, then continue when you're ready to lift.</p></div><button class="buddy-a" data-action="buddy-bike-done"><span>Bike finished</span><b>Continue</b></button></main></div>`;
 if(s.phase==='picker'){const remaining=s.exercises.filter(e=>e.status!=='done');return `<div class="buddy-screen">${head}<main class="buddy-main"><div class="buddy-progress"><span>${done} of ${total} exercises</span><span>${total-done} remaining</span></div>${buddyUndoControl(s)}<div class="buddy-picker-head"><p class="eyebrow">${done?'CHOOSE WHAT’S NEXT':'READY TO LIFT'}</p><h1>${done?'Next exercise':'Choose your first exercise'}</h1><p>Select what’s available. Timing starts when you start the set.</p></div><div class="buddy-exercise-list">${remaining.map(e=>{const prior=buddyPrior(e);return exerciseCardWithMuscles(e,exerciseCardMarkup(e,{action:'buddy-choose',attrs:'data-key="'+esc(buddyKey(e))+'"',modifier:'buddy-exercise',summary:prior?esc('Last: '+buddyLastTwo(prior)):'No previous log'}));}).join('')}</div></main></div>`;}
 if(s.phase==='complete')return `<div class="buddy-screen">${head}<main class="buddy-main buddy-complete"><div><p class="eyebrow">CIRCUIT COMPLETE</p><h1>${esc(s.type)} finished</h1><p>${done} exercises · ${buddyClock(buddySeconds(s.startedAt,s.completedAt))} total</p></div>${buddyUndoControl(s)}<button class="buddy-a" data-action="buddy-confirm-finish"><span>Ready to wrap up?</span><b>Finish workout</b></button><button class="buddy-secondary" data-action="buddy-back-picker">Back to exercises</button></main></div>`;
 const e=buddyFind(s,s.selected);if(!e)return'';if(e.journalOpen)return buddyJournalScreen(head,e);const reviewing=Number.isInteger(e.reviewSetIndex),i=reviewing?e.reviewSetIndex:e.sets.length,target=buddyTargetSets(e),d=reviewing?e.sets[e.reviewSetIndex]:(e.draft||buddyDraft(e,i)),prior=buddyPrior(e),running=Boolean(e.activeSetStartedAt),resting=Boolean(e.restStartedAt&&!running),showRest=Boolean(e.restStartedAt&&!running)&&e.sets.length<target,left=showRest?Math.max(0,(e.restSeconds||90)-buddySeconds(e.restStartedAt)):0,range=buddyRepRange(e);
 const state=reviewing?(showRest?`Edit set ${i+1} · rest is running`:`Review set ${i+1}`):running?`Set ${i+1} in progress`:showRest?(left?`Rest · ${buddyClock(left)} remaining`:'Rest complete'):`Set ${i+1} of ${target}`,action=reviewing?(e.sets.length>=target?'Next exercise':`Start set ${e.sets.length+1}`):running?`Finish set ${i+1}`:`Start set ${i+1}`;
 if(running)return `<div class="buddy-screen buddy-set-active">${head}<main class="buddy-main buddy-exercise-view"><div class="buddy-set-status"><span>SET ${i+1} OF ${target} · ACTIVE</span></div><div class="buddy-exercise-title">${buddyExerciseHeading(e)}</div><div class="buddy-running-values"><div><small>WEIGHT</small><strong>${fmt(d.weight)} ${esc(data.settings.unit)}</strong></div><div><small>REPS</small><strong>${d.reps}</strong></div></div><div class="buddy-running-clock"><small>SET TIME</small><strong data-buddy-live-duration>${buddyClock(buddySeconds(e.activeSetStartedAt))}</strong></div><div class="buddy-action-tools">${buddyUndoControl(s)}</div><button class="buddy-a" data-action="buddy-a"><span>Set ${i+1} in progress</span><b>Finish set ${i+1}</b></button></main></div>`;
 const confirmedSets=reviewing?e.sets.slice(0,e.reviewSetIndex):e.sets;const completedSets=confirmedSets.length?`<div class="buddy-completed-sets"><span class="buddy-mini-label">COMPLETED SETS</span>${confirmedSets.map((set,n)=>`<div class="buddy-completed-set"><b>Set ${n+1}</b><span>${fmt(set.weight)} ${esc(data.settings.unit)} × ${set.reps}</span><span>${set.difficulty?effortText(set.difficulty):'No effort'}</span><time>${buddyClock(set.durationSeconds||0)}</time></div>`).join('')}</div>`:'';
 const setProgress=`<div class="buddy-set-status"><span>SET ${Math.min(i+1,target)} OF ${target}</span><div class="buddy-set-bars" aria-hidden="true">${Array.from({length:target},(_,n)=>`<i class="${n<i?'done':n===i?'current':''}"></i>`).join('')}</div></div>`;
 const journalButton='<button type="button" class="buddy-journal-chip" data-action="buddy-journal-toggle">Journal ↗</button>';
 const notes=e.notesOpen?`<div class="buddy-notes-wrap"><div class="buddy-notes-row"><span class="buddy-notes-heading">EXERCISE NOTES</span>${journalButton}</div><div class="buddy-notes-editor"><textarea name="buddyNotes" maxlength="500" rows="2" placeholder="Form, pain, setup, anything worth remembering">${esc(e.notes||'')}</textarea><button type="button" class="buddy-notes-done" data-action="buddy-notes-toggle">Done</button></div></div>`:`<div class="buddy-notes-wrap"><div class="buddy-notes-row"><button type="button" class="buddy-notes-toggle ${e.notes?'has-note':''}" data-action="buddy-notes-toggle"><span><b>${e.notes?'Notes saved':'Add notes'}</b><small>${e.notes?'Tap to review or edit':'Form, setup, pain, or anything worth remembering'}</small></span><strong aria-hidden="true">${e.notes?'✓':'＋'}</strong></button>${journalButton}</div></div>`;
 const recent=buddyHistory(e),lastSession=recent[0]||prior;
 const history=lastSession?'<div class="buddy-history-preview"><button type="button" class="buddy-last-toggle" data-action="buddy-toggle-history" aria-expanded="'+Boolean(e.showRecent)+'"><span><b>LAST · '+esc(niceDate(lastSession.date))+'</b><small>'+esc(buddyLastTwo(lastSession))+'</small></span><span class="buddy-last-chevron" aria-hidden="true">'+(e.showRecent?'⌃':'⌄')+'</span></button>'+(e.showRecent?'<div class="buddy-compact-history">'+recent.slice(1,3).map(l=>'<div><small>'+esc(niceDate(l.date))+'</small><span>'+esc(buddyLastTwo(l))+'</span></div>').join('')+(recent.length===1?'<small>No earlier workouts</small>':'')+'</div>':'')+'</div>':'';
 const setup=e.setupEditing?'<div class="buddy-setup-editor"><input name="buddySetup" maxlength="200" enterkeyhint="done" autocomplete="off" aria-label="Persistent exercise setup" placeholder="Machine setting or setup note" value="'+esc(e.setupDraft??e.setup??'')+'"><button type="button" data-action="buddy-setup-save">Save</button></div>':'';

 const undo='';
 return `<div class="buddy-screen">${head}<main class="buddy-main buddy-exercise-view"><button class="buddy-back" data-action="buddy-picker">‹ Exercises</button>${setProgress}<div class="buddy-action-tools">${buddyUndoControl(s)}</div><div class="buddy-exercise-title">${buddyExerciseHeading(e)}<div class="buddy-meta-row"><div class="buddy-rep-range"><span>REP RANGE</span><strong>${range.min}–${range.max}</strong></div><button type="button" class="buddy-setup ${e.setup?'has-setup':''}" data-action="buddy-setup-toggle" aria-expanded="${Boolean(e.setupEditing)}" title="Tap to edit exercise setup"><span>SETUP</span>${e.setup?`<strong>${esc(e.setup)}</strong>`:''}</button></div>${setup}</div>${history}${showRest?`<div class="buddy-rest-timer"><small>REST</small><strong data-buddy-rest>${left?buddyClock(left):'Ready'}</strong></div>`:''}${completedSets}${buddySetControlsMarkup(d)}${notes}${undo}<button class="buddy-a" data-action="${reviewing?'buddy-review-next':'buddy-a'}"><span data-buddy-state>${state}</span><b>${action}</b></button></main></div>`;
}
let buddyTicker=null;
// Set screens normally do not scroll. Allow a contained fallback if an unusually
// short viewport or extra accessibility text would otherwise clip controls.
function buddyFitViewport(){
 const view=document.querySelector('#buddy-root .buddy-exercise-view');
 if(!view)return;
 view.classList.remove('buddy-needs-scroll');
 if(view.scrollHeight>view.clientHeight+2)view.classList.add('buddy-needs-scroll');
}
// iOS WebKit shrinks the *visual* viewport when its keyboard opens, while a
// fixed 100dvh PWA can remain taller. Fit only during direct field editing.
function buddyActiveField(){
 const field=document.activeElement;
 return field?.closest?.('#buddy-root .buddy-exercise-view')&&field.matches('input:not([type="hidden"]),textarea')?field:null;
}
function buddyEnsureFieldVisible(field){
 if(!field?.isConnected||document.activeElement!==field)return;
 const view=field.closest('.buddy-exercise-view');
 if(!view)return;
 const limits=view.getBoundingClientRect(),rect=field.getBoundingClientRect();
 const bottom=limits.bottom-14,top=limits.top+10;
 if(rect.bottom>bottom)view.scrollTop+=rect.bottom-bottom;
 else if(rect.top<top)view.scrollTop-=top-rect.top;
}
function buddySyncInputViewport(){
 const screen=document.querySelector('#buddy-root .buddy-screen');
 if(!screen)return;
 const field=buddyActiveField(),viewport=window.visualViewport;
 screen.classList.toggle('buddy-keyboard-editing',Boolean(field));
 if(field&&viewport){
  screen.style.height=Math.max(220,Math.round(viewport.height))+'px';
  screen.style.top=Math.max(0,Math.round(viewport.offsetTop))+'px';
  screen.style.bottom='auto';
 }else{
  screen.style.height='';screen.style.top='';screen.style.bottom='';
 }
 buddyFitViewport();
 if(field)requestAnimationFrame(()=>buddyEnsureFieldVisible(field));
 else{
  const view=screen.querySelector('.buddy-exercise-view');
  if(view&&!view.classList.contains('buddy-needs-scroll'))view.scrollTop=0;
 }
}
document.querySelector('#buddy-root')?.addEventListener('focusin',event=>{
 if(event.target.matches?.('input:not([type="hidden"]),textarea'))buddySyncInputViewport();
});
document.querySelector('#buddy-root')?.addEventListener('focusout',()=>{
 requestAnimationFrame(buddySyncInputViewport);
});
window.addEventListener('resize',buddySyncInputViewport);
window.visualViewport?.addEventListener('resize',buddySyncInputViewport);
window.visualViewport?.addEventListener('scroll',buddySyncInputViewport);
function buddyOpen(){document.documentElement.classList.add('buddy-active');document.body.classList.add('buddy-active');document.querySelector('#buddy-root').innerHTML=buddyRender();buddySyncInputViewport();clearInterval(buddyTicker);buddyTicker=setInterval(()=>{const s=data.activeWorkout;if(!s)return clearInterval(buddyTicker);const elapsed=document.querySelector('[data-buddy-elapsed]');if(elapsed)elapsed.textContent=buddyClock(buddySeconds(s.startedAt));const state=document.querySelector('[data-buddy-state]');if(s.phase==='exercise'){const e=buddyFind(s,s.selected),live=document.querySelector('[data-buddy-live-duration]');if(live&&e?.activeSetStartedAt)live.textContent=buddyClock(buddySeconds(e.activeSetStartedAt));if(e?.restStartedAt&&!e.activeSetStartedAt&&e.sets.length<buddyTargetSets(e)){const left=Math.max(0,(e.restSeconds||90)-buddySeconds(e.restStartedAt));if(state&&!Number.isInteger(e.reviewSetIndex))state.textContent=left?`Rest · ${buddyClock(left)} remaining`:'Rest complete';const rest=document.querySelector('[data-buddy-rest]');if(rest)rest.textContent=left?buddyClock(left):'Ready';}}},1000);}
function buddyClose(){buddyMuscleView=null;buddyMuscleGroupView=null;document.documentElement.classList.remove('buddy-active');document.body.classList.remove('buddy-active');document.querySelector('#buddy-root').innerHTML='';clearInterval(buddyTicker);buddyTicker=null;}
async function buddyPersist(){await persist();if(data.activeWorkout)buddyOpen();}
function buddyUpsertLift(s,e){if(!e.sets?.length)return;const record={exercise:e.name,equipment:e.equipment,date:s.date,sets:e.sets.map(x=>({weight:x.weight,reps:x.reps,...(x.difficulty?{difficulty:x.difficulty}:{})})),notes:e.notes||'',buddySessionId:s.id};const existing=data.lifts.find(l=>l.buddySessionId===s.id&&l.exercise===e.name&&(l.equipment||'other')===e.equipment);if(existing)Object.assign(existing,record);else data.lifts.push({id:id(),...record});}
function buddyCompleteExercise(s,e){e.status='done';e.completedAt=isoNow();delete e.activeSetStartedAt;delete e.restStartedAt;delete e.reviewSetIndex;delete e.draft;buddyUpsertLift(s,e);s.selected=null;s.phase=s.exercises.every(x=>x.status==='done')?'complete':'picker';if(s.phase==='complete')s.completedAt=isoNow();}
function buddyEndOptions(){modal('End workout',`<div class="buddy-end-options"><p class="body-copy">Save the workout to keep completed sets and timing, or delete this Workout Buddy session.</p><button type="button" class="primary" data-action="buddy-save-end">Save workout</button><button type="button" class="danger" data-action="buddy-delete-prompt">Delete workout</button><button type="button" class="outline" data-action="close">Cancel</button></div>`);}
function buddyDeletePrompt(){modal('Delete workout?',`<div class="buddy-delete-confirm"><p class="body-copy"><strong>Are you sure?</strong> This removes this Workout Buddy session and its Buddy-created lift records.</p><button type="button" id="buddy-delete-confirm" class="danger" data-action="buddy-delete-confirm" disabled>Delete workout · 3</button><button type="button" class="outline" data-action="close">Cancel</button></div>`);const btn=document.querySelector('#buddy-delete-confirm');if(!btn)return;setTimeout(()=>{if(btn.isConnected)btn.textContent='Delete workout · 2';},1000);setTimeout(()=>{if(btn.isConnected)btn.textContent='Delete workout · 1';},2000);setTimeout(()=>{if(btn.isConnected){btn.disabled=false;btn.textContent='Delete workout';}},3000);}


function gym() {
 const templates=savedWorkouts(),selected=workoutByName(workout);workout=selected?.name||'';const exercises=workoutExercises(selected);
 return `<div class="page-head"><p class="eyebrow">TRAINING</p><h1>Lift tracking<span class="accent">.</span></h1><p>Pick an exercise, see last time, and log the sets you actually did.</p></div><section class="buddy-entry"><div><p class="eyebrow">LIVE WORKOUT</p><h2>Workout Buddy</h2><p>${data.activeWorkout?`${esc(data.activeWorkout.type)} workout in progress`:'Fast set entry, rest timing, and exercise transitions.'}</p></div>${data.activeWorkout?`<div class="buddy-entry-actions">${button('Resume','buddy-launch','primary')}${button('End workout','buddy-end','outline small')}</div>`:button('Start','buddy-launch','primary')}</section>${dateHeader('Workout date')}<div class="routine-toolbar"><strong>ROUTINES</strong>${button('+ Manage','routine-manage','outline small')}</div><div class="workout-tabs">${templates.map(x=>button(esc(x.name),'workout',workout===x.name?'selected':'',`data-workout="${esc(x.name)}"`)).join('')}</div><section><div class="section-head"><div><p class="eyebrow">${esc(workout?workout.toUpperCase()+' ROUTINE':'NO ROUTINE')}</p><h2>Choose an exercise</h2></div><div class="section-actions">${button('Exercises','exercise-library','outline small')}${selected?button('Edit workout','edit-workout','outline small'):''}${button('+ Custom','custom-lift','outline small')}</div></div><div class="exercise-list">${exercises.length?exercises.map(e=>exerciseCardWithMuscles(e,exerciseCard(e))).join(''):empty('This routine is empty. Edit it to add exercises.')}</div></section>${routineHistoryPanel()}`;
}

function recentRoutineSessions(){
 return (data.workoutHistory||[]).filter(s=>s&&s.id&&Array.isArray(s.exercises))
 .slice().sort((a,b)=>{
   const time=x=>Date.parse(x.completedAt||x.endedAt||x.startedAt||'')||0;
   return time(b)-time(a)||String(b.date||'').localeCompare(String(a.date||''));
 });
}
function routineSessionCounts(s){
 const performed=(s.exercises||[]).filter(x=>Array.isArray(x.sets)&&x.sets.length);
 return {exercises:performed.length,sets:performed.reduce((n,e)=>n+e.sets.length,0)};
}
function routineFinishedDate(s){
 const finished=s.completedAt||s.endedAt||s.startedAt;
 const parsed=finished?new Date(finished):null;
 return parsed&&!Number.isNaN(parsed.getTime())?localDate(parsed):s.date||'';
}
function routineHistoryRow(s){
 const c=routineSessionCounts(s);
 return '<button type="button" class="routine-history-row" data-action="routine-history-detail" data-id="'+esc(s.id)+'">'+
 '<time>'+esc(routineFinishedDate(s)?niceDate(routineFinishedDate(s)):'Unknown date')+'</time><span><strong>'+esc(s.type||'Workout')+'</strong><small>'+c.exercises+' exercises · '+c.sets+' sets'+(s.savedEarly?' · Saved early':'')+'</small></span><b>›</b></button>';
}
function routineHistoryPanel(){
 const sessions=recentRoutineSessions();
 return '<section class="log-section routine-history-panel"><div class="section-head"><div><p class="eyebrow">WORKOUT HISTORY</p><h2>Recent routines</h2></div>'+
 (sessions.length>3?button('View all','routine-history-all','outline small'):'')+'</div>'+
 (sessions.length?'<div class="routine-history-list">'+sessions.slice(0,3).map(routineHistoryRow).join('')+'</div>':empty('Completed Workout Buddy routines will appear here. Manual lifts remain available in History.'))+'</section>';
}
function routineHistoryAll(){
 const sessions=recentRoutineSessions();
 modal('Routine history','<div class="routine-history-all">'+(sessions.length?sessions.map(routineHistoryRow).join(''):empty('No saved Workout Buddy sessions yet.'))+'</div>');
}
function routineSessionExercisesInOrder(session){
 const ranks=new Map((session.performedOrder||[]).map((key,index)=>[key,index]));
 const entries=(session.exercises||[]).map((exercise,exerciseIndex)=>({exercise,exerciseIndex})).filter(x=>x.exercise.sets?.length);
 const firstSetTime=e=>{const t=Date.parse(e.sets?.[0]?.startedAt||'');return Number.isFinite(t)?t:null;};
 return entries.sort((a,b)=>{
  const aTime=firstSetTime(a.exercise),bTime=firstSetTime(b.exercise);
  if(aTime!==null&&bTime!==null&&aTime!==bTime)return aTime-bTime;
  const aRank=ranks.get(buddyKey(a.exercise)),bRank=ranks.get(buddyKey(b.exercise));
  if(aRank!==undefined&&bRank!==undefined&&aRank!==bRank)return aRank-bRank;
  if(aRank!==undefined&&bRank===undefined)return -1;
  if(bRank!==undefined&&aRank===undefined)return 1;
  if(aTime!==null&&bTime===null)return -1;
  if(bTime!==null&&aTime===null)return 1;
  return a.exerciseIndex-b.exerciseIndex;
 });
}
function routineHistoryDetail(id,fromFullHistory=false){
 const session=recentRoutineSessions().find(s=>s.id===id);if(!session)return;
 const c=routineSessionCounts(session);
 const exercises=routineSessionExercisesInOrder(session).map(({exercise:e,exerciseIndex})=>
  '<div class="routine-history-exercise"><div class="routine-history-exercise-head"><strong>'+esc(e.name||'Exercise')+'</strong><button type="button" class="outline small" data-action="routine-history-edit-exercise" data-id="'+esc(session.id)+'" data-exercise-index="'+exerciseIndex+'" data-from-full="'+fromFullHistory+'">Edit</button></div><small>'+e.sets.length+' sets</small>'+
  e.sets.map((set,i)=>'<div class="routine-history-set"><span>Set '+(i+1)+' · '+fmt(set.weight)+' '+esc(data.settings.unit)+' × '+set.reps+(set.difficulty?' · '+effortText(set.difficulty):'')+'</span></div>').join('')+
  (e.notes?'<p>'+esc(e.notes)+'</p>':'')+'</div>').join('');
 modal(session.type||'Workout','<div class="routine-history-details"><p class="body-copy">'+(routineFinishedDate(session)?niceDate(routineFinishedDate(session)):'Unknown date')+
 ' · '+c.exercises+' exercises · '+c.sets+' sets'+(session.savedEarly?' · Saved early':'')+'</p>'+
 (exercises||empty('No sets recorded in this session.'))+'</div>',fromFullHistory?()=>routineHistoryAll():null);
}
let routineHistoryEditDraft=null;
function routineHistoryCaptureDraft(){
 const state=routineHistoryEditDraft,form=document.querySelector('form[data-form="routine-history-exercise"]');
 if(!state||!form)return;
 const set=state.sets[state.setIndex],weight=form.elements.buddyWeight,reps=form.elements.buddyReps,effort=form.elements.buddyDifficulty;
 if(!set||!weight||!reps||!effort)return;
 set.weight=weight.value;set.reps=reps.value;
 const difficulty=Number(effort.value)||0;
 if(difficulty)set.difficulty=difficulty;else delete set.difficulty;
 state.notes=form.elements.historyExerciseNotes?.value.slice(0,500)||'';
}
function routineHistoryEditExercise(id,exerciseIndex,fromFullHistory=false){
 const session=(data.workoutHistory||[]).find(s=>s.id===id);
 const exercise=Number.isInteger(exerciseIndex)&&exerciseIndex>=0?session?.exercises?.[exerciseIndex]:null;
 if(!exercise?.sets?.length)return;
 routineHistoryEditDraft={sessionId:id,exerciseIndex,fromFullHistory,setIndex:0,
  sets:structuredClone(exercise.sets),notes:exercise.notes||''};
 routineHistoryRenderEditor();
}
function routineHistoryRenderEditor(){
 const state=routineHistoryEditDraft;if(!state)return;
 const session=(data.workoutHistory||[]).find(s=>s.id===state.sessionId),exercise=session?.exercises?.[state.exerciseIndex];
 if(!exercise){routineHistoryEditDraft=null;return;}
 const set=state.sets[state.setIndex];
 const tabs=state.sets.map((_,i)=>'<button type="button" class="'+(i===state.setIndex?'selected':'')+'" data-action="routine-history-select-set" data-index="'+i+'" aria-pressed="'+(i===state.setIndex)+'">Set '+(i+1)+'</button>').join('');
 modal('Edit · '+exercise.name,`<form class="form routine-history-editor" data-form="routine-history-exercise" novalidate><p class="body-copy">Adjust each set using the same controls as Workout Buddy. Changes are saved together.</p><div class="routine-history-edit-tabs" role="group" aria-label="Select set to edit">${tabs}</div>${buddySetControlsMarkup(set)}<label class="field"><span>Exercise notes</span><textarea name="historyExerciseNotes" rows="2" maxlength="500" placeholder="Form, setup, pain, anything worth remembering">${esc(state.notes)}</textarea></label><div class="form-actions"><button type="submit" class="primary">Save changes</button><button type="button" class="outline" data-action="routine-history-edit-cancel">Cancel</button></div></form>`,()=>{
  const current=routineHistoryEditDraft;
  routineHistoryEditDraft=null;
  if(current)routineHistoryDetail(current.sessionId,current.fromFullHistory);
 });
}


function describeLift(l){return l.sets.map(s=>`${fmt(s.weight)} ${data.settings.unit} × ${s.reps}${s.difficulty?` · ${effortText(s.difficulty)}`:''}`).join(' · ');}
const exerciseHistoryAliases=new Map([
 ['calf raise',['calf extension','machine']],['calf raises',['calf extension','machine']],['calf extension',['calf extension','machine']],
 ['leg press',['seated leg press','machine']],['seated leg press',['seated leg press','machine']],
 ['chest press',['chest press','machine']],['lat pulldown',['lat pulldown','machine']],['seated row',['seated row','machine']],
 ['shoulder press',['shoulder press','machine']],['triceps pushdown',['triceps pushdown','cable']],['lat pushdown',['triceps pushdown','cable']],
 ['bicep curl',['bicep curl','dumbbell']],['bicep curls',['bicep curl','dumbbell']],['leg curl',['leg curl','machine']],
 ['glute kickback',['glute kickback','machine']],['leg extension',['leg extension','machine']],['hip abduction',['hip abduction','machine']],
 ['torso rotation',['torso rotation','machine']],['abdominal crunch',['abdominal crunch','machine']],
 ['lateral raise',['lateral raise','dumbbell']],['lateral raises',['lateral raise','dumbbell']]
]);
function canonicalExerciseIdentity(name,equipment='other'){
 let clean=String(name||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim(),inferred='other';
 for(const [prefix,type] of [['machine ','machine'],['cable ','cable'],['dumbbell ','dumbbell'],['db ','dumbbell']])if(clean.startsWith(prefix)){clean=clean.slice(prefix.length).trim();inferred=type;break;}
 const alias=exerciseHistoryAliases.get(clean),canonicalName=alias?.[0]||clean;
 let canonicalEquipment=['machine','cable','dumbbell','bench','calisthenics','other'].includes(equipment)?equipment:'other';
 if(canonicalEquipment==='other')canonicalEquipment=inferred!=='other'?inferred:(alias?.[1]||'other');
 return{name:canonicalName,equipment:canonicalEquipment};
}
const exerciseHistoryKey=(name,equipment='other')=>{const x=canonicalExerciseIdentity(name,equipment);return x.name+'|'+x.equipment;};
function lastLift(name,excludeId='',equipment='',throughDate=chosenDate){
 const wanted=exerciseHistoryKey(name,equipment||'other');
 return data.lifts.filter(l=>exerciseHistoryKey(l.exercise,l.equipment||'other')===wanted&&l.id!==excludeId&&l.date<=throughDate).sort((a,b)=>b.date.localeCompare(a.date))[0];
}
function exerciseProgressGroups(){
 const map=new Map();
 for(const lift of data.lifts){
   const identity=canonicalExerciseIdentity(lift.exercise,lift.equipment||'other'),key=exerciseHistoryKey(identity.name,identity.equipment),definition=(data.exerciseDefinitions||[]).find(e=>exerciseHistoryKey(e.name,e.equipment)===key),existing=map.get(key)||{key,name:definition?.name||lift.exercise,equipment:definition?.equipment||identity.equipment,lifts:[]};
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
 modal(group.name+' progress','<div class="exercise-progress-modal"><button type="button" class="routine-muscle-link" data-action="muscle-guide" data-name="'+esc(group.name)+'" data-equipment="'+esc(group.equipment)+'">View muscle diagram ↗</button><div class="exercise-progress-summary"><span><small>Equipment</small><strong>'+equipmentLabel(group.equipment)+'</strong></span><span><small>Sessions</small><strong>'+group.lifts.length+'</strong></span><span><small>Best set</small><strong>'+(best?fmt(best.set.weight)+' '+data.settings.unit+' × '+best.set.reps:'—')+'</strong></span></div>'+(group.definition?.setup?'<p class="exercise-progress-setup"><strong>Current setup:</strong> '+esc(group.definition.setup)+'</p>':'')+exerciseProgressChart(group)+'<div class="exercise-progress-history">'+[...group.lifts].reverse().map(l=>'<div class="exercise-progress-session"><div><strong>'+niceDate(l.date)+'</strong><small>'+l.date+'</small></div><div class="exercise-progress-sets">'+l.sets.map((s,i)=>'<span><b>Set '+(i+1)+'</b> '+fmt(s.weight)+' '+data.settings.unit+' × '+s.reps+(s.difficulty?' · '+effortText(s.difficulty):'')+'</span>').join('')+'</div>'+(l.notes?'<p>'+esc(l.notes)+'</p>':'')+'</div>').join('')+'</div></div>');
}
function exerciseProgressLink(group){
 const set=bestLiftSet(group.latest);
 const right='<span class="progress-exercise-value"><b>'+(set?fmt(set.weight)+' '+data.settings.unit+' × '+set.reps:'—')+'</b><small>Latest top set</small></span>';
 return exerciseCardMarkup(group,{action:'exercise-progress',attrs:'data-name="'+esc(group.name)+'" data-equipment="'+esc(group.equipment)+'"',modifier:'exercise-progress-link progress-exercise-card',summary:esc('Last '+niceDate(group.latest.date)+' · '+group.lifts.length+' session'+(group.lifts.length===1?'':'s')),right,setup:''});
}
function exerciseProgressPanel(){
 const groups=exerciseProgressGroups();
 if(!groups.length)return '<section class="panel progress-details exercise-progress-panel"><div class="section-head"><div><p class="eyebrow">LIFTING</p><h2>Exercise progress</h2></div></div>'+empty('Log some lifts to build exercise history.')+'</section>';
 const shown=groups.slice(0,4);
 return '<section class="panel progress-details exercise-progress-panel"><div class="section-head"><div><p class="eyebrow">LIFTING</p><h2>Exercise progress</h2></div><span class="progress-count">'+groups.length+' exercises</span></div><div class="exercise-progress-list">'+shown.map(exerciseProgressLink).join('')+'</div>'+(groups.length>4?'<button type="button" class="text-btn exercise-progress-all" data-action="exercise-progress-all">View all '+groups.length+' exercises</button>':'')+'</section>';
}
function syncExerciseProgressViewport(){const dialog=document.querySelector('.exercise-progress-all-modal');if(!dialog)return;const v=window.visualViewport;dialog.style.top=(v?v.offsetTop+v.height/2:window.innerHeight/2)+'px';dialog.style.maxHeight=Math.max(220,(v?v.height:window.innerHeight)-18)+'px';}
function exerciseProgressAll(){const groups=exerciseProgressGroups();modal('Exercise progress','<div class="exercise-progress-all-list exercise-progress-card-list">'+groups.map(exerciseProgressLink).join('')+'</div>');document.querySelector('.modal')?.classList.add('exercise-progress-all-modal');document.body.classList.add('exercise-progress-modal-open');syncExerciseProgressViewport();}
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
 const byDate=new Map(),minimum=1000;
 for(const entry of data.foodEntries){
   const day=currentFoodTrackingDate(entry);
   if(day<window.start||day>window.end)continue;
   const current=byDate.get(day)||{calories:0,protein:0};
   current.calories+=entry.calories*entry.quantity;current.protein+=entry.protein*entry.quantity;byDate.set(day,current);
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
   if(totals.calories<minimum)continue;
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
 return '<div class="food-progress-chart"><div class="food-chart-legend"><span class="food-chart-key calories"><i></i><b>Calories</b></span><span class="food-chart-key protein"><i></i><b>Protein</b></span><span class="food-chart-key goal"><i></i><b>100% goal</b></span></div><svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="'+esc(window.label)+' calorie and protein progress"><line class="food-goal-line" x1="'+pX+'" x2="'+(w-pX)+'" y1="'+goalY+'" y2="'+goalY+'"></line>'+(cal.length>1?'<polyline class="food-calorie-line" points="'+line(cal)+'"></polyline><polyline class="food-protein-line" points="'+line(protein)+'"></polyline>':'')+cal.map(pt=>'<circle class="food-calorie-dot" cx="'+pt.x.toFixed(1)+'" cy="'+pt.y.toFixed(1)+'" r="3.2"><title>'+esc(pointTitle(pt,'cal'))+'</title></circle>').join('')+protein.map(pt=>'<circle class="food-protein-dot" cx="'+pt.x.toFixed(1)+'" cy="'+pt.y.toFixed(1)+'" r="3.2"><title>'+esc(pointTitle(pt,'protein'))+'</title></circle>').join('')+'</svg><div class="food-chart-range"><span>'+esc(points[0].label)+'</span><span>'+esc(points.at(-1).label)+'</span></div><p class="food-chart-note">'+(aggregate?'Quarter and year views average only days with at least 1,000 recorded calories. Lower-intake days remain in your logs and daily charts.':'Each point is an exact logged day relative to your calorie and protein goals.')+'</p></div>';
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
  const days=[...new Set(data.foodEntries.map(currentFoodTrackingDate))].sort().reverse().slice(0,7),foodWindow=foodProgressWindow();
  const range=w=>`${niceDate(w.week)} – ${niceDate(endOfWeek(w.week))}`;
  const chartStart=visibleWeeks.at(-1)?.week||weights.at(-1)?.date,chartEnd=visibleWeeks[0]?endOfWeek(visibleWeeks[0].week):weights[0]?.date;
  const chartWeights=chartStart&&chartEnd?weights.filter(w=>w.date>=chartStart&&w.date<=chartEnd):weights,chartBodyFat=chartStart&&chartEnd?bodyFat.filter(b=>b.date>=chartStart&&b.date<=chartEnd):bodyFat;
  return `<div class="page-head progress-head"><p class="eyebrow">THE BIG PICTURE</p><h1>Progress<span class="accent">.</span></h1><p>Weekly averages put daily changes in perspective.</p></div><section class="panel progress-trend"><div class="section-head"><div><p class="eyebrow">BODY WEIGHT</p><h2>Weekly trend</h2></div>${button('+ Weigh in','weight','primary small')}</div><p class="week-setting">Weeks start Friday</p>${latest?`<div class="trend-highlight"><p class="eyebrow">${latest.week===currentWeek?'CURRENT WEEK':'LATEST LOGGED WEEK'}</p><p class="trend-range">${range(latest)}</p><div class="trend-metrics"><div><strong>${fmt(latest.average)} <em>${data.settings.unit}</em></strong><small>Average weight · ${latest.count} weigh-in${latest.count===1?'':'s'}</small></div><div><strong>${latest.bmi??'—'}</strong><small>Average BMI</small></div></div><p class="trend-change">${change===null?'Log another week to compare averages.':`${change>0?'↑':change<0?'↓':'→'} ${fmt(Math.abs(change))} ${data.settings.unit} ${change>0?'higher':change<0?'lower':'change'} than the previous logged week`}</p></div>${chartWeights.length?weightProgressChart(chartWeights):''}${chartBodyFat.length?bodyFatProgressChart(chartBodyFat):''}<div class="week-list">${visibleWeeks.map(w=>`<div class="week-row" data-week="${w.week}"><span><strong>${range(w)}</strong><small>${w.week.slice(0,4)}${w.week.slice(0,4)!==endOfWeek(w.week).slice(0,4)?'–'+endOfWeek(w.week).slice(0,4):''} · ${w.count} weigh-in${w.count===1?'':'s'}${w.week===currentWeek?' · Current week':''}</small></span><span class="week-values"><strong>${fmt(w.average)} ${data.settings.unit}</strong><small>BMI ${w.bmi??'—'}</small></span></div>`).join('')}</div>`:empty('Add a weigh-in to see weekly average weight and BMI.')}<p class="hint">Showing up to the last 6 Friday–Thursday weeks. Averages use logged weigh-ins only. BMI uses your height in Settings.</p></section><section class="panel progress-details weight-progress-panel"><div class="section-head"><h2>Individual weigh-ins</h2><div class="progress-head-actions"><span class="progress-count">${Math.min(5,weights.length)} shown${weights.length>5?' · '+weights.length+' total':''}</span>${weights.length>5?button('See all','weight-all','text-btn'):''}</div></div>${recentWeights.length?recentWeights.map(w=>`<div class="list-row"><span><strong>${fmt(w.value)} ${data.settings.unit}</strong><small>${niceDate(w.date)} · ${w.date.slice(0,4)} · BMI ${bmi(w.value,data.settings.heightInches,data.settings.unit)}</small></span>${button('Edit','edit-weight','text-btn',`data-id="${esc(w.id)}"`)}</div>`).join(''):empty('No weigh-ins yet.')}</section><section class="panel progress-details bodyfat-progress-panel"><div class="section-head"><div><p class="eyebrow">BODY COMPOSITION</p><h2>Body fat</h2></div>${button('+ Body fat','body-fat','outline small')}</div>${recentBodyFat.length?recentBodyFat.map(b=>`<div class="list-row"><span><strong>${fmt(b.value)}%</strong><small>${niceDate(b.date)} · ${b.date.slice(0,4)}</small></span>${button('Edit','edit-body-fat','text-btn',`data-id="${esc(b.id)}"`)}</div>`).join(''):empty('No body-fat readings yet.')}</section>${workoutTimingPanel()}${exerciseProgressPanel()}<section class="panel progress-details food-progress-panel"><div class="section-head"><div><p class="eyebrow">NUTRITION</p><h2>Calories & protein</h2></div>${button('All dates ↗','history','text-btn')}</div>${data.foodEntries.length?foodProgressControls(foodWindow)+recentFoodChart(foodWindow)+'<div class="recent-food-days"><p class="eyebrow">RECENT LOGGED DAYS</p>'+days.map(day=>{const t=foodDayTotals(day);return `<button class="day-link" data-action="go-date" data-date="${day}"><span>${niceDate(day)}</span><strong>${Math.round(t.calories)} cal · ${Math.round(t.protein)}g</strong></button>`;}).join('')+'</div>':empty('Food totals will appear once you start logging.')}</section>`;
}
function history() {
  const nonFoodDates=[...data.lifts,...data.weights,...(data.bodyFat||[])];
  const dates=[...new Set([...nonFoodDates.map(x=>x.date),...data.foodEntries.map(currentFoodTrackingDate)])].sort().reverse();
  return `<div class="page-head"><p class="eyebrow">EVERY DAY COUNTS</p><h1>History<span class="accent">.</span></h1><p>Choose any date to view or correct what you logged.</p></div><div class="date-row">${input('Jump to date','date',chosenDate,'date','required')}${button('Open food','food','outline small')}</div>${dates.length?dates.map(date=>{const t=foodDayTotals(date), lifts=data.lifts.filter(x=>x.date===date).length, w=data.weights.find(x=>x.date===date),bf=(data.bodyFat||[]).filter(x=>x.date===date).at(-1);return `<button class="history-day" data-action="go-date" data-date="${date}"><strong>${niceDate(date)}</strong><span>${Math.round(t.calories)} cal · ${Math.round(t.protein)}g protein<br>${lifts} lift${lifts===1?'':'s'}${w?` · ${fmt(w.value)} ${data.settings.unit}`:''}${bf?` · ${fmt(bf.value)}% BF`:''}</span><b>↗</b></button>`}).join(''):empty('Your logged days will show up here.')}`;
}

function dataDiagnostics(){
 const issues=[],warnings=[];
 let usage={sections:{},totalBytes:0};
 try{
  usage=accountSectionUsage(data);
  for(const [section,record]of Object.entries(usage.sections)){
   if(record.bytes>MAX_CLOUD_BYTES)issues.push(section+' account section exceeds its cloud limit. Export a full backup and reduce this section before saving.');
   else if(record.percent>=90)warnings.push(section+' account section is '+record.percent.toFixed(1)+'% full. Export a backup and review growth.');
  }
 }catch(error){issues.push('Current data cannot be encoded: '+error.message);}
 const defs=data.exerciseDefinitions||[],defIds=new Set(defs.map(e=>e.id));
 for(const w of data.workoutTemplates||[])for(const item of w.exercises||[])if(!defIds.has(item.exerciseId))issues.push(w.name+' references a missing exercise: '+item.exerciseId);
 const foodGroups=new Map();for(const f of data.foods){const key=f.name.trim().toLowerCase();if(!foodGroups.has(key))foodGroups.set(key,[]);foodGroups.get(key).push(f);}
 for(const items of foodGroups.values())if(items.length>1)warnings.push('Possible duplicate saved food: '+items[0].name+' ('+items.length+')');
 const exerciseGroups=new Map();for(const e of defs){const key=exerciseHistoryKey(e.name,e.equipment);if(!exerciseGroups.has(key))exerciseGroups.set(key,[]);exerciseGroups.get(key).push(e);}
 for(const items of exerciseGroups.values())if(items.length>1)warnings.push('Duplicate exercise definition: '+items[0].name+' / '+equipmentLabel(items[0].equipment));
 const invalidFoodTimes=data.foodEntries.filter(e=>e.t!=null&&(!Number.isInteger(e.t)||e.t<0||e.t>47)).length;if(invalidFoodTimes)issues.push(invalidFoodTimes+' food entr'+(invalidFoodTimes===1?'y has':'ies have')+' an invalid time slot.');
 const workoutRefs=(data.workoutTemplates||[]).reduce((n,w)=>n+(w.exercises?.length||0),0);
 const counts={foods:data.foods.length,foodEntries:data.foodEntries.length,lifts:data.lifts.length,weights:data.weights.length,bodyFat:(data.bodyFat||[]).length,exerciseDefinitions:defs.length,workoutTemplates:(data.workoutTemplates||[]).length,workoutRefs,workoutHistory:(data.workoutHistory||[]).length,transactions:(data.transactions||[]).length};
 return{issues,warnings,usage,counts};
}

function googleSyncUsagePanel(){
 const d=dataDiagnostics(),sections=d.usage.sections;
 const status=demoMode?'Demo records: not synced':offlineWorkspace?'Offline workspace: not synced':account?(cloudPending||cloudBusy?'Connected; some changes may still be pending':'Connected; estimated section payloads'):'Device-only: estimated payloads if synced';
 const labels={nutrition:'Nutrition',lifting:'Lifting',finances:'Finances'};
 const rows=ACCOUNT_SECTIONS.map(section=>{
  const entry=sections[section]||{bytes:0,percent:0};
  const pct=entry.percent,usedKiB=entry.bytes/1024;
  return '<div class="storage-meter"><p><strong>'+labels[section]+' · '+usedKiB.toFixed(1)+' KiB</strong> / '+(MAX_CLOUD_BYTES/1024).toFixed(1)+' KiB</p>'+
   '<div role="progressbar" aria-label="'+labels[section]+' cloud payload usage" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+Math.min(100,pct).toFixed(1)+'"><span style="width:'+Math.min(100,pct).toFixed(1)+'%"></span></div></div>';
 }).join('');
 return '<section class="panel spaced google-sync-usage"><div class="section-head"><div><p class="eyebrow">GOOGLE SYNC</p><h2>Cloud section sizes</h2></div><span class="version-badge">3 files</span></div>'+
 rows+'<p class="hint">'+esc(status)+'. Each file has its own 800,000-byte safety limit; these are actual UTF-8 JSON sizes, not a shared account cap or device storage quota.</p></section>';
}

function dataHealthPanel(){
 const d=dataDiagnostics(),status=d.issues.length?'Needs attention':d.warnings.length?'Review suggested':'Looks healthy',tone=d.issues.length?'bad':d.warnings.length?'warn':'good';
 return '<section class="panel spaced data-health-panel"><div class="section-head"><div><p class="eyebrow">DATA HEALTH</p><h2>Diagnostics</h2></div><span class="health-status '+tone+'">'+status+'</span></div><div class="diagnostic-counts"><span><strong>'+d.counts.foodEntries+'</strong><small>food logs</small></span><span><strong>'+d.counts.lifts+'</strong><small>lift logs</small></span><span><strong>'+d.counts.weights+'</strong><small>weights</small></span><span><strong>'+d.counts.bodyFat+'</strong><small>body fat</small></span></div>'+button('View diagnostic details','data-health-details','outline small')+'<p class="hint">Diagnostics are read-only. Nothing is repaired, deleted, or merged automatically.</p></section>';
}
function dataHealthDetails(){
 const d=dataDiagnostics();
 const sizes=ACCOUNT_SECTIONS.map(section=>[section[0].toUpperCase()+section.slice(1)+' cloud JSON',((d.usage.sections[section]?.bytes||0)/1024).toFixed(1)+' KiB / '+(MAX_CLOUD_BYTES/1024).toFixed(1)+' KiB']);
 const rows=[...sizes,['Total cloud section JSON',(d.usage.totalBytes/1024).toFixed(1)+' KiB (no combined cap)'],['Saved foods',d.counts.foods],['Food entries',d.counts.foodEntries],['Exercise definitions',d.counts.exerciseDefinitions],['Workout templates',d.counts.workoutTemplates],['Workout exercise references',d.counts.workoutRefs],['Lift entries',d.counts.lifts],['Weight entries',d.counts.weights],['Body-fat entries',d.counts.bodyFat],['Financial transactions',d.counts.transactions],['Workout Buddy history',d.counts.workoutHistory]];
 modal('Data diagnostics','<div class="diagnostic-details"><div class="diagnostic-table">'+rows.map(([k,v])=>'<div><span>'+esc(k)+'</span><strong>'+esc(v)+'</strong></div>').join('')+'</div><section><h3>Errors</h3>'+(d.issues.length?'<ul>'+d.issues.map(x=>'<li>'+esc(x)+'</li>').join(''):'<p class="empty">No structural errors found.</p>')+'</section><section><h3>Things to review</h3>'+(d.warnings.length?'<ul>'+d.warnings.map(x=>'<li>'+esc(x)+'</li>').join(''):'<p class="empty">No duplicate definitions detected.</p>')+'</section></div>');
}

function offlineWorkspacePanel(){
  if(demoMode)return '';
  if(offlineWorkspace){
    const status=offlineWorkspace.dirty?'Changes since last export':'No changes since last export/load';
    return '<section class="panel spaced offline-workspace-panel active"><div class="section-head"><div><p class="eyebrow">OFFLINE JSON</p><h2>Workspace active</h2></div><span class="workspace-status '+(offlineWorkspace.dirty?'dirty':'clean')+'">'+(offlineWorkspace.dirty?'Export needed':'Up to date')+'</span></div><p class="body-copy"><strong>'+esc(offlineWorkspace.filename)+'</strong><br>'+esc(status)+'. All edits are saved only on this device while this workspace is active. Firebase and Apple Health are paused.</p><div class="offline-workspace-actions">'+button('Export updated JSON','offline-export','primary')+button('Replace workspace JSON','offline-replace','outline')+button('Exit offline mode','offline-exit','outline')+'</div><p class="hint">After exiting, use the normal Restore JSON backup flow if you want these changes applied to your account. Nothing syncs automatically. For travel, add Everyday to your iPhone Home Screen and open it once online after updates; the cached app can reopen without internet.</p></section>';
  }
  return '<section class="panel spaced offline-workspace-panel"><p class="eyebrow">OFFLINE JSON</p><h2>Work from a backup</h2><p class="body-copy">Load an Everyday JSON backup into a separate local workspace. You can use the normal tracker, including Workout Buddy, edit everything, and export a new JSON without writing to Firebase.</p>'+button('Start offline JSON workspace','offline-start','outline')+'<p class="hint">This is a deliberate mode, not an automatic network fallback. Your current device or cloud data stays untouched. For a trip, add Everyday to your iPhone Home Screen, open it once while online, and keep the JSON backup downloaded in Files on the phone.</p></section>';
}
function offlineWorkspaceModal(replace=false){
  const warning=offlineWorkspace?.dirty&&replace?'<div class="import-alert"><strong>Unexported workspace changes</strong><p>Replacing the workspace will discard them. Export first if you want to keep them.</p></div>':'';
  modal(replace?'Replace offline workspace':'Start offline workspace',warning+'<form class="form" data-form="offline-workspace"><input type="hidden" name="replace" value="'+(replace?'yes':'no')+'"><label class="field"><span>Choose an Everyday .json backup</span><input type="file" name="file" accept=".json,application/json" required></label><button type="submit" class="primary">'+(replace?'Replace workspace':'Open offline workspace')+'</button></form><div id="offline-workspace-preview" role="status"></div>');
}
function exitOfflineWorkspace(){
  if(!offlineWorkspace)return;
  clearInterval(offlineExitTimer);offlineExitTimer=null;
  const dirty=offlineWorkspace.dirty;
  modal('Exit offline mode',`<div class="offline-exit-confirm"><div class="import-alert"><strong>${dirty?'Workspace changes need a home':'Before you leave the workspace'}</strong><p>${dirty?'There are changes since your last JSON export. Exporting now is the safest way to keep them before returning to your normal account.':'You can export a fresh JSON before returning to your normal account.'}</p></div><button type="button" class="primary" data-action="offline-exit-export">Export JSON & exit</button><button type="button" class="danger" data-action="offline-exit-without" disabled>Exit without exporting · 3</button><button type="button" class="outline" data-action="close">Cancel</button><p class="hint">The no-export option unlocks after 3 seconds to protect against an accidental double-tap. Exported JSON can later be restored through Import data.</p></div>`);
  let seconds=3;
  offlineExitTimer=setInterval(()=>{
    seconds--;
    const btn=document.querySelector('[data-action="offline-exit-without"]');
    if(!btn){clearInterval(offlineExitTimer);offlineExitTimer=null;return;}
    if(seconds>0){btn.textContent='Exit without exporting · '+seconds;return;}
    clearInterval(offlineExitTimer);offlineExitTimer=null;btn.disabled=false;btn.textContent='Exit without exporting';
  },1000);
}
async function performOfflineWorkspaceExit(){
  if(!offlineWorkspace)return;
  clearInterval(offlineExitTimer);offlineExitTimer=null;
  try{localStorage.removeItem(OFFLINE_WORKSPACE_KEY);}catch{}
  offlineWorkspace=null;pendingImport=null;close(true);cloudMessage=account?'Returning to your cloud account…':'Only on this device · sign in for cloud saving';
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
  const intro=demoMode?'Demo mode is active. These are fictional test records stored separately from your own logs.':offlineWorkspace?'Offline JSON workspace is active. Changes are local to this workspace until you export a new JSON.':account?'Your logs are saved to your Google account’s private cloud space.':'Device mode: these logs are only in this browser. Sign in to save them online.';
  return `<div class="page-head settings-page-head"><div class="settings-title-row"><div><p class="eyebrow">MAKE IT YOURS</p><h1>Settings<span class="accent">.</span></h1></div><span class="version-badge">${APP_VERSION}</span></div><p>${esc(intro)} Export backups regularly.</p></div>${accountPanel()}${googleSyncUsagePanel()}${offlineWorkspacePanel()}${storageProtectionPanel()}${healthPanel()}${appearancePanel()}${weekSettingsPanel()}<section class="panel"><h2>Your goals</h2><form data-form="settings" class="form"><div class="form-grid">${input('Daily calories','calories',data.settings.calories,'number','min="1" step="1" required')}${input('Daily protein (g)','protein',data.settings.protein,'number','min="1" step="1" required')}${input('Height (inches)','heightInches',data.settings.heightInches,'number','min="1" step="0.01" required')}<label class="field"><span>Weight unit</span><select name="unit"><option value="lb" ${data.settings.unit==='lb'?'selected':''}>Pounds (lb)</option><option value="kg" ${data.settings.unit==='kg'?'selected':''}>Kilograms (kg)</option></select></label></div><button class="primary" type="submit">Save goals</button></form><p class="hint">Changing weight units converts weigh-ins, lift logs, active Workout Buddy sets and saved workout history. BMI uses height in inches.</p></section>${dataHealthPanel()}<section class="panel spaced"><p class="eyebrow">MOVE YOUR DATA</p><h2>Import & backup</h2><p class="body-copy">Import Everyday data from a file or pasted text. CSV imports are additive; JSON restore is a full replacement. Both use the review screen before saving.</p>${button('Import data','import-data','outline')}${button(offlineWorkspace?'Export workspace JSON':'Export JSON backup','export','outline')}${button('Export Nutrition JSON','section-export','outline','data-section="nutrition"')}${button('Export Lifting JSON','section-export','outline','data-section="lifting"')}${button('Export Finances JSON','section-export','outline','data-section="finances"')}${button('Import separate JSON files','section-import-open','outline')}<p class="hint">Universal CSV can add saved foods, food logs, exercises, workout templates, lift logs, and independent weight and body-fat records. Legacy food CSVs still work.</p></section><section class="panel spaced"><div class="section-head"><h2>About this version</h2><span class="version-badge">${APP_VERSION}</span></div><p class="body-copy">Google sign-in saves account records to private Firebase space and keeps account-scoped recovery copies on this device while you are signed in. Offline JSON workspace data remains separate and never syncs automatically. Export backups for an independent copy. Cloud accounts save Nutrition, Lifting and Finances separately, each with an 800 KB limit. Keep a full backup for recovery.</p></section>`;
}
function modal(title,body,onBack=null) {modalBack=onBack;document.querySelector('#overlay').innerHTML=`<div class="scrim" data-action="close"></div><div class="modal" tabindex="-1" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-top"><h2>${esc(title)}</h2>${button('✕','close','close-btn','aria-label="Close"')}</div>${body}</div>`;document.querySelector('.modal')?.focus({preventScroll:true});}
function close(all=false) {pendingDeviceMigration=null;if(!all&&foodBatch.length&&document.querySelector('form[data-form="food"]')&&!confirm('Discard '+foodBatch.length+' unsaved food'+(foodBatch.length===1?'':'s')+'?'))return;foodBatch=[];document.body.classList.remove('exercise-progress-modal-open');importReadToken++;clearInterval(offlineExitTimer);offlineExitTimer=null;const back=modalBack;modalBack=null;document.querySelector('#overlay').innerHTML='';pendingImport=null;if(!all&&back)back();if(latestRelease)setTimeout(tryRefreshRelease,400);}
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

const foodCSVColumns=['recordType','date','name','calories','protein','quantity','time','saveAsFood'];
const csvQuote=value=>'"'+String(value??'').replaceAll('"','""')+'"';
function foodFormCSV(form){
 const v=form.elements,time=v.foodTime.value,minutes=time===''?null:Number(time)*30;
 const hhmm=minutes===null?'':String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');
 const save=v.saveAsFood?v.saveAsFood.checked:true;
 const values=['foodLog',v.date.value,v.name.value,v.calories.value,v.protein.value,v.quantity.value,hhmm,save?'true':'false'];
 return foodCSVColumns.join(',')+'\n'+values.map(csvQuote).join(',');
}
function refreshFoodCSV(form){
 const box=form?.querySelector('[data-food-csv]'),panel=form?.querySelector('.food-csv-panel');
 if(box&&panel&&!panel.hidden)box.value=foodFormCSV(form);
}
function pasteFoodFormCSV(form,raw){
 const rows=parseCSV(raw.replace(/^\uFEFF/,''));if(!rows.length)return;
 const first=rows[0].map(x=>x.trim().toLowerCase()),header=first.includes('name')&&first.includes('calories')&&first.includes('protein');
 const names=header?first:foodCSVColumns.map(x=>x.toLowerCase()),values=header?rows[1]:rows[0];
 if(!values)throw Error('Paste one food row after the header.');
 if((header&&rows.length!==2)||(!header&&rows.length!==1))throw Error('Paste one food entry at a time.');
 const get=k=>String(values[names.indexOf(k)]??'').trim(),type=get('recordtype').toLowerCase();
 if(type&&!['foodlog','foodentry','meal'].includes(type))throw Error('Expected a foodLog CSV row.');
 const name=get('name'),date=get('date'),cal=Number(get('calories')),protein=Number(get('protein')),quantity=get('quantity')?Number(get('quantity')):1,tm=get('time')||get('foodtime');
 if(!name||name.length>100||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)||!get('calories')||!get('protein')||!Number.isFinite(cal)||cal<0||!Number.isFinite(protein)||protein<0||!Number.isFinite(quantity)||quantity<=0)throw Error('CSV needs a date, food name, calories, protein and positive quantity.');
 let slot='';
 if(tm){
  const m=/^(\d{1,2}):(00|30)$/.exec(tm);
  slot=m?Number(m[1])*2+(m[2]==='30'?1:0):Number(tm);
  if(!Number.isInteger(slot)||slot<0||slot>47)throw Error('Time must be HH:00, HH:30, or a slot from 0 to 47.');
 }
 const fields=form.elements;fields.name.value=name;fields.calories.value=String(cal);fields.protein.value=String(protein);fields.date.value=date;fields.foodTime.value=String(slot);
 fields.quantity.value=String(quantity);syncTimeControl(fields.foodTime);form.querySelector('[data-food-quantity-display]').textContent=fmt(quantity);
 if(fields.saveAsFood&&['true','false'].includes(get('saveasfood').toLowerCase()))fields.saveAsFood.checked=get('saveasfood').toLowerCase()==='true';
 if(form.querySelector('.food-matches'))renderFoodMatches(form);
}

function foodDraftFromForm(form,optional=false){
 const v=Object.fromEntries(new FormData(form)),name=String(v.name||'').trim(),calText=String(v.calories??'').trim(),proteinText=String(v.protein??'').trim();
 if(optional&&!name&&!calText&&!proteinText)return null;
 const calories=Number(calText),protein=Number(proteinText),quantity=Number(v.quantity||1),time=v.foodTime===''||v.foodTime==null?null:Number(v.foodTime);
 if(!name||name.length>100||calText===''||proteinText===''||!Number.isFinite(calories)||calories<0||!Number.isFinite(protein)||protein<0||!Number.isFinite(quantity)||quantity<=0||!/^\d{4}-\d{2}-\d{2}$/.test(v.date)||(time!=null&&(!Number.isInteger(time)||time<0||time>47))){
  alert('Check the food name, calories, protein, servings, date and time.');return false;
 }
 const record={name,calories,protein,quantity,date:v.date};
 if(time!=null)record.t=time;
 return {record,cardId:v.cardId||'',saveAsFood:v.saveAsFood==='on'};
}
function foodBatchMarkup(){
 if(!foodBatch.length)return '';
 const total=foodBatch.reduce((sum,item)=>sum+item.record.calories*item.record.quantity,0);
 return '<section class="food-batch-list" aria-label="Foods ready to save"><div class="food-batch-heading"><strong>Ready to save · '+foodBatch.length+'</strong><small>'+fmt(total)+' cal · not saved yet</small></div>'+
  foodBatch.map((item,i)=>'<div class="food-batch-row"><span><strong>'+esc(item.record.name)+'</strong><small>'+fmt(item.record.quantity)+' × '+fmt(item.record.calories)+' cal · '+fmt(item.record.protein*item.record.quantity)+'g protein'+(item.inheritTime?' · Uses time below':'')+'</small></span><button type="button" data-action="food-batch-remove" data-index="'+i+'" aria-label="Remove '+esc(item.record.name)+' from batch">×</button></div>').join('')+
 '</section>';
}
function refreshFoodBatchView(){
 const form=document.querySelector('form[data-form="food"]');if(!form)return;
 const holder=form.querySelector('[data-food-batch]');if(holder)holder.innerHTML=foodBatchMarkup();
 const save=form.querySelector('[data-food-submit]');if(save){save.textContent=foodBatch.length?'Save foods':'Save food log';save.formNoValidate=foodBatch.length>0;}
}
function commitFoodDraft(target,draft){
 const {record,cardId,saveAsFood}=draft;
 let card=target.foods.find(f=>f.id===cardId)||target.foods.find(f=>foodNameKey(f.name)===foodNameKey(record.name)&&f.calories===record.calories&&f.protein===record.protein);
 if(!card&&saveAsFood){card={id:id(),name:record.name,calories:record.calories,protein:record.protein,kind:'food',tags:[],pinned:false,accuracy:'',lastUsed:new Date().toISOString()};target.foods.push(card);}
 else if(card)card.lastUsed=new Date().toISOString();
 const entry={id:id(),...record};target.foodEntries.push(entry);return {entry,savedCard:card};
}

function foodForm(entry=null,card=null,options={}) {
  if(!options.keepBatch)foodBatch=[];
  const onBack=document.querySelector('.full-food-log')?()=>foodLog():null;
  const dateValue=entry?.date||options.date||(chosenDate===currentTrackingDate()?localDate():chosenDate),timeValue=entry?(entry.t??null):(options.timeSlot!==undefined?options.timeSlot:(chosenDate===currentTrackingDate()?currentFoodSlot():null)),newManual=!entry&&!card;
  modal(entry?'Edit food log':card?'Log saved food':'Add food',`<form class="form" data-form="food"><input type="hidden" name="entryId" value="${esc(entry?.id||'')}"><input type="hidden" name="cardId" value="${esc(card?.id||'')}"><div data-food-batch>${foodBatchMarkup()}</div>${input('Food name','name',entry?.name||card?.name||'','text','maxlength="100" autocomplete="off" required')}${newManual?'<div class="food-matches" role="listbox" aria-label="Matching saved foods"></div>':''}<div class="form-grid">${input('Calories per serving','calories',entry?.calories??card?.calories??'','number','min="0" step="0.1" required')}${input('Protein (g) per serving','protein',entry?.protein??card?.protein??'','number','min="0" step="0.1" required')}</div><div class="form-grid"><div class="field food-quantity-field"><span>Servings</span><input type="hidden" name="quantity" value="${esc(entry?.quantity??options.quantity??1)}"><div class="food-quantity-quick"><button type="button" data-action="food-quantity-step" data-delta="-0.5" aria-label="Subtract half serving">−</button><strong data-food-quantity-display>${fmt(entry?.quantity??options.quantity??1)}</strong><button type="button" data-action="food-quantity-step" data-delta="0.5" aria-label="Add half serving">+</button></div><div class="food-quantity-presets"><button type="button" data-action="food-quantity" data-amount="0.5">½</button><button type="button" data-action="food-quantity" data-amount="1">1</button><button type="button" data-action="food-quantity" data-amount="2">2</button></div></div>${input('Date','date',dateValue,'date','required')}</div>${timeControl("foodTime",timeValue)}${newManual?'<label class="save-new-food-option"><input type="checkbox" name="saveAsFood" checked><span><strong>Save as new food</strong><small>Add this definition to the Food Library for future use.</small></span></label>':''}<div class="food-csv-block"><button type="button" class="text-btn" data-action="food-csv-toggle" aria-expanded="false">CSV ↔</button><div class="food-csv-panel" hidden><label class="field"><span>Copy or paste one food CSV row</span><textarea data-food-csv rows="3" spellcheck="false" placeholder="Paste a foodLog CSV row or a header and row"></textarea></label><small data-food-csv-status>Paste a row to fill the fields; Save to commit.</small></div></div><div class="form-actions">${!entry?button('+ Add another food','food-add-another','outline'):''}<button class="primary" type="submit" data-food-submit ${foodBatch.length?'formnovalidate':''}>${foodBatch.length?'Save foods':'Save food log'}</button>${entry?button('Delete log','delete-entry','danger',`data-id="${esc(entry.id)}"`):''}</div></form><p class="hint">Saved-food details are copied into this log. A one-off food can stay out of the Food Library while remaining fully preserved in this day’s log and JSON backup.</p>`,onBack);
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
function importHub(){
 modal('Import data','<div class="import-source-grid"><button type="button" class="outline" data-action="import-csv"><strong>CSV file</strong><small>Mixed Everyday records or legacy food CSV</small></button><button type="button" class="outline" data-action="paste-csv"><strong>Paste CSV</strong><small>Paste CSV text directly</small></button><button type="button" class="outline" data-action="restore"><strong>JSON backup</strong><small>Preview a full backup replacement</small></button><button type="button" class="outline" data-action="paste-json"><strong>Paste JSON</strong><small>Paste a complete Everyday backup</small></button></div><p class="hint">Universal CSV supports saved foods, food logs, exercises, workout templates, lift sets, weights, body fat, and prepared financial transactions. Every import still goes through the same review screen. Separate section JSON imports are available in Settings.</p>');
}
function importModal(kind,source='file') {
 pendingImport=null;importReadToken++;const paste=source==='paste',title=(paste?'Paste ':'Import ')+(kind==='csv'?'CSV':'JSON');
 modal(title,`<form class="form" data-form="import"><input type="hidden" name="kind" value="${kind}"><input type="hidden" name="source" value="${source}">${paste?'<label class="field"><span>Paste '+kind.toUpperCase()+'</span><textarea name="text" rows="12" maxlength="5000000" spellcheck="false" required placeholder="Paste '+kind.toUpperCase()+' here"></textarea></label>':'<label class="field"><span>Choose a .'+kind+' file</span><input type="file" name="file" accept="'+(kind==='csv'?'.csv,text/csv':'.json,application/json')+'" required></label>'}<button type="submit" class="primary">Preview import</button></form><div id="preview" role="status"></div>`);
}
app.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.querySelector('.modal')){event.preventDefault();close();}});
document.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.isComposing&&event.target.matches?.('[name=buddySetup]')){event.preventDefault();event.target.closest('.buddy-setup-editor')?.querySelector('[data-action="buddy-setup-save"]')?.click();}});
app.addEventListener('input',event=>{
 if(event.target.matches('[data-finance-history-search]')){
  financeHistoryQuery=event.target.value;financeHistoryVisible=50;refreshFinanceHistoryList();return;
 }
 if(event.target.closest('form[data-form="food"]')&&!event.target.matches('[data-food-csv]'))refreshFoodCSV(event.target.form);if(event.target.matches('[data-food-csv]')){const form=event.target.closest('form[data-form="food"]'),status=form?.querySelector('[data-food-csv-status]');try{pasteFoodFormCSV(form,event.target.value);if(status)status.textContent='Food values loaded. Review and save.';}catch(e){if(status)status.textContent=e.message;}return;}if(event.target.matches('[data-suggestion-search]')){refreshSuggestionSearch();return;}if(event.target.matches('[data-library-search]')){if(event.target.dataset.librarySearch==='food'){foodLibrarySearch=event.target.value;refreshFoodLibraryList();}else{exerciseLibrarySearch=event.target.value;refreshExerciseLibraryList();}return;}if(event.target.matches('[data-workout-add-search]')){const q=event.target.value.trim().toLowerCase();document.querySelectorAll('.workout-add-item').forEach(row=>row.hidden=q&&!row.dataset.search.includes(q));return;}if(event.target.matches('.lift-notes textarea')){const field=event.target;field.style.height='0px';field.style.height=field.scrollHeight+'px';requestAnimationFrame(()=>field.scrollIntoView({block:'nearest',behavior:'smooth'}));}if(event.target.name==='name'&&event.target.closest('form[data-form="food"]')?.querySelector('.food-matches'))renderFoodMatches(event.target.form);if(event.target.name==='exercise'&&event.target.closest('form[data-form="lift"]')?.querySelector('.exercise-matches'))renderExerciseMatches(event.target.form);});
function syncLiftViewport(){const dialog=document.querySelector('.lift-dialog');if(!dialog)return;const vv=window.visualViewport;if(vv)dialog.style.maxHeight=Math.max(260,vv.height-8)+'px';const field=document.activeElement;if(field?.closest?.('.lift-dialog')&&field.matches('input,textarea,select'))requestAnimationFrame(()=>field.scrollIntoView({block:'nearest',behavior:'smooth'}));}
app.addEventListener('focusin',event=>{if(!event.target.closest('.lift-dialog')||!event.target.matches('input,textarea,select'))return;setTimeout(syncLiftViewport,220);});
app.addEventListener('change',event=>{
 if(event.target.matches('[data-enrichment-choice]')&&pendingImport?.kind==='enrichment'){
  const txId=event.target.dataset.id;
  if(event.target.checked)pendingImport.selectedIds.add(txId);else pendingImport.selectedIds.delete(txId);
  showImportReview(pendingImport);return;
 }
 if(event.target.matches('.effort-select'))event.target.className='effort-select effort-'+(event.target.value||0);if(event.target.closest('.buddy-set-editor')){if(event.target.closest('.routine-history-editor'))routineHistoryCaptureDraft();else{buddyReadEditor();persist();}}if(event.target.matches('[name=buddyNotes]')){buddyReadNotes();persist();}});
if(window.visualViewport){window.visualViewport.addEventListener('resize',()=>{setTimeout(syncLiftViewport,40);syncExerciseProgressViewport();});window.visualViewport.addEventListener('scroll',()=>{syncLiftViewport();syncExerciseProgressViewport();});}
app.addEventListener('change',event=>{
 if(event.target.matches('[data-budget-month]')){budgetMonth=event.target.value;render();return;}
 if(event.target.dataset.financeInsightPeriod){financeInsightPeriod=event.target.value;render();return;}
 if(event.target.dataset.financeHistoryFilter){
  const field=event.target.dataset.financeHistoryFilter,value=event.target.value;
  if(field==='kind')financeHistoryKind=value;
  else if(field==='month')financeHistoryMonth=value;
  else if(field==='category')financeHistoryCategory=value;
  else if(field==='review')financeHistoryReview=value;
  else if(field==='sort')financeHistorySort=value;
  financeHistoryVisible=50;refreshFinanceHistoryList();return;
 }
 if(event.target.closest('form[data-form="food"]')&&!event.target.matches('[data-food-csv]'))refreshFoodCSV(event.target.form);if(event.target.dataset.libraryFilter){if(event.target.dataset.libraryFilter==='food'){foodLibraryFilter=event.target.value;refreshFoodLibraryList();}else{exerciseLibraryFilter=event.target.value;refreshExerciseLibraryList();}return;}if(event.target.dataset.sortScope){const scope=event.target.dataset.sortScope;if(scope==='food-page'){foodSort=event.target.value;render();}else if(scope==='food-library'){foodLibrarySort=event.target.value;foodLibrary();}else if(scope==='exercise-library'){exerciseLibrarySort=event.target.value;exerciseLibrary();}return;}if(event.target.name==='date'&&event.target.closest('form[data-form="food"]')&&!event.target.form.elements.entryId.value){const time=event.target.form.elements.foodTime;if(time){time.value=event.target.value===localDate()?String(currentFoodSlot()):'';syncTimeControl(time);refreshFoodCSV(event.target.form);}return;}if(event.target.name==='file'){pendingImport=null;const token=++importReadToken;const preview=document.querySelector('#preview')||document.querySelector('#offline-workspace-preview');if(preview)preview.textContent='';const bankForm=event.target.closest('form[data-form="finance-bank-import"]');if(bankForm)void inferSelectedBankLabel(bankForm,event.target.files?.[0],token);return;}if(event.target.name==='appearance'){window.everydayTheme?.set(event.target.value);return;}if(event.target.name==='date' && event.target.closest('.tracking-date') && !event.target.closest('.modal')) {if(event.target.value) {chosenDate=event.target.value;render();}}});
document.addEventListener('click',async event=>{
  const el=event.target.closest('[data-action]'); if(!el)return;const action=el.dataset.action;if((!authChecked&&!offlineWorkspace&&!demoMode&&action!=='offline-start')||importSaving)return;
  if(action==='demo-start'||action==='demo-reset'){if(account||offlineWorkspace)return;if(demoMode&&action==='demo-start')return;if(demoMode&&action==='demo-reset'&&!confirm('Reset all demo entries to the original sample?'))return;const fixture=createDemoData();try{storeDemoWorkspace(fixture);}catch{alert('This device could not open the demo workspace.');return;}demoMode=true;data=fixture;chosenDate=DEMO_LAST_DATE;page='home';cloudMessage='Demo mode · saved separately on this device';close(true);render();return;}
  if(action==='demo-exit'){if(!demoMode)return;if(data.activeWorkout&&!confirm('Exit demo during an active workout? The demo session will be discarded.'))return;demoMode=false;try{localStorage.removeItem(DEMO_WORKSPACE_KEY);}catch{}data=structuredClone(deviceData);chosenDate=currentTrackingDate();page='home';cloudMessage='Only on this device · sign in for cloud saving';close(true);render();promptWeight();return;}
  if(action==='sign-in'){if(demoMode)return alert('Exit demo mode before signing in.');if(offlineWorkspace)return alert('Exit the offline JSON workspace before changing cloud sign-in.');if(!cloudApi)return;try{await cloudApi.signIn();}catch(error){cloudMessage=describeCloudError(error);render();}return;}
  if(action==='sign-out'){if(offlineWorkspace)return alert('Exit the offline JSON workspace before changing cloud sign-in.');if(cloudBusy||cloudPending)return alert('Finish saving, or export your changes and load cloud data, before signing out.');const uid=account?.uid;try{await cloudApi.signOut();if(uid)clearCloudLocal(uid);}catch(error){cloudMessage=describeCloudError(error);render();}return;}
  if(action==='account'){page='settings';render();return;}
  if(action==='offline-start'){if(demoMode)return alert('Exit demo mode before starting an offline JSON workspace.');if(!offlineWorkspace&&account&&(cloudBusy||cloudPending))return alert('Finish or resolve the current cloud save before opening a separate workspace.');void refreshStorageProtection(true);offlineWorkspaceModal(false);return;}
  if(action==='offline-replace'){offlineWorkspaceModal(true);return;}
  if(action==='offline-export'){if(!offlineWorkspace)return;downloadJsonBackup(offlineOutputName(),true);return;}
  if(action==='offline-exit'){exitOfflineWorkspace();return;}
  if(action==='offline-exit-export'){if(!offlineWorkspace)return;downloadJsonBackup(offlineOutputName(),false,data);await performOfflineWorkspaceExit();return;}
  if(action==='offline-exit-without'){if(!offlineWorkspace||el.disabled)return;await performOfflineWorkspaceExit();return;}
  if(action==='cloud-load'){if(offlineWorkspace)return;if(cloudBusy)return;if(cloudPending){if(!confirm('Discard these unsaved device changes and load the latest cloud version? Export first if you want to keep them.'))return;if(account?.uid)clearCloudRecovery(account.uid);cloudRecovery=null;cloudRecoveryConflict=null;cloudPending=false;}await loadAccount();return;}
  if(action==='cloud-retry'){if(offlineWorkspace)return;if(!session?.ready){await loadAccount();if(session?.ready&&cloudPending&&!cloudRecoveryConflict)await persist();return;}await persist();return;}
  if(action==='cloud-recovery-export'){const recovery=cloudRecoveryConflict||cloudRecovery;if(!recovery)return;downloadJsonBackup('everyday-device-recovery-'+localDate()+'.json',false,recovery.data);return;}
  if(action==='cloud-recovery-discard'){if(!account?.uid||!cloudRecoveryConflict)return;if(!confirm('Discard the saved device recovery copy and keep the cloud version?'))return;clearCloudRecovery(account.uid);cloudRecovery=null;cloudRecoveryConflict=null;cloudPending=false;cloudMessage=session?.ready?'Loaded from your account':'Using the last confirmed device copy';render();return;}
  if(action==='storage-persist'){await refreshStorageProtection(true);return;}
  if(action==='migrate-device'){
    if(offlineWorkspace||demoMode||!account||!session?.ready||cloudBusy||cloudPending)return;
    try{
      const {candidate,summary}=planDeviceMigration(data,deviceData);
      pendingDeviceMigration={candidate,summary,uid:account.uid,revision:session.revision,cloudCopy:structuredClone(data),deviceCopy:structuredClone(deviceData)};
      const labels=[['foods','Saved foods'],['foodEntries','Food entries'],['lifts','Lift logs'],['weights','Weigh-ins'],['bodyFat','Body-fat entries'],['transactions','Financial transactions'],['exerciseDefinitions','Exercise definitions'],['workoutTemplates','Workout routines'],['workoutHistory','Saved Workout Buddy sessions']];
      const rows=labels.filter(([key])=>summary.added[key]||summary.skipped[key])
        .map(([key,label])=>'<div class="list-row"><span><strong>'+esc(label)+'</strong><small>'+summary.added[key]+' to copy · '+summary.skipped[key]+' already present or kept in cloud</small></span></div>').join('');
      const newRoutines=candidate.workoutTemplates.filter(w=>!data.workoutTemplates.some(old=>old.id===w.id));
      const newSessions=(candidate.workoutHistory||[]).filter(w=>!(data.workoutHistory||[]).some(old=>old.id===w.id));
      const newDefinitions=candidate.exerciseDefinitions.filter(e=>!data.exerciseDefinitions.some(old=>old.id===e.id));
      const names=(label,items,fn)=>items.length?'<details class="import-previous"><summary>'+label+' ('+items.length+')</summary><ul>'+items.slice(0,30).map(item=>'<li>'+esc(fn(item))+'</li>').join('')+'</ul>'+(items.length>30?'<p class="hint">Showing first 30 only</p>':'')+'</details>':'';
      const details=names('Routines being added',newRoutines,x=>x.name)+names('Saved sessions being added',newSessions,x=>(x.type||'Workout')+' · '+(x.date||x.startedAt||'No date'))+names('Exercises being added',newDefinitions,x=>x.name);
      const changes=Object.values(summary.added).reduce((n,x)=>n+x,0)+summary.filledSetups+(summary.activeWorkout==='imported'?1:0);
      const warnings=(summary.filledSetups?'<p class="hint">'+summary.filledSetups+' missing cloud exercise setups will be filled from the device copy.</p>':'')+(summary.idConflicts?'<p class="hint">'+summary.idConflicts+' conflicting IDs will be safely reassigned.</p>':'')+
       (summary.renamedRoutines?'<p class="hint">'+summary.renamedRoutines+' routine names will gain a “(device)” suffix to keep both versions.</p>':'')+
       (summary.setupConflicts?'<p class="hint">'+summary.setupConflicts+' matching exercise setups differ. The cloud setup is kept; the original device backup retains its version.</p>':'');
      modal('Review device copy','<div class="migration-review"><p class="body-copy"><strong>Copy into '+esc(account.email)+'</strong>. Existing cloud entries stay untouched. Your original device notebook remains available separately.</p>'+
        '<p class="body-copy">Original units: '+esc(summary.unitFrom)+' · Cloud units: '+esc(summary.unitTo)+(summary.unitFrom!==summary.unitTo?' (all device workout weights will be converted)':'')+'</p>'+
        (rows||'<p class="body-copy">No additional record entries identified.</p>')+
        '<p class="body-copy"><strong>Active workout:</strong> '+esc(summary.activeWorkout)+'.</p>'+warnings+details+
        '<p class="hint">'+(changes?'Review the counts, then copy.':'Nothing new to copy. You can mark this device copy reviewed.')+' No cloud record is deleted or replaced.</p>'+
        '<div class="form-actions">'+button(changes?'Copy '+changes+' items to cloud':'Mark as reviewed','migrate-device-confirm','primary')+
        button('Export original device JSON','migrate-device-export','outline')+button('Cancel','close','outline')+'</div></div>');
    }catch(error){
      pendingDeviceMigration=null;
      modal('Device copy paused','<p class="body-copy">'+esc(error.message)+'</p><p class="hint">Nothing has changed in your cloud or original device notebook.</p><div class="form-actions">'+button('Export original device JSON','migrate-device-export','outline')+button('Close','close','outline')+'</div>');
    }
    return;
  }
  if(action==='migrate-device-export'){downloadJsonBackup('everyday-original-device-'+localDate()+'.json',false,deviceData);return;}
  if(action==='migrate-device-confirm'){
    const plan=pendingDeviceMigration;
    if(!plan||!account||!session?.ready||cloudBusy||cloudPending)return;
    if(plan.uid!==account.uid||plan.revision!==session.revision||!sameCloudData(plan.cloudCopy,data)||!sameCloudData(plan.deviceCopy,deviceData)){
      pendingDeviceMigration=null;
      modal('Review expired','<p class="body-copy">The account or notebook changed after the preview. No migration was performed. Open the device copy review again before saving.</p>'+button('Close','close','outline'));
      return;
    }
    pendingDeviceMigration=null;close(true);
    if(sameCloudData(plan.candidate,data)){
      try{localStorage.setItem('everyday-migrated:'+account.uid,'yes');}catch{}
      render();return;
    }
    data=plan.candidate;
    if(await persist()){try{localStorage.setItem('everyday-migrated:'+account.uid,'yes');}catch{}render();}
    return;
  }
  if(!offlineWorkspace&&account&&(cloudRecoveryConflict||(!session?.ready&&!hasLocalCloudFallback()))&&!['home','food','gym','progress','finances','history','settings','account','export','close','finance-insights-open','finance-insights-back','budget-open','budget-back','edit-workout','workout-move','workout-remove','workout-add-picker','workout-add-exercise','food-library','exercise-library','exercise-progress','exercise-progress-all','data-health-details','food-suggest','food-suggest-anchor','food-suggest-more','food-suggest-skip','food-suggest-avoid','food-suggest-exclude','food-suggest-restore','food-suggest-unprefer'].includes(action))return;
  if(action==='classification-select-all'||action==='classification-select-none'){
   if(pendingImport?.kind!=='enrichment')return;
   const ids=pendingImport.groups.flatMap(g=>g.rows.map(row=>row.record.id));
   pendingImport.selectedIds=new Set(action==='classification-select-all'?ids:[]);
   showImportReview(pendingImport);return;
  }
  if(action==='classification-back'){page='finances';render();return;}
  if(action==='classification-rules-open'){page='classificationRules';render();return;}
  if(action==='classification-review-open'){page='classificationReview';classificationReviewVisible=50;render();return;}
  if(action==='classification-review-more'){classificationReviewVisible+=50;render();return;}
  if(action==='classification-new'){classificationRuleForm();return;}
  if(action==='classification-edit'){classificationRuleForm((data.classificationRules||[]).find(r=>r.id===el.dataset.id));return;}
  if(action==='classification-toggle'||action==='classification-delete'){
   const old=(data.classificationRules||[]).find(r=>r.id===el.dataset.id);if(!old)return;
   if(action==='classification-delete'&&!confirm('Delete this merchant classification rule?'))return;
   const next=structuredClone(data);
   if(action==='classification-delete')next.classificationRules=next.classificationRules.filter(r=>r.id!==old.id);
   else next.classificationRules=next.classificationRules.map(r=>r.id===old.id?{...r,enabled:!r.enabled}:r);
   try{data=normalizeData(next);await persist();}catch(error){alert(error.message);}render();return;
  }
  if(action==='classification-preview'){
   const proposals=classificationRuleProposals(data.transactions||[],data.classificationRules||[]);
   const plan=prepareRuleReview(data,proposals);if(!plan.candidate)return alert('Cannot preview suggestions.');
   pendingImport=plan;plan.filename='Saved merchant rules';showImportReview(plan);return;
  }
  if(action==='budget-open'){page='financeBudget';render();return;}
  if(action==='budget-back'){page='finances';render();return;}
  if(action==='budget-balance'){
   const p=data.budgetPlan;
   modal('Update available cash','<form class="form" data-form="budget-balance">'+
    input('Available balance (USD; negative permitted)','balance',p.balanceCents===null?'':(p.balanceCents/100).toFixed(2),'text','required inputmode="decimal"')+
    input('Balance is accurate at end of','balanceAsOf',localDate(),'date','required max="'+localDate()+'"')+
    '<p class="hint">Manually entered value only. Nothing is read from Bank of America or inferred from expenses.</p><button type="submit" class="primary">Use this balance</button></form>');return;
  }
  if(action==='budget-schedule-new'){budgetScheduleForm();return;}
  if(action==='budget-schedule-edit'){budgetScheduleForm(data.budgetPlan.schedules.find(x=>x.id===el.dataset.id));return;}
  if(action==='budget-schedule-delete'){
   if(!confirm('Remove this scheduled item and its payment markers? Bank transactions remain untouched.'))return;
   try{const plan=structuredClone(data.budgetPlan);plan.schedules=plan.schedules.filter(x=>x.id!==el.dataset.id);await budgetCommit(plan);render();}catch(e){alert(e.message);}return;
  }
  if(['budget-mark-paid','budget-mark-skipped','budget-mark-pending'].includes(action)){
   try{const plan=structuredClone(data.budgetPlan),rule=plan.schedules.find(x=>x.id===el.dataset.id);
    if(!rule)return;const status=action.slice('budget-mark-'.length);
    if(status==='pending')delete rule.occurrences[el.dataset.date];else rule.occurrences[el.dataset.date]=status;
    await budgetCommit(plan);render();}catch(e){alert(e.message);}return;
  }
  if(action==='budget-limit-new'){budgetLimitForm();return;}
  if(action==='budget-limit-edit'){budgetLimitForm(data.budgetPlan.categoryLimits.find(x=>x.category===el.dataset.category));return;}
  if(action==='budget-limit-delete'){
   if(!confirm('Remove this monthly category limit? Transactions stay unchanged.'))return;
   try{const plan=structuredClone(data.budgetPlan);plan.categoryLimits=plan.categoryLimits.filter(x=>x.category!==el.dataset.category);await budgetCommit(plan);render();}catch(e){alert(e.message);}return;
  }
  if(action==='finance-insights-open'){page='financeInsights';render();return;}
  if(action==='finance-insights-back'){page='finances';render();return;}
  if(action==='finance-history-open'){page='financeHistory';financeHistoryReview='all';financeHistoryVisible=50;render();return;}
  if(action==='finance-review-open'){page='financeHistory';financeHistoryReview='needs-review';financeHistoryKind='all';financeHistoryMonth='all';financeHistoryCategory='all';financeHistoryQuery='';financeHistoryVisible=50;render();return;}
  if(action==='finance-history-back'){page='finances';render();return;}
  if(action==='finance-history-more'){financeHistoryVisible+=50;refreshFinanceHistoryList();return;}
  if(['home','food','gym','progress','finances','history','settings'].includes(action)){page=action;render();return;}
  if(action==='close'){close();return;}
  if(action.startsWith('health-')){await healthAction(action);return;}
  if(action==='today'){chosenDate=currentTrackingDate();render();return;}
  if(action==='go-date'){chosenDate=el.dataset.date;page='food';render();return;}
  if(action==='muscle-guide'){
    if(document.body.classList.contains('buddy-active')){buddyReadEditor();buddyReadNotes();buddyMuscleView=el.dataset.name;buddyMuscleGroupView=null;buddyOpen();}
    else openMuscleGuide(el.dataset.name,el.dataset.equipment);
    return;
  }
  if(action==='buddy-muscle-back'){buddyMuscleView=null;buddyMuscleGroupView=null;buddyOpen();return;}
  if(action==='buddy-muscle-group-back'){buddyMuscleGroupView=null;buddyOpen();return;}
  if(action==='muscle-group-detail'){
    const group=el.dataset.group,name=el.dataset.exercise;
    if(document.body.classList.contains('buddy-active')){if(!buddyMuscleView)return;buddyMuscleGroupView=group;buddyOpen();}
    else openMuscleGroupDetail(group,name);
    return;
  }
  if(action==='muscle-related-exercise'){
    const name=el.dataset.name,equipment=el.dataset.equipment||'other';if(!name)return;
    if(document.body.classList.contains('buddy-active')){buddyMuscleView=name;buddyMuscleGroupView=null;buddyOpen();}
    else openMuscleGuide(name,equipment);
    return;
  }
  if(action==='routine-muscle-guide'){
    if(!workoutEditorState)return;
    workoutEditorCapture();
    const i=Number(el.dataset.index),item=workoutEditorState.exercises[i],e=item&&resolveWorkoutExercise(item);
    if(!e)return;
    openMuscleGuide(e.name,e.equipment,()=>workoutTemplateForm(null,true));
    return;
  }
  if(action==='routine-history-all'){routineHistoryAll();return;}
  if(action==='routine-history-detail'){routineHistoryDetail(el.dataset.id,el.dataset.fromFull==='true'||Boolean(el.closest('.routine-history-all')));return;}
  if(action==='routine-history-edit-exercise'){routineHistoryEditExercise(el.dataset.id,Number(el.dataset.exerciseIndex),el.dataset.fromFull==='true');return;}
  if(action==='routine-history-select-set'){
    const state=routineHistoryEditDraft,index=Number(el.dataset.index);
    if(!state||!Number.isInteger(index)||index<0||index>=state.sets.length)return;
    routineHistoryCaptureDraft();state.setIndex=index;routineHistoryRenderEditor();return;
  }
  if(action==='routine-history-edit-cancel'){
    const state=routineHistoryEditDraft;routineHistoryEditDraft=null;
    if(state)routineHistoryDetail(state.sessionId,state.fromFullHistory);return;
  }
  if(action==='exercise-progress'){exerciseProgressModal(el.dataset.name,el.dataset.equipment);return;}
  if(action==='exercise-progress-all'){exerciseProgressAll();return;}
  if(action==='data-health-details'){dataHealthDetails();return;}
  if(action==='workout'){workout=el.dataset.workout;render();return;}

  if(action==='buddy-exit'){buddyReadEditor();buddyReadNotes();buddyReadSetupDraft();await persist();buddyClose();render();return;}
  if(action==='buddy-end'){if(!data.activeWorkout)return;buddyEndOptions();return;}
  if(action==='buddy-save-end'){const s=data.activeWorkout;if(!s)return;s.exercises.forEach(e=>buddyUpsertLift(s,e));s.endedAt=isoNow();s.savedEarly=true;data.workoutHistory.push(structuredClone(s));data.activeWorkout=null;close(true);buddyClose();await persist();render();return;}
  if(action==='buddy-delete-prompt'){if(!data.activeWorkout)return;buddyDeletePrompt();return;}
  if(action==='buddy-delete-confirm'){const s=data.activeWorkout;if(!s)return;data.lifts=data.lifts.filter(l=>l.buddySessionId!==s.id);data.activeWorkout=null;close(true);buddyClose();await persist();render();return;}
  if(action==='exercise-library'){exerciseLibrary();return;}
  if(action==='new-exercise-def'){exerciseDefinitionForm();return;}
  if(action==='routine-new-exercise'){if(!workoutEditorState)return;exerciseDefinitionForm(null,'routine');return;}
  if(action==='edit-exercise-def'){exerciseDefinitionForm(data.exerciseDefinitions?.find(x=>x.id===el.dataset.id));return;}
  if(action==='routine-manage'){routineManager();return;}
  if(action==='routine-new'){routineStarterPicker();return;}
  if(action==='routine-starter'){const preset=routinePresets.find(p=>p.key===el.dataset.key);if(!preset)return;newRoutineEditor(preset.name,routinePresetExercises(preset));return;}
  if(action==='routine-edit'){const w=savedWorkouts().find(w=>w.id===el.dataset.id);if(!w)return;workoutTemplateForm(w.name);return;}
  if(action==='routine-copy'){const w=savedWorkouts().find(w=>w.id===el.dataset.id);if(!w)return;newRoutineEditor(w.name+' copy',w.exercises);return;}
  if(action==='routine-delete-prompt'){const w=savedWorkouts().find(w=>w.id===el.dataset.id);if(w)routineDeletePrompt(w);return;}
  if(action==='routine-delete-confirm'){
    if(el.disabled)return;
    const index=(data.workoutTemplates||[]).findIndex(w=>w.id===el.dataset.id);
    if(index<0)return;
    const deleted=data.workoutTemplates[index];
    if(data.activeWorkout?.workoutId===deleted.id)return alert('End the active workout before deleting this routine.');
    routineDeletedStack.push({routine:structuredClone(deleted),index,wasSelected:workout===deleted.name});
    data.workoutTemplates.splice(index,1);
    if(workout===deleted.name)workout=data.workoutTemplates[0]?.name||'';
    close(true);await persist();render();routineManager();return;
  }
  if(action==='routine-undo-delete'){
    const undo=routineDeletedStack.at(-1);if(!undo)return;
    if(data.workoutTemplates.some(w=>w.id===undo.routine.id)){routineDeletedStack.pop();routineManager();return;}
    const restored=structuredClone(undo.routine);
    if(data.workoutTemplates.some(w=>w.name.trim().toLowerCase()===restored.name.trim().toLowerCase()))restored.name=nextRoutineName(restored.name);
    data.workoutTemplates.splice(Math.min(undo.index,data.workoutTemplates.length),0,restored);
    routineDeletedStack.pop();
    if(undo.wasSelected)workout=restored.name;
    await persist();render();routineManager();return;
  }
  if(action==='edit-workout'){workoutTemplateForm(workout);return;}
  if(action==='workout-move'){workoutEditorCapture();const i=Number(el.dataset.index),d=Number(el.dataset.direction),j=i+d;if(!workoutEditorState||!Number.isInteger(i)||!Number.isInteger(j)||j<0||j>=workoutEditorState.exercises.length)return;[workoutEditorState.exercises[i],workoutEditorState.exercises[j]]=[workoutEditorState.exercises[j],workoutEditorState.exercises[i]];workoutTemplateForm(null,true);return;}
  if(action==='workout-remove'){workoutEditorCapture();const i=Number(el.dataset.index);if(!workoutEditorState||!Number.isInteger(i)||i<0||i>=workoutEditorState.exercises.length)return;workoutEditorState.exercises.splice(i,1);workoutTemplateForm(null,true);return;}
  if(action==='workout-add-picker'){workoutExercisePicker();return;}
  if(action==='workout-add-exercise'){const def=data.exerciseDefinitions?.find(x=>x.id===el.dataset.id);if(!def||!workoutEditorState||workoutEditorState.exercises.some(x=>x.exerciseId===def.id))return;workoutEditorState.exercises.push({exerciseId:def.id,repMin:def.name==='Calf Extension'?10:6,repMax:def.name==='Calf Extension'?16:12,targetSets:2,restSeconds:90});workoutTemplateForm(null,true);return;}
  if(action==='buddy-launch'){if(data.activeWorkout){buddyOpen();return;}modal('Start Workout Buddy',`<div class="buddy-start-list">${savedWorkouts().filter(x=>x.exercises.length>0).map(x=>`<button data-action="buddy-start" data-workout="${esc(x.name)}"><span><strong>${esc(x.name)}</strong><small>${x.exercises.length} exercises · Bike warm-up first</small></span><b>›</b></button>`).join('')||'<p class="empty">Add exercises to a routine before starting Workout Buddy.</p>'}</div>`);return;}
  if(action==='buddy-start'){close(true);void refreshStorageProtection(true);buddyStart(el.dataset.workout);buddyOpen();return;}
  if(action==='buddy-bike-done'){const s=data.activeWorkout;if(!s||s.phase!=='bike')return;buddyCaptureUndo(s,'bike finished');s.phase='picker';s.bikeCompletedAt=isoNow();await buddyPersist();return;}
  if(action==='buddy-choose'){const s=data.activeWorkout,e=s&&buddyFind(s,el.dataset.key);if(!e)return;buddyCaptureUndo(s,'start exercise');e.status='active';e.selectedAt=isoNow();if(!Number.isInteger(e.reviewSetIndex))e.draft=buddyDraft(e,e.sets.length);s.selected=el.dataset.key;s.phase='exercise';if(!Array.isArray(s.performedOrder))s.performedOrder=[];if(!s.performedOrder.includes(buddyKey(e)))s.performedOrder.push(buddyKey(e));await buddyPersist();return;}
  if(action==='buddy-setup-toggle'||action==='buddy-setup-save'||action==='buddy-journal-toggle'||action==='buddy-toggle-history'){
   buddyReadEditor();buddyReadNotes();
   const s=data.activeWorkout,e=s&&s.selected?buddyFind(s,s.selected):null;
   if(!e||e.activeSetStartedAt)return;
   if(action==='buddy-setup-toggle'){
     if(e.setupEditing){
       // Closing the editor without Save means cancel the incomplete change.
       delete e.setupDraft;e.setupEditing=false;
     }else{
       e.setupDraft=e.setup||'';e.setupEditing=true;
     }
     // Draw and focus within this same user tap: awaiting cloud/device save
     // first prevents iOS from opening the software keyboard reliably.
     buddyOpen();
     if(e.setupEditing){
       const field=document.querySelector('#buddy-root [name=buddySetup]');
       field?.focus({preventScroll:true});
       field?.select();
     }
     await persist();return;
   }
   if(action==='buddy-setup-save'){
     buddyReadSetupDraft();
     const setup=String(e.setupDraft??e.setup??'').trim().slice(0,200);
     const def=data.exerciseDefinitions?.find(x=>x.id===e.exerciseId);
     if(setup){e.setup=setup;if(def)def.setup=setup;}else{delete e.setup;if(def)delete def.setup;}
     e.setupEditing=false;delete e.setupDraft;
   }else if(action==='buddy-journal-toggle')e.journalOpen=!e.journalOpen;
   else e.showRecent=!e.showRecent;
   await buddyPersist();return;
 }
  if(action==='buddy-review-next'){buddyReadEditor();buddyReadNotes();const s=data.activeWorkout,e=s&&s.selected?buddyFind(s,s.selected):null;if(!e||!Number.isInteger(e.reviewSetIndex))return;const finished=e.sets.length>=buddyTargetSets(e);buddyCaptureUndo(s,finished?'finish exercise':'start next set');delete e.reviewSetIndex;if(finished)buddyCompleteExercise(s,e);else{e.draft=buddyDraft(e,e.sets.length);e.activeSetStartedAt=isoNow();e.restStartedAt=null;e.status='active';}await buddyPersist();return;}
  if(action==='buddy-adjust'){const root=el.closest('.buddy-set-editor');if(!root)return;const field=el.dataset.field==='weight'?'buddyWeight':'buddyReps',input=root.querySelector('[name='+field+']');if(!input)return;const delta=Number(el.dataset.delta)||0,current=Number(input.value)||0,next=el.dataset.field==='weight'?Math.max(0,Math.round((current+delta)*10)/10):Math.max(1,Math.round(current+delta));input.value=next;if(el.closest('.routine-history-editor'))routineHistoryCaptureDraft();else{buddyReadEditor();persist();}return;}
  if(action==='buddy-effort'){const root=el.closest('.buddy-exercise-view,.routine-history-editor'),input=root?.querySelector('[name=buddyDifficulty]');if(!input)return;input.value=el.dataset.value;root.querySelectorAll('.buddy-effort').forEach(btn=>{const selected=btn===el;btn.classList.toggle('selected',selected);btn.setAttribute('aria-pressed',selected?'true':'false');});if(root.matches('.routine-history-editor'))routineHistoryCaptureDraft();else{buddyReadEditor();persist();}return;}
  if(action==='buddy-notes-toggle'){
   buddyReadNotes();
   const s=data.activeWorkout,e=s&&s.selected?buddyFind(s,s.selected):null;
   if(!e)return;
   const opening=!e.notesOpen;e.notesOpen=opening;
   if(opening){
     // Keep a keyboard-opening focus in the direct click stack on iPhone.
     buddyOpen();
     document.querySelector('#buddy-root [name=buddyNotes]')?.focus({preventScroll:true});
     await persist();
   }else await buddyPersist();
   return;
 }
  if(action==='buddy-undo'){buddyReadNotes();const s=data.activeWorkout;if(!canUndoBuddyTransition(s))return;buddyUndo(s);await buddyPersist();return;}
  if(action==='buddy-picker'){buddyReadEditor();buddyReadNotes();const s=data.activeWorkout;if(s){s.phase='picker';s.selected=null;delete s.undo;}await buddyPersist();return;}
  if(action==='buddy-back-picker'){const s=data.activeWorkout;if(s){s.phase='picker';delete s.completedAt;delete s.undo;}await buddyPersist();return;}
  if(action==='buddy-a'){buddyReadEditor();buddyReadNotes();const s=data.activeWorkout,e=s&&s.selected?buddyFind(s,s.selected):null;if(!e||Number.isInteger(e.reviewSetIndex))return;const i=e.sets.length,d=e.draft||buddyDraft(e,i);buddyCaptureUndo(s,e.activeSetStartedAt?`finish set ${i+1}`:`start set ${i+1}`);if(!e.activeSetStartedAt){e.draft=d;e.activeSetStartedAt=isoNow();e.restStartedAt=null;e.status='active';await buddyPersist();return;}const finishedAt=isoNow();e.sets.push({weight:d.weight,reps:d.reps,...(d.difficulty?{difficulty:d.difficulty}:{}),startedAt:e.activeSetStartedAt,finishedAt,durationSeconds:buddySeconds(e.activeSetStartedAt,finishedAt)});delete e.activeSetStartedAt;delete e.draft;e.reviewSetIndex=e.sets.length-1;e.restStartedAt=finishedAt;e.restSeconds=Number.isInteger(e.restSeconds)?e.restSeconds:90;await buddyPersist();return;}
  if(action==='buddy-confirm-finish'){const s=data.activeWorkout;if(!s)return;s.completedAt=s.completedAt||isoNow();data.workoutHistory.push(structuredClone(s));data.activeWorkout=null;await persist();buddyClose();render();return;}

  if(action==='food-progress-period'){foodProgressPeriod=el.dataset.period||'week';foodProgressOffset=0;render();return;}
  if(action==='food-progress-nav'){foodProgressOffset=Math.min(0,foodProgressOffset+Number(el.dataset.delta||0));render();return;}
  if(action==='food-progress-current'){foodProgressOffset=0;render();return;}
  if(action==='weight-all'){weightHistoryAll();return;}
  if(action==='weight'){weightForm();return;}
  if(action==='body-fat'){bodyFatForm();return;}
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
  if(action==='apply-food-suggestion'){
    const suggestion=foodSuggestionState?.suggestions?.[Number(el.dataset.index)];if(!suggestion)return;
    const date=chosenDate===currentTrackingDate()?localDate():chosenDate,timeSlot=chosenDate===currentTrackingDate()?currentFoodSlot():null;
    foodBatch=suggestion.items.map(item=>({record:{name:item.food.name,calories:item.food.calories,protein:item.food.protein,quantity:item.q,date},cardId:item.food.id,saveAsFood:false,inheritTime:true}));
    foodSuggestionState=null;foodForm(null,null,{keepBatch:true,date,timeSlot});return;
  }
  if(action==='new-food-def'){foodDefinitionForm(null,'library');return;}
  if(action==='edit-food-def'){foodDefinitionForm(data.foods.find(x=>x.id===el.dataset.id),'library');return;}
  if(action==='delete-food-def'){const origin=el.dataset.origin||'library';data.foods=data.foods.filter(x=>x.id!==el.dataset.id);close(true);await persist();if(origin==='library')foodLibrary();else render();return;}
  if(action==='time-step'||action==='time-clear'||action==='time-now'){
    const input=el.closest('[data-time-stepper]')?.querySelector('[data-time-value]');
    if(!input)return;
    const isMinutes=input.closest('[data-time-stepper]').dataset.timeUnit==='minutes';
    const step=isMinutes?30:1,max=isMinutes?1440:48;
    let next;
    if(action==='time-clear'){if(isMinutes)return;next='';}
    else if(action==='time-now'){if(isMinutes)return;next=String(currentFoodSlot());}
    else{
      const current=input.value===''?(isMinutes?data.settings.dayResetMinutes??360:currentFoodSlot()):Number(input.value),delta=Number(el.dataset.delta);
      if(isMinutes)next=String((current+delta*step+max)%max);
      else{
        const dateField=input.form?.elements.date,date=dateField?.value;
        if(date){const stepped=stepFoodDateTime(date,current,delta);next=String(stepped.t);
          if(dateField)dateField.value=stepped.date;
          }
        else next=String((current+delta+max)%max);
      }
    }
    input.value=next;syncTimeControl(input);
    if(action==='time-now'){
      if(input.form?.elements.date)input.form.elements.date.value=localDate();
      
    }
    if(input.name==='foodTime')refreshFoodCSV(input.form);
    
    return;
  }
  if(action==='food-quantity'||action==='food-quantity-step'){const form=el.closest('form[data-form="food"]');if(!form)return;const hidden=form.elements.quantity,old=Number(hidden.value)||1,value=action==='food-quantity'?Number(el.dataset.amount):Math.max(.25,Math.round((old+Number(el.dataset.delta))*100)/100);if(!Number.isFinite(value)||value<=0)return;hidden.value=String(value);form.querySelector('[data-food-quantity-display]').textContent=fmt(value);refreshFoodCSV(form);return;}
  if(action==='food-csv-toggle'){const form=el.closest('form[data-form="food"]'),panel=form?.querySelector('.food-csv-panel');if(!panel)return;panel.hidden=!panel.hidden;el.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)panel.querySelector('textarea').value=foodFormCSV(form);return;}
  if(action==='food-add-another'){
    const form=el.closest('form[data-form="food"]');if(!form||form.elements.entryId.value)return;
    const draft=foodDraftFromForm(form);if(!draft)return;
    foodBatch.push(draft);foodForm(null,null,{keepBatch:true,date:draft.record.date,timeSlot:draft.record.t??null});return;
  }
  if(action==='food-batch-remove'){
    const i=Number(el.dataset.index);if(!Number.isInteger(i)||i<0||i>=foodBatch.length)return;
    foodBatch.splice(i,1);refreshFoodBatchView();return;
  }
  if(action==='new-food'){foodForm();return;}
  if(action==='choose-food-match'){const form=el.closest('form[data-form="food"]'),food=data.foods.find(x=>x.id===el.dataset.id);if(!form||!food)return;form.elements.cardId.value=food.id;form.elements.name.value=food.name;form.elements.calories.value=food.calories;form.elements.protein.value=food.protein;const saveOption=form.querySelector('.save-new-food-option');if(saveOption)saveOption.hidden=true;form.querySelector('.food-matches').innerHTML='<div class="food-match-selected"><span><strong>'+esc(food.name)+'</strong><small>Using saved food · '+fmt(food.calories)+' cal · '+fmt(food.protein)+'g protein</small></span><button type="button" class="text-btn" data-action="clear-food-match">Change</button></div>';return;}
  if(action==='clear-food-match'){const form=el.closest('form[data-form="food"]');form.elements.cardId.value='';const saveOption=form.querySelector('.save-new-food-option');if(saveOption){saveOption.hidden=false;form.elements.saveAsFood.checked=true;}renderFoodMatches(form);form.elements.name.focus();return;}
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
  if(action.startsWith('delete-')) {if(!confirm('Delete this item?'))return;const key={'delete-entry':'foodEntries','delete-card':'foods','delete-lift':'lifts','delete-weight':'weights','delete-body-fat':'bodyFat'}[action];data[key]=data[key].filter(x=>x.id!==el.dataset.id);close(true);persist();return;}
  if(action==='finance-bofa-import'){financeBankModal();return;}
   if(action==='finance-export-enrichment'){financeExportEnrichment();return;}
   if(action==='finance-enrichment-paste'){financeEnrichmentPaste();return;}
   if(action==='finance-edit'){financeEditForm(data.transactions.find(tx=>tx.id===el.dataset.id));return;}
   if(action==='finance-paste-csv'){financeCsvPaste();return;}
   if(action==='finance-csv-example'){financeCsvExample();return;}
   if(action==='finance-delete'){
     const record=data.transactions.find(tx=>tx.id===el.dataset.id);
     if(!record||!confirm('Delete this transaction?'))return;
     const candidate=structuredClone(data);candidate.transactions=candidate.transactions.filter(tx=>tx.id!==record.id);
     data=candidate;financeNotice='Transaction removed.';close(true);await persist();return;
   }
   if(action==='import-data'){importHub();return;}
  if(action==='import-csv'){importModal('csv','file');return;}
  if(action==='paste-csv'){importModal('csv','paste');return;}
  if(action==='restore'){importModal('json','file');return;}
  if(action==='paste-json'){importModal('json','paste');return;}
  if(action==='section-export'){if(ACCOUNT_SECTIONS.includes(el.dataset.section))downloadSectionBackup(el.dataset.section);return;}
  if(action==='section-import-open'){sectionImportModal();return;}
  if(action==='export'){downloadJsonBackup(offlineWorkspace?offlineOutputName():`everyday-backup-${localDate()}.json`,Boolean(offlineWorkspace));return;}
  if(action==='import-more'){expandImportGroup(el);return;}
  if(action==='choose-import'){importModal(el.dataset.kind,el.dataset.source||'file');return;}
  if(action==='commit-import'){await commitImport();return;}
});
app.addEventListener('submit',async event=>{
  const form=event.target;if(!form.dataset.form)return;event.preventDefault();
  // Ordinary food, workout and finance logs remain usable when iOS suspends an
  // in-flight cloud request. persist() journals them to device recovery first.
  // Full-file imports still require a stable cloud revision for safe previewing.
  const stableCloudForms=new Set(['finance-bank-import','import','section-import']);
  if(importSaving||(!offlineWorkspace&&account&&stableCloudForms.has(form.dataset.form)&&
      (cloudBusy||cloudPending||!session?.ready||cloudRecoveryConflict))){
    let status=form.querySelector('[data-save-blocked]');
    if(!status){status=document.createElement('p');status.className='finance-error';status.setAttribute('role','alert');status.dataset.saveBlocked='';form.prepend(status);}
    status.textContent=importSaving?'Finish the current import first.':
      'Bank and backup imports need a fully synchronized account. Resolve the cloud save warning or retry syncing before importing. Ordinary logging remains available and is saved on this device.';
    return;
  }
  const v=Object.fromEntries(new FormData(form));
  if(form.dataset.form==='section-import'){
   const files=[...(form.querySelector('[name=files]')?.files||[])],preview=form.parentElement.querySelector('#preview');
   if(!files.length)return;
   pendingImport=null;const token=++importReadToken;
   if(preview)preview.textContent='Validating the selected section files…';
   try{
    if(files.length>3)throw Error('Select at most three section files.');
    const parsed=[],seen=new Set();
    for(const file of files){
     if(file.size>5_000_000)throw Error('A section JSON file exceeds 5 MB.');
     const raw=await file.text();
     if(new TextEncoder().encode(raw).length>5_000_000)throw Error('A section JSON file exceeds 5 MB.');
     const value=JSON.parse(raw);
     if(!ACCOUNT_SECTIONS.includes(value?.section)||seen.has(value.section))
      throw Error('Use one unique Nutrition, Lifting or Finances section per file.');
     seen.add(value.section);parsed.push(value);
    }
    if(token!==importReadToken||!form.isConnected)return;
    const ordered=[...parsed].sort((a,b)=>ACCOUNT_SECTIONS.indexOf(a.section)-ACCOUNT_SECTIONS.indexOf(b.section));
    let candidate=structuredClone(data);
    const incomingNutrition=ordered.find(file=>file.section==='nutrition');
    const hasLifting=ordered.some(file=>file.section==='lifting');
    if(incomingNutrition&&hasLifting&&incomingNutrition.data?.settings?.unit!==candidate.settings.unit){
     // The matching Lifting file replaces the old lifting records; do not interpret
     // existing saved sets under the incoming Nutrition weight unit during staging.
     candidate.lifts=[];candidate.workoutHistory=[];candidate.activeWorkout=null;
    }
    const changed=[];
    for(const file of ordered){
     candidate=applySection(candidate,file);
     const section=file.section;
     const summary=SECTION_KEYS[section].map(key=>{
      const value=file.data[key];
      return key+': '+(Array.isArray(value)?value.length+' records':key==='activeWorkout'?(value?'active':'none'):'included');
     }).join(' · ');
     changed.push({key:section,label:section[0].toUpperCase()+section.slice(1)+' JSON',from:0,to:1,
      detail:'Replaces only this section. '+summary});
    }
    if(!offlineWorkspace&&account)encodeState(candidate);
    const plan={kind:'sections',base:JSON.stringify(data),candidate,groups:[],errors:[],warnings:[
     'Selected sections REPLACE their existing contents. Unselected sections are preserved. Save a full JSON backup before confirming.'
    ],duplicates:0,replaced:0,removed:0,added:0,unchanged:0,changeCount:changed.length,settingChanges:[],
     otherChanges:changed,promptChanged:false,filename:files.map(x=>x.name).join(', '),source:'sections'};
    pendingImport=plan;showImportReview(plan);
   }catch(error){if(token===importReadToken&&form.isConnected&&preview){preview.textContent=error.message;preview.setAttribute('role','alert');}}
   return;
  }
  if(form.dataset.form==='finance-bank-import'){
    const file=form.querySelector('[name=file]')?.files?.[0],preview=form.parentElement.querySelector('#preview');
    if(!file)return;
    pendingImport=null;const token=++importReadToken;
    if(preview)preview.textContent='Reading Bank of America CSV…';
    try{
      if(file.size>5_000_000)throw Error('The bank file must be under 5 MB.');
      const text=await file.text();if(new TextEncoder().encode(text).length>5_000_000)throw Error('Bank CSV is too large.');
      if(token!==importReadToken||!form.isConnected)return;
      const statementLabel=String(v.statementLabel||'').trim()||inferBofaStatementLabel(text);
      if(!statementLabel)throw Error('Cannot infer a statement date range from this CSV. Enter a statement/batch label manually.');
      const labelField=form.elements.statementLabel;
      if(!labelField.value.trim()){labelField.value=statementLabel;labelField.dataset.autoLabel=statementLabel;}
      const plan=prepareBankImport(text,data,{accountLabel:v.accountLabel,statementLabel});
      plan.filename=file.name||'Bank of America CSV';plan.source='bank';
      if(!offlineWorkspace&&account&&plan.candidate){try{encodeState(plan.candidate);}catch(e){plan.errors.push(e.message);plan.candidate=null;}}
      pendingImport=plan;showImportReview(plan);
    }catch(error){if(token===importReadToken&&form.isConnected&&preview){preview.textContent=error.message;preview.setAttribute('role','alert');}}
    return;
  }
  if(form.dataset.form==='budget-balance'){
    try{const plan=structuredClone(data.budgetPlan);plan.balanceCents=budgetDollar(v.balance);
     plan.balanceAsOf=v.balanceAsOf;await budgetCommit(plan);close(true);render();}
    catch(error){alert(error.message);}return;
   }
   if(form.dataset.form==='budget-limit'){
    try{const plan=structuredClone(data.budgetPlan);
     plan.categoryLimits=plan.categoryLimits.filter(x=>x.category!==v.previousCategory&&x.category!==v.category);
     plan.categoryLimits.push({category:v.category,amountCents:parseFinanceAmount(v.budgetAmount)});
     await budgetCommit(plan);close(true);render();}
    catch(error){alert(error.message);}return;
   }
   if(form.dataset.form==='budget-schedule'){
    try{const plan=structuredClone(data.budgetPlan);
     const existing=plan.schedules.find(x=>x.id===v.budgetId);
     const row={id:existing?.id||id(),name:String(v.budgetName||'').trim(),kind:v.budgetKind,
      amountCents:parseFinanceAmount(v.budgetAmount),frequency:v.budgetFrequency,startDate:v.budgetStartDate,
      occurrences:existing?.occurrences||{}};
     plan.schedules=existing?plan.schedules.map(x=>x.id===existing.id?row:x):[...plan.schedules,row];
     await budgetCommit(plan);close(true);render();}
    catch(error){alert(error.message);}return;
   }
   if(form.dataset.form==='budget-scenario'){
    try{const planned=parseFinanceAmount(v.scenarioAmount),next=forecastPurchase(data.budgetPlan,localDate(),35,planned);
     modal('Planned purchase','<p class="body-copy">If you spent '+formatFinanceAmount(planned)+' now, your lowest projected cash balance would be <strong>'+
      budgetMoney(next.minimumCents)+'</strong>, and the 35-day end balance would be <strong>'+budgetMoney(next.endCents)+'</strong>.</p>'+
      (next.shortfall?'<p class="budget-warning">This scenario forecasts a shortfall.</p>':'')+
      '<p class="hint">An estimate using manual available cash and scheduled future transactions only. This purchase is not saved.</p>'+
      button('Close','close','outline'));}
    catch(error){alert(error.message);}return;
   }
   if(form.dataset.form==='classification-rule'){
    try{
     const existing=(data.classificationRules||[]).find(rule=>rule.id===v.ruleId);
     const rule={id:existing?.id||id(),name:String(v.name||'').trim(),matchText:String(v.matchText||'').trim(),
      matchField:String(v.matchField||'any'),category:String(v.category||'').trim(),
      subcategory:String(v.subcategory||'').trim(),merchant:String(v.merchant||'').trim(),
      enabled:existing?.enabled!==false};
     if(String(v.ruleAmount||'').trim())rule.amountCents=parseFinanceAmount(v.ruleAmount);
     const next=structuredClone(data);next.classificationRules=normalizeClassificationRules(
       existing?next.classificationRules.map(r=>r.id===existing.id?rule:r):[...next.classificationRules,rule]);
     const checked=normalizeData(next);if(account&&!offlineWorkspace)encodeState(checked);
     data=checked;close(true);await persist();page='classificationRules';render();
    }catch(error){alert(error.message);}return;
   }
  if(form.dataset.form==='finance'||form.dataset.form==='finance-edit'){
     const editing=form.dataset.form==='finance-edit',existing=editing?data.transactions.find(tx=>tx.id===v.transactionId):null;
     if(editing&&!existing)return alert('This transaction no longer exists.');
     if(!editing&&data.transactions.length>=50000)return alert('Financial transaction limit reached. Export a backup.');
     const showError=message=>{
       let status=form.querySelector('[data-finance-error]');
       if(!status){status=document.createElement('p');status.dataset.financeError='';status.className='finance-error';status.setAttribute('role','alert');form.prepend(status);}
       status.textContent=message;
     };
     let record;
     try{record=financeRecordFromForm(v,existing);}catch(error){showError(error.message);return;}
     const candidate=structuredClone(data);
     if(editing)candidate.transactions=candidate.transactions.map(tx=>tx.id===existing.id?record:tx);
     else candidate.transactions.push(record);
     try{normalizeData(candidate);if(account&&!offlineWorkspace)encodeState(candidate);}
     catch(error){showError(error.message);return;}
     data=candidate;financeNotice=editing?'Transaction updated.':'Transaction added.';
     if(editing)close(true);
     const saved=await persist();
     if(!saved){financeNotice='Entry is in this session, but saving needs attention. Check the sync warning or export a backup.';render();}
     return;
   }
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
  if(form.dataset.form==='exercise-definition'){
    const name=v.name.trim(),equipment=v.equipment||'other',setup=(v.setup||'').trim(),existing=data.exerciseDefinitions?.find(x=>x.id===v.exerciseId);
    if(!name||name.length>100||!['machine','cable','dumbbell','bench','calisthenics','other'].includes(equipment)||setup.length>200)return alert('Check the exercise definition.');
    const duplicate=data.exerciseDefinitions?.find(x=>x.id!==v.exerciseId&&x.name.toLowerCase()===name.toLowerCase()&&x.equipment===equipment);
    if(duplicate)return alert('That exercise already exists with this equipment.');
    let created=null;
    if(existing){
      const oldName=existing.name,oldEquipment=existing.equipment;Object.assign(existing,{name,equipment});
      if(setup)existing.setup=setup;else delete existing.setup;
      data.lifts.forEach(l=>{if(l.exercise.toLowerCase()===oldName.toLowerCase()&&(l.equipment||'other')===oldEquipment){l.exercise=name;l.equipment=equipment;}});
    }else{
      created={id:id(),name,equipment,...(setup?{setup}:{})};data.exerciseDefinitions.push(created);
    }
    if(v.returnTo==='routine'&&created&&workoutEditorState&&!workoutEditorState.exercises.some(e=>e.exerciseId===created.id)){
      workoutEditorState.exercises.push({exerciseId:created.id,repMin:6,repMax:12,targetSets:2,restSeconds:90});
    }
    close(true);await persist();
    if(v.returnTo==='routine'&&workoutEditorState)workoutTemplateForm(null,true);else render();
    return;
  }
  if(form.dataset.form==='workout-template'){
    workoutEditorCapture();if(!workoutEditorState)return;
    const state=workoutEditorState,name=state.name.trim();
    if(!name||name.length>80)return alert('Enter a routine name (up to 80 characters).');
    if((data.workoutTemplates||[]).some(w=>w.id!==state.id&&w.name.trim().toLowerCase()===name.toLowerCase()))return alert('A routine already has that name.');
    if(state.isNew&&(data.workoutTemplates||[]).length>=100)return alert('The routine library is at its 100-routine limit.');
    const seen=new Set();
    for(const item of state.exercises){
      const def=data.exerciseDefinitions?.find(x=>x.id===item.exerciseId);
      if(!def||seen.has(item.exerciseId)||!Number.isInteger(item.repMin)||!Number.isInteger(item.repMax)||item.repMin<1||item.repMax<item.repMin||item.repMax>100||!Number.isInteger(item.targetSets)||item.targetSets<1||item.targetSets>10||!Number.isInteger(item.restSeconds)||item.restSeconds<0||item.restSeconds>1800)return alert('Check the routine exercises, reps, sets and rest times.');
      seen.add(item.exerciseId);
    }
    if(state.isNew)data.workoutTemplates.push({id:id(),name,exercises:structuredClone(state.exercises)});
    else{const existing=data.workoutTemplates?.find(w=>w.id===state.id);if(!existing)return alert('This routine was not found.');existing.name=name;existing.exercises=structuredClone(state.exercises);}
    workout=name;workoutEditorState=null;close(true);await persist();render();return;
  }
  if(form.dataset.form==='week-settings'){const dayResetMinutes=Number(v.dayResetMinutes);if(!Number.isInteger(dayResetMinutes)||dayResetMinutes<0||dayResetMinutes>1410||dayResetMinutes%30!==0)return;const oldToday=currentTrackingDate();data.settings.weekStart=FIXED_WEEK_START;data.settings.dayResetMinutes=dayResetMinutes;if(chosenDate===oldToday)chosenDate=currentTrackingDate();await persist();return;}
  if(form.dataset.form==='settings') {const calories=Number(v.calories),protein=Number(v.protein),heightInches=Number(v.heightInches);if([calories,protein,heightInches].some(x=>!Number.isFinite(x)||x<=0))return alert('Enter positive goals and height.');if(v.unit!==data.settings.unit){try{data=convertNotebookWeightUnit(data,v.unit);}catch(error){return alert(error.message);}}data.settings={...data.settings,calories,protein,heightInches,unit:v.unit};persist();return;}
  if(form.dataset.form==='food-definition'){const name=v.name.trim(),calories=Number(v.calories),protein=Number(v.protein),kind=v.kind==='drink'?'drink':'food',tags=v.ingredient==='yes'?['ingredient']:[],pinned=v.pinned==='yes',accuracy=['label','estimate'].includes(v.accuracy)?v.accuracy:'',origin=v.origin||'food',existing=data.foods.find(x=>x.id===v.foodId);if(!name||name.length>100||!Number.isFinite(calories)||calories<0||!Number.isFinite(protein)||protein<0)return alert('Check the food definition.');const duplicate=data.foods.find(x=>x.id!==v.foodId&&x.name.toLowerCase()===name.toLowerCase()&&x.calories===calories&&x.protein===protein);if(duplicate)return alert('That saved food already exists.');if(existing)Object.assign(existing,{name,calories,protein,kind,tags,pinned,accuracy,lastUsed:existing.lastUsed||new Date().toISOString()});else data.foods.push({id:id(),name,calories,protein,kind,tags,pinned,accuracy,lastUsed:new Date().toISOString()});close(true);await persist();if(origin==='library')foodLibrary();else render();return;}
  if(form.dataset.form==='food') {
    const draft=foodDraftFromForm(form,foodBatch.length>0);
    if(draft===false||(!draft&&!foodBatch.length))return;
    const edited=data.foodEntries.find(x=>x.id===v.entryId);
    if(edited){
      if(!draft)return;Object.assign(edited,draft.record);
      if(draft.record.t==null)delete edited.t;
      chosenDate=currentFoodTrackingDate(edited);close(true);await persist();return;
    }
    const prepared=foodBatch.map(item=>{
      if(!item.inheritTime)return item;
      const next={...item,record:{...item.record,date:v.date}};
      if(v.foodTime!=='')next.record.t=Number(v.foodTime);else delete next.record.t;
      return next;
    });
    if(draft)prepared.push(draft);
    if(!prepared.length)return;
    const candidate=structuredClone(data);let last;
    for(const item of prepared)last=commitFoodDraft(candidate,item);
    data=candidate;chosenDate=currentFoodTrackingDate(last.entry);
    foodBatch=[];close(true);await persist();
    if(prepared.length===1&&last.savedCard)showFoodUndo(last.entry.id,last.entry.name);
    return;
  }
  if(form.dataset.form==='routine-history-exercise'){
    const state=routineHistoryEditDraft;if(!state)return;
    routineHistoryCaptureDraft();
    const session=(data.workoutHistory||[]).find(s=>s.id===state.sessionId),exercise=session?.exercises?.[state.exerciseIndex];
    if(!exercise||exercise.sets.length!==state.sets.length)return alert('This saved exercise has changed. Close and reopen its editor.');
    const corrected=[];
    for(const set of state.sets){
      const weight=Number(set.weight),reps=Number(set.reps),difficulty=Number(set.difficulty)||0;
      if(set.weight===''||set.reps===''||!Number.isFinite(weight)||weight<0||!Number.isInteger(reps)||reps<1||!Number.isInteger(difficulty)||difficulty<0||difficulty>7)
        return alert('Check each set for a valid weight, reps and effort.');
      const next={...set,weight,reps};if(difficulty)next.difficulty=difficulty;else delete next.difficulty;
      corrected.push(next);
    }
    exercise.sets=corrected;
    exercise.notes=state.notes;
    buddyUpsertLift(session,exercise);
    const {sessionId,fromFullHistory}=state;
    routineHistoryEditDraft=null;
    await persist();
    routineHistoryDetail(sessionId,fromFullHistory);
    return;
  }
  if(form.dataset.form==='lift') {const rows=[...form.querySelectorAll('.set-row')],sets=rows.map(r=>{const difficulty=Number(r.querySelector('[name=difficulty]').value);const set={weight:Number(r.querySelector('[name=weight]').value),reps:Number(r.querySelector('[name=reps]').value)};if(Number.isInteger(difficulty)&&difficulty>=1&&difficulty<=7)set.difficulty=difficulty;return set;});if(!v.exercise.trim()||!v.date||!sets.length||sets.some(s=>!Number.isFinite(s.weight)||s.weight<0||!Number.isInteger(s.reps)||s.reps<1))return alert('Check the exercise, date, and sets.');const item=data.lifts.find(x=>x.id===v.liftId);const record={exercise:v.exercise.trim(),equipment:v.equipment||'other',date:v.date,sets,notes:v.notes.trim()};if(item){Object.assign(item,record);delete item.difficulty;}else data.lifts.push({id:id(),...record});chosenDate=v.date;close(true);persist();return;}
  if(form.dataset.form==='weight') {const value=Number(v.value);if(!Number.isFinite(value)||value<=0||!v.date)return alert('Enter a positive weight and date.');const item=data.weights.find(x=>x.id===v.weightId)||data.weights.find(x=>x.date===v.date);const next={date:v.date,value};if(item){Object.assign(item,next);delete item.source;delete item.recordedAt;}else data.weights.push({id:id(),...next});if(v.date===currentTrackingDate())markWeightPromptSeen(currentTrackingDate());close(true);persist();return;}
  if(form.dataset.form==='body-fat'){const value=Number(v.value);if(!Number.isFinite(value)||value<=0||value>100||!v.date)return alert('Enter a body-fat percentage from 0.1 to 100 and a date.');const item=(data.bodyFat||[]).find(x=>x.id===v.bodyFatId);const next={date:v.date,value};if(item){Object.assign(item,next);delete item.source;delete item.recordedAt;}else data.bodyFat.push({id:id(),...next});close(true);persist();return;}
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
if(!globalThis.Capacitor?.isNativePlatform?.()&&'serviceWorker' in navigator && location.protocol==='https:'){navigator.serviceWorker.register('./sw.js?v=98.2',{updateViaCache:'none'}).then(reg=>reg.update()).catch(()=>{});navigator.serviceWorker.addEventListener('controllerchange',()=>{if(latestRelease)tryRefreshRelease();else void checkLatestRelease();});}

function accountBanner(){
  if(demoMode)return '<div class="account-banner demo-banner" role="status"><span>Demo mode<small>Fictional sample records · no account connected</small></span>'+button('Exit demo','demo-exit','outline small')+'</div>';
  if(offlineWorkspace)return '<div class="account-banner offline-workspace-banner" role="status"><span>Offline JSON workspace<small>'+esc(offlineWorkspace.filename)+' · '+(offlineWorkspace.dirty?'changes since export':'saved locally')+'</small></span>'+button('Workspace','account','text-btn')+'</div>';
  return `<div class="account-banner" role="status"><span>${esc(!authChecked?'—':account?account.email:'Device mode')}<small>${esc(isLoading()?'—':cloudMessage)}</small></span>${account?button('Account','account','text-btn'):cloudReady?button('Sign in with Google','sign-in','outline small'):button('Account','account','text-btn','disabled')}</div>`;
}
function cloudSaveWarning(){
  if(demoMode||offlineWorkspace||!account)return '';
  if(cloudRecoveryConflict)return `<div class="save-warning" role="alert"><strong>A device recovery copy needs review.</strong><p>The cloud changed after this device recovery was created, so Everyday did not overwrite either copy. Export the recovery JSON before discarding it if you may need those changes.</p>${button('Export device recovery','cloud-recovery-export','outline small')}${button('Keep cloud · discard recovery','cloud-recovery-discard','outline small')}</div>`;
  if(cloudPending&&!cloudBusy)return `<div class="save-warning" role="alert"><strong>Changes are safe on this device but not confirmed online.</strong><p>${esc(cloudMessage)}</p>${button(session?.ready?'Retry cloud save':'Reconnect & sync','cloud-retry','outline small')}${button('Export unsaved backup','export','outline small')}${button('Load latest cloud data','cloud-load','outline small')}</div>`;
  return '';
}
function accountPanel(){
  if(demoMode)return '<section class="panel demo-account-panel"><h2>Demo data</h2><p class="body-copy">A separate set of fictional nutrition, body weight and Workout Buddy records. No changes can be sent to your account or normal device logs.</p>'+button('Reset demo data','demo-reset','outline')+button('Exit demo','demo-exit','outline')+'</section>';
  if(offlineWorkspace){
    const cloudLine=account?'Signed in as '+account.email+'. Cloud loading and saving resume after you exit this workspace.':'Cloud account access is paused while this workspace is active.';
    return '<section class="panel"><h2>Cloud account paused</h2><p class="body-copy">'+esc(cloudLine)+'</p><p class="hint">Workspace edits cannot overwrite Firebase by accident. Export the workspace JSON, exit offline mode, then use the normal restore preview to apply it deliberately.</p></section>';
  }
  let migrated=false;try{migrated=localStorage.getItem('everyday-migrated:'+account?.uid)==='yes';}catch{}
  return `<section class="panel"><h2>${account?'Your account':'Save across devices'}</h2><p class="body-copy">${account?esc(account.email):'Sign in with Google to keep food, lifting and weight logs in your own cloud account. Each person gets separate records.'}</p>${account?`${button('Refresh from cloud','cloud-load','outline')}${button('Sign out','sign-out','outline')}${hasDeviceMigrationContent(deviceData)?`<p class="body-copy">${migrated?'Original device data was copied before. Review again to find routines or Workout Buddy sessions older migrations may have missed.':'Original device notebook found. Review additions before copying logs, routines and Workout Buddy sessions into this account. The device notebook remains separate.'}</p>${button(migrated?'Review original device notebook':'Review & copy device notebook','migrate-device',migrated?'outline':'primary')}`:''}`:cloudReady?button('Sign in with Google','sign-in','primary'):`<p>${esc(cloudMessage)}</p>`}<p class="hint">Google manages sign-in. Firebase stores account logs. While you stay signed in, Everyday also keeps a last-confirmed device copy plus any unsaved recovery copy so an offline refresh does not depend on RAM. Signing out clears those account-specific device copies.</p>${!account?button('Load demo data','demo-start','outline'):''}</section>`;
}
async function loadAccount(){
  if(offlineWorkspace||demoMode)return;const active=session;if(!active)return;cloudBusy=true;cloudMessage='Loading your cloud logs…';render();
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
function promptWeight(){if(demoMode)return;const day=currentTrackingDate();if(shouldPrompt(data)&&!weightPromptSeen(day))setTimeout(()=>{const currentDay=currentTrackingDate();if(!shouldPrompt(data)||weightPromptSeen(currentDay)||cloudBusy||cloudPending||!(offlineWorkspace||!account||session?.ready)||document.querySelector('.modal'))return;markWeightPromptSeen(currentDay);weightForm(null,true);},300);}
async function startCloud(){
  try{
    const cloud=await import('./cloud.js?v=98.2');describeCloudError=cloud.cloudError;
    cloudApi=await cloud.connectCloud(async(user,nextSession)=>{
      const previousUid=account?.uid;session?.close();session=nextSession;account=user;authChecked=true;cloudPending=false;cloudBusy=false;pendingImport=null;
      if(previousUid&&previousUid!==user?.uid)clearCloudLocal(previousUid);
      cloudConfirmed=null;cloudRecovery=null;cloudRecoveryConflict=null;
      healthState={enabled:false,status:''};healthCheckedAt=0;
      if(offlineWorkspace){data=structuredClone(offlineWorkspace.data);cloudMessage='Offline JSON workspace · cloud saving paused';render();promptWeight();return;}
      if(demoMode&&user){demoMode=false;try{localStorage.removeItem(DEMO_WORKSPACE_KEY);}catch{}}
      if(demoMode&&!user){cloudMessage='Demo mode · saved separately on this device';render();return;}
      data=user?emptyData():structuredClone(deviceData);
      if(user)await loadAccount();else{cloudMessage='Only on this device · sign in for cloud saving';render();promptWeight();}
    });
    cloudReady=true;render();if(!offlineWorkspace&&!demoMode)void syncHealth();
  }catch(error){authChecked=true;cloudMessage=offlineWorkspace?'Offline JSON workspace · cloud unavailable, local editing still works':'Cloud login unavailable. Device logs still work. Reload to retry.';render();promptWeight();}
}
window.addEventListener('beforeunload',event=>{captureCriticalLocalState();if(!offlineWorkspace&&(cloudPending||cloudBusy)){event.preventDefault();event.returnValue='';}});
window.addEventListener('pagehide',()=>captureCriticalLocalState());
function resumePendingCloudSave(){
  if(demoMode||offlineWorkspace||!account||cloudBusy||!cloudPending||cloudRecoveryConflict)return;
  if(session?.ready)void persist();
  else if(hasLocalCloudFallback())void loadAccount();
}
window.addEventListener('online',()=>{void checkLatestRelease();resumePendingCloudSave();});

function appearancePanel(){
  const selected=window.everydayTheme?.preference || 'system';
  return `<section class="panel"><h2>Appearance</h2><label class="field spaced"><span>Theme</span><select name="appearance">${[['system','System — follow device'],['dark','Dark'],['light','Light']].map(([value,label])=>`<option value="${value}" ${selected===value?'selected':''}>${label}</option>`).join('')}</select></label><p class="hint">Saved on this device. System follows your phone’s light or dark appearance.</p></section>`;
}

function dateHeader(label){
  return `<div class="date-row tracking-date">${input(label,'date',chosenDate,'date','required')}${button('Today','today','outline small','aria-label="Go to today"')}</div>`;
}

function weekSettingsPanel(){
  return `<section class="panel spaced"><h2>Your calendar</h2><form data-form="week-settings" class="form"><p class="body-copy"><strong>Weeks start Friday.</strong></p>${timeControl("dayResetMinutes",data.settings.dayResetMinutes??360,{label:"Day resets at",minutes:true,optional:false})}<button class="primary" type="submit">Save calendar settings</button></form><p class="hint">The reset time defines your tracking day. With a 6:00 AM reset, a 2:30 AM food log still belongs to the previous day.</p></section>`;
}

function importRecord(key,item,unit){
  const r=item.record;
  const title=key==='foods'||key==='foodEntries'?r.name:key==='lifts'?r.exercise:key==='transactions'?r.description:key==='bodyFat'?`${fmt(r.value)}% body fat`:`${fmt(r.value)} ${unit}`;
  const foodEntryDetails=key==='foodEntries'?`${r.date}${r.t!=null?' · '+foodTimeLabel(r.t):''} · ${fmt(r.calories*r.quantity)} cal · ${fmt(r.protein*r.quantity)}g protein${r.quantity!==1?` · ${fmt(r.quantity)} servings · ${fmt(r.calories)} cal / ${fmt(r.protein)}g each`:''}`:'';
  const details=key==='foods'?`${fmt(r.calories)} cal · ${fmt(r.protein)}g protein per serving${r.lastUsed?' · Last used '+r.lastUsed:''}`:key==='foodEntries'?foodEntryDetails:key==='lifts'?`${r.date} · ${r.sets.map(set=>`${fmt(set.weight)} ${unit} × ${set.reps}${set.difficulty?` · effort ${set.difficulty}`:''}`).join(' · ')}`:key==='weights'?r.date:key==='bodyFat'?`${r.date} · Body-fat measurement`:key==='transactions'?`${r.date}${r.time?' '+r.time:''} · ${r.kind} · $${(r.amountCents/100).toFixed(2)} · ${r.category}${r.merchant?' · '+r.merchant:''}`:r.date;
  const badges=(item.badges||[]).filter(Boolean),attention=badges.some(b=>/duplicate|Replaces|Removed|Multiple|differs/i.test(b))||item.libraryAction==='nutrition-diff';
  const rowRef=item.sourceRow?`<small class="import-row-ref">CSV row ${item.sourceRow}</small>`:'';
  const rawBank=key==='transactions'&&r.bankDescription?`<small class="finance-raw-description">Bank: ${esc(r.bankDescription)}</small>`:'';
  const sourceBank=key==='transactions'&&r.accountLabel?`<small>${esc(r.accountLabel)} · ${esc(r.statementLabel||'')}</small>`:'';
  const itemization=key==='transactions'&&r.itemization?`<small class="finance-itemized">${esc(r.itemization)}</small>`:'';
  const libraryEffect=key==='foodEntries'&&item.libraryDetail?`<div class="import-library-effect ${esc(item.libraryAction||'')}"><span aria-hidden="true">${item.libraryAction==='one-off'?'○':item.libraryAction==='existing'?'✓':item.libraryAction==='nutrition-diff'?'!':'+'}</span><strong>${esc(item.libraryDetail)}</strong></div>`:'';
  const badgeHtml=badges.length?`<div class="import-badges">${badges.map(b=>`<span class="import-badge ${/duplicate|Replaces|Removed|Multiple|differs/i.test(b)?'attention':''}">${esc(b)}</span>`).join('')}</div>`:'';
  return `<div class="list-row import-record"><div><strong>${esc(title)}</strong><small>${esc(details)}</small>${rowRef}${rawBank}${sourceBank}${itemization}${libraryEffect}${key==='lifts'&&r.notes?`<p class="import-note">${esc(r.notes)}</p>`:''}${badgeHtml}${item.previous?`<details class="import-previous"><summary>Existing record being replaced</summary>${importRecord(key,{record:item.previous,badges:[]},pendingImport.currentSettings.unit)}</details>`:''}</div></div>`;
}
function visibleImportRows(group,removed=false){
  const rows=removed?group.removedRows:group.rows;
  return pendingImport?.kind==='csv'&&group.key==='foods'&&!removed?rows.filter(row=>!row.implicit):rows;
}
function renderImportRows(groupKey,rows,unit){
  if(pendingImport?.kind==='csv'&&groupKey==='foodEntries'){
    const dates=new Map();
    for(const row of rows){const date=currentFoodTrackingDate(row.record);if(!dates.has(date))dates.set(date,[]);dates.get(date).push(row);}
    return [...dates].map(([date,dateRows])=>`<section class="import-date-block"><p class="import-date-label">${esc(niceDate(date))}<span>${dateRows.length} entr${dateRows.length===1?'y':'ies'}</span></p>${dateRows.map(row=>importRecord(groupKey,row,unit)).join('')}</section>`).join('');
  }
  return rows.map(row=>importRecord(groupKey,row,unit)).join('');
}

function importGroup(group,removed=false){
  const rows=visibleImportRows(group,removed);if(!rows.length)return'';
  const key=group.key+(removed?'-removed':''),unit=removed?pendingImport.currentSettings.unit:pendingImport.kind==='json'?pendingImport.settings.unit:data.settings.unit;
  const title=removed?'Removed '+group.label:(pendingImport.kind==='json'?'Changed '+group.label:group.key==='foods'?'Food Library changes':group.key==='foodEntries'?'Food entries':group.label);
  const open=pendingImport.kind==='csv'&&group.key==='foods'&&!removed?'':' open';
  return '<details class="import-group import-group-'+group.key+'"'+open+'><summary>'+esc(title)+'<span>'+rows.length+'</span></summary><div id="import-'+key+'">'+renderImportRows(group.key,rows.slice(0,50),unit)+'</div>'+(rows.length>50?button('Show next '+Math.min(50,rows.length-50)+' (50 of '+rows.length+' shown)','import-more','outline small','data-group="'+group.key+'" data-removed="'+removed+'" data-shown="50"'):'')+'</details>';
}

function expandImportGroup(el){
  if(!pendingImport)return;const g=pendingImport.groups.find(g=>g.key===el.dataset.group);if(!g)return;
  const removed=el.dataset.removed==='true',rows=visibleImportRows(g,removed),shown=Number(el.dataset.shown),next=Math.min(shown+50,rows.length);
  const unit=removed?pendingImport.currentSettings.unit:pendingImport.kind==='json'?pendingImport.settings.unit:data.settings.unit;
  document.querySelector('#import-'+g.key+(removed?'-removed':'')).insertAdjacentHTML('beforeend',renderImportRows(g.key,rows.slice(shown,next),unit));
  if(next===rows.length)el.remove();else{el.dataset.shown=next;el.textContent='Show next '+Math.min(50,rows.length-next)+' ('+next+' of '+rows.length+' shown)';}
}

function showImportReview(plan,saveError=''){
  const json=plan.kind==='json',incomingCount=json?plan.groups.reduce((n,g)=>n+g.total,0):(plan.display?.count??plan.changeCount);
  const bankInfo=plan.kind==='bank'&&plan.bankDetails?
   '<section class="finance-bank-review"><strong>'+esc(plan.bankDetails.accountLabel)+' · '+esc(plan.bankDetails.statementLabel)+'</strong>'+
   '<small>'+esc(plan.bankDetails.format)+' · '+plan.bankDetails.negative+' withdrawals · '+plan.bankDetails.positive+' credits · '+plan.bankDetails.skipped+' non-transaction rows skipped'+(plan.bankDetails.zeroAmountSkipped?' (including '+plan.bankDetails.zeroAmountSkipped+' $0.00 notices)':'')+'</small>'+
   '<p>Bank date is the posted date. Review transfer and refund classifications before confirming.</p></section>':'';

  const labels={calories:'Daily calories',protein:'Daily protein (g)',heightInches:'Height (inches)',unit:'Weight unit',weekStart:'Week starts on',dayResetMinutes:'Day resets at'};
  const settingValue=(key,value)=>key==='weekStart'?weekDays[value]:key==='dayResetMinutes'?clockLabel(value):typeof value==='object'?JSON.stringify(value):String(value);
  const settingsChanges=plan.settingChanges.map(change=>'<div class="list-row import-record"><div><strong>'+esc(labels[change.key]||change.key)+'</strong><small>'+esc(settingValue(change.key,change.from))+' → '+esc(settingValue(change.key,change.to))+'</small><span class="import-badge attention">Replaces setting</span></div></div>').join('');
  const promptChange=plan.promptChanged?'<div class="list-row import-record"><div><strong>Daily weight-prompt date</strong><small>'+esc(plan.currentPromptDate||'Not set')+' → '+esc(plan.promptDate||'Not set')+'</small><span class="import-badge attention">Changes</span></div></div>':'';
  const otherChanges=plan.otherChanges.map(change=>'<div class="list-row import-record"><div><strong>'+esc(change.label)+'</strong><small>'+esc(change.detail||change.from+' → '+change.to)+'</small><span class="import-badge attention">Changes</span></div></div>').join('');
  if(plan.kind==='enrichment'&&!plan.selectedIds)
    plan.selectedIds=new Set(plan.groups.flatMap(g=>g.rows.map(row=>row.record.id)));
  const changedGroups=plan.kind==='enrichment'?
    '<section class="finance-batch-select"><p>'+plan.selectedIds.size+' of '+
    plan.groups.reduce((n,g)=>n+g.rows.length,0)+' proposed changes selected</p>'+
    button('Select all','classification-select-all','outline small')+
    button('Select none','classification-select-none','outline small')+'</section>'+
    plan.groups.flatMap(g=>g.rows).map(row=>{
     const tx=row.record,original=row.previous||{},fields=['kind','description','category','subcategory','merchant','note','purchaseDate','time','itemization'];
     const changes=fields.filter(field=>String(tx[field]||'')!==String(original[field]||'')).map(field=>
      '<div class="finance-review-diff"><small>'+esc(field)+': '+esc(String(original[field]||'(empty)'))+
      ' → '+esc(String(tx[field]||'(empty)'))+'</small></div>').join('');
     return '<label class="list-row import-record finance-batch-row"><input type="checkbox" data-enrichment-choice data-id="'+
       esc(tx.id)+'"'+(plan.selectedIds.has(tx.id)?' checked':'')+'>'+
       '<span><strong>'+esc(tx.description)+'</strong><small>'+esc(tx.date)+' · '+formatFinanceAmount(tx.amountCents)+'</small>'+
       changes+'</span></label>';
    }).join(''):
    plan.groups.map(g=>importGroup(g)).join('');
  const removedGroups=json?plan.groups.map(g=>importGroup(g,true)).join(''):'';
  const changesBody=plan.changeCount?settingsChanges+promptChange+otherChanges+changedGroups+removedGroups:'<p class="empty">No data changes detected in this file.</p>';
  const errors=plan.errors.length?'<div class="import-alert" role="alert"><strong>Cannot import · '+plan.errors.length+' issue'+(plan.errors.length===1?'':'s')+'</strong><p>Fix the file and preview it again. No records will be committed.</p><ul>'+plan.errors.map(e=>'<li>'+esc(e)+'</li>').join('')+'</ul></div>':'';
  const warnings=plan.warnings.length?'<details class="import-alert import-needs-review" open><summary>Needs review · '+plan.warnings.length+' warning'+(plan.warnings.length===1?'':'s')+'</summary><ul>'+plan.warnings.map(w=>'<li>'+esc(w)+'</li>').join('')+'</ul></details>':'';
  const saveAlert=saveError?'<div class="import-alert" role="alert"><strong>Import was not saved</strong><p>'+esc(saveError)+'</p><p>Your current in-memory records are unchanged.</p></div>':'';
  const cleanStatus=!saveError&&!plan.errors.length&&!plan.warnings.length?'<div class="import-clean-status"><span>✓</span><strong>No conflicts detected</strong></div>':'';
  const library=plan.display?.foodLibrarySummary;
  const libraryBits=!json&&library?[library.newSaved?library.newSaved+' new Saved Food'+(library.newSaved===1?'':'s'):'',library.existing?library.existing+' existing Saved Food'+(library.existing===1?'':'s'):'',library.oneOff?library.oneOff+' one-off entr'+(library.oneOff===1?'y':'ies'):'',library.nutritionDiff?library.nutritionDiff+' nutrition difference'+(library.nutritionDiff===1?'':'s'):''].filter(Boolean):[];
  const csvHead=!json?'<section class="import-human-summary"><p class="eyebrow">'+(plan.kind==='enrichment'?'READY TO CLARIFY':'READY TO IMPORT')+'</p><h3>'+esc(plan.display?.label||((plan.display?.count??plan.changeCount)+' items to import'))+'</h3>'+(libraryBits.length?'<p>'+esc(libraryBits.join(' · '))+'</p>':'')+'</section>':'';
  const jsonSummary=json?'<div class="import-summary import-summary-compact"><p class="eyebrow">JSON BACKUP</p><p>'+incomingCount+' incoming tracked records · '+plan.unchanged+' unchanged items omitted'+(plan.duplicates?' · '+plan.duplicates+' possible duplicates':'')+'</p><strong>This confirmation replaces all current data with the reviewed backup.</strong></div>':'';
  modal('Review import','<p class="import-filename">'+esc(plan.filename)+'</p><div class="import-scroll" tabindex="0" aria-label="Import changes">'+bankInfo+csvHead+saveAlert+errors+warnings+cleanStatus+jsonSummary+'<section class="import-changes">'+(json?'<div class="import-changes-head"><p class="eyebrow">CHANGES</p><h3>'+plan.changeCount+' proposed change'+(plan.changeCount===1?'':'s')+'</h3></div>':'')+changesBody+'</section></div><div class="import-footer"><p>'+(json?'Confirmation replaces the current data with this backup. Unchanged items are omitted from the preview.':'Review each proposed change. The existing notebook is not modified until you confirm.')+'</p><div class="form-actions">'+(plan.candidate?button(json?'Confirm replacement':plan.kind==='enrichment'?'Apply clarifications':'Confirm import','commit-import',json?'danger filled':'primary'):button('Choose another file',plan.kind==='bank'?'finance-bofa-import':plan.kind==='enrichment'?'finance-enrichment-paste':'choose-import','primary',plan.kind==='bank'||plan.kind==='enrichment'?'':'data-kind="'+plan.kind+'" data-source="'+esc(plan.source||'file')+'"'))+button('Cancel','close','outline')+'</div></div>');
  document.querySelector('.modal').classList.add('import-dialog');
}

async function commitImport(){
  const plan=pendingImport;if(!plan?.candidate||importSaving)return;
  if(plan.base!==JSON.stringify(data)){plan.errors.push('Current data changed. Cancel and preview this file again.');plan.candidate=null;showImportReview(plan);return;}
  const active=session,owner=account?.uid,candidate=structuredClone(plan.candidate),workspaceMode=Boolean(offlineWorkspace);
  if(plan.kind==='enrichment'&&plan.selectedIds){
   if(!plan.selectedIds.size)return alert('Select at least one change to apply.');
   const originals=new Map(data.transactions.map(tx=>[tx.id,tx]));
   candidate.transactions=candidate.transactions.map(tx=>plan.selectedIds.has(tx.id)?tx:structuredClone(originals.get(tx.id)||tx));
  }
  close(true);importSaving=true;cloudBusy=!workspaceMode&&Boolean(account);render();
  try{
    if(workspaceMode){
      data=candidate;storeOfflineWorkspace(data,true);cloudMessage='Offline JSON workspace · saved on this device';
    }else if(account)await active.save(candidate);else save(candidate);
    if(!workspaceMode&&(session!==active||account?.uid!==owner))return;
    data=candidate;if(!workspaceMode&&!account)deviceData=structuredClone(candidate);else if(!workspaceMode)cloudMessage='Saved to your account';
    importSaving=false;cloudBusy=false;render();
    alert(plan.kind==='json'?(workspaceMode?'Workspace JSON replaced.':'Backup restored.'):`${plan.display?.count??plan.changeCount} item${(plan.display?.count??plan.changeCount)===1?'':'s'} imported.`);
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
 if(demoMode)return;
  if(offlineWorkspace||!cloudApi?.health||!account||!session?.ready||cloudBusy||cloudPending||importSaving||document.querySelector('.modal'))return;
  if(!force&&(page==='settings'||document.activeElement?.matches('input,textarea,select')||Date.now()-healthCheckedAt<30000))return;
  const active=session;healthCheckedAt=Date.now();cloudBusy=true;
  try{
    const result=await cloudApi.health.pull(active.uid,active.revision);
    if(session!==active)return;
    healthState=result;
    if(result.data){
      active.revision=result.revision;
      if(cloudPending){
        // A log was recorded locally while iOS was resuming this Health pull.
        // Never replace that newer notebook with the Health response.
        cloudRecoveryConflict=cloudRecovery||readCloudRecovery(active.uid);
        cloudMessage='Device edits saved · review cloud changes before syncing';
      }else{data=result.data;cloudMessage='Saved to your account';}
    }
  }catch(error){if(session===active)healthState={...healthState,status:error.code==='permission-denied'?'Setup needs the updated Firebase rules. Existing tracking still works.':describeCloudError(error)};}
  finally{if(session===active){
    cloudBusy=false;
    if(!document.querySelector('.modal'))render();
    if(cloudPending&&!cloudRecoveryConflict&&session?.ready)void persist();
    else promptWeight();
  }}
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
document.addEventListener('input',event=>{
 if(event.target.matches?.('[name=buddySetup]')&&event.target.closest('#buddy-root')){
   buddyReadSetupDraft();saveCriticalLocalCopy();return;
 }
 if(event.target.matches?.('[name=buddyWeight],[name=buddyReps],[name=buddyNotes]')){
   if(event.target.closest('.routine-history-editor'))routineHistoryCaptureDraft();
   else{buddyReadEditor();buddyReadNotes();saveCriticalLocalCopy();}
 }
});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')captureCriticalLocalState();else{resumePendingCloudSave();void checkLatestRelease();void syncHealth();void refreshStorageProtection(false);}});
window.addEventListener('pageshow',()=>{resumePendingCloudSave();void checkLatestRelease();void syncHealth();void refreshStorageProtection(false);});
window.addEventListener('focus',()=>{resumePendingCloudSave();void checkLatestRelease();void syncHealth();});
void checkLatestRelease();
