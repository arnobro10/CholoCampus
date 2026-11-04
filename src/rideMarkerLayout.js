const pinDiameter = 27;

export function layoutRidePins(anchors, viewport) {
  const radius = pinDiameter / 2;
  return placePoints(anchors, viewport, pinDiameter, pinDiameter, radius, radius, radius);
}

export function layoutRideMarkers(anchors, viewport, pins = []) {
  return placePoints(anchors, viewport, 112, 100, 56, 72, 24, point =>
    pins.some(pin => Math.abs(pin.x - point.x) < 52 + pinDiameter / 2 &&
      pin.y + pinDiameter / 2 > point.y - 70 && pin.y - pinDiameter / 2 < point.y - 18));
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
