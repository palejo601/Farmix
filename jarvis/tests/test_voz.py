"""Pruebas de la parte de voz que no necesitan micrófono ni internet.

Uso:  py -m unittest discover tests
"""
import unittest

import numpy as np

from jarvis.activacion import buscar_activacion, es_afirmativo, es_despedida, es_olvidalo
from jarvis.audio import FRECUENCIA, MUESTRAS_BLOQUE, DetectorFrase
from jarvis.habla import limpiar_para_voz
from jarvis.oido import limpiar_transcripcion


def bloques(segundos: float, volumen: float, rng=np.random.default_rng(0)):
    n = int(segundos * FRECUENCIA / MUESTRAS_BLOQUE)
    for _ in range(n):
        yield (rng.standard_normal(MUESTRAS_BLOQUE) * volumen).astype(np.int16)


def frases(*tramos):
    det = DetectorFrase()
    salida = []
    for segundos, volumen in tramos:
        for b in bloques(segundos, volumen):
            f = det.procesar(b)
            if f is not None:
                salida.append(len(f) / FRECUENCIA)
    return salida


class DetectorFraseTest(unittest.TestCase):
    def test_corta_una_frase_tras_el_silencio(self):
        r = frases((1, 50), (2, 3000), (1.5, 50))
        self.assertEqual(len(r), 1)
        self.assertGreater(r[0], 2.0)

    def test_dos_frases_separadas(self):
        self.assertEqual(len(frases((1, 50), (1, 3000), (1.2, 50), (1, 3000), (1.2, 50))), 2)

    def test_ignora_ruido_y_golpes(self):
        self.assertEqual(frases((3, 80)), [])
        self.assertEqual(frases((1, 50), (0.15, 5000), (1.5, 50)), [])

    def test_se_adapta_a_un_ventilador(self):
        # Ruido de fondo alto y constante: no debe contar como voz, pero sí la voz encima.
        self.assertEqual(frases((4, 600)), [])
        self.assertEqual(len(frases((4, 600), (2, 6000), (1.5, 600))), 1)

    def test_limita_la_duracion(self):
        r = frases((1, 50), (20, 3000))
        self.assertTrue(r and r[0] <= 15.1)


class ActivacionTest(unittest.TestCase):
    def test_nombre_y_pregunta(self):
        self.assertEqual(buscar_activacion("Jarvis, ¿por qué va lento mi PC?"), (True, "¿por qué va lento mi PC?"))
        self.assertEqual(buscar_activacion("Oye Yarvis qué ocupa el disco"), (True, "qué ocupa el disco"))
        self.assertEqual(buscar_activacion("Hey, Jarvis."), (True, ""))
        self.assertEqual(buscar_activacion("jarbis"), (True, ""))

    def test_sin_nombre(self):
        self.assertEqual(buscar_activacion("pásame la sal"), (False, ""))
        self.assertFalse(buscar_activacion("jarvisito")[0])

    def test_si_o_no(self):
        for t in ("Sí.", "sí, confirmo", "Adelante", "dale"):
            self.assertTrue(es_afirmativo(t), t)
        for t in ("No.", "no, espera", "cancela", "sí, no, mejor no"):
            self.assertFalse(es_afirmativo(t), t)
        for t in ("", "mmm", "¿qué?"):
            self.assertIsNone(es_afirmativo(t), t)

    def test_salir_y_olvidar(self):
        self.assertTrue(es_despedida("Adiós."))
        self.assertTrue(es_despedida("apágate"))
        self.assertFalse(es_despedida("¿cómo apago el bluetooth?"))
        self.assertTrue(es_olvidalo("Olvídalo"))
        self.assertFalse(es_olvidalo("¿cuánto ocupa la carpeta nada?"))


