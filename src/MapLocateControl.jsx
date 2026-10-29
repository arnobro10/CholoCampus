import React, { useEffect, useRef, useState } from 'react';
import { CircleMarker, Tooltip, useMap } from 'react-leaflet';
import { DomEvent } from 'leaflet';
import { Navigation } from './Icons.jsx';

export default function MapLocateControl() {
  const map = useMap();
  const control = useRef(null);
  const [pending, setPending] = useState(false);
  const [position, setPosition] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    DomEvent.disableClickPropagation(control.current);
    DomEvent.disableScrollPropagation(control.current);
    const found = event => {
      setPending(false);
      setError('');
      setPosition(event.latlng);
      map.setView(event.latlng, 15);
    };
    const failed = event => {
      setPending(false);
      setError(event.code === 1
        ? 'Location access is blocked. Allow location for this site in your browser, then try again.'
        : event.code === 3
          ? 'Finding your location took too long. Try again.'
          : 'Your location is unavailable. Check your device location settings and try again.');
    };
    map.on('locationfound', found);
    map.on('locationerror', failed);
    return () => {
      map.off('locationfound', found);
      map.off('locationerror', failed);
      map.stopLocate();
    };
  }, [map]);

  const locate = () => {
    setError('');
    setPending(true);
    map.locate({ enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
  };

  return <>
    <div className="map-locate-control" ref={control}>
      <button type="button" onClick={locate} disabled={pending}
        aria-label={pending ? 'Finding your location' : 'Go to my location'}
        aria-busy={pending} title="Go to my location">
        <Navigation size={22}/>
      </button>
      <span className={`map-location-status${pending || error ? ' visible' : ''}`} role="status">
        {pending ? 'Finding your location...' : error}
      </span>
    </div>
    {position && <CircleMarker center={position} radius={8}
      pathOptions={{ color: '#fff', weight: 3, fillColor: '#1677ff', fillOpacity: 1 }}>
      <Tooltip>Your location</Tooltip>
    </CircleMarker>}
  </>;
}
