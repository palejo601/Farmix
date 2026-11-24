"""Micrófono y detección de cuándo empieza y termina una frase.

El micrófono entrega bloques de 30 ms a 16 kHz (lo que usa Whisper).
`DetectorFrase` decide, por la energía del sonido, dónde hay voz:
aprende el ruido de fondo de la habitación y corta la frase cuando
hay un silencio de casi un segundo.
"""
from __future__ import annotations

import os
import queue
import time
from collections import deque

import numpy as np

FRECUENCIA = 16000
MS_BLOQUE = 30
MUESTRAS_BLOQUE = FRECUENCIA * MS_BLOQUE // 1000  # 480

# Volumen mínimo (RMS de int16) para considerar que alguien habla.
# Súbelo si Jarvis se activa con el ruido; bájalo si no te oye.
UMBRAL_MINIMO = float(os.environ.get("JARVIS_UMBRAL_VOZ", "300"))


def rms(bloque: np.ndarray) -> float:
    if bloque.size == 0:
        return 0.0
    return float(np.sqrt(np.mean(bloque.astype(np.float32) ** 2)))


class DetectorFrase:
    """Recibe bloques de audio y devuelve la frase completa cuando termina."""

    def __init__(
        self,
        silencio_fin: float = 0.9,
        duracion_min: float = 0.35,
        duracion_max: float = 15.0,
        pre_voz: float = 0.3,
        umbral_minimo: float = UMBRAL_MINIMO,
    ):
        self.bloques_silencio_fin = int(silencio_fin * 1000 / MS_BLOQUE)
        self.bloques_min = int(duracion_min * 1000 / MS_BLOQUE)
        self.bloques_max = int(duracion_max * 1000 / MS_BLOQUE)
        self.umbral_minimo = umbral_minimo
        self.ruido = umbral_minimo / 3  # nivel de fondo estimado
        self._calibracion: list[float] = []  # el primer medio segundo se toma como ruido
        self.bloques_calibracion = int(500 / MS_BLOQUE)
        self.previos: deque = deque(maxlen=max(1, int(pre_voz * 1000 / MS_BLOQUE)))
        self._reiniciar()

    def _reiniciar(self) -> None:
        self.hablando = False
        self.frase: list[np.ndarray] = []
        self.seguidos_voz = 0
        self.seguidos_silencio = 0
        self.bloques_con_voz = 0

    @property
    def umbral(self) -> float:
        return max(self.umbral_minimo, self.ruido * 3.0)

    def procesar(self, bloque: np.ndarray) -> np.ndarray | None:
        nivel = rms(bloque)
        if len(self._calibracion) < self.bloques_calibracion:
            self._calibracion.append(nivel)
            self.previos.append(bloque)
            if len(self._calibracion) == self.bloques_calibracion:
                self.ruido = float(np.median(self._calibracion))
            return None
        hay_voz = nivel > self.umbral

        if not self.hablando:
            if not hay_voz:
                # Solo se aprende el ruido cuando nadie habla.
                self.ruido = 0.95 * self.ruido + 0.05 * nivel
            self.previos.append(bloque)
            self.seguidos_voz = self.seguidos_voz + 1 if hay_voz else 0
            if self.seguidos_voz >= 3:  # ~90 ms de voz seguida
                self.hablando = True
                self.frase = list(self.previos)
                self.previos.clear()
                self.seguidos_silencio = 0
                self.bloques_con_voz = self.seguidos_voz
            return None

        self.frase.append(bloque)
        if nivel > self.umbral * 0.7:
            self.seguidos_silencio = 0
            self.bloques_con_voz += 1
        else:
            self.seguidos_silencio += 1
        terminado = self.seguidos_silencio >= self.bloques_silencio_fin or len(self.frase) >= self.bloques_max
        if not terminado:
            return None

        frase = self.frase
        voz_util = self.bloques_con_voz
        self._reiniciar()
        if len(frase) >= self.bloques_max:
            # Tanto rato "hablando" sin pausa suele ser ruido constante (ventilador,
            # música): se sube el nivel de fondo para no quedarse atrapado ahí.
            self.ruido = max(self.ruido, float(np.median([rms(b) for b in frase])) * 0.8)
        if voz_util < self.bloques_min:
            return None  # un golpe o un clic, no una frase
        return np.concatenate(frase)


class Microfono:
    """Abre el micrófono por defecto y deja los bloques en una cola."""

    def __init__(self, dispositivo: int | str | None = None):
        import sounddevice as sd  # se importa aquí para que el modo texto no lo necesite

        self._cola: queue.Queue = queue.Queue()
        self._flujo = sd.InputStream(
            samplerate=FRECUENCIA,
            channels=1,
            dtype="int16",
            blocksize=MUESTRAS_BLOQUE,
            device=dispositivo,
            callback=self._recibir,
        )

    def _recibir(self, datos, _frames, _tiempo, _estado) -> None:
        self._cola.put(datos[:, 0].copy())

    def __enter__(self) -> "Microfono":
        self._flujo.start()
        return self

    def __exit__(self, *_exc) -> None:
        self._flujo.stop()
        self._flujo.close()

    def vaciar(self) -> None:
        """Descarta lo grabado mientras Jarvis hablaba, para que no se escuche a sí mismo."""
        while True:
            try:
                self._cola.get_nowait()
            except queue.Empty:
                return

    def bloque(self, espera: float = 0.5) -> np.ndarray | None:
        try:
            return self._cola.get(timeout=espera)
        except queue.Empty:
            return None

    def escuchar_frase(self, limite: float | None = None, **opciones) -> np.ndarray | None:
        """Espera una frase. Con `limite` (segundos) se rinde si nadie empieza a hablar."""
        detector = DetectorFrase(**opciones)
        inicio = time.monotonic()
        while True:
            b = self.bloque()
            if b is not None:
                frase = detector.procesar(b)
                if frase is not None:
                    return frase
            if limite is not None and not detector.hablando and time.monotonic() - inicio > limite:
                return None
