import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { requireAuth } from '../auth/plugin.js';
import { deletionResponse, exportResponse } from './schema.js';
import * as service from './service.js';

export async function personalDataRoutes(app: FastifyInstance): Promise<void> {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get('/personal-data/export', { onRequest: requireAuth, schema: { response: { 200: exportResponse } } }, async (req, reply) => {
    const data = await service.exportPersonalData(app.db, req.auth!.user, req.id);
    return reply.header('Content-Disposition', 'attachment; filename="farmix-datos-personales.json"').send(data);
  });

  r.post('/personal-data/deletion-request', { onRequest: requireAuth, schema: { response: { 202: deletionResponse } } }, async (req, reply) => {
    const r2 = await service.requestDeletion(app.db, req.auth!.user, req.id);
    return reply.code(202).send({ ...r2, message: `Su cuenta se eliminará tras ${service.GRACE_DAYS} días. Puede cancelar la solicitud antes.` });
  });

  r.delete('/personal-data/deletion-request', { onRequest: requireAuth }, async (req, reply) => {
    await service.cancelDeletion(app.db, req.auth!.user, req.id);
    return reply.code(204).send();
  });
}
