import { and, desc, eq, gt, isNull, lte } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import { auditLogs, drugstoreMembers, drugstores, sessions, users } from '../../db/schema.js';
import { audit } from '../../shared/audit.js';
import type { UserRow } from '../auth/sessions.js';

export const GRACE_DAYS = 15;

export async function exportPersonalData(db: Db, user: UserRow, requestId: string) {
  const logs = await db.select().from(auditLogs).where(eq(auditLogs.userId, user.id)).orderBy(desc(auditLogs.createdAt)).limit(1000);
  const active = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(and(eq(sessions.userId, user.id), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date())));
  await audit(db, { userId: user.id, action: 'personal_data.export', resource: 'users', resourceId: user.id, outcome: 'success', requestId });
  return {
    generadoEn: new Date().toISOString(),
    aviso: 'FARMIX es un producto mínimo viable en estudio. Esta descarga contiene solo sus datos de cuenta; no se almacenan datos clínicos ni de pacientes.',
    cuenta: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      privacyAcceptedAt: user.privacyAcceptedAt?.toISOString() ?? null,
      privacyVersion: user.privacyVersion,
      createdAt: user.createdAt.toISOString(),
    },
    sesionesActivas: active.length,
    auditoria: logs.map((l) => ({ action: l.action, resource: l.resource, outcome: l.outcome, createdAt: l.createdAt.toISOString() })),
  };
}

/** Idempotente: si ya hay solicitud vigente, la conserva. */
export async function requestDeletion(db: Db, user: UserRow, requestId: string) {
  let requested = user.deletionRequestedAt;
  let scheduled = user.deletionScheduledAt;
  if (!requested || !scheduled) {
    requested = new Date();
    scheduled = new Date(requested.getTime() + GRACE_DAYS * 86_400_000);
    await db.update(users).set({ deletionRequestedAt: requested, deletionScheduledAt: scheduled, updatedAt: new Date() }).where(eq(users.id, user.id));
    await audit(db, { userId: user.id, action: 'personal_data.deletion_request', resource: 'users', resourceId: user.id, outcome: 'success', requestId });
  }
  return { deletionRequestedAt: requested.toISOString(), deletionScheduledAt: scheduled.toISOString() };
}

export async function cancelDeletion(db: Db, user: UserRow, requestId: string) {
  await db.update(users).set({ deletionRequestedAt: null, deletionScheduledAt: null, updatedAt: new Date() }).where(eq(users.id, user.id));
  await audit(db, { userId: user.id, action: 'personal_data.deletion_cancel', resource: 'users', resourceId: user.id, outcome: 'success', requestId });
}

/** Elimina las cuentas cuya gracia venció. Sus registros de auditoría quedan sin usuario asociado. */
export async function purgeDueAccounts(db: Db, now = new Date()): Promise<number> {
  const due = await db.select({ id: users.id }).from(users).where(lte(users.deletionScheduledAt, now));
  for (const { id } of due) {
    // Una droguería sin propietario no tendría quién la administre: se archiva (borrado lógico).
    const owned = await db
      .select({ id: drugstoreMembers.drugstoreId })
      .from(drugstoreMembers)
      .where(and(eq(drugstoreMembers.userId, id), eq(drugstoreMembers.memberRole, 'propietario'), isNull(drugstoreMembers.deletedAt)));
    for (const o of owned) await db.update(drugstores).set({ deletedAt: now, updatedAt: now }).where(eq(drugstores.id, o.id));
    await db.delete(users).where(eq(users.id, id));
    await audit(db, { userId: null, action: 'personal_data.account_purged', resource: 'users', resourceId: id, outcome: 'success' });
  }
  return due.length;
}
