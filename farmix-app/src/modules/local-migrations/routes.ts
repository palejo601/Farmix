import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { requireAuth } from '../auth/plugin.js';
import { createBody, migrationResponse, params } from './schema.js';
import * as service from './service.js';

export async function localMigrationsRoutes(app: FastifyInstance): Promise<void> {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.post('/local-migrations', { onRequest: requireAuth, bodyLimit: 2 * 1024 * 1024, schema: { body: createBody, response: { 201: migrationResponse } } }, async (req, reply) =>
    reply.code(201).send({ migration: await service.create(app.db, req.auth!.user.id, req.body as Parameters<typeof service.create>[2], req.id) }));

  r.post('/local-migrations/:migrationId/confirm', { onRequest: requireAuth, schema: { params, response: { 200: migrationResponse } } }, async (req) => ({
    migration: await service.confirm(app.db, req.auth!.user.id, req.params.migrationId, req.id) }));

  r.post('/local-migrations/:migrationId/revert', { onRequest: requireAuth, schema: { params, response: { 200: migrationResponse } } }, async (req) => ({
    migration: await service.revert(app.db, req.auth!.user.id, req.params.migrationId, req.id) }));
}
