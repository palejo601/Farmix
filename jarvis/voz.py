"""Jarvis por voz: di "Jarvis" y pregunta.

Uso:
    py voz.py                         # se activa al oír "Jarvis"
    py voz.py --activacion hey_jarvis # se activa con "Hey Jarvis" (menos CPU)
    py voz.py --activacion enter      # pulsas Enter y hablas
    py voz.py --microfonos            # lista los micrófonos disponibles
    py voz.py --sin-clave             # órdenes fijas, sin Claude (automático si no hay clave)
"""
from __future__ import annotations

import argparse
import sys

from jarvis.activacion import buscar_activacion, es_afirmativo, es_despedida, es_olvidalo

INSTRUCCIONES_VOZ = """Ahora hablas por voz: tu respuesta se lee en voz alta.
Responde en una a tres frases cortas, sin tablas, listas, emojis ni formato Markdown.
Redondea las cifras ("8 gigas de 16", "casi lleno") y no leas rutas de carpetas largas.
Si hay mucho que contar, di lo más importante y ofrece dar más detalle.
Lo que dice el usuario viene de reconocimiento de voz y puede traer errores:
si algo no tiene sentido, pregunta en vez de adivinar."""

SEGUNDOS_PARA_SEGUIR = 6  # tras responder, escucha esto sin pedir "Jarvis" otra vez


class ConversacionPorVoz:
    def __init__(self, activacion: str, microfono: int | None, sin_clave: bool = False):
        from jarvis.audio import Microfono
        from jarvis.habla import Voz, pitido
        from jarvis.oido import MODELO, Oido

        self.activacion = activacion
        self.pitido = pitido
        print(f"Cargando reconocimiento de voz (Whisper '{MODELO}'). La primera vez descarga el modelo...")
        self.oido = Oido()
        self.voz = Voz()
        self.detector = None
        if activacion == "hey_jarvis":
            from jarvis.activacion import DetectorHeyJarvis

            print("Cargando detector de 'Hey Jarvis'...")
            self.detector = DetectorHeyJarvis()
        self.mic = Microfono(microfono)
        self.sin_clave = sin_clave
        if sin_clave:
            from jarvis.ordenes import Ordenes as Cerebro
        else:
            from jarvis.asistente import Jarvis as Cerebro
        self.jarvis = Cerebro(
            self.confirmar,
            al_usar_herramienta=lambda n: print(f"    · revisando: {n}"),
            sistema_extra=INSTRUCCIONES_VOZ,
        )

    # --- piezas básicas -------------------------------------------------------

    def decir(self, texto: str) -> None:
        print(f"\nJarvis: {texto}\n")
        self.voz.decir(texto)
        self.mic.vaciar()  # que no se oiga a sí mismo

    def oir(self, limite: float | None, rapido: bool = False):
        """Escucha una frase y la transcribe. Devuelve (texto, audio)."""
        audio = self.mic.escuchar_frase(limite=limite)
        if audio is None:
            return "", None
        return self.oido.transcribir(audio, rapido=rapido), audio

    def confirmar(self, descripcion: str) -> bool:
        """Las acciones que borran o cierran algo se autorizan diciendo sí o no."""
        print(f"\n[!] Jarvis quiere: {descripcion}")
        resumen = descripcion.split(" en: ")[0]  # sin la lista de carpetas
        self.decir(f"Necesito tu permiso para esto: {resumen} ¿Lo autorizas? Di sí o no.")
        for intento in range(2):
            self.pitido()
            texto, _ = self.oir(limite=8)
            print(f"Tú: {texto or '(silencio)'}")
            respuesta = es_afirmativo(texto) if texto else None
            if respuesta is not None:
                if not respuesta:
                    print("    (no autorizado)")
                return respuesta
            if intento == 0:
                self.decir("No te entendí. Di sí o no.")
        self.decir("Como no te entendí, no lo haré.")
        return False

    # --- una conversación -----------------------------------------------------

    def responder(self, texto: str) -> bool:
        """Pasa la pregunta a Claude y la dice. Devuelve False si hay que salir."""
        if es_despedida(texto):
            self.decir("Hasta luego.")
            return False
        print("    (pensando...)")
        if getattr(self, "sin_clave", False):
            try:
                self.decir(self.jarvis.preguntar(texto))
            except Exception as e:
                print(f"    (error: {type(e).__name__}: {e})")
                self.decir("Algo falló al hacer eso. Prueba otra vez.")
            return True
        import anthropic

        try:
            self.decir(self.jarvis.preguntar(texto))
        except anthropic.AuthenticationError:
            self.decir("Falta la clave de Claude o no es válida. Revisa la variable ANTHROPIC_API_KEY.")
            return False
        except anthropic.RateLimitError:
            self.decir("Demasiadas peticiones seguidas. Espera un momento y repite.")
        except anthropic.APIConnectionError:
            self.decir("No tengo conexión con Claude. Revisa tu internet.")
        except anthropic.APIStatusError as e:
            self.decir(f"La API de Claude dio un error {e.status_code}.")
        return True

    def conversar(self, primera: str) -> bool:
        """Responde y sigue escuchando unos segundos por si hay otra pregunta."""
        texto = primera
        while True:
            if not texto:
                self.pitido()
                texto, _ = self.oir(limite=8)
                if not texto:
                    return True
                print(f"Tú: {texto}")
            if es_olvidalo(texto):
                self.decir("De acuerdo.")
                return True
            if not self.responder(texto):
                return False
            texto, _ = self.oir(limite=SEGUNDOS_PARA_SEGUIR)
            if not texto:
                return True
            nombrado, resto = buscar_activacion(texto)
            texto = resto if nombrado else texto
            print(f"Tú: {texto}" if texto else "Tú: Jarvis")

    # --- formas de activarse --------------------------------------------------

    def esperar_jarvis(self) -> str | None:
        """Escucha todo hasta oír "Jarvis". Devuelve lo dicho después del nombre."""
        while True:
            texto, audio = self.oir(limite=None, rapido=True)
            nombrado, resto = buscar_activacion(texto)
            if not nombrado:
                continue
            if len(resto.split()) >= 2:
                # Hubo una pregunta en la misma frase: se transcribe otra vez con más precisión.
                _, resto = buscar_activacion(self.oido.transcribir(audio))
            print(f"Tú: Jarvis{', ' + resto if resto else ''}")
            return resto

    def esperar_hey_jarvis(self) -> str:
        self.detector.reiniciar()
        while True:
            bloque = self.mic.bloque()
            if bloque is not None and self.detector.procesar(bloque):
                print("Tú: Hey Jarvis")
                return ""

    def esperar_enter(self) -> str:
        input("Pulsa Enter y habla... ")
        self.mic.vaciar()
        return ""

    def iniciar(self) -> None:
        esperar = {
            "jarvis": self.esperar_jarvis,
            "hey_jarvis": self.esperar_hey_jarvis,
            "enter": self.esperar_enter,
        }[self.activacion]
        aviso = {
            "jarvis": "Di \"Jarvis\" y tu pregunta (por ejemplo: \"Jarvis, ¿por qué va lento mi PC?\").",
            "hey_jarvis": "Di \"Hey Jarvis\" y espera el pitido.",
            "enter": "Pulsa Enter, espera el pitido y habla.",
        }[self.activacion]
        with self.mic:
            print(f"\nJarvis escuchando. {aviso}\nPara salir di \"Jarvis, adiós\" o pulsa Ctrl+C.\n")
            self.decir("Jarvis listo, en modo de órdenes. Di Jarvis, ayuda, para saber qué puedo hacer."
                       if self.sin_clave else "Jarvis listo.")
            while True:
                if not self.conversar(esperar()):
                    return
                print("    (en espera)")


