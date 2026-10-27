import { createHash } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import { localMigrations as t } from '../../db/schema.js';
import { audit } from '../../shared/audit.js';
import { conflict, isUniqueViolation, notFound } from '../../shared/crud.js';
import { ROLE_RANK } from '../drugstores/schema.js';
import { findMembership } from '../drugstores/guard.js';
import { analyze, KIND_KEYS, KINDS, type KindKey, type Row, type RowResult } from '../imports/kinds.js';

type Payload = Partial<Record<KindKey, Row[]>>;

const AVISOS = {
  pendiente: 'Vista previa: no se ha guardado nada. Confirme para registrar las filas válidas.',
  confirmada: 'Migración confirmada. Puede revertirla: se archivan (borrado lógico) solo las filas que ella creó.',
  revertida: 'Migración revertida. Los datos que creó fueron archivados.',
};

/** JSON canónico (claves ordenadas) para que el mismo contenido dé siempre el mismo hash. */
function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v as object).sort().map((k) => `${JSON.stringify(k)}:${stable((v as Row)[k])}`).join(',')}}`;
  }
  return JSON.stringify(v) ?? 'null';
}

type Row0 = typeof t.$inferSelect;
function toDto(r: Row0) {
  const summary = r.summary as { counts: Record<KindKey, { recibidas: number; validas: number; invalidas: number; duplicadas: number }>; errors: { kind: KindKey; row: number; state: string; errors: string[] }[] };
  return {
    id: r.id, drugstoreId: r.drugstoreId, isDemo: r.isDemo, phase: r.phase as 'pendiente' | 'confirmada' | 'revertida', contentHash: r.contentHash,
    summary: summary.counts, errors: summary.errors.slice(0, 200),
    inserted: r.insertedIds ? Object.fromEntries(Object.entries(r.insertedIds).map(([k, v]) => [k, v.length])) : null,
    aviso: AVISOS[r.phase as keyof typeof AVISOS], createdAt: r.createdAt.toISOString(),
  };
}

async function mine(db: Db, userId: string, id: string) {
  const [row] = await db.select().from(t).where(and(eq(t.id, id), eq(t.userId, userId))).limit(1);
  if (!row) throw notFound();
  return row;
}

/** Exige que el usuario siga siendo operador o superior de la droguería; si no, 404. */
async function membership(db: Db, userId: string, drugstoreId: string) {
  const m = await findMembership(db, userId, drugstoreId);
  if (!m || ROLE_RANK[m.role] < ROLE_RANK.operador) throw notFound();
  return m;
}

export async function create(db: Db, userId: string, input: { drugstoreId: string; isDemo: boolean; data: Payload }, requestId: string) {
  await membership(db, userId, input.drugstoreId);
  const counts = {} as Record<KindKey, { recibidas: number; validas: number; invalidas: number; duplicadas: number }>;
  const errors: { kind: KindKey; row: number; state: string; errors: string[] }[] = [];
  const valid: Payload = {};
  for (const key of KIND_KEYS) {
    const list = input.data[key] ?? [];
    const results: RowResult[] = await analyze(db, KINDS[key], input.drugstoreId, list.map((data, i) => ({ n: i + 1, data })));
    counts[key] = {
      recibidas: list.length, validas: results.filter((r) => r.state === 'valida').length,
      invalidas: results.filter((r) => r.state === 'invalida').length, duplicadas: results.filter((r) => r.state === 'duplicada').length,
    };
    valid[key] = results.filter((r) => r.state === 'valida').map((r) => r.data!);
    for (const r of results) if (r.state !== 'valida') errors.push({ kind: key, row: r.row, state: r.state, errors: r.errors });
  }
  const contentHash = createHash('sha256').update(stable({ drugstoreId: input.drugstoreId, data: input.data })).digest('hex');
  try {
    const [row] = await db
      .insert(t)
      .values({ userId, drugstoreId: input.drugstoreId, contentHash, isDemo: input.isDemo, payload: valid as Record<string, unknown[]>, summary: { counts, errors } })
      .returning();
    await audit(db, { userId, action: 'local_migrations.create', resource: 'local_migrations', resourceId: row!.id, outcome: 'success', requestId });
    return toDto(row!);
  } catch (e) {
    if (isUniqueViolation(e)) {
      await audit(db, { userId, action: 'local_migrations.create', resource: 'local_migrations', outcome: 'failure', requestId });
      throw conflict('Estos mismos datos ya fueron enviados. Confirme o revierta la migración existente');
    }
    throw e;
  }
}

export async function confirm(db: Db, userId: string, id: string, requestId: string) {
  const cur = await mine(db, userId, id);
  await membership(db, userId, cur.drugstoreId);
  const result = await db.transaction(async (tx) => {
    const [row] = await tx.select().from(t).where(and(eq(t.id, id), eq(t.userId, userId))).for('update').limit(1);
    if (!row) throw notFound();
    if (row.phase !== 'pendiente') throw conflict(`La migración ya está ${row.phase}`);
    const inserted: Record<string, string[]> = {};
    for (const key of KIND_KEYS) {
      const kind = KINDS[key];
      const list = (row.payload[key] ?? []) as Row[];
      // Se vuelve a comprobar contra lo registrado: evita duplicar si entre la vista previa y la confirmación cambió algo.
      const re = await analyze(tx as unknown as Db, kind, row.drugstoreId, list.map((data, i) => ({ n: i + 1, data })));
      inserted[key] = [];
      for (const r of re) if (r.state === 'valida') inserted[key]!.push(await kind.insert(tx, row.drugstoreId, userId, r.data!));
    }
    const [upd] = await tx.update(t).set({ phase: 'confirmada', confirmedAt: new Date(), insertedIds: inserted, updatedAt: new Date() }).where(eq(t.id, id)).returning();
    return upd!;
  });
  await audit(db, { userId, action: 'local_migrations.confirm', resource: 'local_migrations', resourceId: id, outcome: 'success', requestId });
  return toDto(result);
}

export async function revert(db: Db, userId: string, id: string, requestId: string) {
  const cur = await mine(db, userId, id);
  await membership(db, userId, cur.drugstoreId);
  const result = await db.transaction(async (tx) => {
    const [row] = await tx.select().from(t).where(and(eq(t.id, id), eq(t.userId, userId))).for('update').limit(1);
    if (!row) throw notFound();
    if (row.phase !== 'confirmada') throw conflict(`Solo se puede revertir una migración confirmada (estado actual: ${row.phase})`);
    for (const key of KIND_KEYS) await KINDS[key].remove(tx, row.drugstoreId, userId, row.insertedIds?.[key] ?? []);
    const [upd] = await tx.update(t).set({ phase: 'revertida', revertedAt: new Date(), updatedAt: new Date() }).where(eq(t.id, id)).returning();
    return upd!;
  });
  await audit(db, { userId, action: 'local_migrations.revert', resource: 'local_migrations', resourceId: id, outcome: 'success', requestId });
  return toDto(result);
}
