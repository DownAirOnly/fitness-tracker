/* Detailed, original, locally rendered muscle guide. Not a medical/anatomical atlas.
   Muscle groups are reference metadata, not derived from user records. */
const labels={
 chest:'Chest / pectorals',delts:'Shoulders / deltoids',triceps:'Triceps',
 biceps:'Biceps',forearms:'Forearms',lats:'Latissimus dorsi',upperBack:'Upper back / rhomboids',
 traps:'Trapezius',abs:'Abdominals',obliques:'Obliques',lowerBack:'Lower back',
 glutes:'Glutes',quads:'Quadriceps',adductors:'Hip adductors',hamstrings:'Hamstrings',calves:'Calves'
};
const exercises={
 'chest press':{primary:['chest'],secondary:['triceps','delts']},
 'lat pulldown':{primary:['lats'],secondary:['biceps','upperBack']},
 'seated row':{primary:['upperBack','lats'],secondary:['biceps','delts']},
 'shoulder press':{primary:['delts'],secondary:['triceps','traps']},
 'triceps pushdown':{primary:['triceps'],secondary:['forearms']},
 'bicep curl':{primary:['biceps'],secondary:['forearms']},
 'seated leg press':{primary:['quads','glutes'],secondary:['hamstrings','adductors','calves']},
 'leg press':{primary:['quads','glutes'],secondary:['hamstrings','adductors','calves']},
 'leg curl':{primary:['hamstrings'],secondary:['calves']},
 'glute kickback':{primary:['glutes'],secondary:['hamstrings']},
 'leg extension':{primary:['quads'],secondary:[]},
 'hip abduction':{primary:['glutes'],secondary:[]},
 'hip adduction':{primary:['adductors'],secondary:[]},
 'adductor machine':{primary:['adductors'],secondary:[]},
 'calf extension':{primary:['calves'],secondary:[]},
 'calf raise':{primary:['calves'],secondary:[]},
 'torso rotation':{primary:['obliques'],secondary:['abs']},
 'abdominal crunch':{primary:['abs'],secondary:['obliques']},
 'lateral raise':{primary:['delts'],secondary:['traps']},
 'dumbbell lateral raise':{primary:['delts'],secondary:['traps']},
 'tricep extension':{primary:['triceps'],secondary:[]},
 'deadlift':{primary:['glutes','hamstrings','lowerBack'],secondary:['traps','upperBack','forearms']},
 'squat':{primary:['quads','glutes'],secondary:['hamstrings','adductors','abs']},
 'push up':{primary:['chest'],secondary:['triceps','delts']},
 'pushup':{primary:['chest'],secondary:['triceps','delts']},
 'pull up':{primary:['lats'],secondary:['biceps','upperBack']},
 'pullup':{primary:['lats'],secondary:['biceps','upperBack']},
 'plank':{primary:['abs'],secondary:['obliques','delts']}
};
export function exerciseMuscleProfile(name){
 const key=String(name||'').toLowerCase().replace(/^(machine|cable|dumbbell|db)\s+/,'').replace(/[^a-z0-9]+/g,' ').trim();
 const found=exercises[key];
 return found?{primary:[...found.primary],secondary:[...found.secondary]}:null;
}
// Natural baseline from the approved Anatomy Lab: curved head/neck, original balanced torso and legs.
const silhouette='<path d="M90 5 C100 5 105 12 105 22 C105 32 100 40 90 40 C80 40 75 32 75 22 C75 12 80 5 90 5 Z"/><path d="M83 38 Q90 41 97 38 L100 52 Q90 56 80 52 Z"/>'+
 '<path d="M70 49 Q58 51 54 67 L65 104 70 147 63 166 Q90 183 117 166 L110 147 115 104 126 67 Q122 51 110 49 Z"/>'+
 '<path d="M56 57 Q43 57 40 75 L27 145 Q24 154 34 158 L43 151 60 98 66 72 Z"/>'+
 '<path d="M124 57 Q137 57 140 75 L153 145 Q156 154 146 158 L137 151 120 98 114 72 Z"/>'+
 '<path d="M65 162 Q89 170 115 162 L116 179 109 241 105 303 Q102 316 90 315 L89 289 92 240 90 190 88 240 91 289 90 315 Q78 316 75 303 L71 241 64 179 Z"/>';
