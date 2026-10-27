import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData} from '../data.js';
import {CloudSession,CloudConflict,nextRecord,encodeState,decodeState,mergeDeviceData,planDeviceMigration,hasDeviceMigrationContent} from '../cloud-model.js';

function memoryStore(){const records=new Map();return {records,async read(uid){return records.get(uid)||null;},async write(uid,expected,payload){const next=nextRecord(records.get(uid)||null,expected,payload);records.set(uid,next);return next;}};}
function food(id,name='Meal'){return {id,date:'2026-09-26',name,calories:300,protein:20,quantity:1};}

test('new and returning accounts never borrow another account’s records',async()=>{
 const store=memoryStore(),a=new CloudSession('alice',store),b=new CloudSession('bob',store);
 const data=await a.load();data.foodEntries.push(food('one'));await a.save(data);
 assert.equal((await b.load()).foodEntries.length,0);
 const returning=new CloudSession('alice',store);assert.equal((await returning.load()).foodEntries.length,1);
});
test('stale device cannot overwrite a newer save',async()=>{
 const store=memoryStore(),a=new CloudSession('same-user',store),b=new CloudSession('same-user',store);
 const one=await a.load(),two=await b.load();one.foodEntries.push(food('a'));await a.save(one);two.foodEntries.push(food('b'));
 await assert.rejects(()=>b.save(two),CloudConflict);
 assert.equal(decodeState(store.records.get('same-user')).data.foodEntries[0].id,'a');
});
test('failed loads and signed-out sessions cannot save',async()=>{
 const store=memoryStore(),a=new CloudSession('a',store);await assert.rejects(()=>a.save(emptyData()),/not ready/);
 await a.load();a.close();await assert.rejects(()=>a.save(emptyData()),/not ready/);
 const bad=new CloudSession('b',{read:async()=>{throw Error('offline');}});await assert.rejects(()=>bad.load(),/offline/);assert.equal(bad.ready,false);
});
test('failed saves preserve revision and allow retry',async()=>{
 const store=memoryStore();const original=store.write;let fail=true;store.write=async(...args)=>{if(fail)throw Error('offline');return original(...args);};
 const session=new CloudSession('a',store);const data=await session.load();data.foodEntries.push(food('a'));
 await assert.rejects(()=>session.save(data),/offline/);assert.equal(session.revision,0);assert.equal(session.busy,false);
 fail=false;await session.save(data);assert.equal(session.revision,1);
});
test('closing an account during load does not reveal its result',async()=>{
 let finish;const session=new CloudSession('a',{read:()=>new Promise(resolve=>finish=resolve)});
 const loading=session.load();session.close();finish(null);await assert.rejects(()=>loading,/Account changed/);
});
test('migration is repeat-safe, converts units, and preserves cloud conflicts',()=>{
 const cloud=emptyData(),device=emptyData();cloud.settings.unit='kg';cloud.foodEntries.push(food('a','Cloud'));
 cloud.weights.push({id:'w1',date:'2026-09-26',value:80});device.foodEntries.push(food('a','Device'),food('b'));
 device.weights.push({id:'w2',date:'2026-09-26',value:190},{id:'w3',date:'2026-09-25',value:220.46226218});
 const merged=mergeDeviceData(cloud,device);assert.equal(merged.foodEntries.length,2);assert.equal(merged.foodEntries[0].name,'Cloud');assert.equal(merged.weights[0].value,80);assert.equal(merged.weights[1].value,100);
 assert.deepEqual(mergeDeviceData(merged,device),merged);assert.equal(device.weights[1].value,220.46226218);
});
test('oversized or unsupported cloud data is rejected before writing',()=>{
 const data=emptyData();data.foodEntries.push(food('a','x'.repeat(800001)));assert.throws(()=>encodeState(data),/limit/);
 assert.throws(()=>decodeState({schemaVersion:99,revision:1,payload:'{}'}),/unsupported/);
});


