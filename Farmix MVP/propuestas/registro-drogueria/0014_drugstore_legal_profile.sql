-- PROPUESTA (no aplicada a farmix-app). Sigue las convenciones de las migraciones 0001–0013:
-- uuid, created_by/updated_by → users (SET NULL), timestamptz, deleted_at, UNIQUE (drugstore_id, id).
-- Tablas NUEVAS: no cambia ninguna existente ni afecta datos ya guardados.

CREATE TABLE drugstore_legal_profiles (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drugstore_id                uuid NOT NULL REFERENCES drugstores(id) ON DELETE CASCADE,
  -- organización legal
  razon_social                text NOT NULL CHECK (char_length(razon_social) BETWEEN 2 AND 160),
  nombre_comercial            text NOT NULL CHECK (char_length(nombre_comercial) BETWEEN 2 AND 120),
  nit                         text NOT NULL CHECK (nit ~ '^[0-9]{1,15}$'),
  digito_verificacion         text NOT NULL CHECK (digito_verificacion ~ '^[0-9]$'),
  tipo_persona                text NOT NULL CHECK (tipo_persona IN ('Persona Natural', 'Persona Jurídica')),
  matricula_mercantil         text NOT NULL CHECK (char_length(matricula_mercantil) BETWEEN 3 AND 30),
  codigo_ciiu                 text NOT NULL DEFAULT '4773' CHECK (codigo_ciiu ~ '^[0-9]{4}$'),
  regimen_tributario          text NOT NULL CHECK (regimen_tributario IN ('Responsable de IVA', 'No Responsable')),
  -- ubicación y contacto
  direccion                   text NOT NULL CHECK (char_length(direccion) BETWEEN 5 AND 160),
  municipio                   text NOT NULL CHECK (char_length(municipio) BETWEEN 2 AND 80),
  departamento                text NOT NULL CHECK (char_length(departamento) BETWEEN 2 AND 80),
  codigo_postal               text NOT NULL CHECK (codigo_postal ~ '^[0-9]{6}$'),
  telefono_fijo               text NOT NULL CHECK (telefono_fijo ~ '^[0-9]{7,10}$'),
  celular                     text NOT NULL CHECK (celular ~ '^3[0-9]{9}$'),
  correo_notificaciones       text NOT NULL CHECK (char_length(correo_notificaciones) BETWEEN 5 AND 160),
  -- control sanitario y operativo
  numero_radicado_secretaria  text NOT NULL CHECK (char_length(numero_radicado_secretaria) BETWEEN 2 AND 60),
  estado_concepto_sanitario   text NOT NULL CHECK (char_length(estado_concepto_sanitario) BETWEEN 2 AND 60),
  fecha_ultima_inspeccion     date NOT NULL CHECK (fecha_ultima_inspeccion BETWEEN '2000-01-01' AND '2100-12-31'),
  area_local_m2               numeric(8,2) NOT NULL CHECK (area_local_m2 > 0),
  ofrece_inyectologia         boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (drugstore_id, id)
);
-- Un perfil legal activo por droguería
CREATE UNIQUE INDEX drugstore_legal_profiles_active_uq ON drugstore_legal_profiles (drugstore_id) WHERE deleted_at IS NULL;

-- Representante legal y director técnico (datos personales: Ley 1581; no registrarlos en audit_logs)
CREATE TABLE drugstore_responsibles (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drugstore_id                uuid NOT NULL REFERENCES drugstores(id) ON DELETE CASCADE,
  rol                         text NOT NULL CHECK (rol IN ('representante_legal', 'director_tecnico')),
  nombre_completo             text NOT NULL CHECK (char_length(nombre_completo) BETWEEN 3 AND 120),
  tipo_documento              text NOT NULL CHECK (tipo_documento IN ('CC', 'CE', 'PA', 'PPT', 'PEP')),
  numero_documento            text NOT NULL CHECK (numero_documento ~ '^[A-Za-z0-9]{4,20}$'),
  perfil_profesional          text CHECK (perfil_profesional IN ('Químico Farmacéutico', 'Tecnólogo en Regencia de Farmacia')),
  tarjeta_profesional_rethus  text CHECK (char_length(tarjeta_profesional_rethus) BETWEEN 3 AND 40),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (drugstore_id, id),
  -- El director técnico exige perfil y tarjeta/RETHUS; el representante legal no los lleva
  CONSTRAINT drugstore_responsibles_rol_ck CHECK (
    (rol = 'director_tecnico' AND perfil_profesional IS NOT NULL AND tarjeta_profesional_rethus IS NOT NULL)
    OR (rol = 'representante_legal' AND perfil_profesional IS NULL AND tarjeta_profesional_rethus IS NULL))
);
CREATE UNIQUE INDEX drugstore_responsibles_rol_uq ON drugstore_responsibles (drugstore_id, rol) WHERE deleted_at IS NULL;

-- Resoluciones de facturación electrónica (1:N: se conserva el historial al renovar la resolución)
CREATE TABLE drugstore_einvoice_resolutions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drugstore_id      uuid NOT NULL REFERENCES drugstores(id) ON DELETE CASCADE,
  numero_resolucion text NOT NULL CHECK (char_length(numero_resolucion) BETWEEN 3 AND 40),
  prefijo           text NOT NULL DEFAULT '' CHECK (prefijo ~ '^[A-Za-z0-9]{0,4}$'),
  rango_inicial     bigint NOT NULL CHECK (rango_inicial >= 1),
  rango_final       bigint NOT NULL,
  fecha_vencimiento date NOT NULL CHECK (fecha_vencimiento BETWEEN '2000-01-01' AND '2100-12-31'),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (drugstore_id, id),
  CONSTRAINT drugstore_einvoice_rango_ck CHECK (rango_final >= rango_inicial)
);
CREATE UNIQUE INDEX drugstore_einvoice_res_uq ON drugstore_einvoice_resolutions (drugstore_id, numero_resolucion, prefijo) WHERE deleted_at IS NULL;

-- OPCIONAL, SOLO CUANDO SE CONFIRME LA NORMA (no se incluye activa; ver README):
-- ALTER TABLE drugstore_legal_profiles ADD CONSTRAINT drugstore_legal_area_min_ck CHECK (area_local_m2 >= 20);
-- ALTER TABLE drugstore_legal_profiles ADD CONSTRAINT drugstore_legal_nombre_ck
--   CHECK (translate(lower(nombre_comercial), 'í', 'i') LIKE '%drogueria%');