const front={
 chest:'<path d="M65 72 Q73 64 87 69 Q89 72 88 78 L87 94 Q76 103 65 91 L63 83 Z M93 69 Q107 64 115 72 L117 83 115 91 Q104 103 93 94 L92 78 Z"/><path d="M67 82 Q78 88 87 82 M93 82 Q103 88 113 82" fill="none" stroke-width=".75"/>',
 delts:'<ellipse cx="58" cy="67" rx="9" ry="14" transform="rotate(18 58 67)"/><ellipse cx="122" cy="67" rx="9" ry="14" transform="rotate(-18 122 67)"/>',
 biceps:'<ellipse cx="50" cy="103" rx="7" ry="18" transform="rotate(13 50 103)"/><ellipse cx="130" cy="103" rx="7" ry="18" transform="rotate(-13 130 103)"/>',
 forearms:'<path d="M40 119 Q48 119 47 132 L40 151 Q32 153 32 146 Z M140 119 Q132 119 133 132 L140 151 Q148 153 148 146 Z"/>',
 abs:'<path d="M78 103 Q84 101 88 104 L88 114 78 115 Z M92 104 Q98 101 102 103 L102 115 92 114 Z M78 118 L88 117 88 127 79 130 Z M92 117 L102 118 101 130 92 127 Z M80 133 L88 131 88 141 83 143 Z M92 131 L100 133 97 143 92 141 Z"/>',
 obliques:'<path d="M70 104 L77 104 77 140 70 148 66 138 Z M110 104 L103 104 103 140 110 148 114 138 Z"/>',
 quads:'<path d="M65 180 Q73 177 78 181 L77 219 71 235 67 221 Z M79 180 Q85 178 88 184 L86 230 79 245 75 232 Z M92 184 Q95 178 101 180 L105 232 98 245 94 230 Z M102 181 Q107 177 115 180 L113 221 109 235 103 219 Z"/>',
 adductors:'<path d="M88 183 Q89 193 87 206 L84 226 89 239 90 240 94 226 93 204 92 183 Z"/>',
 calves:'<path d="M73 249 Q79 247 85 252 L83 266 79 277 76 271 Z M95 252 Q101 247 107 249 L104 271 100 277 97 266 Z M75 279 L82 280 80 299 77 302 Z M98 280 L105 279 103 302 100 299 Z"/>'
};
const rear={
 traps:'<path d="M82 49 L98 49 114 73 103 83 90 69 77 83 66 73 Z"/>',
 delts:'<ellipse cx="59" cy="67" rx="9" ry="14" transform="rotate(18 59 67)"/><ellipse cx="121" cy="67" rx="9" ry="14" transform="rotate(-18 121 67)"/>',
 upperBack:'<path d="M78 75 L89 81 88 111 78 104 72 90 Z M102 75 L91 81 92 111 102 104 108 90 Z M82 111 L90 116 98 111 93 123 87 123 Z"/>',
 lats:'<path d="M65 85 Q73 89 77 105 L83 122 88 133 88 151 74 139 Q64 116 63 100 Z M115 85 Q107 89 103 105 L97 122 92 133 92 151 106 139 Q116 116 117 100 Z"/>',
 triceps:'<ellipse cx="49" cy="102" rx="7" ry="19" transform="rotate(14 49 102)"/><ellipse cx="131" cy="102" rx="7" ry="19" transform="rotate(-14 131 102)"/>',
 forearms:'<path d="M40 120 L47 121 42 150 33 151 Z M140 120 L133 121 138 150 147 151 Z"/>',
 lowerBack:'<path d="M79 128 L101 128 106 154 90 162 74 154 Z"/>',
 glutes:'<path d="M64 163 C68 158 78 157 85 160 Q90 165 88 174 C85 186 79 190 72 187 C66 184 63 173 64 163 Z M95 160 C102 157 112 158 116 163 C117 173 114 184 108 187 C101 190 95 186 92 174 Q90 165 95 160 Z"/>',
 hamstrings:'<path d="M67 187 Q75 185 80 190 L78 225 73 245 68 234 Z M81 189 L87 186 86 223 81 245 77 237 Z M93 186 L99 189 103 237 99 245 94 223 Z M100 190 Q105 185 113 187 L112 234 107 245 102 225 Z"/>',
 calves:'<path d="M73 249 Q80 244 85 251 L84 270 78 288 72 279 Z M95 251 Q100 244 107 249 L108 279 102 288 96 270 Z M77 285 L84 276 82 295 79 301 Z M96 276 L103 285 101 301 98 295 Z"/>'
};
// A unique gradient namespace prevents repeated Buddy/exercise thumbnails from sharing SVG IDs.
let anatomySvgSequence=0;
const contours={
 front:'M90 54V144 M66 91Q77 101 88 95 M92 95Q104 101 115 91 M70 102Q75 121 71 144 M110 102Q105 121 109 144 M90 100V143 M79 116H87 M93 116H102 M79 130H87 M93 130H102 M68 184Q80 208 75 238 M112 184Q100 208 105 238 M78 252Q83 271 80 287 M102 252Q97 271 100 287',
 back:'M90 54V157 M68 73Q79 88 88 89 M112 73Q101 88 92 89 M74 108Q79 126 87 131 M106 108Q101 126 93 131 M75 154Q90 164 105 154 M90 163V183 M74 190Q83 213 78 242 M106 190Q97 213 102 242 M79 249Q84 269 80 288 M101 249Q96 269 100 288'
};
function bodySvg(view,profile){
 const muscles=view==='front'?front:rear;
 const uid='anatomy-'+(++anatomySvgSequence);
 const gradients='<defs>'+
  '<linearGradient id="'+uid+'-warm" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffd1a0"/><stop offset=".55" stop-color="#ff8a56"/><stop offset="1" stop-color="#e65e38"/></linearGradient>'+
  '<linearGradient id="'+uid+'-cool" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#c3f4ff"/><stop offset=".6" stop-color="#4ed9fd"/><stop offset="1" stop-color="#168bb9"/></linearGradient>'+
  '</defs>';
 const regions=Object.entries(muscles).map(([id,markup])=>{
  const type=profile?.primary.includes(id)?'primary':profile?.secondary.includes(id)?'secondary':'quiet';
  const paint=type==='primary'?' style="fill:url(#'+uid+'-warm)"':type==='secondary'?' style="fill:url(#'+uid+'-cool)"':'';
  return '<g class="muscle-region '+type+'" data-muscle="'+id+'"'+paint+'><title>'+labels[id]+'</title>'+markup+'</g>';
 }).join('');
 return '<svg class="muscle-body" viewBox="0 0 180 330" role="img" aria-label="'+(view==='front'?'Front':'Back')+' muscle diagram">'+
  gradients+'<g class="muscle-silhouette">'+silhouette+'</g>'+regions+
  '<path class="muscle-contours" d="'+contours[view]+'" aria-hidden="true"/>'+
  '</svg>';
}
export function muscleMiniMarkup(name){
 const profile=exerciseMuscleProfile(name);
 return '<span class="muscle-mini-pair" aria-hidden="true"><span class="muscle-mini-view">'+bodySvg('front',profile)+'</span><span class="muscle-mini-view">'+bodySvg('back',profile)+'</span></span>';
}
const muscleInfo={"chest":["Chest muscles move the upper arm forward and across the body.","Chest presses, push-ups and fly movements."],"delts":["Deltoids help lift and position the upper arm in multiple directions.","Shoulder presses and lateral raises."],"triceps":["Triceps extend the elbow and support pressing movements.","Pushdowns, extensions and presses."],"biceps":["Biceps assist elbow flexion and turning the forearm palm-up.","Curls, pulldowns and chin-up variations."],"forearms":["Forearm muscles move the wrist and contribute to gripping and forearm rotation.","Gripping weights, curls and rows."],"lats":["The latissimus dorsi pulls the upper arm down and toward the torso.","Lat pulldowns, pull-ups and rows."],"upperBack":["Upper-back muscles retract and stabilize the shoulder blades.","Rows and reverse fly movements."],"traps":["The trapezius helps position and stabilize the shoulder blades.","Shrugs, overhead work and rows."],"abs":["Abdominals help flex and stabilize the trunk.","Crunches, planks and bracing."],"obliques":["Obliques rotate and stabilize the torso.","Rotations, side planks and anti-rotation exercises."],"lowerBack":["Spinal extensor muscles help maintain and extend the torso.","Deadlifts, hinges and back extensions."],"glutes":["Gluteal muscles extend and stabilize the hip; some fibers help abduct it.","Squats, leg presses, kickbacks and hip abduction."],"adductors":["The hip adductors draw the thigh inward and help stabilize the hips.","Hip adduction and some squatting movements."],"quads":["Quadriceps extend the knee, with one part assisting hip flexion.","Leg extensions, squats and leg presses."],"hamstrings":["Hamstrings bend the knee and assist hip extension.","Leg curls, deadlifts and hip hinges."],"calves":["Calf muscles help push the foot downward at the ankle.","Seated and standing calf raises."]};
export const muscleGroupLabel=id=>labels[id]||'Muscle group';
export function muscleGroupDetailsMarkup(id,related=[]){
 const info=muscleInfo[id],escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 if(!info)return '<p class="muscle-unmapped">No reference information is available for this group.</p>';
 return '<div class="muscle-info"><p>'+escape(info[0])+'</p><div><h3>Common movements</h3><p>'+escape(info[1])+'</p></div><div><h3>Exercises in your library</h3>'+
 (related.length?'<div class="muscle-related-list">'+related.map(e=>'<button type="button" data-action="muscle-related-exercise" data-name="'+escape(e.name)+'" data-equipment="'+escape(e.equipment||'other')+'"><span><strong>'+escape(e.name)+'</strong><small>'+(e.role==='primary'?'Primary muscle':'Supporting muscle')+'</small></span><b>›</b></button>').join('')+'</div>':'<p class="muscle-info-empty">No mapped exercises for this group in your Exercise Library.</p>')+
 '</div><p class="muscle-disclaimer">Muscle involvement varies with exercise variation, equipment and technique.</p></div>';
}
export function muscleGuideMarkup(name){
 const profile=exerciseMuscleProfile(name),escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const pills=ids=>ids.map(x=>'<button type="button" class="muscle-name" data-action="muscle-group-detail" data-group="'+escape(x)+'" data-exercise="'+escape(name)+'" aria-label="Read about '+escape(labels[x]||x)+'">'+escape(labels[x]||x)+' <span aria-hidden="true">›</span></button>').join('');
 return '<div class="muscle-guide"><div class="muscle-figures"><div class="muscle-figure"><span>FRONT</span>'+bodySvg('front',profile)+'</div><div class="muscle-figure"><span>BACK</span>'+bodySvg('rear',profile)+'</div></div>'+
 (profile?'<div class="muscle-legend"><div><i class="muscle-dot muscle-primary"></i><strong>Primary</strong><div class="muscle-names">'+pills(profile.primary)+'</div></div>'+
 (profile.secondary.length?'<div><i class="muscle-dot muscle-secondary"></i><strong>Secondary</strong><div class="muscle-names">'+pills(profile.secondary)+'</div></div>':'')+'</div>':'<p class="muscle-unmapped">No muscle-group mapping exists for this exercise yet. Nothing is highlighted rather than assuming which muscles it trains.</p>')+
 '<p class="muscle-disclaimer">Simplified reference diagram. Actual muscle involvement depends on exercise variation, technique, and equipment.</p></div>';
}

