import React, { useEffect, useState } from 'react';
import { searchRidePlaces } from './rideLocations.js';
import { MapPin, ArrowUpRight } from './Icons.jsx';

export default function PlaceSearchResults({ query, locations, onSelect, showDefaults = false }) {
  const [remote, setRemote] = useState([]);
  const [status, setStatus] = useState('');
  const term = query.trim();
  useEffect(() => {
    setRemote([]);
    if (term.length < 2) { setStatus(''); return; }
    let alive = true;
    const controller = new AbortController();
    setStatus('Searching places…');
    let timeout;
    const debounce = setTimeout(async () => {
      timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const found = await searchRidePlaces(term, { signal: controller.signal,
          endpoint: import.meta.env.VITE_GEOCODER_URL || undefined });
        if (alive) { setRemote(found); setStatus(found.length ? '' : 'No address matches. Try a nearby road or landmark.'); }
      } catch {
        if (alive) setStatus('Place search is unavailable. Try again or choose a map pin.');
      } finally { clearTimeout(timeout); }
    }, 400);
    return () => { alive = false; clearTimeout(debounce); clearTimeout(timeout); controller.abort(); };
  }, [term]);
  const local = term ? locations.filter(p => p.name.toLowerCase().includes(term.toLowerCase())) : (showDefaults ? locations : []);
  const places = [...local, ...remote.filter(p => !local.some(l => l.name === p.name))];
  if (!term && !showDefaults) return null;
  return <div className="place-suggestions" aria-label="Place suggestions">
    {places.map((place, index) => <button type="button" key={`${place.id || place.name}-${index}`} onClick={() => onSelect(place)}>
      <MapPin size={17}/><span>{place.name}</span><ArrowUpRight size={16}/>
    </button>)}
    {status && <p role="status" style={{fontSize:12,lineHeight:1.5,color:'var(--secondary)'}}>{status}</p>}
    {term.length > 0 && term.length < 2 && <p role="status">Type at least two characters to search Dhaka places.</p>}
  </div>;
}
