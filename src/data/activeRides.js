import { isPast } from '../schedule.js';
export function activeOfferInDirection(rides, userId, direction, at = new Date()) {
  return rides.find(ride => ride.ownerId === userId && ride.direction === direction && !ride.cancelled && !isPast(ride.date, ride.time, at));
}
export function activeBookingInDirection(requests, rides, userId, direction, at = new Date()) {
  return requests.find(request => request.requesterId === userId && ['pending', 'accepted'].includes(request.status)
    && rides.some(ride => ride.id === request.rideId && ride.direction === direction && !ride.cancelled && !isPast(ride.date, ride.time, at)));
}
