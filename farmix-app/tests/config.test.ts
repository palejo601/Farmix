import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from '../src/config/env.js';
import { baseEnv } from './helpers.js';

describe('configuración', () => {
  it('aplica valores por defecto', () => {
    const c = loadConfig(baseEnv);
    expect(c.PORT).toBe(3000);
    expect(c.SESSION_IDLE_HOURS).toBe(8);
    expect(c.COOKIE_SECURE).toBe(false);
  });

  it.each(['DATABASE_URL', 'APP_ORIGIN'])('falla si falta %s', (name) => {
    const env: Record<string, string | undefined> = { ...baseEnv };
    delete env[name];
    expect(() => loadConfig(env)).toThrow(ConfigError);
  });

  it('rechaza valores inválidos', () => {
    expect(() => loadConfig({ ...baseEnv, PORT: 'abc' })).toThrow(ConfigError);
    expect(() => loadConfig({ ...baseEnv, DATABASE_URL: 'mysql://x' })).toThrow(ConfigError);
    expect(() => loadConfig({ ...baseEnv, COOKIE_SECURE: 'si' })).toThrow(ConfigError);
  });

  it('usa RENDER_EXTERNAL_URL solo si APP_ORIGIN no está definido', () => {
    const env: Record<string, string | undefined> = { ...baseEnv, RENDER_EXTERNAL_URL: 'https://farmix.onrender.com' };
    delete env.APP_ORIGIN;
    expect(loadConfig(env).APP_ORIGIN).toBe('https://farmix.onrender.com');
    expect(loadConfig({ ...env, APP_ORIGIN: 'https://propio.example' }).APP_ORIGIN).toBe('https://propio.example');
    delete env.RENDER_EXTERNAL_URL;
    expect(() => loadConfig(env)).toThrow(ConfigError);
  });

  it('exige COOKIE_SECURE=true en producción', () => {
    expect(() => loadConfig({ ...baseEnv, NODE_ENV: 'production' })).toThrow(/COOKIE_SECURE/);
    expect(loadConfig({ ...baseEnv, NODE_ENV: 'production', COOKIE_SECURE: 'true' }).NODE_ENV).toBe('production');
  });
});
