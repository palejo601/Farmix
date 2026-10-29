---
name: re-api
description: "Reconstruye el contrato de una API (rutas, métodos, parámetros, respuestas, autenticación, errores) a partir de su código, su documentación parcial o tráfico que el usuario esté autorizado a capturar. Úsalo para documentar o generar un OpenAPI de una API existente."
---

# API

## Flujo
1. **Fuente del contrato:** código del servidor, colección Postman/HAR, OpenAPI incompleto o llamadas del cliente.
2. **Inventario de rutas:** método, ruta, parámetros, cuerpo, respuestas, códigos de error.
3. **Autenticación y autorización:** cómo se obtiene el token, qué rol accede a qué, cabeceras y cookies.
4. **Reglas de negocio visibles:** validaciones, límites, idempotencia, paginación.
5. **Salida:** tabla de rutas y, si se pide, un OpenAPI. Marca como `[I]` lo que no se pudo confirmar con una llamada real.
6. Haz llamadas reales solo contra entornos locales o de prueba, nunca producción, y con datos simulados.

## Reglas comunes
1. **Autorización:** confirma que el objetivo es del usuario o que tiene permiso. No ayudes a evadir licencias, DRM o protecciones, ni a extraer credenciales; si aparece un secreto, repórtalo sin copiarlo.
2. **Solo lectura:** no modifiques el objetivo; ejecuta código no confiable solo en un directorio aislado y nunca contra producción.
3. **Etiqueta:** `[H]` hecho (con evidencia: archivo:línea o salida), `[I]` inferencia, `[R]` recomendación. No inventes nada y no afirmes haber ejecutado lo que no ejecutaste.
4. **Ahorra tokens:** busca antes de leer, lee por partes, resume.
