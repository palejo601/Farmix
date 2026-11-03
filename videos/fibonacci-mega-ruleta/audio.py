# Sintetiza música + efectos sincronizados con events.json -> audio.wav
import json, wave, numpy as np, sys, os
D=os.path.dirname(os.path.abspath(__file__)); SR=44100; rng=np.random.default_rng(7)
E=json.load(open(os.path.join(D,'events.json'))); DUR=E['dur']; N=int((DUR+.5)*SR); SC=E['scenes']
I1=SC['fib'][0]; K0,K1=SC['streak']; S0=SC['sim'][0]; S1=SC['sim'][1]
mus=np.zeros(N); sfx=np.zeros(N)
T=lambda d: np.arange(int(d*SR))/SR
def add(buf,t0,sig,g=1.):
    i=int(t0*SR); 
    if i>=N: return
    j=min(N,i+len(sig)); buf[i:j]+=sig[:j-i]*g
def filt(x,fc,kind='lp',o=2):
    f=np.fft.rfftfreq(len(x),1/SR); H=1/np.sqrt(1+(f/fc)**(2*o))
    if kind=='hp': H=1-H
    return np.fft.irfft(np.fft.rfft(x)*H,len(x))
noise=lambda d: rng.standard_normal(int(d*SR))
sine=lambda f,t: np.sin(2*np.pi*f*t)
def chirp(f0,f1,d,k=8):
    t=T(d); f=f1+(f0-f1)*np.exp(-t*k); return np.sin(2*np.pi*np.cumsum(f)/SR),t
# ---------- instrumentos ----------
def kick():
    s,t=chirp(155,45,.32,35); return s*np.exp(-t*10)+filt(noise(.32),3000)*np.exp(-t*90)*.3
def clap():
    t=T(.25); return filt(filt(noise(.25),1200,'hp'),5000)*np.exp(-t*22)
def hat():
    t=T(.05); return filt(noise(.05),7000,'hp')*np.exp(-t*70)
def saw(f,d):
    t=T(d); return 2*((f*t)%1)-1,t
def bassn(f,d=.22):
    s,t=saw(f,d); return filt(s,700)*np.minimum(1,t/.005)*np.exp(-t*7)
def pluck(f):
    t=T(.25); return (sine(f,t)+.3*sine(2*f,t))*np.exp(-t*16)
KICK,CLAP,HAT=kick(),clap(),hat()
CH=[(110,[220,261.63,329.63]),(87.31,[174.61,220,261.63]),(130.81,[261.63,329.63,392]),(98,[196,246.94,293.66])]
B=.5
pad=np.zeros(N)
for bar in range(int(DUR/2)+1):
    t0=bar*2; root,tri=CH[bar%4]
    tension=K0<=t0<K1
    if not tension:
        for f in tri:
            for dt in (-.6,.6):
                s,t=saw(f*(1+dt/100),2.); add(pad,t0,s*np.minimum(1,t/.05)*np.minimum(1,(2-t)/.05),1)
    for b in range(4):
        tb=t0+b*B
        if tb>=DUR: break
        intro=tb<I1
        if tension:
            if b%2==0: add(mus,tb,KICK,.9)
            for k in range(2): add(mus,tb+k*.25,bassn(110,.2),.32)
            add(mus,tb+.25,HAT,.12); continue
        if tb>=2.0 or not intro: add(mus,tb,KICK,.9 if not intro else .6)
        if b%2==1 and not intro: add(mus,tb,CLAP,.35)
        add(mus,tb+.25,HAT,.18)
        if not intro: add(mus,tb+.25,bassn(root),.4)
        if I1<=tb<S1:
            arp=[tri[0]*2,tri[1]*2,tri[2]*2,tri[1]*2]
            for k in range(4): add(mus,tb+k*.125,pluck(arp[k]),.08 if tb>=S0 else .045)
