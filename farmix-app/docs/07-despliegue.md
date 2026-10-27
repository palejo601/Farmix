# 7. Despliegue (una sola URL)

El backend sirve la interfaz compilada (`STATIC_DIR`), así que **un solo servicio** expone la web y la API bajo el mismo origen: sin CORS y con la cookie de sesión `httpOnly`/`Secure`.

> FARMIX es un **producto mínimo viable en estudio**. Una instancia pública queda abierta a internet y cualquiera puede registrarse: úsela únicamente con **datos simulados**, sin datos reales de personas ni de droguerías.

## Opción A: Render (con PostgreSQL gestionado)

1. Cree una cuenta en <https://render.com> y conéctela a GitHub.
2. **New → Blueprint**, elija el repositorio `palejo601/Farmix` y la rama `claude/hopeful-maxwell-an8ywk`, y confirme. El `render.yaml` de la raíz del repositorio ya apunta a la carpeta `farmix-app/`. (Atajo: `https://render.com/deploy?repo=https://github.com/palejo601/Farmix/tree/claude/hopeful-maxwell-an8ywk`; no se probó.)
3. Render crea la base `farmix-db` y el servicio `farmix` a partir de `render.yaml`, construye la imagen y arranca.
4. La URL pública aparece en el panel (`https://farmix-XXXX.onrender.com`). `APP_ORIGIN` se toma solo de `RENDER_EXTERNAL_URL`.
5. Cuenta de demostración (datos **simulados**): correo `demo@ejemplo.test`; la contraseña la genera Render: panel del servicio → *Environment* → `DEMO_PASSWORD`. Para no crear la demostración, ponga `SEED_DEMO` en `false`.

Limitaciones del plan gratuito de Render: el servicio se duerme tras inactividad (la primera visita tarda), la base gratuita caduca a los 30 días y **los soportes subidos se pierden en cada despliegue** (`STORAGE_DIR=/tmp/...`). Para uso sostenido use planes de pago y un disco persistente montado en `STORAGE_DIR`.

## Opción B: cualquier servidor con Docker

```bash
docker build -t farmix .
docker run -p 3000:3000 \
  -e DATABASE_URL='postgres://USUARIO:CLAVE@HOST:5432/BD' \
  -e APP_ORIGIN='https://su-dominio' \
  -e COOKIE_SECURE=true -e TRUST_PROXY=true \
  -e STORAGE_DIR=/data/storage -v farmix-storage:/data/storage farmix
```

Debe ir detrás de HTTPS (proxy inverso: Caddy, nginx). Con `COOKIE_SECURE=true` la cookie solo viaja por HTTPS. El contenedor aplica las migraciones al arrancar (y se detiene si una ya aplicada fue alterada). Para sembrar la demostración añada `-e SEED_DEMO=true -e DEMO_PASSWORD=...`.

## Variables relevantes

| Variable | Valor en producción |
|---|---|
| `NODE_ENV` | `production` (exige `COOKIE_SECURE=true`) |
| `DATABASE_URL`, `APP_ORIGIN` | obligatorias (`APP_ORIGIN` puede venir de `RENDER_EXTERNAL_URL`) |
| `STATIC_DIR` | `/app/public` (la imagen ya lo define) |
| `TRUST_PROXY` | `true` detrás de un proxy de confianza (limitador por IP real) |
| `EXPOSE_DOCS` | `false` salvo que quiera publicar `/api/v1/openapi.json` |
| `SEED_DEMO`, `DEMO_PASSWORD` | demostración opcional con datos simulados |
| `MAIL_MODE` | `dev`: el envío real de correo **no** está implementado; la recuperación de contraseña no funciona de extremo a extremo en producción |

## Verificado y no verificado

- Verificado: compilación de producción, arranque con `docker-entrypoint.sh` (migraciones, siembra, servidor) sobre una base nueva, frontend servido desde el mismo puerto, recorrido E2E de 18 pasos y pruebas automáticas (`tests/static.test.ts`).
- **No verificado**: la construcción de la imagen Docker ni el despliegue en Render (no había demonio de Docker ni cuenta de Render en el entorno de desarrollo). Si el primer despliegue falla, revise primero los registros de construcción.
