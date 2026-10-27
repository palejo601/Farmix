import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import { diagnoses as d, diagnosisAnswers as ans, diagnosisAreaScores as scores, instrumentItems as items, instrumentVersions as versions } from '../../db/schema.js';
import { audit } from '../../shared/audit.js';
import { invalid, isFutureDate, notFound } from '../../shared/crud.js';
import type { Membership } from '../drugstores/guard.js';
import { AREAS, AREA_LABELS } from './schema.js';

const AVISO = 'Puntajes descriptivos de autoevaluación (1 a 5). No constituyen concepto ni certificación de cumplimiento normativo.';
const ESCALA = '1 = no se hace; 5 = práctica consolidada y documentada';
const scope = (id: string) => and(eq(d.drugstoreId, id), isNull(d.deletedAt));
const round1 = (n: number) => Math.round(n * 10) / 10;

async function currentVersion(db: Db) {
  const [v] = await db.select().from(versions).where(eq(versions.isCurrent, true)).limit(1);
  if (!v) throw new Error('No hay un instrumento vigente');
  return v;
}

export async function getCurrentInstrument(db: Db) {
  const v = await currentVersion(db);
  const rows = await db.select().from(items).where(eq(items.versionId, v.id)).orderBy(items.position);
  return {
    instrument: {
      id: v.id, versionNumber: v.versionNumber, title: v.title, description: v.description, escala: ESCALA,
      areas: AREAS.map((area) => ({
        area, label: AREA_LABELS[area],
        items: rows.filter((r) => r.area === area).map((r) => ({ id: r.id, code: r.itemCode, prompt: r.promptText, position: r.position })),
      })).filter((a) => a.items.length > 0),
    },
  };
}

/** Recalcula el promedio por área (1 a 5, un decimal) a partir de las respuestas guardadas. */
async function recomputeScores(tx: Pick<Db, 'select' | 'delete' | 'insert'>, diagnosisId: string) {
  const rows = await tx
    .select({ area: items.area, avg: sql<string>`avg(${ans.score})`, n: sql<number>`count(*)::int` })
    .from(ans)
    .innerJoin(items, and(eq(items.versionId, ans.versionId), eq(items.id, ans.itemId)))
    .where(eq(ans.diagnosisId, diagnosisId))
    .groupBy(items.area);
  await tx.delete(scores).where(eq(scores.diagnosisId, diagnosisId));
  if (rows.length) {
    await tx.insert(scores).values(rows.map((r) => ({ diagnosisId, area: r.area, areaScore: round1(Number(r.avg)).toFixed(1), answeredCount: r.n })));
  }
}

async function upsertAnswers(
  tx: Pick<Db, 'select' | 'delete' | 'insert'>, db: Db, diagnosisId: string, versionId: string, userId: string,
  list: { itemId: string; score: number }[],
) {
  if (list.length) {
    const valid = await db.select({ id: items.id }).from(items).where(and(eq(items.versionId, versionId), inArray(items.id, list.map((a) => a.itemId))));
    if (valid.length !== list.length) throw invalid('Hay ítems que no pertenecen a la versión del instrumento de este diagnóstico');
    await tx
      .insert(ans)
      .values(list.map((a) => ({ diagnosisId, versionId, itemId: a.itemId, score: a.score, createdBy: userId, updatedBy: userId })))
      .onConflictDoUpdate({ target: [ans.diagnosisId, ans.itemId], set: { score: sql`excluded.score`, updatedBy: userId, updatedAt: new Date() } });
  }
  await recomputeScores(tx, diagnosisId);
}

