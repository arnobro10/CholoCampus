import test from 'node:test';
import assert from 'node:assert/strict';
import { activeDate, isPast } from './schedule.js';

test('Dhaka board changes at 9 PM and stays on the same ride date through midnight', () => {
  for (const [instant, expected] of [
    ['2026-10-26T14:59:59Z', '2026-10-26'],
    ['2026-10-26T15:00:00Z', '2026-10-27'],
    ['2026-10-26T17:59:59Z', '2026-10-27'],
    ['2026-10-26T18:00:00Z', '2026-10-27'],
    ['2026-10-27T06:30:00Z', '2026-10-27'],
    ['2026-10-27T15:00:00Z', '2026-10-28'],
    ['2026-12-31T15:00:00Z', '2027-01-01'],
    ['2028-02-28T15:00:00Z', '2028-02-29'],
    ['2028-02-29T15:00:00Z', '2028-03-01'],
  ]) assert.equal(activeDate(new Date(instant)), expected, instant);
});

test('departures must be strictly in the future in Dhaka', () => {
  const at = new Date('2026-10-27T06:30:00Z');
  assert.equal(isPast('2026-10-27', '12:29', at), true);
  assert.equal(isPast('2026-10-27', '12:30', at), true);
  assert.equal(isPast('2026-10-27', '12:31', at), false);
  assert.equal(isPast('2026-10-26', '23:59', at), true);
  assert.equal(isPast('2026-10-28', '00:00', at), false);
});
