import React from 'react';
import './app-brand.css';

export default function AppBrand({ compact = false }) {
  return <span className={`app-brand${compact ? ' app-brand--compact' : ''}`} aria-label="choloCampus">
    <img className="app-brand__logo" src="/brand/cholocampus-logo.png" alt="" width={40} height={40} decoding="async"/>
    <span className="app-brand__name">cholo<span>Campus</span></span>
  </span>;
}
