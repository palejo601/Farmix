import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type pg from 'pg';

const DEFAULT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');
const FILE_RE = /^\d{4}_[a-z0-9_]+\.sql$/;

export interface MigrationResult {
  applied: string[];
  skipped: string[];
}

/**
 * Aplica en orden las migraciones SQL numeradas que falten. Una migración ya aplicada
 * cuyo contenido cambió (hash distinto) detiene el proceso: las migraciones no se editan.
 */
export async function runMigrations(pool: pg.Pool, dir = DEFAULT_DIR): Promise<MigrationResult> {
  const files = (await readdir(dir)).filter((f) => FILE_RE.test(f)).sort();
  const client = await pool.connect();
  const result: MigrationResult = { applied: [], skipped: [] };
  try {
    await client.query('SELECT pg_advisory_lock(727001)');
    const exists = await client.query("SELECT to_regclass('public.schema_migrations') AS t");
    const done = new Map<string, string>();
    if (exists.rows[0].t) {
      const r = await client.query('SELECT filename, checksum FROM schema_migrations');
      for (const row of r.rows) done.set(row.filename, row.checksum);
    }
    for (const file of files) {
      const sql = await readFile(path.join(dir, file), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const prev = done.get(file);
      if (prev) {
        if (prev !== checksum) throw new Error(`La migración ya aplicada ${file} fue modificada`);
        result.skipped.push(file);
        continue;
      }
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)', [file, checksum]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Falló la migración ${file}: ${(err as Error).message}`);
      }
      result.applied.push(file);
    }
    return result;
  } finally {
    await client.query('SELECT pg_advisory_unlock(727001)').catch(() => undefined);
    client.release();
  }
}