/** Two-day training-load indicator, not a clinical muscle fatigue assessment.
 * red = trained today; yellow = trained previous calendar day.
 * Uses the same anatomical paths as the regular Exercise muscle guide.
 */
function recoveryBodySvg(view,statuses){
 const muscles=view==='front'?front:rear,uid='recovery-'+(++anatomySvgSequence);
 const regions=Object.entries(muscles).map(([id,shape])=>{
  const state=statuses[id]==='today'?'recent-today':statuses[id]==='yesterday'?'recent-yesterday':'quiet';
  const color=state==='recent-today'?'#f16c68':state==='recent-yesterday'?'#f0ca53':'#638a81';
  return '<g class="muscle-region '+state+'" data-muscle="'+id+'" style="fill:'+color+'"><title>'+
   labels[id]+': '+(state==='recent-today'?'trained today':state==='recent-yesterday'?'trained yesterday':'no workout in last two days')+
   '</title>'+shape+'</g>';
 }).join('');
 return '<svg class="muscle-body" viewBox="0 0 180 330" role="img" aria-label="'+
   (view==='front'?'Front':'Back')+' muscles: red today, yellow yesterday">'+
   '<g class="muscle-silhouette">'+silhouette+'</g>'+regions+
   '<path class="muscle-contours" d="'+contours[view]+'" aria-hidden="true"/></svg>';
}
export function muscleRecoveryMarkup(statuses={}){
 return '<div class="muscle-recovery-pair">'+
  '<span class="muscle-recovery-view">'+recoveryBodySvg('front',statuses)+'</span>'+
  '<span class="muscle-recovery-view">'+recoveryBodySvg('back',statuses)+'</span></div>';
}

