-- Reorientación al PGIRASA y al prototipo original de FARMIX.
-- Cambios incrementales: no se alteran migraciones ya aplicadas.

-- ───────── Droguerías: número de empleados y bandera de demostración (datos SIMULADOS) ─────────
ALTER TABLE drugstores ADD COLUMN employee_count integer CHECK (employee_count IS NULL OR employee_count BETWEEN 0 AND 10000);
ALTER TABLE drugstores ADD COLUMN is_demo boolean NOT NULL DEFAULT false;

-- ───────── Vencimientos: destinos del prototipo y soporte (acta o nota crédito) ─────────
ALTER TABLE expiration_products DROP CONSTRAINT expiration_products_destination_check;
UPDATE expiration_products SET destination = CASE destination
  WHEN 'devolucion_proveedor' THEN 'devuelto_proveedor'
  WHEN 'disposicion_final'    THEN 'destruccion_gestor'
  WHEN 'otro'                 THEN 'averia_deterioro'
  ELSE destination END;
ALTER TABLE expiration_products ADD CONSTRAINT expiration_products_destination_check
  CHECK (destination IN ('pendiente', 'devuelto_proveedor', 'destruccion_gestor', 'averia_deterioro'));
ALTER TABLE expiration_products ADD COLUMN support_ref text CHECK (support_ref IS NULL OR char_length(support_ref) BETWEEN 1 AND 120);

-- ───────── Residuos: tipo, manejo, soporte y unidad «unidades» (no se suma a kg) ─────────
ALTER TABLE waste_records DROP CONSTRAINT waste_records_unit_check;
ALTER TABLE waste_records ADD CONSTRAINT waste_records_unit_check CHECK (unit IN ('kg', 'g', 'unidades'));
ALTER TABLE waste_records ADD COLUMN waste_type text CHECK (waste_type IS NULL OR char_length(waste_type) BETWEEN 1 AND 120);
ALTER TABLE waste_records ADD COLUMN handling text CHECK (handling IS NULL OR char_length(handling) BETWEEN 1 AND 200);
ALTER TABLE waste_records ADD COLUMN support_ref text CHECK (support_ref IS NULL OR char_length(support_ref) BETWEEN 1 AND 120);

-- ───────── Mejoras: pueden nacer de un incumplimiento, con acción/responsable/fecha por definir ─────────
ALTER TABLE improvement_actions ALTER COLUMN corrective_action DROP NOT NULL;
ALTER TABLE improvement_actions ALTER COLUMN responsible DROP NOT NULL;
ALTER TABLE improvement_actions ALTER COLUMN due_on DROP NOT NULL;
ALTER TABLE improvement_actions ADD COLUMN origin_item_id uuid REFERENCES instrument_items(id) ON DELETE SET NULL;

-- ───────── Diagnóstico: requisitos obligatorios + madurez (instrumento versión 2) ─────────
ALTER TABLE instrument_versions ADD COLUMN scoring text NOT NULL DEFAULT 'likert_avg' CHECK (scoring IN ('likert_avg', 'compliance_ratio'));
ALTER TABLE instrument_items ADD COLUMN item_kind text NOT NULL DEFAULT 'madurez' CHECK (item_kind IN ('obligatorio', 'madurez'));
ALTER TABLE instrument_items ADD COLUMN legal_basis text;
ALTER TABLE instrument_items DROP CONSTRAINT instrument_items_area_check;
ALTER TABLE instrument_items ADD CONSTRAINT instrument_items_area_check CHECK (area IN
  ('residuos', 'vencimientos', 'segregacion', 'personal_capacitacion', 'documentacion',
   'obligatorios', 'vencimientos_perdidas', 'capacitacion_documentos', 'seguimiento_mejora'));
ALTER TABLE diagnosis_area_scores DROP CONSTRAINT diagnosis_area_scores_area_check;
ALTER TABLE diagnosis_area_scores ADD CONSTRAINT diagnosis_area_scores_area_check CHECK (area IN
  ('residuos', 'vencimientos', 'segregacion', 'personal_capacitacion', 'documentacion',
   'vencimientos_perdidas', 'capacitacion_documentos', 'seguimiento_mejora'));
-- Respuestas: v1 usa score 1–5; v2 usa response (si / no / na). Exactamente una de las dos.
ALTER TABLE diagnosis_answers ADD COLUMN response text CHECK (response IN ('si', 'no', 'na'));
ALTER TABLE diagnosis_answers ALTER COLUMN score DROP NOT NULL;
ALTER TABLE diagnosis_answers ADD CONSTRAINT diagnosis_answers_one_value_ck CHECK ((score IS NULL) <> (response IS NULL));

UPDATE instrument_versions SET is_current = false WHERE is_current;
INSERT INTO instrument_versions (version_number, title, description, is_current, scoring) VALUES (
  2,
  'Diagnóstico de gestión de residuos y vencimientos en droguerías, versión 2 (autoevaluación orientativa)',
  'Dos partes: requisitos obligatorios (cumple, no cumple, no aplica; un «no cumple» no se compensa con promedios) y madurez de gestión (buenas prácticas propuestas por FARMIX, puntaje 1 a 5 por área). Criterios pendientes de validación por un profesional farmacéutico y un asesor jurídico. No es un concepto de cumplimiento ni reemplaza la visita de la autoridad sanitaria o ambiental.',
  true,
  'compliance_ratio'
);

