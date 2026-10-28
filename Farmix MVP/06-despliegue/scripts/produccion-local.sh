#!/usr/bin/env bash
# Simula en su computador cómo corre FARMIX en Render: compila backend y frontend,
# y un solo servidor en http://localhost:3000 entrega la web y la API (la PWA solo funciona en este modo).
# Usa la base local farmix_dev. Deténgalo con Ctrl + C.
source "$(dirname "$0")/../../scripts/_comun.sh"
instalar_si_falta "$APP"
instalar_si_falta "$APP/frontend"
paso "Compilando el frontend" && (cd "$APP/frontend" && npm run --silent build)
paso "Compilando el backend" && (cd "$APP" && npm run --silent build)
# COOKIE_SECURE=true es obligatorio en producción; los navegadores lo aceptan en http://localhost
export DATABASE_URL="${DATABASE_URL:-$URL_DEV}" APP_ORIGIN="http://localhost:3000" NODE_ENV=production \
  STATIC_DIR="$APP/frontend/dist" COOKIE_SECURE=true PORT="${PORT:-3000}"
paso "Migraciones" && (cd "$APP" && node dist/db/migrate-cli.js)
paso "FARMIX en modo producción: http://localhost:$PORT"
cd "$APP" && exec node dist/server.js
