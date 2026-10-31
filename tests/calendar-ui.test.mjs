import test from 'node:test';
import assert from 'node:assert/strict';
import {calendarMonthMarkup,calendarShiftMonth} from '../calendar-ui.js';
test('month view marks actual and projected workouts independently',()=>{
 const html=calendarMonthMarkup({monthKey:'2026-11',today:'2026-11-02',completed:['2026-11-01'],projected:['2026-11-04']});
 assert.match(html,/ed-calendar-day completed/);
 assert.match(html,/ed-calendar-day projected/);
 assert.match(html,/2026-11-01 · Workout completed/);
 assert.match(html,/2026-11-04 · Projected workout/);
 assert.equal((html.match(/data-date="2026-11-/g)||[]).length,30);
 assert.equal(calendarShiftMonth('2026-12',1),'2027-01');
 assert.equal(calendarShiftMonth('2026-01',-1),'2025-12');
});