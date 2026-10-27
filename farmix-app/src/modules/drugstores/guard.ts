import type { FastifyRequest } from 'fastify';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import type { Db } from '../../db/client.js';
import { drugstoreMembers, drugstores } from '../../db/schema.js';
import { AppError } from '../../shared/errors.js';
import { requireAuth } from '../auth/plugin.js';
import { ROLE_RANK, type Role } from './schema.js';

export interface Membership {
  drugstore: typeof drugstores.$inferSelect;
  role: Role;
}

declare module 'fastify' {
  interface FastifyRequest {
    membership: Membership | null;
  }
}

const NOT_FOUND = () => new AppError(404, 'NOT_FOUND', 'Recurso no encontrado');

/** Membresía activa del usuario en una droguería no borrada; null si no existe. */
export async function findMembership(db: Db, userId: string, drugstoreId: string): Promise<Membership | null> {
  const [row] = await db
    .select({ drugstore: drugstores, role: drugstoreMembers.memberRole })
    .from(drugstoreMembers)
    .innerJoin(drugstores, eq(drugstores.id, drugstoreMembers.drugstoreId))
    .where(and(eq(drugstoreMembers.drugstoreId, drugstoreId), eq(drugstoreMembers.userId, userId), isNull(drugstoreMembers.deletedAt), isNull(drugstores.deletedAt)))
    .limit(1);
  return row ? { drugstore: row.drugstore, role: row.role } : null;
}

/**
 * Aislamiento por droguería: exige sesión y membresía activa. Quien no es miembro (o la droguería
 * no existe / está borrada) recibe 404, nunca datos. Un miembro con rol insuficiente recibe 403.
 * Corre en onRequest, antes de validar el cuerpo, para no filtrar nada a terceros.
 */
export function guard(minRole: Role = 'operador') {
  return [
    requireAuth,
    async (req: FastifyRequest) => {
      const id = (req.params as { id?: string }).id;
      if (!id || !z.uuid().safeParse(id).success) throw NOT_FOUND();
      const row = await findMembership(req.server.db, req.auth!.user.id, id);
      if (!row) throw NOT_FOUND();
      if (ROLE_RANK[row.role] < ROLE_RANK[minRole]) {
        throw new AppError(403, 'FORBIDDEN', 'Su rol no permite esta acción');
      }
      req.membership = row;
    },
  ];
}