pad=filt(pad,1400); tt=np.arange(N)/SR
duck=.35+.65*np.minimum(1,(tt%B)/.3)
mus+=pad*.05*duck
# riser intro
s,t=chirp(1200,200,2.,-1); r=filt(noise(2.),2500)*(t/2)**2; add(mus,I1-2.,r,.25)
# ---------- efectos ----------
def fx(name,v=1.,d=None):
    if name=='boom':
        s,t=chirp(90,32,1.,4); return (s*np.exp(-t*3.5)+filt(noise(1.),400)*np.exp(-t*10)*.6)*.9*v
    if name=='whoosh':
        t=T(.6); p=t/.6; return (filt(noise(.6),2200)*np.sin(np.pi*p)**2*.9+filt(noise(.6),5000,'hp')*np.sin(np.pi*p)**4*.2)*.45*v
    if name=='zap':
        n=int(.35*SR); g=np.repeat(rng.random(n//60+1)>.45,60)[:n]; t=T(.35); s,_=chirp(3200,250,.35,9)
        return (filt(noise(.35),2000,'hp')*g+s*.5)*np.exp(-t*9)*.38*v
    if name=='pop':
        s,t=chirp(500,1100,.12,-25); s=np.sin(2*np.pi*np.cumsum(500+600*np.minimum(1,t/.08))/SR); return s*np.exp(-t*28)*.32*v
    if name=='chip':
        t=T(.05); c=(filt(noise(.05),3000,'hp')*.5+sine(2600,t))*np.exp(-t*90); o=np.zeros(int(.12*SR)); o[:len(c)]+=c; o[int(.06*SR):int(.06*SR)+len(c)]+=c*.7; return o*.3*v
    if name=='click':
        t=T(.04); return (sine(1000,t)+filt(noise(.04),4000,'hp'))*np.exp(-t*120)*.4*v
    if name=='roll':
        t=T(d); p=t/d; rate=9-6*p; ph=np.cumsum(rate)/SR
        rum=filt(noise(d),900)*(.55+.45*np.sin(2*np.pi*ph))
        env=np.minimum(1,t/.05)*np.where(p<.75,1,np.clip((1-p)/.25,0,1)); o=rum*env*.5
        ticks=np.nonzero(np.diff(np.floor(ph*3))>0)[0]; tk=T(.015); tc=sine(3200,tk)*np.exp(-tk*300)
        for i in ticks:
            if p[i]<.75: o[i:i+len(tc)]+=tc[:len(o)-i]*.12
        return o*.6*v
    if name=='clack':
        t=T(.07); return (filt(noise(.07),2500,'hp')*.6+sine(1800,t)+.5*sine(3100,t))*np.exp(-t*75)*.42*v
    if name=='win':
        o=np.zeros(int(1.0*SR))
        for k,f in enumerate([1046.5,1318.5,1568,2093]):
            t=T(.7); n=(sine(f,t)+.3*sine(2*f,t))*np.exp(-t*5); i=int(k*.07*SR); o[i:i+len(n)]+=n
        t=T(1.); o+=filt(noise(1.),6000,'hp')*np.exp(-t*4)*.15; return o*.28*v
    if name=='lose':
        t=T(.45); f=330-170*t/.45; ph=2*np.pi*np.cumsum(f)/SR; s=np.sin(ph)+.5*np.sign(np.sin(ph)); return filt(s,1800)*np.exp(-t*4)*.2*v
    if name=='coin':
        o=np.zeros(int(.6*SR))
        for k,(a,b) in enumerate([(1900,2550),(2550,3400)]):
            t=T(.5); n=(sine(a,t)+sine(b,t))*np.exp(-t*10); i=int(k*.08*SR); o[i:i+len(n)]+=n
        return o*.12*v
    if name=='tick':
        t=T(.02); return sine(2400,t)*np.exp(-t*220)*.14*v
    if name=='type':
        t=T(.012); return filt(noise(.012),3000,'hp')*np.exp(-t*300)*.07*v
    if name=='alarm':
        o=[]
        for f in (880,660,880,660):
            t=T(.14); o.append(filt(np.sign(sine(f,t))*.6,3500)*np.minimum(1,(.14-t)/.01))
        return np.concatenate(o)*.16*v
    if name=='riser':
        t=T(d); p=t/d; s=np.sin(2*np.pi*np.cumsum(200+1000*p**2)/SR)
        return (filt(noise(d),3000)*.7+s*.4)*p**2*.3*v
    raise ValueError(name)
voz=np.zeros(N)
for e in E['events']:
    if e['type']=='voice':
        w=wave.open(os.path.join(D,'voz',e['id']+'.wav'));a=np.frombuffer(w.readframes(w.getnframes()),np.int16)/32768.;add(voz,e['t'],a)
    else: add(sfx,e['t'],fx(e['type'],e.get('v',1.),e.get('d')))
# ducking: baja la música mientras habla la voz (envolvente suavizada)
def mavg(x,n):
    c=np.cumsum(np.concatenate([[0],x])); y=(c[n:]-c[:-n])/n; pad=len(x)-len(y); return np.concatenate([np.full(pad//2,y[0]),y,np.full(pad-pad//2,y[-1])])
env=mavg(np.abs(voz),2205); act=np.clip(mavg((env>.01).astype(float),int(.25*SR))*1.6,0,1)
duck=1-.62*act
vz=np.tanh(2.2*voz)/np.tanh(2.2)*1.1
mix=mus*.5*duck+sfx*.7*(1-.35*act)+vz
# fade final
fo=int(1.3*SR); end=int(DUR*SR); mix[end-fo:end]*=np.linspace(1,0,fo); mix[end:]=0
mix=np.tanh(1.3*mix)/np.tanh(1.3); mix*=.92/np.max(np.abs(mix))
pcm=(mix*32767).astype(np.int16); st=np.stack([pcm,pcm],1).tobytes()
w=wave.open(os.path.join(D,'audio.wav'),'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st); w.close()
print('audio ok',len(E['events']),'eventos')
