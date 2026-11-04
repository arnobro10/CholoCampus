const pinDiameter = 27;

export function layoutRidePins(anchors, viewport) {
  const radius = pinDiameter / 2;
  return placePoints(anchors, viewport, pinDiameter, pinDiameter, radius, radius, radius);
}

function labelCoversPin(label, pin) {
  const radius = pinDiameter / 2;
  return Math.abs(pin.x - label.x) < 52 + radius &&
    pin.y + radius > label.y - 70 && pin.y - radius < label.y - 18;
}

export function layoutRideMarkers(anchors, viewport, pins = []) {
  return placePoints(anchors, viewport, 112, 100, 56, 72, 24,
    label => pins.some(pin => labelCoversPin(label, pin)));
}

export function layoutRidePinsAndLabels(anchors, viewport) {
  const pins = layoutRidePins(anchors, viewport);
  const labels = layoutRideMarkers(pins, viewport, pins);
  const near = (a, b, width, height) =>
    Math.abs(a.x - b.x) < width && Math.abs(a.y - b.y) < height;
  const neighbors = anchors.map((anchor, index) => anchors.flatMap((other, otherIndex) =>
    index !== otherIndex && near(anchor, other, pinDiameter, pinDiameter) ? [otherIndex] : []));

  for (const [index, matches] of neighbors.entries()) {
    const [partner] = matches;
    if (matches.length !== 1 || partner <= index || neighbors[partner].length !== 1) continue;

    const x = (anchors[index].x + anchors[partner].x) / 2;
    const y = (anchors[index].y + anchors[partner].y) / 2;
    if (x < 112 || x > viewport.x - 112 || y < 72 || y > viewport.y - 24) continue;

    const pairPins = [{ x: x - pinDiameter / 2, y }, { x: x + pinDiameter / 2, y }];
    const pairLabels = [{ x: x - 56, y }, { x: x + 56, y }];
    // Keep the collision-safe layout if another ride occupies the symmetric slots.
    const conflicts = pins.some((pin, other) => {
      if (other === index || other === partner) return false;
      const label = labels[other];
      return pairPins.some(candidate =>
        near(candidate, pin, pinDiameter, pinDiameter) || labelCoversPin(label, candidate)) ||
        pairLabels.some(candidate => near(candidate, label, 112, 100) || labelCoversPin(candidate, pin));
    });
    if (conflicts) continue;

    [pins[index], pins[partner]] = pairPins;
    [labels[index], labels[partner]] = pairLabels;
  }
  return { pins, labels };
}

function placePoints(anchors, viewport, horizontalStep, verticalStep, insetX, insetTop, insetBottom, blocked = () => false) {
  const placed = [];
  for (const anchor of anchors) {
    const onScreen = anchor.x >= 0 && anchor.x <= viewport.x && anchor.y >= 0 && anchor.y <= viewport.y;
    const fits = point => point.x >= insetX && point.x <= viewport.x - insetX &&
      point.y >= insetTop && point.y <= viewport.y - insetBottom;
    let fallback;
    let position;
    // Search from the original point outwards, trying horizontal slots first.
    const maxRing = onScreen ? Math.ceil(Math.max(viewport.x / horizontalStep, viewport.y / verticalStep)) : 0;
    for (let ring = 0; !position; ring++) {
      for (let row = 0; row <= ring && !position; row++) {
        for (let column = 0; column <= ring && !position; column++) {
          if (Math.max(row, column) !== ring) continue;
          for (const dx of column ? [column, -column] : [0]) {
            for (const dy of row ? [row, -row] : [0]) {
              const point = { x: anchor.x + dx * horizontalStep, y: anchor.y + dy * verticalStep };
              if (blocked(point) || placed.some(other =>
                Math.abs(point.x - other.x) < horizontalStep &&
                Math.abs(point.y - other.y) < verticalStep)) continue;
              fallback ??= point;
              if (!onScreen || fits(point)) {
                position = point;
                break;
              }
            }
            if (position) break;
          }
        }
      }
      if (!position && ring >= maxRing) position = fallback;
    }
    placed.push(position);
  }
  return placed;
}
