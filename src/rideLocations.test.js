import test from 'node:test';
import assert from 'node:assert/strict';
import { CAMPUS } from './campus.js';
import { applyRideDirection, CAMPUS_NAME, isDhakaPoint, photonPlaces, routePoint, searchRidePlaces } from './rideLocations.js';

test('switching direction always fixes the correct campus coordinates and label',()=>{
  const home={name:'Custom home',coords:[23.76,90.38]};
  const to=applyRideDirection({fare:'80'},'to',home);
  assert.equal(to.to,CAMPUS_NAME);assert.deepEqual(to.toCoords,CAMPUS);assert.deepEqual(to.fromCoords,home.coords);
  const from=applyRideDirection(to,'from',home);
  assert.equal(from.from,CAMPUS_NAME);assert.deepEqual(from.fromCoords,CAMPUS);assert.deepEqual(from.toCoords,home.coords);assert.equal(from.fare,'80');
});
test('custom route coordinates take priority over curated labels, unknown legacy labels do not map to campus',()=>{
  const point=[23.766,90.388];
  assert.deepEqual(routePoint({from:'Custom road',fromCoords:point},'from'),point);
  assert.equal(routePoint({from:'Unknown location'},'from'),null);
  assert.deepEqual(routePoint({to:'Home'},'to',[{name:'Home',coords:point}]),point);
  for(const invalid of [null,[90.4,23.7],[NaN,90.4],[23.7,Infinity],[23.7]])assert.equal(isDhakaPoint(invalid),false);
});
test('Photon results convert GeoJSON longitude/latitude order and exclude invalid/outside matches',()=>{
  const features=[{geometry:{coordinates:[90.38,23.76]},properties:{osm_id:1,osm_type:'N',name:'My Road',city:'Dhaka',countrycode:'BD'}},{geometry:{coordinates:[13,52]},properties:{name:'Berlin'}},{geometry:{coordinates:[90.38,23.76]},properties:{name:'Wrong country',countrycode:'US'}},{properties:{name:'Missing point'}}];
  const places=photonPlaces({features});assert.equal(places.length,1);assert.deepEqual(places[0].coords,[23.76,90.38]);assert.equal(places[0].name,'My Road, Dhaka');
});
test('search encodes typed queries, restricts Dhaka and handles failures without inventing a result',async()=>{
  let called=false;
  await searchRidePlaces('Road & Market',{fetcher:async url=>{called=true;assert.equal(url.searchParams.get('q'),'Road & Market');assert.equal(url.searchParams.get('bbox'),'90.1,23.5,90.7,24.1');return {ok:true,json:async()=>({features:[]})};}});
  assert.equal(called,true);
  await assert.rejects(searchRidePlaces('Dhaka',{fetcher:async()=>({ok:false})}),/unavailable/);
  assert.deepEqual(await searchRidePlaces('a',{fetcher:()=>{throw new Error('Should not fetch one character');}}),[]);
});
