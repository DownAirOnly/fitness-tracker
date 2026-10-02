import {validDate, round, id} from './data.js?v=35';

// Adapter-independent latest-reading import. Dates are supplied in the phone's
// local calendar; timestamps retain their offset and are used only for ordering.
export function planHealthWeight(current, sample, lastRecordedAt='') {
  if (!sample || typeof sample !== 'object' || !validDate(sample.date)
    || !['lb','kg'].includes(sample.unit) || typeof sample.value !== 'number'
    || !Number.isFinite(sample.value) || sample.value <= 0 || sample.value > 1500
    || typeof sample.recordedAt !== 'string'
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(sample.recordedAt)
    || !Number.isFinite(Date.parse(sample.recordedAt))) throw Error('The incoming weight or date is invalid. Nothing was imported.');
  const time=Date.parse(sample.recordedAt);
  if(lastRecordedAt && time<=Date.parse(lastRecordedAt)) return {changed:false,status:'This reading has already been handled.',lastRecordedAt};
  const existing=current.weights.find(w=>w.date===sample.date);
  if(existing && existing.source!=='apple-health-shortcut') return {changed:false,status:`Kept your existing weight for ${sample.date}.`,lastRecordedAt:sample.recordedAt};
  if(existing?.recordedAt && time<=Date.parse(existing.recordedAt)) return {changed:false,status:`Kept the newer weight for ${sample.date}.`,lastRecordedAt:sample.recordedAt};
  const value=round(sample.value*(sample.unit===current.settings.unit?1:current.settings.unit==='kg'?1/2.2046226218:2.2046226218));
  if(value<=0) throw Error('The incoming weight is too small. Nothing was imported.');
  const candidate=structuredClone(current);
  const entry={id:existing?.id||id(),date:sample.date,value,source:'apple-health-shortcut',recordedAt:sample.recordedAt};
  if(existing) candidate.weights[candidate.weights.findIndex(w=>w.id===existing.id)]=entry;
  else candidate.weights.push(entry);
  return {changed:true,candidate,status:`Imported ${value} ${current.settings.unit} for ${sample.date}.`,lastRecordedAt:sample.recordedAt};
}

export function shortcutURL(projectId,token) {
  if(!/^[a-f0-9]{64}$/.test(token)) throw Error('Invalid connection key.');
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/weightBridges/${token}?updateMask.fieldPaths=sample&currentDocument.exists=true&mask.fieldPaths=sample`;
}