INSERT INTO instrument_items (version_id, area, item_code, prompt_text, position, item_kind, legal_basis)
SELECT v.id, i.area, i.code, i.txt, i.pos, i.kind, i.basis FROM instrument_versions v, (VALUES
  ('obligatorios', 'OB-01', '¿Tiene el PGIRASA elaborado según el manual vigente y disponible para las autoridades?', 1, 'obligatorio', 'Res. 591/2024; Decreto 780/2016, art. 2.8.10.6'),
  ('obligatorios', 'OB-02', '¿Tiene un área para el manejo y disposición de residuos?', 2, 'obligatorio', 'Res. 1403/2007, Manual, Cap. V, num. 1.1.2 lit. l)'),
  ('obligatorios', 'OB-03', '¿Tiene un área identificada para medicamentos vencidos o deteriorados que deben destruirse?', 3, 'obligatorio', 'Res. 1403/2007, Manual, Cap. V, num. 1.1.2 lit. h)'),
  ('obligatorios', 'OB-04', '¿Tiene un área de cuarentena (también para productos retirados del mercado)?', 4, 'obligatorio', 'Res. 1403/2007, Manual, Cap. V, num. 1.1.2 lit. k)'),
  ('obligatorios', 'OB-05', '¿Tiene un área independiente y segura para medicamentos de control especial?', 5, 'obligatorio', 'Res. 1403/2007, Manual, Cap. V, num. 1.1.2 lit. g). Marca "No aplica" si no los maneja'),
  ('obligatorios', 'OB-06', '¿Lleva registros permanentes de temperatura y humedad donde guarda medicamentos?', 6, 'obligatorio', 'Res. 1403/2007, Manual, Cap. II, num. 1.1 lit. h)'),
  ('obligatorios', 'OB-07', '¿El lote más próximo a vencer es el primero que se vende?', 7, 'obligatorio', 'Res. 1403/2007, Manual, Cap. II, num. 1.1 lit. i)'),
  ('obligatorios', 'OB-08', '¿Entrega los residuos peligrosos a un gestor autorizado y guarda los certificados?', 8, 'obligatorio', 'Res. 591/2024; Decreto 1076/2015, Tít. 6, mod. Decreto 766/2026 (alcance pendiente de verificar)'),
  ('obligatorios', 'OB-09', '¿Separa de inmediato los productos retirados del mercado?', 9, 'obligatorio', 'Res. 1403/2007, art. 26'),
  ('obligatorios', 'OB-10', '¿Participa en un programa posconsumo de medicamentos del usuario final?', 10, 'obligatorio', 'Decreto 1076/2015, Tít. 6 (antes Decreto 4741/2005, art. 20); Res. 0371/2009'),
  ('obligatorios', 'OB-11', '¿La dirección técnica está a cargo de una persona con el perfil exigido?', 11, 'obligatorio', 'Decreto 780/2016 y Res. 1403/2007 (perfiles admitidos pendientes de verificar)'),
  ('residuos', 'RES-1', '¿Registra cada mes cuántos residuos genera por tipo?', 12, 'madurez', NULL),
  ('residuos', 'RES-2', '¿Los recipientes están rotulados según el código de colores (Res. 2184 de 2019 y Res. 591 de 2024)?', 13, 'madurez', NULL),
  ('residuos', 'RES-3', '¿Revisa periódicamente que la separación se cumpla?', 14, 'madurez', NULL),
  ('residuos', 'RES-4', '¿Tiene acciones para generar menos residuos?', 15, 'madurez', NULL),
  ('vencimientos_perdidas', 'VEN-1', '¿Revisa periódicamente las fechas de vencimiento?', 16, 'madurez', NULL),
  ('vencimientos_perdidas', 'VEN-2', '¿Tiene una acción definida para lo próximo a vencer?', 17, 'madurez', NULL),
  ('vencimientos_perdidas', 'VEN-3', '¿Tiene acuerdos de devolución con proveedores y los usa?', 18, 'madurez', NULL),
  ('vencimientos_perdidas', 'VEN-4', '¿Registra cuánto pierde por vencimientos?', 19, 'madurez', NULL),
  ('vencimientos_perdidas', 'VEN-5', '¿Guarda las actas o certificados de destrucción?', 20, 'madurez', NULL),
  ('capacitacion_documentos', 'CAP-1', '¿El personal recibe capacitación en residuos y vencimientos?', 21, 'madurez', NULL),
  ('capacitacion_documentos', 'CAP-2', '¿Guarda evidencia de esas capacitaciones?', 22, 'madurez', NULL),
  ('capacitacion_documentos', 'CAP-3', '¿Tiene procedimientos escritos de almacenamiento y vencimientos?', 23, 'madurez', NULL),
  ('capacitacion_documentos', 'CAP-4', '¿Actualiza los documentos cuando algo cambia?', 24, 'madurez', NULL),
  ('seguimiento_mejora', 'MEJ-1', '¿Calcula indicadores de gestión?', 25, 'madurez', NULL),
  ('seguimiento_mejora', 'MEJ-2', '¿Asigna responsable y fecha a cada problema detectado?', 26, 'madurez', NULL),
  ('seguimiento_mejora', 'MEJ-3', '¿Hace seguimiento a lo que se decidió?', 27, 'madurez', NULL),
  ('seguimiento_mejora', 'MEJ-4', '¿Compara sus resultados entre periodos?', 28, 'madurez', NULL)
) AS i(area, code, txt, pos, kind, basis) WHERE v.version_number = 2;

-- ───────── Personal: temas base de capacitación en cada droguería existente ─────────
INSERT INTO training_topics (drugstore_id, topic_name, validity_months)
SELECT d.id, t.n, 12
FROM drugstores d
CROSS JOIN (VALUES
  ('Gestión integral de residuos (PGIRASA)'),
  ('Control de vencimientos y rotación de lotes'),
  ('Procedimientos del servicio farmacéutico'),
  ('Bioseguridad')
) AS t(n)
WHERE d.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM training_topics x WHERE x.drugstore_id = d.id AND x.deleted_at IS NULL AND lower(x.topic_name) = lower(t.n));
