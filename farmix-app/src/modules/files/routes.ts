import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { invalid } from '../../shared/crud.js';
import { guard } from '../drugstores/guard.js';
import { drugstoreParams, fileResponse, params } from './schema.js';
import * as service from './service.js';

export async function filesRoutes(app: FastifyInstance): Promise<void> {
  const r = app.withTypeProvider<ZodTypeProvider>();
  const base = '/drugstores/:id/files';

  r.post(base, { onRequest: guard('operador'), schema: { params: drugstoreParams, response: { 201: fileResponse } } }, async (req, reply) => {
    if (!req.isMultipart()) throw invalid('Se esperaba multipart/form-data con el campo "file"');
    const part = await req.file();
    if (!part || part.fieldname !== 'file') throw invalid('Falta el campo "file"');
    const data = await part.toBuffer(); // lanza 413 si supera el límite
    const file = await service.upload(app.db, app.config, req.membership!, req.auth!.user.id, { filename: part.filename, data }, req.id);
    return reply.code(201).send({ file });
  });

  r.get(`${base}/:fileId`, { onRequest: guard('operador'), schema: { params } }, async (req, reply) => {
    const { row, stream } = await service.open(app.db, app.config, req.membership!, req.auth!.user.id, req.params.fileId, req.id);
    return reply
      .header('Content-Type', row.mimeType)
      .header('Content-Length', row.sizeBytes)
      .header('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(row.originalName)}`)
      .header('Cache-Control', 'private, no-store')
      .send(stream);
  });

  r.delete(`${base}/:fileId`, { onRequest: guard('administrador'), schema: { params } }, async (req, reply) => {
    await service.remove(app.db, req.membership!, req.auth!.user.id, req.params.fileId, req.id);
    return reply.code(204).send();
  });
}
