import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import { diagnoses as d, diagnosisAnswers as ans, diagnosisAreaScores as scores, instrumentItems as items, instrumentVersions as versions } from '../../db/schema.js';
import { audit } from '../../shared/audit.js';
import { invalid, isFutureDate, notFound } from '../../shared/crud.js';
import type { Membership } from '../drugstores/guard.js';
import { AREA_LABELS, AREAS, type Area } from './schema.js';

const AVISO =
  'Autoevaluación orientativa. No es un concepto de cumplimiento ni reemplaza la visita de la Secretaría de Salud o de la autoridad ambiental. ' +
  'Criterios pendientes de validación por un profesional farmacéutico y un asesor jurídico.';
const ESCALA: Record<string, string> = {
  compliance_ratio: 'Cada ítem se responde «Cumple», «No cumple» o «No aplica». Madurez por área de 1 a 5 según la proporción de cumplimiento; los requisitos obligatorios no se compensan con promedios.',
  likert_avg: '1 = no se hace; 5 = práctica consolidada y documentada (instrumento anterior).',
};
const scope = (id: string) => and(eq(d.drugstoreId, id), isNull(d.deletedAt));
const round1 = (n: number) => Math.round(n * 10) / 10;

type Version = typeof versions.$inferSelect;
type Writer = Pick<Db, 'select' | 'delete' | 'insert'>;
type AnswerIn = { itemId: string; response?: 'si' | 'no' | 'na' | null; score?: number };

async function currentVersion(db: Db): Promise<Version> {
  const [v] = await db.select().from(versions).where(eq(versions.isCurrent, true)).limit(1);
  if (!v) throw new Error('No hay un instrumento vigente');
  return v;
}

export async function getCurrentInstrument(db: Db) {
  const v = await currentVersion(db);
  const rows = await db.select().from(items).where(eq(items.versionId, v.id)).orderBy(items.position);
  const areaOrder = [...new Set(rows.filter((r) => r.itemKind === 'madurez').map((r) => r.area as Area))];
  return {
    instrument: {
      id: v.id, versionNumber: v.versionNumber, title: v.title, description: v.description,
      scoring: v.scoring as 'likert_avg' | 'compliance_ratio', escala: ESCALA[v.scoring] ?? '',
      obligatorios: rows.filter((r) => r.itemKind === 'obligatorio').map((r) => ({ id: r.id, code: r.itemCode, prompt: r.promptText, position: r.position, legalBasis: r.legalBasis })),
      areas: areaOrder.map((area) => ({
        area, label: AREA_LABELS[area],
        items: rows.filter((r) => r.itemKind === 'madurez' && r.area === area).map((r) => ({ id: r.id, code: r.itemCode, prompt: r.promptText, position: r.position })),
      })),
      aviso: AVISO,
    },
  };
}

/** Recalcula el puntaje de madurez (1–5) por área a partir de las respuestas guardadas. */
async function recomputeScores(tx: Writer, diagnosisId: string, version: Version) {
  await tx.delete(scores).where(eq(scores.diagnosisId, diagnosisId));
  let rows: { area: string; score: number; n: number }[] = [];
  if (version.scoring === 'compliance_ratio') {
    // Regla del prototipo: puntaje = máx(1, redondeo(cumple / aplicables × 4) + 1); «No aplica» no cuenta.
    const agg = await tx
      .select({
        area: items.area,
        si: sql<number>`(count(*) FILTER (WHERE ${ans.response} = 'si'))::int`,
        no: sql<number>`(count(*) FILTER (WHERE ${ans.response} = 'no'))::int`,
      })
      .from(ans)
      .innerJoin(items, and(eq(items.versionId, ans.versionId), eq(items.id, ans.itemId)))
      .where(and(eq(ans.diagnosisId, diagnosisId), eq(items.itemKind, 'madurez')))
      .groupBy(items.area);
    rows = agg.filter((a) => a.si + a.no > 0).map((a) => ({ area: a.area, score: Math.max(1, Math.round((a.si / (a.si + a.no)) * 4) + 1), n: a.si + a.no }));
  } else {
    const agg = await tx
      .select({ area: items.area, avg: sql<string>`avg(${ans.score})`, n: sql<number>`count(*)::int` })
      .from(ans)
      .innerJoin(items, and(eq(items.versionId, ans.versionId), eq(items.id, ans.itemId)))
      .where(eq(ans.diagnosisId, diagnosisId))
      .groupBy(items.area);
    rows = agg.map((a) => ({ area: a.area, score: round1(Number(a.avg)), n: a.n }));
  }
  if (rows.length) {
    await tx.insert(scores).values(rows.map((r) => ({ diagnosisId, area: r.area, areaScore: r.score.toFixed(1), answeredCount: r.n })));
  }
}

