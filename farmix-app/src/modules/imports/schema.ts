import { z } from 'zod';
import { KIND_KEYS } from './kinds.js';

export const drugstoreParams = z.object({ id: z.uuid() });
export const params = z.object({ id: z.uuid(), importId: z.uuid() });
export const previewQuery = z.object({ kind: z.enum(KIND_KEYS) });

const rowResult = z.object({
  row: z.number().int(),
  state: z.enum(['valida', 'invalida', 'duplicada']),
  errors: z.array(z.string()),
  data: z.record(z.string(), z.unknown()).optional(),
});
export const importDto = z.object({
  id: z.uuid(), kind: z.enum(KIND_KEYS), fileName: z.string(), phase: z.enum(['vista_previa', 'confirmada']),
  caducada: z.boolean(), expiresAt: z.iso.datetime(),
  totals: z.object({ filas: z.number().int(), validas: z.number().int(), invalidas: z.number().int(), duplicadas: z.number().int() }),
  insertedCount: z.number().int().nullable(),
  rows: z.array(rowResult),
  aviso: z.string(),
  createdAt: z.iso.datetime(),
});
export const importResponse = z.object({ import: importDto });
export const confirmResponse = z.object({ inserted: z.number().int(), skipped: z.number().int(), import: importDto });
