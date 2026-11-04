const horizontalStep = 112;
const verticalStep = 100;

// Reserve the full footprint of the label and the largest (selected) pin.
function overlaps(a, b) {
  return Math.abs(a.x - b.x) < horizontalStep && Math.abs(a.y - b.y) < verticalStep;
}

export function layoutRideMarkers(anchors, viewport) {
  const placed = [];
  for (const anchor of anchors) {
    const onScreen = anchor.x >= 0 && anchor.x <= viewport.x && anchor.y >= 0 && anchor.y <= viewport.y;
    const fits = point => point.x >= 56 && point.x <= viewport.x - 56 &&
      point.y >= 72 && point.y <= viewport.y - 24;
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
              if (placed.some(other => overlaps(point, other))) continue;
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
