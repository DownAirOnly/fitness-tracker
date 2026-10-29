// v98.1 Firestore adapter. A manifest and three independent JSON section docs
// commit in one Firestore transaction, retaining one account-wide revision.
import {decodeState,CloudConflict} from './cloud-model.js?v=98.1';
import {sectionPayloads,readSectionPayloads,ACCOUNT_SECTIONS} from './account-sections.js?v=98.1';

export const sectionRefs=(sdk,db,uid)=>{
 const section=id=>sdk.doc(db,'users',uid,'state',id);
 return {manifest:section('manifest'),legacy:section('main'),
  sections:Object.fromEntries(ACCOUNT_SECTIONS.map(name=>[name,section(name)]))};
};
const readParts=(manifest,documents)=>{
 if(manifest?.schemaVersion!==2||!Number.isSafeInteger(manifest.revision)||manifest.revision<1)
  throw Error('Unsupported split-account manifest. No data was changed.');
 const payloads={};
 for(const section of ACCOUNT_SECTIONS){
  const doc=documents[section];
  if(!doc||doc.schemaVersion!==2||doc.revision!==manifest.revision||typeof doc.payload!=='string')
   throw Error('An account section is missing or its revision differs. No data was changed.');
  payloads[section]=doc.payload;
 }
 return{data:readSectionPayloads(payloads),revision:manifest.revision,split:true};
};
export async function readAccountServer(sdk,db,uid){
 const r=sectionRefs(sdk,db,uid),manifest=await sdk.getDocFromServer(r.manifest);
 if(!manifest.exists())return decodeLegacy(await sdk.getDocFromServer(r.legacy));
 const docs=await Promise.all(ACCOUNT_SECTIONS.map(s=>sdk.getDocFromServer(r.sections[s])));
 return readParts(manifest.data(),Object.fromEntries(ACCOUNT_SECTIONS.map((s,i)=>[s,docs[i].exists()?docs[i].data():null])));
}
function decodeLegacy(snap){
 const old=decodeState(snap.exists()?snap.data():null);
 return{...old,split:false};
}
export async function readAccountTransaction(tx,refs){
 const manifest=await tx.get(refs.manifest);
 if(!manifest.exists())return decodeLegacy(await tx.get(refs.legacy));
 const docs={};
 // All transaction reads happen before any writes.
 for(const section of ACCOUNT_SECTIONS){
  const snapshot=await tx.get(refs.sections[section]);
  docs[section]=snapshot.exists()?snapshot.data():null;
 }
 return readParts(manifest.data(),docs);
}
export function commitAccountTransaction(tx,refs,read,expected,payload,sdk){
 if(read.revision!==expected)throw new CloudConflict();
 const revision=expected+1;
 const parsed=JSON.parse(payload);
 const parts=sectionPayloads(parsed);
 const timestamp=sdk.serverTimestamp();
 tx.set(refs.manifest,{schemaVersion:2,revision,updatedAt:timestamp});
 for(const section of ACCOUNT_SECTIONS)
  tx.set(refs.sections[section],{schemaVersion:2,revision,payload:parts[section],updatedAt:timestamp});
 // Legacy state/main intentionally remains untouched as an independent
 // rollback reference; never delete it during migration.
 return {schemaVersion:1,revision,payload};
}
