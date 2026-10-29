import { createClient } from '@supabase/supabase-js';
import { authCallbackFailure } from './university.js';

// Capture rejection details before the SDK consumes the OAuth callback URL.
export const initialAuthFailure = authCallbackFailure(window.location.href);

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
export const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
export const authConfigured = Boolean(supabaseUrl?.startsWith('https://') && publishableKey?.startsWith('sb_publishable_'));
export const supabase = authConfigured ? createClient(supabaseUrl, publishableKey, {
  auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true, storageKey: 'cholocampus-auth' },
}) : null;
