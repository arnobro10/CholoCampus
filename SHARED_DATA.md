# Shared Supabase data

Project: ammqfimreqdfauoctiea, Nexasity (Mumbai).

## Tables

- `profiles`: private university member profile, linked to Auth.
- `rides`: shared offers, owner display name, direction, campus endpoint, departure, capacity, remaining seats, notes and cancellation status.
- `ride_requests`: one request per passenger per ride, owner/passenger names, status and timestamps.
- `messages`: conversation history linked to a request. Null sender means a database-generated system message.
- `preferred_destinations`: account-specific location, coordinates and server-enforced daily change counter.

## Access and consistency

All tables use RLS. Only a confirmed university Google identity with an active Auth session can use the shared data. All members can view rides. Only the owner and passenger can view a request and its messages. Preferred destinations and profiles remain private to their owners. Email is not exposed on rides or chat.

Clients have no direct insert/update/delete rights on shared tables. Public invoker RPCs delegate to private functions that verify the current university member before each operation. They derive ownership and display names on the server. Request acceptance locks the ride and request, updates seats and creates the system message atomically. Repeated decisions do not consume extra seats. Cancellation updates requests and preserves messages. Nonparticipants cannot send messages, and declined/cancelled conversations are closed.

The server enforces future departures on the active Dhaka ride board, the fixed campus endpoint, vehicle seat limits, and two destination changes per Dhaka calendar day. Source migration: `supabase/migrations/20261029192547_shared_rides_and_messages.sql`.

## Client behavior

All app data comes from Supabase and remains in React memory while displayed. There are no localStorage reads/writes for rides, requests, messages or destinations, and no sample riders. The existing Google session remains persisted by Supabase Auth to keep users signed in; this is not a local ride database.

The visible app refreshes shared data every five seconds and when brought back into focus. This is polling, not a Realtime subscription or push notification service. Failed saves show an error and preserve drafts; successful saves trigger a fresh fetch. No offline write queue is provided. Account changes clear the visible data immediately. Results are paginated to avoid the API's default 1,000-row truncation.

Historical browser-only demo records are not automatically uploaded or deleted. They may include fictitious identities and cannot safely be attributed to real university accounts. Existing legacy storage is no longer read by the app. Publish real offers again through the connected app.

## Verification

- Twelve Node tests cover auth, schedule, destinations, cloud mapping, pagination, and API failures.
- Hosted transaction test `supabase/tests/shared_data.sql` exercises three temporary university members: publishing, requesting, duplicate retry, private chat, acceptance, preventing overselling, decline, cancellation, destination privacy and daily limit, direct-write denial and invalid-session denial. The entire test rolls back, including Auth fixtures.
- Anonymous HTTP reads returned 401 for all four new tables.
- Supabase security advisors found no table/function findings. An Auth configuration warning remains for disabled leaked-password protection; this app only accepts Google university identities. Reference: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Web production build passes. Real two-phone testing with eligible Google accounts remains required.

## Campus location

The shared `src/campus.js` coordinate points at the Merul Badda campus centre (23.77308, 90.42447), based on OpenStreetMap campus footprint https://www.openstreetmap.org/way/1239676644 and the official address https://www.bracu.ac.bd/contact. This is a campus marker, not a confirmed car pickup gate. The old point (23.7808, 90.4254) was approximately 860 metres north.
