-- Fase 3.3: verificaciones de segregación. El porcentaje NO se guarda: se calcula al consultar.
CREATE TABLE segregation_checks (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drugstore_id   uuid NOT NULL REFERENCES drugstores(id) ON DELETE CASCADE,
  checked_on     date NOT NULL CHECK (checked_on BETWEEN DATE '2000-01-01' AND DATE '2100-12-31'),
  items_reviewed integer NOT NULL CHECK (items_reviewed BETWEEN 1 AND 100000),
  items_correct  integer NOT NULL CHECK (items_correct >= 0),
  location       text NOT NULL CHECK (char_length(location) BETWEEN 1 AND 120),
  observations   text CHECK (observations IS NULL OR char_length(observations) <= 500),
  created_by     uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by     uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz,
  CONSTRAINT segregation_checks_tenant_uq UNIQUE (drugstore_id, id),
  CONSTRAINT segregation_checks_correct_le_reviewed_ck CHECK (items_correct <= items_reviewed)
);
CREATE INDEX segregation_checks_date_idx ON segregation_checks (drugstore_id, checked_on DESC) WHERE deleted_at IS NULL;
