# 1. Código fuente del backend

FARMIX es un **producto mínimo viable (MVP) en estudio**. Este documento describe el árbol de carpetas, la responsabilidad de cada archivo y cómo ejecutarlo.

## Cómo ejecutarlo

Requisitos: Node.js 20 o superior (probado con 22) y PostgreSQL 16.

```bash
npm install
cp .env.example .env          # complete DATABASE_URL y APP_ORIGIN (obligatorias)
npm run migrate               # aplica las migraciones SQL numeradas
npm run seed:demo             # opcional: datos de demostración SIMULADOS (imprime una clave aleatoria)
npm run dev                   # servidor con recarga en http://localhost:3000
npm test                      # 358 pruebas (requiere PostgreSQL, ver docs/05)
npm run openapi               # regenera docs/openapi.json
npm run build && npm start    # compilar y ejecutar en producción
```

Base de datos de pruebas: defina `TEST_DATABASE_URL` (por ejemplo `postgres://USUARIO:CLAVE@localhost:5432/farmix_test`); las pruebas **borran y recrean el esquema `public`** de esa base. Nunca la apunte a una base con datos. Sin esa variable las pruebas se niegan a ejecutarse.

El servidor **no arranca** si falta una variable obligatoria (`DATABASE_URL`, `APP_ORIGIN`) o si una es inválida; en producción exige `COOKIE_SECURE=true`.

## Estructura

```
src/
  server.ts                 Arranque: valida config, abre el pool, programa la depuración horaria de cuentas, cierre ordenado.
  app.ts                    Construye Fastify: tabla de rutas, helmet (CSP restrictiva), CORS (solo APP_ORIGIN), cookies,
                            multipart, rate-limit, OpenAPI y registra los módulos bajo /api/v1.
  config/env.ts             Variables de entorno validadas con Zod (ConfigError si fallan).
  db/
    client.ts               Pool de pg + Drizzle.
    migrate.ts              Ejecutor de migraciones: orden, transacción por archivo, bloqueo, hash anti-alteración.
    migrate-cli.ts          Comando `npm run migrate`.
    schema.ts               Tablas Drizzle (reflejan las migraciones; la fuente de verdad son los .sql).
    migrations/0001..0012   Migraciones SQL numeradas (nunca se editan una vez aplicadas).
  shared/
    errors.ts, error-handler.ts   Formato único de error, sin detalles internos.
    request-id.ts           X-Request-Id en cada respuesta.
    audit.ts                Registro de auditoría (usuario, acción, recurso, fecha, resultado).
    password.ts             Argon2id (@node-rs/argon2).
    crud.ts                 Utilidades comunes (404/400/409, "hoy" en America/Bogota, unicidad).
  modules/<módulo>/
    routes.ts               Rutas y esquemas Zod de entrada/salida.
    service.ts              Reglas de negocio y acceso a datos.
    schema.ts               Esquemas Zod (entradas, salidas, DTO).
  modules/auth/plugin.ts    requireAuth, cookie de sesión, defensa por Origin.
  modules/auth/sessions.ts  Crear/resolver/revocar sesiones (solo se guarda el hash del token).
  modules/drugstores/guard.ts  guard(rolMínimo): sesión + membresía (aislamiento por droguería).
  modules/imports/kinds.ts  Tipos importables (vencimientos, residuos, segregación): validación, duplicados, inserción, reversión.
  modules/imports/parse.ts  Lectura de .xlsx y .csv.
  scripts/seed-demo.ts      Datos de demostración simulados.
  scripts/export-openapi.ts Exporta docs/openapi.json.
tests/                      20 archivos de prueba (ver docs/05).
docs/                       Esta documentación, schema.sql, openapi.json, rutas.md.
```

Módulos: `health`, `auth`, `users`, `personal-data`, `drugstores`, `expirations`, `waste`, `segregation`, `staff`, `actions`, `diagnoses`, `files`, `imports`, `reports`, `local-migrations`.

## Reglas de lenguaje y datos

- Los mensajes y la documentación nunca llaman a FARMIX "aplicación instalable" ni "producto terminado".
- Los indicadores (pérdidas, porcentajes, puntajes) son **descriptivos**; los reportes incluyen el aviso "hipótesis por validar".
- Los datos de demostración llevan el rótulo "simulado". No se inventaron registros sanitarios, lotes ni datos reales.

## Qué NO está implementado (honestidad)

- `MAIL_MODE=smtp`: se valida la variable pero no hay envío real; con `MAIL_MODE=dev` los correos quedan en la tabla `dev_mailbox`.
- `STATIC_DIR`: se valida pero el backend **no** sirve archivos estáticos; el frontend debe servirse aparte o detrás de un proxy.
- No hay limpieza programada de sesiones vencidas ni de vistas previas caducadas (las filas permanecen, aunque no son utilizables).
- No existe traspaso de propiedad de una droguería, ni gestión de versiones del instrumento por la API.
