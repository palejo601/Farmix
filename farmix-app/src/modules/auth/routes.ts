import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { audit } from '../../shared/audit.js';
import { clearSessionCookie, requireAuth, setSessionCookie } from './plugin.js';
import {
  changePasswordBody, loginBody, messageResponse, registerBody, resetConfirmBody, resetRequestBody, userResponse,
} from './schema.js';
import * as service from './service.js';
import { revokeSession, toUserDto } from './sessions.js';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const r = app.withTypeProvider<ZodTypeProvider>();
  const limit = { config: { rateLimit: { max: app.config.AUTH_RATE_LIMIT_MAX, timeWindow: '1 minute' } } };
  const ctx = (reqId: string) => ({ db: app.db, config: app.config, requestId: reqId });

  r.post('/auth/register', { ...limit, schema: { body: registerBody, response: { 201: userResponse } } }, async (req, reply) => {
    const { user, session } = await service.register(ctx(req.id), req.body);
    setSessionCookie(app, reply, session.token);
    return reply.code(201).send({ user: toUserDto(user) });
  });

  r.post('/auth/login', { ...limit, schema: { body: loginBody, response: { 200: userResponse } } }, async (req, reply) => {
    const { user, session } = await service.login(ctx(req.id), req.body);
    setSessionCookie(app, reply, session.token);
    return reply.send({ user: toUserDto(user) });
  });

  r.post('/auth/logout', { onRequest: requireAuth }, async (req, reply) => {
    const a = req.auth!;
    await revokeSession(app.db, a.sessionId);
    await audit(app.db, { userId: a.user.id, action: 'auth.logout', resource: 'sessions', outcome: 'success', requestId: req.id });
    clearSessionCookie(app, reply);
    return reply.code(204).send();
  });

  r.get('/auth/session', { onRequest: requireAuth, schema: { response: { 200: userResponse } } }, async (req) => ({
    user: toUserDto(req.auth!.user),
  }));

  r.post(
    '/auth/change-password',
    { ...limit, onRequest: requireAuth, schema: { body: changePasswordBody, response: { 200: messageResponse } } },
    async (req) => {
      const a = req.auth!;
      await service.changePassword(ctx(req.id), a.user, a.sessionId, req.body);
      return { message: 'Contraseña actualizada' };
    },
  );

  r.post('/auth/password-reset/request', { ...limit, schema: { body: resetRequestBody, response: { 202: messageResponse } } }, async (req, reply) => {
    await service.requestPasswordReset(ctx(req.id), req.body.email);
    return reply.code(202).send({ message: 'Si la cuenta existe, recibirá instrucciones para recuperar su contraseña' });
  });

  r.post('/auth/password-reset/confirm', { ...limit, schema: { body: resetConfirmBody, response: { 200: messageResponse } } }, async (req) => {
    await service.confirmPasswordReset(ctx(req.id), req.body);
    return { message: 'Contraseña restablecida' };
  });
}
