# FARMA-ETIQUETA

**Etiqueta con precisión, cuida con confianza.**

Aplicación web progresiva (PWA) para identificar, registrar y rotular medicamentos, productos farmacéuticos y dispositivos médicos desde el teléfono (Android / iPhone), tableta o computador. Trabaja sin conexión y guarda todo en el propio dispositivo.

> Es una herramienta de apoyo para identificación y rotulado. **No es un sistema de validación sanitaria** y no sustituye la revisión del empaque original. No incluye inventario, compras, ventas ni existencias.

## 1. Qué hace

| Módulo | Funciones |
|---|---|
| Registrar producto | Formulario completo (información general + lote), editable en todo momento. |
| Fotografía | Selector real de archivos (galería o archivos), vista previa, cambiar, eliminar. Corrige orientación, reduce a 1800 px y comprime a JPEG. Se guarda en IndexedDB. **No usa cámara en vivo ni pide permisos de cámara.** |
| Pantalla principal | Solo tres opciones: **Escanear fotografía**, **Crear rótulo** e **Historial** (respaldo y configuración quedan en la barra inferior y el engranaje). El lector de códigos de barras se eliminó en la 1.6.0; el código se puede escribir a mano y se dibuja en el rótulo. |
| Casillas L / F / V | Reconoce casillas impresas con una sola letra (L = lote, F = fabricación, V = vencimiento): por texto («[L] 4B0123», «|V| 05/2027», letras arriba y valores abajo) y por imagen (detecta los recuadros, lee cada letra aparte con contraste aumentado y lee el valor a la derecha o debajo). Si la letra o el valor no son seguros, si se repite una letra con valores distintos o si la fabricación no es anterior al vencimiento, el dato queda pendiente de revisión; nunca se intercambian valores. |
| Lote y vencimiento en relieve | Para códigos troquelados sin tinta (blanco sobre blanco, caracteres espaciados): realce del relieve (detalle local + umbral con histéresis), detección de renglones, compactación de caracteres, lectura en varias escalas con votación y recorte automático de la zona. Lo leído en relieve SIEMPRE queda como sugerencia pendiente de revisión. Probado con una foto real: vencimiento 09/2027 correcto; el lote salió con el primer dígito errado (4575101 en vez de 1575101), por eso nunca se llena solo. |
| Meses en letras y texto pequeño | Fechas con el mes en letras (FEB, FEBRERO, AGO, AUG, ENERO…) se convierten a número (FEB2026 → 02/2026, 15 MAR 2025 → 15/03/2025); las numéricas quedan como están. Corrige confusiones del OCR en el mes (AG0 → AGO). Si el lote y las fechas son pequeños o están aislados, la foto se lee por partes ampliadas y la zona encontrada se relee a resolución completa con dos tratamientos; si difieren, el dato queda dudoso. |
| Teléfonos antiguos (1.19.0) | Perfil de rendimiento (`js/perf.js`): se detecta solo (≤ 4 GB de memoria; sin ese dato, ≤ 4 núcleos) y se puede forzar en Configuración › Rendimiento. En modo rápido: lectura a 2400 px (no 3200), copia de lectura de 3000 px, sin lectura en relieve ni realzada automáticas, escáner en vivo más liviano. En todos los modos: el relieve hace 1 lectura por renglón con el lector nativo (antes 3) y 4 binarizaciones (antes 9); con ML Kit no se relee la foto girada; la calidad de la foto se mide sin volver a decodificarla. Medido con CPU ×4: segundo plano de 17,2 s a 9,6 s (completo) y 1,9 s (rápido); lecturas nativas de 38 a 16 y 1. |
| Escanear lote y fechas (1.18.0) | Botón junto al campo de lote: la cámara con un recuadro pequeño solo para el bloque de lote y fechas, a más resolución (2560×1440 si el teléfono lo permite). Lee ese recorte varias veces por segundo, acepta un dato solo cuando se repite, vibra al confirmarlo y se cierra solo cuando lote y vencimiento quedan confirmados. Si en 6 s no lo logra y el Asistente IA está activo, le envía una sola vez ese recorte a resolución completa. No cambia la foto del registro. |
| Más datos y otra cara (1.17.0) | **La IA lee todo el formulario**: además de lote y fechas, nombre, principio activo, concentración, forma, presentación, laboratorio y registro sanitario (misma consulta). Si el campo está vacío y la IA lo lee con certeza alta, se llena; si no, queda como sugerencia; lo que ya tiene valor no se cambia. **Otra cara de la caja**: en «Más opciones de lectura», «Agregar otra cara de la caja» lee esa foto completa (teléfono + IA) y solo completa lo que falta, sin reemplazar la foto del registro ni lo escrito. La IA trabaja en paralelo y no bloquea la pantalla. |
| Análisis de imagen (1.16.0) | **Zoom para la IA:** además de la foto completa, el Asistente IA recibe la zona del lote y las fechas recortada de la foto a resolución completa (ubicada por el lector del teléfono). **Localizar y releer:** si el teléfono no ubicó la zona y la IA no ve bien el lote o el vencimiento, la IA indica dónde está el bloque y se relee ampliado. **Calidad de la foto:** nitidez (laplaciano en la zona más nítida; calibrado con fotos reales: nítidas ≥ 250, borrosas ≤ 100, umbral 150) y reflejos; si la foto es mala, la app lo avisa con cómo repetirla. |
| Asistente IA (1.15.0) | Opcional, con internet y clave de API de Anthropic del usuario (Configuración). Envía la foto a Claude (`claude-opus-5-5`, salida JSON estructurada, SDK oficial empaquetado en `vendor/lib/anthropic.iife.min.js`) en paralelo con el lector del teléfono (`js/ai.js`). Si ambos leen lo mismo, el dato se llena; si difieren o solo lo lee la IA, queda como sugerencia con las opciones. Probado solo con la API simulada. La misma lógica de lectura está como Skill de Claude en `skills/lectura-lote-vencimiento/SKILL.md`. |
| Lector de texto nativo (1.14.0) | En la app instalada el texto se lee con el lector del propio teléfono: **Google ML Kit** en Android (modelo incluido en el APK) y **Apple Vision** en iPhone, ambos sin internet. Plugin propio en `farma-etiqueta-android/native-ocr/`. Tesseract queda como respaldo (versión web, o si el nativo falla). Se conservan la lectura por posición, la verificación con segunda lectura y la regla de no llenar nada dudoso. **No probado en un teléfono real**: solo se comprobó que compila y, con un lector simulado, que la app lo usa, verifica y llena. |
| B y 8 en el lote | Cada «B» u «8» leído en un lote se reclasifica por la FORMA del carácter: la B tiene el lado izquierdo recto y continuo con esquinas rectas; el 8 es redondo arriba y abajo y se estrecha en el centro. Si la forma no es concluyente, el lote queda dudoso (nunca se adivina). Prueba: 24 de 24 caracteres B/8 en 4 tipos de letra y 3 tamaños, sin ninguna confusión; foto real «L.6B0985» leída correctamente. |
| Escáner en vivo | Cámara trasera con recuadro guía; un dato se confirma cuando se lee igual varias veces (lote y fechas: 3). Muestra el texto visto, permite aceptar un dato tocándolo y ofrece «Tomar foto y leer». |
| OCR | Tesseract.js (español + inglés), local. Propone nombre, principio activo, concentración, forma, presentación, laboratorio/fabricante, registro sanitario, lote y vencimiento en una **pantalla de revisión** con confianza, avisos de duda y corrección manual. |
| Historial | Búsqueda (nombre, principio activo, lote, código, laboratorio), filtros, detalle con foto, edición, eliminación con confirmación, trazabilidad de cambios. |
| Rótulos | 6 tamaños predefinidos (100×70, 70×50, 50×30, 40×20, 30×15, 20×10 mm) + personalizado, campos configurables, vista previa fiel, hoja A4/Carta/Legal/personalizada, márgenes, separaciones, cálculo de páginas. |
| Impresión y exportación | Impresión con CSS en mm reales, PDF vectorial y Word (DOCX) con tablas y texto editables. |
| Copias de seguridad | Exporta/restaura registros con fotografías, verificación de integridad, aviso de duplicados. |
| Configuración | Estado de conexión, almacenamiento, recursos OCR, instalación, actualización. |

