import assert from 'node:assert/strict';
import test from 'node:test';
import { layoutRideMarkers, layoutRidePins } from './rideMarkerLayout.js';

const viewport = { x: 800, y: 600 };

test('two ride pins touch side by side while their detail boxes stay apart', () => {
  const anchor = { x: 300, y: 250 };
  const pins = layoutRidePins([anchor, anchor], viewport);
  assert.equal(pins[0].y, pins[1].y);
  assert.equal(Math.abs(pins[0].x - pins[1].x), 27);
  const [first, second] = layoutRideMarkers(pins, viewport, pins);
  assert.deepEqual(first, anchor);
  assert.equal(first.y, second.y);
  assert.ok(Math.abs(first.x - second.x) >= 112);
});

test('nearby rides and displaced pins cannot overlap other ride labels', () => {
  const anchors = [
    { x: 300, y: 250 }, { x: 301, y: 255 },
    { x: 412, y: 250 }, ...Array(16).fill({ x: 300, y: 250 }),
  ];
  const pins = layoutRidePins(anchors, viewport);
  const positions = layoutRideMarkers(pins, viewport, pins);
  for (const box of positions) {
    for (const pin of pins) {
      assert.ok(Math.abs(pin.x - box.x) >= 65.5 ||
        pin.y + 13.5 <= box.y - 70 || pin.y - 13.5 >= box.y - 18);
    }
  }
  assert.equal(positions.length, anchors.length);
  positions.forEach((point, index) => {
    for (const other of positions.slice(0, index)) {
      assert.ok(Math.abs(point.x - other.x) >= 112 || Math.abs(point.y - other.y) >= 100);
    }
  });
});

test('pins near the right edge spread into the map when room is available', () => {
  const anchor = { x: 740, y: 250 };
  const [first, second] = layoutRideMarkers([anchor, anchor], viewport);
  assert.deepEqual(first, anchor);
  assert.ok(second.x < first.x);
  assert.equal(second.y, first.y);
});
