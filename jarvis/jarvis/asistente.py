"""Conversación con Claude usando las herramientas del sistema."""
from __future__ import annotations

import os
from typing import Callable

import anthropic

from .herramientas import HERRAMIENTAS, ejecutar

MODELO = os.environ.get("JARVIS_MODELO", "claude-opus-5-5")
ESFUERZO = os.environ.get("JARVIS_ESFUERZO", "low")
MAX_PASOS = 15

SISTEMA = """Eres Jarvis, un asistente que ayuda a revisar y optimizar el PC del usuario.
Respondes siempre en español, de forma breve y clara, como a alguien que no es técnico.
Usa las herramientas para mirar datos reales antes de opinar; no inventes cifras.
Antes de cerrar un proceso o borrar archivos, explica qué vas a hacer y por qué.
Esas acciones piden confirmación en pantalla: si el usuario la rechaza, acéptalo y no insistas.
Nunca sugieras cerrar procesos del sistema (marcados como protegidos).
Para programas de inicio, solo puedes listarlos y explicar cómo desactivarlos
(Administrador de tareas > Aplicaciones de arranque); no los cambias tú."""


class Jarvis:
    def __init__(
        self,
        confirmar: Callable[[str], bool],
        al_usar_herramienta: Callable[[str], None] | None = None,
        sistema_extra: str = "",
    ):
        self.sistema = SISTEMA + ("\n\n" + sistema_extra if sistema_extra else "")
        self.cliente = anthropic.Anthropic()  # lee ANTHROPIC_API_KEY
        self.mensajes: list = []
        self.confirmar = confirmar
        self.al_usar_herramienta = al_usar_herramienta or (lambda _n: None)

    def _pedir(self):
        return self.cliente.beta.messages.create(
            model=MODELO,
            max_tokens=16000,
            system=self.sistema,
            tools=HERRAMIENTAS,
            messages=self.mensajes,
            output_config={"effort": ESFUERZO},
            cache_control={"type": "ephemeral"},
            # Si el modelo principal rechaza la petición, la API la reintenta con otro.
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
        )

    def preguntar(self, texto: str) -> str:
        self.mensajes.append({"role": "user", "content": texto})
        for _ in range(MAX_PASOS):
            resp = self._pedir()
            # Se guarda el contenido completo (no solo el texto) para no perder el contexto.
            self.mensajes.append({"role": "assistant", "content": resp.content})

            if resp.stop_reason == "refusal":
                return "Lo siento, no puedo ayudar con eso."
            if resp.stop_reason == "pause_turn":
                continue
            if resp.stop_reason == "max_tokens":
                return _texto(resp) + "\n[Respuesta cortada por longitud]"

            usos = [b for b in resp.content if b.type == "tool_use"]
            if resp.stop_reason != "tool_use" or not usos:
                return _texto(resp)

            resultados = []
            for uso in usos:
                self.al_usar_herramienta(uso.name)
                contenido, es_error = ejecutar(uso.name, uso.input, self.confirmar)
                resultados.append({
                    "type": "tool_result",
                    "tool_use_id": uso.id,
                    "content": contenido,
                    "is_error": es_error,
                })
            self.mensajes.append({"role": "user", "content": resultados})
        return "Me detuve porque la tarea necesitaba demasiados pasos. ¿Puedes pedirlo por partes?"


def _texto(resp) -> str:
    return "\n".join(b.text for b in resp.content if b.type == "text").strip()
