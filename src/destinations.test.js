import test from 'node:test';
import assert from 'node:assert/strict';
import { distanceKm, remainingChanges, saveDestination } from './destinations.js';

const location = { name: 'Rampura', coords: [23.7611, 90.4202] };
const base = { user: { id: 'student-a' } };
test('destination changes are scoped to profile and reset at Dhaka midnight, not board rollover', () => {
  const beforeRollover = new Date('2026-10-29T14:59:00Z');
  let db = saveDestination(base, location, beforeRollover);
  db = saveDestination(db, location, new Date('2026-10-29T15:01:00Z'));
  assert.equal(remainingChanges(db.destinations['student-a'], beforeRollover), 0);
  assert.throws(() => saveDestination(db, location, beforeRollover), /used both/);
  const other = saveDestination({ ...db, user: { id: 'student-b' } }, location, beforeRollover);
  assert.equal(other.destinations['student-b'].changes, 1);
  assert.equal(other.destinations['student-a'].changes, 2);
  assert.equal(remainingChanges(db.destinations['student-a'], new Date('2026-10-29T18:00:00Z')), 2);
  db = saveDestination(db, location, new Date('2026-10-29T18:00:00Z'));
  assert.equal(db.destinations['student-a'].changes, 1);
});
test('guests, empty names and invalid map points cannot save', () => {
  assert.throws(() => saveDestination({}, location), /Sign in/);
  for (const entry of [{ name: '', coords: location.coords }, { name: 'Elsewhere', coords: [0, 0] }, { name: 'Bad', coords: [NaN, 90.4] }]) {
    assert.throws(() => saveDestination(base, entry), /within Dhaka/);
  }
});
test('nearby filtering uses geographic distance', () => {
  assert.equal(distanceKm(location.coords, location.coords), 0);
  assert.ok(distanceKm(location.coords, [23.7657, 90.4352]) < 3);
  assert.ok(distanceKm(location.coords, [23.8705, 90.3985]) > 3);
});
