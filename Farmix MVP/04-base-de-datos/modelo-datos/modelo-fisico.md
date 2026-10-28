# Modelo físico de FARMIX en PostgreSQL

Generado desde el catálogo. Muestra cómo se implementa cada tabla: tipos, valores predeterminados,
restricciones e índices exactamente como los tiene PostgreSQL.

## `audit_logs`

| Columna | Tipo | NULL | Predeterminado |
|---|---|---|---|
| `id` | bigint | no | nextval('audit_logs_id_seq'::regclass) |
| `user_id` | uuid | sí |  |
| `action` | text | no |  |
| `resource` | text | no |  |
| `resource_id` | text | sí |  |
| `outcome` | text | no |  |
| `request_id` | text | sí |  |
| `created_at` | timestamp with time zone | no | now() |

**Restricciones**

- `audit_logs_outcome_check` (CHECK): `CHECK ((outcome = ANY (ARRAY['success'::text, 'failure'::text])))`
- `audit_logs_user_id_fkey` (FOREIGN KEY): `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL`
- `audit_logs_pkey` (PRIMARY KEY): `PRIMARY KEY (id)`

**Índices**

- `CREATE UNIQUE INDEX audit_logs_pkey ON audit_logs USING btree (id)`
- `CREATE INDEX audit_logs_user_idx ON audit_logs USING btree (user_id, created_at DESC)`

## `dev_mailbox`

| Columna | Tipo | NULL | Predeterminado |
|---|---|---|---|
| `id` | bigint | no | nextval('dev_mailbox_id_seq'::regclass) |
| `to_email` | text | no |  |
| `subject` | text | no |  |
| `body` | text | no |  |
| `created_at` | timestamp with time zone | no | now() |

**Restricciones**

- `dev_mailbox_pkey` (PRIMARY KEY): `PRIMARY KEY (id)`

**Índices**

- `CREATE UNIQUE INDEX dev_mailbox_pkey ON dev_mailbox USING btree (id)`

## `diagnoses`

| Columna | Tipo | NULL | Predeterminado |
|---|---|---|---|
| `id` | uuid | no | gen_random_uuid() |
| `drugstore_id` | uuid | no |  |
| `instrument_version_id` | uuid | no |  |
| `performed_on` | date | no |  |
| `notes` | text | sí |  |
| `created_by` | uuid | sí |  |
| `updated_by` | uuid | sí |  |
| `created_at` | timestamp with time zone | no | now() |
| `updated_at` | timestamp with time zone | no | now() |
| `deleted_at` | timestamp with time zone | sí |  |

**Restricciones**

- `diagnoses_notes_check` (CHECK): `CHECK (((notes IS NULL) OR (char_length(notes) <= 1000)))`
- `diagnoses_performed_on_check` (CHECK): `CHECK (((performed_on >= '2000-01-01'::date) AND (performed_on <= '2100-12-31'::date)))`
- `diagnoses_created_by_fkey` (FOREIGN KEY): `FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL`
- `diagnoses_drugstore_id_fkey` (FOREIGN KEY): `FOREIGN KEY (drugstore_id) REFERENCES drugstores(id) ON DELETE CASCADE`
- `diagnoses_instrument_version_id_fkey` (FOREIGN KEY): `FOREIGN KEY (instrument_version_id) REFERENCES instrument_versions(id) ON DELETE RESTRICT`
- `diagnoses_updated_by_fkey` (FOREIGN KEY): `FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL`
- `diagnoses_pkey` (PRIMARY KEY): `PRIMARY KEY (id)`
- `diagnoses_tenant_uq` (UNIQUE): `UNIQUE (drugstore_id, id)`
- `diagnoses_version_uq` (UNIQUE): `UNIQUE (id, instrument_version_id)`

**Índices**

- `CREATE INDEX diagnoses_date_idx ON diagnoses USING btree (drugstore_id, performed_on DESC) WHERE (deleted_at IS NULL)`
- `CREATE UNIQUE INDEX diagnoses_pkey ON diagnoses USING btree (id)`
- `CREATE UNIQUE INDEX diagnoses_tenant_uq ON diagnoses USING btree (drugstore_id, id)`
- `CREATE UNIQUE INDEX diagnoses_version_uq ON diagnoses USING btree (id, instrument_version_id)`

## `diagnosis_answers`

| Columna | Tipo | NULL | Predeterminado |
|---|---|---|---|
| `id` | uuid | no | gen_random_uuid() |
| `diagnosis_id` | uuid | no |  |
| `version_id` | uuid | no |  |
| `item_id` | uuid | no |  |
| `score` | smallint | sí |  |
| `created_by` | uuid | sí |  |
| `updated_by` | uuid | sí |  |
| `created_at` | timestamp with time zone | no | now() |
| `updated_at` | timestamp with time zone | no | now() |
| `response` | text | sí |  |

**Restricciones**

- `diagnosis_answers_one_value_ck` (CHECK): `CHECK (((score IS NULL) <> (response IS NULL)))`
- `diagnosis_answers_response_check` (CHECK): `CHECK ((response = ANY (ARRAY['si'::text, 'no'::text, 'na'::text])))`
- `diagnosis_answers_score_check` (CHECK): `CHECK (((score >= 1) AND (score <= 5)))`
- `diagnosis_answers_created_by_fkey` (FOREIGN KEY): `FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL`
- `diagnosis_answers_diagnosis_id_version_id_fkey` (FOREIGN KEY): `FOREIGN KEY (diagnosis_id, version_id) REFERENCES diagnoses(id, instrument_version_id) ON DELETE CASCADE`
- `diagnosis_answers_updated_by_fkey` (FOREIGN KEY): `FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL`
- `diagnosis_answers_version_id_item_id_fkey` (FOREIGN KEY): `FOREIGN KEY (version_id, item_id) REFERENCES instrument_items(version_id, id)`
- `diagnosis_answers_pkey` (PRIMARY KEY): `PRIMARY KEY (id)`
- `diagnosis_answers_diagnosis_id_item_id_key` (UNIQUE): `UNIQUE (diagnosis_id, item_id)`

