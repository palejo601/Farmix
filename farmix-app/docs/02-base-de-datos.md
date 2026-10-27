# 2. Base de datos

PostgreSQL 16. Esquema completo en [`schema.sql`](schema.sql) (generado con `pg_dump -s` tras aplicar las migraciones; **23 tablas**).

## Crear el esquema

Dos opciones equivalentes:

```bash
npm run migrate                                   # recomendada: aplica src/db/migrations en orden
psql "$DATABASE_URL" -f docs/schema.sql           # alternativa: volcado del esquema en una base vacía
```

`npm run migrate` registra cada archivo en `schema_migrations` con su hash SHA-256 y **se detiene** si una migración ya aplicada cambió. Los cambios son siempre migraciones nuevas.

## Migraciones (13, en orden)

| # | Archivo | Contenido |
|---|---|---|
| 1 | `0001_foundation.sql` | `schema_migrations` |
| 2 | `0002_accounts_security.sql` | `users`, `sessions`, `password_resets`, `audit_logs`, `dev_mailbox` |
| 3 | `0003_drugstores.sql` | `drugstores`, `drugstore_members` |
| 4 | `0004_expirations.sql` | `expiration_products` |
| 5 | `0005_waste.sql` | `waste_records` |
| 6 | `0006_segregation.sql` | `segregation_checks` |
| 7 | `0007_staff.sql` | `workers`, `training_topics`, `trainings` |
| 8 | `0008_improvement_actions.sql` | `improvement_actions` |
| 9 | `0009_diagnoses.sql` | `instrument_versions`, `instrument_items`, `diagnoses`, `diagnosis_answers`, `diagnosis_area_scores` + instrumento v1 (borrador) |
| 10 | `0010_support_files.sql` | `support_files` + enlace `trainings.support_file_id` |
| 11 | `0011_imports.sql` | `imports` |
| 12 | `0012_local_migrations.sql` | `local_migrations` |
| 13 | `0013_pgirasa_alignment.sql` | Reorientación al PGIRASA: empleados y marca de demostración en droguerías; destinos y soporte en vencimientos; tipo, manejo, soporte y «unidades» en residuos; mejoras con campos por definir y origen; instrumento v2 (11 obligatorios + 17 de madurez); temas base de capacitación |

El encargo mencionaba 13 migraciones; esta reconstrucción tiene 13 con las mismas 23 entidades (la partición exacta del prototipo no se pudo contrastar: el prototipo entregado es una aplicación de navegador sin base de datos).

## Entidades

