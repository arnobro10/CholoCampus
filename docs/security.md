# Security model

CholoCampus is a React/Capacitor client that talks directly to Supabase. It does not currently have a custom API server, admin area, or webhook consumer. Supabase Auth, PostgreSQL RLS, and guarded database functions enforce the server-side checks.

## Keys and secrets

The app bundle may contain `VITE_SUPABASE_URL`, the Supabase publishable key, and the Mapbox public access token. These are public client values. Restrict the Mapbox token to the app's required APIs and allowed origins where possible.

Never put a Supabase secret/service-role key, OAuth client secret, signing key, or other private credential in a `VITE_` variable or the mobile app. Vite embeds `VITE_` values in the client bundle. This repository has no custom backend to hold server secrets today. If a server-only integration is added, put it in a Supabase Edge Function, store its secret with `supabase secrets set EXTERNAL_API_SECRET=...`, and read it with `Deno.env.get('EXTERNAL_API_SECRET')`. Keep service-role access inside trusted server code and still verify the caller's identity and permissions before using it.

## Database access and ownership

The migrations enable RLS on every app table:

```sql
alter table public.profiles enable row level security;
alter table public.rides enable row level security;
alter table public.ride_requests enable row level security;
alter table public.messages enable row level security;
alter table public.preferred_destinations enable row level security;
```

The migrations revoke direct writes to rides, ride requests, messages, and saved destinations from `public`, `anon`, and `authenticated`; authenticated users get read access through RLS and mutations use RPCs that call `private.require_member()` and check the relevant owner or conversation participants. Profiles allow only a user's own profile creation and updates to explicitly granted columns. Profiles and saved destinations are private to their user. Ride requests are readable by their requester and ride owner, and messages by participants in that request. Rides are readable by verified university members so they can discover rides; restricting ride reads to the owner would break the ride board.

The database also checks the authenticated Google identity, verified university email domain, and active session in `private.is_university_member()`. Do not replace these checks with client-only checks. The client checks only improve the sign-in experience.

## Authentication and signup abuse

The app signs in through Google OAuth. A database trigger rejects new or updated Auth users unless their provider is Google and their email domain is `g.bracu.ac.bd` or `bracu.ac.bd`. App access additionally requires a confirmed email and a verified matching Google identity.

`supabase/config.toml` now sets Supabase Auth's sign-in/signup rate to 10 requests per 5 minutes per IP. Supabase Auth uses a token bucket that can still allow short bursts of up to 30 requests, so this slows sustained attempts rather than capping every burst at 10. This app has no separate registration endpoint. The stricter rate can affect many users who share one campus IP. Review it against real campus usage and adjust only if legitimate sign-ins are being throttled. Supabase Auth can also use CAPTCHA, but enabling it requires configuring a provider and adding its client token flow.

To apply the local auth configuration to the hosted project, first link the intended project and inspect the proposed changes, then push the configuration:

```sh
supabase link --project-ref YOUR_PROJECT_REF
supabase config diff
supabase config push
```

Database migrations are separate from Auth configuration. Apply pending migrations with `supabase db push --remote` after reviewing the target project. Do not assume a GitHub push has applied either configuration or migrations to Supabase.

## Admin routes and webhooks

There are no admin endpoints or admin role in this app today, so there is no admin route to wrap in RBAC middleware. If an admin feature is added, enforce authorization in a trusted server function or database function, verify the authenticated user's role on every request, and do not trust a role supplied by the client.

The app has no webhook consumer. If one is added, verify its provider signature against the unmodified request body using a server-only signing secret before processing the event.
