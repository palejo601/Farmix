import os from 'node:os';
import path from 'node:path';
import pg from 'pg';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';
import { runMigrations } from '../src/db/migrate.js';

function requireTestDb(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('Defina TEST_DATABASE_URL con una base de pruebas DESECHABLE: las pruebas borran y recrean su esquema public.');
  return url;
}
export const TEST_DB_URL = requireTestDb();

export const baseEnv = {
  NODE_ENV: 'test',
  APP_ORIGIN: 'http://localhost:5173',
  DATABASE_URL: TEST_DB_URL,
  LOG_LEVEL: process.env.TEST_LOG ?? 'silent',
  AUTH_RATE_LIMIT_MAX: '1000',
  RATE_LIMIT_MAX: '1000',
  STORAGE_DIR: path.join(os.tmpdir(), 'farmix-test-storage'),
};

export const PASSWORD = 'Clave-de-prueba-123';

export async function makeApp(overrides: Record<string, string> = {}) {
  const pool = new pg.Pool({ connectionString: overrides.DATABASE_URL ?? TEST_DB_URL, max: 3 });
  const app = await buildApp(loadConfig({ ...baseEnv, ...overrides }), pool);
  return { app, pool };
}

export type Ctx = Awaited<ReturnType<typeof makeApp>>;

/** Base limpia con todas las migraciones aplicadas. */
export async function freshDb(pool: pg.Pool) {
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await runMigrations(pool);
}

export async function closeCtx(ctx: Ctx) {
  await ctx.app.close();
  await ctx.pool.end();
}

export function cookieOf(res: { cookies: { name: string; value: string }[] }): string {
  const c = res.cookies.find((x) => x.name === 'farmix_sid');
  return c ? `farmix_sid=${c.value}` : '';
}

let n = 0;
export async function registerUser(ctx: Ctx, email = `user${++n}@ejemplo.test`) {
  const res = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email, password: PASSWORD, fullName: 'Usuario de Prueba', acceptPrivacy: true },
  });
  return { res, email, cookie: cookieOf(res), id: res.json().user?.id as string };
}

export const get = (ctx: Ctx, url: string, cookie?: string) =>
  ctx.app.inject({ method: 'GET', url: `/api/v1${url}`, headers: cookie ? { cookie } : {} });
export const send = (ctx: Ctx, method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, payload?: unknown, cookie?: string) =>
  ctx.app.inject({ method, url: `/api/v1${url}`, payload: payload as object, headers: cookie ? { cookie } : {} });
