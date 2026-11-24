# Jarvis: asistente para optimizar tu PC (v0.2)

Un chat de texto con Claude que mira el estado real de tu PC y te ayuda a optimizarlo.
Está separado de la app FARMIX: todo vive en esta carpeta `jarvis/`.

## Qué puede hacer

| Herramienta | Qué hace | ¿Cambia algo? |
|---|---|---|
| `estado_sistema` | CPU, RAM, swap, horas encendido, batería | No |
| `procesos_principales` | Procesos que más CPU o memoria usan | No |
| `uso_discos` | Espacio usado y libre por disco | No |
| `programas_inicio` | Programas que arrancan con Windows (registro *Run* y carpetas de Inicio) | No |
| `analizar_temporales` | Cuánto ocupan los temporales que se pueden borrar | No |
| `limpiar_temporales` | Borra temporales con más de 24 h sin uso | **Sí, pide confirmación** |
| `cerrar_proceso` | Cierra un programa por su PID | **Sí, pide confirmación** |

Seguridad:
- La confirmación la pide el propio programa (no Claude), así que nada se borra ni se cierra sin que escribas `s`.
- Los procesos críticos de Windows (`csrss.exe`, `lsass.exe`, `svchost.exe`, `winlogon.exe`, etc.) están bloqueados.
- La limpieza solo toca archivos, no sigue accesos directos/enlaces y salta los archivos en uso.
- Los programas de inicio solo se listan; Jarvis te explica cómo desactivarlos en el Administrador de tareas.

## Instalación (Windows)

1. Instala Python 3.10 o superior desde <https://www.python.org/downloads/> (marca "Add Python to PATH").
2. Abre una terminal en esta carpeta `jarvis` y ejecuta:

   ```bat
   py -m pip install -r requirements.txt
   ```

3. Consigue una clave de API en <https://platform.claude.com/> y guárdala:

   ```bat
   setx ANTHROPIC_API_KEY "tu-clave"
   ```

   Cierra y vuelve a abrir la terminal para que la tome.

4. Arranca Jarvis:

   ```bat
   py main.py
   ```

   o haz doble clic en `iniciar.bat`.

Para limpiar `C:\Windows\Temp` o cerrar programas de otros usuarios, abre la terminal **como administrador**.

## Ejemplos

- "¿Por qué va lento mi PC?"
- "¿Qué programas consumen más memoria?"
- "¿Cuánto espacio puedo liberar?" y luego "límpialo"
- "¿Qué arranca con Windows y qué puedo quitar?"

## Sin clave de Claude (modo de órdenes)

Si no configuras `ANTHROPIC_API_KEY`, Jarvis arranca solo en **modo de órdenes**: no usa internet ni Claude y entiende frases fijas, por texto (`iniciar.bat`) o por voz (`iniciar_voz.bat`):

| Dices | Jarvis |
|---|---|
| "Jarvis, ¿cómo está la memoria?" | Uso de RAM y procesador |
| "Jarvis, ¿cuánto espacio queda?" | Espacio libre de cada disco |
| "Jarvis, ¿qué consume más?" | Los 3 programas que más memoria usan |
| "Jarvis, ¿por qué va lento?" | Revisa RAM y CPU y dice qué programas pesan |
| "Jarvis, limpia los temporales" | Borra temporales viejos, **después de que digas sí** |
| "Jarvis, cierra Chrome" | Cierra el programa, **después de que digas sí** |
| "Jarvis, ¿qué arranca con Windows?" | Programas de inicio (solo los nombra) |
| "Jarvis, ¿cuánta batería tengo?", "¿qué hora es?", "ayuda" | Lo obvio |

Para forzar este modo aunque tengas clave: `py voz.py --sin-clave` o `py main.py --sin-clave`.

## Modo turbo y vigilante de RAM

Pensado para PCs con poca memoria (4 GB). No necesitan clave de Claude ni internet.

| Archivo | Qué hace |
|---|---|
| `modo_turbo.bat` | Muestra los programas pesados abiertos y pregunta uno por uno si los cierra. Después, con otro permiso, borra temporales de más de 24 h y pone el plan de energía en alto rendimiento. Al final dice cuánta RAM liberó. |
| `vigilante.bat` | Arranca en segundo plano un vigilante (unos 20-30 MB) que avisa con una notificación cuando la RAM pasa del 90 % dos revisiones seguidas, diciendo qué programa la llena. No repite el aviso antes de 10 minutos. |

