# Narración (voz neuronal) + línea de tiempo + subtítulos -> voz.wav, timeline.js/json, subtitulos.srt
import certifi; certifi.where=lambda:'/root/.ccr/ca-bundle.crt'  # CA del proxy del entorno
import asyncio, edge_tts, json, os, subprocess, re, wave, hashlib, unicodedata
import numpy as np
D=os.path.dirname(os.path.abspath(__file__)); VOICE=os.environ.get('VOZ','es-MX-JorgeNeural'); RATE=os.environ.get('RATE','+3%')
SR=44100; GAP=0.38
# (id, título, segundos antes de la voz, segundos después, frases)
SC=[
('s1','Introducción',3.0,5.5,[
 'La seguridad del paciente constituye uno de los pilares fundamentales de los sistemas de salud.',
 'Cada medicamento administrado y cada dispositivo médico utilizado representan beneficios para la atención sanitaria, pero también pueden implicar riesgos.',
 'Identificar, evaluar y prevenir estos riesgos es una responsabilidad compartida.',
 'Aquí es donde la farmacovigilancia y la tecnovigilancia desempeñan un papel esencial.']),
('s2','Farmacovigilancia',2.2,1.0,[
 'De acuerdo con la Organización Mundial de la Salud, la farmacovigilancia comprende la ciencia y las actividades relacionadas con la detección, evaluación, comprensión y prevención de los efectos adversos o cualquier otro problema relacionado con los medicamentos.',
 'Tras la tragedia de la talidomida, este organismo creó en 1968 el Programa Internacional de Vigilancia de Medicamentos, hoy apoyado por el Centro de Monitoreo de Uppsala.',
 'Ningún ensayo clínico revela todos los riesgos: algunas reacciones poco frecuentes o tardías solo se identifican cuando el medicamento se usa en la población general.',
 'Por eso, es fundamental que los profesionales de la salud notifiquen las sospechas de reacciones adversas: no se necesita certeza; basta con la sospecha.',
 'Su propósito es identificar señales de riesgo, fortalecer el uso seguro de los medicamentos y generar información que permita tomar decisiones sanitarias oportunas.']),
('s3','Tecnovigilancia',2.2,1.0,[
 'La tecnovigilancia comprende las actividades destinadas a identificar, evaluar, gestionar y prevenir los riesgos relacionados con el uso de dispositivos médicos.',
 'Desde una bomba de infusión hasta un monitor de signos vitales, cualquier dispositivo puede presentar fallas que comprometan la seguridad del paciente.',
 'Por esta razón, la vigilancia sistemática permite detectar incidentes, investigar sus causas y establecer medidas preventivas.',
 'En Colombia, el evento adverso se define como un daño no intencionado al paciente, al operador o al medio ambiente; el incidente adverso, como un daño potencial.',
 'Los eventos e incidentes adversos serios deben reportarse dentro de las 72 horas siguientes a su ocurrencia, y los no serios, de manera trimestral.']),
('s4','Diferencias',2.2,1.2,[
 'La farmacovigilancia vigila los medicamentos y los problemas relacionados con su utilización.',
 'La tecnovigilancia vigila los dispositivos médicos y los incidentes o eventos adversos relacionados con su uso.',
 'Una erupción cutánea tras iniciar un antibiótico es un caso para la farmacovigilancia; una bomba de infusión cuya alarma no se activa ante una oclusión lo es para la tecnovigilancia.',
 'Ambas comparten un objetivo fundamental: prevenir daños y proteger al paciente.']),
('s5','La OMS y la seguridad del paciente',2.2,1.0,[
 'La Organización Mundial de la Salud promueve una atención sanitaria segura, en la que los riesgos se identifican oportunamente y los incidentes se convierten en oportunidades de aprendizaje.',
 'Según sus estimaciones, alrededor de uno de cada diez pacientes sufre algún daño durante la atención sanitaria; más de la mitad de esos daños podría prevenirse, y la mitad de lo prevenible se atribuye a los medicamentos.',
 'Por eso, el Plan de Acción Mundial para la Seguridad del Paciente 2021 a 2030 busca reducir al máximo los daños evitables, y el reto «Medicación sin daño» se propuso disminuir en un 50 % los daños graves y evitables asociados a los medicamentos.',
 'La seguridad del paciente no depende únicamente de una persona: requiere sistemas organizados, vigilancia permanente, comunicación efectiva y compromiso institucional.']),
('s6','Aplicación en Colombia',2.2,1.0,[
 'En Colombia, el Invima desempeña un papel fundamental en la vigilancia sanitaria de medicamentos y dispositivos médicos.',
 'El Ministerio de Salud y Protección Social orienta la política, y los prestadores de salud desarrollan programas institucionales de farmacovigilancia y tecnovigilancia.',
 'En ellos, cada profesional debe detectar, notificar y gestionar los eventos adversos.',
 'Son referentes normativos el Decreto 4725 de 2005, la Resolución 1403 de 2007, la Resolución 4816 de 2008 y el Decreto 780 de 2016.',
 'A través de los programas de farmacovigilancia y tecnovigilancia, se fortalece la identificación y notificación de riesgos, contribuyendo a la protección de la población y al mejoramiento de la atención en salud.']),
('s7','Mensaje final',2.2,9.5,[
 'La farmacovigilancia y la tecnovigilancia no son solamente procedimientos de vigilancia: son herramientas esenciales para proteger vidas.',
 'Detectar un riesgo, notificar un incidente y prevenir un daño puede marcar la diferencia entre una atención insegura y una atención de calidad.',
 'Porque la seguridad del paciente es una responsabilidad de todos.']),
]
norm=lambda s:re.sub(r'[^a-z0-9]','',unicodedata.normalize('NFD',s.lower()).encode('ascii','ignore').decode())
async def tts(txt):
    h=hashlib.md5(f'{VOICE}|{RATE}|{txt}'.encode()).hexdigest()[:12]; mp3=os.path.join(D,'voz',h+'.mp3'); js=mp3[:-4]+'.json'
    if not os.path.exists(js):
        c=edge_tts.Communicate(txt,VOICE,rate=RATE,boundary='WordBoundary'); aud=b'';wd=[]
        async for ch in c.stream():
            if ch['type']=='audio': aud+=ch['data']
            elif ch['type']=='WordBoundary': wd.append([ch['text'],ch['offset']/1e7,(ch['offset']+ch['duration'])/1e7])
        open(mp3,'wb').write(aud); json.dump(wd,open(js,'w'))
    raw=subprocess.run(['ffmpeg','-v','error','-i',mp3,'-f','f32le','-ac','1','-ar',str(SR),'-'],capture_output=True,check=True).stdout
    return np.frombuffer(raw,np.float32).copy(), json.load(open(js))