def listar_microfonos() -> None:
    import sounddevice as sd

    for i, d in enumerate(sd.query_devices()):
        if d["max_input_channels"] > 0:
            marca = "  <- por defecto" if i == sd.default.device[0] else ""
            print(f"{i}: {d['name']}{marca}")


def main() -> None:
    if sys.platform.startswith("win"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass
    p = argparse.ArgumentParser(description="Jarvis por voz")
    p.add_argument("--activacion", choices=["jarvis", "hey_jarvis", "enter"], default="jarvis",
                   help="cómo se despierta Jarvis (por defecto: al oír 'Jarvis')")
    p.add_argument("--microfono", type=int, default=None, help="número de micrófono (ver --microfonos)")
    p.add_argument("--microfonos", action="store_true", help="lista los micrófonos y sale")
    p.add_argument("--sin-clave", action="store_true",
                   help="usa órdenes fijas sin Claude (se activa solo si no hay ANTHROPIC_API_KEY)")
    args = p.parse_args()

    if args.microfonos:
        listar_microfonos()
        return
    from jarvis.ordenes import hay_clave

    sin_clave = args.sin_clave or not hay_clave()
    if sin_clave:
        print("Modo sin clave: Jarvis entiende órdenes fijas (di \"Jarvis, ayuda\").")
    try:
        ConversacionPorVoz(args.activacion, args.microfono, sin_clave).iniciar()
    except KeyboardInterrupt:
        print("\nHasta luego.")
    except ImportError as e:
        print(f"Falta instalar algo para la voz ({e.name}). Ejecuta: py -m pip install -r requirements-voz.txt")


if __name__ == "__main__":
    main()
