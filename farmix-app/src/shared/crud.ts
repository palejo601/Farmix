import { sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { AppError } from './errors.js';

export const notFound = () => new AppError(404, 'NOT_FOUND', 'Recurso no encontrado');
export const invalid = (msg: string) => new AppError(400, 'VALIDATION_ERROR', msg);
export const conflict = (msg: string) => new AppError(409, 'CONFLICT', msg);

export const isUniqueViolation = (e: unknown) =>
  (e as { code?: string }).code === '23505' || (e as { cause?: { code?: string } }).cause?.code === '23505';

/** "Hoy" en la zona horaria de Colombia, calculado por la base de datos. */
export const todaySql = sql`(now() AT TIME ZONE 'America/Bogota')::date`;

export async function isFutureDate(db: Db, date: string): Promise<boolean> {
  const r = await db.execute(sql`SELECT (${date}::date > ${todaySql}) AS f`);
  return Boolean((r.rows[0] as { f: boolean }).f);
}
