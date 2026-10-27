import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import type { Config } from '../../config/env.js';
import type { Db } from '../../db/client.js';
import { devMailbox, passwordResets, users } from '../../db/schema.js';
import { audit } from '../../shared/audit.js';
import { AppError } from '../../shared/errors.js';
import { hashPassword, verifyDummy, verifyPassword } from '../../shared/password.js';
import { createSession, hashToken, newToken, revokeUserSessions, type UserRow } from './sessions.js';

export const PRIVACY_VERSION = 'v1';
export const MAX_FAILED_LOGINS = 5;
export const LOCK_MINUTES = 15;
const RESET_TTL_MS = 60 * 60 * 1000;

interface Ctx {
  db: Db;
  config: Config;
  requestId: string;
}

const findByEmail = async (db: Db, email: string) =>
  (await db.select().from(users).where(sql`lower(${users.email}) = ${email}`).limit(1))[0];

export async function register(ctx: Ctx, input: { email: string; password: string; fullName: string }) {
  const { db } = ctx;
  if (await findByEmail(db, input.email)) {
    await audit(db, { userId: null, action: 'auth.register', resource: 'users', outcome: 'failure', requestId: ctx.requestId });
    throw new AppError(409, 'CONFLICT', 'No fue posible completar el registro con esos datos');
  }
  const passwordHash = await hashPassword(input.password);
  const [user] = await db
    .insert(users)
    .values({
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      privacyAcceptedAt: new Date(),
      privacyVersion: PRIVACY_VERSION,
    })
    .returning();
  if (!user) throw new Error('No se creó el usuario');
  await audit(db, { userId: user.id, action: 'auth.register', resource: 'users', resourceId: user.id, outcome: 'success', requestId: ctx.requestId });
  const session = await createSession(db, user.id, ctx.config);
  return { user, session };
}

export async function login(ctx: Ctx, input: { email: string; password: string }) {
  const { db } = ctx;
  const fail = async (userId: string | null) => {
    await audit(db, { userId, action: 'auth.login', resource: 'sessions', outcome: 'failure', requestId: ctx.requestId });
  };
  const user = await findByEmail(db, input.email);
  if (!user) {
    await verifyDummy(input.password);
    await fail(null);
    throw new AppError(401, 'UNAUTHORIZED', 'Credenciales inválidas');
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await fail(user.id);
    throw new AppError(429, 'RATE_LIMITED', 'Cuenta bloqueada temporalmente por intentos fallidos');
  }
  if (!(await verifyPassword(user.passwordHash, input.password))) {
    const count = user.failedLoginCount + 1;
    const lock = count >= MAX_FAILED_LOGINS;
    await db
      .update(users)
      .set({
        failedLoginCount: lock ? 0 : count,
        lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000) : user.lockedUntil,
      })
      .where(eq(users.id, user.id));
    await fail(user.id);
    throw new AppError(401, 'UNAUTHORIZED', 'Credenciales inválidas');
  }
  await db.update(users).set({ failedLoginCount: 0, lockedUntil: null }).where(eq(users.id, user.id));
  await audit(db, { userId: user.id, action: 'auth.login', resource: 'sessions', outcome: 'success', requestId: ctx.requestId });
  return { user, session: await createSession(db, user.id, ctx.config) };
}

export async function changePassword(
  ctx: Ctx,
  user: UserRow,
  sessionId: string,
  input: { currentPassword: string; newPassword: string },
) {
  const { db } = ctx;
  if (!(await verifyPassword(user.passwordHash, input.currentPassword))) {
    await audit(db, { userId: user.id, action: 'auth.change_password', resource: 'users', resourceId: user.id, outcome: 'failure', requestId: ctx.requestId });
    throw new AppError(401, 'UNAUTHORIZED', 'La contraseña actual no es correcta');
  }
  await db.update(users).set({ passwordHash: await hashPassword(input.newPassword), updatedAt: new Date() }).where(eq(users.id, user.id));
  await revokeUserSessions(db, user.id, sessionId);
  await audit(db, { userId: user.id, action: 'auth.change_password', resource: 'users', resourceId: user.id, outcome: 'success', requestId: ctx.requestId });
}

/** Responde igual exista o no la cuenta. En MAIL_MODE=dev el correo queda en dev_mailbox, no se envía. */
export async function requestPasswordReset(ctx: Ctx, email: string) {
  const { db, config } = ctx;
  const user = await findByEmail(db, email);
  if (user) {
    const token = newToken();
    await db.insert(passwordResets).values({ userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) });
    if (config.MAIL_MODE === 'dev') {
      await db.insert(devMailbox).values({
        toEmail: user.email,
        subject: 'FARMIX (simulado): recuperación de contraseña',
        body: `Código de recuperación (válido 1 hora): ${token}`,
      });
    }
  }
  await audit(db, { userId: user?.id ?? null, action: 'auth.password_reset_request', resource: 'password_resets', outcome: 'success', requestId: ctx.requestId });
}

export async function confirmPasswordReset(ctx: Ctx, input: { token: string; newPassword: string }) {
  const { db } = ctx;
  const [reset] = await db
    .select()
    .from(passwordResets)
    .where(and(eq(passwordResets.tokenHash, hashToken(input.token)), isNull(passwordResets.usedAt), gt(passwordResets.expiresAt, new Date())))
    .limit(1);
  if (!reset) {
    await audit(db, { userId: null, action: 'auth.password_reset_confirm', resource: 'password_resets', outcome: 'failure', requestId: ctx.requestId });
    throw new AppError(400, 'VALIDATION_ERROR', 'El código es inválido o venció');
  }
  await db.update(passwordResets).set({ usedAt: new Date() }).where(eq(passwordResets.id, reset.id));
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(input.newPassword), failedLoginCount: 0, lockedUntil: null, updatedAt: new Date() })
    .where(eq(users.id, reset.userId));
  await revokeUserSessions(db, reset.userId);
  await audit(db, { userId: reset.userId, action: 'auth.password_reset_confirm', resource: 'users', resourceId: reset.userId, outcome: 'success', requestId: ctx.requestId });
}