async function applyAnswers(tx: Writer, db: Db, diagnosisId: string, version: Version, userId: string, list: AnswerIn[]) {
  if (list.length) {
    const valid = await db.select({ id: items.id }).from(items).where(and(eq(items.versionId, version.id), inArray(items.id, list.map((a) => a.itemId))));
    if (valid.length !== list.length) throw invalid('Hay ítems que no pertenecen a la versión del instrumento de este diagnóstico');
    const ratio = version.scoring === 'compliance_ratio';
    for (const a of list) {
      if (ratio && a.score !== undefined) throw invalid('Este instrumento se responde con «response» (si, no, na), no con «score»');
      if (!ratio && a.response !== undefined) throw invalid('Este instrumento se responde con «score» (1 a 5), no con «response»');
    }
    const remove = list.filter((a) => a.response === null).map((a) => a.itemId);
    const upsert = list.filter((a) => a.response !== null);
    if (remove.length) await tx.delete(ans).where(and(eq(ans.diagnosisId, diagnosisId), inArray(ans.itemId, remove)));
    if (upsert.length) {
      await tx
        .insert(ans)
        .values(upsert.map((a) => ({ diagnosisId, versionId: version.id, itemId: a.itemId, score: ratio ? null : (a.score as number), response: ratio ? (a.response as string) : null, createdBy: userId, updatedBy: userId })))
        .onConflictDoUpdate({ target: [ans.diagnosisId, ans.itemId], set: { score: sql`excluded.score`, response: sql`excluded.response`, updatedBy: userId, updatedAt: new Date() } });
    }
  }
  await recomputeScores(tx, diagnosisId, version);
}

