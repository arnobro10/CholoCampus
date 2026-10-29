# Export verification

- Final local file: brag.mp4, 2,257,426 bytes.
- FFprobe: H.264, yuv420p, 1920×1080, 30fps, 810 frames, exactly 27.00 seconds; AAC audio.
- Audio decode / volume scan: mean -19.7 dBFS, peak -4.0 dBFS. The mixed track is present and does not clip.
- HyperFrames 0.8.216 check: passed; zero lint errors/warnings, zero runtime errors, zero layout errors, zero contrast errors, zero craft warnings. All 66 sampled visible-text checks passed. Audio audit passed with zero errors.
- Runtime advisory: the 0.09-second click source occupies a 0.25-second slot; renderer shortens it to its source length. This is intentional padding and adds no sound after the click ends.
- Four layout information notices occur during intentional scene exits; settled snapshots were reviewed.
- Reviewed all five scene midpoint snapshots and final hold, then decoded final MP4 frames at 0, 2.5, 7.5, 12.8, 19 and 25 seconds. Confirmed the closing poster is frame zero.
- Repository validation: Vite production build passed, with its existing chunk-size advisory; 14 schedule, destination, fare, shared-data and university-auth tests passed. Python helpers compile; staged whitespace check passed.
- Render used existing local Chrome headless shell 152.0.7977.54 and full FFmpeg. A pinned browser installer lock delayed startup; explicit browser path and a single-worker foreground render completed successfully.
- No real booking, user account or backend data was changed. All example ride/chat values are labeled demos; map is labeled illustrative.
- Video, poster, rendered snapshots, downloaded assets, binaries and caches are excluded from Git. The editable composition, storyboard, attribution and rebuild/finalization scripts are included.
