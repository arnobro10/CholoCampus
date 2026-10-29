# choloCampus — BRACU Ride Sharing MVP

A product of [Nexasity](https://nexasity.pages.dev/).

A campus ride-sharing prototype for BRAC University students in Dhaka. Find or offer rides, request seats, and coordinate shared commutes through a responsive map-based interface.

**Topics:** `ride-sharing` · `carpooling` · `brac-university` · `campus` · `dhaka` · `react` · `vite` · `leaflet` · `capacitor` · `android`

## UI preview

![choloCampus ride-sharing interface with ride search, offer cards, and a Dhaka map](docs/desktop-preview.png)

*Earlier desktop UI preview; the screenshot uses the original CampusPool branding.*


## Current UI and maps

The running preview is React, with a reference-inspired black/lime interface,
light appearance toggle, responsive floating navigation, and labeled ride markers.
The requested Flutter migration has not been implemented; Flutter is not installed
in the inspected environment.

Mapbox dark tiles are rendered through React Leaflet. Set `VITE_MAPBOX_TOKEN`
in `.env.local` using a public token and restart Vite. `.env.example` documents
the field; `.env.local` is ignored by Git. Public client tokens are visible in
the browser bundle: restrict the token to your local and deployed web origins
in your Mapbox account. Never place a secret Mapbox token here.

Without a token the map explicitly shows an OpenStreetMap preview. Mapbox tile
errors display a notice. Mapbox usage is subject to its account plan and quotas.

Design guidance used:
- https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md
- https://github.com/bowen31337/apple-design/blob/main/SKILL.md

Apple-design CSS tokens are included in `src/apple-tokens.css`; the Mapbox logo
rule is from Mapbox GL JS v3.15.0's official stylesheet.

A runnable **front-end prototype** based on the uploaded BRAC University student ride-sharing plan.

## Run locally

Requires Node.js 20+.

On Windows PowerShell, use `npm.cmd install`, `npm.cmd run dev`, and
`npm.cmd run build` if PowerShell blocks `npm.ps1`.

Run the timezone and departure validation checks with:

```bash
node --test src/schedule.test.js
```

The local prototype now scopes the selected conversation to the current demo
profile, validates bike capacity and campus direction, checks departure times
again when requesting seats, and retains cancelled offers and their conversations.
Sample ride identifiers include the ride date so new daily samples do not reuse
previous days' requests. These client-side checks are not server authorization.

Next steps: verify the full interface in a browser, add offer editing and labeled
map markers, then introduce a shared database with transactional seat acceptance.
Confirm the accepted university email domains before configuring Google login.

```bash
npm install
npm run dev
```

Open the local address shown by Vite (typically http://localhost:5173).

To build for production hosting:

```bash
npm run build
```

## Included

- Responsive desktop/mobile ride-sharing user interface
- OpenStreetMap map via Leaflet, including red (to campus) and green (from campus) ride markers
- 9:00 PM Bangladesh-time rollover: from 9 PM to 8:59 PM the following day, the board displays that following day's offers
- Posting offers at any point in that period provided departure time is still in the future
- Vehicle type, pickup, destination, departure, seat count, and notes
- Request a seat, negotiate by local demo chat, accept/decline requests, and reduce seats on acceptance
- My Rides, profile, and sample ride cards
- localStorage saving for demo changes

## Important limitations (not ready to deploy for real university use)

This is a **single-browser demo**, not a connected multi-user service. Seeded riders are fictitious; they will not receive messages or accept requests. The demo login is **not Google authentication** and does not verify BRAC University affiliation. Posts, seat requests, and chat are stored locally in the current browser only. Map tiles and fonts require internet access.

Before a real launch, add:

1. Google Workspace OAuth with backend verification of BRAC University email domain and identity.
2. Hosted database (e.g., PostgreSQL/Supabase), with row-level access policies and real-time updates.
3. Secure real-time chat, actual seat booking transactions, double-booking protection, alerts, and cancellation policy.
4. Driver/vehicle verification, reporting, moderation, privacy safeguards, and university/legal approval as applicable.
5. Server-side time enforcement with `Asia/Dhaka` timezone. Current time checks are client-side only.
6. Geocoding/map location picking and route matching. This demo uses a curated set of Dhaka-area locations.

## Daily rollover specification

- Example: Monday 9:00 PM → Tuesday 8:59 PM: board shows **Tuesday** rides.
- Students may post new Tuesday offers, request seats, and discuss fares throughout that window.
- A newly posted ride must depart later than the current Bangladesh local time.
- At Tuesday 9:00 PM, the board changes to **Wednesday** rides.
- Historic bookings remain accessible in My Rides and Messages.

## Tech stack

React 19, Vite 7, React Leaflet / Leaflet, Lucide React. No server or credentials required for this demo.

Typography uses locally bundled Poppins (400, 500, 600, 700); its OFL license is in public/assets/Poppins-OFL.txt. UI icons use Flaticon Uicons Regular Rounded, with visible footer attribution as required by https://www.flaticon.com/uicons/get-started/.

## Latest test build

Find Ride now opens directly on the map with floating search and an expandable ride list. In Offer Ride, going to campus locks the destination to BRAC University; returning locks the pickup to BRAC University. Server-independent frontend validation also enforces these endpoints.

The preferred destination picker supports searching the curated Dhaka locations or naming a map pin. It saves per demo profile and allows two saves per Bangladesh calendar day, resetting at midnight (separate from the 9 PM ride-board rollover). Optional nearby filtering uses a 3 km radius around the non-campus end of each ride. This is client-only enforcement. Full address search, reverse geocoding, live GPS, route directions and server persistence are not implemented.

The new choloCampus logo is in public/brand/cholocampus-logo.png. The Android test build is artifacts/choloCampus-test.apk.

The default map screen now shows only a single floating Where to? search bar and compact navigation. Typing opens curated location suggestions and matching rides; selecting a location recenters the map. Filters and preferred destinations remain in the expandable search drawer. Tap the map, press Escape, or close results to return to the uncluttered map. Product and Flaticon credits are available in the menu and on other screens; Mapbox attribution stays on the map.

Appearance follows the system light/dark preference automatically, including live changes. The manual toggle is removed. Mapbox light-v11/dark-v11 tiles, form controls, browser chrome and Android splash/system bars follow the same preference.

The choloCampus wordmark uses the locally bundled Caveat handwriting font; the rest of the interface keeps Poppins. Caveat license: public/assets/Caveat-OFL.txt.
