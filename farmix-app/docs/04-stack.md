# 4. Stack

Versiones exactas instaladas (de `package-lock.json`; probado en Node.js 22.22.0 y PostgreSQL 16.15).

| Tecnología | Versión | Función |
|---|---|---|
| Node.js | ≥ 20 (probado 22.22.0) | Entorno de ejecución |
| TypeScript | 5.9.3 | Lenguaje, modo estricto (`strict`, `noUncheckedIndexedAccess`) |
| Fastify | 5.12.7 | Servidor HTTP |
| fastify-type-provider-zod | 7.0.0 | Validación de entradas y salidas con Zod en las rutas |
| Zod | 4.6.7 | Esquemas de validación y de configuración |
| Drizzle ORM | 0.45.4 | Consultas tipadas |
| pg | 8.23.1 | Controlador PostgreSQL |
| PostgreSQL | 16 | Base de datos |
| @node-rs/argon2 | 2.2.2 | Hash de contraseñas Argon2id |
| @fastify/helmet | 13.2.0 | Cabeceras de seguridad y CSP |
| @fastify/cookie | 11.1.3 | Cookies de sesión |
| @fastify/rate-limit | 11.2.1 | Límite de peticiones |
| Vitest | 5.0.5 | Pruebas |
| tsx | 4.23.15 | Ejecución de TypeScript en desarrollo y scripts |

## Cambios respecto al stack obligatorio (justificación)

El encargo exige justificar por escrito cualquier cambio. Se **agregaron** (no se sustituyó nada):

| Paquete | Versión | Por qué |
|---|---|---|
| @fastify/multipart | 10.1.6 | Necesario para la carga de soportes y de archivos de importación (no hay forma estándar de recibir multipart en Fastify sin él). Límites: 5 MB, 1 archivo. |
| @fastify/cors | 11.3.1 | Si el frontend corre en otro origen (p. ej. servidor de desarrollo), el navegador bloquea las llamadas con cookie sin CORS. Se restringe a `APP_ORIGIN` con credenciales. |
| @fastify/static | 10.1.8 | Sirve el frontend compilado (`STATIC_DIR`) desde el mismo servicio, con una sola URL pública y sin CORS. |
| @fastify/swagger | 9.9.2 | Genera el documento OpenAPI exigido en la Fase 4 a partir de los esquemas Zod. |
| exceljs | 4.4.0 | Lectura de `.xlsx` en la importación. Se descartó `xlsx` (SheetJS) porque su versión en npm no se mantiene y arrastra avisos de seguridad. |
| csv-parse | 7.0.3 | Lectura robusta de `.csv`. |
| uuid (override) | 11.1.1 | Dependencia transitiva de `exceljs`; se fuerza una versión corregida (`overrides` en `package.json`) para resolver el aviso GHSA-w5hq-g745-h8pq. |

Variable de entorno agregada: `AUTH_RATE_LIMIT_MAX` (límite por minuto en rutas de autenticación, por defecto 20).

`drizzle-kit` **no** se usa: las migraciones son SQL numerado escrito a mano (se eliminó la dependencia).

## Análisis de dependencias

`npm audit` → **0 vulnerabilidades** (fecha de la última ejecución: durante la reconstrucción). Debe repetirse antes de cualquier despliegue.