## 2. Instalación

La aplicación son archivos estáticos: no necesita servidor de aplicaciones, base de datos, cuentas ni servicios de pago.

### Publicarla (necesario para usarla en el teléfono)

**Publicada en: https://palejo601.github.io/Farmix/** (GitHub Pages, rama `gh-pages`, que contiene solo esta carpeta).

Para publicar una versión nueva, desde la raíz del repositorio:

```bash
git push origin $(git commit-tree $(git rev-parse HEAD:farma-etiqueta) -p origin/gh-pages -m "Publica nueva versión"):refs/heads/gh-pages
```

Para alojarla en otro sitio:

Suba la carpeta `farma-etiqueta/` completa a cualquier alojamiento **HTTPS** de archivos estáticos:

- **GitHub Pages**: en el repositorio → *Settings → Pages* → publicar la rama; la app queda en `https://USUARIO.github.io/REPO/farma-etiqueta/`.
- **Netlify / Cloudflare Pages / Vercel**: arrastre la carpeta o conéctela al repositorio (sin comando de compilación; directorio de publicación `farma-etiqueta`).
- Servidor propio (nginx, Apache, IIS) con certificado HTTPS.

### Instalarla como aplicación

- **Android (Chrome)**: abra la dirección → menú ⋮ → *Instalar aplicación* (o el botón «Instalar aplicación» en Configuración).
- **iPhone / iPad (Safari)**: abra la dirección en Safari → *Compartir* → *Agregar a pantalla de inicio*. No requiere App Store ni cuenta Apple Developer.
- **Computador (Chrome / Edge)**: icono de instalación en la barra de direcciones.

