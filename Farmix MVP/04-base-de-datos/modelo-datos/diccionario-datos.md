# Diccionario de datos de FARMIX

Generado con `generar.py` desde el catálogo de PostgreSQL (13 migraciones aplicadas).
Las columnas **Tipo, Clave, NULL, Predeterminado, Referencia y Validaciones** son hechos del catálogo;
**Función** es interpretación redactada a partir del código y debe leerse como tal.

## `audit_logs`

**Área:** Identidad, sesiones y auditoría. **Qué es:** Bitácora de auditoría de acciones relevantes. **Módulos:** audit (shared), personal-data.

| Columna | Tipo | Clave | NULL | Predeterminado | Referencia | Función | Validaciones |
|---|---|---|---|---|---|---|---|
| `id` | bigint | PK | no | nextval('audit_logs_id_seq'::regclass) |  | Consecutivo numérico (bigint de identidad): aquí sirve el orden de llegada. |  |
| `user_id` | uuid | FK | sí |  | users(id) [user_id → SET NULL] | Usuario que hizo la acción, si la hubo. |  |
| `action` | text | — | no |  |  | Acción realizada (por ejemplo, crear o eliminar). |  |
| `resource` | text | — | no |  |  | Tipo de recurso afectado. |  |
| `resource_id` | text | — | sí |  |  | Identificador del recurso afectado (texto, porque puede venir de tablas distintas). |  |
| `outcome` | text | — | no |  |  | Resultado: success o failure. | ((outcome = ANY (ARRAY['success'::text, 'failure'::text]))) |
| `request_id` | text | — | sí |  |  | Identificador de la petición HTTP, para cruzar con los registros del servidor. |  |
| `created_at` | timestamp with time zone | — | no | now() |  | Fecha y hora de creación, con zona horaria. |  |

## `dev_mailbox`

**Área:** Identidad, sesiones y auditoría. **Qué es:** Buzón de correo de desarrollo: guarda los correos en lugar de enviarlos (MAIL_MODE=dev). **Módulos:** auth.

| Columna | Tipo | Clave | NULL | Predeterminado | Referencia | Función | Validaciones |
|---|---|---|---|---|---|---|---|
| `id` | bigint | PK | no | nextval('dev_mailbox_id_seq'::regclass) |  | Consecutivo numérico. |  |
| `to_email` | text | — | no |  |  | Destinatario. |  |
| `subject` | text | — | no |  |  | Asunto. |  |
| `body` | text | — | no |  |  | Contenido del correo (incluye enlaces de recuperación; solo para desarrollo). |  |
| `created_at` | timestamp with time zone | — | no | now() |  | Fecha y hora de creación, con zona horaria. |  |

## `diagnoses`

**Área:** Diagnóstico PGIRASA y plan de mejora. **Qué es:** Diagnósticos aplicados a una droguería con una versión del instrumento. **Módulos:** diagnoses, reports.

| Columna | Tipo | Clave | NULL | Predeterminado | Referencia | Función | Validaciones |
|---|---|---|---|---|---|---|---|
| `id` | uuid | PK, UNIQUE | no | gen_random_uuid() |  | Identificador único de la fila (clave primaria). Es un UUID: un código aleatorio de 128 bits imposible de adivinar, a diferencia de un consecutivo 1, 2, 3. | UNIQUE: diagnoses_tenant_uq (drugstore_id, id) \| UNIQUE: diagnoses_version_uq (id, instrument_version_id) |
| `drugstore_id` | uuid | FK, UNIQUE | no |  | drugstores(id) [drugstore_id → CASCADE] | Droguería dueña del registro. Es la columna que aísla los datos de cada droguería. | UNIQUE: diagnoses_tenant_uq (drugstore_id, id) |
| `instrument_version_id` | uuid | FK, UNIQUE | no |  | instrument_versions(id) [instrument_version_id → RESTRICT] | Versión del instrumento usada; no se puede borrar una versión con diagnósticos (RESTRICT). | UNIQUE: diagnoses_version_uq (id, instrument_version_id) |
| `performed_on` | date | — | no |  |  | Fecha del diagnóstico. | (((performed_on >= '2000-01-01'::date) AND (performed_on <= '2100-12-31'::date))) |
| `notes` | text | — | sí |  |  | Observaciones. | (((notes IS NULL) OR (char_length(notes) <= 1000))) |
| `created_by` | uuid | FK | sí |  | users(id) [created_by → SET NULL] | Usuario que creó el registro (trazabilidad). Queda vacío si ese usuario se elimina. |  |
| `updated_by` | uuid | FK | sí |  | users(id) [updated_by → SET NULL] | Último usuario que modificó el registro (trazabilidad). |  |
| `created_at` | timestamp with time zone | — | no | now() |  | Fecha y hora de creación, con zona horaria. |  |
| `updated_at` | timestamp with time zone | — | no | now() |  | Fecha y hora de la última modificación. |  |
| `deleted_at` | timestamp with time zone | — | sí |  |  | Borrado lógico: si tiene fecha, el registro se considera eliminado pero se conserva como evidencia. |  |

## `diagnosis_answers`

**Área:** Diagnóstico PGIRASA y plan de mejora. **Qué es:** Respuesta a cada ítem dentro de un diagnóstico. **Módulos:** diagnoses.

| Columna | Tipo | Clave | NULL | Predeterminado | Referencia | Función | Validaciones |
|---|---|---|---|---|---|---|---|
| `id` | uuid | PK | no | gen_random_uuid() |  | Identificador único de la fila (clave primaria). Es un UUID: un código aleatorio de 128 bits imposible de adivinar, a diferencia de un consecutivo 1, 2, 3. |  |
| `diagnosis_id` | uuid | FK, UNIQUE | no |  | diagnoses(id, instrument_version_id) [diagnosis_id, version_id → CASCADE] | Diagnóstico al que pertenece. | UNIQUE: diagnosis_answers_diagnosis_id_item_id_key (diagnosis_id, item_id) |
| `version_id` | uuid | FK | no |  | diagnoses(id, instrument_version_id) [diagnosis_id, version_id → CASCADE]; instrument_items(version_id, id) [version_id, item_id → NO ACTION] | Versión del instrumento; repetida a propósito para que la FK compuesta garantice que el ítem es de la misma versión del diagnóstico. |  |
| `item_id` | uuid | FK, UNIQUE | no |  | instrument_items(version_id, id) [version_id, item_id → NO ACTION] | Ítem respondido; uno solo por diagnóstico. | UNIQUE: diagnosis_answers_diagnosis_id_item_id_key (diagnosis_id, item_id) |
| `score` | smallint | — | sí |  |  | Puntaje 1 a 5 (instrumento versión 1). | (((score IS NULL) <> (response IS NULL))) \| (((score >= 1) AND (score <= 5))) |
| `created_by` | uuid | FK | sí |  | users(id) [created_by → SET NULL] | Usuario que creó el registro (trazabilidad). Queda vacío si ese usuario se elimina. |  |
| `updated_by` | uuid | FK | sí |  | users(id) [updated_by → SET NULL] | Último usuario que modificó el registro (trazabilidad). |  |
| `created_at` | timestamp with time zone | — | no | now() |  | Fecha y hora de creación, con zona horaria. |  |
| `updated_at` | timestamp with time zone | — | no | now() |  | Fecha y hora de la última modificación. |  |
| `response` | text | — | sí |  |  | Respuesta si, no o na (instrumento versión 2). Debe venir score o response, nunca ambos (regla CHECK). | (((score IS NULL) <> (response IS NULL))) \| ((response = ANY (ARRAY['si'::text, 'no'::text, 'na'::text]))) |