**Índices**

- `CREATE UNIQUE INDEX diagnosis_answers_diagnosis_id_item_id_key ON diagnosis_answers USING btree (diagnosis_id, item_id)`
- `CREATE UNIQUE INDEX diagnosis_answers_pkey ON diagnosis_answers USING btree (id)`

## `diagnosis_area_scores`

| Columna | Tipo | NULL | Predeterminado |
|---|---|---|---|
| `diagnosis_id` | uuid | no |  |
| `area` | text | no |  |
| `area_score` | numeric(2,1) | no |  |
| `answered_count` | integer | no |  |

**Restricciones**

- `diagnosis_area_scores_answered_count_check` (CHECK): `CHECK ((answered_count >= 1))`
- `diagnosis_area_scores_area_check` (CHECK): `CHECK ((area = ANY (ARRAY['residuos'::text, 'vencimientos'::text, 'segregacion'::text, 'personal_capacitacion'::text, 'documentacion'::text, 'vencimientos_perdidas'::text, 'capacitacion_documentos'::text, 'seguimiento_mejora'::text])))`
- `diagnosis_area_scores_area_score_check` (CHECK): `CHECK (((area_score >= (1)::numeric) AND (area_score <= (5)::numeric)))`
- `diagnosis_area_scores_diagnosis_id_fkey` (FOREIGN KEY): `FOREIGN KEY (diagnosis_id) REFERENCES diagnoses(id) ON DELETE CASCADE`
- `diagnosis_area_scores_pkey` (PRIMARY KEY): `PRIMARY KEY (diagnosis_id, area)`

**Índices**

- `CREATE UNIQUE INDEX diagnosis_area_scores_pkey ON diagnosis_area_scores USING btree (diagnosis_id, area)`

## `drugstore_members`

| Columna | Tipo | NULL | Predeterminado |
|---|---|---|---|
| `id` | uuid | no | gen_random_uuid() |
| `drugstore_id` | uuid | no |  |
| `user_id` | uuid | no |  |
| `member_role` | text | no |  |
| `created_by` | uuid | sí |  |
| `updated_by` | uuid | sí |  |
| `created_at` | timestamp with time zone | no | now() |
| `updated_at` | timestamp with time zone | no | now() |
| `deleted_at` | timestamp with time zone | sí |  |

**Restricciones**

