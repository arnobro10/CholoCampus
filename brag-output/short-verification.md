# Nine-second export validation

- Output: brag-9sec.mp4, 792,639 bytes; original brag.mp4 preserved.
- FFprobe assertions passed: 1920×1080, 30fps, 270 frames, 9.00 seconds, H.264/yuv420p video and AAC audio.
- HyperFrames check passed: zero lint, runtime, layout, contrast or audio errors; all 61 sampled text contrast checks passed; zero craft warnings after shortening two UI labels.
- All five scene snapshots and closing hold reviewed. Decoded export frames checked after finalization; selected closing poster at 8 seconds baked into frame zero.
- Cuts: 1.37, 3.01, 4.64 and 6.28 seconds. Animated route line, title scale, map markers, result card, button press and chat bubbles.
- Python helpers compile and git whitespace check passes. No application code changed.
- Uses the newly installed FFmpeg/FFprobe 9.0.2 and existing Chrome headless shell. Editable preview: http://localhost:3003/#project/composition-9sec
