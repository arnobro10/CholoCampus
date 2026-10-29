"""Build the editable, source-grounded CholoCampus launch composition."""
from pathlib import Path
import shutil, urllib.request, json, re, os

OUT = Path(__file__).parent
COMP = OUT / 'composition'
ASSETS = COMP / 'assets'
SKILL = Path(os.environ.get('BRAG_SKILL_DIR', r'C:/Users/RowTECH/.codex/plugins/cache/brag/brag/0.5.0/skills/brag'))
for directory in [ASSETS, COMP/'compositions', ASSETS/'fonts']:
    directory.mkdir(parents=True, exist_ok=True)
for weight in [400,500,600,700]:
    shutil.copy(OUT.parent/f'public/assets/poppins-{weight}.ttf', ASSETS/f'fonts/poppins-{weight}.ttf')
shutil.copy(OUT.parent/'public/brand/cholocampus-logo.png', ASSETS/'logo.png')
shutil.copy(SKILL/'assets/music/happy-beats-business-moves-vol-10-by-ende-dot-app.mp3', ASSETS/'music.mp3')
shutil.copy(SKILL/'assets/sfx/impact/impactSoft_medium_001.ogg', ASSETS/'soft.ogg')
shutil.copy(SKILL/'assets/sfx/ui/click1.ogg', ASSETS/'click.ogg')
urllib.request.urlretrieve('https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js', ASSETS/'gsap.min.js')

CSS = '''
@font-face{font-family:Poppins;src:url('assets/fonts/poppins-400.ttf');font-weight:400}
@font-face{font-family:Poppins;src:url('assets/fonts/poppins-500.ttf');font-weight:500}
@font-face{font-family:Poppins;src:url('assets/fonts/poppins-600.ttf');font-weight:600}
@font-face{font-family:Poppins;src:url('assets/fonts/poppins-700.ttf');font-weight:700}
*{box-sizing:border-box} #root{position:absolute;inset:0;color:#f5f5f7;font-family:Poppins;background:#101114;overflow:hidden}
.stage{position:absolute;inset:0;padding:100px 160px;background:#101114}
.brand{display:flex;align-items:center;gap:18px;font-size:29px;font-weight:600;letter-spacing:-1px}
.brand img{width:64px;height:64px;border-radius:17px;object-fit:contain;background:white}
.top{display:flex;justify-content:space-between;align-items:center}.eyebrow{color:#d5f531;font-size:22px;letter-spacing:3px;font-weight:500}
h1,h2,p{margin:0} h1{font-size:112px;line-height:1.1;letter-spacing:-6px;font-weight:600} h2{font-size:72px;line-height:1.16;letter-spacing:-3px;font-weight:600}
.lime{color:#d5f531}.muted{color:#b5b6be}.sub{font-size:30px;line-height:1.65;color:#b5b6be;margin-top:28px}
.foot{position:absolute;left:160px;right:160px;bottom:66px;display:flex;justify-content:space-between;font-size:20px;color:#a7aab3}
.line{height:2px;background:#34363c}.pill{display:inline-block;padding:12px 24px;border:1px solid #494c53;border-radius:50px;font-size:23px}
.ui{background:#1b1d23;border:2px solid #41444a;border-radius:30px;box-shadow:0 30px 100px #0008;overflow:hidden}
.bar{height:62px;background:#23262c;display:flex;align-items:center;gap:9px;padding:0 26px;color:#b5b6be;font-size:17px}
.dot{width:9px;height:9px;border-radius:50%;background:#747780}.bar span:last-child{margin-left:20px}
.button{padding:20px 26px;background:#d5f531;color:#111411;border-radius:16px;font-size:26px;font-weight:600;text-align:center}
.label{font-size:19px;color:#b5b6be;letter-spacing:2px;margin-bottom:10px}.value{font-size:29px;font-weight:500}
.route{display:flex;gap:23px;align-items:center}.route-mark{width:15px;height:15px;border:4px solid #d5f531;border-radius:50%}
.row{display:flex;justify-content:space-between;align-items:center}.tag{font-size:19px;color:#f9b3a9;background:#412d2c;padding:8px 16px;border-radius:12px}
.cursor{position:absolute;width:36px;height:48px;background:#f8f8fa;clip-path:polygon(0 0,100% 65%,55% 68%,36% 100%);z-index:10;filter:drop-shadow(0 2px 3px #000)}
'''

