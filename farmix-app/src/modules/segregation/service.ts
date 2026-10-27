import { and, desc, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import { segregationChecks as t } from '../../db/schema.js';
import { audit } from '../../shared/audit.js';
import { invalid, isFutureDate, notFound } from '../../shared/crud.js';
import type { Membership } from '../drugstores/guard.js';

const scope = (drugstoreId: string) => and(eq(t.drugstoreId, drugstoreId), isNull(t.deletedAt));

/** bien segregados / revisados × 100, con un decimal. Se calcula siempre al consultar. */
export const percent = (correct: number, reviewed: number) => Math.round((correct * 1000) / reviewed) / 10;

function toDto(r: typeof t.$inferSelect) {
  return {
    id: r.id,
    checkedOn: r.checkedOn,
    itemsReviewed: r.itemsReviewed,
    itemsCorrect: r.itemsCorrect,
    percentCorrect: percent(r.itemsCorrect, r.itemsReviewed),
    location: r.location,
    observations: r.observations,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

async function find(db: Db, m: Membership, id: string) {
  const [row] = await db.select().from(t).where(and(scope(m.drugstore.id), eq(t.id, id))).limit(1);
  if (!row) throw notFound();
  return row;
}

export async function list(db: Db, m: Membership, q: { from?: string; to?: string; location?: string; limit: number; offset: number }) {
  const where = and(
    scope(m.drugstore.id),
    q.from ? gte(t.checkedOn, q.from) : undefined,
    q.to ? lte(t.checkedOn, q.to) : undefined,
    q.location ? sql`lower(${t.location}) = lower(${q.location})` : undefined,
  );
  const rows = await db.select().from(t).where(where).orderBy(desc(t.checkedOn), desc(t.createdAt), t.id).limit(q.limit).offset(q.offset);
  const [agg] = await db
    .select({ n: sql<number>`count(*)::int`, rev: sql<number>`coalesce(sum(${t.itemsReviewed}), 0)::int`, ok: sql<number>`coalesce(sum(${t.itemsCorrect}), 0)::int` })
    .from(t)
    .where(where);
  const rev = agg?.rev ?? 0;
  const ok = agg?.ok ?? 0;
  return {
    items: rows.map(toDto), total: agg?.n ?? 0, limit: q.limit, offset: q.offset,
    resumen: { revisados: rev, bienSegregados: ok, porcentajeCorrecto: rev > 0 ? percent(ok, rev) : null },
  };
}

export const get = async (db: Db, m: Membership, id: string) => toDto(await find(db, m, id));

type Input = { checkedOn?: string; itemsReviewed?: number; itemsCorrect?: number; location?: string; observations?: string | null };

export async function create(db: Db, m: Membership, userId: string, input: Required<Omit<Input, 'observations'>> & Pick<Input, 'observations'>, requestId: string) {
  if (await isFutureDate(db, input.checkedOn)) throw invalid('La fecha de la verificación no puede ser futura');
  const [row] = await db
    .insert(t)
    .values({ drugstoreId: m.drugstore.id, ...input, observations: input.observations ?? null, createdBy: userId, updatedBy: userId })
    .returning();
  await audit(db, { userId, action: 'segregation.create', resource: 'segregation_checks', resourceId: row!.id, outcome: 'success', requestId });
  return toDto(row!);
}

export async function update(db: Db, m: Membership, userId: string, id: string, input: Input, requestId: string) {
  const cur = await find(db, m, id);
  const reviewed = input.itemsReviewed ?? cur.itemsReviewed;
  const correct = input.itemsCorrect ?? cur.itemsCorrect;
  if (correct > reviewed) throw invalid('Los bien segregados no pueden superar los revisados');
  if (input.checkedOn && (await isFutureDate(db, input.checkedOn))) throw invalid('La fecha de la verificación no puede ser futura');
  const [row] = await db
    .update(t)
    .set({ ...input, updatedBy: userId, updatedAt: new Date() })
    .where(and(scope(m.drugstore.id), eq(t.id, id)))
    .returning();
  await audit(db, { userId, action: 'segregation.update', resource: 'segregation_checks', resourceId: id, outcome: 'success', requestId });
  return toDto(row!);
}

export async function remove(db: Db, m: Membership, userId: string, id: string, requestId: string) {
  await find(db, m, id);
  await db.update(t).set({ deletedAt: new Date(), updatedBy: userId, updatedAt: new Date() }).where(and(scope(m.drugstore.id), eq(t.id, id)));
  await audit(db, { userId, action: 'segregation.delete', resource: 'segregation_checks', resourceId: id, outcome: 'success', requestId });
}
