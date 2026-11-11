# FARMA-ETIQUETA — app Android (APK)

Empaqueta la aplicación web de `../farma-etiqueta/` como app Android con [Capacitor 7](https://capacitorjs.com). Es el mismo código; dentro del APK van todos los recursos (OCR, lector de códigos, PDF, Word), así que **funciona sin internet desde el primer uso** y no depende de ningún sitio web.

## Instalar en el teléfono

1. Descargue `dist/FARMA-ETIQUETA-1.8.1.apk` en el teléfono Android (Android 6.0 o superior).
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

## iPhone / iPad (.ipa)

El proyecto iOS está en `ios/`. El archivo `dist/FARMA-ETIQUETA-<versión>.ipa` lo compila automáticamente GitHub Actions en macOS (`.github/workflows/ios-ipa.yml`) cada vez que cambia la app, y lo guarda en esta carpeta. Se entrega **sin firmar**: el iPhone no lo instala directamente.

### Instalarlo desde un computador (gratis, se renueva cada 7 días)

1. En el computador (Windows o Mac) instale [Sideloadly](https://sideloadly.io). En Windows instale también iTunes desde la página de Apple (no la versión de Microsoft Store).
2. Descargue el `.ipa` al computador.
3. Conecte el iPhone por cable, desbloquéelo y toque *Confiar en este computador*.
4. Abra Sideloadly, arrastre el `.ipa`, escriba su Apple ID y pulse *Start*. Sideloadly firma la app con su cuenta.
5. En el iPhone: *Ajustes → General → VPN y gestión de dispositivos* → su Apple ID → *Confiar*.
6. En iOS 16 o superior: *Ajustes → Privacidad y seguridad → Modo de desarrollador* → activar y reiniciar.

Con un Apple ID gratuito la firma vence a los **7 días**: la app deja de abrir hasta repetir el paso 4. Instálela siempre **encima** (sin borrarla) para conservar los registros, y exporte respaldos con regularidad. Con una cuenta Apple Developer de pago la firma dura un año.

Estado de las pruebas: el `.ipa` compila y contiene el ejecutable arm64, los complementos y todos los recursos web y de OCR. **No se ha instalado ni ejecutado en ningún iPhone.**

Alternativa sin computador ni caducidad: la versión web (`../farma-etiqueta/`) abierta en Safari y agregada a la pantalla de inicio.
