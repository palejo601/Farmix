import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';

const SAFE_ID = /^[A-Za-z0-9._-]{8,64}$/;

/** Reutiliza X-Request-Id entrante solo si es seguro; si no, genera un UUID. */
export function genReqId(req: { headers: FastifyRequest['headers'] }): string {
  const incoming = req.headers['x-request-id'];
  return typeof incoming === 'string' && SAFE_ID.test(incoming) ? incoming : randomUUID();
}

export function registerRequestId(app: FastifyInstance): void {
  app.addHook('onRequest', async (req, reply) => {
    reply.header('X-Request-Id', req.id);
  });
}
