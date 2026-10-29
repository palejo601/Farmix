#!/usr/bin/env bash
# Aplica las migraciones (farmix-app/src/db/migrations/0001…0013) a la base local farmix_dev.
# Una migración es un cambio de estructura numerado: se aplican en orden y cada una solo una vez
# (la tabla schema_migrations recuerda cuáles ya se aplicaron y detecta si alguien las modificó).
source "$(dirname "$0")/../../scripts/_comun.sh"
instalar_si_falta "$APP"
entorno_local
paso "Aplicando migraciones en ${DATABASE_URL##*/}"
cd "$APP" && npm run --silent migrate
