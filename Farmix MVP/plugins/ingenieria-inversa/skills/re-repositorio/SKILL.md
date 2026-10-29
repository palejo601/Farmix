---
name: re-repositorio
description: "Reconstruye arquitectura, módulos, flujos y dependencias de un repositorio de código a partir del propio código, sin documentación. Úsalo con un repo de GitHub o una carpeta local que haya que entender o documentar."
---

# Repositorio

## Flujo
1. **Inventario:** árbol de archivos, lenguajes, gestor de dependencias, scripts de build/test/despliegue, configuración y variables de entorno.
2. **Puntos de entrada:** main, servidor, CLI, rutas, workers, cron.
3. **Módulos:** responsabilidad de cada uno y cómo se llaman entre sí (grafo simple de dependencias).
4. **Flujos reales:** sigue 2 o 3 casos de extremo a extremo (entrada → lógica → datos → salida) con archivo:línea.
5. **Datos:** modelos, migraciones, relaciones y quién escribe cada tabla.
6. **Calidad y riesgos:** pruebas existentes, deuda, secretos en el código, dependencias desactualizadas.
7. **Verificación:** si hay pruebas, ejecútalas en local y reporta el resultado real.

## Reglas comunes
1. **Autorización:** confirma que el objetivo es del usuario o que tiene permiso. No ayudes a evadir licencias, DRM o protecciones, ni a extraer credenciales; si aparece un secreto, repórtalo sin copiarlo.
2. **Solo lectura:** no modifiques el objetivo; ejecuta código no confiable solo en un directorio aislado y nunca contra producción.
3. **Etiqueta:** `[H]` hecho (con evidencia: archivo:línea o salida), `[I]` inferencia, `[R]` recomendación. No inventes nada y no afirmes haber ejecutado lo que no ejecutaste.
4. **Ahorra tokens:** busca antes de leer, lee por partes, resume.
