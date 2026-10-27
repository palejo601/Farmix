import type { FastifyError, FastifyInstance } from 'fastify';
import { hasZodFastifySchemaValidationErrors, isResponseSerializationError } from 'fastify-type-provider-zod';
import { AppError, type ErrorBody, type ErrorCode } from './errors.js';

const BY_STATUS: Record<number, ErrorCode> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  429: 'RATE_LIMITED',
};

/** Formato único de error. Nunca expone trazas ni mensajes internos al cliente. */
export function registerErrorHandling(app: FastifyInstance): void {
  app.setNotFoundHandler((req, reply) => {
    const body: ErrorBody = { error: { code: 'NOT_FOUND', message: 'Recurso no encontrado', requestId: req.id } };
    return reply.code(404).send(body);
  });

  app.setErrorHandler((err: FastifyError | AppError, req, reply) => {
    let status = 500;
    let code: ErrorCode = 'INTERNAL_ERROR';
    let message = 'Error interno del servidor';
    let details: ErrorBody['error']['details'];

    if (err instanceof AppError) {
      ({ statusCode: status, code, message } = err);
    } else if (hasZodFastifySchemaValidationErrors(err)) {
      status = 400;
      code = 'VALIDATION_ERROR';
      message = 'Datos de entrada inválidos';
      details = err.validation.map((v) => ({
        campo: v.instancePath.replace(/^\//, '').replace(/\//g, '.') || '(raíz)',
        mensaje: v.message ?? 'inválido',
      }));
    } else if (isResponseSerializationError(err)) {
      req.log.error({ err }, 'respuesta no cumple el esquema');
    } else if ('statusCode' in err && err.statusCode && err.statusCode >= 400 && err.statusCode < 500) {
      status = err.statusCode;
      code = BY_STATUS[status] ?? 'VALIDATION_ERROR';
      message = status === 429 ? 'Demasiadas solicitudes' : status === 413 ? 'Contenido demasiado grande' : 'Solicitud inválida';
    }

    if (status >= 500) req.log.error({ err }, 'error no controlado');
    const body: ErrorBody = { error: { code, message, requestId: req.id, ...(details ? { details } : {}) } };
    return reply.code(status).send(body);
  });
}