test('full migration preserves custom exercise references, routine variants and saved Buddy history',()=>{
 const cloud=emptyData(),device=emptyData();
 cloud.workoutTemplates[0].exercises=cloud.workoutTemplates[0].exercises.slice(0,1);
 cloud.exerciseDefinitions.push({id:'shared-def',name:'Custom Row Variation',equipment:'machine'});
 device.exerciseDefinitions.push({id:'shared-def',name:'Smith Squat',equipment:'machine',setup:'Seat 2'});
 device.workoutTemplates[0].exercises=device.workoutTemplates[0].exercises.slice(0,2);
 device.workoutTemplates.push({id:'extra-routine',name:'Custom Legs',exercises:[{exerciseId:'shared-def',repMin:8,repMax:12,targetSets:2,restSeconds:90}]});
 device.workoutHistory.push({id:'session-1',workoutId:'extra-routine',type:'Custom Legs',date:'2026-10-25',startedAt:'2026-10-25T14:00:00Z',performedOrder:['smith squat|machine'],exercises:[
  {exerciseId:'shared-def',name:'Smith Squat',equipment:'machine',status:'done',sets:[{weight:115,reps:10,startedAt:'2026-10-25T14:05:00Z',durationSeconds:48}]}]});
 device.lifts.push({id:'lift-1',date:'2026-10-25',buddySessionId:'session-1',exercise:'Smith Squat',equipment:'machine',sets:[{weight:115,reps:10}]});
 const cloudBefore=JSON.stringify(cloud),deviceBefore=JSON.stringify(device);
 const {candidate,summary}=planDeviceMigration(cloud,device);
 const custom=candidate.workoutTemplates.find(w=>w.name==='Custom Legs');
 const def=candidate.exerciseDefinitions.find(e=>e.id===custom.exercises[0].exerciseId);
 assert.equal(def.name,'Smith Squat','exercise ID collision must be remapped');
 assert.notEqual(def.id,'shared-def','cloud definition keeps its original ID');
 assert.equal(candidate.workoutTemplates.some(w=>w.name==='Upper (device)'),true,'keep both routine versions');
 assert.equal(candidate.workoutHistory.length,1);
 assert.equal(candidate.workoutHistory[0].workoutId,custom.id);
 assert.equal(candidate.workoutHistory[0].exercises[0].exerciseId,def.id);
 assert.equal(candidate.lifts[0].buddySessionId,candidate.workoutHistory[0].id);
 assert.equal(summary.added.workoutHistory,1);
 assert.equal(JSON.stringify(cloud),cloudBefore);
 assert.equal(JSON.stringify(device),deviceBefore);
 assert.deepEqual(mergeDeviceData(candidate,device),candidate,'second migration must not duplicate records');
 assert.deepEqual(decodeState({schemaVersion:1,revision:1,payload:encodeState(candidate)}).data,candidate,'cloud serialization must preserve migrated routines/history');
});

test('migration converts all workout weight copies and preserves cloud unit and existing entries',()=>{
 const cloud=emptyData(),device=emptyData();
 cloud.settings.unit='kg';cloud.foodEntries.push(food('cloud-food'));
 cloud.weights.push({id:'cloud-weight',date:'2026-10-24',value:82});
 cloud.workoutHistory.push({id:'shared-session',date:'2026-10-24',startedAt:'2026-10-24T15:00:00Z',type:'Upper',exercises:[]});
 device.activeWorkout={id:'device-active',workoutId:'workout-01',date:'2026-10-25',type:'Upper',startedAt:'2026-10-25T16:00:00Z',phase:'exercise',selected:'chest press|machine',exercises:[
  {name:'Chest Press',equipment:'machine',exerciseId:'exercise-machine-chest-press',sets:[{weight:45,reps:10}],draft:{weight:60,reps:8}}
 ],undo:{label:'start set',exercises:[{name:'Chest Press',equipment:'machine',sets:[{weight:50,reps:8}],draft:{weight:55,reps:8}}]}};
 device.workoutHistory.push({id:'shared-session',date:'2026-10-23',startedAt:'2026-10-23T15:00:00Z',type:'Upper',exercises:[
  {name:'Chest Press',equipment:'machine',sets:[{weight:90,reps:8}]}]});
 device.lifts.push({id:'related',date:'2026-10-23',exercise:'Chest Press',equipment:'machine',buddySessionId:'shared-session',sets:[{weight:90,reps:8}]});
 device.weights.push({id:'same-day',date:'2026-10-24',value:180});
 const first=planDeviceMigration(cloud,device),m=first.candidate;
 assert.equal(m.settings.unit,'kg');
 assert.equal(m.activeWorkout.exercises[0].sets[0].weight,20.4);
 assert.equal(m.activeWorkout.exercises[0].draft.weight,27.2);
 assert.equal(m.activeWorkout.undo.exercises[0].sets[0].weight,22.7);
 assert.equal(m.workoutHistory.length,2);
 assert.notEqual(m.workoutHistory[1].id,'shared-session');
 assert.equal(m.lifts[0].buddySessionId,m.workoutHistory[1].id);
 assert.equal(m.lifts[0].sets[0].weight,40.8);
 assert.equal(m.weights.length,1,'same-day cloud weigh-in takes precedence');
 assert.equal(first.summary.activeWorkout,'imported');
 assert.equal(first.summary.unitFrom,'lb');
 assert.equal(first.summary.unitTo,'kg');
 assert.deepEqual(mergeDeviceData(m,device),m,'retry does not duplicate remapped history or active session');
});

