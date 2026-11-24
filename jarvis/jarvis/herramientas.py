"""Herramientas que Claude puede usar, y cuáles requieren confirmación."""
from __future__ import annotations

import json
from typing import Callable

from . import sistema


def _obj(props: dict, requeridos: list[str] | None = None) -> dict:
    return {
        "type": "object",
        "properties": props,
        "required": requeridos or [],
        "additionalProperties": False,
    }


HORAS = {"type": "number", "description": "Solo archivos sin modificar en al menos estas horas. Por defecto 24."}

HERRAMIENTAS = [
    {
        "name": "estado_sistema",
        "description": "Uso actual de CPU, RAM, swap, horas encendido y batería del PC.",
        "input_schema": _obj({}),
    },
    {
        "name": "procesos_principales",
        "description": "Lista los procesos que más consumen. Úsala antes de proponer cerrar algo.",
        "input_schema": _obj({
            "orden": {"type": "string", "enum": ["cpu", "memoria"], "description": "Criterio de orden."},
            "limite": {"type": "integer", "description": "Cuántos procesos devolver (1-50). Por defecto 10."},
        }),
    },
    {
        "name": "uso_discos",
        "description": "Espacio total, usado y libre de cada disco.",
        "input_schema": _obj({}),
    },
    {
        "name": "programas_inicio",
        "description": "Programas que arrancan con el sistema (registro Run y carpetas de Inicio). Solo lectura.",
        "input_schema": _obj({}),
    },
    {
        "name": "analizar_temporales",
        "description": "Calcula cuánto espacio ocupan los archivos temporales que se podrían borrar. No borra nada.",
        "input_schema": _obj({"horas_minimas": HORAS}),
    },
    {
        "name": "limpiar_temporales",
        "description": "BORRA archivos temporales viejos. El usuario debe confirmar en pantalla; si lo rechaza, no insistas.",
        "input_schema": _obj({"horas_minimas": HORAS}),
    },
    {
        "name": "cerrar_proceso",
        "description": "CIERRA un proceso por su PID. El usuario debe confirmar en pantalla. Los procesos del sistema están protegidos.",
        "input_schema": _obj({"pid": {"type": "integer", "description": "PID del proceso."}}, ["pid"]),
    },
]

FUNCIONES: dict[str, Callable[..., object]] = {
    "estado_sistema": sistema.estado_sistema,
    "procesos_principales": sistema.procesos_principales,
    "uso_discos": sistema.uso_discos,
    "programas_inicio": sistema.programas_inicio,
    "analizar_temporales": sistema.analizar_temporales,
    "limpiar_temporales": sistema.limpiar_temporales,
    "cerrar_proceso": sistema.cerrar_proceso,
}

# Acciones que cierran o borran algo: siempre piden confirmación del usuario.
PELIGROSAS = {"limpiar_temporales", "cerrar_proceso"}


def describir_accion(nombre: str, args: dict) -> str:
    """Texto que se le muestra al usuario antes de pedir confirmación."""
    if nombre == "limpiar_temporales":
        horas = args.get("horas_minimas", 24)
        est = sistema.analizar_temporales(horas)
        carpetas = ", ".join(c["carpeta"] for c in est["carpetas"])
        return (f"Borrar archivos temporales con más de {horas} h ({est['total_mb']} MB aprox.) "
                f"en: {carpetas}")
    if nombre == "cerrar_proceso":
        try:
            p = sistema.describir_proceso(args["pid"])
            return f"Cerrar el proceso {p['nombre']} (PID {p['pid']}, {p['memoria_mb']} MB)."
        except Exception:
            return f"Cerrar el proceso con PID {args.get('pid')}."
    return f"Ejecutar {nombre} con {args}"


def ejecutar(nombre: str, args: dict, confirmar: Callable[[str], bool]) -> tuple[str, bool]:
    """Ejecuta una herramienta. Devuelve (resultado_json, es_error)."""
    funcion = FUNCIONES.get(nombre)
    if funcion is None:
        return json.dumps({"error": f"Herramienta desconocida: {nombre}"}), True
    if not isinstance(args, dict):
        return json.dumps({"error": "Argumentos inválidos."}), True
    if nombre in PELIGROSAS and not confirmar(describir_accion(nombre, args)):
        return json.dumps({"cancelado": True, "motivo": "El usuario no lo autorizó."}, ensure_ascii=False), False
    try:
        resultado = funcion(**args)
    except Exception as e:  # el error vuelve a Claude para que lo explique
        return json.dumps({"error": f"{type(e).__name__}: {e}"}, ensure_ascii=False), True
    return json.dumps(resultado, ensure_ascii=False, default=str), False
