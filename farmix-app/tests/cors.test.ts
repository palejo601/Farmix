import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeCtx, makeApp, type Ctx } from './helpers.js';

let ctx: Ctx;
beforeAll(async () => {
  ctx = await makeApp();
});
afterAll(() => closeCtx(ctx));

describe('CORS restringido a APP_ORIGIN', () => {
  it('permite el origen configurado con credenciales', async () => {
    const res = await ctx.app.inject({
      method: 'OPTIONS', url: '/api/v1/drugstores',
      headers: { origin: 'http://localhost:5173', 'access-control-request-method': 'POST', 'access-control-request-headers': 'content-type' },
    });
    expect(res.statusCode).toBeLessThan(300);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('no concede acceso a otros orígenes', async () => {
    const res = await ctx.app.inject({
      method: 'OPTIONS', url: '/api/v1/drugstores',
      headers: { origin: 'https://sitio-malicioso.test', 'access-control-request-method': 'POST' },
    });
    expect(res.headers['access-control-allow-origin']).not.toBe('https://sitio-malicioso.test');
    expect(res.headers['access-control-allow-origin']).not.toBe('*');
  });

  it('expone X-Request-Id al navegador', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/health', headers: { origin: 'http://localhost:5173' } });
    expect(res.headers['access-control-expose-headers']).toContain('X-Request-Id');
  });
});
