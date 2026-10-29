import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchSharedData, callMutation, stateFromRows } from './sharedData.js';

const ride={id:'ride',owner_id:'owner',owner_name:'Faculty Member',direction:'to',pickup:'Dhanmondi 27',destination:'BRAC University, Merul Badda',ride_date:'2026-10-30',departure_time:'08:30:00',vehicle:'Car',seats:1,note:'Meet at the main road',cancelled:false,fare:'80.50'};
test('cloud records populate ride, conversation and preference views without exposing email',()=>{
  const state=stateFromRows([ride],[{id:'request',ride_id:'ride',requester_id:'student',requester_name:'Student',owner_id:'owner',owner_name:'Faculty Member',status:'accepted'}],[{id:'message',request_id:'request',sender_id:'student',body:'On my way',created_at:'2026-10-30T01:00:00Z'},{id:'system',request_id:'request',sender_id:null,body:'Seat reserved',created_at:'2026-10-30T01:01:00Z'}],[{user_id:'student',name:'Home',lat:23.76,lng:90.38,change_date:'2026-10-30',changes:2}]);
  assert.equal(state.rides[0].fare,80.5);assert.equal(state.requests[0].rideSnapshot.fare,80.5);assert.equal(state.rides[0].time,'08:30');assert.equal(state.rides[0].initials,'FM');
  assert.equal(state.requests[0].rideSnapshot.from,'Dhanmondi 27');
  assert.equal(state.chats.request[0].from,'student');assert.equal(state.chats.request[1].from,'system');
  assert.deepEqual(state.destinations.student.coords,[23.76,90.38]);
  assert.equal(state.destinations.student.changes,2);
});

test('shared fetch paginates instead of truncating and rejects failed reads',async()=>{
  const calls=[];
  const client={from(table){return {select(){return this;},order(){return this;},async range(start,end){calls.push([table,start,end]);return {data:table==='rides'?(start===0?Array.from({length:1000},(_,i)=>({...ride,id:String(i)})):[{...ride,id:'last'}]):[],error:null};}};}};
  const result=await fetchSharedData(client);
  assert.equal(result.rides.length,1001);assert.ok(calls.some(([table,start])=>table==='rides'&&start===1000));
  const broken={from(){return {select(){return this;},order(){return this;},async range(){return {data:null,error:{message:'Offline'}};}};}};
  await assert.rejects(fetchSharedData(broken),/Offline/);
});

test('failed mutations propagate errors instead of reporting a local save',async()=>{
  await assert.rejects(callMutation({rpc:async()=>({data:null,error:{message:'No seats remain.'}})},'decide_request',{}),/No seats remain/);
  assert.equal(await callMutation({rpc:async()=>({data:'saved-id',error:null})},'create_ride',{}),'saved-id');
});
