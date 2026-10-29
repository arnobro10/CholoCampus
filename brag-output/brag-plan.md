# CholoCampus launch film

1. App: campus ride sharing for BRAC University in Dhaka.
2. Strongest source claim: "Better commutes, together."
3. Visual hook: a shared journey from home to BRACU, in the source black/lime palette.
4. Show the source search bar, direction tabs, ride details, request-seat action and messages.
5. Duration: exactly 27 seconds, as explicitly requested.
6. Tone: cinematic startup launch with restrained motion and professional Poppins typography.
7. Audio: upbeat bundled Happy Beats / Business Moves Vol. 10 by Sascha Ende, plus sparse Kenney UI accents.
8. Caption: CholoCampus. Find or offer rides to BRAC University, request a seat, and coordinate pickup in chat.
9. User flow: search for pickup/destination, inspect seats/vehicle/fare, request a seat and coordinate pickup in private chat.

## Source evidence

- src/main.jsx: Find a ride, Offer a ride, My rides, private messages, accept/decline requests; actual UI labels and field structure.
- src/data/fares.js: fare per seat, optional/free/discuss handling.
- src/map-first.css: full map, floating search, markers and floating navigation.
- src/poppins.css and public/assets: local Poppins fonts.
- public/brand/cholocampus-logo.png: actual product logo.
- README.md: prototype status. No claim that public launch, moderation, notifications, payment, live driver tracking or route matching is available.

## Storyboard

| Time | Scene | Visible action / copy | Transition |
| --- | --- | --- | --- |
| 0–4.10 | Hook | Same campus. Share the journey. Home to BRACU line draws. | Directional slide |
| 4.10–10.38 | Search | Your ride. On the map. Where to? becomes Uttara; car/bike markers appear, then a source-shaped ride card. | Directional slide |
| 10.38–15.82 | Details | A seat. A time. A shared commute. Pickup, destination, seats, car, fare. Request seat & chat button presses. | Button-led cut |
| 15.82–21.28 | Chat | Work out the details. Two demo pickup messages arrive; seat request accepted. | Upward panel transition |
| 21.28–27 | Close | Better commutes, together. Find a ride. Offer a ride. Source logo and Nexasity credit. | Hold |

All example ride data, fare and conversation are fictional stand-ins, visibly labeled. The map is explicitly illustrative and is not a route-matching or navigation feature demonstration. No real account or backend write is used.

## Identity and music cues

LOOK: ground #101114; panels #1b1d23; text #f5f5f7; muted #b5b6be; source accent #d5f531; Poppins 400/500/600/700; titles 72–112px; 160px horizontal margins; 30px UI radii.

Music preset: bundled Vol. 10, approximately 109.96 BPM. Marker sequence at 5.19/5.74; major reveal at 15.82 and supporting outro copy at 22.92. Longer holds prioritize readability. Music fades in over 0.3 seconds and out over 1.4 seconds. Sparse low-frequency-risk accents match scene changes. Subtle audio response may affect decorative border brightness only, never readable text.

Music: Sascha Ende, ende.app (CC BY 4.0). Attribution appears in final shot and share copy. Kenney sounds: CC0.
