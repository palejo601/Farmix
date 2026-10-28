#!/usr/bin/env bash
# Enciende la interfaz en modo desarrollo: http://localhost:5173
# Vite redirige las llamadas /api al backend del puerto 3000 (enciéndalo antes con 03-backend/scripts/iniciar.sh).
# Los cambios en frontend/src se ven al instante en el navegador. Deténgalo con Ctrl + C.
source "$(dirname "$0")/../../scripts/_comun.sh"
instalar_si_falta "$APP/frontend"
paso "Frontend en http://localhost:5173"
cd "$APP/frontend" && exec npm run --silent dev
