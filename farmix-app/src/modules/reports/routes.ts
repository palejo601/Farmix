import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { guard } from '../drugstores/guard.js';
import { drugstoreParams, query, reportResponse } from './schema.js';
import * as service from './service.js';

export async function reportsRoutes(app: FastifyInstance): Promise<void> {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/drugstores/:id/reports/management',
    { onRequest: guard('operador'), schema: { params: drugstoreParams, querystring: query, response: { 200: reportResponse } } },
    async (req) => service.management(app.db, req.membership!, req.query),
  );
}
