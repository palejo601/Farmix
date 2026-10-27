import { and, asc, eq, getTableColumns, isNull, sql } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import { supportFiles, trainingTopics as topics, trainings as tr, workers as w } from '../../db/schema.js';
import { audit } from '../../shared/audit.js';
import { conflict, invalid, isFutureDate, isUniqueViolation, notFound, todaySql } from '../../shared/crud.js';
import type { Membership } from '../drugstores/guard.js';

const iso = (d: Date) => d.toISOString();

// ---------- Trabajadores ----------
const wScope = (id: string) => and(eq(w.drugstoreId, id), isNull(w.deletedAt));
const workerDto = (r: typeof w.$inferSelect) => ({
  id: r.id, workerCode: r.workerCode, fullName: r.fullName, jobTitle: r.jobTitle, createdAt: iso(r.createdAt), updatedAt: iso(r.updatedAt),
});

export async function listWorkers(db: Db, m: Membership, q: { q?: string; limit: number; offset: number }) {
  const where = and(wScope(m.drugstore.id), q.q ? sql`(${w.fullName} ILIKE ${'%' + q.q.replace(/[%_\\]/g, '\\$&') + '%'} OR ${w.workerCode} ILIKE ${'%' + q.q.replace(/[%_\\]/g, '\\$&') + '%'})` : undefined);
  const rows = await db.select().from(w).where(where).orderBy(asc(w.fullName), asc(w.id)).limit(q.limit).offset(q.offset);
  const [c] = await db.select({ n: sql<number>`count(*)::int` }).from(w).where(where);
  return { items: rows.map(workerDto), total: c?.n ?? 0, limit: q.limit, offset: q.offset };
}

async function findWorker(db: Db, m: Membership, id: string) {
  const [row] = await db.select().from(w).where(and(wScope(m.drugstore.id), eq(w.id, id))).limit(1);
  if (!row) throw notFound();
  return row;
}
export const getWorker = async (db: Db, m: Membership, id: string) => workerDto(await findWorker(db, m, id));

export async function createWorker(db: Db, m: Membership, userId: string, input: { workerCode: string; fullName: string; jobTitle?: string | null }, requestId: string) {
  try {
    const [row] = await db.insert(w).values({ drugstoreId: m.drugstore.id, ...input, jobTitle: input.jobTitle ?? null, createdBy: userId, updatedBy: userId }).returning();
    await audit(db, { userId, action: 'staff.worker_create', resource: 'workers', resourceId: row!.id, outcome: 'success', requestId });
    return workerDto(row!);
  } catch (e) {
    if (isUniqueViolation(e)) throw conflict('Ya existe un trabajador con ese código en esta droguería');
    throw e;
  }
}

export async function updateWorker(db: Db, m: Membership, userId: string, id: string, input: { workerCode?: string; fullName?: string; jobTitle?: string | null }, requestId: string) {
  await findWorker(db, m, id);
  try {
    const [row] = await db.update(w).set({ ...input, updatedBy: userId, updatedAt: new Date() }).where(and(wScope(m.drugstore.id), eq(w.id, id))).returning();
    await audit(db, { userId, action: 'staff.worker_update', resource: 'workers', resourceId: id, outcome: 'success', requestId });
    return workerDto(row!);
  } catch (e) {
    if (isUniqueViolation(e)) throw conflict('Ya existe un trabajador con ese código en esta droguería');
    throw e;
  }
}

/** Borrado lógico del trabajador y de sus capacitaciones. */
export async function removeWorker(db: Db, m: Membership, userId: string, id: string, requestId: string) {
  await findWorker(db, m, id);
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.update(tr).set({ deletedAt: now, updatedBy: userId, updatedAt: now }).where(and(eq(tr.drugstoreId, m.drugstore.id), eq(tr.workerId, id), isNull(tr.deletedAt)));
    await tx.update(w).set({ deletedAt: now, updatedBy: userId, updatedAt: now }).where(and(wScope(m.drugstore.id), eq(w.id, id)));
  });
  await audit(db, { userId, action: 'staff.worker_delete', resource: 'workers', resourceId: id, outcome: 'success', requestId });
}

// ---------- Temas ----------
const tScope = (id: string) => and(eq(topics.drugstoreId, id), isNull(topics.deletedAt));
const topicDto = (r: typeof topics.$inferSelect) => ({
  id: r.id, topicName: r.topicName, validityMonths: r.validityMonths, description: r.description, createdAt: iso(r.createdAt),
});

export async function listTopics(db: Db, m: Membership) {
  const rows = await db.select().from(topics).where(tScope(m.drugstore.id)).orderBy(asc(topics.topicName));
  return { items: rows.map(topicDto) };
}

