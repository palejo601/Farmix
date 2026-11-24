"""Palabra de activación "Jarvis" y respuestas de sí/no habladas.

Hay dos formas de despertar a Jarvis:

- "jarvis" (por defecto): cada frase que oye el micrófono pasa por Whisper y
  se busca el nombre. Sirve con solo decir "Jarvis" y permite decirlo todo
  de una vez: "Jarvis, ¿por qué va lento mi PC?". Usa más CPU cuando hay
  mucha gente hablando cerca.
- "hey_jarvis": un modelo pequeño (openWakeWord) que escucha "Hey Jarvis"
  sin pasar por Whisper. Gasta muy poca CPU, pero hay que decir "Hey Jarvis"
  con pronunciación en inglés.
"""
from __future__ import annotations

import re
import unicodedata

import numpy as np

# Cómo suele escribir Whisper el nombre cuando se pronuncia en español.
_VARIANTES = r"jarvis|jarbis|yarvis|yarbis|harvis|harbis|jervis|charvis|chárvis|járvis|yárvis|garvis"
_PATRON = re.compile(rf"(?:\b(?:hey|ey|oye|hola)\s*,?\s*)?\b(?:{_VARIANTES})\b[\s,.:;!?-]*", re.IGNORECASE)


def sin_tildes(texto: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn")


def normalizar(texto: str) -> str:
    texto = sin_tildes(texto.lower())
    texto = re.sub(r"[^\w\s]", " ", texto)
    return " ".join(texto.split())


def buscar_activacion(texto: str) -> tuple[bool, str]:
    """¿La frase nombra a Jarvis? Devuelve (activado, lo que se dijo después del nombre)."""
    m = _PATRON.search(texto)
    if not m:
        return False, ""
    return True, texto[m.end():].strip()


_AFIRMATIVAS = {"si", "confirmo", "confirmado", "adelante", "hazlo", "dale", "claro", "vale", "ok", "okay", "autorizo", "procede"}
_NEGATIVAS = {"no", "cancela", "cancelar", "espera", "detente", "nunca", "negativo"}


def es_afirmativo(texto: str) -> bool | None:
    """True si autoriza, False si niega, None si no se entiende. Ante la duda, no es un sí."""
    palabras = set(normalizar(texto).split())
    if palabras & _NEGATIVAS:
        return False
    if palabras & _AFIRMATIVAS:
        return True
    return None


_DESPEDIDAS = re.compile(r"^(adios|hasta luego|chao|apagate|salir|termina|terminar)\b")
_OLVIDAR = re.compile(r"^(nada|olvidalo|cancela|cancelar|no importa|dejalo)\b")


def es_despedida(texto: str) -> bool:
    return bool(_DESPEDIDAS.match(normalizar(texto)))


def es_olvidalo(texto: str) -> bool:
    return bool(_OLVIDAR.match(normalizar(texto)))


class DetectorHeyJarvis:
    """Escucha "Hey Jarvis" con openWakeWord. Recibe bloques int16 a 16 kHz."""

    PASO = 1280  # 80 ms, lo que espera openWakeWord

    def __init__(self, umbral: float = 0.5):
        import openwakeword.utils
        from openwakeword.model import Model

        openwakeword.utils.download_models(["hey_jarvis"])  # solo descarga la primera vez
        self.modelo = Model(wakeword_models=["hey_jarvis"], inference_framework="onnx")
        self.umbral = umbral
        self._pendiente = np.zeros(0, dtype=np.int16)

    def reiniciar(self) -> None:
        self.modelo.reset()
        self._pendiente = np.zeros(0, dtype=np.int16)

    def procesar(self, bloque: np.ndarray) -> bool:
        self._pendiente = np.concatenate([self._pendiente, bloque])
        activado = False
        while len(self._pendiente) >= self.PASO:
            trozo, self._pendiente = self._pendiente[: self.PASO], self._pendiente[self.PASO:]
            puntajes = self.modelo.predict(trozo)
            if max(puntajes.values()) >= self.umbral:
                activado = True
        return activado
