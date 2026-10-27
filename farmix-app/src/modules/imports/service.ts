import { and, eq, isNull, sql } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import { imports as t } from '../../db/schema.js';
import { audit } from '../../shared/audit.js';
import { AppError } from '../../shared/errors.js';
import { conflict, invalid, notFound } from '../../shared/crud.js';
import type { Membership } from '../drugstores/guard.js';
import { analyze, KINDS, type KindKey, type RowResult } from './kinds.js';
import { MAX_IMPORT_BYTES, mapRows, readTable } from './parse.js';

const AVISO_PREVIA = 'Vista previa: todavía no se ha guardado nada. Confirme para registrar las filas válidas; las inválidas y duplicadas se omiten.';
const AVISO_OK = 'Importación confirmada: se registraron únicamente las filas válidas.';

type Row = typeof t.$inferSelect;
const scope = (id: string) => and(eq(t.drugstoreId, id), isNull(t.deletedAt));

function toDto(r: Row) {
  const results = r.rowResults as RowResult[];
  const caducada = r.phase === 'vista_previa' && r.expiresAt <= new Date();
  return {
    id: r.id, kind: r.kind as KindKey, fileName: r.fileName, phase: r.phase as 'vista_previa' | 'confirmada', caducada,
    expiresAt: r.expiresAt.toISOString(),
    totals: { filas: r.totalRows, validas: r.validRows, invalidas: r.invalidRows, duplicadas: r.duplicateRows },
    insertedCount: r.insertedCount,
    rows: results.map(({ row, state, errors, data }) => ({ row, state, errors, ...(state === 'valida' ? { data } : {}) })),
    aviso: r.phase === 'confirmada' ? AVISO_OK : AVISO_PREVIA,
    createdAt: r.createdAt.toISOString(),
  };
}

async function find(db: Db, m: Membership, id: string) {
  const [row] = await db.select().from(t).where(and(scope(m.drugstore.id), eq(t.id, id))).limit(1);
  if (!row) throw notFound();
  return row;
}
export const get = async (db: Db, m: Membership, id: string) => toDto(await find(db, m, id));

export async function preview(db: Db, m: Membership, userId: string, kindKey: KindKey, file: { filename: string; data: Buffer }, requestId: string) {
  if (file.data.length === 0) throw invalid('El archivo está vacío');
  if (file.data.length > MAX_IMPORT_BYTES) throw new AppError(413, 'PAYLOAD_TOO_LARGE', 'El archivo supera 2 MB');
  const kind = KINDS[kindKey];
  const rows = mapRows(kind, await readTable(file.data, file.filename));
  const results = await analyze(db, kind, m.drugstore.id, rows);
  const count = (s: string) => results.filter((r) => r.state === s).length;
  const [row] = await db
    .insert(t)
    .values({
      drugstoreId: m.drugstore.id, kind: kindKey, fileName: file.filename.split(/[\\/]/).pop()!.slice(0, 120) || 'archivo',
      totalRows: results.length, validRows: count('valida'), invalidRows: count('invalida'), duplicateRows: count('duplicada'),
      rowResults: results, expiresAt: sql`now() + interval '24 hours'` as unknown as Date, createdBy: userId, updatedBy: userId,
    })
    .returning();
  await audit(db, { userId, action: 'imports.preview', resource: 'imports', resourceId: row!.id, outcome: 'success', requestId });
  return toDto(row!);
}

export async function confirm(db: Db, m: Membership, userId: string, id: string, requestId: string) {
  const result = await db.transaction(async (tx) => {
    const [row] = await tx.select().from(t).where(and(scope(m.drugstore.id), eq(t.id, id))).for('update').limit(1);
    if (!row) throw notFound();
    if (row.phase === 'confirmada') throw conflict('Esta importación ya fue confirmada');
    if (row.expiresAt <= new Date()) throw conflict('La vista previa caducó (24 horas). Cargue el archivo de nuevo');
    const kind = KINDS[row.kind as KindKey];
    const valid = (row.rowResults as RowResult[]).filter((r) => r.state === 'valida' && r.data);
    // Se vuelve a comprobar contra lo registrado: pudo cambiar entre la vista previa y la confirmación.
    const recheck = await analyze(tx as unknown as Db, kind, m.drugstore.id, valid.map((r) => ({ n: r.row, data: r.data! })));
    let inserted = 0;
    for (const r of recheck) {
      if (r.state !== 'valida') continue;
      await kind.insert(tx, m.drugstore.id, userId, r.data!);
      inserted++;
    }
    const [updated] = await tx
      .update(t)
      .set({ phase: 'confirmada', confirmedAt: new Date(), insertedCount: inserted, updatedBy: userId, updatedAt: new Date() })
      .where(eq(t.id, id))
      .returning();
    return { inserted, skipped: row.totalRows - inserted, row: updated! };
  });
  await audit(db, { userId, action: 'imports.confirm', resource: 'imports', resourceId: id, outcome: 'success', requestId });
  return { inserted: result.inserted, skipped: result.skipped, import: toDto(result.row) };
}
