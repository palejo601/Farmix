import type pg from 'pg';
import type { HealthResponse } from './schema.js';

const MARCA = 'FARMIX · producto mínimo viable en estudio';

export async function checkHealth(pool: pg.Pool): Promise<HealthResponse> {
  let baseDeDatos: HealthResponse['baseDeDatos'] = 'ok';
  try {
    await pool.query('SELECT 1');
  } catch {
    baseDeDatos = 'error';
  }
  return {
    estado: baseDeDatos === 'ok' ? 'ok' : 'degradado',
    baseDeDatos,
    marca: MARCA,
    fecha: new Date().toISOString(),
  };
}
