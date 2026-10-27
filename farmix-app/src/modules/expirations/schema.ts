import { z } from 'zod';

export const STATUSES = ['vigente', 'proximo_a_vencer', 'vencido', 'gestionado'] as const;
export const DESTINATIONS = ['pendiente', 'devuelto_proveedor', 'destruccion_gestor', 'averia_deterioro'] as const;

export const params = z.object({ id: z.uuid(), expirationId: z.uuid() });
export const drugstoreParams = z.object({ id: z.uuid() });

const money = z
  .number()
  .min(0)
  .max(100_000_000)
  .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, 'máximo 2 decimales');
const date = z.iso.date().refine((d) => d >= '2000-01-01' && d <= '2100-12-31', 'fecha fuera de rango');
const text = (max: number) => z.string().trim().min(1).max(max);

export const createBody = z.object({
  productName: text(160),
  batch: text(60),
  sanitaryRegistry: text(60).nullish(),
  holder: text(120).nullish(),
  expiresOn: date,
  quantity: z.number().int().min(1).max(1_000_000),
  unitCost: money.optional(),
  destination: z.enum(DESTINATIONS).optional(),
  supportRef: text(120).nullish(),
});

export const updateBody = createBody
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Debe enviar al menos un campo');

export const listQuery = z.object({
  status: z.enum(STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export const productDto = z.object({
  id: z.uuid(),
  productName: z.string(),
  batch: z.string(),
  sanitaryRegistry: z.string().nullable(),
  holder: z.string().nullable(),
  expiresOn: z.string(),
  daysLeft: z.number().int(),
  quantity: z.number().int(),
  unitCost: z.number(),
  totalCost: z.number(),
  destination: z.enum(DESTINATIONS),
  supportRef: z.string().nullable(),
  managedAt: z.iso.datetime().nullable(),
  status: z.enum(STATUSES),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const itemResponse = z.object({ item: productDto });
export const listResponse = z.object({
  items: z.array(productDto),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
});
export const alertsResponse = z.object({
  items: z.array(productDto),
  summary: z.object({ vencidos: z.number().int(), proximos: z.number().int() }),
});
const bucket = z.object({ productos: z.number().int(), unidades: z.number().int(), valor: z.number() });
export const lossesResponse = z.object({
  moneda: z.literal('COP'),
  /** Destruida por gestor autorizado o con avería/deterioro: ya se perdió. */
  perdidaConfirmada: bucket,
  /** Pendiente de gestión y vencida o próxima a vencer. */
  valorEnRiesgo: bucket,
  /** Devuelta al proveedor: valor recuperado. */
  devueltoProveedor: bucket,
  anticipacionDias: z.number().int(),
  aviso: z.string(),
});

export type ProductDto = z.infer<typeof productDto>;
