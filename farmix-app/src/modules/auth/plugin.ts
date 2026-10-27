import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../../shared/errors.js';
import { resolveSession, type UserRow } from './sessions.js';

export const SESSION_COOKIE = 'farmix_sid';

export interface AuthContext {
  sessionId: string;
  user: UserRow;
}

declare module 'fastify' {
  interface FastifyRequest {
    auth: AuthContext | null;
  }
}

/** Se usa en onRequest (antes de validar el cuerpo): sin sesión válida → 401. */
export async function requireAuth(req: FastifyRequest): Promise<void> {
  const token = req.cookies[SESSION_COOKIE];
  const found = token ? await resolveSession(req.server.db, token, req.server.config) : null;
  if (!found) throw new AppError(401, 'UNAUTHORIZED', 'Se requiere una sesión válida');
  req.auth = found;
}

export function setSessionCookie(app: FastifyInstance, reply: FastifyReply, token: string): void {
  reply.setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: app.config.COOKIE_SECURE,
    path: '/',
    maxAge: app.config.SESSION_MAX_DAYS * 86_400,
  });
}

export function clearSessionCookie(app: FastifyInstance, reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE, { path: '/', httpOnly: true, sameSite: 'lax', secure: app.config.COOKIE_SECURE });
}

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Defensa CSRF adicional a SameSite: una petición que cambia datos con Origin ajeno se rechaza. */
export function registerAuthHooks(app: FastifyInstance): void {
  app.decorateRequest('auth', null);
  app.addHook('onRequest', async (req) => {
    const origin = req.headers.origin;
    if (!SAFE.has(req.method) && origin && origin !== app.config.APP_ORIGIN) {
      throw new AppError(403, 'FORBIDDEN', 'Origen no permitido');
    }
  });
}
