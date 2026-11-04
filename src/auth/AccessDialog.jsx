import React, { useEffect, useId, useRef } from 'react';

export default function AccessDialog({ open, onClose, title = 'BRACU users only', description }) {
  const dialog = useRef(null);
  const id = useId();
  useEffect(() => {
    if (open && !dialog.current.open) dialog.current.showModal();
    else if (!open && dialog.current.open) dialog.current.close();
  }, [open]);
  return <dialog ref={dialog} className="university-access-dialog" onClose={onClose} aria-labelledby={id + "-title"} aria-describedby={id + "-description"}>
    <img src="/brand/cholocampus-logo.png" width="48" height="48" alt=""/>
    <h2 id={id + "-title"}>{title}</h2>
    <p id={id + "-description"}>{description || <>choloCampus is only for authorized BRACU G Suite users. Please sign in with your university Google account ending in <strong>@g.bracu.ac.bd</strong> or <strong>@bracu.ac.bd</strong>.</>}</p>
    <form method="dialog"><button className="primary-btn full" autoFocus>Got it</button></form>
  </dialog>;
}
