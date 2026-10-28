import {JSDOM} from 'jsdom';
import {normalizeData,localDate as todayCalendarDate} from '../data.js';
import {financeEnrichmentCSV} from '../bank-import.js';
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
let storagePersisted=false,persistRequests=0;
Object.defineProperty(dom.window.navigator,'storage',{configurable:true,value:{persisted:async()=>storagePersisted,persist:async()=>{persistRequests++;storagePersisted=true;return true;},estimate:async()=>({usage:4096,quota:1024*1024})}});
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
// Load the current production modules into the temporary test app.
// Use a version-agnostic resolver so smoke tests follow future asset revisions.
source=source.replace(/(['"])\.\/(data|muscle-map|buddy-set-model|finance-model|bank-import|import-model|demo-mode|cloud-model|durability)\.js\?v=\d+\1/g,
 (_match,_quote,name)=>"'"+new URL(name+'.js',root)+"'");
source=source.replace(/(['"])\.\/cloud\.js\?v=\d+\1/g,"'"+pathToFileURL(fixture)+"'");
assert.ok(!/from ['"]\.\/[^'"]+\?v=\d+/.test(source),'all static app imports resolved');
await writeFile(join(temp,'app.mjs'),source);
const tick=()=>new Promise(r=>setTimeout(r,20));
const click=async action=>{const el=document.querySelector(`[data-action="${action}"]`);assert.ok(el,action);el.click();await tick();};
const submit=async(kind,values)=>{const form=document.querySelector(`[data-form="${kind}"]`);for(const [name,value]of Object.entries(values))form.elements.namedItem(name).value=value;form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick();};
// Node's FormData doesn't consume HTML forms; use the DOM's implementation.
globalThis.FormData=dom.window.FormData;
try{
 await import(pathToFileURL(join(temp,'app.mjs')).href+'?v=67');await tick();await tick();
 assert.equal(persistRequests,1,'startup requests persistent origin storage once');
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

  // v81 navigation regression: five bottom tabs and a header Settings gear.
  const tabs=[...document.querySelectorAll('nav.nav [data-action]')].map(el=>el.dataset.action);
  assert.deepEqual(tabs,['home','food','gym','progress','finances'],'Finances replaces More');
  assert.equal(document.querySelectorAll('nav.nav [data-action="settings"]').length,0,'no Settings bottom tab');
  assert.ok(document.querySelector('header.top .home-settings[data-action="settings"]'),'accessible Settings gear');
  await click('finances');
  assert.ok(document.querySelector('.finances-page-head'),'Finances route works');
  assert.ok(document.querySelector('form[data-form="finance"]'),'Finances quick transaction form is ready');
  assert.equal(document.querySelector('nav.nav [data-action="finances"]').getAttribute('aria-current'),'page','Finances selected');
  await click('settings');
  assert.ok(document.querySelector('.settings-page-head'),'Settings gear works from Finances');
  assert.equal(document.querySelector('header.top .home-settings').getAttribute('aria-current'),'page','Settings gear active');
  await click('home');
  assert.ok(document.querySelector('.home-actions'),'Home navigation still works');

  // v83: Quick Log uses exact cents; calendar date changes cannot navigate to Food.
  await click('finances');
  assert.ok(document.querySelector('[data-action="finance-paste-csv"]'),'prepared CSV entry point exists');
  const financeForm=document.querySelector('form[data-form="finance"]');
  assert.ok(financeForm.querySelector('[name="amount"]'));
  financeForm.elements.date.value='2026-10-26';
  financeForm.elements.date.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
  await tick();
  assert.ok(document.querySelector('.finances-page-head'),'changing finance date must not navigate away');
  await submit('finance',{amount:'7.19',description:'Wawa water',date:'2026-10-26',category:'Household Supplies',merchant:'Wawa'});
  let financial=normalizeData(JSON.parse(localStorage.getItem('everyday-fitness-v1'))).transactions;
  assert.equal(financial.length,1);
  assert.equal(financial[0].amountCents,719);
  assert.equal(financial[0].kind,'expense');
  assert.equal(financial[0].date,'2026-10-26');
  assert.equal(financial[0].merchant,'Wawa');
  assert.ok(document.querySelector('.finance-row'),'saved transaction appears immediately');
  await click('finance-edit');
  assert.ok(document.querySelector('form[data-form="finance-edit"]'));
  await submit('finance-edit',{amount:'8.25',description:'Corrected Wawa water',category:'Household Supplies'});
  financial=normalizeData(JSON.parse(localStorage.getItem('everyday-fitness-v1'))).transactions;
  assert.equal(financial.length,1,'editing does not create a duplicate');
  assert.equal(financial[0].amountCents,825);
  assert.equal(financial[0].description,'Corrected Wawa water');
  await click('finance-edit');await click('finance-delete');
  financial=normalizeData(JSON.parse(localStorage.getItem('everyday-fitness-v1'))).transactions;
  assert.equal(financial.length,0,'confirmed deletion removes the transaction');

  await click('finance-csv-example');
  assert.ok(document.querySelector('.finance-sample').value.includes('recordType,date,time,kind,amount'));
  await click('finance-paste-csv');
  assert.ok(document.querySelector('form[data-form="import"]'),'prepared CSV uses the reviewed import form');
  const transactionCsv=[
   'recordType,date,kind,amount,description,category,merchant',
   'transaction,2026-10-26,expense,7.19,Water cases,Household Supplies,Wawa',
   'transaction,2026-10-26,income,100.00,Reimbursement,Income,'
  ].join('\n');
  await submit('import',{text:transactionCsv});
  assert.ok(document.querySelector('.import-dialog'),'batch has a review before save');
  assert.ok(document.querySelector('.import-group-transactions'),'financial transaction changes are visible');
  assert.equal(normalizeData(JSON.parse(localStorage.getItem('everyday-fitness-v1'))).transactions.length,0,'CSV preview is nondestructive');
  await click('commit-import');
  financial=normalizeData(JSON.parse(localStorage.getItem('everyday-fitness-v1'))).transactions;
  assert.equal(financial.length,2,'confirmed CSV imports two transactions atomically');
  await click('finance-paste-csv');await submit('import',{text:transactionCsv});
  assert.ok(document.querySelector('.import-dialog').textContent.includes('No data changes detected'),'reimport warns of no new entries');
  await click('close');
  assert.equal(normalizeData(JSON.parse(localStorage.getItem('everyday-fitness-v1'))).transactions.length,2,'repeat import cannot duplicate purchases');
  await click('finance-edit');await click('finance-delete');
  await click('finance-edit');await click('finance-delete');
  assert.equal(normalizeData(JSON.parse(localStorage.getItem('everyday-fitness-v1'))).transactions.length,0);

  // v84: direct BofA statement plus human-friendly descriptions and ID-anchored corrections.
  await click('finance-bofa-import');
  const bankForm=document.querySelector('form[data-form="finance-bank-import"]');
  assert.ok(bankForm);
  bankForm.elements.accountLabel.value='BofA Checking';
  assert.equal(bankForm.elements.statementLabel.value,'','statement label begins empty and is inferred from file');
  const bankCsv=[
   'Description,,Summary Amt.',
   'Beginning balance as of 10/01/2026,,500.00',
   'Total credits,,100.00',
   '',
   'Date,Description,Amount,Running Bal.',
   '10/23/2026,Beginning balance as of 10/23/2026,,500.00',
   '10/24/2026,365 MARKET 10994,-8.55,491.45',
   '10/25/2026,WAWA STORE 44,-7.19,484.26'
  ].join('\n');
  const firstBankFile=bankForm.querySelector('[name="file"]');
  Object.defineProperty(firstBankFile,'files',{
   value:[{name:'bofa-october.csv',size:bankCsv.length,text:async()=>bankCsv}]
  });
  firstBankFile.dispatchEvent(new dom.window.Event('change',{bubbles:true}));await tick();
  assert.equal(bankForm.elements.statementLabel.value,'Oct 1–25, 2026','CSV selection automatically labels the statement');
  assert.ok(bankForm.querySelector('[data-bank-label-status]').textContent.includes('Suggested from'),'inferred label explained in UI');
  bankForm.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick();
  assert.ok(document.querySelector('.finance-bank-review'),'Bank import opens reviewed preview');
  assert.equal(document.querySelectorAll('.import-group-transactions .import-record').length,2);
  assert.ok(document.querySelector('.import-group-transactions').textContent.includes('365 MARKET 10994'));
  assert.equal(normalizeData(JSON.parse(localStorage.getItem('everyday-fitness-v1'))).transactions.length,0,'preview cannot save bank entries');
  await click('commit-import');
  let ledger=normalizeData(JSON.parse(localStorage.getItem('everyday-fitness-v1'))).transactions;
  assert.equal(ledger.length,2);
  assert.ok(ledger.every(tx=>tx.accountLabel==='BofA Checking'&&tx.statementLabel==='Oct 1–25, 2026'));
  assert.ok(!document.querySelector('.finance-raw-description'),'do not duplicate an unchanged bank description beneath the identical personal title');
  assert.ok(document.querySelector('.finance-row-date'),'posted date appears above the transaction title');
  assert.ok(!document.querySelector('.finance-recent-list').textContent.includes('BofA Checking'),'account label omitted from compact history rows');
  assert.ok(!document.querySelector('.finance-recent-list').textContent.includes('Oct 1–25, 2026'),'statement range omitted from compact history rows');
  assert.ok(!document.querySelector('.finance-recent-list').textContent.includes('Uncategorized'),'empty classifications omitted from history');
  // v90: full finance history uses all saved records without changing the ledger.
  await click('finance-history-open');
  assert.ok(document.querySelector('.finance-history'),'transaction-history page opens');
  assert.equal(document.querySelectorAll('.finance-history-list .finance-row').length,2);
  assert.equal(document.querySelector('[data-finance-history-summary]').textContent,'2 of 2 transactions');
  assert.equal(document.querySelector('nav.nav [data-action="finances"]').getAttribute('aria-current'),'page','Finance nav remains selected in its subview');
  const historySearch=document.querySelector('[data-finance-history-search]');
  historySearch.value='365 MARKET';historySearch.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
  await tick();assert.equal(document.querySelectorAll('.finance-history-list .finance-row').length,1,'search includes original bank description');
  assert.equal(document.querySelector('[data-finance-history-summary]').textContent,'1 of 2 transactions');
  historySearch.value='';historySearch.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
  const historyType=document.querySelector('[data-finance-history-filter="kind"]');
  historyType.value='income';historyType.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
  assert.equal(document.querySelectorAll('.finance-history-list .finance-row').length,0,'type filter excludes other kinds');
  assert.ok(document.querySelector('.finance-history-list .empty'));
  historyType.value='all';historyType.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
  const historyMonth=document.querySelector('[data-finance-history-filter="month"]');
  assert.ok([...historyMonth.options].some(option=>option.value==='2026-10'),'saved transaction month appears in filter');
  historyMonth.value='2026-10';historyMonth.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
  assert.equal(document.querySelectorAll('.finance-history-list .finance-row').length,2,'month filter keeps matching records');
  historyMonth.value='all';historyMonth.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
  const historyCategory=document.querySelector('[data-finance-history-filter="category"]');
  historyCategory.value='Uncategorized';historyCategory.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
  assert.equal(document.querySelectorAll('.finance-history-list .finance-row').length,2,'uncategorized filter works without displaying the label in rows');
  historyCategory.value='all';historyCategory.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
  const historySort=document.querySelector('[data-finance-history-filter="sort"]');
  historySort.value='oldest';historySort.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
  assert.ok(document.querySelector('.finance-history-list .finance-row .finance-row-date').textContent.includes('Oct 24'),'sort oldest first');
  assert.equal(normalizeData(JSON.parse(localStorage.getItem('everyday-fitness-v1'))).transactions.length,2,'history filtering never mutates the ledger');
  await click('finance-history-back');assert.ok(document.querySelector('.finances-page-head'),'back restores finance overview');
  // v91: review access and filters never mutate the ledger.
  assert.ok(document.querySelector('[data-action="finance-review-open"]'),'review button appears for unclassified records');
  await click('finance-review-open');
  assert.equal(document.querySelector('[data-finance-history-filter="review"]').value,'needs-review');
  assert.equal(document.querySelectorAll('.finance-history-list .finance-row').length,2);
  assert.ok(document.querySelector('.finance-review-flag').textContent.includes('Category needed'));
  const reviewFilter=document.querySelector('[data-finance-history-filter="review"]');
  reviewFilter.value='transfer-check';reviewFilter.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
  assert.equal(document.querySelectorAll('.finance-history-list .finance-row').length,0,'no transfer hint for ordinary purchases');
  reviewFilter.value='uncategorized';reviewFilter.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
  assert.equal(document.querySelectorAll('.finance-history-list .finance-row').length,2);
  assert.equal(normalizeData(JSON.parse(localStorage.getItem('everyday-fitness-v1'))).transactions.length,2,'review queue is read-only');
  await click('finance-history-back');

  const sourceTx=ledger.find(tx=>tx.bankDescription==='365 MARKET 10994');
  assert.ok(sourceTx);
  const marketRow=[...document.querySelectorAll('.finance-row')].find(row=>row.textContent.includes('365 MARKET 10994'));
  assert.ok(marketRow,'365 Market row is available to edit');
  marketRow.querySelector('[data-action="finance-edit"]').click();await tick();
  const editBank=document.querySelector('form[data-form="finance-edit"]');
  assert.ok(editBank.querySelector('.finance-bank-facts'),'bank values appear read-only');
  assert.equal(editBank.querySelector('[name="date"]').type,'hidden');
  assert.equal(editBank.querySelector('[name="amount"]').type,'hidden');
  assert.equal(editBank.querySelector('[name="kind"]').tagName,'SELECT','classification remains editable');
  await submit('finance-edit',{
   description:'Energy drink and protein snack',kind:'transfer',category:'Convenience Food',subcategory:'Work snacks',
   purchaseDate:'2026-10-23',time:'15:20',itemization:'Monster 3.00; protein chips 5.55'
  });
  ledger=normalizeData(JSON.parse(localStorage.getItem('everyday-fitness-v1'))).transactions;
  const personal=ledger.find(tx=>tx.id===sourceTx.id);
  assert.equal(personal.description,'Energy drink and protein snack');
  assert.equal(personal.bankDescription,'365 MARKET 10994');
  assert.equal(personal.kind,'transfer','classification can change without altering bank debit');
  assert.equal(personal.bankDirection,'debit','original bank sign survives classification change');
  assert.equal(personal.amountCents,855);
  assert.equal(personal.date,'2026-10-24');
  assert.equal(personal.category,'Convenience Food');
  assert.equal(personal.itemization,'Monster 3.00; protein chips 5.55');
  const personalizedRow=[...document.querySelectorAll('.finance-row')].find(row=>row.textContent.includes('Energy drink and protein snack'));
  assert.ok(personalizedRow.querySelector('.finance-raw-description'),'original bank name remains when personal name differs');
  assert.ok(personalizedRow.querySelector('.finance-row-details').textContent.includes('365 MARKET 10994 · Convenience Food / Work snacks'));
  assert.ok(personalizedRow.querySelector('.finance-row-date').textContent.includes('Oct 24, 2026'));
  assert.ok(!personalizedRow.textContent.includes('Bank:'),'no verbose Bank prefix');

  // Resubmitting the statement under a different batch name must not undo edits.
  await click('finance-bofa-import');
  const againBank=document.querySelector('form[data-form="finance-bank-import"]');
  againBank.elements.accountLabel.value='BofA Checking';
  againBank.elements.statementLabel.value='Overlapping October export';
  const secondBankFile=againBank.querySelector('[name="file"]');
  Object.defineProperty(secondBankFile,'files',{
   value:[{name:'bofa-second.csv',size:bankCsv.length,text:async()=>bankCsv}]
  });
  secondBankFile.dispatchEvent(new dom.window.Event('change',{bubbles:true}));await tick();
  assert.equal(againBank.elements.statementLabel.value,'Overlapping October export','manual batch label is never overwritten by inference');
  againBank.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick();
  assert.ok(document.querySelector('.import-dialog').textContent.includes('No data changes detected'));
  await click('close');
  assert.equal(normalizeData(JSON.parse(localStorage.getItem('everyday-fitness-v1'))).transactions.find(tx=>tx.id===sourceTx.id).description,'Energy drink and protein snack');
  // Submit still infers the batch label if a picker does not emit change before submit.
  await click('finance-bofa-import');
  const fallbackBank=document.querySelector('form[data-form="finance-bank-import"]');
  fallbackBank.elements.accountLabel.value='BofA Checking';
  assert.equal(fallbackBank.elements.statementLabel.value,'');
  Object.defineProperty(fallbackBank.querySelector('[name="file"]'),'files',{
   value:[{name:'bofa-third.csv',size:bankCsv.length,text:async()=>bankCsv}]
  });
  fallbackBank.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick();
  assert.ok(document.querySelector('.import-dialog').textContent.includes('No data changes detected'),'blank batch label falls back to inferred range during submit');
  await click('close');


  assert.ok(document.querySelector('[data-action="finance-export-enrichment"]'),'export for ChatGPT available');
  await click('finance-enrichment-paste');
  assert.ok(document.querySelector('form[data-form="import"]'),'CSV enrichment form exists');
  const toClarify=normalizeData(JSON.parse(localStorage.getItem('everyday-fitness-v1'))).transactions;
  const clarification=financeEnrichmentCSV(toClarify).replace('Energy drink and protein snack','Monster and snack bundle');
  await submit('import',{text:clarification});
  assert.ok(document.querySelector('.import-dialog'),'clarification import is reviewed');
  assert.equal(document.querySelectorAll('#import-transactions > .import-record').length,1,'one transaction receives an update; the nested previous-record preview is not an additional change');
  assert.ok(document.querySelector('.import-group-transactions').textContent.includes('Bank:'));
  await click('commit-import');
  ledger=normalizeData(JSON.parse(localStorage.getItem('everyday-fitness-v1'))).transactions;
  assert.equal(ledger.find(tx=>tx.id===sourceTx.id).description,'Monster and snack bundle');
  assert.equal(ledger.find(tx=>tx.id===sourceTx.id).bankDescription,'365 MARKET 10994');
  assert.equal(ledger.length,2,'enrichment updates existing IDs rather than creating duplicates');
  await click('finance-edit');await click('finance-delete');
  await click('finance-edit');await click('finance-delete');
  assert.equal(normalizeData(JSON.parse(localStorage.getItem('everyday-fitness-v1'))).transactions.length,0);
  await click('home');


 // v63: anonymous demo cannot replace normal device data and can be reset on demand.
 const deviceBeforeDemo=localStorage.getItem('everyday-fitness-v1');
 assert.ok(document.querySelector('[data-action="demo-start"]'),'demo entry point for signed-out visitors');
 await click('demo-start');
 assert.ok(document.querySelector('.demo-banner'),'demo mode is visibly identified');
 let sample=JSON.parse(localStorage.getItem('everyday-demo-workspace-v1'));
 assert.ok(sample.active&&sample.data.foodEntries.length>100&&sample.data.workoutHistory.length>=10);
 // v92: a live Buddy session must prefer current completed sets over prior-workout set 2.
 await click('gym');await click('buddy-launch');await click('buddy-start');await click('buddy-bike-done');
 await click('buddy-choose');
 const firstSet=document.querySelector('[name=buddyWeight]');
 assert.ok(firstSet,'first Buddy set is editable');
 // v93: the normal set view is fitted; constrained viewports switch to an explicit safe fallback.
 const buddyView=document.querySelector('#buddy-root .buddy-exercise-view');
 assert.ok(buddyView,'the ordinary set uses the compact exercise view');
 Object.defineProperty(buddyView,'scrollHeight',{configurable:true,value:900});
 Object.defineProperty(buddyView,'clientHeight',{configurable:true,value:700});
 window.dispatchEvent(new dom.window.Event('resize'));
 assert.ok(buddyView.classList.contains('buddy-needs-scroll'),'short viewport enables scrolling rather than clipping controls');
 Object.defineProperty(buddyView,'clientHeight',{configurable:true,value:1000});
 window.dispatchEvent(new dom.window.Event('resize'));
 assert.ok(!buddyView.classList.contains('buddy-needs-scroll'),'roomy viewport remains non-scrolling');
 if(document.querySelector('[data-action="buddy-toggle-history"]')){
  await click('buddy-toggle-history');
  assert.equal(document.querySelector('.buddy-last-toggle').getAttribute('aria-expanded'),'true');
  assert.ok(document.querySelector('.buddy-compact-history'),'previous workouts remain available as a history dropdown');
  await click('buddy-toggle-history');
  assert.equal(document.querySelector('.buddy-last-toggle').getAttribute('aria-expanded'),'false');
 }

 firstSet.value='110';
 document.querySelector('[name=buddyReps]').value='9';
 await click('buddy-a');
 assert.ok(document.querySelector('[data-action=buddy-undo]').textContent.includes('Undo start set 1'));
 await click('buddy-a');
 assert.ok(document.querySelector('[data-action=buddy-undo]').textContent.includes('Undo finish set 1'));
 assert.ok(!document.querySelector('[data-action=buddy-undo]').textContent.includes('Undo start set'));
 document.querySelector('[name=buddyWeight]').value='120';
 await click('buddy-review-next');
 assert.ok(document.querySelector('.buddy-running-values').textContent.includes('120'),'set 2 inherits edited set 1 from this workout');
 assert.ok(document.querySelector('[data-action=buddy-undo]').textContent.includes('Undo start next set'));
 await click('buddy-undo');
 assert.equal(document.querySelector('[name=buddyWeight]').value,'120','undo start next set restores the edited first set');
 await click('buddy-exit');

 assert.equal(localStorage.getItem('everyday-fitness-v1'),deviceBeforeDemo,'demo never writes normal device records');
 await click('settings');await click('demo-reset');
 sample=JSON.parse(localStorage.getItem('everyday-demo-workspace-v1'));
 assert.equal(sample.data.foodEntries.length,158,'reset restores the exact fixture');
 await click('demo-exit');
 assert.equal(localStorage.getItem('everyday-demo-workspace-v1'),null,'exit clears only demo workspace');
 assert.equal(localStorage.getItem('everyday-fitness-v1'),deviceBeforeDemo,'exiting demo restores real device data');
 assert.ok(!document.querySelector('.demo-banner'));
 await click('settings');
 const googleMeter=document.querySelector('.google-sync-usage');
 assert.ok(googleMeter,'Google sync meter appears near Account');
 assert.ok(googleMeter.textContent.includes('781.3 KiB'),'shows app-level Google sync payload limit');
 assert.ok(googleMeter.textContent.includes('browser quota'),'Google meter explicitly distinguishes the browser quota');
 const resetInput=document.querySelector('form[data-form="week-settings"] [name="dayResetMinutes"]');
 assert.ok(resetInput&&resetInput.type==='hidden','reset time uses an inline control');
 const resetRow=resetInput.closest('[data-time-stepper]');
 assert.equal(resetInput.value,'360');
 resetRow.querySelector('[data-delta="1"]').click();await tick();
 assert.equal(resetInput.value,'390','reset time steps forward 30 minutes');
 resetRow.querySelector('[data-delta="-1"]').click();await tick();
 assert.equal(resetInput.value,'360','reset time steps backward 30 minutes');
 await click('food');assert.ok(document.querySelector('.tracking-date input'));await click('new-food');
 assert.equal(document.activeElement.getAttribute('role'),'dialog','opening forms must not autofocus an input');
 const foodFormTest=document.querySelector('form[data-form="food"]');assert.ok(foodFormTest);
 document.querySelector('[data-action="food-quantity"][data-amount="0.5"]').click();await tick();
 assert.equal(foodFormTest.elements.quantity.value,'0.5','half-serving shortcut adjusts hidden quantity');
 await click('food-csv-toggle');assert.ok(document.querySelector('[data-food-csv]').value.startsWith('recordType,date,name'));
 const foodCsv=document.querySelector('[data-food-csv]');
 foodCsv.value='recordType,date,name,calories,protein,quantity,time,saveAsFood\nfoodLog,'+foodFormTest.elements.date.value+',Device meal,250,20,0.5,14:30,true';
 foodCsv.dispatchEvent(new dom.window.Event('input',{bubbles:true}));await tick();
 assert.equal(foodFormTest.elements.name.value,'Device meal');
 assert.equal(foodFormTest.elements.foodTime.value,'29','pasted CSV fills actual time');
 assert.equal(document.querySelector('[data-time-display]').textContent,'2:30 PM','paste updates visible time');
 const foodTimeRow=foodFormTest.elements.foodTime.closest('[data-time-stepper]');
 foodTimeRow.querySelector('[data-delta="1"]').click();await tick();
 assert.equal(foodFormTest.elements.foodTime.value,'30','food time increases by half an hour');
 foodTimeRow.querySelector('[data-delta="-1"]').click();await tick();
 assert.equal(foodFormTest.elements.foodTime.value,'29','food time decreases by half an hour');
 foodTimeRow.querySelector('[data-action="time-clear"]').click();await tick();
 assert.equal(foodFormTest.elements.foodTime.value,'','No time stays available without a dropdown');
 foodTimeRow.querySelector('[data-action="time-now"]').click();await tick();
 assert.ok(Number.isInteger(Number(foodFormTest.elements.foodTime.value)),'Now adds a valid time slot');
 const beforeMidnight=foodFormTest.elements.date.value;
  const afterMidnight=new Date(Date.parse(beforeMidnight+'T12:00:00Z')+86400000).toISOString().slice(0,10);
  foodCsv.value='recordType,date,name,calories,protein,quantity,time,saveAsFood\nfoodLog,'+foodFormTest.elements.date.value+',Device meal,250,20,0.5,23:30,true';
 foodCsv.dispatchEvent(new dom.window.Event('input',{bubbles:true}));await tick();
 assert.equal(foodFormTest.elements.foodTime.value,'47');assert.equal(foodFormTest.elements.date.value,beforeMidnight);
 foodTimeRow.querySelector('[data-delta="1"]').click();await tick();
 assert.equal(foodFormTest.elements.foodTime.value,'0');assert.equal(foodFormTest.elements.date.value,afterMidnight,'crossing midnight advances the calendar date');
 foodTimeRow.querySelector('[data-delta="-1"]').click();await tick();
 assert.equal(foodFormTest.elements.foodTime.value,'47');
 foodCsv.value='recordType,date,name,calories,protein,quantity,time,saveAsFood\nfoodLog,'+foodFormTest.elements.date.value+',Device meal,250,20,0.5,14:30,true';
 foodCsv.dispatchEvent(new dom.window.Event('input',{bubbles:true}));await tick();
 assert.equal(foodFormTest.elements.quantity.value,'0.5','pasted CSV fills serving quantity');
 document.querySelector('[data-action="food-quantity"][data-amount="1"]').click();await tick();
 assert.equal(foodFormTest.elements.quantity.value,'1','quick preset restores one serving');
 assert.ok(foodCsv.value.includes('"1"'),'open CSV updates with serving changes');await submit('food',{name:'Device meal',calories:'250',protein:'20'});
 assert.equal(JSON.parse(localStorage.getItem('everyday-fitness-v1')).foodEntries.length,1);
 await click('sign-in');await click('food');
 assert.ok(!document.querySelector('main').textContent.includes('Device meal'),'no automatic migration');
 await click('settings');await click('migrate-device');
  assert.ok(document.querySelector('[data-action="migrate-device-confirm"]'),'device migration requires explicit review');
  await click('migrate-device-confirm');
 assert.equal(JSON.parse(state.records.get('alice').payload).foodEntries.length,1);
 await click('sign-out');state.user='bob';await click('sign-in');await click('food');
 assert.ok(!document.querySelector('main').textContent.includes('Device meal'),'account separation');
 state.fail=true;await click('new-food');await submit('food',{name:'Cloud meal',calories:'100',protein:'8'});
 assert.ok(document.querySelector('.save-warning'),'unsaved error is visible');assert.equal(state.records.has('bob'),false);
 assert.ok(localStorage.getItem('everyday-cloud-recovery-v1:bob'),'failed cloud save leaves an account-scoped device recovery copy');
 // v89: a pending cloud save must not silently disable unrelated forms after
 // returning from another app. A new finance entry is journaled on-device.
 await click('finances');
 await submit('finance',{amount:'4.25',description:'Logged while cloud unavailable',date:'2026-10-27',category:'Convenience Food'});
 const pendingNotebook=normalizeData(JSON.parse(localStorage.getItem('everyday-cloud-recovery-v1:bob')).data);
 assert.ok(pendingNotebook.transactions.some(tx=>tx.description==='Logged while cloud unavailable'),'new finance log is retained in recovery while cloud pending');
 state.fail=false;await click('cloud-retry');assert.equal(normalizeData(JSON.parse(state.records.get('bob').payload)).foodEntries[0].name,'Cloud meal');
 assert.ok(normalizeData(JSON.parse(state.records.get('bob').payload)).transactions.some(tx=>tx.description==='Logged while cloud unavailable'),'local finance log syncs after retry');
 await click('finances');await click('finance-edit');await click('finance-delete');
 assert.equal(normalizeData(JSON.parse(state.records.get('bob').payload)).transactions.length,0,'test transaction cleanup leaves existing cloud fixture intact');
 assert.equal(localStorage.getItem('everyday-cloud-recovery-v1:bob'),null,'successful cloud save clears the recovery copy');
 assert.ok(localStorage.getItem('everyday-cloud-confirmed-v1:bob'),'successful cloud save keeps a last-confirmed device copy');
 assert.equal(normalizeData(JSON.parse(localStorage.getItem('everyday-fitness-v1'))).foodEntries[0].name,'Device meal','cloud record never replaces local data');
 await click('gym');assert.ok(document.querySelector('.tracking-date input'));
 const dateInput=document.querySelector('.tracking-date input');dateInput.value='2026-09-20';dateInput.dispatchEvent(new dom.window.Event('change',{bubbles:true}));await tick();
 await click('custom-lift');await submit('lift',{exercise:'Test press',weight:'40',reps:'8',difficulty:'7'});
 assert.equal(JSON.parse(state.records.get('bob').payload).lifts[0].date,'2026-09-20');
 await click('custom-lift');const legacyLateralForm=document.querySelector('[data-form="lift"]');legacyLateralForm.elements.exercise.value='Dumbbell Lateral Raises';legacyLateralForm.elements.equipment.value='dumbbell';for(const row of legacyLateralForm.querySelectorAll('.set-row')){row.querySelector('[name="weight"]').value='17.5';row.querySelector('[name="reps"]').value='8';row.querySelector('[name="difficulty"]').value='4';}legacyLateralForm.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick();
 const fullBodyTab=[...document.querySelectorAll('[data-action="workout"]')].find(el=>el.dataset.workout==='Full body');assert.ok(fullBodyTab);fullBodyTab.click();await tick();
 const lateralCard=[...document.querySelectorAll('.exercise-list .exercise')].find(el=>el.dataset.name==='Lateral Raise');assert.ok(lateralCard,'Full body contains canonical Lateral Raise');assert.ok(lateralCard.textContent.includes('Last:'),'legacy Dumbbell Lateral Raises history resolves to Lateral Raise');assert.ok(!lateralCard.textContent.includes('First time'),'canonical history prevents false first-time state');
 await click('home');await click('weight');await submit('weight',{value:'180',date:'2026-09-20'});
 await click('progress');await click('body-fat');await submit('body-fat',{value:'22.4',date:'2026-09-20'});
 await click('progress');assert.ok(document.querySelector('main').textContent.includes('180'));assert.ok(document.querySelector('.weight-progress-chart'),'weigh-in chart renders');assert.ok(document.querySelector('.weight-actual-dot'),'exact weigh-in point renders');assert.ok(document.querySelector('.bodyfat-progress-chart'),'body fat chart renders');assert.equal(JSON.parse(state.records.get('bob').payload).bodyFat[0].value,22.4);
 await click('settings');assert.ok(document.querySelector('.version-badge'),'version remains visible');
 let exported;const originalCreate=URL.createObjectURL;URL.createObjectURL=blob=>{exported=blob;return 'blob:test';};
 dom.window.HTMLAnchorElement.prototype.click=function(){};
 await click('export');const backup=JSON.parse(await exported.text());URL.createObjectURL=originalCreate;
 assert.equal(backup.lifts.length,2);assert.equal(backup.weights.length,1);assert.ok(!('notes' in backup),'retired cruise notes do not return in exported backups');

 // v58: leaving an offline workspace must offer export first and delay the destructive path.
 await click('offline-start');let offlineForm=document.querySelector('[data-form="offline-workspace"]');
 Object.defineProperty(offlineForm.querySelector('[name="file"]'),'files',{value:[{name:'cruise-backup.json',size:100,text:async()=>JSON.stringify(backup)}]});
 offlineForm.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick();
 assert.ok(localStorage.getItem('everyday-offline-workspace-v1'),'offline workspace is stored locally');
 await click('settings');await click('offline-exit');
 let unsafeExit=document.querySelector('[data-action="offline-exit-without"]');
 assert.ok(unsafeExit.disabled,'exit without export starts disabled');assert.match(unsafeExit.textContent,/3/);
 unsafeExit.click();await tick();assert.ok(localStorage.getItem('everyday-offline-workspace-v1'),'disabled exit cannot discard workspace');
 await new Promise(r=>setTimeout(r,3100));
 unsafeExit=document.querySelector('[data-action="offline-exit-without"]');assert.equal(unsafeExit.disabled,false,'no-export exit unlocks after three seconds');
 await click('close');
 await click('offline-exit');
 let exitExported;URL.createObjectURL=blob=>{exitExported=blob;return 'blob:offline-exit-test';};
 await click('offline-exit-export');URL.createObjectURL=originalCreate;
 assert.ok(exitExported,'export-and-exit creates a JSON download');
 assert.equal(localStorage.getItem('everyday-offline-workspace-v1'),null,'export-and-exit removes the local workspace only after export is initiated');
 await tick();await tick();await click('settings');

 await click('import-data');await click('import-csv');let form=document.querySelector('[data-form="import"]');
 Object.defineProperty(form.querySelector('[name="file"]'),'files',{value:[{size:100,text:async()=> 'date,name,calories,protein,quantity\n2026-09-19,CSV meal,300,25,1'}]});
 form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick();await click('commit-import');
 assert.equal(JSON.parse(state.records.get('bob').payload).foodEntries.length,2);
 await click('import-data');await click('restore');form=document.querySelector('[data-form="import"]');
 Object.defineProperty(form.querySelector('[name="file"]'),'files',{value:[{size:100,text:async()=>JSON.stringify(backup)}]});
 form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick();await click('commit-import');
 assert.deepEqual(JSON.parse(state.records.get('bob').payload),backup,'JSON restore preserves the exported snapshot');
 // Pass 2: selected-day preview and full log share the same entries/totals.
 await click('food');
 const setDate=async value=>{const field=document.querySelector('.tracking-date input');field.value=value;field.dispatchEvent(new dom.window.Event('change',{bubbles:true}));await tick();};
 await setDate('2025-01-02');
 assert.ok(document.querySelector('.food-preview-empty'));
 assert.ok([...document.querySelectorAll('.food-section-title h2')].some(el=>el.textContent==='More foods'),'Food page exposes the current library section');
 const savedCountBeforeOneOff=normalizeData(JSON.parse(state.records.get('bob').payload)).foods.length;
 await click('new-food');const saveAsFood=document.querySelector('[name="saveAsFood"]');assert.ok(saveAsFood&&saveAsFood.checked,'new manual foods default to saving in the library');saveAsFood.checked=false;await submit('food',{name:'One-off cruise dessert',calories:'420',protein:'6',quantity:'1'});
 let oneOffState=normalizeData(JSON.parse(state.records.get('bob').payload));assert.equal(oneOffState.foods.length,savedCountBeforeOneOff,'unchecked one-off food does not add a Saved Food');assert.ok(oneOffState.foodEntries.some(e=>e.name==='One-off cruise dessert'),'one-off food still logs normally');
 await click('food-log');assert.equal(document.querySelectorAll('.full-food-log .list-row').length,1,'one-off food is a real logged entry');await click('close');
 for(let i=1;i<=5;i++){
  await click('new-food');await submit('food',{name:'History food '+i,calories:'100',protein:'10',quantity:'2'});
  assert.equal(document.querySelectorAll('.food-preview-row').length,Math.min(i+1,3));
  assert.equal(document.querySelector('.food-total-number strong').textContent,String(420+i*200));
 }
 assert.deepEqual([...document.querySelectorAll('.food-preview-row strong')].map(e=>e.textContent),['History food 5','History food 4','History food 3']);
 await click('food-log');assert.equal(document.querySelectorAll('.full-food-log .list-row').length,6);
 assert.ok(document.querySelector('.modal').textContent.includes('2025-01-02'));
 await click('edit-entry');await submit('food',{name:'Edited historical food',calories:'150',protein:'15',quantity:'2'});
 assert.equal(document.querySelector('.food-total-number strong').textContent,'1520');
 await click('food-log');await click('edit-entry');await click('delete-entry');
 assert.equal(document.querySelector('.food-total-number strong').textContent,'1220');
 assert.equal(document.querySelectorAll('.food-preview-row').length,3);
 const countBeforeSaved=JSON.parse(state.records.get('bob').payload).foodEntries.length;
 await click('add-saved');assert.ok(document.querySelector('[data-form="food"]'),'saved card opens normal food form');assert.equal(document.querySelector('[data-form="food"] [name="date"]').value,'2025-01-02');await submit('food',{quantity:'0.5'});
 let current=JSON.parse(state.records.get('bob').payload);assert.equal(current.foodEntries.at(-1).date,'2025-01-02');assert.equal(current.foodEntries.at(-1).quantity,0.5);assert.ok(document.querySelector('.food-undo-toast'));
 await click('undo-food-add');assert.equal(JSON.parse(state.records.get('bob').payload).foodEntries.length,countBeforeSaved,'saved-food undo removes only the new entry');
 await click('today');assert.ok(document.querySelector('.food-card-add').textContent.includes('Add to today'));
 assert.ok(!document.querySelector('.food-preview').textContent.includes('History food'));
 await click('add-saved');assert.ok(document.querySelector('[data-form="food"]'));await submit('food',{quantity:'1'});current=JSON.parse(state.records.get('bob').payload);
 assert.equal(current.foodEntries.at(-1).date,todayCalendarDate(),'new food entries use their actual calendar date, even before the tracking-day reset');
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
 // Calendar keeps Friday as the fixed week boundary and never modifies historical records.
 await click('home');await click('weight');await submit('weight',{value:'178',date:'2026-09-21'});
 await click('settings');
 const recordsBefore=JSON.parse(state.records.get('bob').payload);
 await submit('week-settings',{dayResetMinutes:'360'});
 const savedCalendar=JSON.parse(state.records.get('bob').payload);
 assert.equal(savedCalendar.settings.weekStart,5);
 for(const key of ['weights','lifts','foods','foodEntries'])assert.deepEqual(savedCalendar[key],recordsBefore[key]);
 await click('progress');
 const {weeklyWeights,startOfWeek,localDate}=await import(new URL('data.js',root));
 const visibleWeeks=weeklyWeights(savedCalendar.weights,68,'lb',5).slice(0,6);
 assert.deepEqual([...document.querySelectorAll('[data-week]')].map(e=>e.dataset.week),visibleWeeks.map(w=>w.week));
 assert.ok(document.querySelector('.progress-trend .weight-progress-chart'),'weight graph lives in Weekly trend');
 assert.ok(!document.querySelector('.weight-progress-panel .weight-progress-chart'),'individual weigh-ins is list-only');
 assert.ok(document.querySelector('.week-setting').textContent.includes('Friday'));
 assert.ok(!document.querySelector('.week-setting').textContent.includes('Change'));
 assert.ok(document.querySelectorAll('.weight-progress-panel .list-row').length<=5);
 assert.ok(document.querySelectorAll('.exercise-progress-panel .exercise-progress-link').length<=4);
 const progressExercise=document.querySelector('.exercise-progress-panel .progress-exercise-card');if(progressExercise){assert.ok(progressExercise.classList.contains('exercise'),'progress uses Lifting exercise card shell');assert.ok(progressExercise.querySelector('.equipment-art'),'progress exercise includes equipment art');assert.ok(progressExercise.className.includes('equipment-'),'progress exercise includes equipment color class');}
 assert.ok(document.querySelector('.food-progress-chart'),'nutrition graph renders');
 assert.equal(document.querySelectorAll('.food-period-tabs [data-action="food-progress-period"]').length,4,'week/month/quarter/year controls render');
 const monthTab=document.querySelector('[data-action="food-progress-period"][data-period="month"]');monthTab.click();await tick();assert.equal(document.querySelector('.food-period-tabs .active')?.dataset.period,'month');
 document.querySelector('[data-action="food-progress-nav"][data-delta="-1"]').click();await tick();assert.ok(document.querySelector('[data-action="food-progress-current"]'),'past period exposes Current shortcut');assert.equal(document.querySelector('[data-action="food-progress-nav"][data-delta="1"]').disabled,false);
 document.querySelector('[data-action="food-progress-nav"][data-delta="1"]').click();await tick();assert.ok(!document.querySelector('[data-action="food-progress-current"]'),'forward scrub returns to current period');
 for(const [date,value] of [['2026-09-22','177.8'],['2026-09-23','177.6'],['2026-09-24','177.4'],['2026-09-25','177.2']]){await click('weight');await submit('weight',{value,date});}
 assert.ok(document.querySelector('[data-action="weight-all"]'),'individual weigh-ins exposes See all after five');
 await click('weight-all');assert.ok(document.querySelectorAll('.weight-all-list .list-row').length>=6,'all weigh-ins modal shows complete list');await click('close');
 const expectedCurrent=startOfWeek(localDate(),5);
 for(const row of document.querySelectorAll('[data-week]'))assert.equal(row.textContent.includes('Current week'),row.dataset.week===expectedCurrent);
 await click('settings');
 await submit('settings',{calories:'1600',protein:'130',heightInches:'68',unit:'lb'});
 assert.equal(JSON.parse(state.records.get('bob').payload).settings.weekStart,5,'saving goals preserves fixed Friday week start');
 await click('sign-out');await click('sign-in');await click('settings');
 assert.equal(document.querySelector('[name="weekStart"]'),null,'week start is no longer user-selectable');
 assert.ok(document.querySelector('main').textContent.includes('Weeks start Friday.'),'Friday boundary survives cloud reload');
 // Pass 4: preview staging, pagination, invalid files, cancellation and failed writes.
 const previewFile=async(kind,raw)=>{
  await click('import-data');await click(kind==='csv'?'import-csv':'restore');const f=document.querySelector('[data-form="import"]');
  Object.defineProperty(f.querySelector('[name="file"]'),'files',{value:[{name:'test.'+kind,size:raw.length,text:async()=>raw}]});
  f.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick();
 };
 const unchanged=JSON.parse(state.records.get('bob').payload);
 const incoming={...structuredClone(unchanged),foodEntries:unchanged.foodEntries.slice(0,1)};incoming.settings.dayResetMinutes=390;
 await previewFile('json',JSON.stringify(incoming));
 assert.ok(document.querySelector('.import-scroll'));assert.ok(document.querySelectorAll('.import-group').length>=1);
 assert.ok(document.querySelector('.import-summary').textContent.includes('replaces all'));
 assert.deepEqual(JSON.parse(state.records.get('bob').payload),unchanged);
 await click('close');assert.ok(!document.querySelector('.modal'));
 assert.deepEqual(JSON.parse(state.records.get('bob').payload),unchanged);
 const largeCSV='date,name,calories,protein,quantity\n'+Array.from({length:121},(_,i)=>`2026-09-27,Preview ${i},100,10,1`).join('\n');
 await previewFile('csv',largeCSV);
 assert.equal(document.querySelectorAll('#import-foodEntries .import-record').length,50);
 const more=document.querySelector('[data-group="foodEntries"]');more.click();await tick();
 assert.equal(document.querySelectorAll('#import-foodEntries .import-record').length,100);
 document.querySelector('[data-group="foodEntries"]').click();await tick();
 assert.equal(document.querySelectorAll('#import-foodEntries .import-record').length,121);
 await click('close');assert.deepEqual(JSON.parse(state.records.get('bob').payload),unchanged);
 const humanCSV=[
  'recordType,date,name,calories,protein,quantity,time,saveAsFood',
  'foodLog,2026-10-12,Cake slice,250,2,1,14:30,true',
  'foodLog,2026-10-12,Funyuns,170,2,1,15:30,false',
  'foodLog,2026-10-12,White Monster,10,0,1,15:30,true'
 ].join('\n');
 await previewFile('csv',humanCSV);
 assert.equal(document.querySelector('.import-human-summary h3').textContent,'3 food entries to import');
 assert.ok(document.querySelector('.import-human-summary').textContent.includes('2 new Saved Foods'));
 assert.ok(document.querySelector('.import-human-summary').textContent.includes('1 one-off entry'));
 assert.ok(document.querySelector('.import-clean-status'),'clean food import says no conflicts');
 assert.equal(document.querySelectorAll('.import-group-foods').length,0,'implicit Saved Foods are not duplicated as their own group');
 assert.equal(document.querySelectorAll('.import-group-foodEntries .import-record').length,3);
 assert.ok(document.querySelector('.import-group-foodEntries').textContent.includes('Will save to Food Library'));
 assert.ok(document.querySelector('.import-group-foodEntries').textContent.includes('One-off · will not save to Food Library'));
 assert.ok(!document.querySelector('.import-group-foodEntries').textContent.includes('Adds new record'));
 await click('close');
 await previewFile('csv','date,name,calories,protein\n2026-09-27,Valid,100,10\n2026-09-27,Invalid,-1,10');
 assert.ok(document.querySelector('[role="alert"]'));assert.ok(!document.querySelector('[data-action="commit-import"]'));await click('close');
 await previewFile('json','{');assert.ok(!document.querySelector('[data-action="commit-import"]'));await click('close');
 const oneCSV='date,name,calories,protein\n2026-09-27,Import test,100,10';
 await previewFile('csv',oneCSV);state.fail=true;await click('commit-import');
 assert.deepEqual(JSON.parse(state.records.get('bob').payload),unchanged,'failed import leaves cloud data unchanged');
 assert.ok(document.querySelector('.import-alert').textContent.includes('not saved'));await click('close');await click('food');
 assert.ok(!document.querySelector('.food-preview').textContent.includes('Import test'),'failed import leaves in-memory data unchanged');
 state.fail=false;await click('settings');await previewFile('csv',oneCSV);await click('commit-import');
 assert.equal(JSON.parse(state.records.get('bob').payload).foodEntries.length,unchanged.foodEntries.length+1);
 await click('settings');await click('import-data');await click('paste-csv');let pasteForm=document.querySelector('[data-form="import"]');pasteForm.elements.text.value='recordType,date,bodyFatPercent\nweight,2026-09-30,21.9';pasteForm.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick();assert.ok(document.querySelector('.import-scroll'));await click('commit-import');assert.equal(JSON.parse(state.records.get('bob').payload).bodyFat.find(b=>b.date==='2026-09-30').value,21.9);
 await previewFile('csv',oneCSV);assert.ok(document.querySelector('.import-needs-review').textContent.includes('possible duplicate'));await click('close');
 // A read resolving after Cancel must not revive the preview.
 await click('import-data');await click('import-csv');const slowForm=document.querySelector('[data-form="import"]');let finishRead;
 Object.defineProperty(slowForm.querySelector('[name="file"]'),'files',{value:[{size:100,text:()=>new Promise(resolve=>{finishRead=resolve;})}]});
 slowForm.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await click('close');finishRead(oneCSV);await tick();
 assert.ok(!document.querySelector('.modal'));assert.ok(!document.querySelector('[data-action="commit-import"]'));
 // Device storage failures also keep the original records intact.
 await click('sign-out');
 assert.equal(localStorage.getItem('everyday-cloud-confirmed-v1:bob'),null,'explicit sign-out clears the account-specific confirmed copy');
 assert.equal(localStorage.getItem('everyday-cloud-recovery-v1:bob'),null,'explicit sign-out clears the account-specific recovery copy');
 await click('settings');
 const localBefore=localStorage.getItem('everyday-fitness-v1');
 await previewFile('csv',oneCSV);
 const originalSetItem=dom.window.Storage.prototype.setItem;
 dom.window.Storage.prototype.setItem=function(){throw Error('Storage full');};
 await click('commit-import');dom.window.Storage.prototype.setItem=originalSetItem;
 assert.equal(localStorage.getItem('everyday-fitness-v1'),localBefore);
 assert.ok(document.querySelector('.import-alert').textContent.includes('Storage full'));
 await click('close');await click('food');assert.ok(!document.querySelector('.food-preview').textContent.includes('Import test'));
 console.log('UI smoke passed: human-first import review, food-library effects, pagination, validation, cancellation, delayed reads, atomic cloud/device failures and confirmation; Food empty/1–3/many entries, full log, historic add/edit/delete, today action; home hierarchy, dialog focus, dates, food, lifting, scrubbable nutrition periods, weigh-in see-all, progress, universal CSV/file+paste and JSON import/export, saved-food undo, body fat, cruise notes, account transitions, migration and save recovery.');
}finally{dom.window.close();await rm(temp,{recursive:true,force:true});}