También se le puede decir a Jarvis "modo turbo" o "libera memoria".

**Turbo automático** (`"automatico": true` en `turbo.json`, activado por defecto): cuando la RAM pasa del umbral, el vigilante actúa solo, sin preguntar, pero solo con lo que no hace perder trabajo: cierra los programas de la lista que están abiertos **sin ninguna ventana visible** (quedaron en segundo plano) y borra los temporales de más de 24 h como máximo una vez al día. Nunca cierra un programa con una ventana abierta: para esos avisa con la notificación. Para apagarlo, pon `"automatico": false`.

La lista de programas que ofrece cerrar, el umbral y cada cuántos segundos revisa están en `turbo.json`. La app de Claude no está en la lista a propósito (cerrarla corta la sesión con Claude); agrégala con `"claude"` si quieres.

Para detener el vigilante: Administrador de tareas > "pythonw.exe" > Finalizar tarea.

## Hablar con Jarvis (voz)

Además del chat de texto, puedes hablarle: dices "Jarvis", haces la pregunta y te responde en voz alta.

1. Instala lo de la voz (una sola vez; descarga unos cientos de MB):

   ```bat
   py -m pip install -r requirements-voz.txt
   ```

2. Arranca el modo voz:

   ```bat
   py voz.py
   ```

   o haz doble clic en `iniciar_voz.bat`. La primera vez descarga el modelo de Whisper (~460 MB) y tarda un poco.

3. Habla:
   - "Jarvis, ¿por qué va lento mi PC?" (nombre y pregunta de una vez), o
   - "Jarvis", esperas el pitido y luego preguntas.
   - Después de cada respuesta, Jarvis sigue escuchando unos 6 segundos por si quieres preguntar algo más sin repetir su nombre.
   - "Olvídalo" lo devuelve a la espera; "Jarvis, adiós" lo cierra (o Ctrl+C).

Cómo funciona:

| Parte | Con qué | ¿Internet? |
|---|---|---|
| Entender lo que dices | Whisper (`faster-whisper`), en tu PC | Solo para la primera descarga |
| Palabra "Jarvis" | Whisper busca el nombre en cada frase que oye | No |
| Responder | Claude, igual que en el modo texto | Sí |
| Hablar | Voz neuronal de Microsoft (`edge-tts`, voz colombiana por defecto); si falla, la voz de Windows | `edge-tts` sí; la de Windows no |

Seguridad: borrar temporales o cerrar un programa sigue pidiendo permiso. Jarvis te lo pregunta en voz alta y solo lo hace si contestas "sí" (o "confirmo", "adelante"). Si dices "no", no respondes o no te entiende dos veces, **no lo hace**.

Otras formas de activarlo:

| Comando | Qué hace |
|---|---|
| `py voz.py --activacion hey_jarvis` | Se activa con "Hey Jarvis" (pronunciado en inglés); gasta menos CPU |
| `py voz.py --activacion enter` | Pulsas Enter y hablas |
| `py voz.py --microfonos` | Lista los micrófonos |
| `py voz.py --microfono 2` | Usa el micrófono número 2 |

Opciones de voz (variables de entorno, con `setx NOMBRE valor`):

| Variable | Por defecto | Para qué |
|---|---|---|
| `JARVIS_WHISPER_MODELO` | `small` | `base` es más rápido y menos preciso; `medium` o `turbo`, más preciso y más pesado |
| `JARVIS_WHISPER_DISPOSITIVO` | `cpu` | `cuda` si tienes tarjeta NVIDIA con CUDA instalado |
| `JARVIS_VOZ_MOTOR` | `voicestudio`, `elevenlabs` o `piper` si están configurados, si no `edge` | `piper`, `voicestudio`, `edge`, `elevenlabs` o `sistema` (solo la voz de Windows, sin internet) |
| `JARVIS_PIPER_MODELO` | `voces\es_MX-ald-medium.onnx` | Otro modelo de Piper, p. ej. `voces\es_MX-claude-high.onnx` |
| `JARVIS_PIPER_VELOCIDAD` | `0.9` | Menos es más rápido; `1.0` es la velocidad normal |
| `JARVIS_VOZ` | `es-CO-GonzaloNeural` | Otra voz de edge-tts, p. ej. `es-CO-SalomeNeural`, `es-MX-JorgeNeural` |
| `JARVIS_VOZ_VELOCIDAD` | `+10%` | Más rápido o más lento, p. ej. `-10%` |
| `JARVIS_UMBRAL_VOZ` | `300` | Súbelo si se activa con el ruido; bájalo si no te oye |

