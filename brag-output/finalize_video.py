"""Select the settled closing shot, bake its thumbnail, and verify the export."""
from pathlib import Path
import subprocess, os, json, shutil

out=Path(__file__).parent
ffmpeg=os.environ.get('HYPERFRAMES_FFMPEG_PATH') or shutil.which('ffmpeg')
ffprobe=os.environ.get('HYPERFRAMES_FFPROBE_PATH') or shutil.which('ffprobe')
if not ffmpeg or not ffprobe:
    raise SystemExit('Set HYPERFRAMES_FFMPEG_PATH and HYPERFRAMES_FFPROBE_PATH.')
video=out/'brag.mp4'
poster=out/'brag.jpg'
subprocess.run([ffmpeg,'-y','-loglevel','error','-ss','25','-i',str(video),'-frames:v','1','-q:v','2',str(poster)],check=True)
baked=out/'brag.poster.mp4'
subprocess.run([ffmpeg,'-y','-loglevel','error','-i',str(video),'-i',str(poster),'-filter_complex',"[0:v][1:v]overlay=0:0:enable='eq(n,0)'[v]",'-map','[v]','-map','0:a?','-c:v','libx264','-crf','18','-preset','medium','-pix_fmt','yuv420p','-c:a','copy','-movflags','+faststart',str(baked)],check=True)
data=json.loads(subprocess.check_output([ffprobe,'-v','error','-show_format','-show_streams','-of','json',str(baked)]))
v=next(s for s in data['streams'] if s['codec_type']=='video')
a=next(s for s in data['streams'] if s['codec_type']=='audio')
assert (v['width'],v['height'])==(1920,1080)
assert v['codec_name']=='h264' and v['pix_fmt']=='yuv420p'
assert a['codec_name']=='aac'
assert v['r_frame_rate']=='30/1' and int(v['nb_frames'])==810
assert abs(float(data['format']['duration'])-27)<.05
baked.replace(video)
(out/'verification.json').write_text(json.dumps(data,indent=2),encoding='utf-8')
decoded=out/'decoded'
decoded.mkdir(exist_ok=True)
for at in [0,2.5,7.5,12.8,19,25]:
    subprocess.run([ffmpeg,'-y','-loglevel','error','-ss',str(at),'-i',str(video),'-frames:v','1',str(decoded/f'frame-{at}.png')],check=True)
print(f'Verified {video}: 1920x1080, 30fps, 810 frames, 27 seconds, H.264/AAC, {video.stat().st_size:,} bytes.')