- `drugstore_members_member_role_check` (CHECK): `CHECK ((member_role = ANY (ARRAY['propietario'::text, 'administrador'::text, 'operador'::text])))`
- `drugstore_members_created_by_fkey` (FOREIGN KEY): `FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL`
- `drugstore_members_drugstore_id_fkey` (FOREIGN KEY): `FOREIGN KEY (drugstore_id) REFERENCES drugstores(id) ON DELETE CASCADE`
- `drugstore_members_updated_by_fkey` (FOREIGN KEY): `FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL`
- `drugstore_members_user_id_fkey` (FOREIGN KEY): `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
- `drugstore_members_pkey` (PRIMARY KEY): `PRIMARY KEY (id)`

**Índices**

- `CREATE UNIQUE INDEX drugstore_members_active_uq ON drugstore_members USING btree (drugstore_id, user_id) WHERE (deleted_at IS NULL)`
- `CREATE UNIQUE INDEX drugstore_members_owner_uq ON drugstore_members USING btree (drugstore_id) WHERE ((member_role = 'propietario'::text) AND (deleted_at IS NULL))`
- `CREATE UNIQUE INDEX drugstore_members_pkey ON drugstore_members USING btree (id)`
- `CREATE INDEX drugstore_members_user_idx ON drugstore_members USING btree (user_id) WHERE (deleted_at IS NULL)`

## `drugstores`

| Columna | Tipo | NULL | Predeterminado |
|---|---|---|---|
| `id` | uuid | no | gen_random_uuid() |
| `name` | text | no |  |
| `city` | text | no | 'Sincelejo'::text |
| `expiry_alert_days` | integer | no | 60 |
| `created_by` | uuid | sí |  |
| `updated_by` | uuid | sí |  |
| `created_at` | timestamp with time zone | no | now() |
| `updated_at` | timestamp with time zone | no | now() |
| `deleted_at` | timestamp with time zone | sí |  |
| `employee_count` | integer | sí |  |
| `is_demo` | boolean | no | false |

**Restricciones**

- `drugstores_city_check` (CHECK): `CHECK (((char_length(city) >= 2) AND (char_length(city) <= 80)))`
- `drugstores_employee_count_check` (CHECK): `CHECK (((employee_count IS NULL) OR ((employee_count >= 0) AND (employee_count <= 10000))))`
- `drugstores_expiry_alert_days_check` (CHECK): `CHECK (((expiry_alert_days >= 1) AND (expiry_alert_days <= 365)))`
- `drugstores_name_check` (CHECK): `CHECK (((char_length(name) >= 2) AND (char_length(name) <= 120)))`
- `drugstores_created_by_fkey` (FOREIGN KEY): `FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL`
- `drugstores_updated_by_fkey` (FOREIGN KEY): `FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL`
- `drugstores_pkey` (PRIMARY KEY): `PRIMARY KEY (id)`

**Índices**

- `CREATE UNIQUE INDEX drugstores_pkey ON drugstores USING btree (id)`

## `expiration_products`

| Columna | Tipo | NULL | Predeterminado |
|---|---|---|---|
| `id` | uuid | no | gen_random_uuid() |
| `drugstore_id` | uuid | no |  |
| `product_name` | text | no |  |
| `batch` | text | no |  |
| `sanitary_registry` | text | sí |  |
| `holder` | text | sí |  |
| `expires_on` | date | no |  |
| `quantity` | integer | no |  |
| `unit_cost` | numeric(12,2) | no | 0 |
| `destination` | text | no | 'pendiente'::text |
| `managed_at` | timestamp with time zone | sí |  |
| `created_by` | uuid | sí |  |
| `updated_by` | uuid | sí |  |
| `created_at` | timestamp with time zone | no | now() |
| `updated_at` | timestamp with time zone | no | now() |
| `deleted_at` | timestamp with time zone | sí |  |
| `support_ref` | text | sí |  |

**Restricciones**

- `expiration_products_batch_check` (CHECK): `CHECK (((char_length(batch) >= 1) AND (char_length(batch) <= 60)))`
- `expiration_products_destination_check` (CHECK): `CHECK ((destination = ANY (ARRAY['pendiente'::text, 'devuelto_proveedor'::text, 'destruccion_gestor'::text, 'averia_deterioro'::text])))`
- `expiration_products_expires_on_check` (CHECK): `CHECK (((expires_on >= '2000-01-01'::date) AND (expires_on <= '2100-12-31'::date)))`
- `expiration_products_holder_check` (CHECK): `CHECK (((holder IS NULL) OR ((char_length(holder) >= 1) AND (char_length(holder) <= 120))))`
- `expiration_products_managed_ck` (CHECK): `CHECK (((destination = 'pendiente'::text) = (managed_at IS NULL)))`
- `expiration_products_product_name_check` (CHECK): `CHECK (((char_length(product_name) >= 1) AND (char_length(product_name) <= 160)))`
- `expiration_products_quantity_check` (CHECK): `CHECK (((quantity >= 1) AND (quantity <= 1000000)))`
- `expiration_products_sanitary_registry_check` (CHECK): `CHECK (((sanitary_registry IS NULL) OR ((char_length(sanitary_registry) >= 1) AND (char_length(sanitary_registry) <= 60))))`
- `expiration_products_support_ref_check` (CHECK): `CHECK (((support_ref IS NULL) OR ((char_length(support_ref) >= 1) AND (char_length(support_ref) <= 120))))`
- `expiration_products_unit_cost_check` (CHECK): `CHECK ((unit_cost >= (0)::numeric))`
- `expiration_products_created_by_fkey` (FOREIGN KEY): `FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL`
- `expiration_products_drugstore_id_fkey` (FOREIGN KEY): `FOREIGN KEY (drugstore_id) REFERENCES drugstores(id) ON DELETE CASCADE`
- `expiration_products_updated_by_fkey` (FOREIGN KEY): `FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL`
- `expiration_products_pkey` (PRIMARY KEY): `PRIMARY KEY (id)`
- `expiration_products_tenant_uq` (UNIQUE): `UNIQUE (drugstore_id, id)`

**Índices**

- `CREATE UNIQUE INDEX expiration_products_batch_uq ON expiration_products USING btree (drugstore_id, lower(product_name), lower(batch)) WHERE (deleted_at IS NULL)`
- `CREATE INDEX expiration_products_expiry_idx ON expiration_products USING btree (drugstore_id, expires_on) WHERE (deleted_at IS NULL)`
- `CREATE UNIQUE INDEX expiration_products_pkey ON expiration_products USING btree (id)`
- `CREATE UNIQUE INDEX expiration_products_tenant_uq ON expiration_products USING btree (drugstore_id, id)`

## `imports`

| Columna | Tipo | NULL | Predeterminado |
|---|---|---|---|
| `id` | uuid | no | gen_random_uuid() |
| `drugstore_id` | uuid | no |  |
| `kind` | text | no |  |
| `file_name` | text | no |  |
| `phase` | text | no | 'vista_previa'::text |
| `total_rows` | integer | no |  |
| `valid_rows` | integer | no |  |
| `invalid_rows` | integer | no |  |
| `duplicate_rows` | integer | no |  |
| `row_results` | jsonb | no |  |
| `inserted_count` | integer | sí |  |
| `expires_at` | timestamp with time zone | no |  |
| `confirmed_at` | timestamp with time zone | sí |  |
| `created_by` | uuid | sí |  |
| `updated_by` | uuid | sí |  |
| `created_at` | timestamp with time zone | no | now() |
| `updated_at` | timestamp with time zone | no | now() |
| `deleted_at` | timestamp with time zone | sí |  |

**Restricciones**

- `imports_confirmed_ck` (CHECK): `CHECK (((phase = 'confirmada'::text) = (confirmed_at IS NOT NULL)))`
- `imports_duplicate_rows_check` (CHECK): `CHECK ((duplicate_rows >= 0))`
- `imports_file_name_check` (CHECK): `CHECK (((char_length(file_name) >= 1) AND (char_length(file_name) <= 120)))`
- `imports_invalid_rows_check` (CHECK): `CHECK ((invalid_rows >= 0))`
- `imports_kind_check` (CHECK): `CHECK ((kind = ANY (ARRAY['expirations'::text, 'waste'::text, 'segregation'::text])))`
- `imports_phase_check` (CHECK): `CHECK ((phase = ANY (ARRAY['vista_previa'::text, 'confirmada'::text])))`
- `imports_total_rows_check` (CHECK): `CHECK ((total_rows >= 0))`
- `imports_valid_rows_check` (CHECK): `CHECK ((valid_rows >= 0))`
- `imports_created_by_fkey` (FOREIGN KEY): `FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL`
- `imports_drugstore_id_fkey` (FOREIGN KEY): `FOREIGN KEY (drugstore_id) REFERENCES drugstores(id) ON DELETE CASCADE`
- `imports_updated_by_fkey` (FOREIGN KEY): `FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL`
- `imports_pkey` (PRIMARY KEY): `PRIMARY KEY (id)`
- `imports_tenant_uq` (UNIQUE): `UNIQUE (drugstore_id, id)`

**Índices**

- `CREATE INDEX imports_drugstore_idx ON imports USING btree (drugstore_id, created_at DESC) WHERE (deleted_at IS NULL)`
- `CREATE UNIQUE INDEX imports_pkey ON imports USING btree (id)`
- `CREATE UNIQUE INDEX imports_tenant_uq ON imports USING btree (drugstore_id, id)`

## `improvement_actions`

| Columna | Tipo | NULL | Predeterminado |
|---|---|---|---|
| `id` | uuid | no | gen_random_uuid() |
| `drugstore_id` | uuid | no |  |
| `finding` | text | no |  |
| `corrective_action` | text | sí |  |
| `responsible` | text | sí |  |
| `due_on` | date | sí |  |
| `progress_state` | text | no | 'pendiente'::text |
| `closed_on` | date | sí |  |
| `created_by` | uuid | sí |  |
| `updated_by` | uuid | sí |  |
| `created_at` | timestamp with time zone | no | now() |
| `updated_at` | timestamp with time zone | no | now() |
| `deleted_at` | timestamp with time zone | sí |  |
| `origin_item_id` | uuid | sí |  |

**Restricciones**

- `improvement_actions_closed_ck` (CHECK): `CHECK (((progress_state = 'cerrada'::text) = (closed_on IS NOT NULL)))`
- `improvement_actions_corrective_action_check` (CHECK): `CHECK (((char_length(corrective_action) >= 3) AND (char_length(corrective_action) <= 500)))`
- `improvement_actions_due_on_check` (CHECK): `CHECK (((due_on >= '2000-01-01'::date) AND (due_on <= '2100-12-31'::date)))`
- `improvement_actions_finding_check` (CHECK): `CHECK (((char_length(finding) >= 3) AND (char_length(finding) <= 500)))`
- `improvement_actions_progress_state_check` (CHECK): `CHECK ((progress_state = ANY (ARRAY['pendiente'::text, 'en_curso'::text, 'cerrada'::text])))`
- `improvement_actions_responsible_check` (CHECK): `CHECK (((char_length(responsible) >= 2) AND (char_length(responsible) <= 120)))`
- `improvement_actions_created_by_fkey` (FOREIGN KEY): `FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL`
- `improvement_actions_drugstore_id_fkey` (FOREIGN KEY): `FOREIGN KEY (drugstore_id) REFERENCES drugstores(id) ON DELETE CASCADE`
- `improvement_actions_origin_item_id_fkey` (FOREIGN KEY): `FOREIGN KEY (origin_item_id) REFERENCES instrument_items(id) ON DELETE SET NULL`
- `improvement_actions_updated_by_fkey` (FOREIGN KEY): `FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL`
- `improvement_actions_pkey` (PRIMARY KEY): `PRIMARY KEY (id)`
- `improvement_actions_tenant_uq` (UNIQUE): `UNIQUE (drugstore_id, id)`

**Índices**

- `CREATE INDEX improvement_actions_due_idx ON improvement_actions USING btree (drugstore_id, due_on) WHERE (deleted_at IS NULL)`
- `CREATE UNIQUE INDEX improvement_actions_pkey ON improvement_actions USING btree (id)`
- `CREATE UNIQUE INDEX improvement_actions_tenant_uq ON improvement_actions USING btree (drugstore_id, id)`

## `instrument_items`

| Columna | Tipo | NULL | Predeterminado |
|---|---|---|---|
| `id` | uuid | no | gen_random_uuid() |
| `version_id` | uuid | no |  |
| `area` | text | no |  |
| `item_code` | text | no |  |
| `prompt_text` | text | no |  |
| `position` | integer | no |  |
| `item_kind` | text | no | 'madurez'::text |
| `legal_basis` | text | sí |  |

**Restricciones**

- `instrument_items_area_check` (CHECK): `CHECK ((area = ANY (ARRAY['residuos'::text, 'vencimientos'::text, 'segregacion'::text, 'personal_capacitacion'::text, 'documentacion'::text, 'obligatorios'::text, 'vencimientos_perdidas'::text, 'capacitacion_documentos'::text, 'seguimiento_mejora'::text])))`
- `instrument_items_item_kind_check` (CHECK): `CHECK ((item_kind = ANY (ARRAY['obligatorio'::text, 'madurez'::text])))`
- `instrument_items_position_check` (CHECK): `CHECK (("position" >= 1))`
- `instrument_items_version_id_fkey` (FOREIGN KEY): `FOREIGN KEY (version_id) REFERENCES instrument_versions(id) ON DELETE RESTRICT`
- `instrument_items_pkey` (PRIMARY KEY): `PRIMARY KEY (id)`
- `instrument_items_version_id_id_key` (UNIQUE): `UNIQUE (version_id, id)`
- `instrument_items_version_id_item_code_key` (UNIQUE): `UNIQUE (version_id, item_code)`

**Índices**

- `CREATE UNIQUE INDEX instrument_items_pkey ON instrument_items USING btree (id)`
- `CREATE UNIQUE INDEX instrument_items_version_id_id_key ON instrument_items USING btree (version_id, id)`
- `CREATE UNIQUE INDEX instrument_items_version_id_item_code_key ON instrument_items USING btree (version_id, item_code)`

## `instrument_versions`

| Columna | Tipo | NULL | Predeterminado |
|---|---|---|---|
| `id` | uuid | no | gen_random_uuid() |
| `version_number` | integer | no |  |
| `title` | text | no |  |
| `description` | text | sí |  |
| `is_current` | boolean | no | false |
| `published_at` | timestamp with time zone | no | now() |
| `scoring` | text | no | 'likert_avg'::text |

**Restricciones**

- `instrument_versions_scoring_check` (CHECK): `CHECK ((scoring = ANY (ARRAY['likert_avg'::text, 'compliance_ratio'::text])))`
- `instrument_versions_version_number_check` (CHECK): `CHECK ((version_number >= 1))`
- `instrument_versions_pkey` (PRIMARY KEY): `PRIMARY KEY (id)`
- `instrument_versions_version_number_key` (UNIQUE): `UNIQUE (version_number)`

**Índices**

- `CREATE UNIQUE INDEX instrument_versions_one_current_uq ON instrument_versions USING btree ((true)) WHERE is_current`
- `CREATE UNIQUE INDEX instrument_versions_pkey ON instrument_versions USING btree (id)`
- `CREATE UNIQUE INDEX instrument_versions_version_number_key ON instrument_versions USING btree (version_number)`

## `local_migrations`

| Columna | Tipo | NULL | Predeterminado |
|---|---|---|---|
| `id` | uuid | no | gen_random_uuid() |
| `user_id` | uuid | no |  |
| `drugstore_id` | uuid | no |  |
| `content_hash` | text | no |  |
| `is_demo` | boolean | no | false |
| `phase` | text | no | 'pendiente'::text |
| `payload` | jsonb | no |  |
| `summary` | jsonb | no |  |
| `inserted_ids` | jsonb | sí |  |
| `created_at` | timestamp with time zone | no | now() |
| `updated_at` | timestamp with time zone | no | now() |
| `confirmed_at` | timestamp with time zone | sí |  |
| `reverted_at` | timestamp with time zone | sí |  |

**Restricciones**

- `local_migrations_content_hash_check` (CHECK): `CHECK ((content_hash ~ '^[a-f0-9]{64}$'::text))`
- `local_migrations_phase_check` (CHECK): `CHECK ((phase = ANY (ARRAY['pendiente'::text, 'confirmada'::text, 'revertida'::text])))`
- `local_migrations_phase_ck` (CHECK): `CHECK ((((phase = 'pendiente'::text) AND (confirmed_at IS NULL) AND (reverted_at IS NULL)) OR ((phase = 'confirmada'::text) AND (confirmed_at IS NOT NULL) AND (reverted_at IS NULL)) OR ((phase = 'revertida'::text) AND (confirmed_at IS NOT NULL) AND (reverted_at IS NOT NULL))))`
- `local_migrations_drugstore_id_fkey` (FOREIGN KEY): `FOREIGN KEY (drugstore_id) REFERENCES drugstores(id) ON DELETE CASCADE`
- `local_migrations_user_id_fkey` (FOREIGN KEY): `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
- `local_migrations_pkey` (PRIMARY KEY): `PRIMARY KEY (id)`

