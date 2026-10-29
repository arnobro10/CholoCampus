import test from 'node:test';
import assert from 'node:assert/strict';
import { activeOfferInDirection, activeBookingInDirection } from './activeRides.js';
const at=new Date('2026-10-30T04:00:00Z');
const to={id:'to',ownerId:'driver',direction:'to',date:'2026-10-30',time:'12:00',seats:0};
const from={...to,id:'from',direction:'from'};
test('offers are independent per direction, including sold-out offers',()=>{
 assert.equal(activeOfferInDirection([to],'driver','from',at),undefined);
 assert.equal(activeOfferInDirection([to,from],'driver','to',at),to);
 assert.equal(activeOfferInDirection([to,from],'driver','from',at),from);
 for(const ride of [{...to,cancelled:true},{...to,time:'09:00'},{...to,ownerId:'other'}])assert.equal(activeOfferInDirection([ride],'driver','to',at),undefined);
});
test('pending and accepted bookings count only in their direction; closed and departed do not',()=>{
 for(const status of ['pending','accepted']) {
  const request={id:'q',rideId:'to',requesterId:'passenger',status};
  assert.equal(activeBookingInDirection([request],[to,from],'passenger','to',at),request);
  assert.equal(activeBookingInDirection([request],[to,from],'passenger','from',at),undefined);
  assert.equal(activeBookingInDirection([request],[{...to,cancelled:true}],'passenger','to',at),undefined);
  assert.equal(activeBookingInDirection([request],[{...to,time:'09:00'}],'passenger','to',at),undefined);
 }
 for(const status of ['declined','cancelled'])assert.equal(activeBookingInDirection([{rideId:'to',requesterId:'passenger',status}],[to],'passenger','to',at),undefined);
});