export async function createTopic(db: Db, m: Membership, userId: string, input: { topicName: string; validityMonths?: number; description?: string | null }, requestId: string) {
  try {
    const [row] = await db.insert(topics).values({ drugstoreId: m.drugstore.id, ...input, description: input.description ?? null, createdBy: userId, updatedBy: userId }).returning();
    await audit(db, { userId, action: 'staff.topic_create', resource: 'training_topics', resourceId: row!.id, outcome: 'success', requestId });
    return topicDto(row!);
  } catch (e) {
    if (isUniqueViolation(e)) throw conflict('Ya existe un tema con ese nombre en esta droguería');
    throw e;
  }
}

// ---------- Capacitaciones ----------
/** Única fuente del estado: sin fecha de realización = pendiente; vigencia pasada = vencida; si no, vigente. */
const statusExpr = sql<'vigente' | 'pendiente' | 'vencida'>`CASE
  WHEN ${tr.trainedOn} IS NULL THEN 'pendiente'
  WHEN ${tr.validUntil} < ${todaySql} THEN 'vencida'
  ELSE 'vigente' END`;

const trScope = (id: string) => and(eq(tr.drugstoreId, id), isNull(tr.deletedAt));
const selectTrainings = (db: Db) =>
  db
    .select({ ...getTableColumns(tr), workerName: w.fullName, topicName: topics.topicName, status: statusExpr })
    .from(tr)
    .innerJoin(w, and(eq(w.drugstoreId, tr.drugstoreId), eq(w.id, tr.workerId), isNull(w.deletedAt)))
    .innerJoin(topics, and(eq(topics.drugstoreId, tr.drugstoreId), eq(topics.id, tr.topicId), isNull(topics.deletedAt)));

type TrRow = Awaited<ReturnType<typeof selectTrainings>>[number];
const trainingDto = (r: TrRow) => ({
  id: r.id, workerId: r.workerId, workerName: r.workerName, topicId: r.topicId, topicName: r.topicName,
  trainedOn: r.trainedOn, validUntil: r.validUntil, supportFileId: r.supportFileId,
  status: r.status, createdAt: iso(r.createdAt), updatedAt: iso(r.updatedAt),
});

export async function listTrainings(db: Db, m: Membership, q: { workerId?: string; topicId?: string; status?: string; limit: number; offset: number }) {
  const where = and(
    trScope(m.drugstore.id),
    q.workerId ? eq(tr.workerId, q.workerId) : undefined,
    q.topicId ? eq(tr.topicId, q.topicId) : undefined,
    q.status ? sql`${statusExpr} = ${q.status}` : undefined,
  );
  const rows = await selectTrainings(db).where(where).orderBy(asc(w.fullName), asc(topics.topicName), asc(tr.id)).limit(q.limit).offset(q.offset);
  const [c] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(tr)
    .innerJoin(w, and(eq(w.drugstoreId, tr.drugstoreId), eq(w.id, tr.workerId), isNull(w.deletedAt)))
    .innerJoin(topics, and(eq(topics.drugstoreId, tr.drugstoreId), eq(topics.id, tr.topicId), isNull(topics.deletedAt)))
    .where(where);
  return { items: rows.map(trainingDto), total: c?.n ?? 0, limit: q.limit, offset: q.offset };
}

async function findTraining(db: Db, m: Membership, id: string) {
  const [row] = await selectTrainings(db).where(and(trScope(m.drugstore.id), eq(tr.id, id))).limit(1);
  if (!row) throw notFound();
  return row;
}

async function checkSupportFile(db: Db, m: Membership, fileId: string | null | undefined) {
  if (!fileId) return;
  const [f] = await db
    .select({ id: supportFiles.id })
    .from(supportFiles)
    .where(and(eq(supportFiles.drugstoreId, m.drugstore.id), eq(supportFiles.id, fileId), isNull(supportFiles.deletedAt)))
    .limit(1);
  if (!f) throw notFound();
}

async function checkDates(db: Db, trainedOn: string | null, validUntil: string | null) {
  if (trainedOn && (await isFutureDate(db, trainedOn))) throw invalid('La fecha de la capacitación no puede ser futura');
  if (!trainedOn && validUntil) throw invalid('No puede haber vigencia sin fecha de realización');
  if (trainedOn && !validUntil) throw invalid('Una capacitación realizada exige fecha de vigencia');
  if (trainedOn && validUntil && validUntil < trainedOn) throw invalid('La vigencia no puede ser anterior a la fecha de realización');
}

