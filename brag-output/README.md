# CholoCampus promotional video

Nine-second version: `brag-9sec.mp4`, with a separate editable project in `composition-9sec`. It uses animated map markers, a result-card reveal, a button press, staggered chat bubbles and beat-aligned cuts. The original 27-second file remains available.

Rebuild the short version with `python brag-output/build_short.py`, run HyperFrames check/render from `composition-9sec` with output `../brag-9sec.mp4`, then run `python brag-output/finalize_video.py --stem brag-9sec --seconds 9 --poster-at 8` from the repository root.

Final local output: `brag.mp4`. Landscape, 1920×1080, 30fps, 27 seconds, H.264 with AAC music. `brag.jpg` is the selected closing brand frame, also inserted as the video's first frame for player thumbnails.

The film uses the actual logo and Poppins assets, and recreates source UI at video scale. The map is illustrative. Example rides, fares and chat are labeled as demos. The film does not assert public availability, payment support, driver tracking, notifications or route matching.

## Edit or rebuild

The five editable scenes are under `composition/compositions/`. Their timing is in `composition/index.html`. `build_video.py` is the canonical generator, so edit it when a change must survive regeneration.

Set `BRAG_SKILL_DIR` to the installed Brag skill directory if it differs from the default. Run `python brag-output/build_video.py` from the repository root to copy fonts/logo/music/SFX into the ignored assets directory and download the pinned GSAP runtime. The compact checked-in `audio-envelope.json` preserves the music analysis used for subtle UI border response.

From `brag-output/composition`:

```powershell
npm.cmd run check
npx.cmd hyperframes@0.8.216 preview --background
npx.cmd hyperframes@0.8.216 render --quality delivery --fps 30 --workers 2 --output ../brag.mp4
```

After rendering, run `python brag-output/finalize_video.py` from the repository root. It selects the settled closing shot at 25 seconds, inserts it as frame zero, preserves the audio, verifies the stream metadata and saves decoded frames for visual review. Run this once on a fresh render.

Rendering requires full FFmpeg, FFprobe and Chrome. Point `HYPERFRAMES_FFMPEG_PATH`, `HYPERFRAMES_FFPROBE_PATH` and `HYPERFRAMES_BROWSER_PATH` at existing binaries if they are not discoverable. The minimal Remotion FFmpeg build lacks raw-audio muxers; use a full build for rendering and audio verification.

Generated video, poster, snapshots, reports, caches and downloaded dependencies stay local and out of Git.

## Attribution

Music: Happy Beats / Business Moves Vol. 10 by Sascha Ende, https://ende.app/en, CC BY 4.0. License: https://ende.app/en/standard-license. Excerpt trimmed to 27 seconds, level adjusted, fade-in/out added. Credit appears on screen and in share-copy.txt.

Sound effects: Kenney UI / impact collection, CC0, https://kenney.nl/.

GSAP 3.14.2 is downloaded from jsDelivr; keep its bundled license notice with the local runtime. Product logo and font files are copied from this repository.
