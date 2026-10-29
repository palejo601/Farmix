#!/usr/bin/env bash
# Corre las pruebas automáticas del backend (Vitest) contra la base DESECHABLE farmix_test.
# ¡Atención! Las pruebas BORRAN y recrean esa base. Nunca apunte TEST_DATABASE_URL a datos reales.
#   bash pruebas.sh                       → todas las pruebas
#   bash pruebas.sh tests/waste.test.ts   → solo un archivo
source "$(dirname "$0")/../../scripts/_comun.sh"
instalar_si_falta "$APP"
cargar_env
export TEST_DATABASE_URL="${TEST_DATABASE_URL:-$URL_TEST}"
[[ "$TEST_DATABASE_URL" == *test* ]] || falla "Por seguridad, TEST_DATABASE_URL debe apuntar a una base cuyo nombre contenga «test»"
paso "Pruebas contra ${TEST_DATABASE_URL##*/}"
cd "$APP" && npx vitest run "$@"