## `diagnosis_area_scores`

**Área:** Diagnóstico PGIRASA y plan de mejora. **Qué es:** Puntaje calculado por área para cada diagnóstico. Es un dato derivado guardado para consultas rápidas. **Módulos:** diagnoses.

| Columna | Tipo | Clave | NULL | Predeterminado | Referencia | Función | Validaciones |
|---|---|---|---|---|---|---|---|
| `diagnosis_id` | uuid | PK, FK | no |  | diagnoses(id) [diagnosis_id → CASCADE] | Diagnóstico (parte de la clave primaria compuesta). |  |
| `area` | text | PK | no |  |  | Área (parte de la clave primaria compuesta). | ((area = ANY (ARRAY['residuos'::text, 'vencimientos'::text, 'segregacion'::text, 'personal_capacitacion'::text, 'documentacion'::text, 'vencimientos_perdidas'::text, 'capacitacion_documentos'::text, 'seguimiento_mejora'::text]))) |
| `area_score` | numeric(2,1) | — | no |  |  | Puntaje del área, de 1,0 a 5,0. | (((area_score >= (1)::numeric) AND (area_score <= (5)::numeric))) |
| `answered_count` | integer | — | no |  |  | Ítems respondidos en el área. | ((answered_count >= 1)) |

## `drugstore_members`

**Área:** Droguerías y acceso por roles. **Qué es:** Qué usuarios pertenecen a cada droguería y con qué rol. Resuelve la relación muchos a muchos entre users y drugstores. **Módulos:** drugstores (guard.ts controla los permisos).

| Columna | Tipo | Clave | NULL | Predeterminado | Referencia | Función | Validaciones |
|---|---|---|---|---|---|---|---|
| `id` | uuid | PK | no | gen_random_uuid() |  | Identificador único de la fila (clave primaria). Es un UUID: un código aleatorio de 128 bits imposible de adivinar, a diferencia de un consecutivo 1, 2, 3. |  |
| `drugstore_id` | uuid | FK, UNIQUE | no |  | drugstores(id) [drugstore_id → CASCADE] | Droguería dueña del registro. Es la columna que aísla los datos de cada droguería. | UNIQUE: drugstore_members_active_uq (índice único) \| UNIQUE: drugstore_members_owner_uq (índice único) |
| `user_id` | uuid | FK, UNIQUE | no |  | users(id) [user_id → CASCADE] | Usuario miembro. | UNIQUE: drugstore_members_active_uq (índice único) |
| `member_role` | text | — | no |  |  | Rol: propietario, administrador u operador. Solo puede haber un propietario activo por droguería (índice drugstore_members_owner_uq). | ((member_role = ANY (ARRAY['propietario'::text, 'administrador'::text, 'operador'::text]))) |
| `created_by` | uuid | FK | sí |  | users(id) [created_by → SET NULL] | Usuario que creó el registro (trazabilidad). Queda vacío si ese usuario se elimina. |  |
| `updated_by` | uuid | FK | sí |  | users(id) [updated_by → SET NULL] | Último usuario que modificó el registro (trazabilidad). |  |
| `created_at` | timestamp with time zone | — | no | now() |  | Fecha y hora de creación, con zona horaria. |  |
| `updated_at` | timestamp with time zone | — | no | now() |  | Fecha y hora de la última modificación. |  |
| `deleted_at` | timestamp with time zone | — | sí |  |  | Borrado lógico: si tiene fecha, el registro se considera eliminado pero se conserva como evidencia. |  |

## `drugstores`

**Área:** Droguerías y acceso por roles. **Qué es:** Droguerías registradas. **Módulos:** drugstores y, por drugstore_id, todos los módulos de negocio.

| Columna | Tipo | Clave | NULL | Predeterminado | Referencia | Función | Validaciones |
|---|---|---|---|---|---|---|---|
| `id` | uuid | PK | no | gen_random_uuid() |  | Identificador único de la fila (clave primaria). Es un UUID: un código aleatorio de 128 bits imposible de adivinar, a diferencia de un consecutivo 1, 2, 3. |  |
| `name` | text | — | no |  |  | Nombre de la droguería. | (((char_length(name) >= 2) AND (char_length(name) <= 120))) |
| `city` | text | — | no | 'Sincelejo'::text |  | Ciudad o municipio. | (((char_length(city) >= 2) AND (char_length(city) <= 80))) |
| `expiry_alert_days` | integer | — | no | 60 |  | Con cuántos días de anticipación se alerta un vencimiento (1 a 365), configurable por droguería. | (((expiry_alert_days >= 1) AND (expiry_alert_days <= 365))) |
| `created_by` | uuid | FK | sí |  | users(id) [created_by → SET NULL] | Usuario que creó el registro (trazabilidad). Queda vacío si ese usuario se elimina. |  |
| `updated_by` | uuid | FK | sí |  | users(id) [updated_by → SET NULL] | Último usuario que modificó el registro (trazabilidad). |  |
| `created_at` | timestamp with time zone | — | no | now() |  | Fecha y hora de creación, con zona horaria. |  |
| `updated_at` | timestamp with time zone | — | no | now() |  | Fecha y hora de la última modificación. |  |
| `deleted_at` | timestamp with time zone | — | sí |  |  | Borrado lógico: si tiene fecha, el registro se considera eliminado pero se conserva como evidencia. |  |
| `employee_count` | integer | — | sí |  |  | Número de empleados declarado (opcional). | (((employee_count IS NULL) OR ((employee_count >= 0) AND (employee_count <= 10000)))) |
| `is_demo` | boolean | — | no | false |  | Marca de droguería de demostración con datos simulados. |  |

## `expiration_products`

**Área:** Operación PGIRASA: vencimientos, residuos y segregación. **Qué es:** Productos próximos a vencer o vencidos y su gestión. **Módulos:** expirations, imports, reports.

