#!/usr/bin/env bash
# Revisa los tipos de TypeScript del backend sin ejecutarlo (tsc --noEmit).
# Detecta errores como pasar un texto donde se espera un número, antes de que lleguen al usuario.
source "$(dirname "$0")/../../scripts/_comun.sh"
instalar_si_falta "$APP"
paso "Revisando tipos del backend"
cd "$APP" && npm run --silent typecheck && echo "Sin errores de tipos"
