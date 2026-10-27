-- Fase 2: droguerías y miembros con rol. Borrado lógico y campos de auditoría.
CREATE TABLE drugstores (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  city               text NOT NULL DEFAULT 'Sincelejo' CHECK (char_length(city) BETWEEN 2 AND 80),
  expiry_alert_days  integer NOT NULL DEFAULT 60 CHECK (expiry_alert_days BETWEEN 1 AND 365),
  created_by         uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by         uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  deleted_at         timestamptz
);

CREATE TABLE drugstore_members (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drugstore_id  uuid NOT NULL REFERENCES drugstores(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_role   text NOT NULL CHECK (member_role IN ('propietario', 'administrador', 'operador')),
  created_by    uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by    uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);
-- Un usuario aparece una sola vez (activo) por droguería, y cada droguería tiene un único propietario activo.
CREATE UNIQUE INDEX drugstore_members_active_uq ON drugstore_members (drugstore_id, user_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX drugstore_members_owner_uq ON drugstore_members (drugstore_id) WHERE member_role = 'propietario' AND deleted_at IS NULL;
CREATE INDEX drugstore_members_user_idx ON drugstore_members (user_id) WHERE deleted_at IS NULL;
