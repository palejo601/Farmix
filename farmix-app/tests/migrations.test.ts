import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runMigrations } from '../src/db/migrate.js';
import { TEST_DB_URL } from './helpers.js';

const pool = new pg.Pool({ connectionString: TEST_DB_URL, max: 2 });

beforeAll(async () => {
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
});
afterAll(() => pool.end());

describe('migraciones', () => {
  it('se aplican en orden sobre una base vacía', async () => {
    const r = await runMigrations(pool);
    expect(r.applied).toEqual(['0001_foundation.sql', '0002_accounts_security.sql', '0003_drugstores.sql', '0004_expirations.sql', '0005_waste.sql', '0006_segregation.sql', '0007_staff.sql', '0008_improvement_actions.sql', '0009_diagnoses.sql', '0010_support_files.sql', '0011_imports.sql', '0012_local_migrations.sql']);
    const t = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1");
    expect(t.rows.map((x) => x.table_name).sort()).toEqual([
      'audit_logs', 'dev_mailbox', 'drugstore_members', 'drugstores', 'expiration_products', 'password_resets', 'schema_migrations', 'segregation_checks', 'sessions', 'training_topics', 'trainings', 'users', 'waste_records', 'workers', 'improvement_actions', 'instrument_items', 'instrument_versions', 'diagnoses', 'diagnosis_answers', 'diagnosis_area_scores', 'support_files', 'imports', 'local_migrations',
    ].sort());
  });

  it('es idempotente', async () => {
    const r = await runMigrations(pool);
    expect(r.applied).toEqual([]);
    expect(r.skipped).toHaveLength(12);
  });

  it('detiene el proceso si una migración aplicada fue modificada', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'mig-'));
    const sql = await readFile(new URL('../src/db/migrations/0001_foundation.sql', import.meta.url), 'utf8');
    await writeFile(path.join(dir, '0001_foundation.sql'), sql + '\n-- alterada');
    await expect(runMigrations(pool, dir)).rejects.toThrow(/modificada/);
  });
});
