import {JSDOM} from 'jsdom';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=new URL('../',import.meta.url),temp=await mkdtemp(join(tmpdir(),'everyday-ui-'));
const dom=new JSDOM(await readFile(new URL('index.html',root),'utf8'),{url:'http://localhost/fitness-tracker/'});
const initialHome=['.home-actions','.today-card','.weight-strip'].map(selector=>{
 const element=dom.window.document.querySelector(selector);assert.ok(element,'present before JavaScript: '+selector);return element.outerHTML;
});
assert.ok(dom.window.document.querySelector('.home-actions button').disabled);
assert.ok(!dom.window.document.body.textContent.includes('Goals are guides, not grades'));
for(const key of ['window','document','localStorage','navigator'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
globalThis.alert=()=>{};globalThis.confirm=()=>true;
const fixture=join(temp,'cloud.mjs');
await writeFile(fixture,`
 import {CloudSession,nextRecord} from '${new URL('cloud-model.js',root)}';
 export const state={user:'alice',records:new Map(),fail:false,callback:null};
 const store={read:async uid=>state.records.get(uid)||null,write:async(uid,revision,payload)=>{if(state.fail)throw Error('offline');const next=nextRecord(state.records.get(uid)||null,revision,payload);state.records.set(uid,next);return next;}};
 export const cloudError=e=>e.message;
 export async function connectCloud(callback){state.callback=callback;await new Promise(resolve=>{state.releaseAuth=resolve;});await callback(null,null);return {signIn:async()=>callback({uid:state.user,email:state.user+'@example.com'},new CloudSession(state.user,store)),signOut:async()=>callback(null,null)};}
`);
let source=await readFile(new URL('app.js',root),'utf8');
for(const name of ['data.js','cloud-model.js'])source=source.replaceAll(`'./${name}?v=10'`,`'${new URL(name,root)}'`);
source=source.replace("'./cloud.js?v=10'",`'${pathToFileURL(fixture)}'`);
await writeFile(join(temp,'app.mjs'),source);
const tick=()=>new Promise(r=>setTimeout(r,20));
const click=async action=>{const el=document.querySelector(`[data-action="${action}"]`);assert.ok(el,action);el.click();await tick();};
const submit=async(kind,values)=>{const form=document.querySelector(`[data-form="${kind}"]`);for(const [name,value]of Object.entries(values))form.elements.namedItem(name).value=value;form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick();};
// Node's FormData doesn't consume HTML forms; use the DOM's implementation.
globalThis.FormData=dom.window.FormData;
try{
 await import(pathToFileURL(join(temp,'app.mjs')));await tick();await tick();
 const {state}=await import(pathToFileURL(fixture));
 assert.ok(document.querySelector('.home-actions'),'Home cards exist before auth finishes');
 assert.equal(document.querySelector('main').getAttribute('aria-busy'),'true');
 for(const [i,selector] of ['.home-actions','.today-card','.weight-strip'].entries())assert.equal(document.querySelector(selector).outerHTML,initialHome[i],'initial HTML matches pending layout');
 assert.equal(document.querySelector('.metric-row b').textContent,'—');
 assert.ok(document.querySelector('.home-actions button').disabled);
 assert.ok(!document.querySelector('main').textContent.includes('Connecting'));
 state.releaseAuth();await tick();await tick();
 assert.equal(document.querySelector('main').getAttribute('aria-busy'),'false');
 assert.ok(document.querySelector('main').firstElementChild.classList.contains('home-actions'));
 assert.ok(document.querySelector('main').nextElementSibling.classList.contains('account-banner'));
 await click('food');assert.ok(document.querySelector('.tracking-date input'));await click('new-food');
 assert.equal(document.activeElement.getAttribute('role'),'dialog','opening forms must not autofocus an input');await submit('food',{name:'Device meal',calories:'250',protein:'20'});
 assert.equal(JSON.parse(localStorage.getItem('everyday-fitness-v1')).foodEntries.length,1);
 await click('sign-in');await click('food');
 assert.ok(!document.querySelector('main').textContent.includes('Device meal'),'no automatic migration');
 await click('settings');await click('migrate-device');
 assert.equal(JSON.parse(state.records.get('alice').payload).foodEntries.length,1);
 await click('sign-out');state.user='bob';await click('sign-in');await click('food');
 assert.ok(!document.querySelector('main').textContent.includes('Device meal'),'account separation');
 state.fail=true;await click('new-food');await submit('food',{name:'Cloud meal',calories:'100',protein:'8'});
 assert.ok(document.querySelector('.save-warning'),'unsaved error is visible');assert.equal(state.records.has('bob'),false);
 state.fail=false;await click('cloud-retry');assert.equal(JSON.parse(state.records.get('bob').payload).foodEntries[0].name,'Cloud meal');
 assert.equal(JSON.parse(localStorage.getItem('everyday-fitness-v1')).foodEntries[0].name,'Device meal','cloud record never replaces local data');
 await click('gym');assert.ok(document.querySelector('.tracking-date input'));
 const dateInput=document.querySelector('.tracking-date input');dateInput.value='2026-09-20';dateInput.dispatchEvent(new dom.window.Event('change',{bubbles:true}));await tick();
 await click('custom-lift');await submit('lift',{exercise:'Test press',weight:'40',reps:'8',difficulty:'7'});
 assert.equal(JSON.parse(state.records.get('bob').payload).lifts[0].date,'2026-09-20');
 await click('home');await click('weight');await submit('weight',{value:'180',date:'2026-09-20'});
 await click('progress');assert.ok(document.querySelector('main').textContent.includes('180'));
 await click('settings');
 let exported;const originalCreate=URL.createObjectURL;URL.createObjectURL=blob=>{exported=blob;return 'blob:test';};
 dom.window.HTMLAnchorElement.prototype.click=function(){};
 await click('export');const backup=JSON.parse(await exported.text());URL.createObjectURL=originalCreate;
 assert.equal(backup.lifts.length,1);assert.equal(backup.weights.length,1);
 await click('import-csv');let form=document.querySelector('[data-form="import"]');
 Object.defineProperty(form.querySelector('[name="file"]'),'files',{value:[{size:100,text:async()=> 'date,name,calories,protein,quantity\n2026-09-19,CSV meal,300,25,1'}]});
 form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick();await click('commit-import');
 assert.equal(JSON.parse(state.records.get('bob').payload).foodEntries.length,2);
 await click('restore');form=document.querySelector('[data-form="import"]');
 Object.defineProperty(form.querySelector('[name="file"]'),'files',{value:[{size:100,text:async()=>JSON.stringify(backup)}]});
 form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick();await click('commit-import');
 assert.deepEqual(JSON.parse(state.records.get('bob').payload),backup,'JSON restore preserves the exported snapshot');
 // Pass 2: selected-day preview and full log share the same entries/totals.
 await click('food');
 const setDate=async value=>{const field=document.querySelector('.tracking-date input');field.value=value;field.dispatchEvent(new dom.window.Event('change',{bubbles:true}));await tick();};
 await setDate('2025-01-02');
 assert.ok(document.querySelector('.food-preview-empty'));
 assert.ok(document.querySelector('.food-day').nextElementSibling.textContent.includes('Saved foods'));
 await click('food-log');assert.equal(document.querySelectorAll('.full-food-log .list-row').length,0);await click('close');
 for(let i=1;i<=5;i++){
  await click('new-food');await submit('food',{name:'History food '+i,calories:'100',protein:'10',quantity:'2'});
  assert.equal(document.querySelectorAll('.food-preview-row').length,Math.min(i,3));
  assert.equal(document.querySelector('.food-total-number strong').textContent,String(i*200));
 }
 assert.deepEqual([...document.querySelectorAll('.food-preview-row strong')].map(e=>e.textContent),['History food 5','History food 4','History food 3']);
 await click('food-log');assert.equal(document.querySelectorAll('.full-food-log .list-row').length,5);
 assert.ok(document.querySelector('.modal').textContent.includes('2025-01-02'));
 await click('edit-entry');await submit('food',{name:'Edited historical food',calories:'150',protein:'15',quantity:'2'});
 assert.equal(document.querySelector('.food-total-number strong').textContent,'1100');
 await click('food-log');await click('edit-entry');await click('delete-entry');
 assert.equal(document.querySelector('.food-total-number strong').textContent,'800');
 assert.equal(document.querySelectorAll('.food-preview-row').length,3);
 await click('add-saved');
 let current=JSON.parse(state.records.get('bob').payload);assert.equal(current.foodEntries.at(-1).date,'2025-01-02');
 await click('today');assert.ok(document.querySelector('.food-main span').textContent.includes('Add to today'));
 assert.ok(!document.querySelector('.food-preview').textContent.includes('History food'));
 await click('add-saved');current=JSON.parse(state.records.get('bob').payload);
 assert.equal(current.foodEntries.at(-1).date,document.querySelector('.tracking-date input').value);
 // Pass 3: nested Food dismissal returns exactly one level.
 await click('food-log');await click('edit-entry');
 document.querySelector('.modal .close-btn').click();await tick();
 assert.ok(document.querySelector('.full-food-log'));
 await click('edit-entry');
 document.querySelector('.modal').dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await tick();
 assert.ok(document.querySelector('.full-food-log'));
 await click('new-food');await click('close');assert.ok(document.querySelector('.full-food-log'));
 await click('close');assert.ok(!document.querySelector('.modal'));
 await click('new-food');await click('close');assert.ok(!document.querySelector('.modal'),'direct add dismisses to Food');
 // Settings are persisted separately and never modify historical records.
 await click('home');await click('weight');await submit('weight',{value:'178',date:'2026-09-21'});
 await click('settings');
 const recordsBefore=JSON.parse(state.records.get('bob').payload);
 for(const day of [0,1,2,3,4,5,6]){
  await submit('week-settings',{weekStart:String(day)});
  const saved=JSON.parse(state.records.get('bob').payload);
  assert.equal(saved.settings.weekStart,day);
  for(const key of ['weights','lifts','foods','foodEntries'])assert.deepEqual(saved[key],recordsBefore[key]);
  await click('progress');
  const {weeklyWeights,startOfWeek,localDate}=await import(new URL('data.js',root));
  assert.deepEqual([...document.querySelectorAll('[data-week]')].map(e=>e.dataset.week),weeklyWeights(saved.weights,68,'lb',day).map(w=>w.week));
  const expectedCurrent=startOfWeek(localDate(),day);
  for(const row of document.querySelectorAll('[data-week]'))assert.equal(row.textContent.includes('Current week'),row.dataset.week===expectedCurrent);
  await click('settings');
 }
 await submit('settings',{calories:'1600',protein:'130',heightInches:'68',unit:'lb'});
 assert.equal(JSON.parse(state.records.get('bob').payload).settings.weekStart,6,'saving goals preserves week preference');
 await click('sign-out');await click('sign-in');await click('settings');
 assert.equal(document.querySelector('[name="weekStart"]').value,'6','preference survives cloud reload');
 console.log('UI smoke passed: Food empty/1–3/many entries, full log, historic add/edit/delete, today action; home hierarchy, dialog focus, dates, food, lifting, progress, CSV/JSON import/export, account transitions, migration and save recovery.');
}finally{dom.window.close();await rm(temp,{recursive:true,force:true});}
