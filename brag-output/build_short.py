"""Create the nine-second cut without overwriting the original film."""
from pathlib import Path
import re, shutil

base=Path(__file__).parent
source=base/'composition'
target=base/'composition-9sec'
target.mkdir(exist_ok=True)
(target/'compositions').mkdir(exist_ok=True)
shutil.copytree(source/'assets', target/'assets', dirs_exist_ok=True)
for name in ['hyperframes.json','package.json']:
    shutil.copy(source/name,target/name)

# Cuts land on the bundled music's beat grid; the close holds for 2.72 seconds.
scenes=[('intro',0,1.37),('find',1.37,1.64),('details',3.01,1.63),('chat',4.64,1.64),('outro',6.28,2.72)]
animations={
'intro':"""
tl.fromTo('#intro-title',{scale:.9,opacity:0},{scale:1,opacity:1,duration:.32,ease:'power4.out'},0);
tl.fromTo('#intro-track',{scaleX:0},{scaleX:1,duration:.6,ease:'power3.inOut'},.15);
tl.fromTo('#intro-stage',{x:0},{x:-1920,duration:.22,ease:'power3.in'},1.15);
""",
'find':"""
tl.fromTo('#find-ui',{scale:.91,x:110},{scale:1,x:0,duration:.35,ease:'power4.out'},0);
tl.set('#find-query',{textContent:'Uttara'},0);
tl.fromTo('#find-pin1',{scale:0},{scale:1,duration:.3,ease:'power4.out'},.05);
tl.fromTo('#find-pin2',{scale:0},{scale:1,duration:.3,ease:'power4.out'},.16);
tl.fromTo('#find-result',{y:45,opacity:0},{y:0,opacity:1,duration:.3,ease:'power4.out'},.21);
""",
'details':"""
tl.fromTo('#details-ui',{scale:1.09},{scale:1,duration:.3,ease:'power3.out'},0);
tl.fromTo('#details-title',{x:-45,opacity:0},{x:0,opacity:1,duration:.28,ease:'power4.out'},0);
tl.fromTo('#details-button',{scale:1},{scale:.95,duration:.12,yoyo:true,repeat:1},1.15);
""",
'chat':"""
tl.fromTo('#chat-ui',{x:-80},{x:0,duration:.3,ease:'power4.out'},0);
tl.fromTo('#chat-a',{x:-35,opacity:0},{x:0,opacity:1,duration:.24,ease:'power4.out'},0);
tl.fromTo('#chat-b',{x:35,opacity:0},{x:0,opacity:1,duration:.24,ease:'power4.out'},.25);
tl.fromTo('#chat-confirm',{opacity:0},{opacity:1,duration:.2},.6);
""",
'outro':"""
tl.fromTo('#outro-title',{y:45,opacity:0},{y:0,opacity:1,duration:.35,ease:'power4.out'},0);
tl.fromTo('#outro-actions',{scale:.92,opacity:0},{scale:1,opacity:1,duration:.3,ease:'power4.out'},.2);
"""}

for name,start,duration in scenes:
    html=(source/'compositions'/f'{name}.html').read_text(encoding='utf-8')
    html=re.sub(r' data-hf-id="[^"]*"','',html)
    html=re.sub(r'<script>.*?</script>',f'<script>const tl=gsap.timeline({{paused:true}});\n// beat-locked scene cut at {start}s\n{animations[name]}\nwindow.__timelines["{name}"]=tl;</script>',html,flags=re.S)
    replacements={
      'intro': [('Same campus.<br><span class="lime">Share the journey.</span>','Campus rides.<br><span class="lime">Shared.</span>'),('Rides to and from BRAC University.','BRAC University · Dhaka')],
      'find': [('Your ride.<br><span class="lime">On the map.</span>','Find <span class="lime">a ride.</span>'),('Search pickup or destination.<br>To campus. From campus.','To campus. From campus.')],
      'details': [('A seat.<br>A time.<br><span class="lime">A shared commute.</span>','Request<br><span class="lime">a seat.</span>'),('See the route, available seats,<br>vehicle, and fare per seat.','Route. Seats. Fare.')],
      'chat': [('Work out<br><span class="lime">the details.</span>','Plan your<br><span class="lime">pickup.</span>'),('Private chat for pickup and fare.<br>Accept or decline seat requests.','Coordinate in private chat.'),('Meet at the pickup point?','Pickup point?'),('Yes, see you at 8:30.','See you there.')],
      'outro': []
    }
    for old,new in replacements[name]:
        assert old in html, (name,old)
        html=html.replace(old,new)
    html=html.replace('8:30 AM · 2 seats · Car','2 seats · Car')
    html=html.replace('Seat request accepted','Request accepted')
    # Kill unused decorative cursor CSS so the renderer can use its fast path.
    html=re.sub(r'\.cursor\{[^}]*\}', '',html)
    (target/'compositions'/f'{name}.html').write_text(html,encoding='utf-8')

hosts=''.join(f'<div id="{n}" class="clip" data-composition-id="{n}" data-composition-src="compositions/{n}.html" data-start="{s}" data-duration="{d}" data-track-index="1" data-track-kind="graphics" data-width="1920" data-height="1080"></div>' for n,s,d in scenes)
audio='<audio id="music" class="clip" src="assets/music.mp3" data-start="0" data-duration="9" data-volume=".7" data-fade-in=".1" data-fade-out=".6" data-track-index="2"></audio>'
for i,t in enumerate([1.37,3.01,4.64,6.28]):
    audio+=f'<audio id="hit{i}" class="clip" src="assets/soft.ogg" data-start="{t}" data-duration=".18" data-volume=".3" data-track-index="3"></audio>'
audio+='<audio id="click" class="clip" src="assets/click.ogg" data-start="4.16" data-duration=".09" data-volume=".25" data-track-index="4"></audio>'
root=f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><script src="assets/gsap.min.js"></script><style>*{{margin:0;box-sizing:border-box}}html,body{{width:1920px;height:1080px;overflow:hidden;background:#101114}}#root{{position:relative;width:1920px;height:1080px}}</style></head><body><div id="root" data-composition-id="main" data-start="0" data-duration="9" data-width="1920" data-height="1080">{hosts}{audio}</div><script>window.__timelines=window.__timelines||{{}};window.__timelines.main=gsap.timeline({{paused:true}});</script></body></html>'''
(target/'index.html').write_text(root,encoding='utf-8')
print('Built nine-second cut: 5 shots, beat-aligned cuts, animated UI.')
