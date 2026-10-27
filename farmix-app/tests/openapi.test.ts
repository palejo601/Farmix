import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeCtx, makeApp, type Ctx } from './helpers.js';

let ctx: Ctx;
let docs: Ctx;
beforeAll(async () => {
  ctx = await makeApp();
  docs = await makeApp({ EXPOSE_DOCS: 'true' });
  await docs.app.ready();
  await ctx.app.ready();
});
afterAll(async () => {
  await closeCtx(ctx);
  await closeCtx(docs);
});

describe('inventario de rutas', () => {
  it('expone exactamente 71 rutas (70 del inventario más /health) bajo /api/v1', () => {
    const routes = ctx.app.routeTable.filter((r) => !r.url.endsWith('openapi.json'));
    expect(routes).toHaveLength(71);
    expect(routes.every((r) => r.url.startsWith('/api/v1/'))).toBe(true);
  });

  it('no hay rutas duplicadas', () => {
    const keys = ctx.app.routeTable.map((r) => `${r.method} ${r.url}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('OpenAPI', () => {
  it('no se expone si EXPOSE_DOCS=false', async () => {
    expect((await ctx.app.inject({ method: 'GET', url: '/api/v1/openapi.json' })).statusCode).toBe(404);
  });

  it('se expone con EXPOSE_DOCS=true y describe todas las rutas', async () => {
    const res = await docs.app.inject({ method: 'GET', url: '/api/v1/openapi.json' });
    expect(res.statusCode).toBe(200);
    const spec = res.json();
    expect(spec.openapi).toMatch(/^3\./);
    const ops = Object.values(spec.paths as Record<string, object>).reduce((n, p) => n + Object.keys(p).length, 0);
    expect(ops).toBe(71);
    expect(spec.info.description).toMatch(/mínimo viable/);
    expect(spec.paths['/api/v1/health']).toBeDefined();
    expect(spec.paths['/api/v1/drugstores/{id}/expirations/alerts']).toBeDefined();
  });
});
