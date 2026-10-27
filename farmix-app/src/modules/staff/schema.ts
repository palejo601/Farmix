import { z } from 'zod';

export const drugstoreParams = z.object({ id: z.uuid() });
export const workerParams = z.object({ id: z.uuid(), workerId: z.uuid() });
export const trainingParams = z.object({ id: z.uuid(), trainingId: z.uuid() });

const date = z.iso.date().refine((d) => d >= '2000-01-01' && d <= '2100-12-31', 'fecha fuera de rango');
const page = { limit: z.coerce.number().int().min(1).max(200).default(100), offset: z.coerce.number().int().min(0).default(0) };

// ---- Trabajadores ----
export const workerBody = z.object({
  workerCode: z.string().trim().min(1).max(30),
  fullName: z.string().trim().min(2).max(120),
  jobTitle: z.string().trim().min(1).max(80).nullish(),
});
export const workerUpdate = z
  .object({ workerCode: z.string().trim().min(1).max(30), fullName: z.string().trim().min(2).max(120), jobTitle: z.string().trim().min(1).max(80).nullable() })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Debe enviar al menos un campo');
export const workerQuery = z.object({ q: z.string().trim().min(1).max(60).optional(), ...page });
export const workerDto = z.object({
  id: z.uuid(), workerCode: z.string(), fullName: z.string(), jobTitle: z.string().nullable(),
  createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(),
});
export const workerResponse = z.object({ item: workerDto });
export const workerList = z.object({ items: z.array(workerDto), total: z.number().int(), limit: z.number().int(), offset: z.number().int() });

// ---- Temas ----
export const topicBody = z.object({
  topicName: z.string().trim().min(2).max(120),
  validityMonths: z.number().int().min(1).max(60).optional(),
  description: z.string().trim().min(1).max(300).nullish(),
});
export const topicDto = z.object({
  id: z.uuid(), topicName: z.string(), validityMonths: z.number().int(), description: z.string().nullable(), createdAt: z.iso.datetime(),
});
export const topicResponse = z.object({ item: topicDto });
export const topicList = z.object({ items: z.array(topicDto) });

// ---- Capacitaciones ----
export const TRAINING_STATUSES = ['vigente', 'pendiente', 'vencida'] as const;
export const trainingBody = z.object({
  workerId: z.uuid(),
  topicId: z.uuid(),
  trainedOn: date.nullish(),
  validUntil: date.nullish(),
  supportFileId: z.uuid().nullish(),
});
export const trainingUpdate = z
  .object({ trainedOn: date.nullable(), validUntil: date.nullable(), supportFileId: z.uuid().nullable() })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Debe enviar al menos un campo');
export const trainingQuery = z.object({
  workerId: z.uuid().optional(),
  topicId: z.uuid().optional(),
  status: z.enum(TRAINING_STATUSES).optional(),
  ...page,
});
export const trainingDto = z.object({
  id: z.uuid(), workerId: z.uuid(), workerName: z.string(), topicId: z.uuid(), topicName: z.string(),
  trainedOn: z.string().nullable(), validUntil: z.string().nullable(), supportFileId: z.uuid().nullable(),
  status: z.enum(TRAINING_STATUSES), createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(),
});
export const trainingResponse = z.object({ item: trainingDto });
export const trainingList = z.object({ items: z.array(trainingDto), total: z.number().int(), limit: z.number().int(), offset: z.number().int() });