test('two conflicting active workouts block migration without mutating either notebook',()=>{
 const cloud=emptyData(),device=emptyData();
 cloud.activeWorkout={id:'cloud-active',startedAt:'2026-10-25T13:00:00Z',phase:'exercise',exercises:[]};
 device.activeWorkout={id:'device-active',startedAt:'2026-10-25T14:00:00Z',phase:'exercise',exercises:[]};
 const first=JSON.stringify(cloud),second=JSON.stringify(device);
 assert.throws(()=>planDeviceMigration(cloud,device),/different active workouts/);
 assert.equal(JSON.stringify(cloud),first);
 assert.equal(JSON.stringify(device),second);
});

test('migration option appears for routines or saved sessions even without ordinary logs',()=>{
 const notebook=emptyData();
 assert.equal(hasDeviceMigrationContent(notebook),false);
 notebook.workoutTemplates.push({id:'custom',name:'Cardio',exercises:[]});
 assert.equal(hasDeviceMigrationContent(notebook),true);
});

test('colliding workout and lift IDs preserve both distinct histories',()=>{
 const cloud=emptyData(),device=emptyData();
 cloud.workoutHistory.push({id:'session-x',startedAt:'2026-10-24T15:00:00Z',type:'Upper',exercises:[]});
 cloud.lifts.push({id:'lift-x',date:'2026-10-24',exercise:'Chest Press',equipment:'machine',sets:[{weight:50,reps:8}]});
 device.workoutHistory.push({id:'session-x',startedAt:'2026-10-25T15:00:00Z',type:'Upper',exercises:[]});
 device.lifts.push({id:'lift-x',date:'2026-10-25',exercise:'Chest Press',equipment:'machine',buddySessionId:'session-x',sets:[{weight:60,reps:8}]});
 const merged=mergeDeviceData(cloud,device);
 assert.equal(merged.lifts.length,2);
 assert.equal(merged.workoutHistory.length,2);
 assert.equal(merged.lifts[1].buddySessionId,merged.workoutHistory[1].id);
 assert.notEqual(merged.lifts[1].id,merged.lifts[0].id);
});

test('matching exercise setups are accounted for in migration preview',()=>{
 const cloud=emptyData(),device=emptyData();
 const def=cloud.exerciseDefinitions.find(e=>e.name==='Chest Press');
 const source=device.exerciseDefinitions.find(e=>e.name==='Chest Press');
 assert.equal(def.setup,undefined);
 source.setup='Machine level 4';
 const {candidate,summary}=planDeviceMigration(cloud,device);
 assert.equal(candidate.exerciseDefinitions.find(e=>e.name==='Chest Press').setup,'Machine level 4');
 assert.equal(summary.filledSetups,1);
 assert.equal(cloud.exerciseDefinitions.find(e=>e.name==='Chest Press').setup,undefined);
 const second=planDeviceMigration(candidate,device);
 assert.equal(second.summary.filledSetups,0);
 assert.deepEqual(second.candidate,candidate);
});


const money=(id,amountCents=719,description='Bottled water')=>({
 id,date:'2026-10-27',time:'15:18',kind:'expense',amountCents,description,category:'Household supplies',currency:'USD'
});

