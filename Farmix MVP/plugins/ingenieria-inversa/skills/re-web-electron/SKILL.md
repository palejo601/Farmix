---
name: re-web-electron
description: "Analiza una aplicación web, PWA o Electron: pantallas, rutas, estado, llamadas a la API, almacenamiento local y service workers. Úsalo para documentar o entender una interfaz ya construida, o para sacar wireframes y flujos de ella."
---

# Web, PWA o Electron

## Flujo
1. **Mapa de pantallas y rutas** (router, menús, páginas).
2. **Datos:** llamadas de red, estado global, `localStorage`/IndexedDB, cookies, service worker y caché.
3. **Flujos de usuario:** recórrelos con un navegador automatizado en un entorno local y toma capturas.
4. **Componentes y diseño:** tokens de color/tipografía, componentes repetidos, accesibilidad básica.
5. **Electron:** procesos main/renderer, preload, IPC, permisos; revisa `asar` con herramientas locales.
6. **Salida:** mapa de rutas, flujos, capturas y wireframes reconstruidos (declara que son reconstruidos).

## Reglas comunes
1. **Autorización:** confirma que el objetivo es del usuario o que tiene permiso. No ayudes a evadir licencias, DRM o protecciones, ni a extraer credenciales; si aparece un secreto, repórtalo sin copiarlo.
2. **Solo lectura:** no modifiques el objetivo; ejecuta código no confiable solo en un directorio aislado y nunca contra producción.
3. **Etiqueta:** `[H]` hecho (con evidencia: archivo:línea o salida), `[I]` inferencia, `[R]` recomendación. No inventes nada y no afirmes haber ejecutado lo que no ejecutaste.
4. **Ahorra tokens:** busca antes de leer, lee por partes, resume.
