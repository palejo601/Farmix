import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { requireAuth } from '../auth/plugin.js';
import { userResponse } from '../auth/schema.js';
import { toUserDto } from '../auth/sessions.js';
import { updateProfileBody } from './schema.js';
import * as service from './service.js';

export async function usersRoutes(app: FastifyInstance): Promise<void> {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get('/users/me', { onRequest: requireAuth, schema: { response: { 200: userResponse } } }, async (req) => ({
    user: toUserDto(req.auth!.user),
  }));

  r.patch('/users/me', { onRequest: requireAuth, schema: { body: updateProfileBody, response: { 200: userResponse } } }, async (req) => ({
    user: toUserDto(await service.updateProfile(app.db, req.auth!.user.id, req.body.fullName, req.id)),
  }));

  r.post('/users/me/privacy-acceptance', { onRequest: requireAuth, schema: { response: { 200: userResponse } } }, async (req) => ({
    user: toUserDto(await service.acceptPrivacy(app.db, req.auth!.user.id, req.id)),
  }));
}