def scene(name, duration, markup, animation, extra=''):
    # Keep small UI labels legible when this landscape film is viewed on a phone.
    css = re.sub(r'font-size:(\d+)px', lambda m: f'font-size:{max(28,int(m[1]))}px', CSS)
    markup = re.sub(r'font-size:(\d+)px', lambda m: f'font-size:{max(28,int(m[1]))}px', markup)
    envelope_path = OUT/'audio-envelope.json'
    if name in ['find','details','chat'] and envelope_path.exists():
        offsets={'find':4.1,'details':10.38,'chat':15.82}
        envelope=json.loads(envelope_path.read_text(encoding='utf-8'))
        for i in range(int(duration/.12)):
            at=i*.12
            energy=envelope[min(len(envelope)-1,round((offsets[name]+at)/.12))]
            gray=round(62+energy*45)
            animation+=f"tl.to('#{name}-ui',{{borderColor:'rgb({gray},{gray+3},{gray+7})',duration:.12,ease:'none'}},{at:.2f});\n"
    text=f'''<template><style>{css}{extra}</style><div id="root" data-composition-id="{name}" data-width="1920" data-height="1080"><div class="stage" id="{name}-stage">{markup}</div></div>
<script>const tl=gsap.timeline({{paused:true}});{animation}
window.__timelines["{name}"]=tl;</script></template>'''
    (COMP/'compositions'/f'{name}.html').write_text(text,encoding='utf-8')

brand='<div class="brand"><img src="assets/logo.png" alt="CholoCampus logo">choloCampus</div>'
foot='<div class="foot"><span>BRAC UNIVERSITY · DHAKA</span><span>Better commutes, together.</span></div>'
scene('intro',4.1,f'''<div class="top">{brand}<div class="eyebrow">CAMPUS RIDES, SHARED.</div></div>
<div style="margin-top:145px"><h1 id="intro-title">Same campus.<br><span class="lime">Share the journey.</span></h1>
<p id="intro-sub" class="sub">Rides to and from BRAC University.</p></div>
<div id="intro-route" style="display:flex;align-items:center;gap:24px;margin-top:65px"><span class="pill">Home</span><div style="height:3px;width:350px;background:#d5f531;transform-origin:left" id="intro-track"></div><span class="pill">BRACU</span></div>{foot}''', '''
tl.fromTo('#intro-title',{y:75,opacity:0},{y:0,opacity:1,duration:.8,ease:'power4.out'},0.05);
tl.fromTo('#intro-sub',{opacity:0},{opacity:1,duration:.6},.65);
tl.fromTo('#intro-route',{opacity:0},{opacity:1,duration:.4},1.1);
tl.fromTo('#intro-track',{scaleX:0},{scaleX:1,duration:1,ease:'power3.inOut'},1.2);
tl.fromTo('#intro-stage',{x:0},{x:-1920,duration:.5,ease:'power3.in'},3.6);
''')

