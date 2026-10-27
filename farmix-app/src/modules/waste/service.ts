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
    wasteType: r.wasteType,
    handling: r.handling,
    supportRef: r.supportRef,
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

type Input = { recordedOn?: string; classification?: string; quantity?: number; unit?: string; origin?: string | null; notes?: string | null; wasteType?: string | null; handling?: string | null; supportRef?: string | null };

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
      unit: input.unit, origin: input.origin ?? null, notes: input.notes ?? null,
      wasteType: input.wasteType ?? null, handling: input.handling ?? null, supportRef: input.supportRef ?? null, createdBy: userId, updatedBy: userId,
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
  if (input.wasteType !== undefined) patch.wasteType = input.wasteType;
  if (input.handling !== undefined) patch.handling = input.handling;
  if (input.supportRef !== undefined) patch.supportRef = input.supportRef;
  const [row] = await db.update(t).set({ ...patch, updatedBy: userId, updatedAt: new Date() }).where(and(scope(m.drugstore.id), eq(t.id, id))).returning();
  await audit(db, { userId, action: 'waste.update', resource: 'waste_records', resourceId: id, outcome: 'success', requestId });
  return toDto(row!);
}

export async function remove(db: Db, m: Membership, userId: string, id: string, requestId: string) {
  await find(db, m, id);
  await db.update(t).set({ deletedAt: new Date(), updatedBy: userId, updatedAt: new Date() }).where(and(scope(m.drugstore.id), eq(t.id, id)));
  await audit(db, { userId, action: 'waste.delete', resource: 'waste_records', resourceId: id, outcome: 'success', requestId });
}

/**
 * Kilogramos por clasificación en un periodo (los gramos se convierten a kg). Los registros en «unidades» NO se
 * convierten ni se suman a los kilogramos: se informan aparte (como el prototipo).
 */
export async function summary(db: Db, m: Membership, range: { from: string; to: string }) {
  const inRange = and(scope(m.drugstore.id), gte(t.recordedOn, range.from), lte(t.recordedOn, range.to));
  const kg = sql<string>`coalesce(sum(CASE WHEN ${t.unit} = 'g' THEN ${t.quantity} / 1000 ELSE ${t.quantity} END), 0)`;
  const rows = await db
    .select({ classification: t.classification, registros: sql<number>`count(*)::int`, kg })
    .from(t)
    .where(and(inRange, sql`${t.unit} IN ('kg', 'g')`))
    .groupBy(t.classification);
  const [u] = await db
    .select({ registros: sql<number>`count(*)::int`, cantidad: sql<string>`coalesce(sum(${t.quantity}), 0)` })
    .from(t)
    .where(and(inRange, eq(t.unit, 'unidades')));
  const round = (n: number) => Math.round(n * 1000) / 1000;
  const porClasificacion = rows.map((r) => ({ clasificacion: r.classification, registros: r.registros, kg: round(Number(r.kg)) })).sort((a, b) => a.clasificacion.localeCompare(b.clasificacion));
  return {
    registros: porClasificacion.reduce((a, r) => a + r.registros, 0),
    totalKg: round(porClasificacion.reduce((a, r) => a + r.kg, 0)),
    porClasificacion,
    enUnidades: { registros: u?.registros ?? 0, cantidad: Number(u?.cantidad ?? 0) },
  };
}

const CLASSES = ['riesgo_biologico', 'peligroso_quimico', 'aprovechable', 'organico_aprovechable', 'no_aprovechable'] as const;

/** Kilogramos por mes y clasificación en los últimos `months` meses (incluye el mes en curso, hora de Colombia). */
export async function monthlySeries(db: Db, m: Membership, months = 6) {
  const r = await db.execute(sql`
    SELECT to_char(mm, 'YYYY-MM') AS mes, w.classification AS clasificacion,
           coalesce(sum(CASE WHEN w.unit = 'g' THEN w.quantity / 1000 ELSE w.quantity END), 0) AS kg
    FROM generate_series(
           date_trunc('month', (now() AT TIME ZONE 'America/Bogota')::date) - make_interval(months => ${months - 1}),
           date_trunc('month', (now() AT TIME ZONE 'America/Bogota')::date),
           interval '1 month') AS mm
    LEFT JOIN waste_records w
      ON date_trunc('month', w.recorded_on) = mm AND w.drugstore_id = ${m.drugstore.id}
     AND w.deleted_at IS NULL AND w.unit IN ('kg', 'g')
    GROUP BY mm, w.classification ORDER BY mm`);
  const byMonth = new Map<string, Record<string, number>>();
  for (const row of r.rows as { mes: string; clasificacion: string | null; kg: string }[]) {
    const o = byMonth.get(row.mes) ?? Object.fromEntries(CLASSES.map((c) => [c, 0]));
    if (row.clasificacion) o[row.clasificacion] = Math.round(Number(row.kg) * 1000) / 1000;
    byMonth.set(row.mes, o);
  }
  return [...byMonth.entries()].map(([mes, kg]) => ({ mes, kg }));
}
