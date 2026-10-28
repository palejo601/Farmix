# 07 · Scripts generales (atajos)

Atajos que combinan los scripts de cada capa. Todos se ejecutan con `bash` desde la carpeta `Farmix MVP`.

| Script | Cuándo usarlo | Qué hace por dentro |
|---|---|---|
| `bash 07-scripts-generales/instalar.sh` | La primera vez, o cuando cambien las librerías | `npm ci` en `farmix-app` y en `farmix-app/frontend` |
| `bash 07-scripts-generales/levantar-todo.sh` | Para trabajar en desarrollo | Enciende backend (3000) y frontend (5173); `Ctrl + C` apaga ambos |
| `bash 07-scripts-generales/verificar-todo.sh` | **Antes de subir cualquier cambio a GitHub** | Revisa tipos → compila el frontend → corre todas las pruebas; se detiene en el primer error |

## Cómo están hechos (para que pueda escribir los suyos)
- Todos empiezan con `source "…/scripts/_comun.sh"`: ahí están las rutas (`APP`, `GUIA`), la configuración de la base local y funciones de ayuda (`paso`, `aviso`, `falla`, `requiere`, `instalar_si_falta`, `cargar_env`).
- `set -euo pipefail` (en `_comun.sh`) hace que el script **se detenga ante el primer error** en lugar de seguir con un resultado engañoso.
- Las variables de la terminal tienen prioridad sobre `farmix-app/.env`. Ejemplo: `FARMIX_DB_DEV=otra_base bash 04-base-de-datos/scripts/migrar.sh` (si su `.env` no define `DATABASE_URL`).

## Requisitos
Node.js 22, PostgreSQL 16 y bash (en Windows: **Git Bash** o **WSL**; en PowerShell no funcionan).
