# FARMIX · backend

Backend de **FARMIX**, un **producto mínimo viable (MVP) en estudio** que apoya la gestión de residuos, vencimientos de medicamentos, segregación, personal, capacitaciones, diagnóstico y reportes en droguerías independientes de Sincelejo, Colombia. Los indicadores son **hipótesis por validar**; los datos de demostración son **simulados**.

Node.js 20+, TypeScript estricto, Fastify 5, Zod 4, Drizzle ORM, PostgreSQL 16.

## Inicio rápido

```bash
npm install
cp .env.example .env     # complete DATABASE_URL y APP_ORIGIN
npm run migrate
npm run seed:demo        # datos SIMULADOS; imprime el correo y una contraseña aleatoria (una sola vez)
npm run dev              # http://localhost:3000/api/v1/health
```

Con `EXPOSE_DOCS=true`, la especificación OpenAPI está en `GET /api/v1/openapi.json` (también en `docs/openapi.json`).

## Interfaz web (`frontend/`)

React + Vite + TypeScript. Con el backend en el puerto 3000:

```bash
cd frontend && npm install && npm run dev      # http://localhost:5173 (puerto fijo: el backend valida el Origin)
```

Ver [`docs/06-frontend.md`](docs/06-frontend.md).

## Pruebas

```bash
export TEST_DATABASE_URL=postgres://USUARIO:CLAVE@localhost:5432/NOMBRE_BD_PRUEBAS   # base desechable
npm test     # 358 pruebas; recrea el esquema public de esa base
```

## Documentación (`docs/`)

1. [`01-codigo-fuente.md`](docs/01-codigo-fuente.md): árbol, responsabilidades, ejecución, lo que no está implementado.
2. [`02-base-de-datos.md`](docs/02-base-de-datos.md): migraciones, entidades, [`schema.sql`](docs/schema.sql).
3. [`03-modelo-arquitectonico.md`](docs/03-modelo-arquitectonico.md): capas, recorrido de una petición, decisiones de seguridad.
4. [`04-stack.md`](docs/04-stack.md): versiones y justificación de cambios.
5. [`05-resultado-de-pruebas.md`](docs/05-resultado-de-pruebas.md): resultados y pendientes.
- [`06-frontend.md`](docs/06-frontend.md): interfaz web, pantallas, cómo probarla y límites.
- [`rutas.md`](docs/rutas.md): inventario de las 71 rutas (propuesta; el prototipo no estuvo disponible).
