import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { makeApp } from './helpers.js';

let ctx: Awaited<ReturnType<typeof makeApp>>;
beforeAll(async () => {
  ctx = await makeApp();
});
afterAll(async () => {
  await ctx.app.close();
  await ctx.pool.end();
});

describe('GET /api/v1/health', () => {
  it('responde 200 con la base de datos disponible', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ estado: 'ok', baseDeDatos: 'ok' });
    expect(res.json().marca).toContain('producto mínimo viable en estudio');
  });

  it('responde 503 si la base de datos no está disponible', async () => {
    const bad = await makeApp({ DATABASE_URL: 'postgres://x:y@127.0.0.1:1/z' });
    const res = await bad.app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({ estado: 'degradado', baseDeDatos: 'error' });
    await bad.app.close();
    await bad.pool.end().catch(() => undefined);
  });
});

describe('X-Request-Id', () => {
  it('genera uno si no viene', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('reutiliza uno entrante seguro', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/health', headers: { 'x-request-id': 'abc-12345678' } });
    expect(res.headers['x-request-id']).toBe('abc-12345678');
  });

  it('descarta uno entrante inseguro', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/health', headers: { 'x-request-id': 'a b<script>' } });
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('se incluye también en errores', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/no-existe' });
    expect(res.headers['x-request-id']).toBeTruthy();
  });
});

describe('formato de error', () => {
  it('ruta inexistente devuelve 404 con formato único', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/no-existe' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({
      error: { code: 'NOT_FOUND', message: 'Recurso no encontrado', requestId: res.headers['x-request-id'] },
    });
  });

  it('JSON inválido devuelve 400 sin detalles internos', async () => {
    const res = await ctx.app.inject({
      method: 'POST', url: '/api/v1/health', payload: '{malo', headers: { 'content-type': 'application/json' },
    });
    expect(res.statusCode).toBeLessThan(500);
    expect(JSON.stringify(res.json())).not.toMatch(/stack|node_modules|at /);
  });
});

describe('cabeceras de seguridad', () => {
  it('incluye helmet y CSP restrictiva', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toContain("default-src 'none'");
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('CSP', () => {
  it('no permite scripts ni estilos en línea', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(res.headers['content-security-policy']).not.toContain('unsafe-inline');
  });
});
