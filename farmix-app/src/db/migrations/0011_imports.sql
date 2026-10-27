-- Fase 3.8: importación en dos pasos. La vista previa NO escribe en tablas de negocio; caduca a las 24 horas.
CREATE TABLE imports (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drugstore_id   uuid NOT NULL REFERENCES drugstores(id) ON DELETE CASCADE,
  kind           text NOT NULL CHECK (kind IN ('expirations', 'waste', 'segregation')),
  file_name      text NOT NULL CHECK (char_length(file_name) BETWEEN 1 AND 120),
  phase          text NOT NULL DEFAULT 'vista_previa' CHECK (phase IN ('vista_previa', 'confirmada')),
  total_rows     integer NOT NULL CHECK (total_rows >= 0),
  valid_rows     integer NOT NULL CHECK (valid_rows >= 0),
  invalid_rows   integer NOT NULL CHECK (invalid_rows >= 0),
  duplicate_rows integer NOT NULL CHECK (duplicate_rows >= 0),
  row_results    jsonb NOT NULL,
  inserted_count integer,
  expires_at     timestamptz NOT NULL,
  confirmed_at   timestamptz,
  created_by     uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by     uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz,
  CONSTRAINT imports_tenant_uq UNIQUE (drugstore_id, id),
  CONSTRAINT imports_confirmed_ck CHECK ((phase = 'confirmada') = (confirmed_at IS NOT NULL))
);
CREATE INDEX imports_drugstore_idx ON imports (drugstore_id, created_at DESC) WHERE deleted_at IS NULL;
