import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as NativeApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { initialAuthFailure, authConfigured, publishableKey, supabase, supabaseUrl } from './client.js';
import { authCallbackFailure, universityAccessFailure, eligibleGoogleUser, nativeCallbackCode, NATIVE_AUTH_CALLBACK } from './university.js';

export default function useUniversityAuth() {
  const [accessDenied, setAccessDenied] = useState(() => universityAccessFailure(initialAuthFailure));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(authConfigured);
  const [error, setError] = useState('');
  const [providerReady, setProviderReady] = useState(false);
  const [providerChecked, setProviderChecked] = useState(false);
  useEffect(() => {
    if (!supabase) { setProviderChecked(true); return; }
    let alive = true, revision = 0, callbackBusy = false;
    let listener;
    const timers = new Set();
    const validate = async () => {
      const current = ++revision;
      setLoading(true);
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!sessionData.session) { if (alive && current === revision) setUser(null); return; }
        const { data, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!eligibleGoogleUser(data.user)) {
          if(alive) { setAccessDenied(true); setUser(null); setError('Use your BRAC University student or faculty Google account.'); }
          await supabase.auth.signOut({ scope: 'local' });
          throw new Error('Use your BRAC University student or faculty Google account.');
        }
        const id = data.user.id;
        let result = await supabase.from('profiles').select('id, display_name').eq('id', id).maybeSingle();
        if (result.error) throw result.error;
        if (!result.data) {
          const name = (data.user.user_metadata?.full_name || data.user.email.split('@')[0]).trim().slice(0, 100) || 'University member';
          result = await supabase.from('profiles').insert({ id, display_name: name }).select('id, display_name').single();
          if (result.error?.code === '23505') result = await supabase.from('profiles').select('id, display_name').eq('id', id).single();
        }
        if (result.error || !result.data) throw new Error('University access could not be verified. Please sign out and try again.');
        if (alive && current === revision) {
          setUser({ id, name: result.data.display_name, email: data.user.email, verified: true, authProvider: 'google' });
          setError('');
        }
      } catch (failure) {
        if (alive && universityAccessFailure(failure.message)) setAccessDenied(true);
        if (alive && current === revision) { setUser(null); setError(failure.message || 'Sign-in could not be verified. Check your connection and try again.'); }
      } finally { if (alive && current === revision) setLoading(false); }
    };
    const queueValidation = () => {
      // Supabase auth callbacks must finish before calling other auth methods.
      const timer = setTimeout(() => { timers.delete(timer); if (alive) void validate(); }, 0);
      timers.add(timer);
    };
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') { ++revision; if (alive) { setUser(null); setLoading(false); } }
      else if (session) queueValidation();
    });
    const controller = new AbortController();
    fetch(`${supabaseUrl}/auth/v1/settings`, { headers: { apikey: publishableKey }, signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Sign-in service is unavailable.'); return response.json(); })
      .then(settings => { if (alive) setProviderReady(settings.external?.google === true); })
      .catch(failure => { if (alive && failure.name !== 'AbortError') setError('Unable to check Google sign-in. Check your connection.'); })
      .finally(() => { if (alive) setProviderChecked(true); });
    const handleCallback = async value => {
      let url;
      try { url = new URL(value); } catch { return; }
      const expected = new URL(NATIVE_AUTH_CALLBACK);
      if (url.protocol !== expected.protocol || url.host !== expected.host || url.pathname !== expected.pathname) return;
      const callbackFailure = authCallbackFailure(value);
      if (callbackFailure) {
        if (alive) { setError('Google sign-in was not completed. Please use your university account or try again.'); if (universityAccessFailure(callbackFailure)) setAccessDenied(true); }
        await Browser.close().catch(() => {});
        return;
      }
      const code = nativeCallbackCode(value);
      if (!code || callbackBusy) return;
      callbackBusy = true;
      try {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
        await Browser.close().catch(() => {});
        queueValidation();
      } catch (failure) { if (alive) { if (universityAccessFailure(failure.message)) setAccessDenied(true); setError('Google sign-in could not finish. Please try signing in again.'); } }
      finally { callbackBusy = false; }
    };
    if (Capacitor.isNativePlatform()) {
      void NativeApp.addListener('appUrlOpen', event => { void handleCallback(event.url); }).then(handle => { if (alive) listener = handle; else void handle.remove(); });
      void NativeApp.getLaunchUrl().then(value => { if (alive && value?.url) void handleCallback(value.url); });
    }
    void validate();
    return () => { alive = false; ++revision; controller.abort(); subscription.subscription.unsubscribe(); listener?.remove(); timers.forEach(clearTimeout); };
  }, []);

  const signIn = async () => {
    setError('');
    if (!supabase || !providerReady) { setError('Google sign-in is not configured yet.'); return; }
    try {
      const native = Capacitor.isNativePlatform();
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google', options: { redirectTo: native ? NATIVE_AUTH_CALLBACK : `${window.location.origin}/`, skipBrowserRedirect: native, queryParams: { prompt: 'select_account' } },
      });
      if (oauthError) throw oauthError;
      if (native && data.url) await Browser.open({ url: data.url });
    } catch (failure) { setError(failure.message || 'Could not open Google sign-in. Please try again.'); }
  };
  const signOut = async () => {
    if (!supabase) return true;
    const { error: logoutError } = await supabase.auth.signOut();
    if (logoutError) { setError('Sign-out failed. Check your connection and try again.'); return false; }
    setUser(null); setError(''); return true;
  };
  return { accessDenied, dismissAccessDenied: () => setAccessDenied(false), user, loading, error, providerReady, providerChecked, configured: authConfigured, signIn, signOut };
}