| Columna | Tipo | Clave | NULL | Predeterminado | Referencia | Función | Validaciones |
|---|---|---|---|---|---|---|---|
| `id` | uuid | PK, UNIQUE | no | gen_random_uuid() |  | Identificador único de la fila (clave primaria). Es un UUID: un código aleatorio de 128 bits imposible de adivinar, a diferencia de un consecutivo 1, 2, 3. | UNIQUE: expiration_products_tenant_uq (drugstore_id, id) |
| `drugstore_id` | uuid | FK, UNIQUE | no |  | drugstores(id) [drugstore_id → CASCADE] | Droguería dueña del registro. Es la columna que aísla los datos de cada droguería. | UNIQUE: expiration_products_tenant_uq (drugstore_id, id) \| UNIQUE: expiration_products_batch_uq (índice único) |
| `product_name` | text | UNIQUE | no |  |  | Nombre del medicamento o producto. | (((char_length(product_name) >= 1) AND (char_length(product_name) <= 160))) \| UNIQUE: expiration_products_batch_uq (índice único) |
| `batch` | text | UNIQUE | no |  |  | Lote. Un mismo producto y lote no se repite en la droguería (índice expiration_products_batch_uq). | (((char_length(batch) >= 1) AND (char_length(batch) <= 60))) \| UNIQUE: expiration_products_batch_uq (índice único) |
| `sanitary_registry` | text | — | sí |  |  | Registro sanitario INVIMA (opcional). | (((sanitary_registry IS NULL) OR ((char_length(sanitary_registry) >= 1) AND (char_length(sanitary_registry) <= 60)))) |
| `holder` | text | — | sí |  |  | Titular del registro o proveedor (opcional). | (((holder IS NULL) OR ((char_length(holder) >= 1) AND (char_length(holder) <= 120)))) |
| `expires_on` | date | — | no |  |  | Fecha de vencimiento. | (((expires_on >= '2000-01-01'::date) AND (expires_on <= '2100-12-31'::date))) |
| `quantity` | integer | — | no |  |  | Unidades afectadas (1 a 1.000.000). | (((quantity >= 1) AND (quantity <= 1000000))) |
| `unit_cost` | numeric(12,2) | — | no | 0 |  | Costo unitario; cantidad × costo da la pérdida por vencimiento. | ((unit_cost >= (0)::numeric)) |
| `destination` | text | — | no | 'pendiente'::text |  | Destino: pendiente, devuelto al proveedor, destrucción por gestor o avería/deterioro. | ((destination = ANY (ARRAY['pendiente'::text, 'devuelto_proveedor'::text, 'destruccion_gestor'::text, 'averia_deterioro'::text]))) \| (((destination = 'pendiente'::text) = (managed_at IS NULL))) |
| `managed_at` | timestamp with time zone | — | sí |  |  | Cuándo se gestionó. Debe estar vacío solo si el destino es pendiente (regla CHECK). | (((destination = 'pendiente'::text) = (managed_at IS NULL))) |
| `created_by` | uuid | FK | sí |  | users(id) [created_by → SET NULL] | Usuario que creó el registro (trazabilidad). Queda vacío si ese usuario se elimina. |  |
| `updated_by` | uuid | FK | sí |  | users(id) [updated_by → SET NULL] | Último usuario que modificó el registro (trazabilidad). |  |
| `created_at` | timestamp with time zone | — | no | now() |  | Fecha y hora de creación, con zona horaria. |  |
| `updated_at` | timestamp with time zone | — | no | now() |  | Fecha y hora de la última modificación. |  |
| `deleted_at` | timestamp with time zone | — | sí |  |  | Borrado lógico: si tiene fecha, el registro se considera eliminado pero se conserva como evidencia. |  |
| `support_ref` | text | — | sí |  |  | Referencia al soporte documental (acta, certificado). | (((support_ref IS NULL) OR ((char_length(support_ref) >= 1) AND (char_length(support_ref) <= 120)))) |

## `imports`

**Área:** Carga masiva de datos y mantenimiento. **Qué es:** Importaciones de CSV o Excel en dos pasos: vista previa y confirmación. **Módulos:** imports, local-migrations, reports.

| Columna | Tipo | Clave | NULL | Predeterminado | Referencia | Función | Validaciones |
|---|---|---|---|---|---|---|---|
| `id` | uuid | PK, UNIQUE | no | gen_random_uuid() |  | Identificador único de la fila (clave primaria). Es un UUID: un código aleatorio de 128 bits imposible de adivinar, a diferencia de un consecutivo 1, 2, 3. | UNIQUE: imports_tenant_uq (drugstore_id, id) |
| `drugstore_id` | uuid | FK, UNIQUE | no |  | drugstores(id) [drugstore_id → CASCADE] | Droguería dueña del registro. Es la columna que aísla los datos de cada droguería. | UNIQUE: imports_tenant_uq (drugstore_id, id) |
| `kind` | text | — | no |  |  | Qué se importa: expirations, waste o segregation. | ((kind = ANY (ARRAY['expirations'::text, 'waste'::text, 'segregation'::text]))) |
| `file_name` | text | — | no |  |  | Nombre del archivo subido. | (((char_length(file_name) >= 1) AND (char_length(file_name) <= 120))) |
| `phase` | text | — | no | 'vista_previa'::text |  | vista_previa o confirmada. | (((phase = 'confirmada'::text) = (confirmed_at IS NOT NULL))) \| ((phase = ANY (ARRAY['vista_previa'::text, 'confirmada'::text]))) |
| `total_rows` | integer | — | no |  |  | Filas leídas. | ((total_rows >= 0)) |
| `valid_rows` | integer | — | no |  |  | Filas válidas. | ((valid_rows >= 0)) |
| `invalid_rows` | integer | — | no |  |  | Filas con errores. | ((invalid_rows >= 0)) |
| `duplicate_rows` | integer | — | no |  |  | Filas repetidas (en el archivo o en la base). | ((duplicate_rows >= 0)) |
| `row_results` | jsonb | — | no |  |  | Resultado fila por fila en JSON (datos y errores). |  |
| `inserted_count` | integer | — | sí |  |  | Filas efectivamente guardadas al confirmar. |  |
| `expires_at` | timestamp with time zone | — | no |  |  | La vista previa caduca a las 24 horas. |  |
| `confirmed_at` | timestamp with time zone | — | sí |  |  | Momento de la confirmación; existe si y solo si la fase es confirmada. | (((phase = 'confirmada'::text) = (confirmed_at IS NOT NULL))) |
| `created_by` | uuid | FK | sí |  | users(id) [created_by → SET NULL] | Usuario que creó el registro (trazabilidad). Queda vacío si ese usuario se elimina. |  |
| `updated_by` | uuid | FK | sí |  | users(id) [updated_by → SET NULL] | Último usuario que modificó el registro (trazabilidad). |  |
| `created_at` | timestamp with time zone | — | no | now() |  | Fecha y hora de creación, con zona horaria. |  |
| `updated_at` | timestamp with time zone | — | no | now() |  | Fecha y hora de la última modificación. |  |
| `deleted_at` | timestamp with time zone | — | sí |  |  | Borrado lógico: si tiene fecha, el registro se considera eliminado pero se conserva como evidencia. |  |

