-- FARMIX: esquema simplificado para dibujar el diagrama en drawDB (NO usar como migración).
-- Generado por generar.py. Omite: restricciones CHECK, índices (incluidos los únicos parciales y con lower()),
-- valores predeterminados con funciones (gen_random_uuid(), now()) e IDENTITY. Ver drawdb-diferencias.md.

CREATE TABLE audit_logs (
  id bigint NOT NULL,
  user_id uuid,
  action text NOT NULL,
  resource text NOT NULL,
  resource_id text,
  outcome text NOT NULL,
  request_id text,
  created_at timestamp NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE dev_mailbox (
  id bigint NOT NULL,
  to_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  created_at timestamp NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE diagnoses (
  id uuid NOT NULL,
  drugstore_id uuid NOT NULL,
  instrument_version_id uuid NOT NULL,
  performed_on date NOT NULL,
  notes text,
  created_by uuid,
  updated_by uuid,
  created_at timestamp NOT NULL,
  updated_at timestamp NOT NULL,
  deleted_at timestamp,
  PRIMARY KEY (id),
  UNIQUE (drugstore_id, id),
  UNIQUE (id, instrument_version_id)
);

CREATE TABLE diagnosis_answers (
  id uuid NOT NULL,
  diagnosis_id uuid NOT NULL,
  version_id uuid NOT NULL,
  item_id uuid NOT NULL,
  score smallint,
  created_by uuid,
  updated_by uuid,
  created_at timestamp NOT NULL,
  updated_at timestamp NOT NULL,
  response text,
  PRIMARY KEY (id),
  UNIQUE (diagnosis_id, item_id)
);

CREATE TABLE diagnosis_area_scores (
  diagnosis_id uuid NOT NULL,
  area text NOT NULL,
  area_score numeric(2,1) NOT NULL,
  answered_count integer NOT NULL,
  PRIMARY KEY (diagnosis_id, area)
);

CREATE TABLE drugstore_members (
  id uuid NOT NULL,
  drugstore_id uuid NOT NULL,
  user_id uuid NOT NULL,
  member_role text NOT NULL,
  created_by uuid,
  updated_by uuid,
  created_at timestamp NOT NULL,
  updated_at timestamp NOT NULL,
  deleted_at timestamp,
  PRIMARY KEY (id)
);

CREATE TABLE drugstores (
  id uuid NOT NULL,
  name text NOT NULL,
  city text NOT NULL DEFAULT 'Sincelejo'::text,
  expiry_alert_days integer NOT NULL DEFAULT 60,
  created_by uuid,
  updated_by uuid,
  created_at timestamp NOT NULL,
  updated_at timestamp NOT NULL,
  deleted_at timestamp,
  employee_count integer,
  is_demo boolean NOT NULL DEFAULT false,
  PRIMARY KEY (id)
);

CREATE TABLE expiration_products (
  id uuid NOT NULL,
  drugstore_id uuid NOT NULL,
  product_name text NOT NULL,
  batch text NOT NULL,
  sanitary_registry text,
  holder text,
  expires_on date NOT NULL,
  quantity integer NOT NULL,
  unit_cost numeric(12,2) NOT NULL DEFAULT 0,
  destination text NOT NULL DEFAULT 'pendiente'::text,
  managed_at timestamp,
  created_by uuid,
  updated_by uuid,
  created_at timestamp NOT NULL,
  updated_at timestamp NOT NULL,
  deleted_at timestamp,
  support_ref text,
  PRIMARY KEY (id),
  UNIQUE (drugstore_id, id)
);

CREATE TABLE imports (
  id uuid NOT NULL,
  drugstore_id uuid NOT NULL,
  kind text NOT NULL,
  file_name text NOT NULL,
  phase text NOT NULL DEFAULT 'vista_previa'::text,
  total_rows integer NOT NULL,
  valid_rows integer NOT NULL,
  invalid_rows integer NOT NULL,
  duplicate_rows integer NOT NULL,
  row_results jsonb NOT NULL,
  inserted_count integer,
  expires_at timestamp NOT NULL,
  confirmed_at timestamp,
  created_by uuid,
  updated_by uuid,
  created_at timestamp NOT NULL,
  updated_at timestamp NOT NULL,
  deleted_at timestamp,
  PRIMARY KEY (id),
  UNIQUE (drugstore_id, id)
);

CREATE TABLE improvement_actions (
  id uuid NOT NULL,
  drugstore_id uuid NOT NULL,
  finding text NOT NULL,
  corrective_action text,
  responsible text,
  due_on date,
  progress_state text NOT NULL DEFAULT 'pendiente'::text,
  closed_on date,
  created_by uuid,
  updated_by uuid,
  created_at timestamp NOT NULL,
  updated_at timestamp NOT NULL,
  deleted_at timestamp,
  origin_item_id uuid,
  PRIMARY KEY (id),
  UNIQUE (drugstore_id, id)
);

CREATE TABLE instrument_items (
  id uuid NOT NULL,
  version_id uuid NOT NULL,
  area text NOT NULL,
  item_code text NOT NULL,
  prompt_text text NOT NULL,
  position integer NOT NULL,
  item_kind text NOT NULL DEFAULT 'madurez'::text,
  legal_basis text,
  PRIMARY KEY (id),
  UNIQUE (version_id, id),
  UNIQUE (version_id, item_code)
);

CREATE TABLE instrument_versions (
  id uuid NOT NULL,
  version_number integer NOT NULL,
  title text NOT NULL,
  description text,
  is_current boolean NOT NULL DEFAULT false,
  published_at timestamp NOT NULL,
  scoring text NOT NULL DEFAULT 'likert_avg'::text,
  PRIMARY KEY (id),
  UNIQUE (version_number)
);

CREATE TABLE local_migrations (
  id uuid NOT NULL,
  user_id uuid NOT NULL,
  drugstore_id uuid NOT NULL,
  content_hash text NOT NULL,
  is_demo boolean NOT NULL DEFAULT false,
  phase text NOT NULL DEFAULT 'pendiente'::text,
  payload jsonb NOT NULL,
  summary jsonb NOT NULL,
  inserted_ids jsonb,
  created_at timestamp NOT NULL,
  updated_at timestamp NOT NULL,
  confirmed_at timestamp,
  reverted_at timestamp,
  PRIMARY KEY (id)
);

CREATE TABLE password_resets (
  id uuid NOT NULL,
  user_id uuid NOT NULL,
  token_hash text NOT NULL,
  expires_at timestamp NOT NULL,
  used_at timestamp,
  created_at timestamp NOT NULL,
  PRIMARY KEY (id),
  UNIQUE (token_hash)
);

CREATE TABLE schema_migrations (
  filename text NOT NULL,
  checksum text NOT NULL,
  applied_at timestamp NOT NULL,
  PRIMARY KEY (filename)
);

CREATE TABLE segregation_checks (
  id uuid NOT NULL,
  drugstore_id uuid NOT NULL,
  checked_on date NOT NULL,
  items_reviewed integer NOT NULL,
  items_correct integer NOT NULL,
  location text NOT NULL,
  observations text,
  created_by uuid,
  updated_by uuid,
  created_at timestamp NOT NULL,
  updated_at timestamp NOT NULL,
  deleted_at timestamp,
  PRIMARY KEY (id),
  UNIQUE (drugstore_id, id)
);

CREATE TABLE sessions (
  id uuid NOT NULL,
  user_id uuid NOT NULL,
  token_hash text NOT NULL,
  created_at timestamp NOT NULL,
  last_seen_at timestamp NOT NULL,
  expires_at timestamp NOT NULL,
  revoked_at timestamp,
  PRIMARY KEY (id),
  UNIQUE (token_hash)
);

CREATE TABLE support_files (
  id uuid NOT NULL,
  drugstore_id uuid NOT NULL,
  original_name text NOT NULL,
  stored_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL,
  sha256 text NOT NULL,
  created_by uuid,
  updated_by uuid,
  created_at timestamp NOT NULL,
  updated_at timestamp NOT NULL,
  deleted_at timestamp,
  PRIMARY KEY (id),
  UNIQUE (stored_name),
  UNIQUE (drugstore_id, id)
);

CREATE TABLE training_topics (
  id uuid NOT NULL,
  drugstore_id uuid NOT NULL,
  topic_name text NOT NULL,
  validity_months integer NOT NULL DEFAULT 12,
  description text,
  created_by uuid,
  updated_by uuid,
  created_at timestamp NOT NULL,
  updated_at timestamp NOT NULL,
  deleted_at timestamp,
  PRIMARY KEY (id),
  UNIQUE (drugstore_id, id)
);

CREATE TABLE trainings (
  id uuid NOT NULL,
  drugstore_id uuid NOT NULL,
  worker_id uuid NOT NULL,
  topic_id uuid NOT NULL,
  trained_on date,
  valid_until date,
  created_by uuid,
  updated_by uuid,
  created_at timestamp NOT NULL,
  updated_at timestamp NOT NULL,
  deleted_at timestamp,
  support_file_id uuid,
  PRIMARY KEY (id),
  UNIQUE (drugstore_id, id)
);

CREATE TABLE users (
  id uuid NOT NULL,
  email text NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  privacy_accepted_at timestamp,
  privacy_version text,
  failed_login_count integer NOT NULL DEFAULT 0,
  locked_until timestamp,
  deletion_requested_at timestamp,
  deletion_scheduled_at timestamp,
  created_at timestamp NOT NULL,
  updated_at timestamp NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE waste_records (
  id uuid NOT NULL,
  drugstore_id uuid NOT NULL,
  recorded_on date NOT NULL,
  classification text NOT NULL,
  quantity numeric(10,3) NOT NULL,
  unit text NOT NULL,
  origin text,
  notes text,
  created_by uuid,
  updated_by uuid,
  created_at timestamp NOT NULL,
  updated_at timestamp NOT NULL,
  deleted_at timestamp,
  waste_type text,
  handling text,
  support_ref text,
  PRIMARY KEY (id),
  UNIQUE (drugstore_id, id)
);

CREATE TABLE workers (
  id uuid NOT NULL,
  drugstore_id uuid NOT NULL,
  worker_code text NOT NULL,
  full_name text NOT NULL,
  job_title text,
  created_by uuid,
  updated_by uuid,
  created_at timestamp NOT NULL,
  updated_at timestamp NOT NULL,
  deleted_at timestamp,
  PRIMARY KEY (id),
  UNIQUE (drugstore_id, id)
);

ALTER TABLE audit_logs ADD FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE diagnoses ADD FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE diagnoses ADD FOREIGN KEY (drugstore_id) REFERENCES drugstores (id) ON DELETE CASCADE;
ALTER TABLE diagnoses ADD FOREIGN KEY (instrument_version_id) REFERENCES instrument_versions (id) ON DELETE RESTRICT;
ALTER TABLE diagnoses ADD FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE diagnosis_answers ADD FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE diagnosis_answers ADD FOREIGN KEY (diagnosis_id, version_id) REFERENCES diagnoses (id, instrument_version_id) ON DELETE CASCADE;
ALTER TABLE diagnosis_answers ADD FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE diagnosis_answers ADD FOREIGN KEY (version_id, item_id) REFERENCES instrument_items (version_id, id) ON DELETE NO ACTION;
ALTER TABLE diagnosis_area_scores ADD FOREIGN KEY (diagnosis_id) REFERENCES diagnoses (id) ON DELETE CASCADE;
ALTER TABLE drugstore_members ADD FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE drugstore_members ADD FOREIGN KEY (drugstore_id) REFERENCES drugstores (id) ON DELETE CASCADE;
ALTER TABLE drugstore_members ADD FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE drugstore_members ADD FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE drugstores ADD FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE drugstores ADD FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE expiration_products ADD FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE expiration_products ADD FOREIGN KEY (drugstore_id) REFERENCES drugstores (id) ON DELETE CASCADE;
ALTER TABLE expiration_products ADD FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE imports ADD FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE imports ADD FOREIGN KEY (drugstore_id) REFERENCES drugstores (id) ON DELETE CASCADE;
ALTER TABLE imports ADD FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE improvement_actions ADD FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE improvement_actions ADD FOREIGN KEY (drugstore_id) REFERENCES drugstores (id) ON DELETE CASCADE;
ALTER TABLE improvement_actions ADD FOREIGN KEY (origin_item_id) REFERENCES instrument_items (id) ON DELETE SET NULL;
ALTER TABLE improvement_actions ADD FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE instrument_items ADD FOREIGN KEY (version_id) REFERENCES instrument_versions (id) ON DELETE RESTRICT;
ALTER TABLE local_migrations ADD FOREIGN KEY (drugstore_id) REFERENCES drugstores (id) ON DELETE CASCADE;
ALTER TABLE local_migrations ADD FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE password_resets ADD FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE segregation_checks ADD FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE segregation_checks ADD FOREIGN KEY (drugstore_id) REFERENCES drugstores (id) ON DELETE CASCADE;
ALTER TABLE segregation_checks ADD FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE sessions ADD FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE support_files ADD FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE support_files ADD FOREIGN KEY (drugstore_id) REFERENCES drugstores (id) ON DELETE CASCADE;
ALTER TABLE support_files ADD FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE training_topics ADD FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE training_topics ADD FOREIGN KEY (drugstore_id) REFERENCES drugstores (id) ON DELETE CASCADE;
ALTER TABLE training_topics ADD FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE trainings ADD FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE trainings ADD FOREIGN KEY (drugstore_id, topic_id) REFERENCES training_topics (drugstore_id, id) ON DELETE CASCADE;
ALTER TABLE trainings ADD FOREIGN KEY (drugstore_id, worker_id) REFERENCES workers (drugstore_id, id) ON DELETE CASCADE;
ALTER TABLE trainings ADD FOREIGN KEY (drugstore_id, support_file_id) REFERENCES support_files (drugstore_id, id) ON DELETE NO ACTION;
ALTER TABLE trainings ADD FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE waste_records ADD FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE waste_records ADD FOREIGN KEY (drugstore_id) REFERENCES drugstores (id) ON DELETE CASCADE;
ALTER TABLE waste_records ADD FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE workers ADD FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE workers ADD FOREIGN KEY (drugstore_id) REFERENCES drugstores (id) ON DELETE CASCADE;
ALTER TABLE workers ADD FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