/** Exercise-only anatomy using the same front/back sizing structure as Home.
 * Unlike recovery, this uses the warm/cool/quiet SVG already used by Buddy.
 * Unmapped muscles are still rendered, never removed. */
export function muscleExercisePairMarkup(name){
 const profile=exerciseMuscleProfile(name);
 return '<div class="muscle-recovery-pair muscle-exercise-pair">'+
  '<span class="muscle-recovery-view">'+bodySvg('front',profile)+'</span>'+
  '<span class="muscle-recovery-view">'+bodySvg('back',profile)+'</span></div>';
}

/* A workload-colored view of the same 16 anatomical regions. Distinct from
   the warm/cool primary/secondary mapping and two-day recovery markers. */
const setColor=(value)=>value<=0?'#344e60':value<4?'#39729d':value<8?'#278fb9':value<12?'#25b9da':'#6fe0ed';
function setLevelSvg(view,counts){
 const groups=view==='front'?front:rear,side=view==='front'?'Front':'Back';
 const regions=Object.entries(groups).map(([id,path])=>{
  const item=counts?.[id]||{},n=Number(item.effective)||0;
  return '<g class="muscle-region muscle-level-region" data-muscle="'+id+'" style="--load-color:'+setColor(n)+'"><title>'+labels[id]+': '+n.toFixed(1)+' equivalent sets</title>'+path+'</g>';
 }).join('');
 return '<svg class="muscle-body muscle-level-body" viewBox="0 0 180 330" role="img" aria-label="'+side+' muscle workload illustration"><g class="muscle-silhouette">'+silhouette+'</g>'+regions+
  '<path class="muscle-contours" d="'+contours[view]+'" aria-hidden="true"/></svg>';
}
const effective=(load,id)=>Number(load?.[id]?.effective)||0;
const levelPair=(load,label)=>'<div class="muscle-level-map"><div class="muscle-level-map-title">'+label+'</div><div class="muscle-level-figures">'+
 '<div><span>FRONT</span>'+setLevelSvg('front',load)+'</div><div><span>BACK</span>'+setLevelSvg('rear',load)+'</div></div></div>';
