# Cómo reanudar el trabajo en una sesión nueva

Las sesiones en la nube son temporales: al reclamarse el contenedor se pierden las herramientas instaladas a mano, la base local y `node_modules`. **Todo el trabajo está guardado en Git** (rama `modelo-datos`, Pull Request [Farmix#1](https://github.com/palejo601/Farmix/pull/1) hacia `claude/hopeful-maxwell-an8ywk`).

## 1 · Código y entorno (siempre, en este orden)
```bash
cd farmix-app && git fetch origin modelo-datos && git checkout modelo-datos
```
```bash
service postgresql start
```
```bash
bash "Farmix MVP/07-scripts-generales/instalar.sh"
```
```bash
bash "Farmix MVP/04-base-de-datos/scripts/crear-base-local.sh"
```
```bash
bash "Farmix MVP/04-base-de-datos/scripts/migrar.sh"
```
(El primer comando se ejecuta desde la raíz del repositorio, no desde `farmix-app`; ajusta la ruta si ya estás dentro.)
Para comprobar que todo quedó bien: `bash "Farmix MVP/07-scripts-generales/verificar-todo.sh"` (último resultado conocido: 391 de 391 pruebas).
El detalle de cada script está en `07-scripts-generales/README.md`. El archivo `farmix-app/.env` no se sube a Git (lo crea `crear-base-local.sh`).

## 2 · Skills instaladas a mano (se pierden con la sesión)
**Opción recomendada, en tu computador** (con internet abierto):
```bash
npx impeccable install
```
```bash
npx skills@latest add emilkowalski/skills
```
**En una sesión de la nube** (copia manual, sin hooks), desde la carpeta de trabajo:
```bash
GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 https://github.com/pbakaus/impeccable /home/user/pbakaus/impeccable
```
```bash
mkdir -p ~/.claude/skills && cp -r /home/user/pbakaus/impeccable/.claude/skills/impeccable ~/.claude/skills/impeccable
```
```bash
GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 https://github.com/emilkowalski/skill /home/user/emilkowalski/skill
```
```bash
cp -r /home/user/emilkowalski/skill/skills/* ~/.claude/skills/
```
Notas:
- `npx impeccable install` **falló en la nube** porque el proxy bloquea `impeccable.style`; por eso la copia manual.
- La skill `tutor` y las de sesión no están en estos repositorios: viven en `~/.claude/skills/tutor`. Si falta, pide que se recree desde la conversación (se creó para el modo tutor de FARMIX).
- No instalé el hook de Impeccable; se puede añadir con `/impeccable hooks on`.

## 3 · Plugins (se activan desde la tarjeta en la conversación, no por línea de comandos)
| Plugin | Estado conocido | Pendiente |
|---|---|---|
| Playwright (Microsoft) | Activo en la sesión anterior | — |
| Figma | Plugin instalado; el servidor no conectaba por la red | Con la red ya abierta, **abrir sesión nueva** e iniciar sesión en Figma (OAuth) |
| Superpowers (obra) | Tarjeta mostrada | Activar si aún no lo está; puede chocar con el modo tutor y las fichas |

**Red del entorno:** se permitieron `mcp.figma.com`, `api.figma.com` y `figma.com`. `www.figma.com` seguía bloqueado.

## 4 · Dónde quedó el trabajo
| Qué | Dónde |
|---|---|
| Guía por capas | `Farmix MVP/01…09` |
| Modelo de datos y análisis (Etapa 2) | `04-base-de-datos/modelo-datos` y `04-base-de-datos/analisis` |
| Hallazgos (49) y plan de mejora | `analisis/hallazgos-consolidados.md`, `08-trabajo-de-grado/etapa-5-plan-de-mejora.md` |
| Matriz de trazabilidad y académica | `08-trabajo-de-grado/etapa-3…`, `etapa-4…` |
| Casos de prueba, capturas, flujos y wireframes | `05-pruebas/matriz-casos-de-prueba.md`, `08-trabajo-de-grado/capturas`, `flujos-y-capturas.md`, `wireframes` |
| Preguntas para el director (19) | `08-trabajo-de-grado/preguntas-para-el-director.md` |
| Propuesta de registro de droguería (sin aplicar) | `Farmix MVP/propuestas/registro-drogueria` |

## 5 · Reglas vigentes (no cambian entre sesiones)
- **No modificar el código de `farmix-app` hasta acordar el diagnóstico y el plan.** Los cambios de interfaz van en una rama aparte, no en `modelo-datos`.
- **Nunca tocar la base de producción de Render:** solo bases locales (`farmix_dev`, `farmix_test`).
- Los cambios de estructura van en **migraciones nuevas** (`0014…`), con respaldo previo; jamás se edita una migración ya aplicada.
- No agregar restricciones nuevas sin revisar los datos existentes.
- Distinguir hecho, inferencia y recomendación; no afirmar que algo se probó si no se probó.
- Alcance: **droguerías y farmacias independientes**; sin cadenas y sin la Clínica Las Peñitas.

## 6 · Pendiente (a 2026-10-29)
**De ti:** llevar la hoja de preguntas al director; ver `MAIL_MODE` en Render; probar `farmix-drawdb.sql` en drawDB; conseguir la rúbrica y el documento actualizado; revisar capturas, wireframes y matriz de pruebas; confirmar por escrito el alcance.
**Del director:** las 19 preguntas (alcance, datos reales, historial por trabajador, registro del establecimiento).
**Mío, cuando se acuerde:** paquetes PM-1 a PM-6 del plan, el registro de droguería y el arreglo de la interfaz (4 hallazgos P2 de la auditoría de Impeccable).
**Decisión tuya:** si `pwa-instalable` (la PWA) también se une a la rama de Render.
