import {emptyData, normalizeData, encodeData, round} from './data.js?v=53';

export const MAX_CLOUD_BYTES = 800000;
export class CloudConflict extends Error {
  constructor() { super('Another device saved a newer version. Export your unsaved changes, then load the latest cloud data before editing again.'); this.code='conflict'; }
}
export function encodeState(data) {
  const payload=JSON.stringify(encodeData(data));
  if(new TextEncoder().encode(payload).length>MAX_CLOUD_BYTES) throw new Error('This account has reached the current cloud storage limit. Export a backup before reducing its history.');
  return payload;
}
export function decodeState(record) {
  if(record==null) return {data:emptyData(),revision:0};
  if(record.schemaVersion!==1 || !Number.isSafeInteger(record.revision) || record.revision<1 || typeof record.payload!=='string') throw new Error('Cloud data has an unsupported format. Nothing was overwritten.');
  return {data:normalizeData(JSON.parse(record.payload)),revision:record.revision};
}
export function nextRecord(current,expected,payload) {
  const revision=decodeState(current).revision;
  if(revision!==expected) throw new CloudConflict();
  return {schemaVersion:1,revision:revision+1,payload};
}
export function hasRecords(data) { return ['foods','foodEntries','lifts','weights','bodyFat','notes'].some(k=>(data[k]||[]).length>0); }
export function mergeDeviceData(cloud,device) {
  const result=normalizeData(structuredClone(cloud));
  const incoming=normalizeData(structuredClone(device));
  if(!hasRecords(result)) result.settings={...incoming.settings};
  const factor=result.settings.unit===incoming.settings.unit?1:result.settings.unit==='kg'?1/2.2046226218:2.2046226218;
  incoming.weights.forEach(w=>w.value=round(w.value*factor));
  incoming.lifts.forEach(l=>l.sets.forEach(s=>s.weight=round(s.weight*factor)));
  for(const key of ['foods','foodEntries','lifts','weights','bodyFat','notes']) {
    const existing=new Set(result[key].map(x=>x.id));
    const dates=new Set(result.weights.map(x=>x.date));
    for(const item of incoming[key]) {
      if(existing.has(item.id) || (key==='weights' && dates.has(item.date))) continue;
      result[key].push(item); existing.add(item.id);
      if(key==='weights') dates.add(item.date);
    }
  }
  return result;
}

// A session captures an immutable owner UID. Async work from an older account
// cannot be redirected to a newly signed-in user's document.
export class CloudSession {
  constructor(uid,store) {this.uid=uid;this.store=store;this.ready=false;this.busy=false;this.revision=0;this.closed=false;}
  async load() {
    if(this.closed||this.busy) throw new Error('Account is busy.');
    this.ready=false;
    const result=decodeState(await this.store.read(this.uid));
    if(this.closed) throw new Error('Account changed. Please sign in again.');
    this.revision=result.revision;this.ready=true;return result.data;
  }
  async save(data) {
    if(this.closed||!this.ready||this.busy) throw new Error('Account is not ready to save.');
    const payload=encodeState(data);this.busy=true;
    try {
      const record=await this.store.write(this.uid,this.revision,payload);
      if(this.closed) throw new Error('Account changed while saving. Check your cloud data after signing in again.');
      this.revision=record.revision;
    } finally {this.busy=false;}
  }
  close() {this.closed=true;this.ready=false;}
}
