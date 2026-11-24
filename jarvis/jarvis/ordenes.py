"""Modo sin clave: Jarvis entiende órdenes fijas, sin internet ni Claude.

Sirve cuando no hay ANTHROPIC_API_KEY. Reconoce frases como:
  "¿cómo está la RAM?", "¿cuánto espacio queda?", "¿qué consume más?",
  "¿por qué va lento?", "limpia los temporales", "cierra Chrome",
  "¿qué arranca con Windows?", "¿qué hora es?", "ayuda".

Tiene la misma forma que `Jarvis` (método `preguntar`), así que voz.py y
main.py lo usan igual. Borrar o cerrar algo siempre pide confirmación.
"""
from __future__ import annotations

import datetime as dt
import os
import re
from typing import Callable

from . import sistema, turbo
from .activacion import normalizar

AYUDA = ("Sin clave de Claude entiendo órdenes sencillas. Puedes decirme: cómo está la memoria, "
         "cuánto espacio queda, qué consume más, por qué va lento, limpia los temporales, "
         "cierra seguido del nombre de un programa, modo turbo, qué arranca con Windows, o qué hora es.")

NO_ENTENDI = ("No entendí esa orden. Prueba con: cómo está la memoria, cuánto espacio queda, "
              "qué consume más, limpia los temporales o cierra y el nombre del programa.")

# Cómo se dice un programa -> cómo se llama su proceso.
ALIAS = {
    "chrome": "chrome", "google chrome": "chrome", "google": "chrome", "crome": "chrome",
    "edge": "msedge", "microsoft edge": "msedge", "navegador": "msedge",
    "firefox": "firefox", "opera": "opera", "brave": "brave",
    "word": "winword", "excel": "excel", "powerpoint": "powerpnt", "power point": "powerpnt",
    "whatsapp": "whatsapp", "wasap": "whatsapp", "guasap": "whatsapp",
    "spotify": "spotify", "teams": "ms-teams", "zoom": "zoom", "discord": "discord",
    "bluestacks": "hd-player", "blue stacks": "hd-player", "voicestudio": "voicestudio",
    "voice studio": "voicestudio", "bloc de notas": "notepad", "notepad": "notepad",
}

# Cada orden: (palabras que la activan, método). Se revisan en este orden.
_ORDENES = [
    (r"\b(ayuda|que puedes hacer|que sabes hacer|comandos|ordenes)\b", "ayuda"),
    (r"\b(turbo|acelera|acelerar|modo rapido|libera memoria|liberar memoria|libera ram)\b", "turbo"),
    (r"\b(cierra|cerrar|cierre|mata|matar|termina el|terminar el|apaga el)\b", "cerrar"),
    (r"\b(limpia|limpiar|limpieza|borra|borrar|elimina)\b", "limpiar"),
    (r"\b(temporales|archivos basura|basura)\b", "temporales"),
    (r"\b(inicio|arranque|arranca|arrancan|al encender|al prender)\b", "inicio"),
    (r"\b(lento|lenta|pesado|se traba|trabado|congela)\b", "lento"),
    (r"\b(consume|consumen|gasta|gastan|procesos|programas abiertos|que usa|que esta usando)\b", "procesos"),
    (r"\b(disco|discos|espacio|almacenamiento|capacidad)\b", "discos"),
    (r"\b(bateria|carga|cargador)\b", "bateria"),
    (r"\b(ram|memoria|cpu|procesador|estado|como esta|como va|rendimiento)\b", "estado"),
    (r"\b(hora|fecha|dia es)\b", "hora"),
]


def hay_clave() -> bool:
    """¿Hay clave de Claude? Si no, Jarvis usa estas órdenes fijas."""
    return bool(os.environ.get("ANTHROPIC_API_KEY", "").strip())


def _num(x: float) -> str:
    """3.94 -> "3,9": así lo lee bien la voz en español."""
    return f"{x:.1f}".replace(".", ",").replace(",0", "")


def _nombre_programa(nombre: str) -> str:
    n = nombre.lower().removesuffix(".exe")
    for dicho, proceso in ALIAS.items():
        if proceso == n:
            return dicho.capitalize()
    return n.capitalize()


