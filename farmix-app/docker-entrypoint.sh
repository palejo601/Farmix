#!/bin/sh
# Aplica las migraciones (se detiene si una ya aplicada cambió) y arranca el servidor.
set -e
node dist/db/migrate-cli.js
# Demostración opcional: solo con SEED_DEMO=true; si la cuenta ya existe no hace nada. Los datos son SIMULADOS.
if [ "$SEED_DEMO" = "true" ]; then
  node dist/scripts/seed-demo.js || echo "Aviso: no se pudo sembrar la demostración (se continúa)"
fi
exec node dist/server.js
