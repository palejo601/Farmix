#!/usr/bin/env bash
# Configuración compartida por todos los scripts de «Farmix MVP».
# No se ejecuta solo: los demás scripts lo cargan con `source`.
#
# Define:
#   RAIZ  → carpeta raíz del repositorio
#   APP   → farmix-app (el código real: backend + frontend)
#   GUIA  → «Farmix MVP» (esta guía)
# y valores por defecto para una base de datos LOCAL de desarrollo.
# Ningún script de esta guía toca la base de datos de producción.

set -euo pipefail

GUIA="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RAIZ="$(cd "$GUIA/.." && pwd)"
APP="$RAIZ/farmix-app"

# Base de datos local (solo para su computador; cámbielos con variables de entorno si quiere)
FARMIX_DB_USER="${FARMIX_DB_USER:-farmix}"
FARMIX_DB_PASS="${FARMIX_DB_PASS:-farmix}"
FARMIX_DB_HOST="${FARMIX_DB_HOST:-localhost}"
FARMIX_DB_PORT="${FARMIX_DB_PORT:-5432}"
FARMIX_DB_DEV="${FARMIX_DB_DEV:-farmix_dev}"     # base para usar la aplicación
FARMIX_DB_TEST="${FARMIX_DB_TEST:-farmix_test}"  # base DESECHABLE: las pruebas la borran y la recrean
URL_DEV="postgres://$FARMIX_DB_USER:$FARMIX_DB_PASS@$FARMIX_DB_HOST:$FARMIX_DB_PORT/$FARMIX_DB_DEV"
URL_TEST="postgres://$FARMIX_DB_USER:$FARMIX_DB_PASS@$FARMIX_DB_HOST:$FARMIX_DB_PORT/$FARMIX_DB_TEST"

paso() { printf '\n\033[1;32m▶ %s\033[0m\n' "$*"; }
aviso() { printf '\033[1;33m⚠ %s\033[0m\n' "$*"; }
falla() { printf '\033[1;31m✖ %s\033[0m\n' "$*" >&2; exit 1; }

requiere() {
  command -v "$1" >/dev/null 2>&1 || falla "Falta «$1». $2"
}

# El backend NO lee farmix-app/.env por sí mismo: estos scripts lo cargan.
# Una variable ya definida en la terminal tiene prioridad sobre la del archivo.
cargar_env() {
  [ -f "$APP/.env" ] || return 0
  local linea clave valor
  while IFS= read -r linea || [ -n "$linea" ]; do
    [[ "$linea" =~ ^[A-Z_][A-Z0-9_]*= ]] || continue
    clave="${linea%%=*}"; valor="${linea#*=}"
    [ -n "${!clave:-}" ] || export "$clave=$valor"
  done < "$APP/.env"
}

# Exporta las variables que el backend necesita para trabajar con la base local
entorno_local() {
  cargar_env
  export DATABASE_URL="${DATABASE_URL:-$URL_DEV}"
  export APP_ORIGIN="${APP_ORIGIN:-http://localhost:5173}"
  export NODE_ENV="${NODE_ENV:-development}"
}

# Instala dependencias de una carpeta solo si aún no están
instalar_si_falta() {
  if [ ! -d "$1/node_modules" ]; then
    paso "Instalando librerías en ${1#$RAIZ/} (solo la primera vez)"
    (cd "$1" && npm ci --no-audit --no-fund)
  fi
}
