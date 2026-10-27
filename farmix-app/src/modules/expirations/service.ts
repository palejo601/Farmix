import { and, asc, eq, getTableColumns, isNull, sql } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import { expirationProducts as t } from '../../db/schema.js';
import { audit } from '../../shared/audit.js';
import { AppError } from '../../shared/errors.js';
import type { Membership } from '../drugstores/guard.js';
import type { ProductDto } from './schema.js';

// "Hoy" en la zona horaria de Colombia, calculado por la base de datos.
const today = sql`(now() AT TIME ZONE 'America/Bogota')::date`;
const daysLeftExpr = sql<number>`(${t.expiresOn} - ${today})::int`;

/** Única fuente de la clasificación. Vence "hoy" aún es vigente; próximo = faltan menos días que la anticipación. */
const statusExpr = (alertDays: number) => sql<ProductDto['status']>`CASE
  WHEN ${t.destination} <> 'pendiente' THEN 'gestionado'
  WHEN ${t.expiresOn} < ${today} THEN 'vencido'
  WHEN (${t.expiresOn} - ${today}) < ${alertDays}::int THEN 'proximo_a_vencer'
  ELSE 'vigente' END`;

const scope = (drugstoreId: string) => and(eq(t.drugstoreId, drugstoreId), isNull(t.deletedAt));
const selectProducts = (db: Db, alertDays: number) =>
  db.select({ ...getTableColumns(t), status: statusExpr(alertDays), daysLeft: daysLeftExpr }).from(t);

type Row = Awaited<ReturnType<typeof selectProducts>>[number];

