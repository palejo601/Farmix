-- Fase 3.4: personal, temas de capacitación y capacitaciones.
-- Minimización de datos (Ley 1581 de 2012): no se guarda documento de identidad, solo un código interno.
CREATE TABLE workers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drugstore_id uuid NOT NULL REFERENCES drugstores(id) ON DELETE CASCADE,
  worker_code  text NOT NULL CHECK (char_length(worker_code) BETWEEN 1 AND 30),
  full_name    text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 120),
  job_title    text CHECK (job_title IS NULL OR char_length(job_title) BETWEEN 1 AND 80),
  created_by   uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by   uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz,
  CONSTRAINT workers_tenant_uq UNIQUE (drugstore_id, id)
);
CREATE UNIQUE INDEX workers_code_uq ON workers (drugstore_id, lower(worker_code)) WHERE deleted_at IS NULL;

CREATE TABLE training_topics (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drugstore_id    uuid NOT NULL REFERENCES drugstores(id) ON DELETE CASCADE,
  topic_name      text NOT NULL CHECK (char_length(topic_name) BETWEEN 2 AND 120),
  validity_months integer NOT NULL DEFAULT 12 CHECK (validity_months BETWEEN 1 AND 60),
  description     text CHECK (description IS NULL OR char_length(description) <= 300),
  created_by      uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by      uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  CONSTRAINT training_topics_tenant_uq UNIQUE (drugstore_id, id)
);
CREATE UNIQUE INDEX training_topics_name_uq ON training_topics (drugstore_id, lower(topic_name)) WHERE deleted_at IS NULL;

-- Un registro por trabajador y tema. El estado (vigente, pendiente, vencida) se calcula al consultar.
-- pendiente = asignada sin fecha de realización.
CREATE TABLE trainings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drugstore_id uuid NOT NULL,
  worker_id    uuid NOT NULL,
  topic_id     uuid NOT NULL,
  trained_on   date,
  valid_until  date,
  created_by   uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by   uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz,
  -- Claves compuestas: el trabajador y el tema deben pertenecer a la misma droguería que la capacitación.
  FOREIGN KEY (drugstore_id, worker_id) REFERENCES workers (drugstore_id, id) ON DELETE CASCADE,
  FOREIGN KEY (drugstore_id, topic_id) REFERENCES training_topics (drugstore_id, id) ON DELETE CASCADE,
  CONSTRAINT trainings_tenant_uq UNIQUE (drugstore_id, id),
  CONSTRAINT trainings_dates_ck CHECK (
    (trained_on IS NULL AND valid_until IS NULL) OR (trained_on IS NOT NULL AND valid_until IS NOT NULL AND valid_until >= trained_on)
  )
);
CREATE UNIQUE INDEX trainings_worker_topic_uq ON trainings (drugstore_id, worker_id, topic_id) WHERE deleted_at IS NULL;