### Probarla en un computador

```bash
cd farma-etiqueta
npx serve .        # o: python3 -m http.server 8080
```
Abra `http://localhost:3000` (o el puerto indicado). `localhost` cuenta como contexto seguro.

### Tres formas de abrirla: qué funciona en cada una

| | Archivo local (`file://`) | Sitio HTTPS | PWA instalada |
|---|---|---|---|
| Interfaz y registros | ✗ El navegador bloquea los módulos; se muestra un aviso | ✓ | ✓ |
| Trabajo sin conexión | ✗ | ✓ tras la primera visita | ✓ |
| OCR | ✗ | ✓ | ✓ |
| Icono propio, pantalla completa | ✗ | ✗ | ✓ |
| Persistencia de datos | — | Buena; el navegador puede liberar datos si falta espacio o (Safari) tras semanas sin uso | La más estable |

**No abra `index.html` con doble clic**: un archivo HTML local no tiene las capacidades de una PWA.

## 3. Uso

1. **Registrar**: pulse *Elegir de la galería* o *Elegir de archivos*, seleccione la foto del empaque.
2. **Antes de guardar**, la app pide confirmar el lote y las fechas leídos de la foto y avisa de los datos dudosos sin resolver.
3. **Reconocer texto (OCR)**: revise cada dato propuesto, corríjalo si hace falta, marque los que quiere usar y pulse *Aplicar al formulario*.
4. Complete o corrija a mano lo que falte y pulse **Guardar registro** (esa es la confirmación).
5. **Historial**: busque, abra, edite, elimine o pulse *Rótulo*.
6. **Rótulos**: elija productos y cantidades, tamaño, campos y hoja; revise la vista previa; *Imprimir*, *Exportar PDF* o *Exportar Word*.
   Al imprimir, use **escala 100 %** y **márgenes: ninguno** en el diálogo del navegador.

Desde Inicio, *Identificar por fotografía* hace los pasos 1-3 seguidos.

### Calidad de los datos

- Nada se escribe en el formulario sin que usted lo confirme; nada se guarda sin pulsar *Guardar*.
- El OCR nunca corrige caracteres (O/0, I/1, S/5, B/8): solo avisa cuando un lote o fecha contiene combinaciones dudosas.
- Datos con confianza baja se muestran sin marcar. Si no se detecta la fecha de vencimiento, se advierte.
- El código de barras solo se escribe a mano; la app ya no lo lee de la foto.
- Cada campo guarda su origen (manual, OCR confirmado, código leído) y cada registro lleva un historial de cambios.
- La fecha de vencimiento se guarda como texto, tal como usted la confirma. Los avisos «Vencido / Próximo a vencer» son orientativos (interpretan `MM/AAAA`, `DD/MM/AAAA`, `AAAA-MM`, `MAY 2027`; sin día se asume fin de mes).

