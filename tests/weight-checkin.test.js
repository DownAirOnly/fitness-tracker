import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkInReading,stepCheckInValue} from '../weight-checkin-model.js';

test('prefill chooses the latest dated weight and body fat independently', () => {
 const weights=[{date:'2026-11-07',value:174.1},{date:'2026-11-09',value:172.8},{date:'2026-11-11',value:171.7}];
 const bodyFat=[{date:'2026-11-08',value:20.3},{date:'2026-11-09',value:19.9}];
 assert.equal(checkInReading(weights,'2026-11-10').value,172.8);
 assert.equal(checkInReading(bodyFat,'2026-11-10').value,19.9);
 assert.equal(checkInReading(weights,'2026-11-08').value,174.1,'older readings are available only with an accurate date label');
 assert.equal(checkInReading(bodyFat,'2026-11-07'),null,'no reading is never fabricated');
 assert.equal(checkInReading([{date:'2026-11-10',value:172.1},...weights],'2026-11-10').value,172.1,'today\'s existing reading takes priority');
});

test('draft adjustment supports quarter-free 0.1 and 0.5 changes with limits', () => {
 assert.equal(stepCheckInValue('172.8',-.5),'172.3');
 assert.equal(stepCheckInValue('172.8',.1),'172.9');
 assert.equal(stepCheckInValue('19.9',-.1,'bodyFat'),'19.8');
 assert.equal(stepCheckInValue('19.9',.5,'bodyFat'),'20.4');
 assert.equal(stepCheckInValue('',.1,'bodyFat'),null);
 assert.equal(stepCheckInValue('0.1',-.1,'bodyFat'),null);
 assert.equal(stepCheckInValue('100',.1,'bodyFat'),null);
 assert.equal(stepCheckInValue('not a number',.5),null);
});
