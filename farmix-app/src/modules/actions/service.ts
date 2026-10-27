import { and, asc, eq, getTableColumns, isNull, sql } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import { improvementActions as t } from '../../db/schema.js';
import { audit } from '../../shared/audit.js';
import { invalid, isFutureDate, notFound, todaySql } from '../../shared/crud.js';
import type { Membership } from '../drugstores/guard.js';

const overdueExpr = sql<boolean>`(${t.progressState} <> 'cerrada' AND ${t.dueOn} < ${todaySql})`;
const scope = (id: string) => and(eq(t.drugstoreId, id), isNull(t.deletedAt));
const select = (db: Db) => db.select({ ...getTableColumns(t), overdue: overdueExpr }).from(t);
type Row = Awaited<ReturnType<typeof select>>[number];

const toDto = (r: Row) => ({
  id: r.id, finding: r.finding, correctiveAction: r.correctiveAction, responsible: r.responsible, dueOn: r.dueOn,
  state: r.progressState as 'pendiente' | 'en_curso' | 'cerrada', closedOn: r.closedOn, overdue: r.overdue,
  createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
});

async function find(db: Db, m: Membership, id: string) {
  const [row] = await select(db).where(and(scope(m.drugstore.id), eq(t.id, id))).limit(1);
  if (!row) throw notFound();
  return row;
}
export const get = async (db: Db, m: Membership, id: string) => toDto(await find(db, m, id));

export async function list(db: Db, m: Membership, q: { state?: string; overdue?: boolean; limit: number; offset: number }) {
  const where = and(
    scope(m.drugstore.id),
    q.state ? eq(t.progressState, q.state) : undefined,
    q.overdue === undefined ? undefined : q.overdue ? overdueExpr : sql`NOT ${overdueExpr}`,
  );
  const rows = await select(db).where(where).orderBy(asc(t.dueOn), asc(t.id)).limit(q.limit).offset(q.offset);
  const [c] = await db.select({ n: sql<number>`count(*)::int` }).from(t).where(where);
  return { items: rows.map(toDto), total: c?.n ?? 0, limit: q.limit, offset: q.offset };
}

/** Regla: cerrada exige fecha de cierre (no futura); cualquier otro estado no la admite. */
async function resolveClosure(db: Db, state: string, closedOn: string | null | undefined) {
  if (state === 'cerrada') {
    if (!closedOn) throw invalid('Una acción cerrada exige fecha de cierre');
    if (await isFutureDate(db, closedOn)) throw invalid('La fecha de cierre no puede ser futura');
    return closedOn;
  }
  if (closedOn) throw invalid('Solo una acción cerrada puede tener fecha de cierre');
  return null;
}

export async function create(
  db: Db, m: Membership, userId: string,
  input: { finding: string; correctiveAction: string; responsible: string; dueOn: string; state?: string; closedOn?: string | null },
  requestId: string,
) {
  const state = input.state ?? 'pendiente';
  const closedOn = await resolveClosure(db, state, input.closedOn);
  const [row] = await db
    .insert(t)
    .values({ drugstoreId: m.drugstore.id, finding: input.finding, correctiveAction: input.correctiveAction, responsible: input.responsible, dueOn: input.dueOn, progressState: state, closedOn, createdBy: userId, updatedBy: userId })
    .returning({ id: t.id });
  await audit(db, { userId, action: 'actions.create', resource: 'improvement_actions', resourceId: row!.id, outcome: 'success', requestId });
  return get(db, m, row!.id);
}

export async function update(
  db: Db, m: Membership, userId: string, id: string,
  input: { finding?: string; correctiveAction?: string; responsible?: string; dueOn?: string; state?: string; closedOn?: string | null },
  requestId: string,
) {
  const cur = await find(db, m, id);
  const state = input.state ?? cur.progressState;
  // Al salir de "cerrada" sin indicar fecha, la fecha de cierre se limpia; al seguir cerrada se conserva.
  const wanted = input.closedOn !== undefined ? input.closedOn : state === 'cerrada' ? cur.closedOn : null;
  const closedOn = await resolveClosure(db, state, wanted);
  const { state: _s, closedOn: _c, ...rest } = input;
  await db
    .update(t)
    .set({ ...rest, progressState: state, closedOn, updatedBy: userId, updatedAt: new Date() })
    .where(and(scope(m.drugstore.id), eq(t.id, id)));
  await audit(db, { userId, action: 'actions.update', resource: 'improvement_actions', resourceId: id, outcome: 'success', requestId });
  return get(db, m, id);
}

export async function remove(db: Db, m: Membership, userId: string, id: string, requestId: string) {
  await find(db, m, id);
  await db.update(t).set({ deletedAt: new Date(), updatedBy: userId, updatedAt: new Date() }).where(and(scope(m.drugstore.id), eq(t.id, id)));
  await audit(db, { userId, action: 'actions.delete', resource: 'improvement_actions', resourceId: id, outcome: 'success', requestId });
}

export async function counts(db: Db, m: Membership) {
  const c = (st: string) => sql<number>`(count(*) FILTER (WHERE ${t.progressState} = ${st}))::int`;
  const [row] = await db
    .select({ total: sql<number>`count(*)::int`, pendiente: c('pendiente'), enCurso: c('en_curso'), cerrada: c('cerrada'), atrasadas: sql<number>`(count(*) FILTER (WHERE ${overdueExpr}))::int` })
    .from(t)
    .where(scope(m.drugstore.id));
  return row!;
}
