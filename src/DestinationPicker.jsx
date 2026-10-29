import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, useMap, useMapEvents } from 'react-leaflet';
import RideMapTiles from './RideMapTiles.jsx';
import PlaceSearchResults from './PlaceSearchResults.jsx';
import { ArrowRight, Check, MapPin, Search, X } from './Icons.jsx';
import { distanceKm, remainingChanges } from './destinations.js';
import './destination-picker.css';

function MapPosition({ jump, onPick }) {
  const map = useMap();
  useEffect(() => { if (jump) map.setView(jump, 15); }, [map, jump]);
  useMapEvents({ moveend: () => { const c = map.getCenter(); onPick([c.lat, c.lng]); } });
  return null;
}

export default function DestinationPicker({ locations, preference, onSave, onClose }) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('list');
  const [point, setPoint] = useState(preference?.coords || null);
  const [name, setName] = useState(preference?.name || '');
  const [jump, setJump] = useState(preference?.coords || locations[0].coords);
  const [error, setError] = useState('');
  const [saving,setSaving]=useState(false);
  const dialog = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.focus();
    return () => previous?.focus();
  }, []);
  const choose = place => { setPoint(place.coords); setJump(place.coords); setName(place.name); setError(''); };
  const changes = remainingChanges(preference);
  const save = async () => {
    if(saving)return;setSaving(true);setError('');
    try { await onSave({ name, coords: point }); } catch (e) { setError(e.message); } finally {setSaving(false);}
  };
  const keydown = event => {
    if (event.key === 'Escape') onClose();
    if (event.key !== 'Tab') return;
    const controls = [...dialog.current.querySelectorAll('button:not(:disabled),input,a[href],[tabindex="0"]')].filter(el => el.getClientRects().length);
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };
  return <div className="modal-backdrop" onClick={onClose}>
    <section className="destination-picker" role="dialog" aria-modal="true" aria-labelledby="destination-title" ref={dialog} tabIndex={-1} onKeyDown={keydown} onClick={e => e.stopPropagation()}>
      <header><div><small>Your daily commute</small><h2 id="destination-title">Preferred destination</h2></div><button className="iconbtn" aria-label="Close destination picker" onClick={onClose}><X size={18}/></button></header>
      <p className="destination-limit">You can change your destination {changes} more {changes === 1 ? 'time' : 'times'} today. Resets at midnight, Dhaka time.</p>
      <div className="tabs"><button className={mode === 'list' ? 'picked' : ''} onClick={() => setMode('list')}>Search locations</button><button className={mode === 'map' ? 'picked' : ''} onClick={() => setMode('map')}>Choose on map</button></div>
      {mode === 'list' ? <div className="destination-list"><label className="searchbox"><Search size={18}/><input aria-label="Search Dhaka locations" placeholder="Search Dhaka locations" value={query} onChange={e => setQuery(e.target.value)}/></label><p className="destination-hint">Search Dhaka addresses and landmarks, or pin the exact location on the map.</p><div className="destination-results"><PlaceSearchResults showDefaults query={query} locations={locations} onSelect={choose}/></div></div> : <><div className="destination-map"><MapContainer zoomAnimation={false} fadeAnimation={false} center={point || locations[0].coords} zoom={14} maxBounds={[[23.5,90.1],[24.1,90.7]]} maxBoundsViscosity={1} zoomControl className="map"><RideMapTiles/><MapPosition jump={jump} onPick={coords => { setPoint(coords); const match=locations.find(l=>distanceKm(l.coords,coords)<0.05); setName(match?.name||(preference&&distanceKm(preference.coords,coords)<0.02?preference.name:'Pinned location')); }}/></MapContainer><div className="destination-pin" aria-hidden="true"><MapPin size={36}/></div><span className="pin-hint">Move the map to position your pin</span></div><label className="destination-name">Pin label (does not search or move the pin)<input value={name} maxLength={100} placeholder="e.g. My pickup point" onChange={e => setName(e.target.value)}/></label></>}
      <footer><div className="destination-selection"><MapPin size={20}/><div><b>{point ? name || 'Name your location' : 'Select your destination'}</b>{point && <small>{point[0].toFixed(5)}, {point[1].toFixed(5)}</small>}</div></div>{error && <p className="destination-error" role="alert">{error}</p>}<button className="primary-btn full" disabled={saving || !point || !name.trim() || changes === 0} onClick={save}>{saving?'Saving…':'Save preferred destination'} <ArrowRight size={18}/></button></footer>
    </section>
  </div>;
}
