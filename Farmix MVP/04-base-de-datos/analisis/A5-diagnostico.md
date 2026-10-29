# Etapa 2 · Área A5 — Diagnóstico y mejora

Tablas: `instrument_versions`, `instrument_items`, `diagnoses`, `diagnosis_answers`, `diagnosis_area_scores`, `improvement_actions`.
Fuente: catálogo (`../modelo-datos/modelo-fisico.md`), `farmix-app/src/modules/diagnoses/service.ts` y migración `0013_pgirasa_alignment.sql`.
Convención: **[H]** hecho confirmado · **[I]** inferencia · **[R]** recomendación (no aplicada).

## 4.5 · Explicación por tabla

Idea general: un **instrumento** (el cuestionario) tiene versiones y cada versión tiene ítems. Cada droguería hace **diagnósticos** con una versión; cada diagnóstico tiene **respuestas**, de las que salen **puntajes por área** y **acciones de mejora**. Es el módulo del objetivo 1 de la propuesta (diagnosticar la gestión de residuos).

### `instrument_versions` — «las ediciones del cuestionario»
Tabla **global** (sin `drugstore_id`): la comparten todas las droguerías.
- `version_number` único, `title`, `description`, `scoring`: `likert_avg` (escala 1–5, instrumento anterior) o `compliance_ratio` (Cumple / No cumple / No aplica, instrumento actual). [H]
- `is_current` con índice único parcial sobre `(true) WHERE is_current`: **solo una versión puede ser la vigente**. [H]

### `instrument_items` — «las preguntas»
- `version_id`, `item_code` (único por versión), `prompt_text`, `position`, `legal_basis` (opcional: sustento normativo).
- `area`: 9 valores permitidos (`residuos`, `vencimientos`, `segregacion`, `personal_capacitacion`, `documentacion`, `obligatorios`, `vencimientos_perdidas`, `capacitacion_documentos`, `seguimiento_mejora`). [H]
- `item_kind`: `obligatorio` (requisito que no se compensa) o `madurez` (se promedia). [H]
- `UNIQUE (version_id, id)`: sirve para que las respuestas verifiquen que el ítem es de la misma versión. [H]
- FK a la versión con `ON DELETE RESTRICT`: no se puede borrar una versión con ítems. [H]

### `diagnoses` — «cada vez que se aplica el cuestionario»
- `drugstore_id` (CASCADE), `instrument_version_id` (RESTRICT), `performed_on`, `notes` (≤ 1000), auditoría y `deleted_at`.
- `UNIQUE (id, instrument_version_id)`: deja «fijada» la versión usada. [H]

### `diagnosis_answers` — «las respuestas»
- Cada fila: diagnóstico + ítem + **una** respuesta: `score` (1–5) **o** `response` (`si`/`no`/`na`). El CHECK `one_value_ck` obliga a que exactamente una de las dos esté llena. [H]
- FK compuesta `(diagnosis_id, version_id) → diagnoses(id, instrument_version_id)` y `(version_id, item_id) → instrument_items(version_id, id)`: **el ítem respondido debe pertenecer a la versión del diagnóstico**, comprobado por la base. [H]
- Único por (diagnóstico, ítem): no se responde dos veces la misma pregunta. [H]
- No tiene `drugstore_id` ni `deleted_at`: depende del diagnóstico; se borra en cascada con él. [H]

### `diagnosis_area_scores` — «la nota por área»
- Clave primaria compuesta `(diagnosis_id, area)`; `area_score` `numeric(2,1)` entre 1 y 5 y `answered_count ≥ 1`. [H]
- Es un **dato derivado que sí se guarda**: se calcula al registrar el diagnóstico y se inserta. [H: `service.ts`]
- Fórmulas (código): con `compliance_ratio`, `max(1, round(sí / (sí + no) × 4) + 1)`, **sin contar «No aplica»**; con `likert_avg`, promedio redondeado a un decimal. La nota global es el promedio de las notas de área, a un decimal. Las áreas sin respuestas no tienen nota. [H]

