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

- Eighteen Node tests cover auth, schedule, destinations, cloud mapping, pagination, and API failures.
- Hosted transaction test `supabase/tests/shared_data.sql` exercises three temporary university members: publishing, requesting, duplicate retry, private chat, acceptance, preventing overselling, decline, cancellation, destination privacy and daily limit, direct-write denial and invalid-session denial. The entire test rolls back, including Auth fixtures.
- Anonymous HTTP reads returned 401 for all four new tables.
- Supabase security advisors found no table/function findings. An Auth configuration warning remains for disabled leaked-password protection; this app only accepts Google university identities. Reference: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Web production build passes. Real two-phone testing with eligible Google accounts remains required.

## Campus location

The shared `src/campus.js` coordinate points at the Merul Badda campus centre (23.77308, 90.42447), based on OpenStreetMap campus footprint https://www.openstreetmap.org/way/1239676644 and the official address https://www.bracu.ac.bd/contact. This is a campus marker, not a confirmed car pickup gate. The old point (23.7808, 90.4254) was approximately 860 metres north.

## Ride fares

Offers may include an optional fare in BDT per seat. Blank/NULL means discuss with the owner, zero means free, and paid fares accept up to two decimal places. The UI displays the fare on cards, details, My Rides, and conversation headers. The server validates the amount before storing it in `rides.fare`. New clients use the guarded `publish_ride` RPC; the existing `create_ride` API remains available for older builds and creates rides with no specified fare. There is no in-app payment processing.

## Ride location picker

Editable pickup and destination fields open a native modal dialog with typed place search, matching quick locations, a draggable map under a fixed centre pin, an editable location name, and explicit confirmation. Search is submitted with the Search button or Enter rather than firing a request for each keystroke. It queries Photon's public OSM geocoder, bounded to Dhaka, with cancellation, timeout, in-memory query reuse, and an optional `VITE_GEOCODER_URL` override. CORS and real Dhaka results were checked against the live endpoint. Public Photon service usage must remain reasonable and has no availability guarantee; deploy a dedicated compatible instance for higher traffic. Source: https://github.com/komoot/photon . Map dragging and naming a pin remain available if search fails. Mapbox still supplies map tiles.

Supabase stores pickup_lat/pickup_lng/destination_lat/destination_lng. The guarded `publish_ride_at_locations` RPC validates both points, fare, and fixed campus geometry before publishing atomically. Old APIs remain available for previous APKs. Known legacy labels are backfilled; unknown legacy addresses are not assigned invented coordinates. Shared markers and nearby filtering use the saved points. Student destinations in this picker are route endpoints; the separate preferred-destination daily limit does not limit ride pickup/destination editing.

To campus locks both the label and coordinates of the destination to BRACU. From campus locks both pickup label and coordinates. Unit and hosted rollback integration tests cover both directions, custom-point persistence, outside-Dhaka rejection, and fixed-campus validation. Actual phone drag/keyboard testing remains required.


## One active offer and explicit location selection

Migration `20261029203735_one_active_ride_per_owner.sql` adds a trigger shared by all publishing APIs. It serializes publishing per profile and rejects a second future, uncancelled offer, including sold-out offers. Cancelling or reaching departure time releases the limit. Existing duplicate offers are preserved; new offers remain blocked until they are cancelled or depart.

This migration has been applied to the hosted database. `supabase/tests/one_active_ride.sql` is a rollback test for duplicate rejection, sold-out offers, cancellation and historical rides. Both the one-active-ride and shared-data rollback tests passed on the hosted database while preparing Android 0.12-test. The shared-data integration fixtures now cancel each temporary offer before creating the next.

Ride location confirmation now requires selecting a search result or explicitly moving/clicking the map. Typing a new query invalidates confirmation, and the chosen place name is read-only so editing text cannot silently relabel unrelated coordinates. Preferred map-pin labels are explicitly described as labels, not address searches.
