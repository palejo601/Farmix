import { mkdir, writeFile } from 'node:fs/promises';
import { buildApp } from '../app.js';
import { loadConfig } from '../config/env.js';
import { createDb } from '../db/client.js';

const config = loadConfig({ ...process.env, EXPOSE_DOCS: 'true' });
const { pool } = createDb(config.DATABASE_URL);
const app = await buildApp(config, pool);
await app.ready();
await mkdir('docs', { recursive: true });
await writeFile('docs/openapi.json', JSON.stringify(app.swagger(), null, 2) + '\n');

const rows = app.routeTable
  .filter((r) => !r.url.endsWith('openapi.json'))
  .map((r) => ({ ...r, url: r.url.replace(/:(\w+)/g, '{$1}') }))
  .sort((a, b) => a.url.localeCompare(b.url) || a.method.localeCompare(b.method));
await writeFile('docs/rutas.tsv', rows.map((r) => `${r.method}\t${r.url}`).join('\n') + '\n');
console.log(`OpenAPI y ${rows.length} rutas exportadas en docs/`);
await app.close();
await pool.end();
