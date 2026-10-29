import { useRef, useState } from 'react';
import { activeOfferInDirection } from './activeRides.js';
import { activeDate, isPast } from '../schedule.js';
import { saveDestination } from '../destinations.js';
import { isDhakaPoint } from '../rideLocations.js';

export const LOCAL_TEST_USER = { id: 'local-preview', name: 'Local tester', email: 'Local test mode' };
export default function useLocalTestData() {
  const state = useRef({ rides: [], requests: [], chats: {}, destinations: {} });
  const [data, setData] = useState(state.current);
  const mutate = async (name, p) => {
    if (!import.meta.env.DEV || !['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)) throw new Error('Local testing is unavailable here.');
    let next = state.current;
    let result;
    if (name === 'publish_ride_at_locations') {
      if (activeOfferInDirection(next.rides, LOCAL_TEST_USER.id, p.p_direction)) throw new Error('You already have an active offer in this direction.');
      if (p.p_date !== activeDate() || isPast(p.p_date, p.p_time)) throw new Error('Choose a future departure on the active ride board.');
      if (!isDhakaPoint([p.p_pickup_lat, p.p_pickup_lng]) || !isDhakaPoint([p.p_destination_lat, p.p_destination_lng])) throw new Error('Choose locations within Dhaka.');
      if (!Number.isInteger(p.p_seats) || p.p_seats < 1 || p.p_seats > (p.p_vehicle === 'Bike' ? 1 : 6)) throw new Error('Choose a valid seat count.');
      result = p.p_id;
      next = { ...next, rides: [...next.rides, { id: result, ownerId: LOCAL_TEST_USER.id, name: LOCAL_TEST_USER.name, initials: 'LT',
        direction: p.p_direction, from: p.p_pickup, to: p.p_destination, fromCoords: [p.p_pickup_lat, p.p_pickup_lng],
        toCoords: [p.p_destination_lat, p.p_destination_lng], date: p.p_date, time: p.p_time, vehicle: p.p_vehicle,
        seats: p.p_seats, note: p.p_note, fare: p.p_fare, cancelled: false }] };
    } else if (name === 'cancel_ride') {
      next = { ...next, rides: next.rides.map(r => r.id === p.p_ride_id ? { ...r, cancelled: true } : r) };
    } else if (name === 'save_destination') {
      const saved = saveDestination({ ...next, user: LOCAL_TEST_USER }, { name: p.p_name, coords: [p.p_lat, p.p_lng] });
      next = { ...next, destinations: saved.destinations };
    } else {
      throw new Error('This local test supports ride offers, cancellations and saved destinations. Sign in to test shared bookings and messages.');
    }
    state.current = next;
    setData(next);
    return result;
  };
  const reset = () => {
    state.current = { rides: [], requests: [], chats: {}, destinations: {} };
    setData(state.current);
  };
  return { data, mutate, reset, loading: false, busy: false, error: '', refresh: () => {} };
}