# Schematic map: illustrative positions, never presented as navigation or route matching.
map_svg='''<svg width="1030" height="720" viewBox="0 0 1030 720" style="position:absolute;inset:0" aria-label="Illustrative Dhaka ride map">
<rect width="1030" height="720" fill="#151c20"/>
<path d="M820 -30 C700 150 960 280 780 450 S670 600 790 760" stroke="#203b45" stroke-width="75" fill="none"/>
<g stroke="#303a3f" stroke-width="16" fill="none"><path d="M-30 520 L1100 200"/><path d="M-20 200 L1050 490"/><path d="M230 -20 L480 770"/><path d="M630 -20 L560 760"/><path d="M-20 650 L1050 560"/></g>
<g stroke="#454b4c" stroke-width="3" fill="none"><path d="M-30 520 L1100 200"/><path d="M-20 200 L1050 490"/><path d="M230 -20 L480 770"/><path d="M630 -20 L560 760"/></g>
<g fill="#263035"><rect x="65" y="50" width="130" height="65" rx="12"/><rect x="330" y="150" width="105" height="100" rx="12"/><rect x="90" y="350" width="100" height="85" rx="12"/><rect x="410" y="530" width="110" height="80" rx="12"/></g></svg>'''
scene('find',6.28,f'''<div class="top">{brand}<div class="eyebrow">01 / FIND A RIDE</div></div>
<div style="display:flex;gap:64px;margin-top:65px;align-items:center"><div style="width:530px"><h2 id="find-title">Your ride.<br><span class="lime">On the map.</span></h2><p class="sub" id="find-sub">Search pickup or destination.<br>To campus. From campus.</p><div id="find-pills" style="display:flex;gap:12px;margin-top:36px"><span class="pill">Car</span><span class="pill">Bike</span></div></div>
<div class="ui" id="find-ui" style="width:1030px;height:690px;position:relative">{map_svg}<div style="position:absolute;top:28px;left:28px;right:28px;background:#1b1d23;padding:23px 28px;border:1px solid #51565c;border-radius:18px;font-size:28px">⌕ <span id="find-query">Where to?</span></div>
<div id="find-pin1" style="position:absolute;top:270px;left:260px;background:#ef685a;color:#111;padding:13px 20px;border-radius:16px;font-size:22px;font-weight:600">8:30 AM · Car</div>
<div id="find-pin2" style="position:absolute;top:460px;left:580px;background:#1eab85;color:#081b15;padding:13px 20px;border-radius:16px;font-size:22px;font-weight:600">5:00 PM · Bike</div>
<div style="position:absolute;top:310px;left:660px;font-size:24px;color:#d5f531;font-weight:600">● BRACU</div>
<div id="find-result" class="ui" style="position:absolute;bottom:48px;left:32px;width:425px;padding:26px;background:#1b1d23"><div class="tag" style="display:inline-block">To campus</div><div class="value" style="margin-top:17px">Uttara → BRACU</div><p style="font-size:22px;color:#b5b6be;margin-top:12px">8:30 AM · 2 seats · Car</p></div>
<div style="position:absolute;bottom:12px;right:20px;font-size:17px;color:#c2c7cc">Illustrative map · Demo ride</div></div></div>{foot}''','''
tl.fromTo('#find-ui',{x:180,opacity:0,scale:.94},{x:0,opacity:1,scale:1,duration:.85,ease:'power4.out'},0);
tl.fromTo('#find-title',{opacity:0},{opacity:1,duration:.4},.2);
tl.fromTo('#find-sub, #find-pills',{opacity:0},{opacity:1,duration:.4,stagger:.2},.6);
// beat-grid: pin arrivals at global 5.19 and 5.74; full set holds afterward.
tl.fromTo('#find-pin1',{scale:0,opacity:0},{scale:1,opacity:1,duration:.5,ease:'power4.out'},1.09);
tl.fromTo('#find-pin2',{scale:0,opacity:0},{scale:1,opacity:1,duration:.5,ease:'power4.out'},1.64);
tl.set('#find-query',{textContent:'Uttara'},2.18);
tl.fromTo('#find-result',{y:50,opacity:0},{y:0,opacity:1,duration:.6,ease:'power4.out'},2.5);
tl.fromTo('#find-stage',{x:0},{x:-1920,duration:.5,ease:'power3.in'},5.78);
''')

scene('details',5.44,f'''<div class="top">{brand}<div class="eyebrow">02 / CHECK THE DETAILS</div></div>
<div style="display:flex;gap:130px;align-items:center;margin-top:65px"><div style="width:660px"><h2 id="details-title">A seat.<br>A time.<br><span class="lime">A shared commute.</span></h2><p class="sub" id="details-sub">See the route, available seats,<br>vehicle, and fare per seat.</p></div>
<div class="ui" id="details-ui" style="width:720px;padding:38px"><div class="row"><span class="tag">To campus</span><span class="muted" style="font-size:22px">8:30 AM</span></div><div style="margin:30px 0"><div class="route"><div class="route-mark"></div><div><div class="label">PICKUP</div><div class="value">Uttara</div></div></div><div style="height:30px;border-left:2px dashed #747780;margin:10px 0 10px 6px"></div><div class="route"><div class="route-mark"></div><div><div class="label">DESTINATION</div><div class="value">BRAC University</div></div></div></div>
<div class="line"></div><div class="row" style="padding:24px 0;font-size:25px"><span>Car · 2 open seats</span><span class="lime">BDT 80 / seat</span></div><div class="button" id="details-button">Request seat &amp; chat →</div><div style="font-size:18px;color:#b5b6be;margin-top:18px">Demo ride · Illustrative fare</div></div></div>{foot}''','''
tl.fromTo('#details-ui',{scale:.88,opacity:0},{scale:1,opacity:1,duration:.8,ease:'power4.out'},0);
tl.fromTo('#details-title',{x:-60,opacity:0},{x:0,opacity:1,duration:.7,ease:'power4.out'},.15);
tl.fromTo('#details-sub',{opacity:0},{opacity:1,duration:.5},.8);
tl.fromTo('#details-button',{scale:1},{scale:.96,duration:.16,yoyo:true,repeat:1},4.3);
tl.fromTo('#details-stage',{opacity:1},{opacity:0,duration:.25},5.19);
''')

