# Etapa 2 · Área A6 — Carga de datos y control de migraciones

Tablas: `imports`, `local_migrations`, `schema_migrations`.
Fuente: catálogo (`../modelo-datos/modelo-fisico.md`), `farmix-app/src/modules/{imports,local-migrations}/service.ts|schema.ts` y `src/db/migrate.ts`.
Convención: **[H]** hecho confirmado · **[I]** inferencia · **[R]** recomendación (no aplicada).

## 4.5 · Explicación por tabla

Dos tablas sirven para **meter datos** (`imports`, `local_migrations`) y una para **versionar la estructura** (`schema_migrations`). Aunque las tres están en la misma área, no se relacionan entre sí.

### `imports` — «la vista previa antes de cargar un Excel o CSV»
Una fila = una carga de archivo en dos fases: primero **vista previa** (no inserta nada) y luego **confirmada**.
- `kind`: qué se carga: `expirations`, `waste` o `segregation` (CHECK). **No se pueden importar trabajadores, capacitaciones ni diagnósticos.** [H]
- Contadores `total_rows`, `valid_rows`, `invalid_rows`, `duplicate_rows` (≥ 0) y `row_results` (`jsonb`) con el resultado fila por fila. [H]
- `phase` (`vista_previa`/`confirmada`) y `confirmed_at`: el CHECK `confirmed_ck` los obliga a ir de la mano. [H]
- `expires_at`: la vista previa caduca a las **24 horas** (`now() + interval '24 hours'`). Confirmar una caducada se rechaza con 409. [H]
- Al confirmar, el código **vuelve a analizar** las filas válidas dentro de una transacción antes de insertar. Archivo máximo: **2 MB**. [H]
- `inserted_count`: cuántas filas se crearon realmente.

### `local_migrations` — «la mudanza desde los datos locales»
Una fila = un lote de datos que alguien migra hacia una droguería (por ejemplo, desde el navegador del prototipo). Tres fases: `pendiente` → `confirmada` → `revertida`.
- `payload` (`jsonb`): los datos recibidos. `summary`: conteos por tipo. `inserted_ids`: **ids de las filas que creó**, para poder deshacer. [H]
- `content_hash`: SHA-256 del contenido (CHECK de 64 hex). El índice único `(user_id, content_hash, is_demo) WHERE phase <> 'revertida'` **impide cargar dos veces el mismo contenido** salvo que se haya revertido. [H]
- `phase_ck`: cada fase exige una combinación exacta de `confirmed_at` y `reverted_at`. [H]
- Revertir **archiva** (borrado lógico) solo las filas listadas en `inserted_ids`; no borra físicamente. [H]
- Acepta únicamente tres tipos de datos: `expirations`, `waste`, `segregation`, y **máximo 1000 filas** de cada uno. El esquema es `strict`: cualquier otra clave se rechaza. [H]

### `schema_migrations` — «el libro de versiones de la estructura»
Una fila = una migración SQL ya aplicada. `filename` (clave primaria), `checksum` (SHA-256 del archivo) y `applied_at`.
- Al migrar, el programa compara el checksum: si una migración **ya aplicada fue modificada**, se detiene con error. [H]
- Usa un candado de PostgreSQL (`pg_advisory_lock`) para que dos procesos no migren a la vez, y cada migración corre en transacción (`BEGIN`). [H]
- Responde la pregunta de comprobación de la guía: por eso se crea `0014_…sql` y no se edita la `0005`.

## 4.6 · Integridad y calidad (diagnóstico, sin cambios aplicados)

### Lo que está bien [H]
1. Dos fases con CHECK de coherencia (`confirmed_ck`, `phase_ck`): el estado no puede contradecir las fechas.
2. Protección contra doble carga (hash único) y **reversibilidad** guardando los ids creados.
3. La vista previa no toca los datos reales y vuelve a validar al confirmar.
4. Detección de migraciones alteradas y candado de concurrencia en `schema_migrations`.
5. Los datos cargados se validan con los mismos controles que el resto del sistema (`kind.insert`).

### Hallazgos
| # | Hallazgo | Tipo | Prioridad sugerida |
|---|---|---|---|
| 1 | **El respaldo del prototipo v1 no se puede cargar** con `local_migrations`: v1 maneja vencimientos, residuos, personal, capacitaciones, diagnósticos y acciones, y v2 solo acepta `expirations`, `waste`, `segregation`. Los formatos de nombres también difieren (hipótesis de A1 confirmada en parte por el esquema `strict`; no probé un archivo real del prototipo) | [H] esquema estricto; [I] incompatibilidad completa | P2: decidir si v1 debe migrarse o si basta con demostrarlo |
| 2 | **No hay limpieza de `imports` ni de `local_migrations`.** `row_results` y `payload` (jsonb) guardan el contenido de los archivos cargados, también en vistas previas **caducadas** o nunca confirmadas. El texto de la tabla promete 24 horas, pero eso solo bloquea la confirmación: el dato sigue almacenado | [H] sin purga visible; [I] retención indefinida | **P2**: definir retención (puede haber datos personales si el archivo los trae) |
| 3 | `local_migrations.user_id` y `drugstore_id` son FK con `CASCADE`: al borrar la cuenta se borra el historial de migraciones, pero los datos migrados quedan (están en otras tablas) y su registro de reversión desaparece | [H] | P3 |
| 4 | `imports.kind` y los tipos de `local_migrations` repiten la misma lista de tres tipos en dos lugares (CHECK y código). Agregar un tipo exige tocar ambos | [H] | P3 |
| 5 | `inserted_ids` (`jsonb`) no es verificable por la base: no hay FK a las filas creadas, así que revertir depende de que los ids sigan existiendo. Un id inexistente no produce error visible según el código leído | [H] jsonb; [I] efecto | P3 |
| 6 | `imports` no tiene columna de autor propia visible en este análisis más que la auditoría (`created_by`); `local_migrations` sí tiene `user_id` obligatorio. Dos criterios distintos para el mismo concepto («quién cargó») | [H] | P3 |
| 7 | `schema_migrations` no guarda quién ni desde dónde migró; basta para integridad | [H] | Sin acción |

### Normalización (resumen) [I]
`imports` y `local_migrations` son **bitácoras de operación** con `jsonb`: no buscan normalizar sino conservar el lote tal como llegó. Es válido para este propósito y no afecta a las tablas del modelo relacional.

## Qué NO se hizo
- No se subieron archivos ni se probó la reversión; no se leyó el respaldo real del prototipo.
- Ningún cambio de código ni de base.
- Los hallazgos son para **acordar** antes de cualquier cambio.

## Autoevaluación
1. ¿Por qué la vista previa y la confirmación son dos pasos y no uno?
2. ¿Qué pasa si subes dos veces el mismo contenido a `local_migrations`? ¿Y si lo revertiste antes?
3. ¿Qué datos del prototipo v1 se quedarían sin poder migrar y por qué?
