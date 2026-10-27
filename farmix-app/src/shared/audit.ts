import type { Db } from '../db/client.js';
import { auditLogs } from '../db/schema.js';

export interface AuditEntry {
  userId: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  outcome: 'success' | 'failure';
  requestId?: string;
}

/** Registra usuario, acción, recurso, fecha y resultado. Nunca recibe contraseñas ni tokens. */
export async function audit(db: Db, entry: AuditEntry): Promise<void> {
  await db.insert(auditLogs).values({
    userId: entry.userId,
    action: entry.action,
    resource: entry.resource,
    resourceId: entry.resourceId ?? null,
    outcome: entry.outcome,
    requestId: entry.requestId ?? null,
  });
}
