import { buildApp } from './app.js';
import { ConfigError, loadConfig } from './config/env.js';
import { createDb } from './db/client.js';
import { purgeDueAccounts } from './modules/personal-data/service.js';

let config;
try {
  config = loadConfig();
} catch (err) {
  if (err instanceof ConfigError) {
    console.error(err.message);
    process.exit(1);
  }
  throw err;
}

const { pool } = createDb(config.DATABASE_URL);
const app = await buildApp(config, pool);

const purge = setInterval(() => {
  purgeDueAccounts(app.db).catch((err) => app.log.error({ err }, 'falló la depuración de cuentas'));
}, 3_600_000);

const shutdown = async () => {
  clearInterval(purge);
  await app.close();
  await pool.end();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

await app.listen({ port: config.PORT, host: '0.0.0.0' });
