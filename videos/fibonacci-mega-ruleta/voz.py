# Genera la narración (voz neuronal es-CO) + tiempos por palabra -> voz/*.wav y voz.js
import certifi; certifi.where=lambda:'/root/.ccr/ca-bundle.crt'  # CA del proxy del entorno
import asyncio, edge_tts, json, os, subprocess, sys
D=os.path.dirname(os.path.abspath(__file__)); VOICE=os.environ.get('VOZ','es-CO-GonzaloNeural'); RATE='-6%'
L=[
('intro1','¿Se puede vencer a la ruleta usando matemáticas?'),
('intro2','Hoy te explico la famosa estrategia Fibonacci en Mega Ruleta… y lo que casi nadie te cuenta.'),
('fib1','La secuencia de Fibonacci es muy sencilla: cada número es la suma de los dos anteriores.'),
('fib2','Uno, uno, dos, tres, cinco, ocho, trece, veintiuno, treinta y cuatro…'),
('fib3','Y esa secuencia se convierte en tu escalera de apuestas.'),
('rules1','Las reglas son tres.'),
('rules2','Primera: apuestas siempre a una opción que paga uno a uno, como el rojo.'),
('rules3','Segunda: si pierdes, subes un escalón.'),
('rules4','Tercera: si ganas, bajas dos escalones. Así, cada victoria recupera las dos últimas apuestas.'),
('mega1','Ahora, ¿qué tiene de especial Mega Ruleta? Antes de cada giro caen rayos sobre algunos números, con multiplicadores de hasta quinientas veces.'),
('mega2','Pero ojo: esos multiplicadores solo pagan si apuestas a pleno, es decir, a un número exacto. Por eso, el pleno paga treinta a uno, y no treinta y cinco.'),
('sim0','Vamos a probarlo. Empezamos con cien mil pesos, y una unidad de mil pesos al rojo.'),
('s1a','Primer giro: mil al rojo.'),('s1b','¡Negro veintiséis! Perdemos. Subimos un escalón.'),
('s2a','Seguimos con mil.'),('s2b','Negro otra vez. Subimos a dos mil.'),
('s3a','Dos mil al rojo.'),('s3b','¡Cero! Esa es la ventaja de la casa. Ahora vamos con tres mil.'),
('s4a','Tres mil… ¡vamos!'),('s4b','Negro. Cuatro pérdidas seguidas: vamos perdiendo siete mil pesos.'),
('s5a','Cinco mil al rojo.'),('s5b','¡Rojo! Ganamos, y bajamos dos escalones.'),
('s6a','Dos mil… y mira ese rayo de doscientas veces en el diecinueve.'),
('s6b','¡Cayó el diecinueve! Pero como apostamos al rojo, y no al pleno, solo cobramos el doble. Bajamos otra vez.'),
('s7a','Último giro: mil al rojo.'),('s7b','¡Rojo! Ciclo completo: recuperamos todo, y quedamos ganando… mil pesos.'),
('simEnd','Siete giros, cuatro derrotas… y una ganancia de solo mil pesos. Fibonacci recupera pérdidas, pero gana poquito.'),
('streak1','Pero, ¿qué pasa si llega una racha mala?'),
('streak2','Mil, mil, dos mil, tres mil, cinco mil, ocho mil, trece mil, veintiún mil, treinta y cuatro mil, cincuenta y cinco mil.'),
('streak3','Diez derrotas seguidas, y ya perdiste ciento cuarenta y tres mil pesos. La siguiente apuesta sería de ochenta y nueve mil.'),
('streak4','Y no es tan raro como crees: en mil giros, hay casi un cincuenta por ciento de probabilidad de vivir una racha así.'),
('ver1','Mi veredicto.'),
('ver2','Fibonacci sube más suave que la Martingala, y es fácil de seguir.'),
('ver3','Pero no cambia la ventaja de la casa, que sigue siendo del dos coma siete por ciento. Ninguna estrategia la cambia.'),
('out1','Si vas a jugar, ponte un límite antes de empezar, y tómalo como entretenimiento, no como un ingreso.'),
('out2','¿Tú la probarías? Déjamelo en los comentarios.'),
]
async def one(i,txt):
    try: c=edge_tts.Communicate(txt,VOICE,rate=RATE,boundary='WordBoundary')
    except TypeError: c=edge_tts.Communicate(txt,VOICE,rate=RATE)
    aud=b'';words=[]
    async for ch in c.stream():
        if ch['type']=='audio': aud+=ch['data']
        elif ch['type']=='WordBoundary': words.append({'t':round(ch['offset']/1e7,3),'d':round(ch['duration']/1e7,3),'w':ch['text']})
    mp3=os.path.join(D,'voz',i+'.mp3'); open(mp3,'wb').write(aud)
    wav=mp3[:-4]+'.wav'; subprocess.run(['ffmpeg','-y','-loglevel','error','-i',mp3,'-ar','44100','-ac','1',wav],check=True); os.remove(mp3)
    dur=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',wav]))
    return {'id':i,'dur':round(dur,3),'words':words}
async def main():
    os.makedirs(os.path.join(D,'voz'),exist_ok=True)
    out=[await one(i,t) for i,t in L]
    open(os.path.join(D,'voz.js'),'w').write('window.VOZ='+json.dumps(out,ensure_ascii=False)+';')
    print('total voz %.1fs'%sum(o['dur'] for o in out), 'sin palabras:',[o['id'] for o in out if not o['words']])
asyncio.run(main())