## `improvement_actions`

**Área:** Diagnóstico PGIRASA y plan de mejora. **Qué es:** Acciones de mejora (plan de mejoramiento). **Módulos:** actions, reports.

| Columna | Tipo | Clave | NULL | Predeterminado | Referencia | Función | Validaciones |
|---|---|---|---|---|---|---|---|
| `id` | uuid | PK, UNIQUE | no | gen_random_uuid() |  | Identificador único de la fila (clave primaria). Es un UUID: un código aleatorio de 128 bits imposible de adivinar, a diferencia de un consecutivo 1, 2, 3. | UNIQUE: improvement_actions_tenant_uq (drugstore_id, id) |
| `drugstore_id` | uuid | FK, UNIQUE | no |  | drugstores(id) [drugstore_id → CASCADE] | Droguería dueña del registro. Es la columna que aísla los datos de cada droguería. | UNIQUE: improvement_actions_tenant_uq (drugstore_id, id) |
| `finding` | text | — | no |  |  | Hallazgo o incumplimiento detectado. | (((char_length(finding) >= 3) AND (char_length(finding) <= 500))) |
| `corrective_action` | text | — | sí |  |  | Acción correctiva propuesta. | (((char_length(corrective_action) >= 3) AND (char_length(corrective_action) <= 500))) |
| `responsible` | text | — | sí |  |  | Persona responsable. | (((char_length(responsible) >= 2) AND (char_length(responsible) <= 120))) |
| `due_on` | date | — | sí |  |  | Fecha límite. | (((due_on >= '2000-01-01'::date) AND (due_on <= '2100-12-31'::date))) |
| `progress_state` | text | — | no | 'pendiente'::text |  | Estado: pendiente, en curso o cerrada. | (((progress_state = 'cerrada'::text) = (closed_on IS NOT NULL))) \| ((progress_state = ANY (ARRAY['pendiente'::text, 'en_curso'::text, 'cerrada'::text]))) |
| `closed_on` | date | — | sí |  |  | Fecha de cierre; obligatoria si y solo si el estado es cerrada (regla CHECK). | (((progress_state = 'cerrada'::text) = (closed_on IS NOT NULL))) |
| `created_by` | uuid | FK | sí |  | users(id) [created_by → SET NULL] | Usuario que creó el registro (trazabilidad). Queda vacío si ese usuario se elimina. |  |
| `updated_by` | uuid | FK | sí |  | users(id) [updated_by → SET NULL] | Último usuario que modificó el registro (trazabilidad). |  |
| `created_at` | timestamp with time zone | — | no | now() |  | Fecha y hora de creación, con zona horaria. |  |
| `updated_at` | timestamp with time zone | — | no | now() |  | Fecha y hora de la última modificación. |  |
| `deleted_at` | timestamp with time zone | — | sí |  |  | Borrado lógico: si tiene fecha, el registro se considera eliminado pero se conserva como evidencia. |  |
| `origin_item_id` | uuid | FK | sí |  | instrument_items(id) [origin_item_id → SET NULL] | Ítem del diagnóstico que originó la acción, si lo hubo. |  |

## `instrument_items`

**Área:** Diagnóstico PGIRASA y plan de mejora. **Qué es:** Preguntas o requisitos de cada versión del instrumento. **Módulos:** diagnoses.

| Columna | Tipo | Clave | NULL | Predeterminado | Referencia | Función | Validaciones |
|---|---|---|---|---|---|---|---|
| `id` | uuid | PK, UNIQUE | no | gen_random_uuid() |  | Identificador único de la fila (clave primaria). Es un UUID: un código aleatorio de 128 bits imposible de adivinar, a diferencia de un consecutivo 1, 2, 3. | UNIQUE: instrument_items_version_id_id_key (version_id, id) |
| `version_id` | uuid | FK, UNIQUE | no |  | instrument_versions(id) [version_id → RESTRICT] | Versión a la que pertenece. | UNIQUE: instrument_items_version_id_id_key (version_id, id) \| UNIQUE: instrument_items_version_id_item_code_key (version_id, item_code) |
| `area` | text | — | no |  |  | Área evaluada (residuos, vencimientos, segregación, etc., u obligatorios). | ((area = ANY (ARRAY['residuos'::text, 'vencimientos'::text, 'segregacion'::text, 'personal_capacitacion'::text, 'documentacion'::text, 'obligatorios'::text, 'vencimientos_perdidas'::text, 'capacitacion_documentos'::text, 'seguimiento_mejora'::text]))) |
| `item_code` | text | UNIQUE | no |  |  | Código del ítem (por ejemplo OB-01), único dentro de la versión. | UNIQUE: instrument_items_version_id_item_code_key (version_id, item_code) |
| `prompt_text` | text | — | no |  |  | Texto de la pregunta o requisito. |  |
| `position` | integer | — | no |  |  | Orden de presentación. | (("position" >= 1)) |
| `item_kind` | text | — | no | 'madurez'::text |  | Tipo: obligatorio (requisito normativo) o madurez. | ((item_kind = ANY (ARRAY['obligatorio'::text, 'madurez'::text]))) |
| `legal_basis` | text | — | sí |  |  | Fundamento normativo del requisito (debe verificarse jurídicamente). |  |

## `instrument_versions`

**Área:** Diagnóstico PGIRASA y plan de mejora. **Qué es:** Versiones del instrumento de diagnóstico. **Módulos:** diagnoses.

| Columna | Tipo | Clave | NULL | Predeterminado | Referencia | Función | Validaciones |
|---|---|---|---|---|---|---|---|
| `id` | uuid | PK | no | gen_random_uuid() |  | Identificador único de la fila (clave primaria). Es un UUID: un código aleatorio de 128 bits imposible de adivinar, a diferencia de un consecutivo 1, 2, 3. |  |
| `version_number` | integer | UNIQUE | no |  |  | Número de versión, único. | ((version_number >= 1)) \| UNIQUE: instrument_versions_version_number_key (version_number) |
| `title` | text | — | no |  |  | Título del instrumento. |  |
| `description` | text | — | sí |  |  | Descripción. |  |
| `is_current` | boolean | — | no | false |  | Si es la versión vigente; solo una puede serlo (índice instrument_versions_one_current_uq). |  |
| `published_at` | timestamp with time zone | — | no | now() |  | Fecha de publicación. |  |
| `scoring` | text | — | no | 'likert_avg'::text |  | Forma de calificar: likert_avg (promedio 1 a 5, versión 1) o compliance_ratio (proporción de sí/no, versión 2). | ((scoring = ANY (ARRAY['likert_avg'::text, 'compliance_ratio'::text]))) |

