#!/usr/bin/env bash
# Enciende el backend (la API) en modo desarrollo: http://localhost:3000/api/v1/health
# «watch»: si cambia un archivo de src/, se reinicia solo. Deténgalo con Ctrl + C.
# Requiere la base local creada y migrada (ver 04-base-de-datos/scripts).
source "$(dirname "$0")/../../scripts/_comun.sh"
instalar_si_falta "$APP"
entorno_local
paso "Backend en http://localhost:3000 (base: ${DATABASE_URL##*/}, frontend permitido: $APP_ORIGIN)"
cd "$APP" && exec npm run --silent dev
