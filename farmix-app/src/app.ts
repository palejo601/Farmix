import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import multipart from '@fastify/multipart';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'node:fs';
import path from 'node:path';
import Fastify, { type FastifyInstance } from 'fastify';
import { jsonSchemaTransform, serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import type pg from 'pg';
import { makeDb, type Db } from './db/client.js';
import type { Config } from './config/env.js';
import { authRoutes } from './modules/auth/routes.js';
import { registerAuthHooks } from './modules/auth/plugin.js';
import { drugstoresRoutes } from './modules/drugstores/routes.js';
import { expirationsRoutes } from './modules/expirations/routes.js';
import { personalDataRoutes } from './modules/personal-data/routes.js';
import { wasteRoutes } from './modules/waste/routes.js';
import { segregationRoutes } from './modules/segregation/routes.js';
import { staffRoutes } from './modules/staff/routes.js';
import { actionsRoutes } from './modules/actions/routes.js';
import { diagnosesRoutes } from './modules/diagnoses/routes.js';
import { filesRoutes } from './modules/files/routes.js';
import { importsRoutes } from './modules/imports/routes.js';
import { localMigrationsRoutes } from './modules/local-migrations/routes.js';
import { reportsRoutes } from './modules/reports/routes.js';
import { usersRoutes } from './modules/users/routes.js';
import { healthRoutes } from './modules/health/routes.js';
import './modules/drugstores/guard.js';
import { registerErrorHandling } from './shared/error-handler.js';
import { genReqId, registerRequestId } from './shared/request-id.js';

declare module 'fastify' {
  interface FastifyInstance {
    config: Config;
    pool: pg.Pool;
    db: Db;
    routeTable: { method: string; url: string }[];
  }
}

export async function buildApp(config: Config, pool: pg.Pool): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: config.LOG_LEVEL, redact: ['req.headers.cookie', 'req.headers.authorization'] },
    genReqId,
    requestIdHeader: false,
    trustProxy: config.TRUST_PROXY,
    bodyLimit: 1024 * 1024,
  });

  const routeTable: { method: string; url: string }[] = [];
  app.addHook('onRoute', (r) => {
    for (const method of [r.method].flat()) if (method !== 'HEAD' && method !== 'OPTIONS') routeTable.push({ method, url: r.url });
  });
  app.decorate('routeTable', routeTable);

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.decorate('config', config);
  app.decorate('pool', pool);
  app.decorate('db', makeDb(pool));

  registerRequestId(app);
  const staticRoot = config.STATIC_DIR ? path.resolve(config.STATIC_DIR) : '';
  const serveFrontend = Boolean(staticRoot) && existsSync(path.join(staticRoot, 'index.html'));
  if (config.STATIC_DIR && !serveFrontend) app.log.warn({ STATIC_DIR: staticRoot }, 'STATIC_DIR no contiene index.html: no se sirve el frontend');
  registerErrorHandling(app, { spaFallback: serveFrontend });
  registerAuthHooks(app);
  app.decorateRequest('membership', null);

  await app.register(helmet, {
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
      },
    },
    hsts: config.NODE_ENV === 'production',
  });
  await app.register(cors, {
    origin: config.APP_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id', 'Content-Disposition'],
    maxAge: 600,
  });
  await app.register(cookie);
  await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 5, parts: 6 } });
  await app.register(rateLimit, { max: config.RATE_LIMIT_MAX, timeWindow: '1 minute' });

  await app.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'FARMIX API',
        version: '0.1.0',
        description: 'Producto mínimo viable (MVP) en estudio. Las cifras son descriptivas e hipótesis por validar.',
      },
      servers: [{ url: '/' }],
      components: { securitySchemes: { sessionCookie: { type: 'apiKey', in: 'cookie', name: 'farmix_sid' } } },
      security: [{ sessionCookie: [] }],
    },
    transform: jsonSchemaTransform,
  });
  if (config.EXPOSE_DOCS) {
    app.get('/api/v1/openapi.json', { schema: { hide: true } }, async () => app.swagger());
  }

  if (serveFrontend) {
    // La API conserva la CSP estricta (default-src 'none'); solo las páginas y archivos del frontend usan esta,
    // que permite scripts y estilos propios y atributos style (barras de progreso) pero no scripts en línea.
    const FRONT_CSP = "default-src 'self'; script-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'";
    app.addHook('onSend', async (req, reply) => {
      if (!req.url.startsWith('/api/')) reply.header('Content-Security-Policy', FRONT_CSP);
    });
    await app.register(fastifyStatic, {
      root: staticRoot,
      wildcard: true,
      index: 'index.html',
      dotfiles: 'ignore',
      setHeaders: (res, filePath) => {
        res.header('Cache-Control', filePath.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache');
      },
    });
  }

  await app.register(healthRoutes, { prefix: '/api/v1' });
  await app.register(authRoutes, { prefix: '/api/v1' });
  await app.register(usersRoutes, { prefix: '/api/v1' });
  await app.register(drugstoresRoutes, { prefix: '/api/v1' });
  await app.register(expirationsRoutes, { prefix: '/api/v1' });
  await app.register(wasteRoutes, { prefix: '/api/v1' });
  await app.register(segregationRoutes, { prefix: '/api/v1' });
  await app.register(staffRoutes, { prefix: '/api/v1' });
  await app.register(actionsRoutes, { prefix: '/api/v1' });
  await app.register(diagnosesRoutes, { prefix: '/api/v1' });
  await app.register(filesRoutes, { prefix: '/api/v1' });
  await app.register(importsRoutes, { prefix: '/api/v1' });
  await app.register(localMigrationsRoutes, { prefix: '/api/v1' });
  await app.register(reportsRoutes, { prefix: '/api/v1' });
  await app.register(personalDataRoutes, { prefix: '/api/v1' });
  return app;
}