**Índices**

- `CREATE UNIQUE INDEX local_migrations_content_uq ON local_migrations USING btree (user_id, content_hash, is_demo) WHERE (phase <> 'revertida'::text)`
- `CREATE UNIQUE INDEX local_migrations_pkey ON local_migrations USING btree (id)`

## `password_resets`

| Columna | Tipo | NULL | Predeterminado |
|---|---|---|---|
| `id` | uuid | no | gen_random_uuid() |
| `user_id` | uuid | no |  |
| `token_hash` | text | no |  |
| `expires_at` | timestamp with time zone | no |  |
| `used_at` | timestamp with time zone | sí |  |
| `created_at` | timestamp with time zone | no | now() |

**Restricciones**

- `password_resets_user_id_fkey` (FOREIGN KEY): `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
- `password_resets_pkey` (PRIMARY KEY): `PRIMARY KEY (id)`
- `password_resets_token_hash_key` (UNIQUE): `UNIQUE (token_hash)`

**Índices**

- `CREATE UNIQUE INDEX password_resets_pkey ON password_resets USING btree (id)`
- `CREATE UNIQUE INDEX password_resets_token_hash_key ON password_resets USING btree (token_hash)`
- `CREATE INDEX password_resets_user_idx ON password_resets USING btree (user_id)`

## `schema_migrations`

| Columna | Tipo | NULL | Predeterminado |
|---|---|---|---|
| `filename` | text | no |  |
| `checksum` | text | no |  |
| `applied_at` | timestamp with time zone | no | now() |

**Restricciones**

- `schema_migrations_pkey` (PRIMARY KEY): `PRIMARY KEY (filename)`

**Índices**

- `CREATE UNIQUE INDEX schema_migrations_pkey ON schema_migrations USING btree (filename)`

## `segregation_checks`

| Columna | Tipo | NULL | Predeterminado |
|---|---|---|---|
| `id` | uuid | no | gen_random_uuid() |
| `drugstore_id` | uuid | no |  |
| `checked_on` | date | no |  |
| `items_reviewed` | integer | no |  |
| `items_correct` | integer | no |  |
| `location` | text | no |  |
| `observations` | text | sí |  |
| `created_by` | uuid | sí |  |
| `updated_by` | uuid | sí |  |
| `created_at` | timestamp with time zone | no | now() |
| `updated_at` | timestamp with time zone | no | now() |
| `deleted_at` | timestamp with time zone | sí |  |

**Restricciones**

- `segregation_checks_checked_on_check` (CHECK): `CHECK (((checked_on >= '2000-01-01'::date) AND (checked_on <= '2100-12-31'::date)))`
- `segregation_checks_correct_le_reviewed_ck` (CHECK): `CHECK ((items_correct <= items_reviewed))`
- `segregation_checks_items_correct_check` (CHECK): `CHECK ((items_correct >= 0))`
- `segregation_checks_items_reviewed_check` (CHECK): `CHECK (((items_reviewed >= 1) AND (items_reviewed <= 100000)))`
- `segregation_checks_location_check` (CHECK): `CHECK (((char_length(location) >= 1) AND (char_length(location) <= 120)))`
- `segregation_checks_observations_check` (CHECK): `CHECK (((observations IS NULL) OR (char_length(observations) <= 500)))`
- `segregation_checks_created_by_fkey` (FOREIGN KEY): `FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL`
- `segregation_checks_drugstore_id_fkey` (FOREIGN KEY): `FOREIGN KEY (drugstore_id) REFERENCES drugstores(id) ON DELETE CASCADE`
- `segregation_checks_updated_by_fkey` (FOREIGN KEY): `FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL`
- `segregation_checks_pkey` (PRIMARY KEY): `PRIMARY KEY (id)`
- `segregation_checks_tenant_uq` (UNIQUE): `UNIQUE (drugstore_id, id)`

**Índices**

- `CREATE INDEX segregation_checks_date_idx ON segregation_checks USING btree (drugstore_id, checked_on DESC) WHERE (deleted_at IS NULL)`
- `CREATE UNIQUE INDEX segregation_checks_pkey ON segregation_checks USING btree (id)`
- `CREATE UNIQUE INDEX segregation_checks_tenant_uq ON segregation_checks USING btree (drugstore_id, id)`

## `sessions`

| Columna | Tipo | NULL | Predeterminado |
|---|---|---|---|
| `id` | uuid | no | gen_random_uuid() |
| `user_id` | uuid | no |  |
| `token_hash` | text | no |  |
| `created_at` | timestamp with time zone | no | now() |
| `last_seen_at` | timestamp with time zone | no | now() |
| `expires_at` | timestamp with time zone | no |  |
| `revoked_at` | timestamp with time zone | sí |  |

**Restricciones**

- `sessions_user_id_fkey` (FOREIGN KEY): `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
- `sessions_pkey` (PRIMARY KEY): `PRIMARY KEY (id)`
- `sessions_token_hash_key` (UNIQUE): `UNIQUE (token_hash)`