class Ordenes:
    def __init__(self, confirmar: Callable[[str], bool], al_usar_herramienta: Callable[[str], None] | None = None,
                 **_ignorado):
        self.confirmar = confirmar
        self.al_usar = al_usar_herramienta or (lambda _n: None)

    def preguntar(self, texto: str) -> str:
        t = normalizar(texto)
        for patron, metodo in _ORDENES:
            if re.search(patron, t):
                self.al_usar(metodo)
                return getattr(self, "_" + metodo)(t)
        return NO_ENTENDI

    # --- órdenes de solo lectura ---------------------------------------------

    def _ayuda(self, _t: str) -> str:
        return AYUDA

    def _hora(self, _t: str) -> str:
        ahora = dt.datetime.now()
        return f"Son las {ahora.hour}:{ahora.minute:02d}."

    def _estado(self, _t: str) -> str:
        e = sistema.estado_sistema()
        usada, total = e["ram_usada_gb"], e["ram_total_gb"]
        frase = (f"El procesador va al {round(e['cpu_uso_porcentaje'])} por ciento. "
                 f"La memoria está al {round(e['ram_uso_porcentaje'])} por ciento: "
                 f"usas {_num(usada)} de {_num(total)} gigas.")
        if e["ram_uso_porcentaje"] >= 85:
            frase += " Está casi llena; cerrar programas que no uses ayudaría."
        return frase

    def _bateria(self, _t: str) -> str:
        e = sistema.estado_sistema()
        if "bateria_porcentaje" not in e:
            return "No encuentro batería; parece un PC de escritorio."
        estado = "y está cargando" if e["bateria_conectada"] else "y no está conectada al cargador"
        return f"La batería está al {e['bateria_porcentaje']} por ciento {estado}."

    def _discos(self, _t: str) -> str:
        partes = []
        for d in sistema.uso_discos():
            unidad = d["unidad"].rstrip(":\\/") or d["unidad"]
            aviso = ", casi lleno" if d["uso_porcentaje"] >= 90 else ""
            partes.append(f"el disco {unidad} tiene {_num(d['libre_gb'])} gigas libres de {_num(d['total_gb'])}{aviso}")
        if not partes:
            return "No pude leer los discos."
        return (" y ".join(partes) + ".").capitalize()

    def _procesos(self, _t: str, cuantos: int = 3) -> str:
        totales: dict[str, float] = {}
        for p in sistema.procesos_principales("memoria", 30):
            if not p["protegido"]:
                n = _nombre_programa(p["nombre"])
                totales[n] = totales.get(n, 0) + p["memoria_mb"]
        top = sorted(totales.items(), key=lambda kv: kv[1], reverse=True)[:cuantos]
        if not top:
            return "No encontré programas que estén gastando mucho."
        nombres = [f"{n} con {round(mb)} megas" for n, mb in top]
        return "Lo que más memoria usa ahora es " + ", ".join(nombres[:-1]) + (" y " if len(nombres) > 1 else "") + nombres[-1] + "."

    def _lento(self, t: str) -> str:
        e = sistema.estado_sistema()
        causas = []
        if e["ram_uso_porcentaje"] >= 85:
            causas.append(f"la memoria está al {round(e['ram_uso_porcentaje'])} por ciento")
        if e["cpu_uso_porcentaje"] >= 80:
            causas.append(f"el procesador está al {round(e['cpu_uso_porcentaje'])} por ciento")
        inicio = ("Va lento porque " + " y ".join(causas) + ". ") if causas else "La memoria y el procesador están bien ahora. "
        return inicio + self._procesos(t) + " Si quieres, dime cierra y el nombre del programa."

    def _inicio(self, _t: str) -> str:
        items = sistema.programas_inicio()
        if not items:
            return "No hay programas que arranquen solos con Windows."
        nombres = ", ".join(i["nombre"] for i in items[:6])
        mas = f" y {len(items) - 6} más" if len(items) > 6 else ""
        return (f"Arrancan con Windows {len(items)} programas: {nombres}{mas}. "
                "Para quitarlos, abre el Administrador de tareas, pestaña Aplicaciones de arranque.")

    # --- órdenes que cambian algo: siempre con permiso ---------------------------

    def _temporales(self, t: str) -> str:
        est = sistema.analizar_temporales(24)
        return (f"Los archivos temporales viejos ocupan unos {round(est['total_mb'])} megas. "
                "Si quieres borrarlos, dime limpia los temporales.")

    def _limpiar(self, t: str) -> str:
        if not re.search(r"\b(temporal|temporales|basura|cache|pc|computador|equipo)\b", t):
            return "Solo sé limpiar los archivos temporales. Dime limpia los temporales."
        est = sistema.analizar_temporales(24)
        if est["total_mb"] < 1:
            return "No hay archivos temporales viejos para borrar."
        carpetas = ", ".join(c["carpeta"] for c in est["carpetas"])
        if not self.confirmar(f"Borrar archivos temporales con más de 24 h ({round(est['total_mb'])} MB aprox.) en: {carpetas}"):
            return "De acuerdo, no borré nada."
        r = sistema.limpiar_temporales(24)
        frase = f"Listo, borré {r['archivos_borrados']} archivos y liberé {round(r['liberado_mb'])} megas."
        if r["archivos_en_uso_o_sin_permiso"]:
            frase += " Algunos estaban en uso y los dejé."
        return frase

    def _turbo(self, _t: str) -> str:
        return turbo.resumen_turbo(turbo.modo_turbo(self.confirmar))

    def _cerrar(self, t: str) -> str:
        m = re.search(r"\b(?:cierra|cerrar|cierre|mata|matar|termina el|terminar el|apaga el)\s+(?:el |la |los |las |a )?(?:programa |proceso |aplicacion )?(.+)$", t)
        dicho = (m.group(1).strip() if m else "").removesuffix(" por favor").strip()
        if not dicho:
            return "¿Qué programa cierro? Dime por ejemplo: cierra Chrome."
        buscado = ALIAS.get(dicho, dicho).replace(" ", "")
        candidatos = [p for p in sistema.procesos_principales("memoria", 50)
                      if buscado in p["nombre"].lower().removesuffix(".exe").replace(" ", "")
                      and p["pid"] != os.getpid()]
        if not candidatos:
            return f"No encuentro abierto ningún programa llamado {dicho}."
        if any(p["protegido"] for p in candidatos):
            return f"{dicho.capitalize()} es parte de Windows y no lo cierro."
        nombre = _nombre_programa(candidatos[0]["nombre"])
        total = round(sum(p["memoria_mb"] for p in candidatos))
        ventanas = f"{len(candidatos)} procesos" if len(candidatos) > 1 else "1 proceso"
        if not self.confirmar(f"Cerrar {nombre} ({ventanas}, {total} MB). Si tiene algo sin guardar, se puede perder."):
            return f"De acuerdo, dejo {nombre} abierto."
        cerrados = sum(1 for p in candidatos if sistema.cerrar_proceso(p["pid"]).get("ok"))
        if not cerrados:
            return f"No pude cerrar {nombre}; puede que necesite permisos de administrador."
        return f"Listo, cerré {nombre} y liberé unos {total} megas."
