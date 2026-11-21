import {progressIntelligence} from './progress-intelligence-model.js?v=154';
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const fmt=n=>Number(n).toFixed(1).replace(/\.0$/,'');
const cal=n=>Math.round(n).toLocaleString();
export function progressIntelligenceHTML(data,today){
 const unit=data.settings.unit,report=progressIntelligence({
  weights:data.weights,foodEntries:data.foodEntries,today,unit,
  goalWeight:data.settings.goalWeight,desiredWeeklyLoss:data.settings.goalWeeklyPace,
  dayResetMinutes:data.settings.dayResetMinutes??360
 });
 const {pace,tdee,goal,target}=report;
 const rate=pace?.lossPerWeek;
 const paceValue=!pace?'Building trend':Math.abs(rate)<0.1?'Maintaining':
  (rate>0?'−':'+')+fmt(Math.abs(rate))+' '+unit+'/wk';
 const paceDetail=!pace?'Several weigh-ins over at least two weeks needed':
  (pace.days===14?'Early 14-day trend':'28-day averaged trend')+' · '+pace.count+' weigh-ins';
 const tdeeValue=tdee.ready?'≈'+cal(tdee.tdee)+' kcal/day':'Building estimate';
 const tdeeDetail=tdee.ready?'Last 28 finished days · '+tdee.loggedDays+'/28 with food entries':
  tdee.reason==='food'?tdee.loggedDays+'/28 days with food entries · need at least 24':
  tdee.reason==='weight'?'More weigh-ins needed at the start and end of the month':
  tdee.reason==='implausible'?'Weight/intake combination needs review':
  'More intake and weigh-in history needed';
 const eta=goal.eta?new Date(goal.eta+'T12:00:00').toLocaleDateString(undefined,{month:'short',year:'numeric'}):null;
 const goalValue=goal.state==='unset'?'Set a goal':goal.state==='reached'?'At goal':
  eta?'~'+eta:goal.state==='not-decreasing'?'No ETA yet':goal.state==='long-range'?'Not yet predictable':'Building ETA';
 const goalDetail=goal.state==='unset'?'Pick your goal weight':
  goal.state==='reached'?'Recent trend is at or below your goal':
  goal.state==='need-weight'?'A weigh-in is needed':
  goal.state==='need-trend'?'Need a stable weight trend':
  goal.state==='not-decreasing'?'Weight trend is not currently falling':
  goal.state==='long-range'?'Pace is too slow for a useful two-year estimate':
  eta?fmt(goal.remaining)+' '+unit+' to go · assumes pace continues':'More recent data needed';
 const row=(label,value,detail,kind)=>'<div class="pi-metric pi-'+kind+'"><small>'+esc(label)+'</small><strong>'+esc(value)+'</strong><span>'+esc(detail)+'</span></div>';
 const targetText=target?'<p class="pi-target">Desired '+esc(fmt(target.rate))+' '+esc(unit)+'/week · '+
  (target.status==='on-pace'?'Near your chosen pace':target.status==='below'?'Below your chosen pace':'Above your chosen pace')+'</p>':'';
 const intakeText=tdee.ready?'<p>Mean recorded intake: <strong>'+cal(tdee.avgIntake)+' kcal/day</strong> across '+tdee.loggedDays+' days with entries.'+
  (tdee.quality==='limited'?' Some days are missing.':' Entries do not prove every meal was logged.')+'</p>':'';
 return '<section class="panel progress-intelligence" aria-label="Progress intelligence">'+
  '<div class="section-head pi-head"><div><h2>On track?</h2><p class="pi-subtitle">Based on your existing logs</p></div>'+
  '<button type="button" class="outline small" data-action="progress-goal">'+(data.settings.goalWeight?'Edit goal':'Set goal')+'</button></div>'+
  '<div class="pi-grid">'+row('WEIGHT PACE',paceValue,paceDetail,'pace')+
  row('ESTIMATED TDEE',tdeeValue,tdeeDetail,'tdee')+
  row('GOAL ETA',goalValue,goalDetail,'eta')+'</div>'+targetText+
  '<details class="pi-method"><summary>How are these calculated?</summary>'+
  '<p>Weight pace compares averages from the beginning and end of 28 days. A 14-day early trend can appear until enough longer-term data exists. Day-to-day water shifts can obscure progress.</p>'+
  '<p>TDEE uses calorie entries from the last 28 <strong>finished</strong> tracking days and weight change across that window. It requires food entries on at least 24 days and sufficient weigh-ins near both ends. Days without entries are missing, not zero. A day with entries might still be incomplete.</p>'+
  intakeText+
  '<p>Energy expenditure uses a rough 3,500 kcal/lb energy-balance approximation, not a measurement of metabolism. Both TDEE and weight-loss rates change over time. ETA assumes the current pace continues, so it shows an approximate month, not a deadline. Nothing automatically changes your calorie target.</p>'+
  '</details></section>';
}
