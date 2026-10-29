import { bdNow } from './schedule.js';

export function remainingChanges(preference, at = new Date()) {
  return preference?.changeDate === bdNow(at).date ? Math.max(0, 2 - preference.changes) : 2;
}

export function saveDestination(db, destination, at = new Date()) {
  if (!db.user) throw new Error('Sign in to save your preferred destination.');
  const [lat, lng] = destination.coords || [];
  if (!destination.name?.trim() || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < 23.5 || lat > 24.1 || lng < 90.1 || lng > 90.7) {
    throw new Error('Choose a named location within Dhaka.');
  }
  const previous = db.destinations?.[db.user.id];
  if (remainingChanges(previous, at) === 0) throw new Error('You have used both destination changes today. Try again after midnight in Dhaka.');
  const changeDate = bdNow(at).date;
  return { ...db, destinations: { ...db.destinations, [db.user.id]: {
    name: destination.name.trim().slice(0, 100), coords: [lat, lng], changeDate,
    changes: previous?.changeDate === changeDate ? previous.changes + 1 : 1,
  } } };
}

export function distanceKm(a, b) {
  const rad = n => n * Math.PI / 180;
  const h = Math.sin(rad(b[0] - a[0]) / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(rad(b[1] - a[1]) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
