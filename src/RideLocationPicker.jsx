import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, useMap, useMapEvents } from 'react-leaflet';
import RideMapTiles from './RideMapTiles.jsx';
import { MapPin, Search, X } from './Icons.jsx';
import { CAMPUS } from './campus.js';
import { distanceKm } from './destinations.js';
import { DHAKA_BOUNDS, isDhakaPoint, searchRidePlaces } from './rideLocations.js';
import './ride-location-picker.css';

function PinMap({jump,onMove}) {
  const map=useMap();
  const userMoved=useRef(false);
  useEffect(()=>{
    const frame=requestAnimationFrame(()=>map.invalidateSize());
    return()=>cancelAnimationFrame(frame);
  },[map]);
  useEffect(()=>{if(jump)map.setView(jump,Math.max(map.getZoom(),15),{animate:false});},[map,jump]);
  useMapEvents({dragstart:()=>{userMoved.current=true;},moveend:()=>{if(!userMoved.current)return;userMoved.current=false;const c=map.getCenter();onMove([c.lat,c.lng]);},click:event=>{onMove([event.latlng.lat,event.latlng.lng]);map.panTo(event.latlng,{animate:false});}});
  return null;
}
export default function RideLocationPicker({endpoint,initial,locations,onConfirm,onClose}) {
  const [selection,setSelection]=useState(isDhakaPoint(initial?.coords)?initial:{name:'',coords:CAMPUS});
  const [confirmed,setConfirmed]=useState(false);
  const [jump,setJump]=useState(isDhakaPoint(initial?.coords)?initial.coords:CAMPUS);
  const [query,setQuery]=useState('');
  const [results,setResults]=useState([]);
  const [searched,setSearched]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const dialog=useRef(null), request=useRef(null), cache=useRef(new Map());
  useEffect(()=>{
    const previous=document.activeElement;
    dialog.current.showModal();
    return()=>{request.current?.abort('superseded');request.current=null;previous?.focus();};
  },[]);
  const choose=place=>{
    request.current?.abort('superseded');request.current=null;setLoading(false);setError('');setResults([]);setSearched(false);
    setQuery('');setConfirmed(true);setSelection({name:place.name,coords:place.coords});setJump([...place.coords]);
  };
  const move=point=>{setConfirmed(true);setQuery('');setResults([]);setSearched(false);setSelection(previous=>{
    if(distanceKm(previous.coords,point)<0.001)return previous;
    return {name:`Pinned ${endpoint==='from'?'pickup':'destination'}`,coords:point};
  });};
  const search=async event=>{
    event.preventDefault();
    if(query.trim().length<2)return;
    request.current?.abort();
    const controller=new AbortController();request.current=controller;
    setLoading(true);setError('');setSearched(true);setResults([]);
    const timer=setTimeout(()=>controller.abort('timeout'),12000);
    try {
      const key=query.trim().toLowerCase();
      const found=cache.current.get(key) || await searchRidePlaces(query,{signal:controller.signal,endpoint:import.meta.env.VITE_GEOCODER_URL || undefined});
      if(request.current!==controller || controller.signal.aborted)return;
      if(cache.current.size>=20)cache.current.delete(cache.current.keys().next().value);
      cache.current.set(key,found);setResults(found);
    }catch(failure){
      if(request.current===controller && controller.signal.reason!=='superseded')setError('Location search could not finish. Try again, or drag the map to your location.');
    }finally{clearTimeout(timer);if(request.current===controller)setLoading(false);}
  };
  const editQuery=value=>{setConfirmed(false);request.current?.abort('superseded');request.current=null;setLoading(false);setQuery(value);setResults([]);setSearched(false);setError('');};
  const confirm=()=>{
    if(!confirmed){setError('Select a search result or place a pin on the map first.');return;}
    if(!isDhakaPoint(selection.coords)){setError('Choose a location within Dhaka.');return;}
    if(!selection.name.trim()){setError('Add a name for this location.');return;}
    onConfirm({...selection,name:selection.name.trim().slice(0,100)});
  };
  const suggestions=query.trim()?locations.filter(place=>place.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0,4):[];
  return <dialog ref={dialog} className="ride-location-picker" aria-labelledby="ride-location-title" onCancel={event=>{event.preventDefault();onClose();}}>
    <header><div><small>Choose your meeting point</small><h2 id="ride-location-title">{endpoint==='from'?'Pickup location':'Destination'}</h2></div><button type="button" className="iconbtn" aria-label="Close location picker" onClick={onClose}><X size={20}/></button></header>
    <form className="ride-place-search" onSubmit={search}><Search size={19}/><input aria-label="Search Dhaka places" value={query} onChange={event=>editQuery(event.target.value)} placeholder="Search an area, road or address"/><button type="submit" disabled={loading||query.trim().length<2}>{loading?'Searching…':'Search'}</button></form>
    <div className="ride-place-results" aria-live="polite">
      {error&&<p role="alert">{error}</p>}
      {[...suggestions,...results].map((place,index)=><button type="button" key={`${place.id || place.name}-${index}`} onClick={()=>choose(place)}><MapPin size={16}/><span>{place.name}</span></button>)}
      {searched&&!loading&&!error&&!results.length&&!suggestions.length&&<p>No matches found. Try another address or drag the map to set your pin.</p>}
    </div>
    <div className="ride-pin-map"><MapContainer center={selection.coords} zoom={15} zoomAnimation={false} fadeAnimation={false} maxBounds={DHAKA_BOUNDS} maxBoundsViscosity={1} className="map"><RideMapTiles/><PinMap jump={jump} onMove={move}/></MapContainer><div className="ride-center-pin" aria-hidden="true"><MapPin size={34}/></div><span className="ride-pin-hint">Drag the map to move the pin</span></div>
    <footer><label>Location name<input maxLength={100} value={selection.name} readOnly placeholder="e.g. Road 7, beside the pharmacy"/></label><p>{selection.coords[0].toFixed(5)}, {selection.coords[1].toFixed(5)}</p><button type="button" className="primary-btn full" onClick={confirm} disabled={!confirmed||!selection.name.trim()||!isDhakaPoint(selection.coords)}>Use this {endpoint==='from'?'pickup':'destination'}</button><small>Select a result or place a map pin to confirm the location. Search: Photon · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a></small></footer>
  </dialog>;
}
