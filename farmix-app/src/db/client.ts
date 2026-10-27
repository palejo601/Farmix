import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

export function makeDb(pool: pg.Pool) {
  return drizzle(pool, { schema });
}

export function createDb(databaseUrl: string) {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 10 });
  return { pool, db: makeDb(pool) };
}

export type Db = ReturnType<typeof makeDb>;
