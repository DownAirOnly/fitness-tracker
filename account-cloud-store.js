// v112 — Firestore v3. Account preferences/catalogs have their own documents;
// dated history lives in month-YYYY-MM documents. The manifest is the atomic
// index. Only changed documents are rewritten on a normal save.
// A v2 manifest is read as-is and converted atomically on the first write.
// Legacy state/main and v2 section docs are intentionally never deleted.
import {decodeState,CloudConflict,MAX_CLOUD_BYTES} from './cloud-model.js?v=134';
import {sectionPayloads,readSectionPayloads,ACCOUNT_SECTIONS} from './account-sections.js?v=134';
import {monthlyParts,readMonthlyParts,STATIC_PARTS} from './account-monthly.js?v=134';

const MAX_MONTHS=350,MAX_WRITES=420;
const validRevision=value=>Number.isSafeInteger(value)&&value>=1;
const allPartNames=months=>[...STATIC_PARTS,...months.map(month=>'month-'+month)];
export const sectionRefs=(sdk,db,uid)=>{
 const section=id=>sdk.doc(db,'users',uid,'state',id);
 return{manifest:section('manifest'),legacy:section('main'),
  sections:Object.fromEntries(ACCOUNT_SECTIONS.map(name=>[name,section(name)])),
  part:section};
};
const readLegacy=snap=>{
 const old=decodeState(snap.exists()?snap.data():null);
 return{...old,split:false,layout:old.revision?1:0,partPayloads:{},partVersions:{}};
};
function readV2(manifest,documents){
 if(manifest?.schemaVersion!==2||!validRevision(manifest.revision))
  throw Error('Unsupported split-account manifest. No data was changed.');
 const payloads={};
 for(const section of ACCOUNT_SECTIONS){
  const doc=documents[section];
  if(!doc||doc.schemaVersion!==2||doc.revision!==manifest.revision||typeof doc.payload!=='string')
   throw Error('An account section is missing or its revision differs. No data was changed.');
  payloads[section]=doc.payload;
 }
 return{data:readSectionPayloads(payloads),revision:manifest.revision,
  split:true,layout:2,partPayloads:{},partVersions:{}};
}
function v3Names(manifest){
 if(manifest?.schemaVersion!==3||!validRevision(manifest.revision)||
   !Array.isArray(manifest.months)||manifest.months.length>MAX_MONTHS||
   manifest.months.some(m=>!/^\d{4}-(0[1-9]|1[0-2])$/.test(m))||
   new Set(manifest.months).size!==manifest.months.length||
   manifest.months.join('|')!==[...manifest.months].sort().join('|')||
   !manifest.partVersions||typeof manifest.partVersions!=='object'||
   Array.isArray(manifest.partVersions))
   throw Error('The monthly account index is invalid. No data was changed.');
 const names=allPartNames(manifest.months),keys=Object.keys(manifest.partVersions);
 if(keys.length!==names.length||names.some(name=>!validRevision(manifest.partVersions[name])||
   manifest.partVersions[name]>manifest.revision)||keys.some(name=>!names.includes(name)))
  throw Error('Monthly account file revisions do not match the manifest.');
 return names;
}
function readV3(manifest,documents){
 const names=v3Names(manifest),parts={};
 for(const name of names){
  const doc=documents[name];
  if(!doc||doc.schemaVersion!==3||doc.revision!==manifest.partVersions[name]||
    typeof doc.payload!=='string')
   throw Error('Monthly account file '+name+' is incomplete or changed during loading.');
  parts[name]=doc.payload;
 }
 return{data:readMonthlyParts(parts,manifest.months),revision:manifest.revision,
  split:true,layout:3,partPayloads:parts,partVersions:{...manifest.partVersions}};
}
async function serverRead(sdk,refs){
 const first=await sdk.getDocFromServer(refs.manifest);
 if(!first.exists())return readLegacy(await sdk.getDocFromServer(refs.legacy));
 const manifest=first.data();
 if(manifest.schemaVersion===2){
  const docs=await Promise.all(ACCOUNT_SECTIONS.map(name=>sdk.getDocFromServer(refs.sections[name])));
  return readV2(manifest,Object.fromEntries(ACCOUNT_SECTIONS.map((name,i)=>[name,docs[i].exists()?docs[i].data():null])));
 }
 const names=v3Names(manifest);
 const docs=await Promise.all(names.map(name=>sdk.getDocFromServer(refs.part(name))));
 const after=await sdk.getDocFromServer(refs.manifest);
 if(!after.exists()||after.data().revision!==manifest.revision||after.data().schemaVersion!==3)
  throw Error('Account changed while loading. Retrying the monthly snapshot.');
 return readV3(manifest,Object.fromEntries(names.map((name,i)=>[name,docs[i].exists()?docs[i].data():null])));
}
export async function readAccountServer(sdk,db,uid){
 const refs=sectionRefs(sdk,db,uid);
 try{return await serverRead(sdk,refs);}
 catch(error){
  if(!/changed while loading|incomplete or changed during loading/.test(error.message))throw error;
  return serverRead(sdk,refs);
 }
}
export async function readAccountTransaction(tx,refs){
 const snap=await tx.get(refs.manifest);
 if(!snap.exists())return readLegacy(await tx.get(refs.legacy));
 const manifest=snap.data();
 if(manifest.schemaVersion===2){
  const docs={};
  for(const name of ACCOUNT_SECTIONS){
   const doc=await tx.get(refs.sections[name]);docs[name]=doc.exists()?doc.data():null;
  }
  return readV2(manifest,docs);
 }
 const names=v3Names(manifest),docs={};
 for(const name of names){
  const doc=await tx.get(refs.part(name));docs[name]=doc.exists()?doc.data():null;
 }
 return readV3(manifest,docs);
}
export function commitAccountTransaction(tx,refs,read,expected,payload,sdk){
 if(read.revision!==expected)throw new CloudConflict();
 const next=expected+1,now=sdk.serverTimestamp();
 const {parts,months}=monthlyParts(JSON.parse(payload)),partNames=allPartNames(months);
 if(months.length>MAX_MONTHS)throw Error('Too many months for a single safe account migration. Export your backup before continuing.');
 const oversize=Object.entries(parts).find(([,value])=>new TextEncoder().encode(value).length>MAX_CLOUD_BYTES);
 if(oversize)throw Error('Account file '+oversize[0]+' exceeds the 800 KB cloud limit. The save was not applied.');
 const versions={};
 const changed=partNames.filter(name=>{
  const same=read.layout===3&&read.partPayloads[name]===parts[name]&&validRevision(read.partVersions[name]);
  versions[name]=same?read.partVersions[name]:next;
  return !same;
 });
 if(changed.length+1>MAX_WRITES)throw Error('This migration needs too many writes for one atomic Firestore transaction. Nothing was changed.');
 // The new manifest is always committed together with every changed file.
 // Removed months are omitted from the index; their historical documents are
 // deliberately retained rather than silently deleted.
 tx.set(refs.manifest,{schemaVersion:3,revision:next,months,partVersions:versions,updatedAt:now});
 for(const name of changed)tx.set(refs.part(name),{
  schemaVersion:3,revision:next,payload:parts[name],updatedAt:now
 });
 return{schemaVersion:1,revision:next,payload};
}
