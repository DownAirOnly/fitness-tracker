import {validDate, round, id} from './data.js?v=56';

const stampPattern=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const validStamp=value=>typeof value==='string'&&stampPattern.test(value)&&Number.isFinite(Date.parse(value));

// Adapter-independent latest-measurement import. Weight and body fat are separate
// measurement streams with separate dates and processed timestamps.
export function planHealthWeight(current, sample, lastRecordedAt='', lastBodyFatRecordedAt='') {
  if(!sample||typeof sample!=='object')throw Error('The incoming Health sample is invalid. Nothing was imported.');
  const hasWeight=['value','unit','date','recordedAt'].some(key=>sample[key]!=null);
  const hasBodyFat=['bodyFatPercent','bodyFatDate','bodyFatRecordedAt'].some(key=>sample[key]!=null);
  if(!hasWeight&&!hasBodyFat)throw Error('The incoming Health sample has no supported measurements.');

  if(hasWeight){
    if(!validDate(sample.date)||!['lb','kg'].includes(sample.unit)||typeof sample.value!=='number'
      ||!Number.isFinite(sample.value)||sample.value<=0||sample.value>1500||!validStamp(sample.recordedAt))
      throw Error('The incoming weight or date is invalid. Nothing was imported.');
  }

  // Backward compatibility: the brief v49 Shortcut did not send bodyFatDate
  // because body fat was attached to weight. When weight is present, its date
  // remains a valid fallback while old Shortcuts are phased out.
  const bodyFatDate=sample.bodyFatDate||(hasWeight?sample.date:'');
  if(hasBodyFat){
    if(typeof sample.bodyFatPercent!=='number'||!Number.isFinite(sample.bodyFatPercent)
      ||sample.bodyFatPercent<=0||sample.bodyFatPercent>100||!validDate(bodyFatDate)
      ||!validStamp(sample.bodyFatRecordedAt))
      throw Error('The incoming body-fat reading or date is invalid. Nothing was imported.');
  }

  const weightTime=hasWeight?Date.parse(sample.recordedAt):0;
  const bodyFatTime=hasBodyFat?Date.parse(sample.bodyFatRecordedAt):0;
  const weightFresh=hasWeight&&(!lastRecordedAt||weightTime>Date.parse(lastRecordedAt));
  const bodyFatFresh=hasBodyFat&&(!lastBodyFatRecordedAt||bodyFatTime>Date.parse(lastBodyFatRecordedAt));
  if(!weightFresh&&!bodyFatFresh)return{changed:false,status:'These Health readings have already been handled.',lastRecordedAt,lastBodyFatRecordedAt};

  const candidate=structuredClone(current);
  candidate.bodyFat=Array.isArray(candidate.bodyFat)?candidate.bodyFat:[];
  let changed=false;
  const statuses=[];

  if(weightFresh){
    const value=round(sample.value*(sample.unit===current.settings.unit?1:current.settings.unit==='kg'?1/2.2046226218:2.2046226218));
    if(value<=0)throw Error('The incoming weight is too small. Nothing was imported.');
    const existing=candidate.weights.find(w=>w.date===sample.date);
    if(existing&&existing.source!=='apple-health-shortcut')statuses.push('Kept your existing weight for '+sample.date);
    else if(existing?.recordedAt&&weightTime<=Date.parse(existing.recordedAt))statuses.push('Kept the newer weight for '+sample.date);
    else{
      const entry={...(existing||{}),id:existing?.id||id(),date:sample.date,value,source:'apple-health-shortcut',recordedAt:sample.recordedAt};
      if(existing)candidate.weights[candidate.weights.findIndex(w=>w.id===existing.id)]=entry;else candidate.weights.push(entry);
      changed=true;statuses.push('Imported '+value+' '+current.settings.unit+' for '+sample.date);
    }
    lastRecordedAt=sample.recordedAt;
  }

  if(bodyFatFresh){
    const value=round(sample.bodyFatPercent<=1?sample.bodyFatPercent*100:sample.bodyFatPercent);
    const sameDay=candidate.bodyFat.filter(b=>b.date===bodyFatDate);
    const existing=sameDay.find(b=>b.source!=='apple-health-shortcut')||sameDay.sort((a,b)=>(b.recordedAt||'').localeCompare(a.recordedAt||''))[0];
    if(existing&&existing.source!=='apple-health-shortcut')statuses.push('Kept your existing body-fat reading for '+bodyFatDate);
    else if(existing?.recordedAt&&bodyFatTime<=Date.parse(existing.recordedAt))statuses.push('Kept the newer body-fat reading for '+bodyFatDate);
    else{
      const entry={...(existing||{}),id:existing?.id||id(),date:bodyFatDate,value,source:'apple-health-shortcut',recordedAt:sample.bodyFatRecordedAt};
      if(existing)candidate.bodyFat[candidate.bodyFat.findIndex(b=>b.id===existing.id)]=entry;else candidate.bodyFat.push(entry);
      changed=true;statuses.push('Imported '+value+'% body fat for '+bodyFatDate);
    }
    lastBodyFatRecordedAt=sample.bodyFatRecordedAt;
  }

  return{changed,candidate:changed?candidate:undefined,status:statuses.join('. ')+(statuses.length?'.':''),lastRecordedAt,lastBodyFatRecordedAt};
}

export function shortcutURL(projectId,token) {
  if(!/^[a-f0-9]{64}$/.test(token)) throw Error('Invalid connection key.');
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/weightBridges/${token}?updateMask.fieldPaths=sample&currentDocument.exists=true&mask.fieldPaths=sample`;
}
