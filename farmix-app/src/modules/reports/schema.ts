import { z } from 'zod';

export const drugstoreParams = z.object({ id: z.uuid() });
const date = z.iso.date().refine((d) => d >= '2000-01-01' && d <= '2100-12-31', 'fecha fuera de rango');

export const query = z
  .object({ from: date.optional(), to: date.optional() })
  .refine((q) => !q.from || !q.to || q.from <= q.to, 'from no puede ser posterior a to');

const bucket = z.object({ productos: z.number().int(), unidades: z.number().int(), valor: z.number() });
export const reportResponse = z.object({
  generadoEn: z.iso.datetime(),
  aviso: z.string(),
  periodo: z.object({ desde: z.string(), hasta: z.string() }),
  drugstore: z.object({ id: z.uuid(), name: z.string(), city: z.string(), expiryAlertDays: z.number().int() }),
  vencimientos: z.object({
    productos: z.object({ total: z.number().int(), vigente: z.number().int(), proximoAVencer: z.number().int(), vencido: z.number().int(), gestionado: z.number().int() }),
    perdidaConfirmada: bucket,
    valorEnRiesgo: bucket,
    moneda: z.literal('COP'),
  }),
  residuos: z.object({
    registros: z.number().int(), totalKg: z.number(),
    porClasificacion: z.array(z.object({ clasificacion: z.string(), registros: z.number().int(), kg: z.number() })),
  }),
  segregacion: z.object({ verificaciones: z.number().int(), revisados: z.number().int(), bienSegregados: z.number().int(), porcentajeCorrecto: z.number().nullable() }),
  personal: z.object({
    trabajadores: z.number().int(),
    capacitaciones: z.object({ total: z.number().int(), vigente: z.number().int(), pendiente: z.number().int(), vencida: z.number().int() }),
  }),
  planDeMejoramiento: z.object({ total: z.number().int(), pendiente: z.number().int(), enCurso: z.number().int(), cerrada: z.number().int(), atrasadas: z.number().int() }),
  diagnostico: z
    .object({
      id: z.uuid(), fecha: z.string(), versionInstrumento: z.number().int(), puntajeGlobal: z.number().nullable(),
      areas: z.array(z.object({ area: z.string(), label: z.string(), score: z.number().nullable() })),
    })
    .nullable(),
});