**Índices**

- `CREATE UNIQUE INDEX sessions_pkey ON sessions USING btree (id)`
- `CREATE UNIQUE INDEX sessions_token_hash_key ON sessions USING btree (token_hash)`
- `CREATE INDEX sessions_user_idx ON sessions USING btree (user_id)`

## `support_files`

| Columna | Tipo | NULL | Predeterminado |
|---|---|---|---|
| `id` | uuid | no | gen_random_uuid() |
| `drugstore_id` | uuid | no |  |
| `original_name` | text | no |  |
| `stored_name` | text | no |  |
| `mime_type` | text | no |  |
| `size_bytes` | integer | no |  |
| `sha256` | text | no |  |
| `created_by` | uuid | sí |  |
| `updated_by` | uuid | sí |  |
| `created_at` | timestamp with time zone | no | now() |
| `updated_at` | timestamp with time zone | no | now() |
| `deleted_at` | timestamp with time zone | sí |  |

**Restricciones**

- `support_files_mime_type_check` (CHECK): `CHECK ((mime_type = ANY (ARRAY['application/pdf'::text, 'image/png'::text, 'image/jpeg'::text])))`
- `support_files_original_name_check` (CHECK): `CHECK (((char_length(original_name) >= 1) AND (char_length(original_name) <= 120)))`
- `support_files_sha256_check` (CHECK): `CHECK ((sha256 ~ '^[a-f0-9]{64}$'::text))`
- `support_files_size_bytes_check` (CHECK): `CHECK (((size_bytes >= 1) AND (size_bytes <= 5242880)))`
- `support_files_stored_name_check` (CHECK): `CHECK ((stored_name ~ '^[a-f0-9]{32}\.(pdf|png|jpg)$'::text))`
- `support_files_created_by_fkey` (FOREIGN KEY): `FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL`
- `support_files_drugstore_id_fkey` (FOREIGN KEY): `FOREIGN KEY (drugstore_id) REFERENCES drugstores(id) ON DELETE CASCADE`
- `support_files_updated_by_fkey` (FOREIGN KEY): `FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL`
- `support_files_pkey` (PRIMARY KEY): `PRIMARY KEY (id)`
- `support_files_stored_name_key` (UNIQUE): `UNIQUE (stored_name)`
- `support_files_tenant_uq` (UNIQUE): `UNIQUE (drugstore_id, id)`