async function detail(db: Db, m: Membership, id: string) {
  const [row] = await db
    .select({ d, v: { id: versions.id, versionNumber: versions.versionNumber, title: versions.title } })
    .from(d)
    .innerJoin(versions, eq(versions.id, d.instrumentVersionId))
    .where(and(scope(m.drugstore.id), eq(d.id, id)))
    .limit(1);
  if (!row) throw notFound();
  const itemRows = await db.select().from(items).where(eq(items.versionId, row.v.id));
  const answerRows = await db
    .select({ itemId: ans.itemId, score: ans.score, code: items.itemCode, area: items.area })
    .from(ans)
    .innerJoin(items, and(eq(items.versionId, ans.versionId), eq(items.id, ans.itemId)))
    .where(eq(ans.diagnosisId, id))
    .orderBy(items.position);
  const scoreRows = await db.select().from(scores).where(eq(scores.diagnosisId, id));
  const areaScores = AREAS.map((area) => {
    const s = scoreRows.find((x) => x.area === area);
    return { area, label: AREA_LABELS[area], score: s ? Number(s.areaScore) : null, answered: s?.answeredCount ?? 0, items: itemRows.filter((i) => i.area === area).length };
  });
  const have = areaScores.filter((a) => a.score !== null).map((a) => a.score as number);
  return {
    id: row.d.id, performedOn: row.d.performedOn, notes: row.d.notes, instrument: row.v,
    answers: answerRows.map((a) => ({ itemId: a.itemId, code: a.code, area: a.area as (typeof AREAS)[number], score: a.score })),
    areaScores,
    overallScore: have.length ? round1(have.reduce((a, b) => a + b, 0) / have.length) : null,
    answeredCount: answerRows.length, itemCount: itemRows.length, aviso: AVISO,
    createdAt: row.d.createdAt.toISOString(), updatedAt: row.d.updatedAt.toISOString(),
  };
}
export const get = detail;

export async function list(db: Db, m: Membership, q: { limit: number; offset: number }) {
  const rows = await db.select({ id: d.id }).from(d).where(scope(m.drugstore.id)).orderBy(desc(d.performedOn), desc(d.createdAt)).limit(q.limit).offset(q.offset);
  const [c] = await db.select({ n: sql<number>`count(*)::int` }).from(d).where(scope(m.drugstore.id));
  const full = await Promise.all(rows.map((r) => detail(db, m, r.id)));
  return {
    items: full.map((x) => ({ id: x.id, performedOn: x.performedOn, versionNumber: x.instrument.versionNumber, overallScore: x.overallScore, answeredCount: x.answeredCount, itemCount: x.itemCount, createdAt: x.createdAt })),
    total: c?.n ?? 0, limit: q.limit, offset: q.offset,
  };
}

export async function create(
  db: Db, m: Membership, userId: string,
  input: { performedOn: string; notes?: string | null; answers: { itemId: string; score: number }[] },
  requestId: string,
) {
  if (await isFutureDate(db, input.performedOn)) throw invalid('La fecha del diagnóstico no puede ser futura');
  const v = await currentVersion(db);
  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(d)
      .values({ drugstoreId: m.drugstore.id, instrumentVersionId: v.id, performedOn: input.performedOn, notes: input.notes ?? null, createdBy: userId, updatedBy: userId })
      .returning({ id: d.id });
    await upsertAnswers(tx as unknown as Db, db, row!.id, v.id, userId, input.answers);
    return row!.id;
  });
  await audit(db, { userId, action: 'diagnoses.create', resource: 'diagnoses', resourceId: id, outcome: 'success', requestId });
  return detail(db, m, id);
}

export async function update(
  db: Db, m: Membership, userId: string, id: string,
  input: { performedOn?: string; notes?: string | null; answers?: { itemId: string; score: number }[] },
  requestId: string,
) {
  const cur = await detail(db, m, id);
  if (input.performedOn && (await isFutureDate(db, input.performedOn))) throw invalid('La fecha del diagnóstico no puede ser futura');
  await db.transaction(async (tx) => {
    const patch: Partial<typeof d.$inferInsert> = { updatedBy: userId, updatedAt: new Date() };
    if (input.performedOn !== undefined) patch.performedOn = input.performedOn;
    if (input.notes !== undefined) patch.notes = input.notes;
    await tx.update(d).set(patch).where(and(scope(m.drugstore.id), eq(d.id, id)));
    if (input.answers) await upsertAnswers(tx as unknown as Db, db, id, cur.instrument.id, userId, input.answers);
  });
  await audit(db, { userId, action: 'diagnoses.update', resource: 'diagnoses', resourceId: id, outcome: 'success', requestId });
  return detail(db, m, id);
}
