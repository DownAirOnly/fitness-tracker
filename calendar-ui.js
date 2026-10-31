// Reusable month grid for Everyday surfaces. No DOM or storage dependencies.
// All markers are date keyed; one source of truth for completed vs projected styling.
export function calendarMonthMarkup({monthKey,today='',completed=[],projected=[],projectedLabel='Projected',showLegend=true,footerAction='',footerLabel='',action='calendar-day',navAction='calendar-month'}){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey))return '';
 const [year,month]=monthKey.split('-').map(Number),first=new Date(year,month-1,1),
   days=new Date(year,month,0).getDate(),offset=first.getDay();
 const completedSet=new Set(completed),projectedSet=new Set(projected);
 const futureLabel=projectedLabel==='Scheduled'?'Scheduled':'Projected';
 const cells=Array.from({length:Math.ceil((days+offset)/7)*7},(_,index)=>{
  const day=index-offset+1;if(day<1||day>days)return '<span class="ed-calendar-empty" aria-hidden="true"></span>';
  const iso=monthKey+'-'+String(day).padStart(2,'0');
  const finished=completedSet.has(iso),planned=!finished&&projectedSet.has(iso);
  const kind=finished?' completed':planned?' projected':'';
  const label=iso+(finished?' · Workout completed':planned?' · '+futureLabel+' workout':'');
  return '<button type="button" class="ed-calendar-day'+kind+(iso===today?' today':'')+'" data-action="'+action+'" data-date="'+iso+'" aria-label="'+label+'"><span>'+day+'</span></button>';
 }).join('');
 const title=first.toLocaleDateString('en-US',{month:'long',year:'numeric'});
 return '<section class="ed-calendar" aria-label="Workout calendar">'+
  '<div class="ed-calendar-header"><strong>'+title+'</strong><div class="ed-calendar-arrows">'+
  '<button type="button" data-action="'+navAction+'" data-delta="-1" aria-label="Previous month">‹</button>'+
  '<button type="button" data-action="'+navAction+'" data-delta="1" aria-label="Next month">›</button></div></div>'+
  '<div class="ed-calendar-grid">'+['S','M','T','W','T','F','S'].map((d,i)=>'<span class="ed-calendar-weekday" aria-label="'+['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][i]+'">'+d+'</span>').join('')+cells+'</div>'+
  (showLegend?'<div class="ed-calendar-legend"><span><i class="completed"></i>Worked out</span><span><i class="projected"></i>'+futureLabel+'</span></div>':'')+
  (footerAction?'<div class="ed-calendar-footer"><button type="button" data-action="'+footerAction+'" class="ed-calendar-schedule">'+(footerLabel||'Schedule')+'</button></div>':'')+'</section>';
}
export function calendarShiftMonth(monthKey,delta){
 const [y,m]=monthKey.split('-').map(Number);const d=new Date(y,m-1+delta,1);
 return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
}
