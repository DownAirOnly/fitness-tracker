import {prepareRoutineImport} from './routine-import-model.js?v=137';

const weekdays=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
export function createRoutineImportUI({getData,modal,esc,setPending}){
 let csv='',filename='Routine CSV',options={exerciseMatches:{},routineActions:{},applySchedule:false};
 const e=s=>esc(String(s??''));
 const normalizeName=s=>String(s||'').trim().replace(/\s+/g,' ').toLowerCase();
 function open(){
  csv='';filename='Routine CSV';options={exerciseMatches:{},routineActions:{},applySchedule:false};setPending(null);
  modal('Import routines','<form class="form routine-import-form" data-form="routine-import">'+
   '<p class="body-copy">Bring a workout-program CSV into Everyday. Review which exercises and routines already exist before changing anything. Your weights, history, machine settings and personal notes are protected.</p>'+
   '<label class="field"><span>Choose workout CSV</span><input type="file" name="file" accept=".csv,text/csv"></label>'+
   '<label class="field"><span>Or paste workout CSV</span><textarea name="text" rows="4" maxlength="300000" placeholder="recordType,workout,exercise,equipment,…"></textarea></label>'+
   '<button class="primary" type="submit">Review routine matches</button>'+
   '<p class="hint">Only exercise and workout rows are accepted here. Other Everyday imports remain separate.</p></form>');
 }
 const option=(value,label,selected)=>'<option value="'+e(value)+'"'+(selected?' selected':'')+'>'+e(label)+'</option>';
 function review(){
  let plan;
  try{plan=prepareRoutineImport(csv,getData(),options);}catch(error){
   plan={kind:'routine-csv',base:JSON.stringify(getData()),candidate:null,errors:[error.message],warnings:[],
    exercisePreview:[],routinePreview:[],schedulePreview:[],counts:{},changeCount:0};
  }
  setPending(plan);
  const current=getData(),defs=current.exerciseDefinitions||[],routines=current.workoutTemplates||[];
  const exerciseRows=plan.exercisePreview.map(row=>{
   const matched=defs.find(d=>d.id===row.matchId),choice=options.exerciseMatches[row.key]||'auto';
   const candidates=defs.filter(d=>d.equipment===row.equipment).sort((a,b)=>a.name.localeCompare(b.name));
   const status=row.action==='create'?'Will create':row.action==='enrich'?'Reuse + add missing training profile':'Reuse existing';
   const select='<select data-routine-match-exercise data-key="'+e(row.key)+'" aria-label="Match '+e(row.name)+'">'+
    option('auto',matched?'Automatically match '+matched.name:'Create a new exercise',choice==='auto')+
    (!matched?option('new','Create new exercise',choice==='new'):'')+
    candidates.filter(d=>d.id!==matched?.id).map(d=>option(d.id,'Use existing: '+d.name,choice===d.id)).join('')+
    '</select>';
   return '<div class="routine-import-match"><span><strong>'+e(row.name)+'</strong><small>'+e(row.equipment)+' · '+e(status)+
    (matched&&matched.name!==row.name?' → '+e(matched.name):'')+'</small></span>'+select+'</div>';
  }).join('');
  const routineRows=plan.routinePreview.map(row=>{
   const exact=routines.find(w=>w.id===row.existingId);
   const selected=options.routineActions[row.key]||(exact?'keep':'create');
   const select='<select data-routine-match-workout data-key="'+e(row.key)+'" aria-label="Import '+e(row.sourceName)+'">'+
    (exact?option('keep','Keep existing unchanged',selected==='keep')+
     option('update','Update existing exercises (keep ID/color)',selected==='update')+
     option('copy','Create separate copy',selected==='copy'):
     option('create','Create new routine',selected==='create'))+
    routines.filter(w=>w.id!==exact?.id).map(w=>option('update:'+w.id,'Update existing '+w.name,selected==='update:'+w.id)).join('')+
    '</select>';
   return '<div class="routine-import-match"><span><strong>'+e(row.sourceName)+'</strong><small>'+
    (exact?'Already in library · ':'Not in library · ')+row.incomingCount+' exercises · '+e(row.action)+
    '</small></span>'+select+'</div>';
  }).join('');
  const summary=plan.counts||{},schedule=plan.schedulePreview||[];
  const warnings=plan.warnings?.length?'<div class="import-alert import-needs-review" role="status"><strong>Review these details</strong><ul>'+
   plan.warnings.map(w=>'<li>'+e(w)+'</li>').join('')+'</ul></div>':'';
  const errors=plan.errors?.length?'<div class="import-alert" role="alert"><strong>Cannot import until fixed</strong><ul>'+
   plan.errors.map(w=>'<li>'+e(w)+'</li>').join('')+'</ul></div>':'';
  const scheduleText=schedule.length?schedule.map(x=>weekdays[x.day]+' · '+x.name).join(' | '):'No weekdays supplied';
  const scheduleChoice=schedule.length?'<label class="routine-import-schedule"><input type="checkbox" data-routine-import-schedule'+
   (options.applySchedule?' checked':'')+'><span><strong>Apply imported workout days</strong><small>'+e(scheduleText)+
   '</small><small>Off by default. When enabled, only those weekdays change; other scheduled days stay as they are.</small></span></label>':'';
  modal('Review routine import','<div class="routine-import-review"><p class="import-filename">'+e(filename)+'</p>'+
   '<div class="routine-import-summary"><strong>'+e(plan.changeCount)+' proposed changes</strong><span>'+
    e(summary.reusedExercises||0)+' existing exercises recognized · '+e(summary.createdExercises||0)+' new exercises · '+
    e(summary.createdRoutines||0)+' new routines · '+e(summary.updatedRoutines||0)+' updated routines</span></div>'+
   '<p class="hint">Exercise IDs, existing machine setup, personal notes, all logged sets and workout history are kept. Imported coaching notes apply only to newly created exercises; existing exercise profiles gain missing metadata only.</p>'+
   warnings+errors+
   '<div class="routine-import-scroll" tabindex="0">'+
    '<details open><summary>Routines · '+plan.routinePreview.length+'</summary><div class="routine-import-match-list">'+routineRows+'</div></details>'+
    '<details><summary>Exercise matching · '+plan.exercisePreview.length+'</summary><p class="hint">Matches are based on exercise name and equipment. Choose an existing exercise manually for differently named variations; different equipment types are intentionally kept separate.</p><div class="routine-import-match-list">'+exerciseRows+'</div></details>'+
    scheduleChoice+
   '</div><div class="routine-import-footer"><p class="hint">Import only applies after confirmation. No historical lifts or saved workouts are removed.</p>'+
   '<div class="form-actions">'+(plan.candidate&&plan.changeCount>0?'<button type="button" class="primary" data-action="commit-import">Confirm workout import</button>':'<span class="hint">No changes to apply with these choices.</span>')+
    '<button type="button" class="outline" data-action="routine-import-open">Choose another file</button>'+
    '<button type="button" class="outline" data-action="close">Cancel</button></div></div></div>');
 }
 async function onSubmit(form){
  const upload=form.elements.file.files?.[0];
  try{
   if(upload){
    if(upload.size>300000)throw Error('Routine file is too large (300 KB limit).');
    csv=await upload.text();filename=upload.name;
   }else{
    csv=form.elements.text.value.trim();filename='Pasted workout CSV';
    if(!csv)throw Error('Choose a CSV file or paste a workout CSV.');
   }
   options={exerciseMatches:{},routineActions:{},applySchedule:false};
   review();
  }catch(error){alert(error.message);}
 }
 function onChange(target){
  if(!target.matches('[data-routine-match-exercise],[data-routine-match-workout],[data-routine-import-schedule]'))return false;
  const scroll=document.querySelector('.routine-import-scroll')?.scrollTop||0;
  if(target.matches('[data-routine-match-exercise]')){
   if(target.value==='auto')delete options.exerciseMatches[target.dataset.key];
   else options.exerciseMatches[target.dataset.key]=target.value;
  }else if(target.matches('[data-routine-match-workout]')){
   options.routineActions[target.dataset.key]=target.value;
  }else options.applySchedule=target.checked;
  review();
  const next=document.querySelector('.routine-import-scroll');if(next)next.scrollTop=scroll;
  return true;
 }
 return {open,onSubmit,onChange};
}
