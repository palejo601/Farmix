#!/usr/bin/env bash
# Prueba de extremo a extremo con un navegador real (Playwright): recorre la interfaz como lo haría una persona.
# Antes: backend y frontend encendidos (07-scripts-generales/levantar-todo.sh) y datos de demostración cargados.
#   DEMO_PASSWORD='la que imprimió datos-demo.sh' bash prueba-navegador.sh
# Crea datos de ejemplo en la droguería de demostración: úsela solo con la base local.
source "$(dirname "$0")/../../scripts/_comun.sh"
[ -n "${DEMO_PASSWORD:-}" ] || falla "Defina DEMO_PASSWORD con la contraseña que imprimió datos-demo.sh"
export SHOTS="${SHOTS:-$(mktemp -d)}"
paso "Recorrido en el navegador (capturas en $SHOTS)"
cd "$APP" && node frontend/e2e/ui-smoke.cjs
