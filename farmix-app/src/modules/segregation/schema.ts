import { z } from 'zod';

export const drugstoreParams = z.object({ id: z.uuid() });
export const params = z.object({ id: z.uuid(), checkId: z.uuid() });

const date = z.iso.date().refine((d) => d >= '2000-01-01' && d <= '2100-12-31', 'fecha fuera de rango');
const reviewed = z.number().int().min(1).max(100_000);
const correct = z.number().int().min(0).max(100_000);

export const createBody = z
  .object({
    checkedOn: date,
    itemsReviewed: reviewed,
    itemsCorrect: correct,
    location: z.string().trim().min(1).max(120),
    observations: z.string().trim().min(1).max(500).nullish(),
  })
  .refine((v) => v.itemsCorrect <= v.itemsReviewed, { path: ['itemsCorrect'], message: 'Los bien segregados no pueden superar los revisados' });

export const updateBody = z
  .object({
    checkedOn: date,
    itemsReviewed: reviewed,
    itemsCorrect: correct,
    location: z.string().trim().min(1).max(120),
    observations: z.string().trim().min(1).max(500).nullable(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Debe enviar al menos un campo');

export const listQuery = z
  .object({
    from: date.optional(),
    to: date.optional(),
    location: z.string().trim().min(1).max(120).optional(),
    limit: z.coerce.number().int().min(1).max(200).default(100),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, 'from no puede ser posterior a to');

export const checkDto = z.object({
  id: z.uuid(),
  checkedOn: z.string(),
  itemsReviewed: z.number().int(),
  itemsCorrect: z.number().int(),
  percentCorrect: z.number(),
  location: z.string(),
  observations: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export const itemResponse = z.object({ item: checkDto });
export const listResponse = z.object({
  items: z.array(checkDto),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
  resumen: z.object({ revisados: z.number().int(), bienSegregados: z.number().int(), porcentajeCorrecto: z.number().nullable() }),
});