## `local_migrations`

**Área:** Carga masiva de datos y mantenimiento. **Qué es:** Migración de datos que el usuario tenía guardados localmente, con vista previa, confirmación y reversión. **Módulos:** local-migrations.

| Columna | Tipo | Clave | NULL | Predeterminado | Referencia | Función | Validaciones |
|---|---|---|---|---|---|---|---|
| `id` | uuid | PK | no | gen_random_uuid() |  | Identificador único de la fila (clave primaria). Es un UUID: un código aleatorio de 128 bits imposible de adivinar, a diferencia de un consecutivo 1, 2, 3. |  |
| `user_id` | uuid | FK, UNIQUE | no |  | users(id) [user_id → CASCADE] | Usuario que migra. | UNIQUE: local_migrations_content_uq (índice único) |
| `drugstore_id` | uuid | FK | no |  | drugstores(id) [drugstore_id → CASCADE] | Droguería dueña del registro. Es la columna que aísla los datos de cada droguería. |  |
| `content_hash` | text | UNIQUE | no |  |  | Huella SHA-256 del contenido; evita migrar dos veces lo mismo. | ((content_hash ~ '^[a-f0-9]{64}$'::text)) \| UNIQUE: local_migrations_content_uq (índice único) |
| `is_demo` | boolean | UNIQUE | no | false |  | Si los datos migrados son de demostración. | UNIQUE: local_migrations_content_uq (índice único) |
| `phase` | text | — | no | 'pendiente'::text |  | pendiente, confirmada o revertida, con fechas coherentes (regla CHECK). | ((phase = ANY (ARRAY['pendiente'::text, 'confirmada'::text, 'revertida'::text]))) \| ((((phase = 'pendiente'::text) AND (confirmed_at IS NULL) AND (reverted_at IS NULL)) OR ((phase = 'confirmada'::text) AND (confirmed_at IS NOT NULL) AND (reverted_at IS NULL)) OR ((phase = 'revertida'::text) AND (confirmed_at IS NOT NULL) AND (reverted_at IS NOT NULL)))) |
| `payload` | jsonb | — | no |  |  | Datos recibidos, en JSON. |  |
| `summary` | jsonb | — | no |  |  | Resumen por tipo: recibidas, válidas, inválidas y duplicadas. |  |
| `inserted_ids` | jsonb | — | sí |  |  | Identificadores creados; permiten revertir solo lo que se insertó. |  |
| `created_at` | timestamp with time zone | — | no | now() |  | Fecha y hora de creación, con zona horaria. |  |
| `updated_at` | timestamp with time zone | — | no | now() |  | Fecha y hora de la última modificación. |  |
| `confirmed_at` | timestamp with time zone | — | sí |  |  | Momento de la confirmación. | ((((phase = 'pendiente'::text) AND (confirmed_at IS NULL) AND (reverted_at IS NULL)) OR ((phase = 'confirmada'::text) AND (confirmed_at IS NOT NULL) AND (reverted_at IS NULL)) OR ((phase = 'revertida'::text) AND (confirmed_at IS NOT NULL) AND (reverted_at IS NOT NULL)))) |
| `reverted_at` | timestamp with time zone | — | sí |  |  | Momento de la reversión. | ((((phase = 'pendiente'::text) AND (confirmed_at IS NULL) AND (reverted_at IS NULL)) OR ((phase = 'confirmada'::text) AND (confirmed_at IS NOT NULL) AND (reverted_at IS NULL)) OR ((phase = 'revertida'::text) AND (confirmed_at IS NOT NULL) AND (reverted_at IS NOT NULL)))) |

## `password_resets`

**Área:** Identidad, sesiones y auditoría. **Qué es:** Solicitudes de recuperación de contraseña. **Módulos:** auth.

| Columna | Tipo | Clave | NULL | Predeterminado | Referencia | Función | Validaciones |
|---|---|---|---|---|---|---|---|
| `id` | uuid | PK | no | gen_random_uuid() |  | Identificador único de la fila (clave primaria). Es un UUID: un código aleatorio de 128 bits imposible de adivinar, a diferencia de un consecutivo 1, 2, 3. |  |
| `user_id` | uuid | FK | no |  | users(id) [user_id → CASCADE] | Usuario que pidió recuperar la contraseña. |  |
| `token_hash` | text | UNIQUE | no |  |  | Huella del código enviado por correo. | UNIQUE: password_resets_token_hash_key (token_hash) |
| `expires_at` | timestamp with time zone | — | no |  |  | Vencimiento del código. |  |
| `used_at` | timestamp with time zone | — | sí |  |  | Momento en que se usó; un código usado no sirve otra vez. |  |
| `created_at` | timestamp with time zone | — | no | now() |  | Fecha y hora de creación, con zona horaria. |  |

## `schema_migrations`

**Área:** Carga masiva de datos y mantenimiento. **Qué es:** Control de migraciones aplicadas a la base de datos (el historial de cambios del esquema). **Módulos:** db/migrate.ts.

| Columna | Tipo | Clave | NULL | Predeterminado | Referencia | Función | Validaciones |
|---|---|---|---|---|---|---|---|
| `filename` | text | PK | no |  |  | Archivo de migración aplicado (clave primaria). |  |
| `checksum` | text | — | no |  |  | Huella del archivo; detecta si alguien modificó una migración ya aplicada. |  |
| `applied_at` | timestamp with time zone | — | no | now() |  | Cuándo se aplicó. |  |

## `segregation_checks`

**Área:** Operación PGIRASA: vencimientos, residuos y segregación. **Qué es:** Verificaciones de segregación en la fuente: cuántos elementos se revisaron y cuántos estaban bien separados. **Módulos:** segregation, imports, reports.