function toDto(r: Row): ProductDto {
  const unitCost = Number(r.unitCost);
  return {
    id: r.id,
    productName: r.productName,
    batch: r.batch,
    sanitaryRegistry: r.sanitaryRegistry,
    holder: r.holder,
    expiresOn: r.expiresOn,
    daysLeft: r.daysLeft,
    quantity: r.quantity,
    unitCost,
    totalCost: Math.round(unitCost * r.quantity * 100) / 100,
    destination: r.destination as ProductDto['destination'],
    managedAt: r.managedAt?.toISOString() ?? null,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

const notFound = () => new AppError(404, 'NOT_FOUND', 'Recurso no encontrado');
const duplicate = () => new AppError(409, 'CONFLICT', 'Ya existe un producto con ese nombre y lote en esta droguería');
const isUnique = (e: unknown) => (e as { code?: string; cause?: { code?: string } }).code === '23505' || (e as { cause?: { code?: string } }).cause?.code === '23505';

export async function list(db: Db, m: Membership, q: { status?: string; limit: number; offset: number }) {
  const where = and(scope(m.drugstore.id), q.status ? sql`${statusExpr(m.drugstore.expiryAlertDays)} = ${q.status}` : undefined);
  const rows = await selectProducts(db, m.drugstore.expiryAlertDays).where(where).orderBy(asc(t.expiresOn), asc(t.id)).limit(q.limit).offset(q.offset);
  const [{ n } = { n: 0 }] = await db.select({ n: sql<number>`count(*)::int` }).from(t).where(where);
  return { items: rows.map(toDto), total: n, limit: q.limit, offset: q.offset };
}

export async function get(db: Db, m: Membership, id: string) {
  const [row] = await selectProducts(db, m.drugstore.expiryAlertDays).where(and(scope(m.drugstore.id), eq(t.id, id))).limit(1);
  if (!row) throw notFound();
  return toDto(row);
}

type Input = {
  productName?: string; batch?: string; sanitaryRegistry?: string | null; holder?: string | null;
  expiresOn?: string; quantity?: number; unitCost?: number; destination?: ProductDto['destination'];
};

function columns(input: Input) {
  const out: Partial<typeof t.$inferInsert> = {};
  if (input.productName !== undefined) out.productName = input.productName;
  if (input.batch !== undefined) out.batch = input.batch;
  if (input.sanitaryRegistry !== undefined) out.sanitaryRegistry = input.sanitaryRegistry;
  if (input.holder !== undefined) out.holder = input.holder;
  if (input.expiresOn !== undefined) out.expiresOn = input.expiresOn;
  if (input.quantity !== undefined) out.quantity = input.quantity;
  if (input.unitCost !== undefined) out.unitCost = input.unitCost.toFixed(2);
  if (input.destination !== undefined) {
    out.destination = input.destination;
    out.managedAt = input.destination === 'pendiente' ? null : new Date();
  }
  return out;
}

export async function create(db: Db, m: Membership, userId: string, input: Required<Pick<Input, 'productName' | 'batch' | 'expiresOn' | 'quantity'>> & Input, requestId: string) {
  let id: string;
  try {
    const [row] = await db
      .insert(t)
      .values({ ...columns(input), drugstoreId: m.drugstore.id, productName: input.productName, batch: input.batch, expiresOn: input.expiresOn, quantity: input.quantity, createdBy: userId, updatedBy: userId })
      .returning({ id: t.id });
    id = row!.id;
  } catch (e) {
    if (isUnique(e)) throw duplicate();
    throw e;
  }
  await audit(db, { userId, action: 'expirations.create', resource: 'expiration_products', resourceId: id, outcome: 'success', requestId });
  return get(db, m, id);
}

export async function update(db: Db, m: Membership, userId: string, id: string, input: Input, requestId: string) {
  const current = await get(db, m, id);
  const patch = columns(input);
  // Si ya estaba gestionado y solo cambia de destino gestionado a otro, conserva la fecha de gestión original.
  if (input.destination && input.destination !== 'pendiente' && current.destination !== 'pendiente') delete patch.managedAt;
  try {
    await db.update(t).set({ ...patch, updatedBy: userId, updatedAt: new Date() }).where(and(scope(m.drugstore.id), eq(t.id, id)));
  } catch (e) {
    if (isUnique(e)) throw duplicate();
    throw e;
  }
  await audit(db, { userId, action: 'expirations.update', resource: 'expiration_products', resourceId: id, outcome: 'success', requestId });
  return get(db, m, id);
}

export async function remove(db: Db, m: Membership, userId: string, id: string, requestId: string) {
  await get(db, m, id);
  await db.update(t).set({ deletedAt: new Date(), updatedBy: userId, updatedAt: new Date() }).where(and(scope(m.drugstore.id), eq(t.id, id)));
  await audit(db, { userId, action: 'expirations.delete', resource: 'expiration_products', resourceId: id, outcome: 'success', requestId });
}

export async function alerts(db: Db, m: Membership) {
  const status = statusExpr(m.drugstore.expiryAlertDays);
  const rows = await selectProducts(db, m.drugstore.expiryAlertDays)
    .where(and(scope(m.drugstore.id), sql`${status} IN ('vencido', 'proximo_a_vencer')`))
    .orderBy(asc(t.expiresOn), asc(t.id))
    .limit(500);
  const items = rows.map(toDto);
  return {
    items,
    summary: { vencidos: items.filter((i) => i.status === 'vencido').length, proximos: items.filter((i) => i.status === 'proximo_a_vencer').length },
  };
}

/** Pérdida confirmada = vencido sin gestionar. Valor en riesgo = próximo a vencer. Cifras descriptivas. */
export async function losses(db: Db, m: Membership) {
  const status = statusExpr(m.drugstore.expiryAlertDays);
  const agg = (s: string) => ({
    productos: sql<number>`(count(*) FILTER (WHERE ${status} = ${s}))::int`,
    unidades: sql<number>`(coalesce(sum(${t.quantity}) FILTER (WHERE ${status} = ${s}), 0))::int`,
    valor: sql<string>`coalesce(sum(${t.quantity} * ${t.unitCost}) FILTER (WHERE ${status} = ${s}), 0)`,
  });
  const [row] = await db
    .select({
      vencidoProductos: agg('vencido').productos, vencidoUnidades: agg('vencido').unidades, vencidoValor: agg('vencido').valor,
      riesgoProductos: agg('proximo_a_vencer').productos, riesgoUnidades: agg('proximo_a_vencer').unidades, riesgoValor: agg('proximo_a_vencer').valor,
    })
    .from(t)
    .where(scope(m.drugstore.id));
  return {
    moneda: 'COP' as const,
    perdidaConfirmada: { productos: row!.vencidoProductos, unidades: row!.vencidoUnidades, valor: Number(row!.vencidoValor) },
    valorEnRiesgo: { productos: row!.riesgoProductos, unidades: row!.riesgoUnidades, valor: Number(row!.riesgoValor) },
    anticipacionDias: m.drugstore.expiryAlertDays,
    aviso: 'Cifras descriptivas calculadas con los datos registrados; son hipótesis por validar, no evidencia de reducción de pérdidas.',
  };
}

/** Conteo de productos por estado de clasificación (inventario actual, sin filtro de fechas). */
export async function statusCounts(db: Db, m: Membership) {
  const status = statusExpr(m.drugstore.expiryAlertDays);
  const c = (s: string) => sql<number>`(count(*) FILTER (WHERE ${status} = ${s}))::int`;
  const [row] = await db
    .select({ total: sql<number>`count(*)::int`, vigente: c('vigente'), proximoAVencer: c('proximo_a_vencer'), vencido: c('vencido'), gestionado: c('gestionado') })
    .from(t)
    .where(scope(m.drugstore.id));
  return row!;
}
