import { useEffect, useState } from 'react';
import { activeOfferInDirection } from './activeRides.js';
import { activeDate, isPast } from '../schedule.js';
import { saveDestination } from '../destinations.js';
import { isDhakaPoint } from '../rideLocations.js';

const storageKey = 'cholocampus-local-test-rides';
const emptyData = () => ({ rides: [], requests: [], chats: {}, destinations: {} });
const canUseLocalTest = () =>
  import.meta.env.DEV && ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);

export function getLocalTestUser() {
  const id = new URLSearchParams(window.location.search).get('tester');
  if (id === '2') return { id: 'local-tester-2', name: 'Test student 2', gender: 'female', email: 'Local test mode' };
  if (id === '3') return { id: 'local-tester-3', name: 'Test student 3', gender: 'male', email: 'Local test mode' };
  return { id: 'local-preview', name: 'Local tester', gender: 'female', email: 'Local test mode' };
}

function readLocalData() {
  if (!canUseLocalTest()) return emptyData();
  try { return JSON.parse(localStorage.getItem(storageKey)) || emptyData(); }
  catch { return emptyData(); }
}

export default function useLocalTestData(user) {
  const [data, setData] = useState(readLocalData);
  useEffect(() => {
    if (!canUseLocalTest()) return;
    const sync = event => {
      if (event.key === storageKey || event.key === null) setData(readLocalData());
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const mutate = async (name, p) => {
    if (!canUseLocalTest()) throw new Error('Local testing is unavailable here.');
    return navigator.locks.request(storageKey, () => {
      let next = readLocalData();
      let result;
      if (name === 'publish_ride_at_locations') {
        if (p.p_female_only && user.gender !== 'female') throw new Error('Only female test students can publish this ride.');
        if (activeOfferInDirection(next.rides, user.id, p.p_direction)) throw new Error('You already have an active offer in this direction.');
        if (p.p_date !== activeDate() || isPast(p.p_date, p.p_time)) throw new Error('Choose a future departure on the active ride board.');
        if (!isDhakaPoint([p.p_pickup_lat, p.p_pickup_lng]) || !isDhakaPoint([p.p_destination_lat, p.p_destination_lng])) throw new Error('Choose locations within Dhaka.');
        if (!Number.isInteger(p.p_seats) || p.p_seats < 1 || p.p_seats > (p.p_vehicle === 'Bike' ? 1 : 6)) throw new Error('Choose a valid seat count.');
        result = p.p_id;
        next = { ...next, rides: [...next.rides, { id: result, ownerId: user.id, name: user.name, initials: 'LT',
          direction: p.p_direction, from: p.p_pickup, to: p.p_destination, fromCoords: [p.p_pickup_lat, p.p_pickup_lng],
          toCoords: [p.p_destination_lat, p.p_destination_lng], date: p.p_date, time: p.p_time, vehicle: p.p_vehicle,
          seats: p.p_seats, note: p.p_note, fare: p.p_fare, femaleOnly: p.p_female_only === true, cancelled: false }] };
      } else if (name === 'cancel_ride') {
        next = { ...next, rides: next.rides.map(r => r.id === p.p_ride_id && r.ownerId === user.id ? { ...r, cancelled: true } : r) };
      } else if (name === 'save_destination') {
        const saved = saveDestination({ ...next, user: user }, { name: p.p_name, coords: [p.p_lat, p.p_lng] });
        next = { ...next, destinations: saved.destinations };
      } else {
        throw new Error('This local test supports ride offers, cancellations and saved destinations. Sign in to test shared bookings and messages.');
      }
      localStorage.setItem(storageKey, JSON.stringify(next));
      setData(next);
      return result;
    });
  };
  return { data, mutate, loading: false, busy: false, error: '', refresh: () => setData(readLocalData()) };
}
