import { z } from 'zod';

export const exportResponse = z.object({
  generadoEn: z.iso.datetime(),
  aviso: z.string(),
  cuenta: z.object({
    id: z.uuid(),
    email: z.string(),
    fullName: z.string(),
    privacyAcceptedAt: z.iso.datetime().nullable(),
    privacyVersion: z.string().nullable(),
    createdAt: z.iso.datetime(),
  }),
  sesionesActivas: z.number().int(),
  auditoria: z.array(
    z.object({ action: z.string(), resource: z.string(), outcome: z.string(), createdAt: z.iso.datetime() }),
  ),
});

export const deletionResponse = z.object({
  deletionRequestedAt: z.iso.datetime(),
  deletionScheduledAt: z.iso.datetime(),
  message: z.string(),
});
