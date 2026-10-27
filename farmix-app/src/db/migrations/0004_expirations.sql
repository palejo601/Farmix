-- Fase 3.1: productos con vencimiento. El estado (vigente, próximo, vencido, gestionado) NO se guarda: se calcula al consultar.
CREATE TABLE expiration_products (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drugstore_id      uuid NOT NULL REFERENCES drugstores(id) ON DELETE CASCADE,
  product_name      text NOT NULL CHECK (char_length(product_name) BETWEEN 1 AND 160),
  batch             text NOT NULL CHECK (char_length(batch) BETWEEN 1 AND 60),
  sanitary_registry text CHECK (sanitary_registry IS NULL OR char_length(sanitary_registry) BETWEEN 1 AND 60),
  holder            text CHECK (holder IS NULL OR char_length(holder) BETWEEN 1 AND 120),
  expires_on        date NOT NULL CHECK (expires_on BETWEEN DATE '2000-01-01' AND DATE '2100-12-31'),
  quantity          integer NOT NULL CHECK (quantity BETWEEN 1 AND 1000000),
  unit_cost         numeric(12,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  destination       text NOT NULL DEFAULT 'pendiente'
                    CHECK (destination IN ('pendiente', 'devolucion_proveedor', 'disposicion_final', 'otro')),
  managed_at        timestamptz,
  created_by        uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by        uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz,
  -- Identificador único dentro de cada droguería (permite claves foráneas compuestas que atan otros registros a la misma droguería).
  CONSTRAINT expiration_products_tenant_uq UNIQUE (drugstore_id, id),
  CONSTRAINT expiration_products_managed_ck CHECK ((destination = 'pendiente') = (managed_at IS NULL))
);
-- Evita registrar dos veces el mismo producto y lote en una droguería.
CREATE UNIQUE INDEX expiration_products_batch_uq
  ON expiration_products (drugstore_id, lower(product_name), lower(batch)) WHERE deleted_at IS NULL;
CREATE INDEX expiration_products_expiry_idx ON expiration_products (drugstore_id, expires_on) WHERE deleted_at IS NULL;
