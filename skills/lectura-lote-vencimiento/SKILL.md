---
name: lectura-lote-vencimiento
description: Lee el número de lote, la fecha de fabricación y la fecha de vencimiento en fotos de empaques de medicamentos (cajas, blísteres, frascos), incluida impresión por puntos, en relieve, tenue, girada o en casillas L/F/V. Úsala siempre que el usuario envíe una foto de un medicamento y pida el lote, las fechas, el vencimiento o datos para un rótulo, o diga «léeme el lote», «qué vencimiento tiene», «FARMA-ETIQUETA».
---

# Lectura de lote, fabricación y vencimiento

Tarea: transcribir desde la foto el **número de lote**, la **fecha de fabricación** y la **fecha de vencimiento** de un empaque de medicamento, sin inventar nada.

## Dónde buscar

- **Lote:** «Lote», «Lot», «L.», «L:», «Batch», «Lote N.:», o una casilla con la letra L.
- **Fabricación:** «F.F.», «Fab», «F.», «F:», «Prep.», «Elab.», «MFG», o una casilla con la letra F.
- **Vencimiento:** «F.V.», «Vence», «Venc.», «V.», «V:», «Vto», «Exp», «Cad», o una casilla con la letra V.

El valor puede estar al lado de la etiqueta, debajo, en otra columna o girado 90°. Suele estar impreso aparte del resto del texto: por puntos, en relieve sin tinta, con tinta tenue o en una solapa.

## Reglas

1. Copia cada carácter tal como está impreso. Mira la forma real de los caracteres que se confunden: B/8 (la B tiene el lado izquierdo recto), D/0 (la D tiene el lado izquierdo recto), O/0, S/5, I/1, Z/2, G/6.
2. No completes, no corrijas y no inventes. Si un dato no está o no se lee con seguridad, dilo y escribe «no legible».
3. Asigna cada fecha según su etiqueta. La fabricación es anterior al vencimiento; si no lo es, avisa y no las intercambies.
4. Convierte el mes escrito en letras a número y muestra también lo impreso: «FEB2026» → 02/2026, «AGO2027» → 08/2027, «SEP/2026» → 09/2026.
5. Indica la certeza de cada dato: **alta** (cada carácter es claro), **media** (algún carácter es dudoso; di cuál y las opciones) o **baja**.
6. Si la foto no permite leer bien (borrosa, reflejo, recortada), dilo y pide otra: acercar la cámara, luz de lado para el relieve, sin flash.

## Formato de respuesta

| Dato | Valor | Impreso en el empaque | Certeza | Observación |
|---|---|---|---|---|
| Lote | 6B0985 | L.6B0985 | alta | |
| Fabricación | 02/2026 | F.FEB2026 | alta | |
| Vencimiento | 08/2027 | V.AGO2027 | media | la O podría ser 0 |

Después de la tabla, añade una línea: «Compare estos datos con el empaque antes de usarlos.»
