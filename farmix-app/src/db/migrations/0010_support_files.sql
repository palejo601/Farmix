-- Fase 3.7: soportes (PDF o imagen). El contenido vive en disco (STORAGE_DIR), nunca en la base de datos.
CREATE TABLE support_files (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drugstore_id  uuid NOT NULL REFERENCES drugstores(id) ON DELETE CASCADE,
  original_name text NOT NULL CHECK (char_length(original_name) BETWEEN 1 AND 120),
  stored_name   text NOT NULL UNIQUE CHECK (stored_name ~ '^[a-f0-9]{32}\.(pdf|png|jpg)$'),
  mime_type     text NOT NULL CHECK (mime_type IN ('application/pdf', 'image/png', 'image/jpeg')),
  size_bytes    integer NOT NULL CHECK (size_bytes BETWEEN 1 AND 5242880),
  sha256        text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  created_by    uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by    uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz,
  CONSTRAINT support_files_tenant_uq UNIQUE (drugstore_id, id)
);

-- Capacitaciones pueden enlazar un soporte de la MISMA droguería.
ALTER TABLE trainings ADD COLUMN support_file_id uuid;
ALTER TABLE trainings ADD CONSTRAINT trainings_support_file_fk
  FOREIGN KEY (drugstore_id, support_file_id) REFERENCES support_files (drugstore_id, id);
