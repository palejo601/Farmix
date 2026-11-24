"""Pruebas del modo turbo y del vigilante. No tocan el PC de verdad."""
import unittest
from unittest import mock

from jarvis import ordenes, turbo

ABIERTOS = {
    "chrome": {"mb": 812.4, "pids": [10, 11]},
    "whatsapp": {"mb": 450.0, "pids": [12]},
    "claude": {"mb": 1500.0, "pids": [20]},
    "notepad": {"mb": 20.0, "pids": [30]},
}
CONFIG = {"programas": ["chrome", "whatsapp", "spotify"], "umbral_ram": 90, "intervalo": 15}


class TurboTest(unittest.TestCase):
    def setUp(self):
        self.cerrados, self.permisos = [], []
        self.respuestas = {}
        libre = iter([500, 1700])
        parches = [
            mock.patch.object(turbo, "programas_abiertos", lambda: {k: dict(v) for k, v in ABIERTOS.items()}),
            mock.patch.object(turbo, "cargar_config", lambda: dict(CONFIG)),
            mock.patch.object(turbo, "ram_libre_mb", lambda: next(libre)),
            mock.patch.object(turbo, "plan_energia_alto", lambda: True),
            mock.patch.object(turbo.time, "sleep", lambda s: None),
            mock.patch.object(turbo.sistema, "cerrar_proceso", lambda pid: self.cerrados.append(pid) or {"ok": True}),
            mock.patch.object(turbo.sistema, "limpiar_temporales", lambda h=24: {"liberado_mb": 120.4}),
        ]
        for p in parches:
            p.start()
            self.addCleanup(p.stop)

    def confirmar(self, texto):
        self.permisos.append(texto)
        for clave, valor in self.respuestas.items():
            if clave in texto:
                return valor
        return True

    def test_plan_solo_programas_pesados_ordenados(self):
        plan = turbo.plan_turbo()
        self.assertEqual([p["programa"] for p in plan], ["chrome", "whatsapp"])
        self.assertEqual(plan[0]["mb"], 812)

    def test_no_ofrece_cerrar_claude(self):
        self.assertNotIn("claude", [p["programa"] for p in turbo.plan_turbo()])

    def test_cierra_solo_lo_autorizado(self):
        self.respuestas = {"Whatsapp": False}
        r = turbo.modo_turbo(self.confirmar)
        self.assertEqual(self.cerrados, [10, 11])
        self.assertEqual(r["cerrados"], ["Chrome"])
        self.assertEqual(r["dejados"], ["Whatsapp"])
        self.assertEqual(r["liberado_mb"], 1200)
        self.assertEqual(r["temporales_mb"], 120)
        self.assertTrue(r["alto_rendimiento"])

    def test_sin_permiso_no_limpia_ni_cambia_energia(self):
        self.respuestas = {"temporales": False}
        r = turbo.modo_turbo(self.confirmar)
        self.assertEqual(r["temporales_mb"], 0)
        self.assertFalse(r["alto_rendimiento"])

    def test_resumen_en_espanol(self):
        r = turbo.modo_turbo(self.confirmar)
        frase = turbo.resumen_turbo(r)
        self.assertIn("Cerré Chrome, Whatsapp", frase)
        self.assertIn("1,7 gigas libres", frase)

    def test_orden_de_jarvis(self):
        j = ordenes.Ordenes(self.confirmar)
        self.assertIn("Modo turbo listo", j.preguntar("Jarvis, activa el modo turbo"))


class VigilanteTest(unittest.TestCase):
    def setUp(self):
        self.avisos = []
        self.ahora = 0.0
        p = mock.patch.object(turbo, "programas_abiertos", lambda: {k: dict(v) for k, v in ABIERTOS.items()})
        p.start()
        self.addCleanup(p.stop)
        self.v = turbo.Vigilante(avisar=lambda t, x: self.avisos.append(x), config=dict(CONFIG),
                                 reloj=lambda: self.ahora)

    def test_avisa_tras_dos_revisiones_altas(self):
        self.assertIsNone(self.v.revisar(93))
        texto = self.v.revisar(94)
        self.assertIn("94 %", texto)
        self.assertIn("Claude (1500 MB) y Chrome (812 MB)", texto)

    def test_no_avisa_si_baja(self):
        self.v.revisar(93)
        self.v.revisar(70)
        self.v.revisar(93)
        self.assertEqual(self.avisos, [])

    def test_no_repite_antes_de_diez_minutos(self):
        self.v.revisar(95); self.v.revisar(95)
        self.ahora = 300
        self.v.revisar(95)
        self.assertEqual(len(self.avisos), 1)
        self.ahora = 700
        self.v.revisar(95)
        self.assertEqual(len(self.avisos), 2)


if __name__ == "__main__":
    unittest.main()