### Voz natural sin internet (Piper, recomendada para PCs con poca RAM)

Piper corre en tu PC, gasta unos 100-200 MB de memoria y responde en segundos. No es tu voz, pero suena natural.

```bat
py -m pip install piper-tts
py -m piper.download_voices es_MX-ald-medium --download-dir voces
```

Con el archivo `voces\es_MX-ald-medium.onnx` en su sitio, Jarvis usa Piper automáticamente. Otras voces en español: `es_MX-claude-high`, `es_ES-davefx-medium`, `es_AR-daniela-high` (escúchalas en <https://rhasspy.github.io/piper-samples/>); descárgala igual y guarda su ruta en `JARVIS_PIPER_MODELO`.

### Que Jarvis hable con tu propia voz (VoiceStudio, gratis y en tu PC)

Necesita al menos 8 GB de RAM; con menos, la voz tarda minutos o no sale.


1. Instala VoiceStudio desde <https://voicestudio.sh> y ábrelo.
2. Crea un perfil de voz clonada con una grabación tuya de 1 a 2 minutos.
3. Copia el id del perfil y guárdalo: `setx JARVIS_VOZ_VOICESTUDIO "id-del-perfil"`.
4. Con VoiceStudio abierto, arranca `iniciar_voz.bat`. Si VoiceStudio está cerrado, Jarvis usa la voz de Microsoft.

Si VoiceStudio usa otro puerto: `setx JARVIS_VOICESTUDIO_URL "http://localhost:PUERTO"`.

### Que Jarvis hable con tu propia voz (ElevenLabs)

1. En <https://elevenlabs.io/app/voice-lab> crea un **Instant Voice Clone** con una grabación tuya de 1 a 2 minutos, hablando normal y sin ruido.
2. Copia el **Voice ID** de esa voz y crea tu clave en <https://elevenlabs.io/app/settings/api-keys>. Dale permiso de *Text to Speech*.
3. Guárdalas:

   ```bat
   setx ELEVENLABS_API_KEY "tu-clave-de-elevenlabs"
   setx JARVIS_VOZ_ELEVENLABS "el-voice-id"
   ```

4. Cierra la terminal y abre `iniciar_voz.bat`. Con esas dos variables, Jarvis usa tu voz automáticamente. Cada respuesta gasta créditos de ElevenLabs (más o menos un crédito por letra). Si se acaban o no hay internet, vuelve a la voz de Microsoft.

Opcional: `setx JARVIS_ELEVENLABS_MODELO "eleven_flash_v2_5"` responde más rápido y gasta la mitad de créditos, aunque se parece un poco menos a tu voz.

Si no te entiende bien: acércate al micrófono, revisa en Windows que sea el micrófono predeterminado, o prueba `JARVIS_WHISPER_MODELO=medium`.

## Configuración opcional

| Variable | Por defecto | Para qué |
|---|---|---|
| `JARVIS_MODELO` | `claude-opus-5-5` | Modelo de Claude |
| `JARVIS_ESFUERZO` | `low` | `low`, `medium` o `high`: más esfuerzo = respuestas más pensadas, más lentas y más caras |

## Estructura

```
jarvis/
├── main.py              # chat en la terminal
├── voz.py               # modo voz ("Jarvis, ...")
├── iniciar.bat          # atajo para el chat de texto
├── iniciar_voz.bat      # atajo para el modo voz
├── requirements.txt
├── requirements-voz.txt
├── tests/test_voz.py    # pruebas sin micrófono: py -m unittest discover tests
└── jarvis/
    ├── sistema.py       # lectura y acciones sobre el PC (psutil, registro de Windows)
    ├── herramientas.py  # herramientas para Claude y cuáles piden confirmación
    ├── asistente.py     # conversación con Claude
    ├── audio.py         # micrófono y detección de frases
    ├── oido.py          # Whisper: voz a texto
    ├── activacion.py    # palabra "Jarvis" y respuestas sí/no
    └── habla.py         # texto a voz
```
