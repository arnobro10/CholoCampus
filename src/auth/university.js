export const UNIVERSITY_DOMAINS = Object.freeze(['g.bracu.ac.bd', 'bracu.ac.bd']);
export const NATIVE_AUTH_CALLBACK = 'com.nexasity.campuspool://auth/callback';

export function authCallbackFailure(value) {
  try {
    const url = new URL(value);
    const params = url.searchParams.has('error') ? url.searchParams : new URLSearchParams(url.hash.slice(1));
    if (!params.has('error')) return '';
    return [params.get('error_code'), params.get('error_description'), params.get('error')].filter(Boolean).join(': ');
  } catch { return ''; }
}

export function universityAccessFailure(message = '') {
  // The database trigger's rejection is wrapped by Auth as a generic signup failure.
  return /BRAC University|university account|Database error saving new user/i.test(message);
}

export function universityEmail(email) {
  const match = typeof email === 'string' && email.trim().match(/^[^@\s]+@([^@\s]+)$/);
  return Boolean(match && UNIVERSITY_DOMAINS.includes(match[1].toLowerCase()));
}

// Defense in depth only: the server also enforces eligibility through RLS.
export function eligibleGoogleUser(user) {
  return Boolean(user?.email_confirmed_at && universityEmail(user.email) &&
    user.identities?.some(identity => identity.provider === 'google' &&
      String(identity.identity_data?.email_verified) === 'true' &&
      identity.identity_data?.email?.toLowerCase() === user.email.toLowerCase()));
}

export function nativeCallbackCode(value) {
  try {
    const url = new URL(value);
    const expected = new URL(NATIVE_AUTH_CALLBACK);
    if (url.protocol !== expected.protocol || url.host !== expected.host || url.pathname !== expected.pathname || url.username || url.password) return null;
    const codes = url.searchParams.getAll('code');
    return codes.length === 1 && codes[0] ? codes[0] : null;
  } catch { return null; }
}
