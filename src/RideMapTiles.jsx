import React, { useEffect, useState } from 'react';
import { TileLayer } from 'react-leaflet';
import { useSystemTheme } from './SystemTheme.jsx';

const token = import.meta.env.VITE_MAPBOX_TOKEN?.trim();
export const mapboxConfigured = Boolean(token);

export default function RideMapTiles() {
  const [failed, setFailed] = useState(false);
  const theme = useSystemTheme();
  const style = theme === 'dark' ? 'dark-v11' : 'light-v11';
  useEffect(() => setFailed(false), [style]);
  if (!token) return <TileLayer
    url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  />;
  return <>
    <TileLayer key={style}
      url={`https://api.mapbox.com/styles/v1/mapbox/${style}/tiles/512/{z}/{x}/{y}?access_token=${encodeURIComponent(token)}`}
      tileSize={512} zoomOffset={-1} maxZoom={20}
      attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> <a href="https://apps.mapbox.com/feedback/">Improve this map</a>'
      eventHandlers={{ tileerror: () => setFailed(true), load: () => setFailed(false) }}
    />
    {failed && <div className="map-error" role="alert">Map tiles could not load. Check your connection and Mapbox token permissions.</div>}
    <a className="mapbox-brand" href="https://www.mapbox.com/" target="_blank" rel="noreferrer" aria-label="Mapbox"></a>
  </>;
}