test('v82: financial entries survive cloud save/load and stay account-scoped',async()=>{
 const store=memoryStore(),alice=new CloudSession('alice-finances',store),bob=new CloudSession('bob-finances',store);
 const a=await alice.load();a.transactions.push(money('one'));await alice.save(a);
 assert.equal((await bob.load()).transactions.length,0);
 const returning=new CloudSession('alice-finances',store);
 assert.deepEqual((await returning.load()).transactions,[money('one')]);
 assert.equal(decodeState(store.records.get('alice-finances')).data.transactions[0].amountCents,719);
});

test('v82: device migration retains identical purchases with different IDs, and is repeat-safe',()=>{
 const cloud=emptyData(),device=emptyData();device.transactions=[money('one'),money('two')];
 assert.equal(hasDeviceMigrationContent(device),true);
 const first=planDeviceMigration(cloud,device);
 assert.equal(first.summary.added.transactions,2);
 assert.equal(first.candidate.transactions.length,2,'two identical purchases are not content-deduplicated');
 const repeat=planDeviceMigration(first.candidate,device);
 assert.equal(repeat.summary.added.transactions,0);
 assert.equal(repeat.summary.skipped.transactions,2);
 assert.deepEqual(repeat.candidate,first.candidate);
});

test('v82: distinct transactions with colliding IDs keep the cloud entry and get stable device IDs',()=>{
 const cloud=emptyData(),device=emptyData();
 cloud.transactions=[money('collision',100,'Cloud purchase')];
 device.transactions=[money('collision',200,'Device purchase')];
 const before=JSON.stringify(device),first=planDeviceMigration(cloud,device);
 assert.equal(first.summary.added.transactions,1);
 assert.equal(first.summary.idConflicts,1);
 assert.equal(first.candidate.transactions[0].description,'Cloud purchase');
 assert.equal(first.candidate.transactions[1].description,'Device purchase');
 assert.equal(first.candidate.transactions[1].id,'collision-device');
 const again=planDeviceMigration(first.candidate,device);
 assert.equal(again.summary.added.transactions,0);
 assert.equal(again.summary.skipped.transactions,1);
 assert.deepEqual(again.candidate,first.candidate);
 assert.equal(JSON.stringify(device),before,'original device notebook is untouched');
});

test('v82: stale cloud revisions cannot overwrite newer financial records',async()=>{
 const store=memoryStore(),a=new CloudSession('same-finance-user',store),b=new CloudSession('same-finance-user',store);
 const first=await a.load(),stale=await b.load();
 first.transactions.push(money('rent',100000,'Rent'));await a.save(first);
 stale.transactions.push(money('groceries',2359,'Groceries'));
 await assert.rejects(()=>b.save(stale),CloudConflict);
 assert.deepEqual(decodeState(store.records.get('same-finance-user')).data.transactions,[money('rent',100000,'Rent')]);
});


test('v84: cloud save/load retains bank source, personal label and receipt itemization',async()=>{
 const store=memoryStore(),session=new CloudSession('bank-metadata',store);
 const data=await session.load();
 data.transactions.push({id:'bofa-example',date:'2026-10-25',kind:'expense',amountCents:719,
  description:'Two water cases',bankDescription:'BofA WAWA #4421 10/24',
  accountLabel:'BofA Checking',statementLabel:'October 2026',
  category:'Household Supplies',subcategory:'Bottled Water',purchaseDate:'2026-10-24',time:'14:30',
  itemization:'2 cases × 24 bottles — $7.19',currency:'USD',source:'import',externalId:'bank-id-1'});
 await session.save(data);
 const returning=new CloudSession('bank-metadata',store);
 const restored=await returning.load();
 assert.deepEqual(restored.transactions,data.transactions,'normalization and storage never discard enrichment fields');
 const device=emptyData();device.transactions.push({...data.transactions[0],id:'bofa-second',description:'Wawa water'});
 const migrated=planDeviceMigration(restored,device);
 assert.equal(migrated.errors?.length||0,0);
 assert.ok(migrated.candidate.transactions.some(tx=>tx.id==='bofa-second'&&tx.bankDescription==='BofA WAWA #4421 10/24'));
});
