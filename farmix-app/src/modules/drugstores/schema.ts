import { z } from 'zod';
import { email } from '../auth/schema.js';

export const ROLES = ['propietario', 'administrador', 'operador'] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_RANK: Record<Role, number> = { operador: 1, administrador: 2, propietario: 3 };

export const idParams = z.object({ id: z.uuid() });
export const memberParams = z.object({ id: z.uuid(), userId: z.uuid() });

const name = z.string().trim().min(2).max(120);
const city = z.string().trim().min(2).max(80);
const alertDays = z.number().int().min(1).max(365);

export const createBody = z.object({ name, city: city.optional(), expiryAlertDays: alertDays.optional() });
export const updateBody = z
  .object({ name: name.optional(), city: city.optional(), expiryAlertDays: alertDays.optional() })
  .refine((v) => Object.keys(v).length > 0, 'Debe enviar al menos un campo');

export const addMemberBody = z.object({ email, role: z.enum(['administrador', 'operador']) });
export const updateMemberBody = z.object({ role: z.enum(['administrador', 'operador']) });

export const drugstoreDto = z.object({
  id: z.uuid(),
  name: z.string(),
  city: z.string(),
  expiryAlertDays: z.number().int(),
  role: z.enum(ROLES),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export const memberDto = z.object({
  userId: z.uuid(),
  email: z.string(),
  fullName: z.string(),
  role: z.enum(ROLES),
  createdAt: z.iso.datetime(),
});

export const drugstoreResponse = z.object({ drugstore: drugstoreDto });
export const drugstoreListResponse = z.object({ drugstores: z.array(drugstoreDto) });
export const memberResponse = z.object({ member: memberDto });
export const memberListResponse = z.object({ members: z.array(memberDto) });
