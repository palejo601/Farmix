"""Respuestas habladas.

Tres motores:
- "elevenlabs": habla con la voz que elijas en ElevenLabs, por ejemplo tu
  propia voz clonada. Necesita internet, ELEVENLABS_API_KEY y
  JARVIS_VOZ_ELEVENLABS (el voice_id). Gasta créditos de ElevenLabs.
  Si esas dos variables existen, se usa automáticamente.
- "edge" (si no hay ElevenLabs): voces neuronales de Microsoft, suenan naturales.
  Necesita internet; no requiere clave ni cuenta.
- "sistema": las voces que trae Windows (SAPI). Funciona sin internet, suena
  más robótica. Para tener voz en español, Windows debe tener instalado el
  paquete de voz en español (Configuración > Hora e idioma > Voz).

Si un motor falla (sin internet, sin créditos, servicio caído), Jarvis pasa
solo al siguiente: elevenlabs -> edge -> sistema.
"""
from __future__ import annotations

import asyncio
import io
import json
import os
import re
import urllib.error
import urllib.request

import numpy as np

ELEVEN_CLAVE = os.environ.get("ELEVENLABS_API_KEY", "")
ELEVEN_VOZ = os.environ.get("JARVIS_VOZ_ELEVENLABS", "")
ELEVEN_MODELO = os.environ.get("JARVIS_ELEVENLABS_MODELO", "eleven_multilingual_v2")
MOTOR = os.environ.get("JARVIS_VOZ_MOTOR", "elevenlabs" if ELEVEN_CLAVE and ELEVEN_VOZ else "edge")
VOZ_EDGE = os.environ.get("JARVIS_VOZ", "es-CO-GonzaloNeural")  # p. ej. es-CO-SalomeNeural, es-MX-JorgeNeural
VELOCIDAD = os.environ.get("JARVIS_VOZ_VELOCIDAD", "+10%")


# --- Texto para leer en voz alta ---------------------------------------------

_UNIDADES = [
    (re.compile(r"(\d)\s*GB\b"), r"\1 gigas"),
    (re.compile(r"(\d)\s*MB\b"), r"\1 megas"),
    (re.compile(r"(\d)\s*KB\b"), r"\1 kilobytes"),
    (re.compile(r"(\d)\s*%"), r"\1 por ciento"),
    (re.compile(r"(\d)\s*h\b"), r"\1 horas"),
    (re.compile(r"\bPID\b"), "pe i de"),
]


def limpiar_para_voz(texto: str) -> str:
    """Quita el formato Markdown y adapta cifras para que suene natural."""
    t = re.sub(r"```.*?```", " ", texto, flags=re.S)          # bloques de código
    t = re.sub(r"`([^`]*)`", r"\1", t)                         # código en línea
    t = re.sub(r"!?\[([^\]]*)\]\([^)]*\)", r"\1", t)           # enlaces
    t = re.sub(r"https?://\S+", "el enlace", t)
    t = re.sub(r"^\s*\|?\s*:?-{2,}.*$", " ", t, flags=re.M)    # separadores de tabla
    t = t.replace("|", ", ")
    t = re.sub(r"^\s{0,3}#{1,6}\s*", "", t, flags=re.M)        # títulos
    t = re.sub(r"^\s*(?:[-*•]|\d+[.)])\s+", "", t, flags=re.M)  # viñetas
    t = re.sub(r"(\*\*|__|\*|_|~~)(.+?)\1", r"\2", t)          # negritas, cursivas
    t = t.replace("→", " a ").replace("≈", " unos ")
    for patron, cambio in _UNIDADES:
        t = patron.sub(cambio, t)
    t = re.sub(r"\n{2,}", ". ", t)
    t = re.sub(r"\s*\n\s*", ". ", t)
    t = re.sub(r"(,\s*){2,}", ", ", t)
    t = re.sub(r"\.(\s*\.)+", ".", t)
    t = re.sub(r"[ \t]{2,}", " ", t)
    return t.strip(" ,.") + ("." if t.strip(" ,.") else "")


# --- Motores -----------------------------------------------------------------

def decodificar_audio(datos: bytes) -> tuple[np.ndarray, int]:
    """MP3 (u otro formato) a muestras int16 mono. Usa PyAV, que ya instala faster-whisper."""
    import av

    contenedor = av.open(io.BytesIO(datos))
    flujo = contenedor.streams.audio[0]
    frecuencia = flujo.rate or 24000
    remuestreo = av.AudioResampler(format="s16", layout="mono", rate=frecuencia)
    partes = []
    for cuadro in contenedor.decode(flujo):
        for salida in remuestreo.resample(cuadro):
            partes.append(salida.to_ndarray().reshape(-1))
    for salida in remuestreo.resample(None):
        partes.append(salida.to_ndarray().reshape(-1))
    contenedor.close()
    if not partes:
        return np.zeros(0, dtype=np.int16), frecuencia
    return np.concatenate(partes).astype(np.int16), frecuencia


