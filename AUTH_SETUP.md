# Google login setup for choloCampus

Supabase project: `ammqfimreqdfauoctiea` (Nexasity, Mumbai).

## Google Auth Platform

1. Open https://console.cloud.google.com/auth/overview and select or create the Google Cloud project that will own choloCampus.
2. Configure branding with the app name choloCampus, support contact, and developer contact. Add privacy/terms URLs before launch.
3. Choose External audience unless the project is owned by the BRAC University Workspace organization and an administrator has authorized Internal use. While testing, add the student/faculty test accounts you will use.
4. Include only `openid`, `email` and `profile` scopes for this login.
5. Create an OAuth client of type **Web application**. The current Android app uses browser-based OAuth with PKCE, so this client also serves the packaged app.
6. Add development JavaScript origins:
   - `http://127.0.0.1:5173`
   - `http://localhost:5173`
7. Add the exact authorized redirect URI:
   - `https://ammqfimreqdfauoctiea.supabase.co/auth/v1/callback`

## Supabase Dashboard

1. Open https://supabase.com/dashboard/project/ammqfimreqdfauoctiea/auth/providers?provider=Google.
2. Enable Google and paste the Web client ID and client secret directly into the Dashboard. Never place the client secret in a `VITE_` variable or Git.
3. Leave nonce validation enabled and do not allow accounts without email.
4. In Authentication > URL Configuration, set the development Site URL to `http://127.0.0.1:5173`.
5. Add these exact allowed redirect URLs:
   - `http://127.0.0.1:5173/`
   - `http://localhost:5173/`
   - `com.nexasity.campuspool://auth/callback`
6. Save and refresh the app. The Google sign-in button becomes available once the public Auth settings report that Google is enabled.
7. Before launch, add your actual deployed app origin and callback URL, update Site URL, and complete Google's production/branding requirements. The Nexasity company website is not automatically the app's redirect destination.

## Client environment

Copy `.env.example` to `.env.local` and set the project's public URL and **publishable** key. Never use a service-role/secret key in the client. The configured URL/key are already present locally, but are intentionally not committed. Restart Vite after changing environment values.

## Implemented security

- Auth signup/update trigger restricts Google accounts to the exact domains `g.bracu.ac.bd` and `bracu.ac.bd`. The student domain was checked against https://cse.bracu.ac.bd/evaluation; faculty accounts appear at https://cse.bracu.ac.bd/faculty_list.
- Profile RLS checks ownership, confirmed university email, a matching verified Google identity, and an active server session. It does not trust editable user metadata for authorization.
- Display names from Google are cosmetic only. Profile rows do not expose email to other users.
- Browser and Android use PKCE. Android opens OAuth in a system browser and accepts an authorization code only at its exact app callback.
- Cached demo users are not restored as verified sessions. Local demo login has been removed; only verified university Google accounts can establish an app user.

## Verification status

Schema and rejection tests passed on the hosted database. Anonymous profile access returned 401, RLS is enabled, and Supabase security advisors returned no findings. Automated tests cover domains, Google identity matching, callback validation, scheduling, and destination limits.

At implementation time the Google provider was **disabled**. End-to-end Google login has not been tested and requires the client credentials above plus a real eligible account. Test both allowed domains, an outside Google account, account switching, sign-out, expired sessions, browser redirects, and Android app return before launch.

Rides, seat requests, messages, and preferred destinations now use the shared Supabase backend. See SHARED_DATA.md for tables, access rules, refresh behavior, and verification.
