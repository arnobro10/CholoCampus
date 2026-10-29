import React from 'react';
import { ArrowRight, ShieldCheck } from '../Icons.jsx';

export default function LoginPanel({ auth }) {
  return <main className="content auth-page"><div className="auth-card university-login">
    <img className="login-logo" src="/brand/cholocampus-logo.png" width="56" height="56" alt="choloCampus"/>
    <h1>Your campus.<br/>Your community.</h1>
    <p>Sign in with your BRAC University Google account. Open to students and faculty.</p>
    <button className="google-signin" disabled={auth.loading || !auth.providerReady} onClick={auth.signIn}><span className="google-letter" aria-hidden="true">G</span>{auth.loading ? 'Checking sign-in…' : 'Log in with G Suite'}<ArrowRight size={18}/></button>
    {auth.providerChecked && !auth.providerReady && <p className="auth-setup-note">Google sign-in is being set up. Real university login is not available yet.</p>}
    {!auth.providerChecked && <p className="auth-setup-note" role="status">Checking the sign-in service…</p>}
    {auth.error && <p className="auth-error" role="alert">{auth.error}</p>}
    <div className="security-note"><ShieldCheck size={18}/><span>For @g.bracu.ac.bd and @bracu.ac.bd accounts. Google verifies your identity; the server checks university access.</span></div>
  </div></main>;
}
