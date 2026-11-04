import React, { useReducer } from 'react';
import { CircleMarker, Polyline, Popup, Tooltip, useMapEvents } from 'react-leaflet';
import { layoutRideMarkers, layoutRidePins } from './rideMarkerLayout.js';

export default function RideMarkers({ rides, getPoint, selected, onSelect, formatTime }) {
  const [, refresh] = useReducer(value => value + 1, 0);
  const map = useMapEvents({ moveend: refresh, zoomend: refresh, resize: refresh });
  const entries = rides.map(ride => ({ ride, origin: getPoint(ride) }))
    .filter(entry => entry.origin)
    .sort((a, b) => a.ride.id.localeCompare(b.ride.id));
  const anchors = entries.map(({ origin }) => map.latLngToContainerPoint(origin));
  const viewport = map.getSize();
  const pins = layoutRidePins(anchors, viewport);
  const labels = layoutRideMarkers(pins, viewport, pins);

  return entries.map(({ ride }, index) => {
    const pin = pins[index];
    const label = labels[index];
    const center = map.containerPointToLatLng([pin.x, pin.y]);
    const labelBottom = map.containerPointToLatLng([label.x, label.y - 18]);
    const going = ride.direction === 'to';
    const color = going ? '#ef685a' : '#1eab85';
    return <React.Fragment key={ride.id}>
      <Polyline positions={[center, labelBottom]} interactive={false}
        pathOptions={{ color, weight: 2 }}/>
      <CircleMarker center={center} radius={12}
        pathOptions={{ color: selected === ride.id ? '#d5f531' : '#fff', weight: 3, fillColor: color, fillOpacity: 1 }}
        eventHandlers={{ click: () => onSelect(ride.id) }}>
        <Tooltip permanent direction="top" offset={[label.x - pin.x, label.y - pin.y - 12]} className="ride-marker-label">
          <b>{ride.time}</b><span>{ride.vehicle} · A.S. {ride.seats}</span>
        </Tooltip>
        <Popup><b>{ride.from}</b><br/>{going ? 'To campus' : 'From campus'} · {formatTime(ride.time)}<br/>{ride.seats} seats available</Popup>
      </CircleMarker>
    </React.Fragment>;
  });
}
