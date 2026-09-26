import {JSDOM} from 'jsdom';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=new URL('../',import.meta.url),temp=await mkdtemp(join(tmpdir(),'everyday-ui-'));
const dom=new JSDOM('<div id="app"></div>',{url:'http://localhost/fitness-tracker/'});
for(const key of ['window','document','localStorage','navigator'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
globalThis.alert=()=>{};globalThis.confirm=()=>true;
const fixture=join(temp,'cloud.mjs');
await writeFile(fixture,`
 import {CloudSession,nextRecord} from '${new URL('cloud-model.js',root)}';
 export const state={user:'alice',records:new Map(),fail:false,callback:null};
 const store={read:async uid=>state.records.get(uid)||null,write:async(uid,revision,payload)=>{if(state.fail)throw Error('offline');const next=nextRecord(state.records.get(uid)||null,revision,payload);state.records.set(uid,next);return next;}};
 export const cloudError=e=>e.message;
 export async function connectCloud(callback){state.callback=callback;await callback(null,null);return {signIn:async()=>callback({uid:state.user,email:state.user+'@example.com'},new CloudSession(state.user,store)),signOut:async()=>callback(null,null)};}
`);
let source=await readFile(new URL('app.js',root),'utf8');
for(const name of ['data.js','cloud-model.js'])source=source.replaceAll(`'./${name}'`,`'${new URL(name,root)}'`);
source=source.replace("'./cloud.js'",`'${pathToFileURL(fixture)}'`);
await writeFile(join(temp,'app.mjs'),source);
const tick=()=>new Promise(r=>setTimeout(r,20));
const click=async action=>{const el=document.querySelector(`[data-action="${action}"]`);assert.ok(el,action);el.click();await tick();};
const submit=async(kind,values)=>{const form=document.querySelector(`[data-form="${kind}"]`);for(const [name,value]of Object.entries(values))form.elements.namedItem(name).value=value;form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick();};
// Node's FormData doesn't consume HTML forms; use the DOM's implementation.
globalThis.FormData=dom.window.FormData;
try{
 await import(pathToFileURL(join(temp,'app.mjs')));await tick();await tick();
 await click('food');await click('new-food');await submit('food',{name:'Device meal',calories:'250',protein:'20'});
 assert.equal(JSON.parse(localStorage.getItem('everyday-fitness-v1')).foodEntries.length,1);
 const {state}=await import(pathToFileURL(fixture));await click('sign-in');await click('food');
 assert.ok(!document.querySelector('main').textContent.includes('Device meal'),'no automatic migration');
 await click('settings');await click('migrate-device');
 assert.equal(JSON.parse(state.records.get('alice').payload).foodEntries.length,1);
 await click('sign-out');state.user='bob';await click('sign-in');await click('food');
 assert.ok(!document.querySelector('main').textContent.includes('Device meal'),'account separation');
 state.fail=true;await click('new-food');await submit('food',{name:'Cloud meal',calories:'100',protein:'8'});
 assert.ok(document.querySelector('.save-warning'),'unsaved error is visible');assert.equal(state.records.has('bob'),false);
 state.fail=false;await click('cloud-retry');assert.equal(JSON.parse(state.records.get('bob').payload).foodEntries[0].name,'Cloud meal');
 assert.equal(JSON.parse(localStorage.getItem('everyday-fitness-v1')).foodEntries[0].name,'Device meal','cloud record never replaces local data');
 console.log('UI smoke passed: device logging, Google account transitions, migration, private views, save failure and retry.');
}finally{dom.window.close();await rm(temp,{recursive:true,force:true});}
