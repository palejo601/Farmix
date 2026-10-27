import { z } from 'zod';

const bool = z
  .enum(['true', 'false'])
  .transform((v) => v === 'true');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  APP_ORIGIN: z.url(),
  DATABASE_URL: z.string().min(1).regex(/^postgres(ql)?:\/\//, 'debe ser una URL postgres://'),
  SESSION_IDLE_HOURS: z.coerce.number().positive().default(8),
  SESSION_MAX_DAYS: z.coerce.number().positive().default(7),
  COOKIE_SECURE: bool.default(false),
  STATIC_DIR: z.string().default(''),
  EXPOSE_DOCS: bool.default(false),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  TRUST_PROXY: bool.default(false),
  MAIL_MODE: z.enum(['dev', 'smtp']).default('dev'),
  STORAGE_DIR: z.string().min(1).default('./storage'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type Config = z.infer<typeof schema>;

export class ConfigError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Configuración inválida:\n- ${issues.join('\n- ')}`);
    this.name = 'ConfigError';
  }
}

/** Valida las variables de entorno. Lanza ConfigError si falta o es inválida una obligatoria. */
export function loadConfig(raw: Record<string, string | undefined> = process.env): Config {
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new ConfigError(result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
  }
  const cfg = result.data;
  if (cfg.NODE_ENV === 'production' && !cfg.COOKIE_SECURE) {
    throw new ConfigError(['COOKIE_SECURE: debe ser true en producción']);
  }
  return cfg;
}
