import {decodeStoredData,encodeStoredData} from './storage-model.js?v=13';

export const KEY = 'everyday-fitness-v1';
export const templateExercises = {
  Upper: ['Machine Chest Press', 'Lat Pulldown', 'Seated Row', 'Shoulder Press', 'Cable Triceps Pushdown', 'Dumbbell Bicep Curl'],
  Lower: ['Leg Press', 'Leg Curl', 'Glute Kickback', 'Leg Extension', 'Calf Raise'],
  'Full body': ['Chest Press', 'Leg Press', 'Lat Pulldown', 'Leg Curl', 'Seated Row', 'Abdominal Crunch', 'Lateral Raise', 'Calf Extension']
};
export const emptyData = () => ({version: 1, settings: {calories: 1600, protein: 130, heightInches: 68, unit: 'lb', weekStart: 1}, foods: [], foodEntries: [], lifts: [], weights: [], promptDate: ''});
export const id = () => globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
export const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export const niceDate = s => new Date(`${s}T12:00:00`).toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'});
export const validDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T12:00:00`)) && localDate(new Date(`${s}T12:00:00`)) === s;
export const round = n => Math.round((Number(n) + Number.EPSILON) * 10) / 10;
export function bmi(weight, heightInches, unit='lb') { return heightInches > 0 ? round((unit === 'kg' ? weight * 2.2046226218 : weight) * 703 / heightInches ** 2) : null; }
export function dailyTotals(entries, date) { return entries.filter(x=>x.date===date).reduce((a,x)=>({calories:a.calories+x.calories*x.quantity, protein:a.protein+x.protein*x.quantity}),{calories:0,protein:0}); }
export const weekDays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
export function startOfWeek(date, weekStart=1) {
  const d=new Date(`${date}T12:00:00`);
  d.setDate(d.getDate()-(d.getDay()-weekStart+7)%7);
  return localDate(d);
}
export function endOfWeek(start) {
  const d=new Date(`${start}T12:00:00`);d.setDate(d.getDate()+6);return localDate(d);
}
export function weeklyWeights(weights, height, unit='lb', weekStart=1) {
  const groups = new Map();
  for (const w of weights) {
    const week = startOfWeek(w.date,weekStart);
    if (!groups.has(week)) groups.set(week, []);
    groups.get(week).push(w.value);
  }
  return [...groups].sort(([a],[b])=>b.localeCompare(a)).map(([week,values])=>({week, average:round(values.reduce((a,b)=>a+b,0)/values.length), bmi:bmi(values.reduce((a,b)=>a+b,0)/values.length,height,unit), count:values.length}));
}
export function shouldPrompt(data, now = new Date()) { return now.getHours() >= 6 && data.promptDate !== localDate(now) && !data.weights.some(w=>w.date===localDate(now)); }
export function parseCSV(raw) {
  const rows=[]; let row=[], value='', quote=false;
  for(let i=0;i<raw.length;i++) {
    const c=raw[i];
    if (c==='"') { if (quote && raw[i+1]==='"') { value+='"'; i++; } else quote=!quote; }
    else if(c===',' && !quote) { row.push(value); value=''; }
    else if((c==='\n'||c==='\r') && !quote) { if(c==='\r' && raw[i+1]==='\n') i++; row.push(value); if(row.some(v=>v.trim())) rows.push(row); row=[]; value=''; }
    else value+=c;
  }
  if(quote) throw new Error('CSV has an unclosed quote.');
  row.push(value); if(row.some(v=>v.trim())) rows.push(row);
  return rows;
}
export function parseFoodCSV(raw) {
  const rows=parseCSV(raw.replace(/^\uFEFF/,''));
  if(!rows.length) throw new Error('The CSV is empty.');
  const names=rows.shift().map(x=>x.trim().toLowerCase());
  for(const required of ['date','name','calories','protein']) if(!names.includes(required)) throw new Error(`Missing ${required} column.`);
  const errors=[], entries=[];
  rows.forEach((row,i)=>{
    const get=key => (row[names.indexOf(key)] || '').trim();
    const date=get('date'), name=get('name'), calories=Number(get('calories')), protein=Number(get('protein'));
    const quantity=names.includes('quantity') && get('quantity') ? Number(get('quantity')) : 1;
    if(!validDate(date)||!name||!get('calories')||!get('protein')||!Number.isFinite(calories)||calories<0||!Number.isFinite(protein)||protein<0||!Number.isFinite(quantity)||quantity<=0) errors.push(`Row ${i+2}: check date, name, calories, protein and quantity.`);
    else entries.push({id:id(),date,name,calories,protein,quantity});
  });
  return {entries,errors};
}
export function normalizeData(input) {
  input=decodeStoredData(input);
  if(!input || input.version!==1 || !Array.isArray(input.foods)||!Array.isArray(input.foodEntries)||!Array.isArray(input.lifts)||!Array.isArray(input.weights)||!input.settings || typeof input.settings!=='object') throw new Error('This is not an Everyday backup.');
  const data=emptyData();
  data.settings={...data.settings,...input.settings};
  if(![data.settings.calories,data.settings.protein,data.settings.heightInches].every(x=>Number.isFinite(Number(x)) && Number(x)>0) || !['lb','kg'].includes(data.settings.unit)) throw new Error('Backup settings are invalid.');
  if(!Number.isInteger(data.settings.weekStart)||data.settings.weekStart<0||data.settings.weekStart>6) throw new Error('Backup week start is invalid.');
  data.settings.calories=Number(data.settings.calories); data.settings.protein=Number(data.settings.protein); data.settings.heightInches=Number(data.settings.heightInches);
  for(const key of ['foods','foodEntries','lifts','weights']) {
    if(input[key].length>50000) throw new Error('Backup is too large.');
    data[key]=input[key];
  }
  for(const f of data.foods) if(typeof f.id!=='string'||typeof f.name!=='string'||!Number.isFinite(f.calories)||f.calories<0||!Number.isFinite(f.protein)||f.protein<0) throw new Error('Backup has an invalid saved food.');
  for(const e of data.foodEntries) if(typeof e.id!=='string'||!validDate(e.date)||typeof e.name!=='string'||!Number.isFinite(e.calories)||e.calories<0||!Number.isFinite(e.protein)||e.protein<0||!Number.isFinite(e.quantity)||e.quantity<=0) throw new Error('Backup has an invalid food entry.');
  for(const w of data.weights) if(typeof w.id!=='string'||!validDate(w.date)||!Number.isFinite(w.value)||w.value<=0) throw new Error('Backup has an invalid weigh-in.');
  for(const l of data.lifts) if(typeof l.id!=='string'||!validDate(l.date)||typeof l.exercise!=='string'||!Array.isArray(l.sets)||!l.sets.every(s=>Number.isFinite(s.weight)&&s.weight>=0&&Number.isInteger(s.reps)&&s.reps>0)) throw new Error('Backup has an invalid lift.');
  for(const l of data.lifts) if(l.difficulty!=null && (!Number.isFinite(l.difficulty)||l.difficulty<1||l.difficulty>10)) throw new Error('Backup has an invalid difficulty.');
  data.promptDate=validDate(input.promptDate)?input.promptDate:'';
  return data;
}
export function encodeData(data) { return encodeStoredData(normalizeData(structuredClone(data))); }
export function load() { try { const raw=localStorage.getItem(KEY); return raw?normalizeData(JSON.parse(raw)):emptyData(); } catch { return emptyData(); } }
export function save(data) { localStorage.setItem(KEY,JSON.stringify(encodeData(data))); }
