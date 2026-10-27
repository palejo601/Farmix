import { z } from 'zod';
import { KIND_KEYS } from '../imports/kinds.js';

export const params = z.object({ migrationId: z.uuid() });
const rows = z.array(z.record(z.string(), z.unknown())).max(1000);

export const createBody = z
  .object({
    drugstoreId: z.uuid(),
    isDemo: z.boolean().default(false),
    data: z.object({ expirations: rows.optional(), waste: rows.optional(), segregation: rows.optional() }).strict(),
  })
  .refine((b) => Object.values(b.data).some((r) => r && r.length > 0), { path: ['data'], message: 'No hay datos para migrar' });

const bucket = z.object({ recibidas: z.number().int(), validas: z.number().int(), invalidas: z.number().int(), duplicadas: z.number().int() });
export const migrationDto = z.object({
  id: z.uuid(), drugstoreId: z.uuid(), isDemo: z.boolean(), phase: z.enum(['pendiente', 'confirmada', 'revertida']),
  contentHash: z.string(),
  summary: z.record(z.enum(KIND_KEYS), bucket),
  errors: z.array(z.object({ kind: z.enum(KIND_KEYS), row: z.number().int(), state: z.string(), errors: z.array(z.string()) })),
  inserted: z.record(z.string(), z.number().int()).nullable(),
  aviso: z.string(),
  createdAt: z.iso.datetime(),
});
export const migrationResponse = z.object({ migration: migrationDto });
