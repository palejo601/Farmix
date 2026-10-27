import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { healthResponse } from './schema.js';
import { checkHealth } from './service.js';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/health',
    { schema: { response: { 200: healthResponse, 503: healthResponse } } },
    async (_req, reply) => {
      const result = await checkHealth(app.pool);
      return reply.code(result.estado === 'ok' ? 200 : 503).send(result);
    },
  );
}
