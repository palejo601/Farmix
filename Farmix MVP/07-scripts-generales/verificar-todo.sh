#!/usr/bin/env bash
# Revisión completa antes de subir un cambio a GitHub:
#   1) tipos del backend  2) compilación del frontend  3) todas las pruebas automáticas.
# Si algo falla, se detiene y muestra dónde.
source "$(dirname "$0")/../scripts/_comun.sh"
bash "$GUIA/03-backend/scripts/revisar-tipos.sh"
bash "$GUIA/02-frontend/scripts/compilar.sh"
bash "$GUIA/05-pruebas/scripts/pruebas.sh"
paso "Todo en verde: puede subir el cambio"
