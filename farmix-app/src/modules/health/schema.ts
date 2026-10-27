import { z } from 'zod';

export const healthResponse = z.object({
  estado: z.enum(['ok', 'degradado']),
  baseDeDatos: z.enum(['ok', 'error']),
  marca: z.string(),
  fecha: z.iso.datetime(),
});

export type HealthResponse = z.infer<typeof healthResponse>;