const addMonths = async (db: Db, date: string, months: number) => {
  const r = await db.execute(sql`SELECT to_char(${date}::date + make_interval(months => ${months}::int), 'YYYY-MM-DD') AS d`);
  return (r.rows[0] as { d: string }).d;
};

export async function createTraining(
  db: Db, m: Membership, userId: string,
  input: { workerId: string; topicId: string; trainedOn?: string | null; validUntil?: string | null; supportFileId?: string | null },
  requestId: string,
) {
  const [worker] = await db.select({ id: w.id }).from(w).where(and(wScope(m.drugstore.id), eq(w.id, input.workerId))).limit(1);
  const [topic] = await db.select().from(topics).where(and(tScope(m.drugstore.id), eq(topics.id, input.topicId))).limit(1);
  if (!worker || !topic) throw notFound();
  const trainedOn = input.trainedOn ?? null;
  const validUntil = trainedOn ? (input.validUntil ?? (await addMonths(db, trainedOn, topic.validityMonths))) : (input.validUntil ?? null);
  await checkDates(db, trainedOn, validUntil);
  await checkSupportFile(db, m, input.supportFileId);
  try {
    const [row] = await db
      .insert(tr)
      .values({ drugstoreId: m.drugstore.id, workerId: input.workerId, topicId: input.topicId, trainedOn, validUntil, supportFileId: input.supportFileId ?? null, createdBy: userId, updatedBy: userId })
      .returning({ id: tr.id });
    await audit(db, { userId, action: 'staff.training_create', resource: 'trainings', resourceId: row!.id, outcome: 'success', requestId });
    return trainingDto(await findTraining(db, m, row!.id));
  } catch (e) {
    if (isUniqueViolation(e)) throw conflict('Ya existe un registro de capacitación para ese trabajador y tema');
    throw e;
  }
}

export const getTraining = async (db: Db, m: Membership, id: string) => trainingDto(await findTraining(db, m, id));

export async function updateTraining(db: Db, m: Membership, userId: string, id: string, input: { trainedOn?: string | null; validUntil?: string | null; supportFileId?: string | null }, requestId: string) {
  const cur = await findTraining(db, m, id);
  const trainedOn = input.trainedOn !== undefined ? input.trainedOn : cur.trainedOn;
  let validUntil = input.validUntil !== undefined ? input.validUntil : cur.validUntil;
  if (trainedOn === null) validUntil = null;
  else if (input.trainedOn && input.validUntil === undefined) {
    const [topic] = await db.select().from(topics).where(eq(topics.id, cur.topicId)).limit(1);
    validUntil = await addMonths(db, trainedOn, topic!.validityMonths);
  }
  await checkDates(db, trainedOn, validUntil);
  await checkSupportFile(db, m, input.supportFileId);
  const support = input.supportFileId !== undefined ? { supportFileId: input.supportFileId } : {};
  await db.update(tr).set({ trainedOn, validUntil, ...support, updatedBy: userId, updatedAt: new Date() }).where(and(trScope(m.drugstore.id), eq(tr.id, id)));
  await audit(db, { userId, action: 'staff.training_update', resource: 'trainings', resourceId: id, outcome: 'success', requestId });
  return trainingDto(await findTraining(db, m, id));
}

export async function removeTraining(db: Db, m: Membership, userId: string, id: string, requestId: string) {
  await findTraining(db, m, id);
  await db.update(tr).set({ deletedAt: new Date(), updatedBy: userId, updatedAt: new Date() }).where(and(trScope(m.drugstore.id), eq(tr.id, id)));
  await audit(db, { userId, action: 'staff.training_delete', resource: 'trainings', resourceId: id, outcome: 'success', requestId });
}

export async function trainingCounts(db: Db, m: Membership) {
  const c = (st: string) => sql<number>`(count(*) FILTER (WHERE ${statusExpr} = ${st}))::int`;
  const [row] = await db
    .select({ total: sql<number>`count(*)::int`, vigente: c('vigente'), pendiente: c('pendiente'), vencida: c('vencida') })
    .from(tr)
    .innerJoin(w, and(eq(w.drugstoreId, tr.drugstoreId), eq(w.id, tr.workerId), isNull(w.deletedAt)))
    .innerJoin(topics, and(eq(topics.drugstoreId, tr.drugstoreId), eq(topics.id, tr.topicId), isNull(topics.deletedAt)))
    .where(trScope(m.drugstore.id));
  const [wc] = await db.select({ n: sql<number>`count(*)::int` }).from(w).where(wScope(m.drugstore.id));
  return { trabajadores: wc?.n ?? 0, capacitaciones: row! };
}
