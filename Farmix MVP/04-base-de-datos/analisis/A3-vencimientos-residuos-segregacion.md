# Etapa 2 · Área A3 — Operación PGIRASA

Tablas: `expiration_products`, `waste_records`, `segregation_checks`. Son las funciones esenciales del MVP.
Fuente: catálogo de PostgreSQL (`../modelo-datos/modelo-fisico.md`) y código de `farmix-app/src/modules/{expirations,waste,segregation}`.
Convención: **[H]** hecho confirmado en el catálogo o código · **[I]** inferencia · **[R]** recomendación (no aplicada).

## 4.5 · Explicación por tabla

### `expiration_products` — «el estante de lo que vence»
Un renglón = un lote de un producto en una droguería. 17 columnas, 10 CHECK, 3 FK, 4 índices.

| Columna(s) | Para qué sirve |
|---|---|
| `drugstore_id` | De qué droguería es (aislamiento entre cuentas). FK con `ON DELETE CASCADE` |
| `product_name`, `batch`, `sanitary_registry`, `holder` | Identifican el producto; el registro sanitario y el titular son **texto libre** opcional |
| `expires_on` | Fecha de vencimiento (entre 2000 y 2100) |
| `quantity`, `unit_cost` | Unidades (1 a 1 000 000) y costo unitario (≥ 0, por defecto 0): base del cálculo de pérdidas |
| `destination`, `managed_at` | Qué se hizo: `pendiente`, `devuelto_proveedor`, `destruccion_gestor` o `averia_deterioro`, y cuándo |
| `support_ref` | Referencia de texto al soporte documental |
| auditoría | `created_by/updated_by` → `users` (`SET NULL`), `created_at/updated_at`, `deleted_at` (borrado lógico) |

Reglas que aplica la propia base:
- `managed_ck`: `(destination = 'pendiente') = (managed_at IS NULL)` — un producto está pendiente **si y solo si** no tiene fecha de gestión. [H]
- Único activo por (droguería, `lower(product_name)`, `lower(batch)`): no se repite el mismo lote. [H]
- El **estado** (vencido, por vencer…) **no se guarda**: se calcula al consultar con `expires_on`. Evita datos que envejecen solos. [H]
- Las **pérdidas** (confirmada y en riesgo) también se calculan en `service.ts` (`losses`); el propio código las llama «cifras descriptivas». [H]

### `waste_records` — «la bitácora de residuos»
Un renglón = un registro de residuo. 16 columnas, 10 CHECK, 3 FK, 4 índices.

| Columna(s) | Para qué sirve |
|---|---|
| `recorded_on` | Fecha del registro |
| `classification` | Clasificación **cerrada**: `riesgo_biologico`, `peligroso_quimico`, `aprovechable`, `organico_aprovechable`, `no_aprovechable` |
| `quantity`, `unit` | Cantidad (> 0 y ≤ 100 000, `numeric(10,3)`) y unidad (`kg`, `g`, `unidades`) |
| `origin` | Opcional: `medicamento_vencido` u `otro` |
| `waste_type`, `handling`, `notes`, `support_ref` | Texto libre opcional (tipo, manejo, notas, soporte) |

Regla clave: `expired_med_ck` — un **medicamento vencido no puede clasificarse como riesgo biológico** (se valida en la API y en la base). [H]

### `segregation_checks` — «la lista de chequeo de segregación»
Un renglón = una revisión: cuántos elementos se miraron y cuántos estaban bien segregados. Es el **indicador de evaluación del MVP**. 12 columnas, 6 CHECK, 3 FK, 3 índices.

| Columna(s) | Para qué sirve |
|---|---|
| `checked_on`, `location` | Cuándo y dónde se revisó (texto libre, 1–120) |
| `items_reviewed`, `items_correct` | Revisados (1–100 000) y correctos (≥ 0) |
| `observations` | Nota opcional (≤ 500) |

Reglas: `correct_le_reviewed_ck` (`items_correct <= items_reviewed`). El **porcentaje no se guarda**: `percent()` lo calcula al consultar, redondeado a un decimal. [H]

## 4.6 · Integridad y calidad (diagnóstico, sin cambios aplicados)

### Lo que está bien [H]
1. Clasificaciones y destinos **cerrados con CHECK**: la base rechaza valores inventados aunque falle la API.
2. Cantidades, fechas y longitudes acotadas en las tres tablas.
3. Sin datos derivados almacenados (estado, pérdidas, porcentaje): no pueden quedar desactualizados.
4. Aislamiento por droguería: `UNIQUE (drugstore_id, id)` en las tres, para FK compuestas desde otras tablas.
5. Borrado lógico (`deleted_at`) e índices parciales que lo respetan.

### Hallazgos
| # | Hallazgo | Tipo | Prioridad sugerida |
|---|---|---|---|
| 1 | `support_ref` es texto libre: **no hay FK** hacia `support_files`. Nada impide guardar una referencia a un soporte inexistente o de otra droguería. Falta confirmar cómo la usa la interfaz (no lo revisé) | [H] la falta de FK; [I] el riesgo | P2 |
| 2 | `waste_records` **no se enlaza** con `expiration_products`: un residuo con origen `medicamento_vencido` no dice de qué producto/lote viene. Depende de si el objetivo exige trazabilidad lote → residuo | [H] ausencia; [I] relevancia | P3 (decidir con el director) |
| 3 | `unit` mezcla `kg`, `g` y `unidades` en una misma columna. Sumar cantidades sin convertir daría totales sin sentido. No revisé si algún reporte suma por unidad | [H] diseño; [I] riesgo | P2 (revisar reportes) |
| 4 | `origin`, `waste_type` y `handling` son opcionales; `waste_type` y `handling` son texto libre: difícil de agregar o comparar | [H] | P3 |
| 5 | `unit_cost` por defecto 0: un producto sin costo cuenta como pérdida de valor 0 sin avisar | [H] default; [I] efecto en reportes | P2 |
| 6 | `segregation_checks` no guarda **quién** revisó (solo `created_by` de auditoría) ni evita dos revisiones iguales el mismo día y lugar | [H] | P3 (¿lo exige la propuesta?) |
| 7 | No hay triggers: `updated_at` depende de que la aplicación lo escriba. No lo verifiqué en el código | [H] sin triggers; [I] dependencia | P3 |
| 8 | `drugstore_id` con `ON DELETE CASCADE`: borrar una droguería borra físicamente sus registros. La app usa borrado lógico, pero la base lo permite | [H] | P2: solo con respaldo previo |
| 9 | `ON DELETE SET NULL` en auditoría: si se elimina un usuario se pierde el autor del registro | [H] | P3 |

### Normalización (resumen) [I]
Las tres tablas cumplen **1FN** (valores atómicos) y **2FN/3FN** (cada dato depende de la clave del renglón; no hay columnas derivadas guardadas). Las listas de valores como CHECK en lugar de tablas de catálogo son una **decisión de diseño válida**, no un error: cambiarlas exige migración, pero evita joins para valores que casi no cambian.

## Qué NO se hizo
- No se aplicó ninguna restricción nueva ni se tocó el código ni la base.
- No se ejecutaron consultas de calidad sobre datos reales (solo se revisó la estructura).
- Los hallazgos son para **acordar** antes de cualquier cambio.

## Autoevaluación
1. ¿Por qué `managed_ck` usa una igualdad entre dos condiciones y no dos CHECK separados?
2. ¿Qué pasaría si el porcentaje de segregación se guardara en una columna?
3. ¿Qué hallazgo cambiaría más tu informe si el director pide trazabilidad lote → residuo?
