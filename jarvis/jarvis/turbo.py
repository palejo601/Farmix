"""Modo turbo y vigilante de RAM: hacen que un PC con poca memoria vaya más rápido.

- `plan_turbo()` mira qué programas pesados están abiertos (no cambia nada).
- `modo_turbo(confirmar)` cierra los que el usuario autorice, borra los temporales
  viejos y pone el plan de energía de alto rendimiento. Devuelve cuánta RAM liberó.
- `Vigilante` revisa la RAM cada pocos segundos y avisa cuando pasa del umbral,
  diciendo qué programa la está llenando. Gasta muy poca memoria.

La lista de programas que el modo turbo ofrece cerrar está en turbo.json
(junto a main.py); si no existe se usa PROGRAMAS_PESADOS.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Callable

import psutil

from . import sistema

CONFIG = Path(__file__).resolve().parent.parent / "turbo.json"

# Programas que suelen gastar mucha RAM y se pueden cerrar sin romper Windows.
PROGRAMAS_PESADOS = [
    "chrome", "msedge", "firefox", "opera", "brave",
    "whatsapp", "spotify", "ms-teams", "teams", "discord", "zoom",
    "hd-player", "bluestacks", "onedrive", "acrord32", "acrobat",
    "winword", "excel", "powerpnt",
]

UMBRAL_RAM = 90        # % de RAM a partir del cual avisa el vigilante
INTERVALO = 15         # segundos entre revisiones
PAUSA_AVISOS = 10 * 60 # no repetir el aviso antes de 10 minutos

# GUID del plan "Alto rendimiento" de Windows (SCHEME_MIN).
PLAN_ALTO = "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c"


def cargar_config() -> dict:
    datos = {"programas": PROGRAMAS_PESADOS, "umbral_ram": UMBRAL_RAM, "intervalo": INTERVALO}
    try:
        datos.update(json.loads(CONFIG.read_text(encoding="utf-8")))
    except (OSError, ValueError):
        pass
    datos["programas"] = [p.lower().removesuffix(".exe") for p in datos["programas"]]
    return datos


def _base(nombre: str) -> str:
    return (nombre or "").lower().removesuffix(".exe")


def ram_libre_mb() -> float:
    return round(psutil.virtual_memory().available / 1024**2)


def programas_abiertos() -> dict[str, dict]:
    """Memoria por programa: {"chrome": {"mb": 812, "pids": [..]}}. No mide CPU (es rápido)."""
    yo = os.getpid()
    grupos: dict[str, dict] = {}
    for p in psutil.process_iter(["pid", "name", "memory_info"]):
        try:
            nombre = p.info["name"] or ""
            mem = p.info["memory_info"]
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
        if not mem or p.info["pid"] == yo or nombre.lower() in sistema.PROCESOS_PROTEGIDOS:
            continue
        g = grupos.setdefault(_base(nombre), {"mb": 0.0, "pids": []})
        g["mb"] += mem.rss / 1024**2
        g["pids"].append(p.info["pid"])
    return grupos


def plan_turbo(config: dict | None = None) -> list[dict]:
    """Programas pesados abiertos, de mayor a menor memoria. No cierra nada."""
    config = config or cargar_config()
    abiertos = programas_abiertos()
    plan = [{"programa": n, "mb": round(g["mb"]), "pids": g["pids"]}
            for n, g in abiertos.items() if n in config["programas"]]
    plan.sort(key=lambda x: x["mb"], reverse=True)
    return plan


def plan_energia_alto() -> bool:
    """Activa el plan de energía de alto rendimiento si existe (solo Windows)."""
    if not sistema.ES_WINDOWS:
        return False
    try:
        r = subprocess.run(["powercfg", "/setactive", PLAN_ALTO], capture_output=True, timeout=10,
                           creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
        return r.returncode == 0
    except (OSError, subprocess.SubprocessError):
        return False


def modo_turbo(confirmar: Callable[[str], bool], config: dict | None = None,
               limpiar: bool = True, energia: bool = True) -> dict:
    """Pregunta programa por programa si lo cierra; luego, con otro permiso, limpia temporales y sube el plan de energía."""
    config = config or cargar_config()
    antes = ram_libre_mb()
    cerrados, dejados = [], []
    for item in plan_turbo(config):
        nombre = item["programa"].capitalize()
        if not confirmar(f"Cerrar {nombre} ({item['mb']} MB). Si tiene algo sin guardar, se puede perder."):
            dejados.append(nombre)
            continue
        ok = sum(1 for pid in item["pids"] if sistema.cerrar_proceso(pid).get("ok"))
        (cerrados if ok else dejados).append(nombre)
    temporales_mb, energia_ok = 0, False
    if (limpiar or energia) and confirmar(
            "Borrar archivos temporales con más de 24 h y poner el plan de energía en alto rendimiento"):
        if limpiar:
            temporales_mb = round(sistema.limpiar_temporales(24)["liberado_mb"])
        energia_ok = plan_energia_alto() if energia else False
    time.sleep(2)  # Windows tarda un momento en devolver la memoria
    despues = ram_libre_mb()
    return {"ram_libre_antes_mb": antes, "ram_libre_despues_mb": despues,
            "liberado_mb": max(0, despues - antes), "cerrados": cerrados, "dejados": dejados,
            "temporales_mb": temporales_mb, "alto_rendimiento": energia_ok}


def resumen_turbo(r: dict) -> str:
    partes = []
    if r["cerrados"]:
        partes.append("Cerré " + ", ".join(r["cerrados"]) + ".")
    if r["temporales_mb"]:
        partes.append(f"Borré {r['temporales_mb']} megas de temporales.")
    if r["alto_rendimiento"]:
        partes.append("Puse el plan de energía en alto rendimiento.")
    gb = lambda mb: f"{mb / 1024:.1f}".replace(".", ",")
    partes.append(f"Ahora tienes {gb(r['ram_libre_despues_mb'])} gigas libres "
                  f"(antes {gb(r['ram_libre_antes_mb'])}).")
    return "Modo turbo listo. " + " ".join(partes)


# ------------------------------------------------------------------ vigilante

def aviso_windows(titulo: str, texto: str) -> None:
    """Notificación de Windows sin instalar nada (globo en la barra de tareas)."""
    if not sistema.ES_WINDOWS:
        print(f"[{titulo}] {texto}")
        return
    t = titulo.replace("'", "''")
    x = texto.replace("'", "''")
    ps = ("Add-Type -AssemblyName System.Windows.Forms;"
          "$n=New-Object System.Windows.Forms.NotifyIcon;"
          "$n.Icon=[System.Drawing.SystemIcons]::Information;$n.Visible=$true;"
          f"$n.ShowBalloonTip(8000,'{t}','{x}',[System.Windows.Forms.ToolTipIcon]::Warning);"
          "Start-Sleep -Seconds 9;$n.Dispose()")
    try:
        subprocess.Popen(["powershell", "-NoProfile", "-WindowStyle", "Hidden", "-Command", ps],
                         creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
    except OSError:
        pass


class Vigilante:
    """Avisa cuando la RAM pasa del umbral dos revisiones seguidas."""

    def __init__(self, avisar: Callable[[str, str], None] = aviso_windows, config: dict | None = None,
                 reloj: Callable[[], float] = time.monotonic):
        self.config = config or cargar_config()
        self.avisar = avisar
        self.reloj = reloj
        self.seguidas = 0
        self.ultimo_aviso = None

    def revisar(self, uso_ram: float | None = None) -> str | None:
        """Una revisión. Devuelve el texto del aviso si avisó."""
        uso = psutil.virtual_memory().percent if uso_ram is None else uso_ram
        if uso < self.config["umbral_ram"]:
            self.seguidas = 0
            return None
        self.seguidas += 1
        ahora = self.reloj()
        if self.seguidas < 2 or (self.ultimo_aviso is not None and ahora - self.ultimo_aviso < PAUSA_AVISOS):
            return None
        self.ultimo_aviso = ahora
        abiertos = sorted(programas_abiertos().items(), key=lambda kv: kv[1]["mb"], reverse=True)[:2]
        quienes = " y ".join(f"{n.capitalize()} ({round(g['mb'])} MB)" for n, g in abiertos)
        texto = (f"La RAM está al {round(uso)} %. Lo que más gasta: {quienes}. "
                 "Cierra lo que no uses o abre Modo turbo.")
        self.avisar("Tu PC se está quedando sin memoria", texto)
        return texto

    def correr(self) -> None:  # pragma: no cover - bucle infinito
        while True:
            try:
                self.revisar()
            except Exception:
                pass
            time.sleep(self.config["intervalo"])
