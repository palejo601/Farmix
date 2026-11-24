"""Funciones que leen y cambian el estado del PC.

Pensado para Windows, pero todo funciona también en Linux y macOS
(las partes exclusivas de Windows se saltan solas).
"""
from __future__ import annotations

import os
import sys
import time
import shutil
import tempfile
from pathlib import Path

import psutil

ES_WINDOWS = sys.platform.startswith("win")

# Procesos que nunca se deben cerrar porque Windows se cae o se reinicia.
PROCESOS_PROTEGIDOS = {
    "system", "system idle process", "registry", "smss.exe", "csrss.exe",
    "wininit.exe", "winlogon.exe", "services.exe", "lsass.exe", "svchost.exe",
    "fontdrvhost.exe", "dwm.exe", "memory compression", "secure system",
    "lsaiso.exe", "msmpeng.exe",
    # Linux / macOS
    "systemd", "init", "launchd", "kernel_task", "kthreadd",
}


def _gb(n: float) -> float:
    return round(n / 1024**3, 2)


def _mb(n: float) -> float:
    return round(n / 1024**2, 1)


# ---------------------------------------------------------------- lectura

def estado_sistema() -> dict:
    """CPU, RAM, swap, tiempo encendido y batería."""
    mem = psutil.virtual_memory()
    swap = psutil.swap_memory()
    freq = psutil.cpu_freq()
    datos = {
        "cpu_uso_porcentaje": psutil.cpu_percent(interval=1),
        "cpu_nucleos_fisicos": psutil.cpu_count(logical=False),
        "cpu_nucleos_logicos": psutil.cpu_count(logical=True),
        "cpu_frecuencia_mhz": round(freq.current) if freq else None,
        "ram_total_gb": _gb(mem.total),
        "ram_usada_gb": _gb(mem.used),
        "ram_disponible_gb": _gb(mem.available),
        "ram_uso_porcentaje": mem.percent,
        "swap_total_gb": _gb(swap.total),
        "swap_uso_porcentaje": swap.percent,
        "horas_encendido": round((time.time() - psutil.boot_time()) / 3600, 1),
        "sistema_operativo": sys.platform,
    }
    try:
        bat = psutil.sensors_battery()
    except Exception:
        bat = None
    if bat is not None:
        datos["bateria_porcentaje"] = round(bat.percent)
        datos["bateria_conectada"] = bat.power_plugged
    return datos


def procesos_principales(orden: str = "memoria", limite: int = 10) -> list[dict]:
    """Procesos que más CPU o memoria consumen."""
    limite = max(1, min(int(limite), 50))
    procs = list(psutil.process_iter(["pid", "name", "username"]))
    # La primera lectura de cpu_percent siempre es 0: se mide durante 1 s.
    for p in procs:
        try:
            p.cpu_percent(None)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
    time.sleep(1)
    nucleos = psutil.cpu_count() or 1
    filas = []
    for p in procs:
        try:
            with p.oneshot():
                filas.append({
                    "pid": p.pid,
                    "nombre": p.info["name"],
                    "cpu_porcentaje": round(p.cpu_percent(None) / nucleos, 1),
                    "memoria_mb": _mb(p.memory_info().rss),
                    "usuario": p.info.get("username"),
                    "protegido": (p.info["name"] or "").lower() in PROCESOS_PROTEGIDOS,
                })
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    clave = "cpu_porcentaje" if orden == "cpu" else "memoria_mb"
    filas.sort(key=lambda f: f[clave], reverse=True)
    return filas[:limite]


def uso_discos() -> list[dict]:
    """Espacio usado y libre en cada disco o partición."""
    discos = []
    vistos = set()
    for part in psutil.disk_partitions(all=False):
        if part.mountpoint in vistos or "cdrom" in part.opts:
            continue
        vistos.add(part.mountpoint)
        try:
            u = psutil.disk_usage(part.mountpoint)
        except (PermissionError, OSError):
            continue
        discos.append({
            "unidad": part.mountpoint,
            "sistema_archivos": part.fstype,
            "total_gb": _gb(u.total),
            "usado_gb": _gb(u.used),
            "libre_gb": _gb(u.free),
            "uso_porcentaje": u.percent,
        })
    return discos


