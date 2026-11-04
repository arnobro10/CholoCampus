import React, { useReducer } from 'react';
import { Marker, Polyline, Popup, Tooltip, useMapEvents } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { layoutRidePinsAndLabels } from './rideMarkerLayout.js';

const stickers = {
  Car: '<path fill="currentColor" d="M2 11l2-6a2 2 0 012-1h12a2 2 0 012 1l2 6v7h-3v2h-3v-2H8v2H5v-2H2z"/><path fill="white" d="M5 10l1-4h12l1 4z"/><path fill="white" d="M5 13h3v2H5zm11 0h3v2h-3z"/>',
  Bike: '<g stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><g fill="none"><circle cx="5" cy="17" r="3.5"/><circle cx="19" cy="17" r="3.5"/><path d="M19 17 15 6h-2M4 10h5"/></g><path fill="currentColor" d="M5 17l4-6 2-2h4l1 3-3 2-1 3z"/></g>',
};

const rideIcons = Object.fromEntries(['to', 'from'].flatMap(direction =>
  Object.entries(stickers).flatMap(([vehicle, shape]) => [false, true].map(selected => [
    `${direction}-${vehicle}-${selected}`,
    divIcon({
      className: `ride-vehicle-sticker ride-vehicle-sticker--${direction}${selected ? ' ride-vehicle-sticker--selected' : ''}`,
      html: `<svg viewBox="0 0 24 24" aria-hidden="true">${shape}</svg>`,
      iconSize: [27, 27],
      iconAnchor: [13.5, 13.5],
    }),
  ]))
));

export default function RideMarkers({ rides, getPoint, selected, onSelect, formatTime }) {
  const [, refresh] = useReducer(value => value + 1, 0);
  const map = useMapEvents({ moveend: refresh, zoomend: refresh, resize: refresh });
  const entries = rides.map(ride => ({ ride, origin: getPoint(ride) }))
    .filter(entry => entry.origin)
    .sort((a, b) => a.ride.id.localeCompare(b.ride.id));
  const anchors = entries.map(({ origin }) => map.latLngToContainerPoint(origin));
  const { pins, labels, paired } = layoutRidePinsAndLabels(anchors, map.getSize());

  return entries.map(({ ride }, index) => {
    const pin = pins[index];
    const label = labels[index];
    const center = map.containerPointToLatLng([pin.x, pin.y]);
    const labelBottom = map.containerPointToLatLng([label.x, label.y - 18]);
    const going = ride.direction === 'to';
    const isPaired = paired.has(index);
    const color = going ? '#ef685a' : '#47bc77';
    const connector = isPaired
      ? [center, map.containerPointToLatLng([label.x, pin.y]), labelBottom]
      : [center, labelBottom];
    const labelClass = [
      'ride-marker-label',
      `ride-marker-label--${going ? "to" : "from"}`,
      ride.femaleOnly && 'ride-marker-label--female-only',
    ].filter(Boolean).join(' ');
    return <React.Fragment key={ride.id}>
      <Polyline positions={connector} interactive={false}
        pathOptions={{ color, weight: 2 }}/>
      <Marker position={center}
        icon={rideIcons[`${going ? 'to' : 'from'}-${ride.vehicle === 'Bike' ? 'Bike' : 'Car'}-${selected === ride.id}`]}
        title={`${ride.vehicle} ${going ? 'to campus' : 'from campus'}`}
        eventHandlers={{ click: () => onSelect(ride.id) }}>
        <Tooltip key={`${labelClass}:${label.x - pin.x}:${label.y - pin.y}`}
          permanent direction="top" offset={[label.x - pin.x, label.y - pin.y - 12]} className={labelClass}>
          <b>{ride.time}</b><span>{ride.vehicle} · A.S. {ride.seats}</span>
        </Tooltip>
        <Popup><b>{ride.from}</b><br/>{going ? 'To campus' : 'From campus'} · {formatTime(ride.time)}<br/>{ride.seats} seats available</Popup>
      </Marker>
    </React.Fragment>;
  });
}
