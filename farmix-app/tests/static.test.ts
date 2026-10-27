import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeCtx, makeApp, type Ctx } from './helpers.js';

let withFront: Ctx;
let noFront: Ctx;
let dir: string;

beforeAll(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'farmix-front-'));
  await mkdir(path.join(dir, 'assets'));
  await writeFile(path.join(dir, 'index.html'), '<!doctype html><title>FARMIX</title><div id="root"></div>');
  await writeFile(path.join(dir, 'assets', 'app-abc123.js'), 'console.log("ok")');
  await writeFile(path.join(os.tmpdir(), 'farmix-secreto.txt'), 'no debe servirse');
  withFront = await makeApp({ STATIC_DIR: dir });
  noFront = await makeApp();
});
afterAll(async () => {
  await closeCtx(withFront);
  await closeCtx(noFront);
});

const html = { accept: 'text/html' };

describe('frontend servido por el backend (STATIC_DIR)', () => {
  it('sirve index.html en / y en rutas del frontend (React Router)', async () => {
    for (const url of ['/', '/login', '/d/123/vencimientos']) {
      const res = await withFront.app.inject({ method: 'GET', url, headers: html });
      expect(res.statusCode, url).toBe(200);
      expect(res.body).toContain('<div id="root">');
    }
  });

  it('las rutas /api nunca devuelven el HTML: responden JSON 404 con el formato único', async () => {
    const res = await withFront.app.inject({ method: 'GET', url: '/api/v1/no-existe', headers: html });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('NOT_FOUND');
  });

  it('un POST a una ruta desconocida sigue siendo 404 JSON, no el HTML', async () => {
    const res = await withFront.app.inject({ method: 'POST', url: '/nada', payload: {} });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('NOT_FOUND');
  });

  it('los archivos con hash se cachean y index.html no', async () => {
    const asset = await withFront.app.inject({ method: 'GET', url: '/assets/app-abc123.js' });
    expect(asset.statusCode).toBe(200);
    expect(asset.headers['cache-control']).toContain('immutable');
    const index = await withFront.app.inject({ method: 'GET', url: '/', headers: html });
    expect(index.headers['cache-control']).toBe('no-cache');
  });

  it('usa una CSP propia para el frontend y conserva la estricta en la API', async () => {
    const page = await withFront.app.inject({ method: 'GET', url: '/', headers: html });
    const csp = String(page.headers['content-security-policy']);
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(csp).not.toMatch(/style-src 'self' 'unsafe-inline'/);
    const api = await withFront.app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(String(api.headers['content-security-policy'])).toContain("default-src 'none'");
    expect(String(api.headers['content-security-policy'])).not.toContain('unsafe-inline');
  });

  it('no sirve archivos fuera de STATIC_DIR (recorrido de rutas)', async () => {
    for (const url of ['/../farmix-secreto.txt', '/%2e%2e/farmix-secreto.txt', '/assets/../../farmix-secreto.txt', '/..%2ffarmix-secreto.txt']) {
      const res = await withFront.app.inject({ method: 'GET', url });
      expect(res.body, url).not.toContain('no debe servirse');
    }
  });

  it('la API sigue funcionando igual', async () => {
    expect((await withFront.app.inject({ method: 'GET', url: '/api/v1/health' })).statusCode).toBe(200);
    expect((await withFront.app.inject({ method: 'GET', url: '/api/v1/drugstores' })).statusCode).toBe(401);
  });
});

describe('sin STATIC_DIR', () => {
  it('no sirve nada: la raíz es 404 JSON', async () => {
    const res = await noFront.app.inject({ method: 'GET', url: '/', headers: html });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('NOT_FOUND');
  });

  it('un STATIC_DIR sin index.html se ignora sin romper el arranque', async () => {
    const empty = await mkdtemp(path.join(os.tmpdir(), 'farmix-vacio-'));
    const ctx = await makeApp({ STATIC_DIR: empty });
    expect((await ctx.app.inject({ method: 'GET', url: '/', headers: html })).statusCode).toBe(404);
    await closeCtx(ctx);
  });
});
