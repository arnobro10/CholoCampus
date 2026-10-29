import React, { useEffect, useRef } from 'react';

export default function AccessDialog({ open, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    if (open && !dialog.current.open) dialog.current.showModal();
    else if (!open && dialog.current.open) dialog.current.close();
  }, [open]);
  return <dialog ref={dialog} className="university-access-dialog" onClose={onClose} aria-labelledby="university-access-title" aria-describedby="university-access-description">
    <img src="/brand/cholocampus-logo.png" width="48" height="48" alt=""/>
    <h2 id="university-access-title">BRACU users only</h2>
    <p id="university-access-description">choloCampus is only for authorized BRACU G Suite users. Please sign in with your university Google account ending in <strong>@g.bracu.ac.bd</strong> or <strong>@bracu.ac.bd</strong>.</p>
    <form method="dialog"><button className="primary-btn full" autoFocus>Got it</button></form>
  </dialog>;
}
