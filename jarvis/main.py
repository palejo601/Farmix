"""Chat de texto con Jarvis en la terminal.

Uso:  python main.py
"""
import os
import sys

import anthropic

from jarvis.asistente import Jarvis


def confirmar(descripcion: str) -> bool:
    print(f"\n[!] Jarvis quiere: {descripcion}")
    return input("    ¿Lo autorizas? (s/n): ").strip().lower() in ("s", "si", "sí", "y")


def main() -> None:
    if sys.platform.startswith("win"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass
    jarvis = Jarvis(confirmar, al_usar_herramienta=lambda n: print(f"    · revisando: {n}"))
    print("Jarvis listo. Escribe tu pregunta (o 'salir').")
    print("Ejemplos: '¿por qué va lento mi PC?', 'limpia los temporales', '¿qué arranca con Windows?'\n")
    while True:
        try:
            texto = input("Tú: ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break
        if not texto:
            continue
        if texto.lower() in ("salir", "exit", "adiós", "adios"):
            break
        try:
            print(f"\nJarvis: {jarvis.preguntar(texto)}\n")
        except anthropic.AuthenticationError:
            print("\nFalta la clave de Claude o no es válida. Configura ANTHROPIC_API_KEY (ver README).\n")
            break
        except anthropic.RateLimitError:
            print("\nDemasiadas peticiones seguidas. Espera un momento y repite.\n")
        except anthropic.APIConnectionError:
            print("\nNo hay conexión con Claude. Revisa tu internet.\n")
        except anthropic.APIStatusError as e:
            print(f"\nError de la API ({e.status_code}): {e.message}\n")


if __name__ == "__main__":
    main()
