import {validDate, round, id} from './data.js?v=49';

// Adapter-independent latest-reading import. Dates are supplied in the phone's
// local calendar; timestamps retain their offset and are used only for ordering.
export function planHealthWeight(current, sample, lastRecordedAt='', lastBodyFatRecordedAt='') {
  if (!sample || typeof sample !== 'object' || !validDate(sample.date)
    || !['lb','kg'].includes(sample.unit) || typeof sample.value !== 'number'
    || !Number.isFinite(sample.value) || sample.value <= 0 || sample.value > 1500
    || typeof sample.recordedAt !== 'string'
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(sample.recordedAt)
    || !Number.isFinite(Date.parse(sample.recordedAt))) throw Error('The incoming weight or date is invalid. Nothing was imported.');
  const hasBodyFat=sample.bodyFatPercent!=null||sample.bodyFatRecordedAt!=null;
  if(hasBodyFat){
    if(typeof sample.bodyFatPercent!=='number'||!Number.isFinite(sample.bodyFatPercent)||sample.bodyFatPercent<=0||sample.bodyFatPercent>100
      ||typeof sample.bodyFatRecordedAt!=='string'
      ||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(sample.bodyFatRecordedAt)
      ||!Number.isFinite(Date.parse(sample.bodyFatRecordedAt)))throw Error('The incoming body-fat reading is invalid. Nothing was imported.');
  }
  const time=Date.parse(sample.recordedAt),bodyFatTime=hasBodyFat?Date.parse(sample.bodyFatRecordedAt):0;
  const weightFresh=!lastRecordedAt||time>Date.parse(lastRecordedAt),bodyFatFresh=hasBodyFat&&(!lastBodyFatRecordedAt||bodyFatTime>Date.parse(lastBodyFatRecordedAt));
  if(!weightFresh&&!bodyFatFresh)return{changed:false,status:'This reading has already been handled.',lastRecordedAt,lastBodyFatRecordedAt};
  const candidate=structuredClone(current),existing=candidate.weights.find(w=>w.date===sample.date),value=round(sample.value*(sample.unit===current.settings.unit?1:current.settings.unit==='kg'?1/2.2046226218:2.2046226218));
  if(value<=0)throw Error('The incoming weight is too small. Nothing was imported.');
  let target=existing,changed=false,weightStatus='';
  if(weightFresh){
    if(existing&&existing.source!=='apple-health-shortcut')weightStatus='Kept your existing weight';
    else if(existing?.recordedAt&&time<=Date.parse(existing.recordedAt))weightStatus='Kept the newer weight';
    else{
      const entry={...(existing||{}),id:existing?.id||id(),date:sample.date,value,source:'apple-health-shortcut',recordedAt:sample.recordedAt};
      if(existing)candidate.weights[candidate.weights.findIndex(w=>w.id===existing.id)]=entry;else candidate.weights.push(entry);
      target=entry;changed=true;weightStatus='Imported '+value+' '+current.settings.unit;
    }
    lastRecordedAt=sample.recordedAt;
  }
  let bodyFatStatus='';
  if(bodyFatFresh){
    const bodyFat=round(sample.bodyFatPercent<=1?sample.bodyFatPercent*100:sample.bodyFatPercent);
    target=candidate.weights.find(w=>w.date===sample.date);
    if(target){target.bodyFatPercent=bodyFat;target.bodyFatRecordedAt=sample.bodyFatRecordedAt;changed=true;bodyFatStatus='imported '+bodyFat+'% body fat';}
    else bodyFatStatus='body fat could not be attached because this weigh-in is no longer present';
    lastBodyFatRecordedAt=sample.bodyFatRecordedAt;
  }
  const parts=[weightStatus,bodyFatStatus].filter(Boolean),status=(parts.length?parts.join(' and '):'No changes')+' for '+sample.date+'.';
  return{changed,candidate:changed?candidate:undefined,status,lastRecordedAt,lastBodyFatRecordedAt};
}

export function shortcutURL(projectId,token) {
  if(!/^[a-f0-9]{64}$/.test(token)) throw Error('Invalid connection key.');
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/weightBridges/${token}?updateMask.fieldPaths=sample&currentDocument.exists=true&mask.fieldPaths=sample`;
}