## 4. Funcionamiento sin conexión

- En la primera visita con internet, el *service worker* guarda la aplicación completa (interfaz y generadores de PDF y Word).
- **OCR**: sus recursos (worker, núcleo WebAssembly e idiomas español/inglés, ≈ 9 MB para un dispositivo) se guardan **la primera vez que se usa el OCR** o al pulsar *Configuración → Preparar OCR para uso sin conexión*. Hasta entonces el indicador muestra «OCR: recursos pendientes» y el OCR requiere internet. Después funciona sin conexión.
- Registros y fotografías están en IndexedDB: historial, edición, rótulos, PDF, Word y respaldos funcionan sin internet.
- Ninguna función usa servicios externos; todas las bibliotecas están incluidas en `vendor/`.
- Indicadores en Inicio y Configuración: conexión, aplicación sin conexión, recursos OCR, registros, almacenamiento usado y persistente.

### Lote, fecha de fabricación y vencimiento: zona marcada

Estos datos suelen estar impresos aparte, pequeños, por puntos o en relieve, y son los que peor lee cualquier OCR. Por eso tienen un flujo propio:

1. *Marcar lote y fechas en esta foto* (o *desde otra foto* si están en otra cara del empaque).
2. Se arrastra el dedo para encerrar la zona. La app la recorta y la amplía.
3. La zona se lee varias veces (normal, realzada, texto disperso, invertida y, con internet y clave, en línea) y se comparan las lecturas.
4. Se muestra la **zona ampliada** junto a los tres campos: lo que coincide entre lecturas llega escrito; lo dudoso se ofrece como opción; lo que no se pudo leer queda para escribirlo mirando la imagen.

Así los tres datos siempre quedan revisados contra la imagen antes de guardarse. Al guardar un registro sin lote o sin vencimiento, la app lo advierte y pide confirmación.

### Reconocimiento en línea (opcional)

Con internet, la app puede leer las fotos con el servicio externo **OCR.space** en lugar del OCR local. Se activa en *Configuración → Reconocimiento en línea* pegando una clave gratuita (registro en `ocr.space/ocrapi/freekey`; el plan gratuito indica 25.000 lecturas al mes y archivos de hasta 1 MB, por lo que la app reduce la foto antes de enviarla).

- Si hay internet y clave, se usa el servicio en línea; si no hay conexión, la clave falla o se supera el límite, se usa automáticamente el OCR local y la revisión indica cuál se usó y por qué.
- **Las fotografías leídas en línea salen del dispositivo** hacia ese servicio. La clave se guarda solo en el dispositivo (no va en respaldos ni en el código).
- En la prueba con una imagen sintética de lote impreso por puntos, el servicio en línea leyó correctamente lote, fabricación y vencimiento, donde el OCR local no leyó nada. No es infalible: la pantalla de revisión y la confirmación siguen siendo obligatorias.
- El servicio no entrega nivel de confianza por dato; la app muestra «Confianza n/d».

## 5. Respaldo y restauración

**Guardar**: *Respaldo → Exportar respaldo completo*. Se descarga `farma-etiqueta-respaldo-FECHA.json` con todos los registros y sus fotografías (cada foto vinculada a su registro por el mismo identificador). Cópielo fuera del teléfono (correo, nube, computador). Hágalo periódicamente y siempre antes de cambiar de teléfono o borrar datos del navegador.

**Recuperar**: *Respaldo → Seleccionar archivo de respaldo*. La aplicación:
1. Verifica estructura e integridad (CRC de registros y de cada foto). Si el archivo está dañado, incompleto o alterado, lo rechaza sin tocar nada.
2. Muestra cuántos registros trae y cuántos ya existen.
3. Usted elige *Agregar solo los nuevos* o *Sobrescribir existentes* (pide una segunda confirmación).
4. Escribe todo en una sola transacción: o se restaura completo o no cambia nada. Los registros que no están en el respaldo no se borran.