| Columna | Tipo | Clave | NULL | Predeterminado | Referencia | Función | Validaciones |
|---|---|---|---|---|---|---|---|
| `id` | uuid | PK, UNIQUE | no | gen_random_uuid() |  | Identificador único de la fila (clave primaria). Es un UUID: un código aleatorio de 128 bits imposible de adivinar, a diferencia de un consecutivo 1, 2, 3. | UNIQUE: segregation_checks_tenant_uq (drugstore_id, id) |
| `drugstore_id` | uuid | FK, UNIQUE | no |  | drugstores(id) [drugstore_id → CASCADE] | Droguería dueña del registro. Es la columna que aísla los datos de cada droguería. | UNIQUE: segregation_checks_tenant_uq (drugstore_id, id) |
| `checked_on` | date | — | no |  |  | Fecha de la verificación. | (((checked_on >= '2000-01-01'::date) AND (checked_on <= '2100-12-31'::date))) |
| `items_reviewed` | integer | — | no |  |  | Elementos revisados (al menos 1). | ((items_correct <= items_reviewed)) \| (((items_reviewed >= 1) AND (items_reviewed <= 100000))) |
| `items_correct` | integer | — | no |  |  | Elementos correctamente segregados; nunca más que los revisados (regla CHECK). Correctos ÷ revisados es el indicador de evaluación. | ((items_correct <= items_reviewed)) \| ((items_correct >= 0)) |
| `location` | text | — | no |  |  | Lugar verificado (por ejemplo, el punto ecológico o la bodega). | (((char_length(location) >= 1) AND (char_length(location) <= 120))) |
| `observations` | text | — | sí |  |  | Observaciones. | (((observations IS NULL) OR (char_length(observations) <= 500))) |
| `created_by` | uuid | FK | sí |  | users(id) [created_by → SET NULL] | Usuario que creó el registro (trazabilidad). Queda vacío si ese usuario se elimina. |  |
| `updated_by` | uuid | FK | sí |  | users(id) [updated_by → SET NULL] | Último usuario que modificó el registro (trazabilidad). |  |
| `created_at` | timestamp with time zone | — | no | now() |  | Fecha y hora de creación, con zona horaria. |  |
| `updated_at` | timestamp with time zone | — | no | now() |  | Fecha y hora de la última modificación. |  |
| `deleted_at` | timestamp with time zone | — | sí |  |  | Borrado lógico: si tiene fecha, el registro se considera eliminado pero se conserva como evidencia. |  |

## `sessions`

**Área:** Identidad, sesiones y auditoría. **Qué es:** Sesiones abiertas (cada ingreso desde un navegador). **Módulos:** auth, users, personal-data.

| Columna | Tipo | Clave | NULL | Predeterminado | Referencia | Función | Validaciones |
|---|---|---|---|---|---|---|---|
| `id` | uuid | PK | no | gen_random_uuid() |  | Identificador único de la fila (clave primaria). Es un UUID: un código aleatorio de 128 bits imposible de adivinar, a diferencia de un consecutivo 1, 2, 3. |  |
| `user_id` | uuid | FK | no |  | users(id) [user_id → CASCADE] | Usuario dueño de la sesión. |  |
| `token_hash` | text | UNIQUE | no |  |  | Huella del token de la cookie; el token real solo lo tiene el navegador. | UNIQUE: sessions_token_hash_key (token_hash) |
| `created_at` | timestamp with time zone | — | no | now() |  | Fecha y hora de creación, con zona horaria. |  |
| `last_seen_at` | timestamp with time zone | — | no | now() |  | Última actividad; permite cerrar sesiones inactivas. |  |
| `expires_at` | timestamp with time zone | — | no |  |  | Vencimiento absoluto de la sesión. |  |
| `revoked_at` | timestamp with time zone | — | sí |  |  | Momento en que se cerró la sesión manualmente. |  |

## `support_files`

**Área:** Personal, capacitación y soportes. **Qué es:** Archivos de soporte subidos (PDF, PNG o JPEG de máximo 5 MB). **Módulos:** files, staff.

| Columna | Tipo | Clave | NULL | Predeterminado | Referencia | Función | Validaciones |
|---|---|---|---|---|---|---|---|
| `id` | uuid | PK, UNIQUE | no | gen_random_uuid() |  | Identificador único de la fila (clave primaria). Es un UUID: un código aleatorio de 128 bits imposible de adivinar, a diferencia de un consecutivo 1, 2, 3. | UNIQUE: support_files_tenant_uq (drugstore_id, id) |
| `drugstore_id` | uuid | FK, UNIQUE | no |  | drugstores(id) [drugstore_id → CASCADE] | Droguería dueña del registro. Es la columna que aísla los datos de cada droguería. | UNIQUE: support_files_tenant_uq (drugstore_id, id) |
| `original_name` | text | — | no |  |  | Nombre con el que se subió el archivo. | (((char_length(original_name) >= 1) AND (char_length(original_name) <= 120))) |
| `stored_name` | text | UNIQUE | no |  |  | Nombre aleatorio con el que se guarda en disco (evita colisiones y nombres peligrosos). | ((stored_name ~ '^[a-f0-9]{32}\.(pdf\|png\|jpg)$'::text)) \| UNIQUE: support_files_stored_name_key (stored_name) |
| `mime_type` | text | — | no |  |  | Tipo de archivo detectado por sus bytes iniciales. | ((mime_type = ANY (ARRAY['application/pdf'::text, 'image/png'::text, 'image/jpeg'::text]))) |
| `size_bytes` | integer | — | no |  |  | Tamaño en bytes (máximo 5.242.880). | (((size_bytes >= 1) AND (size_bytes <= 5242880))) |
| `sha256` | text | — | no |  |  | Huella SHA-256 del contenido, para verificar integridad. | ((sha256 ~ '^[a-f0-9]{64}$'::text)) |
| `created_by` | uuid | FK | sí |  | users(id) [created_by → SET NULL] | Usuario que creó el registro (trazabilidad). Queda vacío si ese usuario se elimina. |  |
| `updated_by` | uuid | FK | sí |  | users(id) [updated_by → SET NULL] | Último usuario que modificó el registro (trazabilidad). |  |
| `created_at` | timestamp with time zone | — | no | now() |  | Fecha y hora de creación, con zona horaria. |  |
| `updated_at` | timestamp with time zone | — | no | now() |  | Fecha y hora de la última modificación. |  |
| `deleted_at` | timestamp with time zone | — | sí |  |  | Borrado lógico: si tiene fecha, el registro se considera eliminado pero se conserva como evidencia. |  |

## `training_topics`

**Área:** Personal, capacitación y soportes. **Qué es:** Temas de capacitación definidos por la droguería. **Módulos:** staff, drugstores.

