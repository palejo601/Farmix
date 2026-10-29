#!/usr/bin/env bash
# Primera vez: instala las librerías del backend y del frontend (carpetas node_modules).
source "$(dirname "$0")/../scripts/_comun.sh"
requiere node "Instale Node.js 22 LTS: https://nodejs.org/"
requiere npm "Viene con Node.js."
paso "Node $(node -v), npm $(npm -v)"
paso "Backend" && (cd "$APP" && npm ci --no-audit --no-fund)
paso "Frontend" && (cd "$APP/frontend" && npm ci --no-audit --no-fund)
paso "Listo. Siguiente: bash ../04-base-de-datos/scripts/crear-base-local.sh"
