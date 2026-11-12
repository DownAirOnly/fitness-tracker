import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {emptyData,normalizeData,encodeData} from '../data.js';
import {writeCloudConfirmed} from '../durability.js';

test('cached Home food opens immediately and saves only after account readiness',async()=>{
 const root=new URL('../',import.meta.url),temp=await mkdtemp(join(tmpdir(),'everyday-first-food-'));
 const dom=new JSDOM(await readFile(new URL('index.html',root),'utf8'),{url:'http://localhost/fitness-tracker/'});
 const prior=new Map();
 for(const key of ['window','document','navigator','localStorage','FormData','alert','confirm','requestAnimationFrame','fetch'])
  prior.set(key,Object.getOwnPropertyDescriptor(globalThis,key));
 try{
  for(const key of ['window','document','localStorage','navigator'])
   Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
  globalThis.FormData=dom.window.FormData;globalThis.alert=()=>{};globalThis.confirm=()=>true;
  globalThis.requestAnimationFrame=callback=>setTimeout(callback,0);
  globalThis.fetch=async()=>({ok:false});
  Object.defineProperty(dom.window.navigator,'storage',{configurable:true,value:{
   persisted:async()=>true,persist:async()=>true,estimate:async()=>({usage:1000,quota:1024*1024})
  }});
  const data=normalizeData(emptyData());
  data.foods.push({id:'cached-food-1',name:'Early breakfast',calories:230,protein:30,pinned:true,kind:'food',tags:[],lastUsed:'2026-11-12T10:00:00.000Z'});
  const cloudRecord={schemaVersion:1,revision:1,payload:JSON.stringify(encodeData(data))};
  dom.window.localStorage.setItem('everyday-last-account-v1','alice');
  writeCloudConfirmed('alice',1,data,dom.window.localStorage);
  const fixture=join(temp,'cloud.mjs');
  const fixtureSource=[
   "import {CloudSession,nextRecord} from '"+new URL('cloud-model.js',root)+"';",
   "export const state={records:new Map([['alice',"+JSON.stringify(cloudRecord)+"]]),releaseAuth:null,releaseLoad:null};",
   "const store={read:async uid=>{await new Promise(resolve=>{state.releaseLoad=resolve;});return state.records.get(uid)||null;},write:async(uid,revision,payload)=>{const next=nextRecord(state.records.get(uid)||null,revision,payload);state.records.set(uid,next);return next;}};",
   "export const cloudError=error=>error.message;",
   "export async function connectCloud(callback){await new Promise(resolve=>{state.releaseAuth=resolve;});await callback({uid:'alice',email:'alice@example.com'},new CloudSession('alice',store));return{signIn:async()=>{},signOut:async()=>{}};}"
  ].join('\n');
  await writeFile(fixture,fixtureSource);
  let source=await readFile(new URL('app.js',root),'utf8');
  source=source.replace(/(['"])\.\/(routine-import-ui|routine-import-model|exercise-import-meta|cooking-ui|cooking-model|food-portion-model|appearance-model|data|calendar-ui|muscle-map|muscle-load|buddy-set-model|finance-model|bank-import|import-model|classification-model|finance-insights-model|budget-model|budget-model|finance-overview-model|account-sections|demo-mode|cloud-model|durability|paycheck-model|bank-reconcile|account-monthly|weight-checkin-model)\.js\?v=\d+(?:\.\d+){0,2}\1/g,
   (_match,_quote,name)=>"'"+new URL(name+'.js',root)+"'");
  source=source.replace(/(['"])\.\/cloud\.js\?v=\d+(?:\.\d+){0,2}\1/g,"'"+pathToFileURL(fixture)+"'");
  assert.ok(!/from ['"]\.\/[^'"]+\?v=\d+(?:\.\d+){0,2}/.test(source));
  const appPath=join(temp,'app.mjs');await writeFile(appPath,source);
  await import(pathToFileURL(appPath).href);
  const tick=()=>new Promise(resolve=>setTimeout(resolve,35));
  const {state}=await import(pathToFileURL(fixture));
  assert.equal(document.querySelector('.home-settings')?.disabled,true,'settings remains gated during auth');
  const card=document.querySelector('.food-card [data-action="add-saved"][data-id="cached-food-1"]');
  assert.ok(card,'last confirmed account shows cached food before auth');
  card.click();await tick();
  const form=document.querySelector('form[data-form="food"]');
  assert.ok(form,'first tap opens Food Entry despite grayed-out Settings');
  assert.equal(form.elements.name.value,'Early breakfast');
  assert.equal(form.querySelector('[data-food-submit]').disabled,true,'save remains disabled until account confirmation');
  assert.equal(form.querySelector('[data-food-account-pending]').hidden,false);
  const before=JSON.parse(dom.window.localStorage.getItem('everyday-cloud-confirmed-v1:alice'));
  assert.equal(normalizeData(before.data).foodEntries.length,0);
  form.elements.name.value='Early breakfast adjusted';
  form.elements.quantity.value='0.5';
  form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick();
  assert.equal(JSON.parse(dom.window.localStorage.getItem('everyday-cloud-confirmed-v1:alice')).data.foodEntries.length,0);
  state.releaseAuth();await tick();await tick();
  assert.equal(document.querySelector('form[data-form="food"]'),form,'same-owner auth keeps Food Entry node');
  assert.equal(form.querySelector('[data-food-submit]').disabled,true,'waits for account load');
  state.releaseLoad();await tick();await tick();
  assert.equal(document.querySelector('form[data-form="food"]'),form,'cloud load preserves original dialog');
  assert.equal(form.elements.name.value,'Early breakfast adjusted');
  assert.equal(form.elements.quantity.value,'0.5');
  assert.equal(form.querySelector('[data-food-submit]').disabled,false,'save enabled in place');
  assert.equal(form.querySelector('[data-food-account-pending]').hidden,true);
  assert.equal(document.querySelector('.home-settings').disabled,false,'Settings enables without shell rebuild');
  form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick();await tick();
  const saved=JSON.parse(state.records.get('alice').payload);
  assert.equal(saved.foodEntries.length,1,'log only saved after identity and revision confirmation');
  assert.equal(saved.foodEntries[0].quantity,0.5);
 }finally{
  dom.window.close();await rm(temp,{force:true,recursive:true});
  for(const [key,description] of prior){
   if(description)Object.defineProperty(globalThis,key,description);else delete globalThis[key];
  }
 }
});
