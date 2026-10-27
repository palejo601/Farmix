import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { guard } from '../drugstores/guard.js';
import {
  alertsResponse, createBody, drugstoreParams, itemResponse, listQuery, listResponse, lossesResponse, params, updateBody,
} from './schema.js';
import * as service from './service.js';

export async function expirationsRoutes(app: FastifyInstance): Promise<void> {
  const r = app.withTypeProvider<ZodTypeProvider>();
  const db = app.db;
  const base = '/drugstores/:id/expirations';

  r.get(base, { onRequest: guard('operador'), schema: { params: drugstoreParams, querystring: listQuery, response: { 200: listResponse } } }, async (req) =>
    service.list(db, req.membership!, req.query),
  );

  r.post(base, { onRequest: guard('operador'), schema: { params: drugstoreParams, body: createBody, response: { 201: itemResponse } } }, async (req, reply) =>
    reply.code(201).send({ item: await service.create(db, req.membership!, req.auth!.user.id, req.body as Parameters<typeof service.create>[3], req.id) }),
  );

  r.get(`${base}/alerts`, { onRequest: guard('operador'), schema: { params: drugstoreParams, response: { 200: alertsResponse } } }, async (req) =>
    service.alerts(db, req.membership!),
  );

  r.get(`${base}/losses`, { onRequest: guard('operador'), schema: { params: drugstoreParams, response: { 200: lossesResponse } } }, async (req) =>
    service.losses(db, req.membership!),
  );

  r.get(`${base}/:expirationId`, { onRequest: guard('operador'), schema: { params, response: { 200: itemResponse } } }, async (req) => ({
    item: await service.get(db, req.membership!, req.params.expirationId),
  }));

  r.patch(`${base}/:expirationId`, { onRequest: guard('operador'), schema: { params, body: updateBody, response: { 200: itemResponse } } }, async (req) => ({
    item: await service.update(db, req.membership!, req.auth!.user.id, req.params.expirationId, req.body, req.id),
  }));

  // Borrar (lógico) exige administrador o propietario.
  r.delete(`${base}/:expirationId`, { onRequest: guard('administrador'), schema: { params } }, async (req, reply) => {
    await service.remove(db, req.membership!, req.auth!.user.id, req.params.expirationId, req.id);
    return reply.code(204).send();
  });
}
