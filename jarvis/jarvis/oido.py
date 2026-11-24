"""Reconocimiento de voz con Whisper (faster-whisper), funciona sin internet.

La primera vez descarga el modelo (~460 MB el "small") y lo guarda en caché.
"""
from __future__ import annotations

import os

import numpy as np

MODELO = os.environ.get("JARVIS_WHISPER_MODELO", "small")  # tiny, base, small, medium, large-v3, turbo
DISPOSITIVO = os.environ.get("JARVIS_WHISPER_DISPOSITIVO", "cpu")  # cpu o cuda
IDIOMA = os.environ.get("JARVIS_IDIOMA", "es")

# Ayuda a Whisper a escribir bien el nombre y el vocabulario del PC.
PISTA = "Jarvis, asistente del computador: memoria RAM, procesos, disco, temporales, inicio de Windows."

# Frases que Whisper a veces "oye" en el silencio o el ruido.
ALUCINACIONES = (
    "subtitulos realizados por la comunidad de amara.org",
    "subtítulos realizados por la comunidad de amara.org",
    "gracias por ver el video",
    "gracias por ver",
    "suscribete",
    "suscríbete",
)


class Oido:
    def __init__(self, modelo: str = MODELO, dispositivo: str = DISPOSITIVO):
        from faster_whisper import WhisperModel

        tipo = "float16" if dispositivo == "cuda" else "int8"
        self.modelo = WhisperModel(modelo, device=dispositivo, compute_type=tipo)

    def transcribir(self, audio: np.ndarray, rapido: bool = False) -> str:
        """Recibe audio int16 a 16 kHz y devuelve el texto (vacío si no entendió nada).

        `rapido` usa una búsqueda más simple: sirve para buscar la palabra de
        activación en todo lo que se oye sin cargar tanto la CPU.
        """
        senal = audio.astype(np.float32) / 32768.0
        segmentos, _info = self.modelo.transcribe(
            senal,
            language=IDIOMA,
            initial_prompt=PISTA,
            beam_size=1 if rapido else 5,
            condition_on_previous_text=False,
            vad_filter=True,
        )
        partes = [s.text for s in segmentos if s.no_speech_prob < 0.6]
        return limpiar_transcripcion(" ".join(partes))


def limpiar_transcripcion(texto: str) -> str:
    texto = " ".join(texto.split()).strip()
    base = texto.lower().strip(" .!¡¿?")
    if base in ALUCINACIONES:
        return ""
    # A veces Whisper repite la pista en vez de oír algo: eso no cuenta como frase.
    if len(base) > 12 and base in PISTA.lower():
        return ""
    return texto
