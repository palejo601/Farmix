import { cp, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeCtx, makeApp, type Ctx } from './helpers.js';

// Revisa los archivos reales de frontend/public (los que Vite copia tal cual al build) y cómo los sirve el backend.
const PUBLIC = path.resolve(import.meta.dirname, '../frontend/public');
const INDEX = path.resolve(import.meta.dirname, '../frontend/index.html');

type Icon = { src: string; sizes: string; type: string; purpose: string };
let manifest: { name: string; short_name: string; start_url: string; scope: string; display: string; theme_color: string; icons: Icon[] };
let ctx: Ctx;

// Ancho y alto de un PNG, leídos de su cabecera IHDR
async function pngSize(file: string) {
  const buf = await readFile(file);
  expect(buf.subarray(1, 4).toString()).toBe('PNG');
  return `${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)}`;
}

beforeAll(async () => {
  manifest = JSON.parse(await readFile(path.join(PUBLIC, 'manifest.webmanifest'), 'utf8'));
  const dir = await mkdtemp(path.join(os.tmpdir(), 'farmix-pwa-'));
  await cp(PUBLIC, dir, { recursive: true });
  await writeFile(path.join(dir, 'index.html'), '<!doctype html><title>FARMIX</title><div id="root"></div>');
  ctx = await makeApp({ STATIC_DIR: dir });
});
afterAll(async () => {
  await closeCtx(ctx);
});

describe('manifest de la PWA', () => {
  it('tiene lo que los navegadores exigen para ofrecer «Instalar»', () => {
    expect(manifest.name).toContain('FARMIX');
    expect(manifest.short_name).toBe('FARMIX');
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
    const sizes = manifest.icons.filter((i) => i.purpose === 'any').map((i) => i.sizes);
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
    expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true);
  });

  it('cada ícono existe y mide lo que declara', async () => {
    for (const icon of manifest.icons) {
      expect(icon.type).toBe('image/png');
      expect(await pngSize(path.join(PUBLIC, icon.src)), icon.src).toBe(icon.sizes);
    }
    expect(await pngSize(path.join(PUBLIC, 'icons/apple-touch-icon.png'))).toBe('180x180');
  });

  it('index.html enlaza el manifest, el color de tema y el ícono de iPhone', async () => {
    const html = await readFile(INDEX, 'utf8');
    expect(html).toContain('rel="manifest" href="/manifest.webmanifest"');
    expect(html).toContain(`name="theme-color" content="${manifest.theme_color}"`);
    expect(html).toContain('rel="apple-touch-icon" href="/icons/apple-touch-icon.png"');
  });
});

describe('service worker', () => {
  it('nunca intercepta la API ni peticiones que no sean GET o de otro origen', async () => {
    const sw = await readFile(path.join(PUBLIC, 'sw.js'), 'utf8');
    expect(sw).toContain("request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;");
  });

  it('todos los archivos que guarda al instalarse existen', async () => {
    const sw = await readFile(path.join(PUBLIC, 'sw.js'), 'utf8');
    const base = JSON.parse((sw.match(/const BASE = (\[[^\]]*\])/)?.[1] ?? '[]').replace(/'/g, '"')) as string[];
    expect(base).toContain('/offline.html');
    for (const f of base) {
      const res = await ctx.app.inject({ method: 'GET', url: f });
      expect(res.statusCode, f).toBe(200);
    }
  });
});

describe('el backend sirve la PWA', () => {
  it('el manifest sale con su tipo y sin caché larga', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/manifest.webmanifest' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/manifest+json');
    expect(res.headers['cache-control']).toBe('no-cache');
  });

  it('sw.js sale como JavaScript, desde la raíz y sin caché larga (para que las actualizaciones lleguen)', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/sw.js' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/javascript/);
    expect(res.headers['cache-control']).toBe('no-cache');
    expect(String(res.headers['content-security-policy'])).toContain("script-src 'self'");
  });

  it('la página sin conexión cumple la CSP: sin scripts ni estilos en línea', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/offline.html' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Sin conexión');
    expect(res.body).not.toMatch(/<script|<style|\son\w+=/i);
  });
});
