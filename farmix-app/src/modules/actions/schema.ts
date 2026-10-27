import { z } from 'zod';

export const STATES = ['pendiente', 'en_curso', 'cerrada'] as const;
export const drugstoreParams = z.object({ id: z.uuid() });
export const params = z.object({ id: z.uuid(), actionId: z.uuid() });

const date = z.iso.date().refine((d) => d >= '2000-01-01' && d <= '2100-12-31', 'fecha fuera de rango');
const finding = z.string().trim().min(3).max(500);
const action = z.string().trim().min(3).max(500);
const responsible = z.string().trim().min(2).max(120);

// Acción, responsable y fecha pueden quedar «por definir» (p. ej. una mejora creada desde un incumplimiento del diagnóstico).
export const createBody = z.object({
  finding,
  correctiveAction: action.nullish(),
  responsible: responsible.nullish(),
  dueOn: date.nullish(),
  state: z.enum(STATES).optional(),
  closedOn: date.nullish(),
  originItemId: z.uuid().nullish(),
});
export const updateBody = z
  .object({ finding, correctiveAction: action.nullable(), responsible: responsible.nullable(), dueOn: date.nullable(), state: z.enum(STATES), closedOn: date.nullable() })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Debe enviar al menos un campo');

export const listQuery = z.object({
  state: z.enum(STATES).optional(),
  overdue: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export const actionDto = z.object({
  id: z.uuid(), finding: z.string(), correctiveAction: z.string().nullable(), responsible: z.string().nullable(), dueOn: z.string().nullable(),
  originItemId: z.uuid().nullable(),
  state: z.enum(STATES), closedOn: z.string().nullable(), overdue: z.boolean(),
  createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(),
});
export const itemResponse = z.object({ item: actionDto });
export const listResponse = z.object({ items: z.array(actionDto), total: z.number().int(), limit: z.number().int(), offset: z.number().int() });
