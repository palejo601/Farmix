#!/usr/bin/env bash
# Enciende backend (puerto 3000) y frontend (puerto 5173) a la vez, para trabajar en desarrollo.
# Abra http://localhost:5173. Con Ctrl + C se apagan los dos.
source "$(dirname "$0")/../scripts/_comun.sh"
# kill 0 apaga todo el grupo de procesos de este script (backend, frontend y sus procesos hijos)
# (primero se quita la trampa: kill 0 también avisa a este script y, si no, se volvería a llamar sin fin)
trap 'trap - EXIT INT TERM; kill 0 2>/dev/null' EXIT INT TERM
bash "$GUIA/03-backend/scripts/iniciar.sh" &
bash "$GUIA/02-frontend/scripts/iniciar.sh" &
# wait (a diferencia de un proceso en primer plano) deja que Ctrl + C se atienda de inmediato
wait
