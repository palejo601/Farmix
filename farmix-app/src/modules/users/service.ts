import { eq } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import { users } from '../../db/schema.js';
import { audit } from '../../shared/audit.js';
import { PRIVACY_VERSION } from '../auth/service.js';

export async function updateProfile(db: Db, userId: string, fullName: string, requestId: string) {
  const [row] = await db.update(users).set({ fullName, updatedAt: new Date() }).where(eq(users.id, userId)).returning();
  await audit(db, { userId, action: 'users.update', resource: 'users', resourceId: userId, outcome: 'success', requestId });
  return row!;
}

export async function acceptPrivacy(db: Db, userId: string, requestId: string) {
  const [row] = await db
    .update(users)
    .set({ privacyAcceptedAt: new Date(), privacyVersion: PRIVACY_VERSION, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  await audit(db, { userId, action: 'users.accept_privacy', resource: 'users', resourceId: userId, outcome: 'success', requestId });
  return row!;
}
