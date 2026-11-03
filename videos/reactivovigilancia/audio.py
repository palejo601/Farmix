# Música cinematográfica sintetizada + efectos + voz (con ducking) -> audio.wav (estéreo, 44.1 kHz)
import json, os, wave
import numpy as np
D=os.path.dirname(os.path.abspath(__file__)); SR=44100; R=np.random.default_rng(5)
TL=json.load(open(os.path.join(D,'timeline.json'))); EV=json.load(open(os.path.join(D,'events.json')))
dur=EV['dur']; N=int((dur+1.5)*SR); SC={s['id']:(s['t0'],s['t1']) for s in TL['scenes']}
with wave.open(os.path.join(D,'voz.wav')) as f: voz=np.frombuffer(f.readframes(f.getnframes()),'<i2').astype(np.float64)/32768
voz=np.pad(voz,(0,max(0,N-len(voz))))[:N]
mf=lambda m:440*2**((m-69)/12)
def put(buf,t0,x,g=1.0):
    i=int(round(t0*SR))
    if i<0: x=x[-i:]; i=0
    n=min(len(x),len(buf)-i)
    if n>0: buf[i:i+n]+=g*x[:n]
def tt(d): return np.arange(int(d*SR))/SR
def tone(f,d,h=(1,.3,.1),det=0.0):
    a=tt(d); return sum(k*np.sin(2*np.pi*f*(i+1)*(1+det)*a) for i,k in enumerate(h))
def adsr(n,a,r):
    e=np.ones(n); na=min(n,int(a*SR)); nr=min(n,int(r*SR))
    if na: e[:na]=np.linspace(0,1,na)**1.5
    if nr: e[n-nr:]*=np.linspace(1,0,nr)**1.5
    return e
def band(d,lo,hi):
    x=R.standard_normal(int(d*SR)); S=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); S[(f<lo)|(f>hi)]=0; y=np.fft.irfft(S,len(x)); return y/(np.abs(y).max()+1e-9)
# ---------- música ----------
pad=np.zeros(N); low=np.zeros(N); arp=np.zeros(N); pno=np.zeros(N)
PROG=[[52,59,64,67,71],[48,55,64,67,71],[43,55,62,67,71],[50,57,62,66,69]]; CL=8.0
for c in range(int(dur/CL)+2):
    t0=c*CL-1.0; d=CL+3.0; nt=PROG[c%4]; e=adsr(int(d*SR),2.2,2.6)
    for m in nt:
        for det in (-.0025,.0025): put(pad,t0,tone(mf(m),d,(1,.28,.08),det)*e,.013)
    put(low,t0,tone(mf(nt[0]-12),d,(1,.15))*adsr(int(d*SR),1.5,2.5),.05)