def programas_inicio() -> list[dict]:
    """Programas que arrancan con el sistema (solo lectura)."""
    items: list[dict] = []
    if ES_WINDOWS:
        import winreg  # solo existe en Windows

        claves = [
            (winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Run", "Usuario (registro)"),
            (winreg.HKEY_LOCAL_MACHINE, r"Software\Microsoft\Windows\CurrentVersion\Run", "Todos los usuarios (registro)"),
            (winreg.HKEY_LOCAL_MACHINE, r"Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Run", "Todos los usuarios 32 bits (registro)"),
        ]
        for raiz, ruta, origen in claves:
            try:
                with winreg.OpenKey(raiz, ruta) as k:
                    i = 0
                    while True:
                        try:
                            nombre, valor, _ = winreg.EnumValue(k, i)
                        except OSError:
                            break
                        items.append({"nombre": nombre, "comando": str(valor), "origen": origen})
                        i += 1
            except OSError:
                continue
        carpetas = [
            Path(os.environ.get("APPDATA", "")) / r"Microsoft\Windows\Start Menu\Programs\Startup",
            Path(os.environ.get("PROGRAMDATA", "")) / r"Microsoft\Windows\Start Menu\Programs\Startup",
        ]
    else:
        carpetas = [Path.home() / ".config" / "autostart", Path("/etc/xdg/autostart")]

    for carpeta in carpetas:
        if carpeta.is_dir():
            for f in carpeta.iterdir():
                if f.name.lower() != "desktop.ini":
                    items.append({"nombre": f.stem, "comando": str(f), "origen": f"Carpeta de inicio ({carpeta})"})
    return items


def carpetas_temporales() -> list[Path]:
    rutas = {Path(tempfile.gettempdir())}
    if ES_WINDOWS:
        for var in ("TEMP", "TMP"):
            if os.environ.get(var):
                rutas.add(Path(os.environ[var]))
        rutas.add(Path(os.environ.get("SystemRoot", r"C:\Windows")) / "Temp")
        local = os.environ.get("LOCALAPPDATA")
        if local:
            rutas.add(Path(local) / "Temp")
    # Quita duplicados reales (p. ej. TEMP y LOCALAPPDATA\Temp suelen ser la misma).
    unicas, vistas = [], set()
    for r in rutas:
        try:
            real = r.resolve()
        except OSError:
            continue
        if real.is_dir() and real not in vistas:
            vistas.add(real)
            unicas.append(real)
    return unicas


def _archivos_viejos(carpeta: Path, horas_minimas: float):
    limite = time.time() - horas_minimas * 3600
    for raiz, _dirs, archivos in os.walk(carpeta, followlinks=False):
        for nombre in archivos:
            ruta = Path(raiz) / nombre
            try:
                st = ruta.lstat()
            except OSError:
                continue
            if ruta.is_symlink() or st.st_mtime > limite:
                continue
            yield ruta, st.st_size


def analizar_temporales(horas_minimas: float = 24) -> dict:
    """Cuánto ocupan los temporales que se podrían borrar. No borra nada."""
    resumen = []
    total = 0
    for carpeta in carpetas_temporales():
        n, tam = 0, 0
        for _ruta, size in _archivos_viejos(carpeta, horas_minimas):
            n += 1
            tam += size
        total += tam
        resumen.append({"carpeta": str(carpeta), "archivos": n, "tamano_mb": _mb(tam)})
    return {"horas_minimas": horas_minimas, "carpetas": resumen, "total_mb": _mb(total)}


def limpiar_temporales(horas_minimas: float = 24) -> dict:
    """Borra archivos temporales con más de `horas_minimas` sin cambios.

    Los archivos en uso o sin permiso se saltan. Luego quita carpetas vacías.
    """
    horas_minimas = max(1.0, float(horas_minimas))
    borrados, liberado, fallidos = 0, 0, 0
    for carpeta in carpetas_temporales():
        for ruta, size in list(_archivos_viejos(carpeta, horas_minimas)):
            try:
                ruta.unlink()
                borrados += 1
                liberado += size
            except OSError:
                fallidos += 1
        # Carpetas vacías, de la más profunda a la más alta, sin tocar la raíz.
        for raiz, dirs, _ in os.walk(carpeta, topdown=False):
            for d in dirs:
                p = Path(raiz) / d
                try:
                    if not p.is_symlink():
                        p.rmdir()  # solo funciona si está vacía
                except OSError:
                    pass
    return {"archivos_borrados": borrados, "liberado_mb": _mb(liberado), "archivos_en_uso_o_sin_permiso": fallidos}


def describir_proceso(pid: int) -> dict:
    p = psutil.Process(int(pid))
    return {"pid": p.pid, "nombre": p.name(), "memoria_mb": _mb(p.memory_info().rss)}


def cerrar_proceso(pid: int) -> dict:
    """Pide a un proceso que se cierre; si no responde en 5 s, lo fuerza."""
    pid = int(pid)
    if pid in (0, 4) or pid == os.getpid():
        return {"ok": False, "motivo": "Ese proceso no se puede cerrar."}
    try:
        p = psutil.Process(pid)
        nombre = p.name()
        if nombre.lower() in PROCESOS_PROTEGIDOS:
            return {"ok": False, "motivo": f"{nombre} es un proceso del sistema y está protegido."}
        p.terminate()
        try:
            p.wait(timeout=5)
            return {"ok": True, "nombre": nombre, "forma": "cerrado normalmente"}
        except psutil.TimeoutExpired:
            p.kill()
            return {"ok": True, "nombre": nombre, "forma": "forzado"}
    except psutil.NoSuchProcess:
        return {"ok": False, "motivo": "El proceso ya no existe."}
    except psutil.AccessDenied:
        return {"ok": False, "motivo": "Sin permiso. Puede requerir ejecutar Jarvis como administrador."}
