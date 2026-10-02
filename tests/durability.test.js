import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData} from '../data.js';
import {writeCloudConfirmed,readCloudConfirmed,writeCloudRecovery,readCloudRecovery,clearCloudRecovery,clearCloudLocal,sameCloudData,requestStorageProtection} from '../durability.js';

function memoryStorage(){
 const values=new Map();
 return{getItem:key=>values.has(key)?values.get(key):null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key),values};
}

test('cloud local records are account-scoped and survive a storage round trip',()=>{
 const storage=memoryStorage(),data=emptyData();data.foodEntries.push({id:'meal',date:'2026-10-02',name:'Meal',calories:400,protein:30,quantity:1});
 writeCloudConfirmed('alice',7,data,storage);writeCloudRecovery('alice',7,data,storage);
 assert.equal(readCloudConfirmed('alice',storage).revision,7);
 assert.equal(readCloudRecovery('alice',storage).data.foodEntries[0].name,'Meal');
 assert.equal(readCloudConfirmed('bob',storage),null);
 assert.equal(sameCloudData(readCloudConfirmed('alice',storage).data,data),true);
 clearCloudRecovery('alice',storage);assert.equal(readCloudRecovery('alice',storage),null);
 assert.ok(readCloudConfirmed('alice',storage));
 clearCloudLocal('alice',storage);assert.equal(readCloudConfirmed('alice',storage),null);
});

test('persistent storage is requested and reported with quota details',async()=>{
 let requested=0;
 const manager={persisted:async()=>false,persist:async()=>{requested++;return true;},estimate:async()=>({usage:123,quota:456})};
 const result=await requestStorageProtection(true,manager);
 assert.equal(requested,1);assert.equal(result.persisted,true);assert.equal(result.usage,123);assert.equal(result.quota,456);
});

test('an already persistent origin is not requested again',async()=>{
 let requested=0;
 const manager={persisted:async()=>true,persist:async()=>{requested++;return true;}};
 const result=await requestStorageProtection(true,manager);
 assert.equal(requested,0);assert.equal(result.persisted,true);
});
