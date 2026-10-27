import { z } from 'zod';

/** Áreas de madurez de todas las versiones del instrumento (v1: 5 áreas; v2: 4 áreas del prototipo). */
export const AREAS = [
  'residuos', 'vencimientos', 'segregacion', 'personal_capacitacion', 'documentacion',
  'vencimientos_perdidas', 'capacitacion_documentos', 'seguimiento_mejora',
] as const;
export type Area = (typeof AREAS)[number];
export const AREA_LABELS: Record<Area, string> = {
  residuos: 'Residuos',
  vencimientos: 'Vencimientos',
  segregacion: 'Segregación',
  personal_capacitacion: 'Personal y capacitación',
  documentacion: 'Documentación',
  vencimientos_perdidas: 'Vencimientos y pérdidas',
  capacitacion_documentos: 'Capacitación y documentos',
  seguimiento_mejora: 'Seguimiento y mejora',
};
export const RESPONSES = ['si', 'no', 'na'] as const;

export const drugstoreParams = z.object({ id: z.uuid() });
export const params = z.object({ id: z.uuid(), diagId: z.uuid() });

const date = z.iso.date().refine((d) => d >= '2000-01-01' && d <= '2100-12-31', 'fecha fuera de rango');

/**
 * Una respuesta: `response` (si / no / na) en el instrumento v2, o `score` (1–5) en el v1.
 * `response: null` borra la respuesta de ese ítem.
 */
export const answerInput = z
  .object({
    itemId: z.uuid(),
    response: z.enum(RESPONSES).nullable().optional(),
    score: z.number().int().min(1).max(5).optional(),
  })
  .refine((a) => (a.response !== undefined) !== (a.score !== undefined), 'Indique response o score, no ambos');
const answers = z
  .array(answerInput)
  .max(100)
  .refine((a) => new Set(a.map((x) => x.itemId)).size === a.length, 'Hay ítems repetidos');

export const createBody = z.object({ performedOn: date, notes: z.string().trim().min(1).max(1000).nullish(), answers: answers.default([]) });
export const updateBody = z
  .object({ performedOn: date, notes: z.string().trim().min(1).max(1000).nullable(), answers })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Debe enviar al menos un campo');

export const listQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const item = z.object({ id: z.uuid(), code: z.string(), prompt: z.string(), position: z.number().int() });
export const instrumentResponse = z.object({
  instrument: z.object({
    id: z.uuid(), versionNumber: z.number().int(), title: z.string(), description: z.string().nullable(),
    scoring: z.enum(['likert_avg', 'compliance_ratio']),
    escala: z.string(),
    obligatorios: z.array(item.extend({ legalBasis: z.string().nullable() })),
    areas: z.array(z.object({ area: z.enum(AREAS), label: z.string(), items: z.array(item) })),
    aviso: z.string(),
  }),
});

const obligatoriosSummary = z.object({
  total: z.number().int(),
  aplicables: z.number().int(),
  cumple: z.number().int(),
  noAplica: z.number().int(),
  sinResponder: z.number().int(),
  noCumple: z.array(z.object({ itemId: z.uuid(), code: z.string(), prompt: z.string(), legalBasis: z.string().nullable() })),
});
const areaScore = z.object({ area: z.enum(AREAS), label: z.string(), score: z.number().nullable(), answered: z.number().int(), items: z.number().int() });

export const diagnosisDetail = z.object({
  id: z.uuid(), performedOn: z.string(), notes: z.string().nullable(),
  instrument: z.object({ id: z.uuid(), versionNumber: z.number().int(), title: z.string(), scoring: z.enum(['likert_avg', 'compliance_ratio']) }),
  answers: z.array(z.object({
    itemId: z.uuid(), code: z.string(), area: z.string(), kind: z.enum(['obligatorio', 'madurez']),
    response: z.enum(RESPONSES).nullable(), score: z.number().int().nullable(),
  })),
  obligatorios: obligatoriosSummary,
  areaScores: z.array(areaScore),
  overallScore: z.number().nullable(),
  answeredCount: z.number().int(), itemCount: z.number().int(),
  aviso: z.string(),
  createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(),
});
export const detailResponse = z.object({ item: diagnosisDetail });
export const listResponse = z.object({
  items: z.array(z.object({
    id: z.uuid(), performedOn: z.string(), versionNumber: z.number().int(), overallScore: z.number().nullable(),
    answeredCount: z.number().int(), itemCount: z.number().int(),
    obligatorios: z.object({ cumple: z.number().int(), aplicables: z.number().int(), pendientes: z.number().int(), sinResponder: z.number().int() }),
    areaScores: z.array(z.object({ area: z.enum(AREAS), label: z.string(), score: z.number().nullable() })),
    createdAt: z.iso.datetime(),
  })),
  total: z.number().int(), limit: z.number().int(), offset: z.number().int(),
});
