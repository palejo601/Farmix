"""Pruebas del modo sin clave (órdenes fijas). No tocan el PC de verdad."""
import unittest
from unittest import mock

from jarvis import ordenes

PROCS = [
    {"pid": 10, "nombre": "chrome.exe", "memoria_mb": 400.0, "cpu_porcentaje": 5, "protegido": False},
    {"pid": 11, "nombre": "chrome.exe", "memoria_mb": 200.0, "cpu_porcentaje": 1, "protegido": False},
    {"pid": 12, "nombre": "WhatsApp.exe", "memoria_mb": 450.0, "cpu_porcentaje": 0, "protegido": False},
    {"pid": 13, "nombre": "svchost.exe", "memoria_mb": 900.0, "cpu_porcentaje": 0, "protegido": True},
]
ESTADO = {"cpu_uso_porcentaje": 30, "ram_uso_porcentaje": 91, "ram_usada_gb": 3.56, "ram_total_gb": 3.9,
          "bateria_porcentaje": 15, "bateria_conectada": False}


class OrdenesTest(unittest.TestCase):
    def setUp(self):
        self.permisos = []
        self.respuesta = True
        self.cerrados = []
        p = mock.patch.multiple(
            ordenes.sistema,
            estado_sistema=lambda: dict(ESTADO),
            procesos_principales=lambda orden="memoria", limite=10: [dict(x) for x in PROCS],
            uso_discos=lambda: [{"unidad": "C:\\", "libre_gb": 16.04, "total_gb": 118.0, "uso_porcentaje": 86}],
            programas_inicio=lambda: [{"nombre": "OneDrive"}, {"nombre": "Discord"}],
            analizar_temporales=lambda h=24: {"total_mb": 350.4, "carpetas": [{"carpeta": "C:\\Temp"}]},
            limpiar_temporales=lambda h=24: {"archivos_borrados": 120, "liberado_mb": 340.2, "archivos_en_uso_o_sin_permiso": 3},
            cerrar_proceso=lambda pid: self.cerrados.append(pid) or {"ok": True},
        )
        p.start()
        self.addCleanup(p.stop)

        def confirmar(texto):
            self.permisos.append(texto)
            return self.respuesta

        self.j = ordenes.Ordenes(confirmar)

    def test_memoria(self):
        r = self.j.preguntar("¿Cómo está la RAM?")
        self.assertIn("91 por ciento", r)
        self.assertIn("3,6 de 3,9 gigas", r)
        self.assertIn("casi llena", r)

    def test_disco(self):
        self.assertIn("16 gigas libres de 118", self.j.preguntar("cuánto espacio me queda"))

    def test_que_consume(self):
        r = self.j.preguntar("¿qué consume más?")
        self.assertIn("Chrome con 600 megas", r)  # suma sus dos procesos
        self.assertLess(r.index("Chrome"), r.index("Whatsapp"))  # ordenado por el total
        self.assertNotIn("Svchost", r)             # los de Windows no se mencionan

    def test_lento(self):
        r = self.j.preguntar("por qué va tan lento mi computador")
        self.assertIn("memoria está al 91", r)
        self.assertIn("Chrome", r)

    def test_bateria_inicio_hora_ayuda(self):
        self.assertIn("15 por ciento", self.j.preguntar("¿cuánta batería tengo?"))
        self.assertIn("OneDrive", self.j.preguntar("¿qué programas arrancan con Windows?"))
        self.assertIn("Son las", self.j.preguntar("qué hora es"))
        self.assertIn("órdenes sencillas", self.j.preguntar("ayuda"))

    def test_no_entiende(self):
        self.assertEqual(self.j.preguntar("cuéntame un chiste"), ordenes.NO_ENTENDI)

    def test_limpiar_con_permiso(self):
        r = self.j.preguntar("limpia los temporales")
        self.assertEqual(len(self.permisos), 1)
        self.assertIn("350 MB", self.permisos[0])
        self.assertIn("120 archivos", r)

    def test_limpiar_sin_permiso_no_borra(self):
        self.respuesta = False
        self.assertIn("no borré", self.j.preguntar("borra los archivos temporales"))

    def test_temporales_solo_mide(self):
        self.assertIn("350 megas", self.j.preguntar("cuánto ocupan los temporales"))
        self.assertEqual(self.permisos, [])

    def test_cerrar_programa(self):
        r = self.j.preguntar("Cierra Google Chrome.")
        self.assertEqual(self.cerrados, [10, 11])
        self.assertIn("600 MB", self.permisos[0])
        self.assertIn("cerré Chrome", r)

    def test_cerrar_con_alias_y_negativa(self):
        self.respuesta = False
        self.assertIn("dejo Whatsapp abierto", self.j.preguntar("cierra el wasap"))
        self.assertEqual(self.cerrados, [])

    def test_cerrar_protegido_o_inexistente(self):
        self.assertIn("parte de Windows", self.j.preguntar("cierra svchost"))
        self.assertIn("No encuentro", self.j.preguntar("cierra spotify"))
        self.assertIn("Qué programa", self.j.preguntar("cierra"))
        self.assertEqual(self.permisos, [])

    def test_hay_clave(self):
        with mock.patch.dict("os.environ", {"ANTHROPIC_API_KEY": ""}):
            self.assertFalse(ordenes.hay_clave())
        with mock.patch.dict("os.environ", {"ANTHROPIC_API_KEY": "sk-x"}):
            self.assertTrue(ordenes.hay_clave())


if __name__ == "__main__":
    unittest.main()
