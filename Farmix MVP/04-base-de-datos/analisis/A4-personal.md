# Etapa 2 · Área A4 — Personal y capacitación

Tablas: `workers`, `training_topics`, `trainings`, `support_files`.
Fuente: catálogo (`../modelo-datos/modelo-fisico.md`), `farmix-app/src/modules/{staff,files}/service.ts`, `render.yaml` y `docs/07-despliegue.md`.
Convención: **[H]** hecho confirmado · **[I]** inferencia · **[R]** recomendación (no aplicada).

## 4.5 · Explicación por tabla

### `workers` — «la lista del personal»
Una fila = un trabajador de la droguería (no es un usuario del sistema). 10 columnas, 3 CHECK.
- `worker_code` (1–30) y `full_name` (2–120), `job_title` opcional.
- Único activo por (droguería, `lower(worker_code)`): no se repite el código. [H]
- `UNIQUE (drugstore_id, id)`: permite que otras tablas lo referencien con FK compuesta. [H]
- **No está unido a `users`**: un trabajador puede existir sin cuenta. [H]

### `training_topics` — «el catálogo de temas»
Una fila = un tema de capacitación propio de cada droguería (p. ej. manejo de residuos).
- `topic_name` único activo por droguería sin distinguir mayúsculas; `validity_months` (1–60, por defecto 12); `description` opcional (≤ 300). [H]
- Cada droguería tiene su **propio** catálogo: no hay temas globales compartidos. [H: `drugstore_id` obligatorio]

### `trainings` — «quién recibió qué capacitación»
Una fila = un trabajador capacitado en un tema. Es la tabla puente entre `workers` y `training_topics`, con datos propios (fechas y soporte). 12 columnas.
- FK **compuestas** `(drugstore_id, worker_id)` y `(drugstore_id, topic_id)`: el trabajador y el tema **deben ser de la misma droguería** que la capacitación. [H]
- `trainings_dates_ck`: las dos fechas van juntas o ambas vacías, y `valid_until >= trained_on`. [H]
- Único activo por (droguería, trabajador, tema): una sola capacitación vigente por pareja. [H]
- `support_file_id` → `support_files` con FK compuesta, **opcional**.
- El **estado** (`vigente`, `pendiente`, `vencida`, `sin_soporte`) **no se guarda**: lo calcula una única expresión SQL al consultar. [H]

### `support_files` — «el archivador de soportes»
Una fila = los metadatos de un archivo subido. El archivo en sí **no está en la base**: se guarda en disco (`STORAGE_DIR/<droguería>/<nombre>`). [H]
- Solo PDF, PNG o JPEG (CHECK) y 1 byte a 5 MB (5 242 880).
- `stored_name`: nombre aleatorio de 32 caracteres hexadecimales + extensión (CHECK por expresión regular), único. [H]
- `sha256`: huella del contenido, con CHECK de formato (64 hex). [H]
- El tipo real se detecta por el contenido (`%PDF-` y firmas de imagen), no solo por la extensión. [H]
- Se guardan con permisos `0600` en carpeta `0700`. [H]

## 4.6 · Integridad y calidad (diagnóstico, sin cambios aplicados)

### Lo que está bien [H]
1. El mejor ejemplo del modelo de **aislamiento por droguería**: las FK compuestas impiden mezclar un trabajador de una droguería con un tema de otra, incluso escribiendo directo en la base.
2. Estado calculado en un solo lugar: no hay estados guardados que se desactualicen.
3. Validación del archivo en tres niveles: tipo por contenido, CHECK de MIME/tamaño/nombre y huella SHA-256.
4. Nombre del archivo en disco aleatorio, no el nombre original (evita colisiones y rutas manipuladas).
5. Al retirar un soporte, el código **desvincula** primero las capacitaciones (`support_file_id = NULL`) y luego marca el borrado lógico.

### Hallazgos
| # | Hallazgo | Tipo | Prioridad sugerida |
|---|---|---|---|
| 1 | **Los archivos viven en disco y las filas en la base.** Según `render.yaml` y `docs/07-despliegue.md`, en el plan gratuito de Render los soportes subidos **se pierden en cada despliegue** mientras las filas de `support_files` permanecen: quedarían registros que apuntan a archivos inexistentes. No lo probé en Render | [H] la documentación lo declara; [I] inconsistencia resultante | **P1**: informar a usuarios; disco persistente o almacenamiento externo si hay usuarios reales |
| 2 | `trainings_support_file_fk` **no define `ON DELETE`** (comportamiento por defecto: impedir). Es coherente con el borrado lógico, pero un borrado físico de `support_files` sería rechazado | [H] | Observación; sin acción |
| 3 | `support_files` no se enlaza con `expiration_products` ni `waste_records`: ellos usan `support_ref` (texto libre), mientras que `trainings` sí usa FK. El modelo trata el soporte de dos formas distintas (ya señalado en A3, hallazgo 1) | [H] | P2: decidir si unificar |
| 4 | `workers` guarda nombre completo y cargo: son **datos personales** de terceros que no son usuarios. No encontré en el catálogo marca de consentimiento para ellos (`users` sí tiene `privacy_accepted_at`) | [H] ausencia de columna; [I] posible requisito legal (Ley 1581), por validar con el director | P2 |
| 5 | Un trabajador retirado: `workers.deleted_at` lo oculta, pero no hay fecha de retiro ni motivo. Sus capacitaciones se conservan (no hay cascada lógica visible) | [H] | P3 |
| 6 | El CHECK de fechas permite capacitaciones **futuras** (`trained_on` sin tope superior más allá de lo validado en la API) | [H] CHECK sin límite; [I] depende de Zod | P3 |
| 7 | `validity_months` está en el tema, pero `valid_until` se guarda en la capacitación: dato derivado que se almacena. La base no verifica que sea coherente con los meses del tema | [H] | P3: es decisión razonable (permite excepciones); documentarla |
| 8 | `size_bytes` es `integer` con tope de 5 MB: suficiente; no hay riesgo de desborde | [H] | Sin acción |

### Normalización (resumen) [I]
Cumple 1FN/2FN/3FN, con una salvedad documentada: `valid_until` es derivable de `trained_on + validity_months`, pero se guarda a propósito (hallazgo 7).

## Qué NO se hizo
- No se modificó código ni base; no se subieron archivos ni se probó Render.
- Los hallazgos son para **acordar** antes de cualquier cambio.

## Autoevaluación
1. ¿Qué impide, en la base, registrar una capacitación con un tema de otra droguería?
2. ¿Por qué `support_files` guarda la huella SHA-256 y un nombre aleatorio en vez del nombre original?
3. ¿Qué verías en la pantalla si Render se despliega de nuevo y pides un soporte subido antes?