| Columna | Tipo | Clave | NULL | Predeterminado | Referencia | Función | Validaciones |
|---|---|---|---|---|---|---|---|
| `id` | uuid | PK, UNIQUE | no | gen_random_uuid() |  | Identificador único de la fila (clave primaria). Es un UUID: un código aleatorio de 128 bits imposible de adivinar, a diferencia de un consecutivo 1, 2, 3. | UNIQUE: training_topics_tenant_uq (drugstore_id, id) |
| `drugstore_id` | uuid | FK, UNIQUE | no |  | drugstores(id) [drugstore_id → CASCADE] | Droguería dueña del registro. Es la columna que aísla los datos de cada droguería. | UNIQUE: training_topics_tenant_uq (drugstore_id, id) \| UNIQUE: training_topics_name_uq (índice único) |
| `topic_name` | text | UNIQUE | no |  |  | Nombre del tema, único por droguería sin distinguir mayúsculas. | (((char_length(topic_name) >= 2) AND (char_length(topic_name) <= 120))) \| UNIQUE: training_topics_name_uq (índice único) |
| `validity_months` | integer | — | no | 12 |  | Meses de vigencia de la capacitación (1 a 60). | (((validity_months >= 1) AND (validity_months <= 60))) |
| `description` | text | — | sí |  |  | Descripción del tema. | (((description IS NULL) OR (char_length(description) <= 300))) |
| `created_by` | uuid | FK | sí |  | users(id) [created_by → SET NULL] | Usuario que creó el registro (trazabilidad). Queda vacío si ese usuario se elimina. |  |
| `updated_by` | uuid | FK | sí |  | users(id) [updated_by → SET NULL] | Último usuario que modificó el registro (trazabilidad). |  |
| `created_at` | timestamp with time zone | — | no | now() |  | Fecha y hora de creación, con zona horaria. |  |
| `updated_at` | timestamp with time zone | — | no | now() |  | Fecha y hora de la última modificación. |  |
| `deleted_at` | timestamp with time zone | — | sí |  |  | Borrado lógico: si tiene fecha, el registro se considera eliminado pero se conserva como evidencia. |  |

## `trainings`

**Área:** Personal, capacitación y soportes. **Qué es:** Capacitación de un trabajador en un tema. Resuelve la relación muchos a muchos entre workers y training_topics. **Módulos:** staff, files, reports.

| Columna | Tipo | Clave | NULL | Predeterminado | Referencia | Función | Validaciones |
|---|---|---|---|---|---|---|---|
| `id` | uuid | PK, UNIQUE | no | gen_random_uuid() |  | Identificador único de la fila (clave primaria). Es un UUID: un código aleatorio de 128 bits imposible de adivinar, a diferencia de un consecutivo 1, 2, 3. | UNIQUE: trainings_tenant_uq (drugstore_id, id) |
| `drugstore_id` | uuid | FK, UNIQUE | no |  | training_topics(drugstore_id, id) [drugstore_id, topic_id → CASCADE]; workers(drugstore_id, id) [drugstore_id, worker_id → CASCADE]; support_files(drugstore_id, id) [drugstore_id, support_file_id → NO ACTION] | Droguería dueña del registro. Es la columna que aísla los datos de cada droguería. | UNIQUE: trainings_tenant_uq (drugstore_id, id) \| UNIQUE: trainings_worker_topic_uq (índice único) |
| `worker_id` | uuid | FK, UNIQUE | no |  | workers(drugstore_id, id) [drugstore_id, worker_id → CASCADE] | Trabajador capacitado (de la misma droguería, garantizado por la FK compuesta). | UNIQUE: trainings_worker_topic_uq (índice único) |
| `topic_id` | uuid | FK, UNIQUE | no |  | training_topics(drugstore_id, id) [drugstore_id, topic_id → CASCADE] | Tema de la capacitación (de la misma droguería). | UNIQUE: trainings_worker_topic_uq (índice único) |
| `trained_on` | date | — | sí |  |  | Fecha en que se capacitó; vacía significa pendiente. | ((((trained_on IS NULL) AND (valid_until IS NULL)) OR ((trained_on IS NOT NULL) AND (valid_until IS NOT NULL) AND (valid_until >= trained_on)))) |
| `valid_until` | date | — | sí |  |  | Fecha hasta la que es vigente; se exige junto con trained_on y no puede ser anterior a ella. | ((((trained_on IS NULL) AND (valid_until IS NULL)) OR ((trained_on IS NOT NULL) AND (valid_until IS NOT NULL) AND (valid_until >= trained_on)))) |
| `created_by` | uuid | FK | sí |  | users(id) [created_by → SET NULL] | Usuario que creó el registro (trazabilidad). Queda vacío si ese usuario se elimina. |  |
| `updated_by` | uuid | FK | sí |  | users(id) [updated_by → SET NULL] | Último usuario que modificó el registro (trazabilidad). |  |
| `created_at` | timestamp with time zone | — | no | now() |  | Fecha y hora de creación, con zona horaria. |  |
| `updated_at` | timestamp with time zone | — | no | now() |  | Fecha y hora de la última modificación. |  |
| `deleted_at` | timestamp with time zone | — | sí |  |  | Borrado lógico: si tiene fecha, el registro se considera eliminado pero se conserva como evidencia. |  |
| `support_file_id` | uuid | FK | sí |  | support_files(drugstore_id, id) [drugstore_id, support_file_id → NO ACTION] | Archivo de soporte (asistencia o certificado), de la misma droguería. |  |

## `users`

**Área:** Identidad, sesiones y auditoría. **Qué es:** Cuentas de usuario de FARMIX. **Módulos:** auth, users, drugstores, personal-data.

| Columna | Tipo | Clave | NULL | Predeterminado | Referencia | Función | Validaciones |
|---|---|---|---|---|---|---|---|
| `id` | uuid | PK | no | gen_random_uuid() |  | Identificador único de la fila (clave primaria). Es un UUID: un código aleatorio de 128 bits imposible de adivinar, a diferencia de un consecutivo 1, 2, 3. |  |
| `email` | text | UNIQUE | no |  |  | Correo con el que se ingresa. Único sin distinguir mayúsculas (índice users_email_lower_uq). | UNIQUE: users_email_lower_uq (índice único) |
| `password_hash` | text | — | no |  |  | Huella de la contraseña calculada con Argon2id; la contraseña nunca se guarda. |  |
| `full_name` | text | — | no |  |  | Nombre completo de la persona. | (((char_length(full_name) >= 2) AND (char_length(full_name) <= 120))) |
| `privacy_accepted_at` | timestamp with time zone | — | sí |  |  | Momento en que aceptó el aviso de privacidad (tratamiento de datos personales). |  |
| `privacy_version` | text | — | sí |  |  | Versión del aviso de privacidad aceptado. |  |
| `failed_login_count` | integer | — | no | 0 |  | Intentos de ingreso fallidos seguidos; sirve para bloquear ataques de adivinación. | ((failed_login_count >= 0)) |
| `locked_until` | timestamp with time zone | — | sí |  |  | Hasta cuándo está bloqueada la cuenta tras demasiados intentos fallidos. |  |
| `deletion_requested_at` | timestamp with time zone | — | sí |  |  | Cuándo pidió el usuario eliminar su cuenta. | (((deletion_requested_at IS NULL) = (deletion_scheduled_at IS NULL))) |
| `deletion_scheduled_at` | timestamp with time zone | — | sí |  |  | Cuándo se eliminará la cuenta (periodo de gracia de 15 días según la documentación). | (((deletion_requested_at IS NULL) = (deletion_scheduled_at IS NULL))) |
| `created_at` | timestamp with time zone | — | no | now() |  | Fecha y hora de creación, con zona horaria. |  |
| `updated_at` | timestamp with time zone | — | no | now() |  | Fecha y hora de la última modificación. |  |