### `improvement_actions` — «el plan de mejora»
- `finding` (hallazgo), `corrective_action`, `responsible`, `due_on`, `progress_state` (`pendiente`, `en_curso`, `cerrada`), `closed_on`, `origin_item_id` (ítem que originó el hallazgo, `SET NULL`). [H]
- Regla `closed_ck`: `(progress_state = 'cerrada') = (closed_on IS NOT NULL)`. [H]
- Es independiente de `diagnoses`: el vínculo es opcional y solo con el ítem. [H]

## 4.6 · Integridad y calidad (diagnóstico, sin cambios aplicados)

### Lo que está bien [H]
1. **La mejor integridad del modelo:** las FK compuestas impiden que un diagnóstico mezcle respuestas de otra versión del instrumento, y la versión no se puede borrar mientras exista un diagnóstico (RESTRICT).
2. Una sola versión vigente garantizada por la base.
3. Cada pregunta se responde una vez, con un único tipo de valor.
4. Versionado explícito: la migración 0013 marcó como no vigente la versión anterior en vez de modificarla.
5. El módulo conserva el sustento normativo (`legal_basis`) por ítem.

### Hallazgos
| # | Hallazgo | Tipo | Prioridad sugerida |
|---|---|---|---|
| 1 | La base exige **una** de `score`/`response`, pero **no** que coincida con el tipo de la versión (`likert_avg` ↔ `score`, `compliance_ratio` ↔ `response`) ni con `item_kind`. Esa coherencia depende del código. No la verifiqué con pruebas ni consultas | [H] CHECK; [I] riesgo | P2 |
| 2 | `diagnosis_area_scores` **duplica información** derivable de las respuestas. Es una decisión razonable (el puntaje queda «congelado» aunque cambie la fórmula), pero si se corrige una respuesta sin recalcular, quedan desfasados. No revisé si existe edición de respuestas posterior | [H] almacena; [I] riesgo | P2: verificar |
| 3 | Los ítems de una versión **se pueden modificar** (no hay triggers ni bloqueo): cambiar `prompt_text` después de haber diagnósticos alteraría el significado de lo ya respondido. La inmutabilidad es por convención (crear versión nueva) | [H] sin triggers; [I] riesgo | P2 |
| 4 | `instrument_items.area` mezcla el vocabulario de dos instrumentos (los 5 originales y los nuevos `vencimientos_perdidas`, `capacitacion_documentos`, `seguimiento_mejora`, más `obligatorios`). El mismo CHECK sirve a las dos versiones | [H] | P3: documentar; `area_score` usa otra lista, también ampliada |
| 5 | En `improvement_actions`, `corrective_action` y `responsible` son **opcionales**, pero si se llenan deben tener ≥ 3 y ≥ 2 caracteres (un CHECK con NULL pasa). Un plan puede quedar sin responsable ni fecha | [H] | P3: ¿la propuesta exige responsable? |
| 6 | `improvement_actions` no se une a un diagnóstico, solo a un ítem: no se sabe **de cuál aplicación** salió el hallazgo | [H] | P2 si se quiere medir seguimiento por diagnóstico |
| 7 | `diagnosis_answers` y `diagnosis_area_scores` no tienen `drugstore_id`: el aislamiento depende de la FK al diagnóstico (que sí es del tenant). Es correcto, pero una consulta mal escrita sin pasar por `diagnoses` no filtraría por droguería | [H] | P3: patrón, no error |
| 8 | `instrument_versions` es global y de lectura: solo se modifica por migración, no por la aplicación (no revisé permisos del rol de base) | [I] | Observación |

### Normalización (resumen) [I]
Cumple 1FN/2FN/3FN; `diagnosis_area_scores` es una desnormalización **deliberada** (hallazgo 2). La separación versiones → ítems → respuestas es el diseño estándar para instrumentos que cambian.

## Qué NO se hizo
- Sin cambios al código, la base ni los datos; sin consultas sobre diagnósticos reales; no se evaluó la validez del instrumento (eso es un tema metodológico de la propuesta, no de la base).
- Los hallazgos son para **acordar** antes de cualquier cambio.

## Autoevaluación
1. ¿Qué impide, en la base, guardar una respuesta de la versión 1 en un diagnóstico hecho con la versión 2?
2. ¿Por qué se guarda `area_score` si se podría recalcular?
3. ¿Qué pasaría con los diagnósticos antiguos si se editara el texto de un ítem?