s2,s7=SC['s2'][0],SC['s7'][0]; step=60/96/2; k=0; x=s2-1.0
while x<SC['s7'][1]-11:
    nt=PROG[int(x//CL)%4]; m=nt[[1,2,3,4,3,2][k%6]]+12; y=tone(mf(m),.9,(1,.18,.05))*np.exp(-tt(.9)*5.5)
    put(arp,x,y,.022 if x<s7 else .017); x+=step*(2 if x>s7 else 1); k+=1
for x in np.arange(3.0,SC['s1'][1]-6,1.25):
    m=PROG[int(x//CL)%4][[2,3,4,3][int(round(x/1.25))%4]]+12; put(pno,x,tone(mf(m),2.5,(1,.4,.15,.06))*np.exp(-tt(2.5)*2.2),.03)
for x in np.arange(SC['s7'][1]-10.5,SC['s7'][1]-3,1.5):
    m=[67,71,74,76,74][int(round(x/1.5))%5]; put(pno,x,tone(mf(m),3,(1,.4,.15,.06))*np.exp(-tt(3)*1.8),.028)
# ---------- efectos ----------
def whoosh(v):
    d=1.3; a,b=band(d,300,1800),band(d,1500,6000); u=np.linspace(0,1,len(a)); e=np.sin(np.pi*np.clip(u/.85,0,1))**2; return (a*(1-u)+b*u*.5)*e*.3*v
def riser(v):
    d=2.4; a=tt(d); u=a/d; f=180+700*u**2; return (np.sin(2*np.pi*np.cumsum(f)/SR)*.3*u**2+band(d,800,7000)*u**3*.3)*v*.6
def boom(v):
    d=2.6; a=tt(d); f=38+30*np.exp(-a*6); y=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-a*1.6)+band(d,30,300)*np.exp(-a*5)*.35; return y/np.abs(y).max()*.7*v
def hit(v):
    d=2.0; a=tt(d); y=sum(np.sin(2*np.pi*mf(m)*a) for m in (50,57,62,65))*np.exp(-a*2.5)/4+np.sin(2*np.pi*np.cumsum(45+20*np.exp(-a*8))/SR)*np.exp(-a*3)*.8; return y*.35*v
def blip(v):
    a=tt(.16); return (np.sin(2*np.pi*1318*a)+.5*np.sin(2*np.pi*1976*a))*np.exp(-a*30)*np.minimum(1,a/.004)*.11*v
def chime(v):
    a=tt(1.6); y=sum(g*np.sin(2*np.pi*1046.5*m*a)*np.exp(-a*k) for g,m,k in ((1,1,3),(.5,2.76,5),(.25,5.4,8),(.4,2,4))); return y*np.minimum(1,a/.003)*.08*v
def typ(v):
    x=np.diff(R.standard_normal(int(.03*SR)+1)); return x*np.exp(-tt(.03)[:len(x)]*260)*.05*v
def beep(v):
    a=tt(.11); return np.sin(2*np.pi*988*a)*adsr(len(a),.004,.03)*.05*v
def beat(v):
    a=tt(.7); y=np.sin(2*np.pi*np.cumsum(50+40*np.exp(-a*25))/SR)*np.exp(-a*9); y2=np.zeros_like(y); s=int(.2*SR); y2[s:]=y[:len(y)-s]*.6; return (y+y2)*.5*v
def alarm(v):
    o=np.zeros(int(2*SR))
    for rep in range(2):
        for j,m in enumerate((72,76,79)):
            a=tt(.16); put(o,rep*.85+j*.22,(np.sin(2*np.pi*mf(m)*a)+.25*np.sin(2*np.pi*3*mf(m)*a))*adsr(len(a),.01,.04),.1*v)
    return o
FX=dict(whoosh=whoosh,riser=riser,boom=boom,hit=hit,blip=blip,chime=chime,type=typ,beep=beep,beat=beat,alarm=alarm)
sfx=np.zeros(N)
for e in EV['events']: put(sfx,e['t'],FX[e['k']](e['v']))
# ---------- reverberación (convolución por bloques) ----------
def conv(x,ir):
    L=1<<17; n=len(ir); M=1
    while M<L+n: M<<=1
    H=np.fft.rfft(ir,M); y=np.zeros(len(x)+n)
    for i in range(0,len(x),L):
        s=x[i:i+L]; Y=np.fft.irfft(np.fft.rfft(s,M)*H,M)[:len(s)+n-1]; y[i:i+len(Y)]+=Y
    return y[:len(x)]
def mkir():
    a=tt(2.8); ir=np.convolve(R.standard_normal(len(a)),np.ones(6)/6,'same')*np.exp(-a*2.4); return ir/np.sqrt((ir**2).sum())
bus=pad+arp+pno; send=bus+sfx*.35; wl,wr=conv(send,mkir())*.55,conv(send,mkir())*.55
musL,musR=bus*.8+wl+low,bus*.8+wr+low
# ---------- automatización y ducking ----------
def mavg(x,w):
    n=max(1,int(w*SR)); c=np.cumsum(np.concatenate([[0],x])); y=(c[n:]-c[:-n])/n; p=n//2; return np.concatenate([np.full(p,y[0]),y,np.full(len(x)-len(y)-p,y[-1])])
env=mavg(mavg(np.abs(voz),.06),.4); thr=np.percentile(env[env>1e-4],50); duck=1-.55*np.clip(env/thr,0,1)
s1=SC['s1'][1]; tf=next(e['t'] for e in EV['events'] if e['k']=='boom')
tk=[0,2.5,tf-2.5,tf,tf+.5,dur-11,dur-8,dur-1.5,dur+1.5]; gk=[.35,.6,.65,.6,1.0,1.0,1.3,1.0,0]
g=np.interp(np.arange(N)/SR,tk,gk)
vr=np.sqrt(np.mean(voz[np.abs(voz)>.02]**2)); mr=np.sqrt(np.mean(((musL+musR)/2)**2))
gm=g*duck*(.30*vr/mr)
L=voz+musL*gm+sfx*.9; Rr=voz+musR*gm+sfx*.9
pk=max(np.abs(L).max(),np.abs(Rr).max()); L,Rr=L/pk*.95,Rr/pk*.95
st=np.stack([L,Rr],1)
with wave.open(os.path.join(D,'audio.wav'),'wb') as f:
    f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR);f.writeframes((np.clip(st,-1,1)*32767).astype('<i2').tobytes())
print('audio ok %.1fs'%(N/SR))
