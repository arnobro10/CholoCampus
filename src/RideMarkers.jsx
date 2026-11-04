import React, { useReducer } from 'react';
import { CircleMarker, Polyline, Popup, Tooltip, useMapEvents } from 'react-leaflet';
import { layoutRideMarkers } from './rideMarkerLayout.js';

export default function RideMarkers({ rides, getPoint, selected, onSelect, formatTime }) {
  const [, refresh] = useReducer(value => value + 1, 0);
  const map = useMapEvents({ moveend: refresh, zoomend: refresh, resize: refresh });
  const entries = rides.map(ride => ({ ride, origin: getPoint(ride) }))
    .filter(entry => entry.origin)
    .sort((a, b) => a.ride.id.localeCompare(b.ride.id));
  const anchors = entries.map(({ origin }) => map.latLngToContainerPoint(origin));
  const positions = layoutRideMarkers(anchors, map.getSize());

  return entries.map(({ ride, origin }, index) => {
    const position = positions[index];
    const displaced = position.x !== anchors[index].x || position.y !== anchors[index].y;
    const center = displaced ? map.containerPointToLatLng([position.x, position.y]) : origin;
    const going = ride.direction === 'to';
    const color = going ? '#ef685a' : '#1eab85';
    return <React.Fragment key={ride.id}>
      {displaced && <Polyline positions={[origin, center]} interactive={false}
        pathOptions={{ color, opacity: 0.7, weight: 2, dashArray: '4 4' }}/>}
      <CircleMarker center={center} radius={selected === ride.id ? 16 : 12}
        pathOptions={{ color: '#fff', weight: 3, fillColor: color, fillOpacity: 1 }}
        eventHandlers={{ click: () => onSelect(ride.id) }}>
        <Tooltip permanent direction="top" offset={[0, -12]} className="ride-marker-label">
          <b>{ride.time}</b><span>{ride.vehicle} · A.S. {ride.seats}</span>
        </Tooltip>
        <Popup><b>{ride.from}</b><br/>{going ? 'To campus' : 'From campus'} · {formatTime(ride.time)}<br/>{ride.seats} seats available</Popup>
      </CircleMarker>
    </React.Fragment>;
  });
}
