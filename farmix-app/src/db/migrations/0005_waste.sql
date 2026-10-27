-- Fase 3.2: registros de residuos. Clasificación cerrada; un medicamento vencido nunca es riesgo biológico.
CREATE TABLE waste_records (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drugstore_id   uuid NOT NULL REFERENCES drugstores(id) ON DELETE CASCADE,
  recorded_on    date NOT NULL CHECK (recorded_on BETWEEN DATE '2000-01-01' AND DATE '2100-12-31'),
  classification text NOT NULL CHECK (classification IN
                 ('riesgo_biologico', 'peligroso_quimico', 'aprovechable', 'organico_aprovechable', 'no_aprovechable')),
  quantity       numeric(10,3) NOT NULL CHECK (quantity > 0 AND quantity <= 100000),
  unit           text NOT NULL CHECK (unit IN ('kg', 'g')),
  origin         text CHECK (origin IN ('medicamento_vencido', 'otro')),
  notes          text CHECK (notes IS NULL OR char_length(notes) <= 500),
  created_by     uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by     uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz,
  CONSTRAINT waste_records_tenant_uq UNIQUE (drugstore_id, id),
  CONSTRAINT waste_records_expired_med_ck CHECK (NOT (origin = 'medicamento_vencido' AND classification = 'riesgo_biologico'))
);
CREATE INDEX waste_records_date_idx ON waste_records (drugstore_id, recorded_on DESC) WHERE deleted_at IS NULL;