## `waste_records`

**Área:** Operación PGIRASA: vencimientos, residuos y segregación. **Qué es:** Residuos generados, por clasificación. **Módulos:** waste, imports, reports.

| Columna | Tipo | Clave | NULL | Predeterminado | Referencia | Función | Validaciones |
|---|---|---|---|---|---|---|---|
| `id` | uuid | PK, UNIQUE | no | gen_random_uuid() |  | Identificador único de la fila (clave primaria). Es un UUID: un código aleatorio de 128 bits imposible de adivinar, a diferencia de un consecutivo 1, 2, 3. | UNIQUE: waste_records_tenant_uq (drugstore_id, id) |
| `drugstore_id` | uuid | FK, UNIQUE | no |  | drugstores(id) [drugstore_id → CASCADE] | Droguería dueña del registro. Es la columna que aísla los datos de cada droguería. | UNIQUE: waste_records_tenant_uq (drugstore_id, id) |
| `recorded_on` | date | — | no |  |  | Fecha de generación o registro del residuo. | (((recorded_on >= '2000-01-01'::date) AND (recorded_on <= '2100-12-31'::date))) |
| `classification` | text | — | no |  |  | Clasificación: riesgo biológico, peligroso químico, aprovechable, orgánico aprovechable o no aprovechable. | ((classification = ANY (ARRAY['riesgo_biologico'::text, 'peligroso_quimico'::text, 'aprovechable'::text, 'organico_aprovechable'::text, 'no_aprovechable'::text]))) \| ((NOT ((origin = 'medicamento_vencido'::text) AND (classification = 'riesgo_biologico'::text)))) |
| `quantity` | numeric(10,3) | — | no |  |  | Cantidad, con hasta 3 decimales. | (((quantity > (0)::numeric) AND (quantity <= (100000)::numeric))) |
| `unit` | text | — | no |  |  | Unidad: kg, g o unidades (las unidades no se suman a los kilos). | ((unit = ANY (ARRAY['kg'::text, 'g'::text, 'unidades'::text]))) |
| `origin` | text | — | sí |  |  | Origen: medicamento vencido u otro. Un medicamento vencido no puede ser riesgo biológico (regla CHECK). | ((NOT ((origin = 'medicamento_vencido'::text) AND (classification = 'riesgo_biologico'::text)))) \| ((origin = ANY (ARRAY['medicamento_vencido'::text, 'otro'::text]))) |
| `notes` | text | — | sí |  |  | Observaciones. | (((notes IS NULL) OR (char_length(notes) <= 500))) |
| `created_by` | uuid | FK | sí |  | users(id) [created_by → SET NULL] | Usuario que creó el registro (trazabilidad). Queda vacío si ese usuario se elimina. |  |
| `updated_by` | uuid | FK | sí |  | users(id) [updated_by → SET NULL] | Último usuario que modificó el registro (trazabilidad). |  |
| `created_at` | timestamp with time zone | — | no | now() |  | Fecha y hora de creación, con zona horaria. |  |
| `updated_at` | timestamp with time zone | — | no | now() |  | Fecha y hora de la última modificación. |  |
| `deleted_at` | timestamp with time zone | — | sí |  |  | Borrado lógico: si tiene fecha, el registro se considera eliminado pero se conserva como evidencia. |  |
| `waste_type` | text | — | sí |  |  | Descripción del tipo de residuo. | (((waste_type IS NULL) OR ((char_length(waste_type) >= 1) AND (char_length(waste_type) <= 120)))) |
| `handling` | text | — | sí |  |  | Manejo dado al residuo. | (((handling IS NULL) OR ((char_length(handling) >= 1) AND (char_length(handling) <= 200)))) |
| `support_ref` | text | — | sí |  |  | Referencia al soporte (manifiesto o certificado del gestor). | (((support_ref IS NULL) OR ((char_length(support_ref) >= 1) AND (char_length(support_ref) <= 120)))) |

## `workers`

**Área:** Personal, capacitación y soportes. **Qué es:** Trabajadores de la droguería (no necesitan cuenta en FARMIX). **Módulos:** staff.

| Columna | Tipo | Clave | NULL | Predeterminado | Referencia | Función | Validaciones |
|---|---|---|---|---|---|---|---|
| `id` | uuid | PK, UNIQUE | no | gen_random_uuid() |  | Identificador único de la fila (clave primaria). Es un UUID: un código aleatorio de 128 bits imposible de adivinar, a diferencia de un consecutivo 1, 2, 3. | UNIQUE: workers_tenant_uq (drugstore_id, id) |
| `drugstore_id` | uuid | FK, UNIQUE | no |  | drugstores(id) [drugstore_id → CASCADE] | Droguería dueña del registro. Es la columna que aísla los datos de cada droguería. | UNIQUE: workers_tenant_uq (drugstore_id, id) \| UNIQUE: workers_code_uq (índice único) |
| `worker_code` | text | UNIQUE | no |  |  | Código interno del trabajador, único por droguería. | (((char_length(worker_code) >= 1) AND (char_length(worker_code) <= 30))) \| UNIQUE: workers_code_uq (índice único) |
| `full_name` | text | — | no |  |  | Nombre completo. | (((char_length(full_name) >= 2) AND (char_length(full_name) <= 120))) |
| `job_title` | text | — | sí |  |  | Cargo. | (((job_title IS NULL) OR ((char_length(job_title) >= 1) AND (char_length(job_title) <= 80)))) |
| `created_by` | uuid | FK | sí |  | users(id) [created_by → SET NULL] | Usuario que creó el registro (trazabilidad). Queda vacío si ese usuario se elimina. |  |
| `updated_by` | uuid | FK | sí |  | users(id) [updated_by → SET NULL] | Último usuario que modificó el registro (trazabilidad). |  |
| `created_at` | timestamp with time zone | — | no | now() |  | Fecha y hora de creación, con zona horaria. |  |
| `updated_at` | timestamp with time zone | — | no | now() |  | Fecha y hora de la última modificación. |  |
| `deleted_at` | timestamp with time zone | — | sí |  |  | Borrado lógico: si tiene fecha, el registro se considera eliminado pero se conserva como evidencia. |  |
