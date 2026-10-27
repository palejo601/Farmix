import { z } from 'zod';

export const CLASSIFICATIONS = ['riesgo_biologico', 'peligroso_quimico', 'aprovechable', 'organico_aprovechable', 'no_aprovechable'] as const;
export const UNITS = ['kg', 'g'] as const;
export const ORIGINS = ['medicamento_vencido', 'otro'] as const;

export const drugstoreParams = z.object({ id: z.uuid() });
export const params = z.object({ id: z.uuid(), wasteId: z.uuid() });

const date = z.iso.date().refine((d) => d >= '2000-01-01' && d <= '2100-12-31', 'fecha fuera de rango');
const quantity = z
  .number()
  .gt(0)
  .max(100_000)
  .refine((v) => Math.abs(v * 1000 - Math.round(v * 1000)) < 1e-6, 'máximo 3 decimales');

export const createBody = z.object({
  recordedOn: date,
  classification: z.enum(CLASSIFICATIONS),
  quantity,
  unit: z.enum(UNITS),
  origin: z.enum(ORIGINS).nullish(),
  notes: z.string().trim().min(1).max(500).nullish(),
});
export const updateBody = createBody.partial().refine((v) => Object.keys(v).length > 0, 'Debe enviar al menos un campo');

export const listQuery = z
  .object({
    from: date.optional(),
    to: date.optional(),
    classification: z.enum(CLASSIFICATIONS).optional(),
    limit: z.coerce.number().int().min(1).max(200).default(100),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, 'from no puede ser posterior a to');

export const wasteDto = z.object({
  id: z.uuid(),
  recordedOn: z.string(),
  classification: z.enum(CLASSIFICATIONS),
  quantity: z.number(),
  unit: z.enum(UNITS),
  origin: z.enum(ORIGINS).nullable(),
  notes: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export const itemResponse = z.object({ item: wasteDto });
export const listResponse = z.object({
  items: z.array(wasteDto),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
});

export type WasteDto = z.infer<typeof wasteDto>;
