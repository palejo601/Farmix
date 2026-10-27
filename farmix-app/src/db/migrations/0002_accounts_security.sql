-- Fase 1: cuentas, sesiones, recuperación de contraseña, auditoría y buzón de desarrollo.
CREATE TABLE users (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email                  text NOT NULL,
  password_hash          text NOT NULL,
  full_name              text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 120),
  privacy_accepted_at    timestamptz,
  privacy_version        text,
  failed_login_count     integer NOT NULL DEFAULT 0 CHECK (failed_login_count >= 0),
  locked_until           timestamptz,
  deletion_requested_at  timestamptz,
  deletion_scheduled_at  timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_deletion_pair CHECK ((deletion_requested_at IS NULL) = (deletion_scheduled_at IS NULL))
);
CREATE UNIQUE INDEX users_email_lower_uq ON users (lower(email));
CREATE INDEX users_deletion_scheduled_idx ON users (deletion_scheduled_at) WHERE deletion_scheduled_at IS NOT NULL;

CREATE TABLE sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   text NOT NULL UNIQUE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  revoked_at   timestamptz
);
CREATE INDEX sessions_user_idx ON sessions (user_id);

CREATE TABLE password_resets (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX password_resets_user_idx ON password_resets (user_id);

CREATE TABLE audit_logs (
  id          bigserial PRIMARY KEY,
  user_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  action      text NOT NULL,
  resource    text NOT NULL,
  resource_id text,
  outcome     text NOT NULL CHECK (outcome IN ('success', 'failure')),
  request_id  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_user_idx ON audit_logs (user_id, created_at DESC);

-- Solo para MAIL_MODE=dev: correos simulados, nunca enviados.
CREATE TABLE dev_mailbox (
  id         bigserial PRIMARY KEY,
  to_email   text NOT NULL,
  subject    text NOT NULL,
  body       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