async function detail(db: Db, m: Membership, id: string) {
  const [row] = await db
    .select({ d, v: versions })
    .from(d)
    .innerJoin(versions, eq(versions.id, d.instrumentVersionId))
    .where(and(scope(m.drugstore.id), eq(d.id, id)))
    .limit(1);
  if (!row) throw notFound();
  const itemRows = await db.select().from(items).where(eq(items.versionId, row.v.id)).orderBy(items.position);
  const answerRows = await db
    .select({ itemId: ans.itemId, score: ans.score, response: ans.response })
    .from(ans)
    .where(eq(ans.diagnosisId, id));
  const byItem = new Map(answerRows.map((a) => [a.itemId, a]));
  const scoreRows = await db.select().from(scores).where(eq(scores.diagnosisId, id));

  const maturity = itemRows.filter((i) => i.itemKind === 'madurez');
  const areaOrder = [...new Set(maturity.map((i) => i.area as Area))];
  const areaScores = areaOrder.map((area) => {
    const s = scoreRows.find((x) => x.area === area);
    return { area, label: AREA_LABELS[area], score: s ? Number(s.areaScore) : null, answered: s?.answeredCount ?? 0, items: maturity.filter((i) => i.area === area).length };
  });
  const have = areaScores.filter((a) => a.score !== null).map((a) => a.score as number);

  const oblig = itemRows.filter((i) => i.itemKind === 'obligatorio');
  const resp = (i: (typeof oblig)[number]) => byItem.get(i.id)?.response ?? null;
  const noCumple = oblig.filter((i) => resp(i) === 'no').map((i) => ({ itemId: i.id, code: i.itemCode, prompt: i.promptText, legalBasis: i.legalBasis }));
  const noAplica = oblig.filter((i) => resp(i) === 'na').length;
  const obligatorios = {
    total: oblig.length, aplicables: oblig.length - noAplica, cumple: oblig.filter((i) => resp(i) === 'si').length,
    noAplica, sinResponder: oblig.filter((i) => resp(i) === null).length, noCumple,
  };
  const itemById = new Map(itemRows.map((i) => [i.id, i]));
  return {
    id: row.d.id, performedOn: row.d.performedOn, notes: row.d.notes,
    instrument: { id: row.v.id, versionNumber: row.v.versionNumber, title: row.v.title, scoring: row.v.scoring as 'likert_avg' | 'compliance_ratio' },
    answers: answerRows.map((a) => {
      const it = itemById.get(a.itemId)!;
      return { itemId: a.itemId, code: it.itemCode, area: it.area, kind: it.itemKind as 'obligatorio' | 'madurez', response: (a.response as 'si' | 'no' | 'na' | null) ?? null, score: a.score };
    }),
    obligatorios,
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
    items: full.map((x) => ({
      id: x.id, performedOn: x.performedOn, versionNumber: x.instrument.versionNumber, overallScore: x.overallScore,
      answeredCount: x.answeredCount, itemCount: x.itemCount,
      obligatorios: { cumple: x.obligatorios.cumple, aplicables: x.obligatorios.aplicables, pendientes: x.obligatorios.noCumple.length, sinResponder: x.obligatorios.sinResponder },
      areaScores: x.areaScores.map((a) => ({ area: a.area, label: a.label, score: a.score })),
      createdAt: x.createdAt,
    })),
    total: c?.n ?? 0, limit: q.limit, offset: q.offset,
  };
}

export async function create(
  db: Db, m: Membership, userId: string,
  input: { performedOn: string; notes?: string | null; answers: AnswerIn[] },
  requestId: string,
) {
  if (await isFutureDate(db, input.performedOn)) throw invalid('La fecha del diagnóstico no puede ser futura');
  const v = await currentVersion(db);
  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(d)
      .values({ drugstoreId: m.drugstore.id, instrumentVersionId: v.id, performedOn: input.performedOn, notes: input.notes ?? null, createdBy: userId, updatedBy: userId })
      .returning({ id: d.id });
    await applyAnswers(tx as unknown as Db, db, row!.id, v, userId, input.answers);
    return row!.id;
  });
  await audit(db, { userId, action: 'diagnoses.create', resource: 'diagnoses', resourceId: id, outcome: 'success', requestId });
  return detail(db, m, id);
}

export async function update(
  db: Db, m: Membership, userId: string, id: string,
  input: { performedOn?: string; notes?: string | null; answers?: AnswerIn[] },
  requestId: string,
) {
  const cur = await detail(db, m, id);
  if (input.performedOn && (await isFutureDate(db, input.performedOn))) throw invalid('La fecha del diagnóstico no puede ser futura');
  const [version] = await db.select().from(versions).where(eq(versions.id, cur.instrument.id)).limit(1);
  await db.transaction(async (tx) => {
    const patch: Partial<typeof d.$inferInsert> = { updatedBy: userId, updatedAt: new Date() };
    if (input.performedOn !== undefined) patch.performedOn = input.performedOn;
    if (input.notes !== undefined) patch.notes = input.notes;
    await tx.update(d).set(patch).where(and(scope(m.drugstore.id), eq(d.id, id)));
    if (input.answers) await applyAnswers(tx as unknown as Db, db, id, version!, userId, input.answers);
  });
  await audit(db, { userId, action: 'diagnoses.update', resource: 'diagnoses', resourceId: id, outcome: 'success', requestId });
  return detail(db, m, id);
}

export { AREAS };
