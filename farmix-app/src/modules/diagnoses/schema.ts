import { z } from 'zod';

export const AREAS = ['residuos', 'vencimientos', 'segregacion', 'personal_capacitacion', 'documentacion'] as const;
export const AREA_LABELS: Record<(typeof AREAS)[number], string> = {
  residuos: 'Residuos',
  vencimientos: 'Vencimientos',
  segregacion: 'Segregación',
  personal_capacitacion: 'Personal y capacitación',
  documentacion: 'Documentación',
};

export const drugstoreParams = z.object({ id: z.uuid() });
export const params = z.object({ id: z.uuid(), diagId: z.uuid() });

const date = z.iso.date().refine((d) => d >= '2000-01-01' && d <= '2100-12-31', 'fecha fuera de rango');
const answers = z
  .array(z.object({ itemId: z.uuid(), score: z.number().int().min(1).max(5) }))
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

export const instrumentResponse = z.object({
  instrument: z.object({
    id: z.uuid(), versionNumber: z.number().int(), title: z.string(), description: z.string().nullable(),
    escala: z.string(),
    areas: z.array(z.object({
      area: z.enum(AREAS), label: z.string(),
      items: z.array(z.object({ id: z.uuid(), code: z.string(), prompt: z.string(), position: z.number().int() })),
    })),
  }),
});

const areaScore = z.object({ area: z.enum(AREAS), label: z.string(), score: z.number().nullable(), answered: z.number().int(), items: z.number().int() });
export const diagnosisDetail = z.object({
  id: z.uuid(), performedOn: z.string(), notes: z.string().nullable(),
  instrument: z.object({ id: z.uuid(), versionNumber: z.number().int(), title: z.string() }),
  answers: z.array(z.object({ itemId: z.uuid(), code: z.string(), area: z.enum(AREAS), score: z.number().int() })),
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
    answeredCount: z.number().int(), itemCount: z.number().int(), createdAt: z.iso.datetime(),
  })),
  total: z.number().int(), limit: z.number().int(), offset: z.number().int(),
});
