-- Fase 3.6: diagnóstico normativo con instrumento versionado.
CREATE TABLE instrument_versions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_number integer NOT NULL UNIQUE CHECK (version_number >= 1),
  title          text NOT NULL,
  description    text,
  is_current     boolean NOT NULL DEFAULT false,
  published_at   timestamptz NOT NULL DEFAULT now()
);
-- Una única versión vigente.
CREATE UNIQUE INDEX instrument_versions_one_current_uq ON instrument_versions ((true)) WHERE is_current;

CREATE TABLE instrument_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id  uuid NOT NULL REFERENCES instrument_versions(id) ON DELETE RESTRICT,
  area        text NOT NULL CHECK (area IN ('residuos', 'vencimientos', 'segregacion', 'personal_capacitacion', 'documentacion')),
  item_code   text NOT NULL,
  prompt_text text NOT NULL,
  position    integer NOT NULL CHECK (position >= 1),
  UNIQUE (version_id, item_code),
  UNIQUE (version_id, id)
);

CREATE TABLE diagnoses (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drugstore_id          uuid NOT NULL REFERENCES drugstores(id) ON DELETE CASCADE,
  instrument_version_id uuid NOT NULL REFERENCES instrument_versions(id) ON DELETE RESTRICT,
  performed_on          date NOT NULL CHECK (performed_on BETWEEN DATE '2000-01-01' AND DATE '2100-12-31'),
  notes                 text CHECK (notes IS NULL OR char_length(notes) <= 1000),
  created_by            uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by            uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz,
  CONSTRAINT diagnoses_tenant_uq UNIQUE (drugstore_id, id),
  CONSTRAINT diagnoses_version_uq UNIQUE (id, instrument_version_id)
);
CREATE INDEX diagnoses_date_idx ON diagnoses (drugstore_id, performed_on DESC) WHERE deleted_at IS NULL;

-- Respuestas: puntaje de madurez 1 a 5 por ítem. El ítem debe pertenecer a la versión del diagnóstico.
-- Tabla dependiente: sin deleted_at (se actualiza en el lugar; se elimina junto con su diagnóstico).
CREATE TABLE diagnosis_answers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnosis_id uuid NOT NULL,
  version_id   uuid NOT NULL,
  item_id      uuid NOT NULL,
  score        smallint NOT NULL CHECK (score BETWEEN 1 AND 5),
  created_by   uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by   uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (diagnosis_id, version_id) REFERENCES diagnoses (id, instrument_version_id) ON DELETE CASCADE,
  FOREIGN KEY (version_id, item_id) REFERENCES instrument_items (version_id, id),
  UNIQUE (diagnosis_id, item_id)
);

-- Puntaje de madurez (1 a 5) por área: promedio de los ítems respondidos. Se recalcula en cada cambio de respuestas.
CREATE TABLE diagnosis_area_scores (
  diagnosis_id   uuid NOT NULL REFERENCES diagnoses(id) ON DELETE CASCADE,
  area           text NOT NULL CHECK (area IN ('residuos', 'vencimientos', 'segregacion', 'personal_capacitacion', 'documentacion')),
  area_score     numeric(2,1) NOT NULL CHECK (area_score BETWEEN 1 AND 5),
  answered_count integer NOT NULL CHECK (answered_count >= 1),
  PRIMARY KEY (diagnosis_id, area)
);

-- Instrumento v1: BORRADOR de autoevaluación (escala 1 = no se hace … 5 = práctica consolidada y documentada).
-- Redactado para validación con expertos; no cita ni certifica cumplimiento de norma alguna.
INSERT INTO instrument_versions (version_number, title, description, is_current) VALUES (
  1,
  'Instrumento de diagnóstico de gestión de residuos y vencimientos, versión 1 (borrador por validar)',
  'Autoevaluación con escala de madurez de 1 a 5 por ítem. Los resultados son descriptivos y no constituyen concepto de cumplimiento normativo.',
  true
);
INSERT INTO instrument_items (version_id, area, item_code, prompt_text, position)
SELECT v.id, i.area, i.code, i.txt, i.pos FROM instrument_versions v, (VALUES
  ('residuos', 'RES-01', 'Los residuos generados se clasifican según las categorías definidas (riesgo biológico, peligroso químico, aprovechable, orgánico aprovechable y no aprovechable).', 1),
  ('residuos', 'RES-02', 'Existe un lugar identificado para el almacenamiento temporal de los residuos.', 2),
  ('residuos', 'RES-03', 'Se lleva un registro periódico de los residuos generados.', 3),
  ('vencimientos', 'VEN-01', 'Se revisa de forma periódica la fecha de vencimiento de los productos almacenados.', 4),
  ('vencimientos', 'VEN-02', 'Los productos próximos a vencer se identifican con anticipación.', 5),
  ('vencimientos', 'VEN-03', 'Los medicamentos vencidos se separan y tienen un destino definido.', 6),
  ('segregacion', 'SEG-01', 'Los recipientes de segregación están identificados y ubicados donde se generan los residuos.', 7),
  ('segregacion', 'SEG-02', 'El personal separa los residuos en el recipiente que corresponde.', 8),
  ('segregacion', 'SEG-03', 'Se verifica periódicamente que la segregación sea correcta.', 9),
  ('personal_capacitacion', 'PER-01', 'El personal conoce los procedimientos de manejo de residuos.', 10),
  ('personal_capacitacion', 'PER-02', 'Las capacitaciones se registran con su fecha de vigencia.', 11),
  ('personal_capacitacion', 'PER-03', 'El personal nuevo recibe inducción sobre manejo de residuos.', 12),
  ('documentacion', 'DOC-01', 'Se cuenta con un plan o procedimiento escrito de gestión de residuos.', 13),
  ('documentacion', 'DOC-02', 'Los soportes de entrega de residuos y de devoluciones se conservan.', 14),
  ('documentacion', 'DOC-03', 'Las acciones de mejora se registran con responsable y fecha límite.', 15)
) AS i(area, code, txt, pos) WHERE v.version_number = 1;
