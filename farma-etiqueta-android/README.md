# FARMA-ETIQUETA — app Android (APK)

Empaqueta la aplicación web de `../farma-etiqueta/` como app Android con [Capacitor 7](https://capacitorjs.com). Es el mismo código; dentro del APK van todos los recursos (OCR, lector de códigos, PDF, Word), así que **funciona sin internet desde el primer uso** y no depende de ningún sitio web.

## Instalar en el teléfono

1. Descargue `dist/FARMA-ETIQUETA-1.1.0.apk` en el teléfono Android (Android 6.0 o superior).
2. Ábralo. Android pedirá permitir «instalar aplicaciones desconocidas» para el navegador o gestor de archivos usado: acepte.
3. Si Play Protect avisa de que no reconoce al desarrollador, elija *Instalar de todas formas* (la app no está en Play Store).

La app solo declara el permiso de internet (no lo necesita para funcionar); no pide cámara, contactos ni ubicación.

## Diferencias respecto a la versión web

| Función | En la app Android |
|---|---|
| Exportar PDF / Word / respaldo | Se abre el menú *Compartir* de Android para guardar el archivo (Drive, Archivos), abrirlo o enviarlo. |
| Imprimir | Genera el PDF y lo entrega por el mismo menú; imprímalo desde el visor de PDF o el servicio de impresión del teléfono. |
| OCR sin conexión | Disponible siempre (recursos incluidos). |
| Actualización | Instalar el APK nuevo **encima**, sin desinstalar: los registros se conservan. |

**Importante:** desinstalar la app o «borrar datos» elimina los registros. Exporte un respaldo antes.

## Compilar

Requisitos: Node 20+, JDK 21, Android SDK (platform 35, build-tools 35).

```bash
cd farma-etiqueta-android
npm install
npx cap sync android          # copia ../farma-etiqueta dentro del proyecto
cd android && ./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk
```

### Firma (necesaria para poder actualizar)

Android solo deja instalar una versión nueva encima de la anterior si está firmada con **la misma clave**. La clave no está en el repositorio. Cree `android/keystore.properties`:

```
storeFile=../../keystore/farma-etiqueta.jks
storePassword=...
keyAlias=farmaetiqueta
keyPassword=...
```

y coloque el archivo `.jks` en `farma-etiqueta-android/keystore/`. Conserve ese archivo: si se pierde, las versiones futuras exigirán desinstalar (y restaurar desde un respaldo). Para cada versión nueva suba `versionCode` en `android/app/build.gradle`.

## Estado de las pruebas

- Verificado: el APK compila, está firmado (esquema v2), contiene todos los recursos, y las rutas de código propias de la app (guardar/compartir archivos, estado sin conexión) funcionan con un puente nativo simulado.
- **No verificado: ejecución en un teléfono o emulador Android** (el entorno de compilación no permite emuladores). Falta comprobar en un dispositivo real: apertura del selector de fotos, OCR dentro del WebView y el menú Compartir.

## iPhone

Apple no permite instalar apps fuera de la App Store sin un Mac y una cuenta Apple Developer de pago. En iPhone se usa la versión web (`../farma-etiqueta/`) publicada en HTTPS y agregada a la pantalla de inicio desde Safari.
