import { CAMPUS } from './campus.js';
export const CAMPUS_NAME='BRAC University, Merul Badda';
export const DHAKA_BOUNDS=[[23.5,90.1],[24.1,90.7]];
export function isDhakaPoint(point) {
  return Array.isArray(point) && point.length===2 && point.every(Number.isFinite) && point[0]>=23.5 && point[0]<=24.1 && point[1]>=90.1 && point[1]<=90.7;
}
export function routePoint(ride, endpoint, locations=[]) {
  const point=endpoint==='from'?ride.fromCoords:ride.toCoords;
  if(isDhakaPoint(point))return point;
  return locations.find(place=>place.name===ride[endpoint])?.coords || null;
}
export function applyRideDirection(form,direction,defaultPlace) {
  return {...form,direction,
    from:direction==='from'?CAMPUS_NAME:defaultPlace.name,
    to:direction==='to'?CAMPUS_NAME:defaultPlace.name,
    fromCoords:direction==='from'?CAMPUS:defaultPlace.coords,
    toCoords:direction==='to'?CAMPUS:defaultPlace.coords};
}
export function photonPlaces(payload) {
  return (payload.features || []).flatMap(feature=>{
    const coordinates=feature.geometry?.coordinates;
    const point=coordinates && [coordinates[1],coordinates[0]];
    const p=feature.properties || {};
    if(!isDhakaPoint(point) || (p.countrycode && p.countrycode.toLowerCase()!=='bd'))return [];
    const street=[p.housenumber,p.street].filter(Boolean).join(' ');
    const parts=[p.name,street,p.locality,p.district,p.city].filter(Boolean);
    const name=[...new Set(parts)].join(', ').slice(0,100);
    return name?[{id:`${p.osm_type}-${p.osm_id}`,name,coords:point}]:[];
  });
}
export async function searchRidePlaces(query,{signal,fetcher=fetch,endpoint='https://photon.komoot.io/api/'}={}) {
  if(query.trim().length<2)return [];
  const url=new URL(endpoint);
  Object.entries({q:query.trim(),limit:'6',lat:String(CAMPUS[0]),lon:String(CAMPUS[1]),bbox:'90.1,23.5,90.7,24.1',lang:'en'}).forEach(([key,value])=>url.searchParams.set(key,value));
  const response=await fetcher(url,{signal});
  if(!response.ok)throw new Error('Location search is unavailable. Please try again or drag the map to choose a pin.');
  return photonPlaces(await response.json());
}
