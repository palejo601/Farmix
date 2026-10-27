import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { guard } from '../drugstores/guard.js';
import { createBody, detailResponse, drugstoreParams, instrumentResponse, listQuery, listResponse, params, updateBody } from './schema.js';
import * as service from './service.js';

export async function diagnosesRoutes(app: FastifyInstance): Promise<void> {
  const r = app.withTypeProvider<ZodTypeProvider>();
  const db = app.db;
  const base = '/drugstores/:id/diagnoses';
  const op = guard('operador');

  r.get(`${base}/instrument/current`, { onRequest: op, schema: { params: drugstoreParams, response: { 200: instrumentResponse } } }, async () =>
    service.getCurrentInstrument(db));
  r.get(base, { onRequest: op, schema: { params: drugstoreParams, querystring: listQuery, response: { 200: listResponse } } }, async (req) =>
    service.list(db, req.membership!, req.query));
  r.post(base, { onRequest: op, schema: { params: drugstoreParams, body: createBody, response: { 201: detailResponse } } }, async (req, reply) =>
    reply.code(201).send({ item: await service.create(db, req.membership!, req.auth!.user.id, req.body, req.id) }));
  r.get(`${base}/:diagId`, { onRequest: op, schema: { params, response: { 200: detailResponse } } }, async (req) => ({
    item: await service.get(db, req.membership!, req.params.diagId) }));
  r.patch(`${base}/:diagId`, { onRequest: op, schema: { params, body: updateBody, response: { 200: detailResponse } } }, async (req) => ({
    item: await service.update(db, req.membership!, req.auth!.user.id, req.params.diagId, req.body, req.id) }));
}
