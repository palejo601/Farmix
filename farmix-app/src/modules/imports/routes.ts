import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { invalid } from '../../shared/crud.js';
import { guard } from '../drugstores/guard.js';
import { confirmResponse, drugstoreParams, importResponse, params, previewQuery } from './schema.js';
import * as service from './service.js';

export async function importsRoutes(app: FastifyInstance): Promise<void> {
  const r = app.withTypeProvider<ZodTypeProvider>();
  const base = '/drugstores/:id/imports';

  r.post(`${base}/preview`, { onRequest: guard('operador'), schema: { params: drugstoreParams, querystring: previewQuery, response: { 201: importResponse } } }, async (req, reply) => {
    if (!req.isMultipart()) throw invalid('Se esperaba multipart/form-data con el campo "file"');
    const part = await req.file();
    if (!part || part.fieldname !== 'file') throw invalid('Falta el campo "file"');
    const data = await part.toBuffer();
    const result = await service.preview(app.db, req.membership!, req.auth!.user.id, req.query.kind, { filename: part.filename, data }, req.id);
    return reply.code(201).send({ import: result });
  });

  r.post(`${base}/:importId/confirm`, { onRequest: guard('operador'), schema: { params, response: { 200: confirmResponse } } }, async (req) =>
    service.confirm(app.db, req.membership!, req.auth!.user.id, req.params.importId, req.id));

  r.get(`${base}/:importId`, { onRequest: guard('operador'), schema: { params, response: { 200: importResponse } } }, async (req) => ({
    import: await service.get(app.db, req.membership!, req.params.importId),
  }));
}
