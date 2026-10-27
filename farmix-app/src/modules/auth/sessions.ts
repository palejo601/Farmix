import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, isNull, ne } from 'drizzle-orm';
import type { Config } from '../../config/env.js';
import type { Db } from '../../db/client.js';
import { sessions, users } from '../../db/schema.js';
import type { UserDto } from './schema.js';

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
export const newToken = () => randomBytes(32).toString('base64url');

export type UserRow = typeof users.$inferSelect;

export function toUserDto(u: UserRow): UserDto {
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    privacyAcceptedAt: u.privacyAcceptedAt?.toISOString() ?? null,
    deletionScheduledAt: u.deletionScheduledAt?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
  };
}

export async function createSession(db: Db, userId: string, cfg: Config) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + cfg.SESSION_MAX_DAYS * 86_400_000);
  await db.insert(sessions).values({ userId, tokenHash: hashToken(token), expiresAt });
  return { token, expiresAt };
}

/** Devuelve la sesión válida (no revocada, dentro del límite absoluto y del de inactividad). */
export async function resolveSession(db: Db, token: string, cfg: Config) {
  const now = new Date();
  const idleCutoff = new Date(now.getTime() - cfg.SESSION_IDLE_HOURS * 3_600_000);
  const [row] = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.tokenHash, hashToken(token)),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, now),
        gt(sessions.lastSeenAt, idleCutoff),
      ),
    )
    .limit(1);
  if (!row) return null;
  if (now.getTime() - row.session.lastSeenAt.getTime() > 60_000) {
    await db.update(sessions).set({ lastSeenAt: now }).where(eq(sessions.id, row.session.id));
  }
  return { sessionId: row.session.id, user: row.user };
}

export async function revokeSession(db: Db, sessionId: string) {
  await db.update(sessions).set({ revokedAt: new Date() }).where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt)));
}

export async function revokeUserSessions(db: Db, userId: string, exceptSessionId?: string) {
  const conds = [eq(sessions.userId, userId), isNull(sessions.revokedAt)];
  if (exceptSessionId) conds.push(ne(sessions.id, exceptSessionId));
  await db.update(sessions).set({ revokedAt: new Date() }).where(and(...conds));
}
