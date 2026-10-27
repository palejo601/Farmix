-- Control de migraciones. Las migraciones aplicadas no se modifican; todo cambio es una migración nueva.
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename   text PRIMARY KEY,
  checksum   text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);
