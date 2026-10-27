import { loadConfig } from '../config/env.js';
import { createDb } from './client.js';
import { runMigrations } from './migrate.js';

const cfg = loadConfig();
const { pool } = createDb(cfg.DATABASE_URL);
try {
  const r = await runMigrations(pool);
  console.log(`Aplicadas: ${r.applied.join(', ') || 'ninguna'}; ya existentes: ${r.skipped.length}`);
} finally {
  await pool.end();
}
