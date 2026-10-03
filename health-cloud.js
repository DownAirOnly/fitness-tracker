import {decodeState, encodeState, nextRecord, CloudConflict} from './cloud-model.js?v=49';
import {planHealthWeight,shortcutURL} from './health-model.js?v=49';

export function healthBridge({db,auth,sdk,projectId}) {
  const config=uid=>sdk.doc(db,'users',uid,'integrations','appleHealth');
  const bridge=token=>sdk.doc(db,'weightBridges',token);
  const state=uid=>sdk.doc(db,'users',uid,'state','main');
  const owner=uid=>{if(auth.currentUser?.uid!==uid)throw Error('Account changed.');};
  return {
    url:token=>shortcutURL(projectId,token),
    async enable(uid) {
      owner(uid);
      const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
      await sdk.runTransaction(db,async tx=>{
        owner(uid);const old=await tx.get(config(uid));
        if(old.exists()&&old.data().token)tx.delete(bridge(old.data().token));
        tx.set(bridge(token),{uid,sample:null});
        tx.set(config(uid),{token,lastRecordedAt:'',status:'Waiting for your first Shortcut sync.'});
      });
      return token;
    },
    async disable(uid) {
      owner(uid);
      await sdk.runTransaction(db,async tx=>{
        owner(uid);const old=await tx.get(config(uid));
        if(old.exists()&&old.data().token)tx.delete(bridge(old.data().token));
        tx.delete(config(uid));
      });
    },
    async pull(uid,expectedRevision) {
      owner(uid);
      return sdk.runTransaction(db,async tx=>{
        owner(uid);const cfg=await tx.get(config(uid));
        if(!cfg.exists())return {enabled:false};
        const options=cfg.data(), inbox=await tx.get(bridge(options.token));
        if(!inbox.exists())throw Error('Weight connection is missing. Reconnect it in Settings.');
        const sample=inbox.data().sample;
        if(!sample)return {enabled:true,token:options.token,status:options.status};
        const snapshot=await tx.get(state(uid)),record=snapshot.exists()?snapshot.data():null;
        const decoded=decodeState(record);
        if(decoded.revision!==expectedRevision)throw new CloudConflict();
        const plan=planHealthWeight(decoded.data,sample,options.lastRecordedAt||'',options.lastBodyFatRecordedAt||'');
        if(plan.lastRecordedAt===(options.lastRecordedAt||'')&&plan.lastBodyFatRecordedAt===(options.lastBodyFatRecordedAt||''))return {enabled:true,token:options.token,status:options.status};
        let next=null;
        if(plan.changed){next=nextRecord(record,expectedRevision,encodeState(plan.candidate));tx.set(state(uid),{...next,updatedAt:sdk.serverTimestamp()});}
        const nextOptions={...options,lastRecordedAt:plan.lastRecordedAt,status:plan.status};if(plan.lastBodyFatRecordedAt)nextOptions.lastBodyFatRecordedAt=plan.lastBodyFatRecordedAt;tx.set(config(uid),nextOptions);
        return {enabled:true,token:options.token,status:plan.status,...(next?{data:plan.candidate,revision:next.revision}:{})};
      });
    }
  };
}
