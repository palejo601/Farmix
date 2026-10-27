import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { guard } from '../drugstores/guard.js';
import { createBody, drugstoreParams, itemResponse, listQuery, listResponse, params, updateBody } from './schema.js';
import * as service from './service.js';

export async function wasteRoutes(app: FastifyInstance): Promise<void> {
  const r = app.withTypeProvider<ZodTypeProvider>();
  const db = app.db;
  const base = '/drugstores/:id/waste-records';

  r.get(base, { onRequest: guard('operador'), schema: { params: drugstoreParams, querystring: listQuery, response: { 200: listResponse } } }, async (req) =>
    service.list(db, req.membership!, req.query),
  );

  r.post(base, { onRequest: guard('operador'), schema: { params: drugstoreParams, body: createBody, response: { 201: itemResponse } } }, async (req, reply) =>
    reply.code(201).send({ item: await service.create(db, req.membership!, req.auth!.user.id, req.body, req.id) }),
  );

  r.get(`${base}/:wasteId`, { onRequest: guard('operador'), schema: { params, response: { 200: itemResponse } } }, async (req) => ({
    item: await service.get(db, req.membership!, req.params.wasteId),
  }));

  r.patch(`${base}/:wasteId`, { onRequest: guard('operador'), schema: { params, body: updateBody, response: { 200: itemResponse } } }, async (req) => ({
    item: await service.update(db, req.membership!, req.auth!.user.id, req.params.wasteId, req.body, req.id),
  }));

  r.delete(`${base}/:wasteId`, { onRequest: guard('administrador'), schema: { params } }, async (req, reply) => {
    await service.remove(db, req.membership!, req.auth!.user.id, req.params.wasteId, req.id);
    return reply.code(204).send();
  });
}