## 6. Actualizar sin perder registros

Los registros viven en IndexedDB, separados de los archivos de la aplicación; actualizar los archivos no los toca.

1. (Recomendado) Exporte un respaldo.
2. Reemplace los archivos en el alojamiento.
3. Cambie `VERSION` en `sw.js` (p. ej. `1.0.0` → `1.0.1`) para que los dispositivos detecten la versión nueva.
4. En cada dispositivo aparecerá «Hay una nueva versión» → *Actualizar*. También: *Configuración → Buscar actualización*.

Reglas para quien modifique el código: no cambie el nombre de la base (`farma-etiqueta`) ni borre almacenes; si necesita cambiar la estructura, suba `DB_VERSION` en `js/db.js` y **agregue** almacenes/índices en `onupgradeneeded`. No cambie el nombre de la caché `fe-ocr-v2` salvo que cambien los recursos OCR.

## 7. Pruebas realizadas

Resultado completo: [`docs/resultado-pruebas.md`](docs/resultado-pruebas.md) (75 de 75 comprobaciones correctas). Se ejecutan con `node tests/e2e.cjs` (requiere `npm i playwright`).

**Cómo se probó**: automatización con Chromium real emulando un teléfono Android (Pixel 7, pantalla táctil de 412 px), con la aplicación servida por HTTP local y service worker activo. Imágenes de prueba **sintéticas** generadas por el propio script (empaque con texto impreso y código EAN-13).

| Prueba del encargo | Qué se comprobó |
|---|---|
| 1. Selector de fotos | El botón abre el selector de archivos del sistema; `input type=file` sin `capture`; vista previa; cambiar; eliminar; archivo dañado y archivo que no es imagen dan mensaje claro. |
| 2. Inicio | Exactamente tres opciones y cada una abre su pantalla; no queda código del lector (barcode.js, ZXing, BarcodeDetector). |
| 3. OCR | Nombre, concentración, lote, vencimiento, registro, laboratorio, forma y presentación extraídos sin alteración; empaque sin lote/fecha → no los inventa y advierte; corrección manual; confirmación y guardado. |
| 4. Almacenamiento | Cerrar y reabrir: registro, miniatura y foto completa siguen; la foto está en IndexedDB como bytes; borrador recuperado tras cierre inesperado; aviso de duplicados. |
| 5. Offline | Con la red desconectada: abrir, consultar, registrar, editar, buscar, OCR completo y rótulos. |
| 6. Impresión | 6 tamaños sin texto cortado ni superpuesto; 30 rótulos/10 por hoja = 3 páginas; hoja Carta con márgenes y separaciones exactos; PDF del motor de impresión y PDF exportado con medida real y sin páginas extra; DOCX con tablas, texto editable, medidas en twips y código de barras. |
| 7. Respaldo | Exportar con fotos; borrar un registro; archivo truncado y archivo alterado rechazados; restaurar recupera registro y foto; sobrescribir pide doble confirmación. |

### Lo que NO se probó (debe verificarse en dispositivos reales)

- **No se probó en ningún teléfono físico**: ni Android con Chrome ni iPhone con Safari. La prueba 1 confirma que el navegador recibe la orden de abrir el selector, pero no qué pantalla muestra cada teléfono (galería, Fotos, Archivos).
- **Safari / iOS no se probó en absoluto** (ni emulado: solo había Chromium disponible). Tampoco Edge ni Firefox.
- **OCR y códigos con fotografías reales** de empaques (curvos, brillantes, impresión por puntos o en relieve, poca luz) no se probaron; el rendimiento real será inferior al de las imágenes sintéticas.
- **Impresión en papel** y medición con regla no se hizo; se verificaron las dimensiones en el PDF generado por el motor de impresión.
- **El DOCX no se abrió en Microsoft Word**: se verificó su estructura interna (tablas, textos, medidas), no su apariencia.
- Instalación como PWA (aviso de instalación, icono) no se probó.

## 8. Limitaciones conocidas