class TextoTest(unittest.TestCase):
    def test_quita_markdown(self):
        t = limpiar_para_voz("## Resumen\n\n- **Chrome** usa 2.1 GB\n- La CPU está al 85%\n\nVer `taskmgr`.")
        self.assertEqual(t, "Resumen. Chrome usa 2.1 gigas. La CPU está al 85 por ciento. Ver taskmgr.")
        self.assertNotIn("*", t)
        self.assertNotIn("#", t)

    def test_tabla(self):
        t = limpiar_para_voz("| Proceso | MB |\n|---|---|\n| chrome | 900 MB |")
        self.assertNotIn("|", t)
        self.assertNotIn("---", t)
        self.assertIn("900 megas", t)

    def test_alucinaciones(self):
        self.assertEqual(limpiar_transcripcion(" Gracias por ver el video. "), "")
        self.assertEqual(limpiar_transcripcion("Subtítulos realizados por la comunidad de Amara.org"), "")
        self.assertEqual(limpiar_transcripcion("  hola   Jarvis "), "hola Jarvis")


if __name__ == "__main__":
    unittest.main()


class ConversacionTest(unittest.TestCase):
    """Simula micrófono, Whisper, voz y Claude para probar el flujo completo."""

    def armar(self, oido_textos, respuestas):
        import voz

        c = voz.ConversacionPorVoz.__new__(voz.ConversacionPorVoz)
        dicho = []
        cola = list(oido_textos)

        class Mic:
            def vaciar(self): pass
            def escuchar_frase(self, limite=None):
                if not cola:
                    raise KeyboardInterrupt  # se acabó el guion
                t = cola.pop(0)
                return None if t is None else np.zeros(10, np.int16) + len(dicho)

        class Oido:
            def __init__(self): self.ultimo = None
            def transcribir(self, audio, rapido=False):
                return self.ultimo

        oido = Oido()

        def escuchar(limite=None):
            if cola and cola[0] is not None:
                oido.ultimo = cola[0]
            return Mic.escuchar_frase(mic, limite)

        mic = Mic()
        mic.escuchar_frase = escuchar

        class Voz:
            def decir(self, t): dicho.append(t)

        class Claude:
            def __init__(self): self.preguntas = []
            def preguntar(self, t):
                self.preguntas.append(t)
                r = respuestas.pop(0)
                return r(c) if callable(r) else r

        c.mic, c.oido, c.voz, c.jarvis = mic, oido, Voz(), Claude()
        c.activacion, c.detector, c.pitido = "jarvis", None, lambda: None
        return c, dicho

    def correr(self, c):
        try:
            while c.conversar(c.esperar_jarvis()):
                pass
        except KeyboardInterrupt:
            pass

    def test_nombre_y_pregunta_en_una_frase(self):
        c, dicho = self.armar(["hola a todos", "Jarvis, ¿por qué va lento?", None], ["Chrome usa mucha memoria."])
        self.correr(c)
        self.assertEqual(c.jarvis.preguntas, ["¿por qué va lento?"])
        self.assertIn("Chrome usa mucha memoria.", dicho)

    def test_nombre_solo_luego_pregunta_y_seguimiento(self):
        c, dicho = self.armar(["Jarvis.", "qué ocupa el disco", "y la memoria", None], ["El disco C.", "8 gigas."])
        self.correr(c)
        self.assertEqual(c.jarvis.preguntas, ["qué ocupa el disco", "y la memoria"])

    def test_confirmacion_por_voz(self):
        resultados = []
        def pide_permiso(conv):
            resultados.append(conv.confirmar("Borrar archivos temporales (300 MB aprox.) en: C:\\Temp"))
            resultados.append(conv.confirmar("Cerrar el proceso chrome.exe (PID 42, 900 MB)."))
            resultados.append(conv.confirmar("Cerrar el proceso x (PID 1, 1 MB)."))
            return "Listo."
        c, dicho = self.armar(
            ["Jarvis limpia los temporales", "sí, confirmo", "no", "eh", None, None],
            [pide_permiso],
        )
        self.correr(c)
        self.assertEqual(resultados, [True, False, False])
        self.assertFalse(any("C:\\Temp" in d for d in dicho))  # no lee rutas en voz alta

    def test_despedida(self):
        c, dicho = self.armar(["Jarvis, adiós"], [])
        self.assertFalse(c.conversar(c.esperar_jarvis()))
        self.assertEqual(c.jarvis.preguntas, [])
