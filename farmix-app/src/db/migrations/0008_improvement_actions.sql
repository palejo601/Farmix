-- Fase 3.5: plan de mejoramiento. La columna de estado se llama progress_state (evita "status", palabra reservada en herramientas de diagramación).
CREATE TABLE improvement_actions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drugstore_id      uuid NOT NULL REFERENCES drugstores(id) ON DELETE CASCADE,
  finding           text NOT NULL CHECK (char_length(finding) BETWEEN 3 AND 500),
  corrective_action text NOT NULL CHECK (char_length(corrective_action) BETWEEN 3 AND 500),
  responsible       text NOT NULL CHECK (char_length(responsible) BETWEEN 2 AND 120),
  due_on            date NOT NULL CHECK (due_on BETWEEN DATE '2000-01-01' AND DATE '2100-12-31'),
  progress_state    text NOT NULL DEFAULT 'pendiente' CHECK (progress_state IN ('pendiente', 'en_curso', 'cerrada')),
  closed_on         date,
  created_by        uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by        uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz,
  CONSTRAINT improvement_actions_tenant_uq UNIQUE (drugstore_id, id),
  -- Una acción cerrada exige fecha de cierre; una no cerrada no puede tenerla.
  CONSTRAINT improvement_actions_closed_ck CHECK ((progress_state = 'cerrada') = (closed_on IS NOT NULL))
);
CREATE INDEX improvement_actions_due_idx ON improvement_actions (drugstore_id, due_on) WHERE deleted_at IS NULL;
