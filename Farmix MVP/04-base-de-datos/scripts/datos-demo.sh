#!/usr/bin/env bash
# Carga una droguería de demostración con datos SIMULADOS en la base local.
# Imprime el correo y una contraseña aleatoria UNA sola vez: guárdela.
source "$(dirname "$0")/../../scripts/_comun.sh"
instalar_si_falta "$APP"
entorno_local
paso "Cargando datos de demostración en ${DATABASE_URL##*/}"
cd "$APP" && npm run --silent seed:demo
