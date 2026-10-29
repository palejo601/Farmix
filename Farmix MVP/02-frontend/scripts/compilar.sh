#!/usr/bin/env bash
# Compila la interfaz para producción en farmix-app/frontend/dist:
# revisa los tipos y empaqueta todo en unos pocos archivos optimizados (los que sirve el backend en Render).
source "$(dirname "$0")/../../scripts/_comun.sh"
instalar_si_falta "$APP/frontend"
paso "Compilando el frontend"
cd "$APP/frontend" && npm run --silent build