def tokmap(text,wd):  # tiempos por palabra del texto original (con puntuación)
    toks=text.split(); nw=[norm(w[0]) for w in wd]; j=0; out=[]
    for tk in toks:
        k=norm(tk); m=None
        for q in range(j,min(j+4,len(wd))):
            if k and (nw[q]==k or nw[q].startswith(k) or k.startswith(nw[q])): m=q;break
        out.append([tk,wd[m][1],wd[m][2]] if m is not None else [tk,None,None]);
        if m is not None: j=m+1
    for i,o in enumerate(out):  # rellena huecos (p. ej. '%')
        if o[1] is None:
            p=out[i-1][2] if i else 0; n=next((x[1] for x in out[i+1:] if x[1] is not None),p+.3); o[1],o[2]=p,max(n,p+.05)
    return out
def chunks(tw,maxc=44):  # bloques equilibrados de hasta 2 líneas, cortando de preferencia tras puntuación
    L=len(' '.join(x[0] for x in tw)); n=max(1,-(-L//(2*maxc-4))); tgt=L/n; cues=[];cur=[];cl=0
    for i,w in enumerate(tw):
        cur.append(w); cl+=len(w[0])+1
        if i<len(tw)-1 and len(cues)<n-1 and (cl>=tgt or (w[0][-1] in ',;:' and cl>=tgt*.6)): cues.append(cur);cur=[];cl=0
    if cur: cues.append(cur)
    out=[]
    for c in cues:
        j=lambda a:' '.join(x[0] for x in a); txt=j(c)
        if len(txt)>50 and len(c)>1:
            k=min(range(1,len(c)),key=lambda k:abs(len(j(c[:k]))-len(j(c[k:])))); txt=j(c[:k])+'\n'+j(c[k:])
        out.append([c[0][1],c[-1][2],txt])
    return out
async def main():
    t=0.0; scenes=[]; clips=[]; subs=[]
    for sid,tit,lead,tail,fr in SC:
        s={'id':sid,'title':tit,'t0':round(t,3),'sent':[]}; t+=lead
        for txt in fr:
            a,wd=await tts(txt); w0=wd[0][1]; pos=t-w0; clips.append((pos,a))
            tw=[[x[0],round(pos+x[1],3),round(pos+x[2],3)] for x in tokmap(txt,wd)]
            s['sent'].append({'t0':tw[0][1],'t1':tw[-1][2],'txt':txt,'w':tw}); subs+=chunks(tw)
            t=pos+wd[-1][2]+GAP
        t+=tail-GAP; s['t1']=round(t,3); scenes.append(s)
    dur=round(t,3); v=np.zeros(int((dur+1)*SR),np.float32)
    for pos,a in clips: i=int(pos*SR); v[i:i+len(a)]+=a[:len(v)-i]
    for i in range(len(subs)-1): subs[i][1]=min(subs[i][1]+.3,subs[i+1][0]-.04)
    subs[-1][1]+=.4
    with wave.open(os.path.join(D,'voz.wav'),'wb') as f:
        f.setnchannels(1);f.setsampwidth(2);f.setframerate(SR);f.writeframes((np.clip(v,-1,1)*32767).astype('<i2').tobytes())
    TL={'dur':dur,'scenes':scenes,'subs':[[round(a,3),round(b,3),c] for a,b,c in subs]}
    json.dump(TL,open(os.path.join(D,'timeline.json'),'w'),ensure_ascii=False)
    open(os.path.join(D,'timeline.js'),'w').write('window.TL='+json.dumps(TL,ensure_ascii=False)+';')
    st=lambda x:'%02d:%02d:%02d,%03d'%(x//3600,x%3600//60,x%60,round(x%1*1000)%1000)
    open(os.path.join(D,'subtitulos.srt'),'w').write('\n'.join(f'{i+1}\n{st(a)} --> {st(b)}\n{c}\n' for i,(a,b,c) in enumerate(TL['subs'])))
    print('dur %.1fs'%dur, ' '.join('%s:%.1f'%(s['id'],s['t1']-s['t0']) for s in scenes), 'subs',len(subs))
asyncio.run(main())
