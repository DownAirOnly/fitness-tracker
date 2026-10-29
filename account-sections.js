// v98.1 — independent, complete sections of a single Everyday notebook.
// All shared transforms validate via normal notebook schemas; never copy one
// section's fields into another. Web and iOS use the same versioned contract.
import {normalizeData,encodeData,emptyData} from './data.js?v=98';

export const ACCOUNT_SECTIONS=['nutrition','lifting','finances'];
export const SECTION_KEYS={
 nutrition:['settings','foods','foodEntries','weights','bodyFat','promptDate'],
 lifting:['weightUnit','exerciseDefinitions','workoutTemplates','lifts','activeWorkout','workoutHistory'],
 finances:['transactions','classificationRules','budgetPlan']
};
export const SECTION_FORMAT='everyday-section-v1';
const hasOwn=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
export function sectionData(data,section){
 if(!ACCOUNT_SECTIONS.includes(section))throw Error('Unknown Everyday section.');
 const source=encodeData(normalizeData(data)); // versioned compact backup is the source of truth.
 // Decode to canonical structure; preserves workout references and verified metadata.
 const canonical=normalizeData(source);
 return Object.fromEntries(SECTION_KEYS[section].map(k=>[k,k==='weightUnit'?canonical.settings.unit:structuredClone(canonical[k])]));
}
export function exportSection(data,section){
 return{format:SECTION_FORMAT,section,data:sectionData(data,section)};
}
export function applySection(data,file){
 if(!file||typeof file!=='object'||Array.isArray(file)||
  file.format!==SECTION_FORMAT||!ACCOUNT_SECTIONS.includes(file.section)||
  !file.data||typeof file.data!=='object'||Array.isArray(file.data))
  throw Error('This is not a supported Everyday section JSON file.');
 const keys=SECTION_KEYS[file.section],incoming=file.data;
 for(const key of keys)if(!hasOwn(incoming,key))throw Error('Missing required '+file.section+' field: '+key+'.');
 for(const key of Object.keys(incoming))if(!keys.includes(key))throw Error('Unexpected '+file.section+' field: '+key+'.');
 const candidate=structuredClone(normalizeData(data));
 if(file.section==='lifting'&&incoming.weightUnit!==candidate.settings.unit)
  throw Error('Lifting weight unit differs from Nutrition settings. Convert the unit or import matching Nutrition and Lifting files together.');
 if(file.section==='nutrition'&&incoming.settings?.unit!==candidate.settings.unit&&
    (candidate.lifts.length||candidate.workoutHistory.length||candidate.activeWorkout))
  throw Error('Nutrition weight unit differs from existing Lifting logs. Import matching Lifting JSON at the same time, or convert units before import.');
 for(const key of keys)if(key!=='weightUnit')candidate[key]=structuredClone(incoming[key]);
 return normalizeData(candidate);
}
export function mergeSections(files){
 const found=new Map();
 for(const file of files){
  if(!file||!ACCOUNT_SECTIONS.includes(file.section)||found.has(file.section))
   throw Error('Each Everyday section must appear exactly once.');
  found.set(file.section,file);
 }
 if(found.size!==3)throw Error('A complete account requires Nutrition, Lifting and Finances.');
 let result=emptyData();
 for(const section of ACCOUNT_SECTIONS)result=applySection(result,found.get(section));
 return normalizeData(result);
}
export function sectionPayloads(data){
 const canonical=normalizeData(data),out={};
 for(const section of ACCOUNT_SECTIONS)out[section]=JSON.stringify(exportSection(canonical,section));
 return out;
}
export function readSectionPayloads(payloads){
 return mergeSections(ACCOUNT_SECTIONS.map(section=>{
  if(typeof payloads?.[section]!=='string')throw Error('Missing account section: '+section);
  return JSON.parse(payloads[section]);
 }));
}