| Tabla | Propósito | Relaciones principales |
|---|---|---|
| `schema_migrations` | Migraciones aplicadas y su hash | — |
| `users` | Cuentas: correo único (sin distinguir mayúsculas), hash Argon2id, aviso de privacidad, bloqueo, solicitud de eliminación | — |
| `sessions` | Sesiones (hash del token, inactividad, vencimiento absoluto, revocación) | `user_id` → users (cascada) |
| `password_resets` | Códigos de recuperación de un solo uso (hash, vencimiento) | `user_id` → users |
| `dev_mailbox` | Correos simulados en `MAIL_MODE=dev` | — |
| `audit_logs` | Auditoría: usuario, acción, recurso, resultado, `request_id`. Tabla de registro: sin `deleted_at` ni `created_by` | `user_id` → users (SET NULL: se anonimiza al eliminar la cuenta) |
| `drugstores` | Droguerías; `expiry_alert_days` (1–365, por defecto 60), `employee_count` y `is_demo` (datos simulados). Borrado lógico + auditoría | `created_by`/`updated_by` → users |
| `drugstore_members` | Pertenencia y rol (`member_role`: propietario, administrador, operador). Índices únicos parciales: un miembro activo por droguería y **un único propietario activo** | → drugstores, users |
| `expiration_products` | Productos con vencimiento: lote, registro sanitario y titular (texto libre), fecha, cantidad, costo, destino (`pendiente`, `devuelto_proveedor`, `destruccion_gestor`, `averia_deterioro`) y soporte (`support_ref`). El estado **no se guarda**. `UNIQUE(drugstore_id,id)`; único (droguería, producto, lote) entre activos | → drugstores |
| `waste_records` | Residuos: fecha, clasificación cerrada (5), cantidad, unidad (kg, g o unidades), tipo, manejo, soporte y origen opcional. Check: un medicamento vencido no es riesgo biológico | → drugstores |
| `segregation_checks` | Verificaciones: revisados, bien segregados, lugar. Check `items_correct <= items_reviewed`. El porcentaje **no se guarda** | → drugstores |
| `workers` | Personal: código interno único por droguería (sin documento de identidad), nombre, cargo | → drugstores |
| `training_topics` | Temas con vigencia en meses (1–60); nombre único por droguería | → drugstores |
| `trainings` | Un registro por trabajador y tema. Fechas coherentes (check). Estado calculado. FK **compuestas** que obligan a que trabajador, tema y soporte sean de la misma droguería | → workers, training_topics, support_files |
| `improvement_actions` | Plan de mejoramiento: hallazgo, acción correctiva, responsable, fecha límite, `progress_state` (pendiente, en_curso, cerrada). Acción, responsable y fecha pueden quedar por definir; `origin_item_id` liga la mejora al requisito incumplido. Check: cerrada ⇔ tiene fecha de cierre | → drugstores |
| `instrument_versions` | Versiones del instrumento de diagnóstico (`scoring`: `likert_avg` v1, `compliance_ratio` v2); índice único `((true)) WHERE is_current` ⇒ **una sola vigente** | — |
| `instrument_items` | Ítems por versión: `item_kind` (obligatorio o madurez), `legal_basis` (fundamento normativo) y área | → instrument_versions |
| `diagnoses` | Diagnósticos de una droguería, atados a una versión del instrumento | → drugstores, instrument_versions |
| `diagnosis_answers` | Respuesta por ítem: `response` (si/no/na, v2) o `score` 1–5 (v1), exactamente una; FK compuestas obligan a que el ítem pertenezca a la versión del diagnóstico. Sin `deleted_at` (tabla dependiente) | → diagnoses, instrument_items |
| `diagnosis_area_scores` | Puntaje de madurez 1–5 por área (promedio de respuestas); se recalcula en cada cambio | → diagnoses (cascada) |
| `support_files` | Metadatos de soportes (nombre aleatorio con patrón verificado por check, tipo, tamaño ≤ 5 MB, SHA-256). El contenido está en disco | → drugstores |
| `imports` | Vista previa/confirmación de importaciones (resultados por fila en JSONB), caduca a 24 h | → drugstores |
| `local_migrations` | Migraciones desde el navegador: hash del contenido, bandera de demostración, fase, ids insertados. Único (usuario, hash, demostración) mientras no esté revertida | → users, drugstores |

## Convenciones

- Tablas de negocio: `created_by`, `updated_by`, `created_at`, `updated_at`, `deleted_at` (borrado lógico). Excepciones justificadas: `audit_logs`, `sessions`, `password_resets`, `dev_mailbox`, `schema_migrations`, `instrument_*`, `diagnosis_answers`, `diagnosis_area_scores` (tablas de registro, de control o dependientes) y `local_migrations` (propiedad del usuario, con fases).
- **Nombres de columna:** se evitaron `status`, `text` y `role` (no hay columnas con esos nombres); se eligieron `member_role`, `progress_state`, `phase`, `prompt_text`, `topic_name`, `job_title`, `corrective_action`, `area_score`. Quedan `name` (en `drugstores`) y `position` (en `instrument_items`), que no son reservadas en PostgreSQL; si una herramienta de diagramación se queja, se renombran con una migración nueva. No hay columnas llamadas `status`.
- Estados derivados (vencimientos, capacitaciones, porcentaje de segregación, atraso del plan) se calculan al consultar con la fecha de `America/Bogota`.
- Eliminación de cuenta: se borra el usuario tras 15 días; sus droguerías propias se archivan (borrado lógico) y la auditoría queda anonimizada (`user_id` nulo).

## Instrumento de diagnóstico v2 (vigente)

La migración 13 deja vigente la versión 2: **11 requisitos obligatorios** (cada uno con su fundamento normativo, copiado del prototipo original, incluidas sus notas «pendiente de verificar») y **17 preguntas de madurez** en 4 áreas (residuos; vencimientos y pérdidas; capacitación y documentos; seguimiento y mejora). Los criterios están **pendientes de validación por un profesional farmacéutico y un asesor jurídico**. Es una autoevaluación orientativa; no cita ni certifica cumplimiento. La versión 1 (15 ítems, puntaje 1–5) se conserva para leer diagnósticos anteriores.
