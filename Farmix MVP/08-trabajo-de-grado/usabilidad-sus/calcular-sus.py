#!/usr/bin/env python3
"""Calcula el puntaje SUS (0-100) por participante y el promedio.

Uso: python3 calcular-sus.py plantilla-resultados.csv
Columnas q1..q10 con valores 1-5. Las filas incompletas se omiten y se avisa.
"""
import csv
import sys


def sus(resp):
    if len(resp) != 10 or any(r not in (1, 2, 3, 4, 5) for r in resp):
        raise ValueError("se esperan 10 respuestas entre 1 y 5")
    return 2.5 * sum((r - 1) if i % 2 == 0 else (5 - r) for i, r in enumerate(resp))


def main(ruta):
    puntajes = []
    with open(ruta, newline="", encoding="utf-8") as f:
        for fila in csv.DictReader(f):
            try:
                p = sus([int(fila[f"q{i}"]) for i in range(1, 11)])
            except (ValueError, KeyError):
                print(f"{fila['participante']}: incompleto, se omite")
                continue
            puntajes.append(p)
            print(f"{fila['participante']}: {p:.1f}")
    if puntajes:
        print(f"Promedio ({len(puntajes)} participantes): {sum(puntajes) / len(puntajes):.1f}")


if __name__ == "__main__":
    main(sys.argv[1])