**Índices**

- `CREATE UNIQUE INDEX support_files_pkey ON support_files USING btree (id)`
- `CREATE UNIQUE INDEX support_files_stored_name_key ON support_files USING btree (stored_name)`
- `CREATE UNIQUE INDEX support_files_tenant_uq ON support_files USING btree (drugstore_id, id)`

## `training_topics`

| Columna | Tipo | NULL | Predeterminado |
|---|---|---|---|
| `id` | uuid | no | gen_random_uuid() |
| `drugstore_id` | uuid | no |  |
| `topic_name` | text | no |  |
| `validity_months` | integer | no | 12 |
| `description` | text | sí |  |
| `created_by` | uuid | sí |  |
| `updated_by` | uuid | sí |  |
| `created_at` | timestamp with time zone | no | now() |
| `updated_at` | timestamp with time zone | no | now() |
| `deleted_at` | timestamp with time zone | sí |  |

**Restricciones**

- `training_topics_description_check` (CHECK): `CHECK (((description IS NULL) OR (char_length(description) <= 300)))`
- `training_topics_topic_name_check` (CHECK): `CHECK (((char_length(topic_name) >= 2) AND (char_length(topic_name) <= 120)))`
- `training_topics_validity_months_check` (CHECK): `CHECK (((validity_months >= 1) AND (validity_months <= 60)))`
- `training_topics_created_by_fkey` (FOREIGN KEY): `FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL`
- `training_topics_drugstore_id_fkey` (FOREIGN KEY): `FOREIGN KEY (drugstore_id) REFERENCES drugstores(id) ON DELETE CASCADE`
- `training_topics_updated_by_fkey` (FOREIGN KEY): `FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL`
- `training_topics_pkey` (PRIMARY KEY): `PRIMARY KEY (id)`
- `training_topics_tenant_uq` (UNIQUE): `UNIQUE (drugstore_id, id)`

