"""Modo turbo y vigilante de RAM de Jarvis.

Uso:
  python turbo.py            -> modo turbo (pregunta antes de cerrar cada programa)
  python turbo.py vigilar    -> vigilante: avisa cuando la RAM pasa del 90 %
  python turbo.py plan       -> solo muestra qué programas pesados están abiertos
"""
import sys

from jarvis import turbo


def confirmar(descripcion: str) -> bool:
    return input(f"  {descripcion}\n  ¿Lo autorizas? (s/n): ").strip().lower() in ("s", "si", "sí", "y")


def main() -> None:
    if sys.platform.startswith("win"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass
    orden = sys.argv[1] if len(sys.argv) > 1 else "turbo"
    if orden == "vigilar":
        turbo.Vigilante().correr()
        return
    plan = turbo.plan_turbo()
    print(f"RAM libre: {turbo.ram_libre_mb()} MB")
    if plan:
        print("Programas pesados abiertos:")
        for p in plan:
            print(f"  - {p['programa'].capitalize()}: {p['mb']} MB")
    else:
        print("No hay programas pesados abiertos.")
    if orden == "plan":
        return
    print()
    print(turbo.resumen_turbo(turbo.modo_turbo(confirmar)))


if __name__ == "__main__":
    main()
