# Resultado de las pruebas automáticas

Ejecución: 2026-11-12 00:18 UTC · Chromium 153.0.8010.12 · emulación Pixel 7 (Android).

| Estado | Comprobación | Detalle |
|---|---|---|
| OK | El botón «Elegir de la galería» abre el selector de archivos del sistema |  |
| OK | Es un <input type=file> real, acepta JPEG/PNG/WEBP y no fuerza la cámara | image/jpeg,image/png,image/webp |
| OK | Aparece la vista previa de la fotografía | 1400 px |
| OK | La fotografía se puede cambiar (selector «archivos») |  |
| OK | La fotografía se puede eliminar (con confirmación) |  |
| OK | Archivo dañado: mensaje comprensible y sin bloqueo | La fotografía está dañada o no se puede abrir. Elija otra imagen. |
| OK | Archivo que no es imagen: rechazado por contenido, no por extensión |  |
| OK | La cámara solo se usa en el escáner en vivo (js/live.js), al pulsar su botón |  |
| OK | La pantalla principal tiene únicamente: Escanear fotografía, Crear rótulo, Historial | Escanear fotografía · Crear rótulo · Historial |
| OK | Lector de códigos eliminado (sin barcode.js, ZXing ni BarcodeDetector) |  |
| OK | «Crear rótulo» abre el generador |  |
| OK | «Historial» abre el historial |  |
| OK | OCR extrae el nombre | CALMADOL |
| OK | OCR extrae la concentración | 500 mg |
| OK | OCR extrae el lote sin alterarlo | AB12345 |
| OK | OCR extrae el vencimiento sin alterarlo | 05/2027 |
| OK | OCR extrae registro sanitario, laboratorio, forma y presentación | INVIMA 2019M-0012345 \| Laboratorios Andinos S.A \| Tabletas recubiertas \| Caja por 20 tabletas |
| OK | La revisión muestra nivel de confianza y advierte que no es información verificada |  |
| OK | Nada se escribe en el formulario antes de confirmar |  |
| OK | Corrección manual en la revisión y aplicación al formulario |  |
| OK | «Marcar lote y fechas»: lee la zona ampliada y muestra los tres campos para confirmar | [["Número de lote","AB12345","Leído"],["Fecha de fabricación","","Sin leer"],["Fecha de vencimiento","05/2027","Leído"]] |
| OK | La zona de otra foto no reemplaza la foto guardada y nada se aplica sin confirmar |  |
| OK | Al confirmar se aplican lote, fabricación (escrita a mano) y vencimiento |  |
| OK | Empaque sin lote ni fecha: no inventa esos campos y advierte que falta el vencimiento |  |
| OK | Antes de guardar se exige confirmar lote/fechas leídos por la foto | Confirme los datos leídos de la foto Compare con el empaque: Fecha de vencimiento: 05/2027. ¿Confirma que los revisó? Cancelar Sí, revisé y guardar |
| OK | Registro confirmado y guardado |  |
| OK | Tras cerrar y reabrir, el registro sigue disponible |  |
| OK | La miniatura de la fotografía sigue disponible |  |
| OK | La fotografía completa se recupera de IndexedDB | 1400 × 1000 px |
| OK | El detalle distingue datos leídos (OCR / código) de datos manuales |  |
| OK | La foto está guardada como bytes en IndexedDB (no como URL temporal) | [{"bytes":96794,"isBuf":true}] |
| OK | Cierre inesperado: el formulario sin guardar se recupera |  |
| OK | Al guardar sin lote ni vencimiento se advierte y se pide confirmación |  |
| OK | Control de duplicados: avisa antes de guardar un registro repetido |  |
| OK | Indicador: recursos OCR disponibles sin conexión (tras el primer uso) |  |
| OK | Sin internet: la aplicación abre y muestra el historial |  |
| OK | Sin internet: el indicador de conexión lo informa |  |
| OK | Sin internet: OCR completo (motor, WASM e idiomas locales) | AB12345 |
| OK | Sin internet: registrar un producto |  |
| OK | Sin internet: editar un registro y buscarlo por nombre + lote |  |
| OK | Búsqueda por código de barras |  |
| OK | Búsqueda por laboratorio |  |
| OK | Búsqueda por principio activo (sin tildes) |  |
| OK | Filtro «vencidos» (ninguno en los datos de prueba) |  |
| OK | Sin internet: se generan rótulos con vista previa |  |
| OK | 30 rótulos con 10 por hoja → 3 páginas | 70 × 50 mm · 10 rótulo(s) por hoja (2 × 5) · 30 rótulo(s) en total · 3 página(s) de 210 × 297 mm |
| OK | Lista de tamaños según la especificación | Grande — 100 × 70 mm · Mediano — 70 × 50 mm · Pequeño — 50 × 30 mm · Blíster — 40 × 20 mm · Ampolla o vial — 30 × 15 mm · Tableta o cápsula — 20 × 10 mm · Personalizado |
| OK | Los 6 tamaños predefinidos (100×70, 70×50, 50×30, 40×20, 30×15, 20×10): texto dentro del rótulo, sin cortes ni superposición | 100×70: 5 líneas+barras · 70×50: 5 líneas+barras · 50×30: 5 líneas+barras · 40×20: 4 líneas+barras · 30×15: 4 líneas+barras · 20×10: 4 líneas (aviso) |
| OK | Rótulo 20 × 10 mm: el código de barras se omite con aviso en vez de imprimirse ilegible |  |
| OK | Tamaño personalizado 60 × 35 mm | 60 × 35 mm · 21 rótulo(s) por hoja (3 × 7) · 30 rótulo(s) en total · 2 página(s) de 210 × 297 mm |
| OK | Distribución imposible: error claro e impresión deshabilitada |  |
| OK | Impresión: hoja Carta en mm reales, márgenes y separaciones configurados | {"n":4,"w":"215.9mm","h":"279.4mm","page":"@page{size:215.9mm 279.4mm;margin:0}","cells":["translate(15 12)","translate(89 12)","translate(15 67)"],"per":8} |
| OK | Impresión: 30 rótulos a 8 por hoja → 4 páginas, sin rótulos adicionales |  |
| OK | Motor de impresión (PDF del navegador): 4 páginas tamaño Carta, sin página en blanco extra | 4 páginas, 612 × 792 pt |
| OK | Exportar PDF: 4 páginas de 215,9 × 279,4 mm (medida real) | 4 pág., 215.9 × 279.4 mm |
| OK | Exportar Word: DOCX con tablas y texto editable (no una imagen pegada) | 4 tablas, 78 celdas |
| OK | Exportar Word: medidas configuradas (celda 70 mm = 3969 twips, fila 50 mm exacta) y código de barras incluido |  |
| OK | Botones separados: Ver PDF, Ver Word, Compartir PDF, Compartir Word | Imprimir · Ver PDF · Ver Word · Compartir PDF · Compartir Word |
| OK | «Ver» en Android (navegador) descarga el archivo y explica cómo abrirlo |  |
| OK | Compartir PDF y Compartir Word entregan archivos reales (sin menú Compartir en este navegador: se descargan) |  |
| OK | Respaldo exportado con registros y fotografías | 2 registros, 2 fotos, 263 KB |
| OK | Eliminar pide confirmación |  |
| OK | Registro de prueba eliminado |  |
| OK | Respaldo truncado: detectado como dañado, sin modificar datos |  |
| OK | Respaldo alterado: no supera la verificación de integridad |  |
| OK | Restauración: advierte sobre registros que ya existen |  |
| OK | Tras restaurar: el registro y su fotografía se recuperan |  |
| OK | Sobrescribir exige una confirmación adicional |  |
| OK | Solo con elegir la foto se llenan nombre, concentración, lote, vencimiento, registro y laboratorio | 0.9 s · {"nombre":"CALMADOL","concentracion":"500 mg","lote":"AB12345","vencimiento":"05/2027","registroSanitario":"INVIMA 2019M-0012345","laboratorio":"Laboratorios Andinos S.A"} |
| OK | Sin ventanas que confirmar: aviso en el formulario para revisar antes de guardar |  |
| OK | Tiempo de lectura medido y mostrado (objetivo ≤ 10 s) | 0.4 s medidos por la app |
| OK | Lo escrito a mano no se reemplaza: lo leído queda como sugerencia |  |
| OK | Tocar la sugerencia la aplica |  |
| OK | Lote y fechas faltantes se buscan en segundo plano sin bloquear la pantalla | Buscando texto en relieve… (puede seguir revisando el formulario) |
| OK | Al terminar informa lo que no encontró y no inventa lote ni vencimiento |  |
| OK | Casillas [L] [F] [V]: cada valor va a su campo, sin intercambiarse | {"lote":"4B0123","fechaFabricacion":"05/2024","vencimiento":"05/2027"} |
| OK | En vivo: nombre, lote y vencimiento se confirman leyéndolos varias veces | 0.2 s · ✓ Nombre: CALMADOL \| ✓ Concentración: 500 mg \| ✓ Lote: AB12345 \| ✓ Vencimiento: 05/2027 |
| OK | «Usar datos» llena el formulario, guarda una foto del escaneo y apaga la cámara |  |
| OK | Ninguna pantalla se desborda horizontalmente en teléfono (412 px) |  |
| OK | Botones con altura táctil ≥ 40 px | 0 pequeños |
| OK | Sin errores de JavaScript durante toda la sesión |  |

**81 de 81 correctas.**
