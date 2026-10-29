---
name: reverse-engineer-anything
description: Reconstruye cómo funciona un sistema a partir de lo que se puede observar: un repositorio, un paquete o binario distribuido, una app web o Electron, una API, un archivo o un esquema de base de datos. Úsalo cuando el usuario pida hacer ingeniería inversa, "entender cómo funciona esto", recuperar la arquitectura o el modelo de datos, o documentar algo sin documentación. Para revisar código fuente ordinario basta con las herramientas normales.
---

# Reverse engineer anything

Objetivo: pasar de "no sé cómo funciona" a un documento verificable, separando lo observado de lo supuesto.

## Reglas
1. **Autorización primero.** Pregunta si el objetivo es del usuario o si tiene permiso para analizarlo. No ayudes a evadir licencias, DRM, protecciones de terceros, ni a extraer credenciales o secretos. Si aparece uno, repórtalo sin copiarlo.
2. **Solo lectura.** No modifiques, no ejecutes código no confiable fuera de un directorio aislado (scratchpad) y no toques sistemas en producción.
3. **Etiqueta cada afirmación:** `[H]` hecho (con evidencia: archivo:línea, salida de comando), `[I]` inferencia, `[R]` recomendación. No inventes tablas, rutas, funciones ni resultados.
4. **No afirmes que ejecutaste algo si no lo hiciste.**
5. **Ahorra tokens:** lee por partes, busca antes de leer, resume en vez de volcar archivos.

## Flujo
1. **Alcance:** qué es el objetivo, qué pregunta hay que responder y qué nivel de detalle se necesita.
2. **Inventario:** estructura de archivos, lenguajes, dependencias, puntos de entrada, configuración, scripts de build y despliegue.
3. **Superficie externa:** rutas/endpoints, CLI, eventos, esquemas de entrada y salida, variables de entorno.
4. **Núcleo:** sigue 2 o 3 flujos reales de extremo a extremo (entrada → lógica → datos → salida). No intentes leerlo todo.
5. **Datos:** modelo de datos, migraciones, relaciones, restricciones y dónde se escribe cada tabla o archivo.
6. **Artefactos sin fuente** (binarios, bundles, paquetes): metadatos y manifiestos primero; cadenas, imports y estructura después; descompilar o desempacar solo si hace falta, con herramientas locales y en un directorio aislado.
7. **Verificación:** contrasta las hipótesis con pruebas, ejecución controlada o una segunda lectura. Marca lo que quedó sin verificar.

## Entregable (en español)
- Resumen en 5 líneas.
- Arquitectura: componentes y cómo se conectan (diagrama simple en texto o Mermaid).
- Flujos clave paso a paso.
- Modelo de datos o formatos.
- Dependencias y riesgos (seguridad, deuda, partes frágiles).
- Preguntas abiertas y lo que no se pudo verificar.
- Tabla final de hallazgos: ID, `[H]/[I]/[R]`, evidencia, prioridad.
