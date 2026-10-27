-- Fase 3.10: migración de datos guardados en el navegador. Confirmar o revertir sin duplicar.
CREATE TABLE local_migrations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  drugstore_id  uuid NOT NULL REFERENCES drugstores(id) ON DELETE CASCADE,
  content_hash  text NOT NULL CHECK (content_hash ~ '^[a-f0-9]{64}$'),
  is_demo       boolean NOT NULL DEFAULT false,
  phase         text NOT NULL DEFAULT 'pendiente' CHECK (phase IN ('pendiente', 'confirmada', 'revertida')),
  payload       jsonb NOT NULL,
  summary       jsonb NOT NULL,
  inserted_ids  jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  confirmed_at  timestamptz,
  reverted_at   timestamptz,
  CONSTRAINT local_migrations_phase_ck CHECK (
    (phase = 'pendiente' AND confirmed_at IS NULL AND reverted_at IS NULL) OR
    (phase = 'confirmada' AND confirmed_at IS NOT NULL AND reverted_at IS NULL) OR
    (phase = 'revertida' AND confirmed_at IS NOT NULL AND reverted_at IS NOT NULL)
  )
);
-- Mismo usuario + mismo contenido + misma bandera de demostración: una sola migración viva. Tras revertir, puede repetirse.
CREATE UNIQUE INDEX local_migrations_content_uq ON local_migrations (user_id, content_hash, is_demo) WHERE phase <> 'revertida';
