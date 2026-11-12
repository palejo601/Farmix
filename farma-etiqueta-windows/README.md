# FARMA-ETIQUETA para Windows (.exe)

La misma app (lectura de lote y fechas, rótulos en mm, PDF y Word, historial) empaquetada con Electron.
Funciona sin internet; usa la cámara web para el escáner en vivo. «Ver PDF/Word» abre el archivo con el programa
instalado; «Compartir/Guardar» usa «Guardar como».

- Ejecutable: `dist/FARMA-ETIQUETA-<versión>-Windows.exe` (portable: no se instala, se abre con doble clic).
- Compilar: `npm install && npm run exe` (copia `../farma-etiqueta` a `www/`).
- No está firmado: Windows SmartScreen puede avisar la primera vez → «Más información» → «Ejecutar de todas formas».
