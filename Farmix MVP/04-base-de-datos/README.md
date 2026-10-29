# 04 · Base de datos

## Qué es
La **base de datos** guarda la información de forma permanente y ordenada: es el kárdex de FARMIX.
FARMIX usa **PostgreSQL 16**, una base **relacional**: los datos viven en **tablas** (filas y columnas) unidas por **claves**.

| Concepto | En palabras simples | Ejemplo en FARMIX |
|---|---|---|
| Tabla | Una hoja con columnas fijas | `waste_records` |
| Clave primaria (PK) | El número único de cada fila | `waste_records.id` (UUID) |
| Clave foránea (FK) | Una columna que apunta a otra tabla | `waste_records.drugstore_id → drugstores.id` |
| FK compuesta | Apunta con dos columnas a la vez | `trainings (drugstore_id, worker_id) → workers (drugstore_id, id)`: el trabajador debe ser de la misma droguería |
| `CHECK` | Regla que la base aplica sola | `quantity > 0`; un medicamento vencido no es riesgo biológico |
| Índice único parcial | Unicidad con condición | un solo propietario **activo** por droguería |
| Borrado lógico | «Eliminar» marcando una fecha, sin borrar | columna `deleted_at` en 12 tablas |
| Migración | Cambio de estructura numerado y en orden | `src/db/migrations/0001…0013` |

## En cifras (verificado en el catálogo de PostgreSQL)
**23 tablas · 234 columnas · 51 claves foráneas** (30 de ellas son de auditoría: `created_by` y `updated_by`) · **77 `CHECK` · 61 índices** · sin triggers.

## Dónde está
| Ubicación | Contenido |
|---|---|
| `farmix-app/src/db/migrations/` | Las 13 migraciones: **la fuente de verdad** de la estructura |
| `farmix-app/docs/schema.sql` | Volcado del esquema con `pg_dump` (referencia; no sirve para drawDB) |
| `farmix-app/src/db/schema.ts` | La misma estructura descrita en TypeScript para Drizzle |
| [`modelo-datos/`](modelo-datos) | **Los modelos**: estructural, lógico (Mermaid, SVG y PNG), físico, diccionario de datos (Excel), relaciones y SQL para drawDB |

Empiece por [`modelo-datos/modelo-estructural.md`](modelo-datos/modelo-estructural.md) (las 6 áreas) y luego mire `modelo-datos/areas/A3.png` (vencimientos, residuos y segregación: las funciones esenciales).
Cómo abrir cada archivo en Mermaid Live, drawDB, pgAdmin o DBeaver: [`modelo-datos/README.md`](modelo-datos/README.md).

## Scripts (en orden, la primera vez)
| Script | Qué hace |
|---|---|
| `bash scripts/crear-base-local.sh` | Crea el usuario `farmix` y las bases `farmix_dev` y `farmix_test` en su computador, y el archivo `farmix-app/.env` si no existe |
| `bash scripts/migrar.sh` | Aplica las migraciones pendientes a `farmix_dev` |
| `bash scripts/datos-demo.sh` | Crea una droguería de demostración con datos **simulados** e imprime la contraseña una sola vez |
| `bash scripts/generar-modelos.sh` | Regenera la documentación de `modelo-datos/` desde la base (úselo después de cada migración nueva) |

`crear-base-local.sh` se conecta como administrador de PostgreSQL con `PG_ADMIN_URL` (por defecto `postgres://postgres@localhost:5432/postgres`; si su usuario `postgres` tiene contraseña, `psql` se la pedirá).

## Autoevaluación
1. ¿Qué pasa en la base si alguien intenta registrar una capacitación con un trabajador de otra droguería?
2. ¿Por qué `drugstore_members` existe como tabla aparte y no como una columna `drugstore_id` en `users`?
3. Si agrega una columna, ¿por qué debe crear la migración `0014_…sql` en lugar de editar la `0005`?