- **Fotos HEIC** (iPhone): Safari normalmente las entrega convertidas a JPEG; si llega un HEIC sin convertir, se rechaza con un mensaje.
- **OCR**: el texto de lote/vencimiento grabado en relieve, por puntos o con bajo contraste suele no leerse; la aplicación entonces no propone nada y hay que escribirlo. El nombre y el principio activo se deducen por tamaño y posición del texto y siempre deben confirmarse. En teléfonos de gama baja el OCR puede tardar 10-40 s.
- **Lote y fechas impresos por puntos (inyección) o en relieve**: en la prueba con una imagen sintética de impresión por puntos el OCR devolvió texto ilegible o valores equivocados con apariencia válida (p. ej. «85/2027»). Por eso esas lecturas nunca se premarcan y las fechas imposibles se señalan; en la práctica esos datos suelen tener que escribirse a mano. También puede confundir B/8 u O/0 sin que sea detectable («4B0123» leído «480123»).
- **Códigos de barras en rótulos**: se dibujan a partir del número escrito. En rótulos menores a ~30 mm de ancho un EAN-13 no cabe con barras legibles: se omite y se avisa.
- **Impresión en iPhone/iPad**: Safari ignora el tamaño de página CSS; use *Exportar PDF* e imprima ese archivo. En cualquier navegador, desactive «ajustar a la página».
- **PDF y Word** usan Helvetica/Arial; si un texto resulta más ancho que en la vista previa, se reduce esa línea para que nunca se salga del rótulo. En Word, textos muy largos pueden requerir ajuste manual (las filas tienen alto exacto).
- **Almacenamiento**: los datos existen solo en ese navegador/dispositivo. Borrar datos del sitio, desinstalar la PWA o (en Safari sin instalar) varias semanas sin uso pueden eliminarlos. No hay sincronización entre dispositivos: use los respaldos.
- Respaldos muy grandes (cientos de fotos) pueden agotar la memoria en teléfonos modestos al restaurar.
- Máximo 3000 rótulos por trabajo.

## 9. Código fuente

```
farma-etiqueta/
├── index.html              Interfaz (una sola página, vistas por #hash)
├── manifest.webmanifest    Manifiesto PWA
├── sw.js                   Service worker (caché de la app y de recursos OCR)
├── css/app.css             Estilos mobile-first + CSS de impresión
├── icons/                  Logotipo (cápsula + hoja)
├── js/
│   ├── app.js              Arranque, navegación, manejo global de errores
│   ├── ui.js               Avisos, modales, progreso, carga diferida
│   ├── db.js               IndexedDB (registros, fotos, ajustes, borrador)
│   ├── photos.js           Validación, orientación, redimensión, compresión
│   ├── ocr.js              Motor Tesseract
│   ├── extract.js          Reglas de extracción de campos (función pura)
│   ├── form.js             Registro / edición / revisión OCR
│   ├── history.js          Historial
│   ├── labels.js           Motor de rótulos (geometría en mm, SVG)
│   ├── labelsview.js       Pantalla de rótulos, impresión, PDF, DOCX
│   ├── backup.js           Respaldo y restauración
│   └── settings.js         Estado, offline, instalación, actualización
├── vendor/                 Bibliotecas incluidas (sin CDN)
├── tests/e2e.cjs           Pruebas automáticas
└── docs/resultado-pruebas.md
```

Los módulos pesados (OCR, PDF, DOCX) se cargan solo cuando se usan y cada uno falla de forma aislada: un error de OCR no afecta el almacenamiento, el historial ni la impresión.

### Dependencias (incluidas en `vendor/`, sin compilación)

| Biblioteca | Versión | Uso | Licencia |
|---|---|---|---|
| tesseract.js | 7.0.0 | OCR | Apache-2.0 |
| tesseract.js-core (LSTM: base, SIMD, relaxed-SIMD) | 7.0.0 | Motor WebAssembly | Apache-2.0 |
| tessdata_fast (spa, eng) de tesseract-ocr | 4.1 | Idiomas (modelos rápidos) | Apache-2.0 |
| JsBarcode | 3.12.3 | Codificación de barras en rótulos | MIT |
| jsPDF | 4.2.1 | PDF | MIT |
| docx | 9.15.3 | Word (DOCX) | MIT |

Datos locales: IndexedDB `farma-etiqueta` (almacenes `records`, `photos`, `kv`). No se usa `localStorage`.
