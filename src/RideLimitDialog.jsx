import React, { useEffect, useRef } from 'react';

export default function RideLimitDialog({ direction, onClose, onViewRides, onOfferOther }) {
  const dialog = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current.showModal();
    return () => previous?.focus();
  }, []);
  return <dialog ref={dialog} className="university-access-dialog" aria-labelledby="ride-limit-title"
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <h2 id="ride-limit-title">{direction==='to'?'Going ride already published':'Returning ride already published'}</h2>
    <p>You can keep one going ride and one returning ride active at the same time.</p>
    <p>Cancel that ride in My rides before publishing another in the same direction.</p>
    <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
      <button type="button" className="primary-btn" onClick={onViewRides}>Manage ride</button>
      {onOfferOther&&<button type="button" className="light-btn" onClick={onOfferOther}>{direction==='to'?'Offer a returning ride':'Offer a going ride'}</button>}
      <button type="button" className="light-btn" autoFocus onClick={onClose}>Close</button>
    </div>
  </dialog>;
}
