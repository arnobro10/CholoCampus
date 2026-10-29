import React, { useEffect, useRef } from 'react';

export default function RideLimitDialog({ onClose, onViewRides }) {
  const dialog = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current.showModal();
    return () => previous?.focus();
  }, []);
  return <dialog ref={dialog} className="university-access-dialog" aria-labelledby="ride-limit-title"
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <h2 id="ride-limit-title">Ride already published</h2>
    <p>You can have one going ride and one returning ride at a time, two in total. You already have an active ride in this direction.</p>
    <p>Cancel that ride in My rides before publishing another in the same direction.</p>
    <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
      <button type="button" className="primary-btn" onClick={onViewRides}>View my rides</button>
      <button type="button" className="light-btn" autoFocus onClick={onClose}>Close</button>
    </div>
  </dialog>;
}
