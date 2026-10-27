import { and, desc, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import { wasteRecords as t } from '../../db/schema.js';
import { audit } from '../../shared/audit.js';
import { AppError } from '../../shared/errors.js';
import type { Membership } from '../drugstores/guard.js';
import type { WasteDto } from './schema.js';

const scope = (drugstoreId: string) => and(eq(t.drugstoreId, drugstoreId), isNull(t.deletedAt));
const invalid = (msg: string) => new AppError(400, 'VALIDATION_ERROR', msg);

function toDto(r: typeof t.$inferSelect): WasteDto {
  return {
    id: r.id,
    recordedOn: r.recordedOn,
    classification: r.classification as WasteDto['classification'],
    quantity: Number(r.quantity),
    unit: r.unit as WasteDto['unit'],
    origin: r.origin as WasteDto['origin'],
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

async function isFuture(db: Db, date: string): Promise<boolean> {
  const r = await db.execute(sql`SELECT (${date}::date > (now() AT TIME ZONE 'America/Bogota')::date) AS f`);
  return Boolean((r.rows[0] as { f: boolean }).f);
}

/** Reglas que no caben en el esquema Zod por depender de varios campos o de la fecha actual. */
async function checkRules(db: Db, v: { recordedOn: string; classification: string; origin?: string | null }) {
  if (v.origin === 'medicamento_vencido' && v.classification === 'riesgo_biologico') {
    throw invalid('Un medicamento vencido no se clasifica como riesgo biológico');
  }
  if (await isFuture(db, v.recordedOn)) throw invalid('La fecha del registro no puede ser futura');
}

export async function list(db: Db, m: Membership, q: { from?: string; to?: string; classification?: string; limit: number; offset: number }) {
  const where = and(
    scope(m.drugstore.id),
    q.from ? gte(t.recordedOn, q.from) : undefined,
    q.to ? lte(t.recordedOn, q.to) : undefined,
    q.classification ? eq(t.classification, q.classification) : undefined,
  );
  const rows = await db.select().from(t).where(where).orderBy(desc(t.recordedOn), desc(t.createdAt), t.id).limit(q.limit).offset(q.offset);
  const [c] = await db.select({ n: sql<number>`count(*)::int` }).from(t).where(where);
  return { items: rows.map(toDto), total: c?.n ?? 0, limit: q.limit, offset: q.offset };
}

async function find(db: Db, m: Membership, id: string) {
  const [row] = await db.select().from(t).where(and(scope(m.drugstore.id), eq(t.id, id))).limit(1);
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Recurso no encontrado');
  return row;
}

export const get = async (db: Db, m: Membership, id: string) => toDto(await find(db, m, id));

type Input = { recordedOn?: string; classification?: string; quantity?: number; unit?: string; origin?: string | null; notes?: string | null };

export async function create(
  db: Db, m: Membership, userId: string,
  input: Input & { recordedOn: string; classification: string; quantity: number; unit: string },
  requestId: string,
) {
  await checkRules(db, input);
  const [row] = await db
    .insert(t)
    .values({
      drugstoreId: m.drugstore.id, recordedOn: input.recordedOn, classification: input.classification, quantity: String(input.quantity),
      unit: input.unit, origin: input.origin ?? null, notes: input.notes ?? null, createdBy: userId, updatedBy: userId,
    })
    .returning();
  await audit(db, { userId, action: 'waste.create', resource: 'waste_records', resourceId: row!.id, outcome: 'success', requestId });
  return toDto(row!);
}

export async function update(db: Db, m: Membership, userId: string, id: string, input: Input, requestId: string) {
  const cur = await find(db, m, id);
  await checkRules(db, {
    recordedOn: input.recordedOn ?? cur.recordedOn,
    classification: input.classification ?? cur.classification,
    origin: input.origin !== undefined ? input.origin : cur.origin,
  });
  const patch: Partial<typeof t.$inferInsert> = {};
  if (input.recordedOn !== undefined) patch.recordedOn = input.recordedOn;
  if (input.classification !== undefined) patch.classification = input.classification;
  if (input.quantity !== undefined) patch.quantity = String(input.quantity);
  if (input.unit !== undefined) patch.unit = input.unit;
  if (input.origin !== undefined) patch.origin = input.origin;
  if (input.notes !== undefined) patch.notes = input.notes;
  const [row] = await db.update(t).set({ ...patch, updatedBy: userId, updatedAt: new Date() }).where(and(scope(m.drugstore.id), eq(t.id, id))).returning();
  await audit(db, { userId, action: 'waste.update', resource: 'waste_records', resourceId: id, outcome: 'success', requestId });
  return toDto(row!);
}

export async function remove(db: Db, m: Membership, userId: string, id: string, requestId: string) {
  await find(db, m, id);
  await db.update(t).set({ deletedAt: new Date(), updatedBy: userId, updatedAt: new Date() }).where(and(scope(m.drugstore.id), eq(t.id, id)));
  await audit(db, { userId, action: 'waste.delete', resource: 'waste_records', resourceId: id, outcome: 'success', requestId });
}

/** Kilogramos por clasificación en un periodo (los gramos se convierten a kg). */
export async function summary(db: Db, m: Membership, range: { from: string; to: string }) {
  const kg = sql<string>`coalesce(sum(CASE WHEN ${t.unit} = 'g' THEN ${t.quantity} / 1000 ELSE ${t.quantity} END), 0)`;
  const rows = await db
    .select({ classification: t.classification, registros: sql<number>`count(*)::int`, kg })
    .from(t)
    .where(and(scope(m.drugstore.id), gte(t.recordedOn, range.from), lte(t.recordedOn, range.to)))
    .groupBy(t.classification);
  const round = (n: number) => Math.round(n * 1000) / 1000;
  const porClasificacion = rows.map((r) => ({ clasificacion: r.classification, registros: r.registros, kg: round(Number(r.kg)) })).sort((a, b) => a.clasificacion.localeCompare(b.clasificacion));
  return {
    registros: porClasificacion.reduce((a, r) => a + r.registros, 0),
    totalKg: round(porClasificacion.reduce((a, r) => a + r.kg, 0)),
    porClasificacion,
  };
}