export function muscleSetLevelsMarkup(done={},planned=null,{title='Set levels',subtitle='',showAll=false}={}){
 const hasPlan=planned&&Object.values(planned).some(x=>Number(x.effective)>0);
 const hasDone=Object.values(done).some(x=>Number(x.effective)>0);
 const ids=Object.keys(labels).filter(id=>showAll||effective(done,id)>0||effective(planned,id)>0)
   .sort((a,b)=>Math.max(effective(done,b),effective(planned,b))-Math.max(effective(done,a),effective(planned,a))||labels[a].localeCompare(labels[b]));
 const fmt=n=>Number(n||0).toLocaleString('en-US',{maximumFractionDigits:1});
 const max=Math.max(12,...ids.map(id=>effective(done,id)),...ids.map(id=>effective(planned,id)));
 const items=ids.map(id=>{
  const d=done[id]||{},p=planned?.[id]||{},val=effective(done,id),goal=effective(planned,id);
  return '<div class="muscle-level-item"><div class="muscle-level-row"><strong>'+labels[id]+'</strong><span>'+fmt(val)+(hasPlan?' / '+fmt(goal):'')+' sets</span></div>'+
   '<div class="muscle-level-meter"><i style="width:'+Math.min(100,val/(hasPlan?Math.max(1,goal):max)*100)+'%;background:'+setColor(val)+'"></i></div>'+
   '<small>'+fmt(d.direct)+' direct · '+fmt(d.supporting)+' supporting'+(hasPlan?' · '+fmt(p.direct)+' direct planned':'')+'</small></div>';
 }).join('');
 return '<section class="muscle-levels"><h3>'+title+'</h3>'+
  (subtitle?'<p class="muscle-level-subtitle">'+subtitle+'</p>':'')+
  '<div class="muscle-level-overview">'+levelPair(hasDone?done:planned||{},hasDone?'Completed workload':'Planned workload')+
  (hasDone&&hasPlan?'<details class="muscle-level-planned"><summary>View planned muscle map</summary>'+levelPair(planned,'Planned workload')+'</details>':'')+'</div>'+
  '<div class="muscle-level-scale"><span>0</span><span>1–3</span><span>4–7</span><span>8–11</span><span>12+</span></div>'+
  '<div class="muscle-level-items">'+(items||'<p class="muscle-level-subtitle">No mapped sets in this period yet.</p>')+'</div>'+
  '<p class="muscle-level-note">Approximate set exposure, not a recovery or growth score. Each completed primary-muscle set counts as 1; supporting involvement counts as 0.5. Planned sets do not count as completed.</p></section>';
}