scene('chat',5.46,f'''<div class="top">{brand}<div class="eyebrow">03 / PLAN THE PICKUP</div></div>
<div style="display:flex;gap:110px;margin-top:70px;align-items:center"><div class="ui" id="chat-ui" style="width:790px;height:640px"><div style="padding:30px 36px;border-bottom:1px solid #41444a"><div class="value">Your messages.</div><div class="muted" style="font-size:22px;margin-top:8px">Uttara → BRAC University</div></div><div style="padding:32px"><div id="chat-a" style="background:#30343d;padding:22px 28px;border-radius:22px 22px 22px 5px;width:490px;font-size:27px">Meet at the pickup point?</div><div id="chat-b" style="background:#d5f531;color:#111411;padding:22px 28px;border-radius:22px 22px 5px 22px;width:400px;margin:28px 0 0 auto;font-size:27px">Yes, see you at 8:30.</div><div id="chat-confirm" style="margin-top:40px;text-align:center;color:#d5f531;font-size:24px">Seat request accepted</div></div><div style="padding:25px 32px;border-top:1px solid #41444a;font-size:24px;color:#b5b6be">Write a message...</div></div>
<div style="width:660px"><h2 id="chat-title">Work out<br><span class="lime">the details.</span></h2><p class="sub" id="chat-sub">Private chat for pickup and fare.<br>Accept or decline seat requests.</p><span class="pill" style="margin-top:38px">Demo conversation</span></div></div>{foot}''','''
// beat-locked: global 15.82s scene reveal.
tl.fromTo('#chat-ui',{x:-120,opacity:0},{x:0,opacity:1,duration:.7,ease:'power4.out'},0);
tl.fromTo('#chat-title, #chat-sub',{opacity:0},{opacity:1,duration:.5,stagger:.25},.2);
tl.fromTo('#chat-a',{x:-28,opacity:0},{x:0,opacity:1,duration:.45,ease:'power3.out'},.7);
tl.fromTo('#chat-b',{x:28,opacity:0},{x:0,opacity:1,duration:.45,ease:'power3.out'},1.7);
tl.fromTo('#chat-confirm',{opacity:0},{opacity:1,duration:.5},3.1);
tl.fromTo('#chat-stage',{y:0},{y:-1080,duration:.5,ease:'power3.in'},4.96);
''')

scene('outro',5.72,f'''<div class="top">{brand}<div class="eyebrow">CHOLOCAMPUS / BRACU</div></div>
<div style="margin-top:100px"><h1 id="outro-title">Better commutes,<br><span class="lime">together.</span></h1><p id="outro-sub" class="sub">Find a ride. Offer a ride.</p><div id="outro-actions" style="display:flex;gap:18px;margin-top:40px"><span class="button">Share your route →</span><span class="pill" style="padding:21px 28px">BRAC University</span></div></div>
<div class="foot"><span>A product of Nexasity</span><span style="font-size:18px">Music: Sascha Ende, ende.app (CC BY 4.0)</span></div>''','''
tl.fromTo('#outro-title',{y:50,opacity:0},{y:0,opacity:1,duration:.8,ease:'power4.out'},0);
// beat-locked: global 22.92s brand supporting line lands.
tl.fromTo('#outro-sub',{opacity:0},{opacity:1,duration:.5},1.64);
tl.fromTo('#outro-actions',{y:20,opacity:0},{y:0,opacity:1,duration:.6,ease:'power3.out'},2.1);
''')

scenes=[('intro',0,4.1),('find',4.1,6.28),('details',10.38,5.44),('chat',15.82,5.46),('outro',21.28,5.72)]
hosts=''.join(f'<div id="{n}" class="clip" data-composition-id="{n}" data-composition-src="compositions/{n}.html" data-start="{s}" data-duration="{d}" data-track-index="1" data-track-kind="graphics" data-width="1920" data-height="1080"></div>' for n,s,d in scenes)
audio='<audio id="music" class="clip" src="assets/music.mp3" data-start="0" data-duration="27" data-volume="0.7" data-fade-in="0.3" data-fade-out="1.4" data-track-index="2"></audio>'
for i,t in enumerate([4.1,10.38,15.82,21.28]):
    audio+=f'<audio id="hit{i}" class="clip" src="assets/soft.ogg" data-start="{t}" data-duration="0.18" data-volume="0.24" data-track-index="3"></audio>'
audio+='<audio id="click" class="clip" src="assets/click.ogg" data-start="14.68" data-duration="0.25" data-volume="0.22" data-track-index="4"></audio>'
(COMP/'index.html').write_text(f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><script src="assets/gsap.min.js"></script><style>*{{margin:0;box-sizing:border-box}}html,body{{width:1920px;height:1080px;overflow:hidden;background:#101114}}#root{{position:relative;width:1920px;height:1080px}}</style></head><body><div id="root" data-composition-id="main" data-start="0" data-duration="27" data-width="1920" data-height="1080">{hosts}{audio}</div><script>window.__timelines=window.__timelines||{{}};window.__timelines.main=gsap.timeline({{paused:true}});</script></body></html>''',encoding='utf-8')
print('Built 27-second CholoCampus composition.')