**Índices**

- `CREATE UNIQUE INDEX training_topics_name_uq ON training_topics USING btree (drugstore_id, lower(topic_name)) WHERE (deleted_at IS NULL)`
- `CREATE UNIQUE INDEX training_topics_pkey ON training_topics USING btree (id)`
- `CREATE UNIQUE INDEX training_topics_tenant_uq ON training_topics USING btree (drugstore_id, id)`

## `trainings`

| Columna | Tipo | NULL | Predeterminado |
|---|---|---|---|
| `id` | uuid | no | gen_random_uuid() |
| `drugstore_id` | uuid | no |  |
| `worker_id` | uuid | no |  |
| `topic_id` | uuid | no |  |
| `trained_on` | date | sí |  |
| `valid_until` | date | sí |  |
| `created_by` | uuid | sí |  |
| `updated_by` | uuid | sí |  |
| `created_at` | timestamp with time zone | no | now() |
| `updated_at` | timestamp with time zone | no | now() |
| `deleted_at` | timestamp with time zone | sí |  |
| `support_file_id` | uuid | sí |  |

**Restricciones**

- `trainings_dates_ck` (CHECK): `CHECK ((((trained_on IS NULL) AND (valid_until IS NULL)) OR ((trained_on IS NOT NULL) AND (valid_until IS NOT NULL) AND (valid_until >= trained_on))))`
- `trainings_created_by_fkey` (FOREIGN KEY): `FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL`
- `trainings_drugstore_id_topic_id_fkey` (FOREIGN KEY): `FOREIGN KEY (drugstore_id, topic_id) REFERENCES training_topics(drugstore_id, id) ON DELETE CASCADE`
- `trainings_drugstore_id_worker_id_fkey` (FOREIGN KEY): `FOREIGN KEY (drugstore_id, worker_id) REFERENCES workers(drugstore_id, id) ON DELETE CASCADE`
- `trainings_support_file_fk` (FOREIGN KEY): `FOREIGN KEY (drugstore_id, support_file_id) REFERENCES support_files(drugstore_id, id)`
- `trainings_updated_by_fkey` (FOREIGN KEY): `FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL`
- `trainings_pkey` (PRIMARY KEY): `PRIMARY KEY (id)`
- `trainings_tenant_uq` (UNIQUE): `UNIQUE (drugstore_id, id)`

**Índices**

- `CREATE UNIQUE INDEX trainings_pkey ON trainings USING btree (id)`
- `CREATE UNIQUE INDEX trainings_tenant_uq ON trainings USING btree (drugstore_id, id)`
- `CREATE UNIQUE INDEX trainings_worker_topic_uq ON trainings USING btree (drugstore_id, worker_id, topic_id) WHERE (deleted_at IS NULL)`

## `users`

| Columna | Tipo | NULL | Predeterminado |
|---|---|---|---|
| `id` | uuid | no | gen_random_uuid() |
| `email` | text | no |  |
| `password_hash` | text | no |  |
| `full_name` | text | no |  |
| `privacy_accepted_at` | timestamp with time zone | sí |  |
| `privacy_version` | text | sí |  |
| `failed_login_count` | integer | no | 0 |
| `locked_until` | timestamp with time zone | sí |  |
| `deletion_requested_at` | timestamp with time zone | sí |  |
| `deletion_scheduled_at` | timestamp with time zone | sí |  |
| `created_at` | timestamp with time zone | no | now() |
| `updated_at` | timestamp with time zone | no | now() |

**Restricciones**

- `users_deletion_pair` (CHECK): `CHECK (((deletion_requested_at IS NULL) = (deletion_scheduled_at IS NULL)))`
- `users_failed_login_count_check` (CHECK): `CHECK ((failed_login_count >= 0))`
- `users_full_name_check` (CHECK): `CHECK (((char_length(full_name) >= 2) AND (char_length(full_name) <= 120)))`
- `users_pkey` (PRIMARY KEY): `PRIMARY KEY (id)`

**Índices**

- `CREATE INDEX users_deletion_scheduled_idx ON users USING btree (deletion_scheduled_at) WHERE (deletion_scheduled_at IS NOT NULL)`
- `CREATE UNIQUE INDEX users_email_lower_uq ON users USING btree (lower(email))`
- `CREATE UNIQUE INDEX users_pkey ON users USING btree (id)`