class _VozEdge:
    def __init__(self, voz: str = VOZ_EDGE, velocidad: str = VELOCIDAD):
        import edge_tts  # noqa: F401  (falla aquí si no está instalado)

        self.voz = voz
        self.velocidad = velocidad

    async def _sintetizar(self, texto: str) -> bytes:
        import edge_tts

        datos = bytearray()
        async for trozo in edge_tts.Communicate(texto, self.voz, rate=self.velocidad).stream():
            if trozo["type"] == "audio":
                datos.extend(trozo["data"])
        return bytes(datos)

    def decir(self, texto: str) -> None:
        import sounddevice as sd

        muestras, frecuencia = decodificar_audio(asyncio.run(self._sintetizar(texto)))
        if muestras.size:
            sd.play(muestras, frecuencia)
            sd.wait()


class _VozElevenLabs:
    URL = "https://api.elevenlabs.io/v1/text-to-speech/{voz}?output_format=mp3_44100_128"

    def __init__(self, clave: str = ELEVEN_CLAVE, voz: str = ELEVEN_VOZ, modelo: str = ELEVEN_MODELO):
        if not clave:
            raise RuntimeError("falta ELEVENLABS_API_KEY")
        if not voz:
            raise RuntimeError("falta JARVIS_VOZ_ELEVENLABS (el voice_id de tu voz)")
        self.clave, self.voz, self.modelo = clave, voz, modelo

    def sintetizar(self, texto: str) -> bytes:
        cuerpo = json.dumps({"text": texto, "model_id": self.modelo}).encode()
        pedido = urllib.request.Request(
            self.URL.format(voz=self.voz),
            data=cuerpo,
            headers={"xi-api-key": self.clave, "Content-Type": "application/json", "Accept": "audio/mpeg"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(pedido, timeout=30) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            detalle = e.read().decode("utf-8", "replace")[:200]
            raise RuntimeError(f"ElevenLabs respondió {e.code}: {detalle}") from None

    def decir(self, texto: str) -> None:
        import sounddevice as sd

        muestras, frecuencia = decodificar_audio(self.sintetizar(texto))
        if muestras.size:
            sd.play(muestras, frecuencia)
            sd.wait()


class _VozSistema:
    def __init__(self):
        import pyttsx3

        self.motor = pyttsx3.init()
        voz = _buscar_voz_espanol(self.motor.getProperty("voices"))
        if voz is not None:
            self.motor.setProperty("voice", voz.id)
        self.motor.setProperty("rate", 185)

    def decir(self, texto: str) -> None:
        self.motor.say(texto)
        self.motor.runAndWait()


def _buscar_voz_espanol(voces):
    for v in voces or []:
        datos = f"{v.id} {v.name} {getattr(v, 'languages', '')}".lower()
        if any(p in datos for p in ("spanish", "español", "espanol", "es-", "es_", "helena", "sabina", "laura", "pablo")):
            return v
    return None


def pitido(frecuencia: int = 880, duracion: float = 0.12) -> None:
    """Sonido corto para avisar que Jarvis te está escuchando."""
    try:
        import sounddevice as sd

        t = np.linspace(0, duracion, int(22050 * duracion), endpoint=False)
        onda = 0.25 * np.sin(2 * np.pi * frecuencia * t) * np.hanning(t.size)
        sd.play(onda.astype(np.float32), 22050)
        sd.wait()
    except Exception:
        print("\a", end="", flush=True)


class Voz:
    """Habla en voz alta; si un motor falla, prueba con el otro o solo imprime."""

    def __init__(self, motor: str = MOTOR):
        self._motores: list = []
        clases = {"elevenlabs": _VozElevenLabs, "edge": _VozEdge, "sistema": _VozSistema}
        orden = {
            "elevenlabs": ["elevenlabs", "edge", "sistema"],
            "edge": ["edge", "sistema"],
            "sistema": ["sistema", "edge"],
        }.get(motor, ["edge", "sistema"])
        for nombre in orden:
            try:
                self._motores.append(clases[nombre]())
            except Exception as e:
                print(f"    (voz '{nombre}' no disponible: {e})")
        if not self._motores:
            print("    (sin voz: Jarvis solo escribirá las respuestas)")

    def decir(self, texto: str) -> None:
        texto = limpiar_para_voz(texto)
        if not texto:
            return
        while self._motores:
            try:
                self._motores[0].decir(texto)
                return
            except Exception as e:
                print(f"    (falló la voz, cambio de motor: {type(e).__name__}: {e})")
                self._motores.pop(0)
