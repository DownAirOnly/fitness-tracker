/* Original v122 anatomy geometry with separate read-only set-level overlays.
   Not a medical/anatomical atlas.
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
  'shoulder press':{primary:['delts'],secondary:['triceps']},
  'triceps pushdown':{primary:['triceps'],secondary:[]},
  'bicep curl':{primary:['biceps'],secondary:[]},
  'seated leg press':{primary:['quads','glutes'],secondary:[]},
  'leg press':{primary:['quads','glutes'],secondary:[]},
  'leg curl':{primary:['hamstrings'],secondary:[]},
  'glute kickback':{primary:['glutes'],secondary:[]},
 'leg extension':{primary:['quads'],secondary:[]},
 'hip abduction':{primary:['glutes'],secondary:[]},
 'hip adduction':{primary:['adductors'],secondary:[]},
 'adductor machine':{primary:['adductors'],secondary:[]},
 'calf extension':{primary:['calves'],secondary:[]},
 'calf raise':{primary:['calves'],secondary:[]},
  'torso rotation':{primary:['obliques'],secondary:[]},
  'abdominal crunch':{primary:['abs'],secondary:[]},
  'lateral raise':{primary:['delts'],secondary:[]},
  'dumbbell lateral raise':{primary:['delts'],secondary:[]},
 'tricep extension':{primary:['triceps'],secondary:[]},
  'deadlift':{primary:['glutes','hamstrings'],secondary:['lowerBack','traps','upperBack']},
  'squat':{primary:['quads','glutes'],secondary:['adductors']},
 'push up':{primary:['chest'],secondary:['triceps','delts']},
 'pushup':{primary:['chest'],secondary:['triceps','delts']},
 'pull up':{primary:['lats'],secondary:['biceps','upperBack']},
 'pullup':{primary:['lats'],secondary:['biceps','upperBack']},
  'plank':{primary:['abs'],secondary:['obliques']}
};
// Normalize only well-known naming variants. Unknown custom exercises remain
// unmapped instead of silently receiving an arbitrary muscle attribution.
const nameAliases={
 'row':'seated row','machine row':'seated row','seated cable row':'seated row',
 'seated lat pulldown':'lat pulldown','lat pull down':'lat pulldown',
 'shoulder press machine':'shoulder press','machine overhead press':'shoulder press',
 'biceps curl':'bicep curl','curl':'bicep curl',
 'tricep pushdown':'triceps pushdown','triceps push down':'triceps pushdown',
 'triceps extension':'tricep extension','overhead triceps extension':'tricep extension',
 'lying leg curl':'leg curl','seated leg curl':'leg curl','hamstring curl':'leg curl',
 'abdominal machine':'abdominal crunch','ab crunch':'abdominal crunch',
 'seated calf raise':'calf raise','standing calf raise':'calf raise',
 'glute press':'glute kickback','hip abduction machine':'hip abduction',
 'hip adduction machine':'hip adduction'
};
export function exerciseMuscleProfile(name){
 const key=String(name||'').toLowerCase().replace(/^(machine|cable|dumbbell|db)\s+/,'').replace(/[^a-z0-9]+/g,' ').trim();
 const found=exercises[nameAliases[key]||key];
 return found?{primary:[...found.primary],secondary:[...found.secondary]}:null;
}
// Natural baseline from the approved Anatomy Lab: curved head/neck, original balanced torso and legs.
const silhouette='<path d="M90 5 C100 5 105 12 105 22 C105 32 100 40 90 40 C80 40 75 32 75 22 C75 12 80 5 90 5 Z"/><path d="M83 38 Q90 41 97 38 L100 52 Q90 56 80 52 Z"/>'+
 '<path d="M70 49 Q58 51 54 67 L65 104 70 147 63 166 Q90 183 117 166 L110 147 115 104 126 67 Q122 51 110 49 Z"/>'+
 '<path d="M56 57 Q43 57 40 75 L27 145 Q24 154 34 158 L43 151 60 98 66 72 Z"/>'+
 '<path d="M124 57 Q137 57 140 75 L153 145 Q156 154 146 158 L137 151 120 98 114 72 Z"/>'+
 '<path d="M65 162 Q89 170 115 162 L116 179 109 241 105 303 Q102 316 90 315 L89 289 92 240 90 190 88 240 91 289 90 315 Q78 316 75 303 L71 241 64 179 Z"/>';
const front={
 chest:'<path d="M67 73 Q75 65 88 70 L88 91 Q77 100 65 88 Z M92 70 Q105 65 113 73 L115 88 Q103 100 92 91 Z"/>',
 delts:'<ellipse cx="58" cy="67" rx="9" ry="14" transform="rotate(18 58 67)"/><ellipse cx="122" cy="67" rx="9" ry="14" transform="rotate(-18 122 67)"/>',
 biceps:'<ellipse cx="50" cy="103" rx="7" ry="18" transform="rotate(13 50 103)"/><ellipse cx="130" cy="103" rx="7" ry="18" transform="rotate(-13 130 103)"/>',
 forearms:'<path d="M40 119 Q48 119 47 132 L40 151 Q32 153 32 146 Z M140 119 Q132 119 133 132 L140 151 Q148 153 148 146 Z"/>',
 abs:'<path d="M77 103 L103 103 103 141 Q90 148 77 141 Z"/>',
 obliques:'<path d="M70 104 L77 104 77 140 70 148 66 138 Z M110 104 L103 104 103 140 110 148 114 138 Z"/>',
 quads:'<path d="M66 180 Q78 174 88 181 L85 238 76 251 70 239 Z M92 181 Q102 174 114 180 L110 239 101 251 95 238 Z"/>',
 calves:'<path d="M74 250 L86 251 84 291 77 301 73 291 Z M94 251 L106 250 107 291 103 301 96 291 Z"/>'
};
const rear={
 traps:'<path d="M82 49 L98 49 114 73 103 83 90 69 77 83 66 73 Z"/>',
 delts:'<ellipse cx="59" cy="67" rx="9" ry="14" transform="rotate(18 59 67)"/><ellipse cx="121" cy="67" rx="9" ry="14" transform="rotate(-18 121 67)"/>',
 upperBack:'<path d="M79 79 L101 79 105 109 90 120 75 109 Z"/>',
 lats:'<path d="M67 83 L76 91 77 114 88 125 88 148 74 138 65 105 Z M113 83 L104 91 103 114 92 125 92 148 106 138 115 105 Z"/>',
 triceps:'<ellipse cx="49" cy="102" rx="7" ry="19" transform="rotate(14 49 102)"/><ellipse cx="131" cy="102" rx="7" ry="19" transform="rotate(-14 131 102)"/>',
 forearms:'<path d="M40 120 L47 121 42 150 33 151 Z M140 120 L133 121 138 150 147 151 Z"/>',
 lowerBack:'<path d="M79 128 L101 128 106 154 90 162 74 154 Z"/>',
 glutes:'<path d="M65 164 C69 158 77 156 84 160 Q88 164 88 172 C87 179 83 186 76 186 C68 185 65 176 65 164 Z M96 160 C103 156 111 158 115 164 C115 176 112 185 104 186 C97 186 93 179 92 172 Q92 164 96 160 Z"/>',
 hamstrings:'<path d="M67 186 Q79 182 87 185 L84 243 73 248 Z M93 185 Q101 182 113 186 L107 248 96 243 Z"/>',
 calves:'<path d="M73 249 Q79 243 86 249 L84 290 78 299 72 287 Z M94 249 Q101 243 107 249 L108 287 102 299 96 290 Z"/>'
};
// Hip adductors were not represented in the approved v122 shape set.
// Keep its small overlay separate so the original 15 muscle silhouettes do
// not change, even on ordinary exercise cards or recovery maps.
const adductorShape='<path d="M88 183 Q89 193 87 206 L84 226 89 239 90 240 94 226 93 204 92 183 Z"/>';
const withAdductors=(view,active)=>view==='front'&&active?{...front,adductors:adductorShape}:view==='front'?front:rear;
// A unique gradient namespace prevents repeated Buddy/exercise thumbnails from sharing SVG IDs.
let anatomySvgSequence=0;
const contours={
 front:'M90 55V143 M70 82Q90 91 110 82 M78 106H102 M78 118H102 M78 130H102 M74 204L82 230 M106 204L98 230',
 back:'M90 56V154 M70 84Q90 97 110 84 M77 112Q90 125 103 112 M90 163V177 M74 203L83 233 M106 203L97 233'
};
function bodySvg(view,profile){
 const muscles=withAdductors(view,Boolean(profile?.primary.includes('adductors')||profile?.secondary.includes('adductors')));
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
 const muscles=withAdductors(view,Boolean(statuses.adductors)),uid='recovery-'+(++anatomySvgSequence);
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
 const groups=withAdductors(view,true),side=view==='front'?'Front':'Back';
 const regions=Object.entries(groups).map(([id,path])=>{
  const item=counts?.[id]||{},n=Number(item.effective)||0;
  return '<g class="muscle-region muscle-level-region" data-muscle="'+id+'" style="--load-color:'+setColor(n)+'"><title>'+labels[id]+': '+n.toFixed(1)+' equivalent sets</title>'+path+'</g>';
 }).join('');
 return '<svg class="muscle-body muscle-level-body" viewBox="0 0 180 330" role="img" aria-label="'+side+' muscle workload illustration"><g class="muscle-silhouette">'+silhouette+'</g>'+regions+
  '<path class="muscle-contours" d="'+contours[view]+'" aria-hidden="true"/></svg>';
}
/* Visual routine planning preview: same approved anatomy as Set Levels, but
   deliberately no weekly totals or analytics controls inside Workout Buddy.
   The caller supplies the selected routine's planned sets, not logged work. */
export function routinePlannedMusclesMarkup(load={}){
 const hasMapped=Object.values(load||{}).some(item=>Number(item?.effective)>0);
 if(!hasMapped)return '<div class="gym-routine-muscle-map empty" aria-label="No mapped routine muscles"></div>';
 return '<div class="gym-routine-muscle-map" role="img" aria-label="Planned muscle groups, front and back">'+
  '<span>'+setLevelSvg('front',load)+'</span><span>'+setLevelSvg('rear',load)+'</span></div>';
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
  '<p class="muscle-level-note">Approximate set exposure, not a recovery or growth score. Primary muscles count as 1 per completed set; substantial assisting muscles count as 0.5. Passive stabilization is not credited. Planned sets never count as completed.</p></section>';
}
