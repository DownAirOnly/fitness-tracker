import {normalizeData,encodeData} from './data.js?v=51';

export const CLOUD_CONFIRMED_PREFIX='everyday-cloud-confirmed-v1:';
export const CLOUD_RECOVERY_PREFIX='everyday-cloud-recovery-v1:';

const storageKey=(prefix,uid)=>prefix+String(uid||'');
const validRevision=value=>Number.isSafeInteger(value)&&value>=0?value:0;

function readRecord(prefix,uid,storage=globalThis.localStorage){
  if(!uid||!storage)return null;
  const key=storageKey(prefix,uid);
  try{
    const raw=storage.getItem(key);if(!raw)return null;
    const stored=JSON.parse(raw);
    if(stored?.version!==1||stored.uid!==uid)throw Error('Invalid local cloud record.');
    return{uid,revision:validRevision(stored.revision),updatedAt:String(stored.updatedAt||''),data:normalizeData(stored.data)};
  }catch{
    try{storage.removeItem(key);}catch{}
    return null;
  }
}
function writeRecord(prefix,uid,revision,data,storage=globalThis.localStorage){
  if(!uid||!storage)throw Error('Local recovery storage is unavailable.');
  const record={version:1,uid,revision:validRevision(revision),updatedAt:new Date().toISOString(),data:encodeData(data)};
  storage.setItem(storageKey(prefix,uid),JSON.stringify(record));
  return{uid:record.uid,revision:record.revision,updatedAt:record.updatedAt,data:normalizeData(record.data)};
}

export const readCloudConfirmed=(uid,storage)=>readRecord(CLOUD_CONFIRMED_PREFIX,uid,storage);
export const readCloudRecovery=(uid,storage)=>readRecord(CLOUD_RECOVERY_PREFIX,uid,storage);
export const writeCloudConfirmed=(uid,revision,data,storage)=>writeRecord(CLOUD_CONFIRMED_PREFIX,uid,revision,data,storage);
export const writeCloudRecovery=(uid,revision,data,storage)=>writeRecord(CLOUD_RECOVERY_PREFIX,uid,revision,data,storage);

export function clearCloudRecovery(uid,storage=globalThis.localStorage){
  if(!uid||!storage)return;
  try{storage.removeItem(storageKey(CLOUD_RECOVERY_PREFIX,uid));}catch{}
}
export function clearCloudLocal(uid,storage=globalThis.localStorage){
  if(!uid||!storage)return;
  try{storage.removeItem(storageKey(CLOUD_RECOVERY_PREFIX,uid));}catch{}
  try{storage.removeItem(storageKey(CLOUD_CONFIRMED_PREFIX,uid));}catch{}
}
export function sameCloudData(a,b){
  try{return JSON.stringify(encodeData(a))===JSON.stringify(encodeData(b));}catch{return false;}
}

export async function requestStorageProtection(request=true,manager=globalThis.navigator?.storage){
  if(!manager)return{supported:false,persisted:null,usage:null,quota:null,error:''};
  let persisted=null,usage=null,quota=null,error='';
  try{
    if(typeof manager.persisted==='function')persisted=await manager.persisted();
    if(request&&persisted!==true&&typeof manager.persist==='function')persisted=await manager.persist();
    if(typeof manager.estimate==='function'){
      const estimate=await manager.estimate();
      usage=Number.isFinite(estimate?.usage)?estimate.usage:null;
      quota=Number.isFinite(estimate?.quota)?estimate.quota:null;
    }
  }catch(err){error=err?.message||'Storage protection check failed.';}
  return{supported:true,persisted,usage,quota,error};
}