## `waste_records`

| Columna | Tipo | NULL | Predeterminado |
|---|---|---|---|
| `id` | uuid | no | gen_random_uuid() |
| `drugstore_id` | uuid | no |  |
| `recorded_on` | date | no |  |
| `classification` | text | no |  |
| `quantity` | numeric(10,3) | no |  |
| `unit` | text | no |  |
| `origin` | text | sí |  |
| `notes` | text | sí |  |
| `created_by` | uuid | sí |  |
| `updated_by` | uuid | sí |  |
| `created_at` | timestamp with time zone | no | now() |
| `updated_at` | timestamp with time zone | no | now() |
| `deleted_at` | timestamp with time zone | sí |  |
| `waste_type` | text | sí |  |
| `handling` | text | sí |  |
| `support_ref` | text | sí |  |

**Restricciones**

- `waste_records_classification_check` (CHECK): `CHECK ((classification = ANY (ARRAY['riesgo_biologico'::text, 'peligroso_quimico'::text, 'aprovechable'::text, 'organico_aprovechable'::text, 'no_aprovechable'::text])))`
- `waste_records_expired_med_ck` (CHECK): `CHECK ((NOT ((origin = 'medicamento_vencido'::text) AND (classification = 'riesgo_biologico'::text))))`
- `waste_records_handling_check` (CHECK): `CHECK (((handling IS NULL) OR ((char_length(handling) >= 1) AND (char_length(handling) <= 200))))`
- `waste_records_notes_check` (CHECK): `CHECK (((notes IS NULL) OR (char_length(notes) <= 500)))`
- `waste_records_origin_check` (CHECK): `CHECK ((origin = ANY (ARRAY['medicamento_vencido'::text, 'otro'::text])))`
- `waste_records_quantity_check` (CHECK): `CHECK (((quantity > (0)::numeric) AND (quantity <= (100000)::numeric)))`
- `waste_records_recorded_on_check` (CHECK): `CHECK (((recorded_on >= '2000-01-01'::date) AND (recorded_on <= '2100-12-31'::date)))`
- `waste_records_support_ref_check` (CHECK): `CHECK (((support_ref IS NULL) OR ((char_length(support_ref) >= 1) AND (char_length(support_ref) <= 120))))`
- `waste_records_unit_check` (CHECK): `CHECK ((unit = ANY (ARRAY['kg'::text, 'g'::text, 'unidades'::text])))`
- `waste_records_waste_type_check` (CHECK): `CHECK (((waste_type IS NULL) OR ((char_length(waste_type) >= 1) AND (char_length(waste_type) <= 120))))`
- `waste_records_created_by_fkey` (FOREIGN KEY): `FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL`
- `waste_records_drugstore_id_fkey` (FOREIGN KEY): `FOREIGN KEY (drugstore_id) REFERENCES drugstores(id) ON DELETE CASCADE`
- `waste_records_updated_by_fkey` (FOREIGN KEY): `FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL`
- `waste_records_pkey` (PRIMARY KEY): `PRIMARY KEY (id)`
- `waste_records_tenant_uq` (UNIQUE): `UNIQUE (drugstore_id, id)`

**Índices**

- `CREATE INDEX waste_records_date_idx ON waste_records USING btree (drugstore_id, recorded_on DESC) WHERE (deleted_at IS NULL)`
- `CREATE UNIQUE INDEX waste_records_pkey ON waste_records USING btree (id)`
- `CREATE UNIQUE INDEX waste_records_tenant_uq ON waste_records USING btree (drugstore_id, id)`

## `workers`

| Columna | Tipo | NULL | Predeterminado |
|---|---|---|---|
| `id` | uuid | no | gen_random_uuid() |
| `drugstore_id` | uuid | no |  |
| `worker_code` | text | no |  |
| `full_name` | text | no |  |
| `job_title` | text | sí |  |
| `created_by` | uuid | sí |  |
| `updated_by` | uuid | sí |  |
| `created_at` | timestamp with time zone | no | now() |
| `updated_at` | timestamp with time zone | no | now() |
| `deleted_at` | timestamp with time zone | sí |  |

**Restricciones**

- `workers_full_name_check` (CHECK): `CHECK (((char_length(full_name) >= 2) AND (char_length(full_name) <= 120)))`
- `workers_job_title_check` (CHECK): `CHECK (((job_title IS NULL) OR ((char_length(job_title) >= 1) AND (char_length(job_title) <= 80))))`
- `workers_worker_code_check` (CHECK): `CHECK (((char_length(worker_code) >= 1) AND (char_length(worker_code) <= 30)))`
- `workers_created_by_fkey` (FOREIGN KEY): `FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL`
- `workers_drugstore_id_fkey` (FOREIGN KEY): `FOREIGN KEY (drugstore_id) REFERENCES drugstores(id) ON DELETE CASCADE`
- `workers_updated_by_fkey` (FOREIGN KEY): `FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL`
- `workers_pkey` (PRIMARY KEY): `PRIMARY KEY (id)`
- `workers_tenant_uq` (UNIQUE): `UNIQUE (drugstore_id, id)`

**Índices**

- `CREATE UNIQUE INDEX workers_code_uq ON workers USING btree (drugstore_id, lower(worker_code)) WHERE (deleted_at IS NULL)`
- `CREATE UNIQUE INDEX workers_pkey ON workers USING btree (id)`
- `CREATE UNIQUE INDEX workers_tenant_uq ON workers USING btree (drugstore_id, id)`
