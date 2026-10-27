import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { closeCtx, freshDb, get, makeApp, send, type Ctx } from './helpers.js';
import { itIsolates, setupTenant } from './tenant.js';

let ctx: Ctx;
let t: Awaited<ReturnType<typeof setupTenant>>;
let id: Record<string, string>; // código de ítem → id
beforeAll(async () => {
  ctx = await makeApp();
  await freshDb(ctx.pool);
});
beforeEach(async () => {
  await ctx.pool.query('TRUNCATE users, audit_logs CASCADE');
  t = await setupTenant(ctx);
  const inst = (await get(ctx, `${P()}/instrument/current`, t.owner.cookie)).json().instrument;
  id = Object.fromEntries([...inst.obligatorios, ...inst.areas.flatMap((a: { items: unknown[] }) => a.items)].map((i: { code: string; id: string }) => [i.code, i.id]));
});
afterAll(() => closeCtx(ctx));

const P = () => `/drugstores/${t.id}/diagnoses`;
async function today() {
  return (await ctx.pool.query("SELECT to_char((now() AT TIME ZONE 'America/Bogota')::date, 'YYYY-MM-DD') AS d")).rows[0].d as string;
}
type A = [code: string, response: 'si' | 'no' | 'na' | null];
const ans = (list: A[]) => list.map(([c, response]) => ({ itemId: id[c]!, response }));
async function create(list: A[] = [], extra: Record<string, unknown> = {}, cookie = t.owner.cookie) {
  return send(ctx, 'POST', P(), { performedOn: await today(), answers: ans(list), ...extra }, cookie);
}
const area = (d: { areaScores: { area: string; score: number | null }[] }, a: string) => d.areaScores.find((x) => x.area === a)!.score;

describe('instrumento versión 2 (obligatorios + madurez)', () => {
  it('expone 11 requisitos obligatorios y 17 preguntas de madurez en 4 áreas', async () => {
    const inst = (await get(ctx, `${P()}/instrument/current`, t.op.cookie)).json().instrument;
    expect(inst.versionNumber).toBe(2);
    expect(inst.scoring).toBe('compliance_ratio');
    expect(inst.obligatorios).toHaveLength(11);
    expect(inst.areas.map((a: { area: string }) => a.area)).toEqual(['residuos', 'vencimientos_perdidas', 'capacitacion_documentos', 'seguimiento_mejora']);
    expect(inst.areas.map((a: { items: unknown[] }) => a.items.length)).toEqual([4, 5, 4, 4]);
  });

  it('cada requisito obligatorio trae su fundamento normativo; el PGIRASA es el primero', async () => {
    const o = (await get(ctx, `${P()}/instrument/current`, t.op.cookie)).json().instrument.obligatorios;
    expect(o.every((x: { legalBasis: string }) => x.legalBasis.length > 5)).toBe(true);
    expect(o[0]).toMatchObject({ code: 'OB-01' });
    expect(o[0].prompt).toMatch(/PGIRASA/);
    expect(o[0].legalBasis).toMatch(/Res\. 591\/2024/);
    expect(o.find((x: { code: string }) => x.code === 'OB-08').legalBasis).toMatch(/pendiente de verificar/);
  });

  it('se presenta como autoevaluación orientativa, sin afirmar cumplimiento', async () => {
    const inst = (await get(ctx, `${P()}/instrument/current`, t.owner.cookie)).json().instrument;
    expect(inst.aviso).toMatch(/Autoevaluación orientativa/);
    expect(inst.aviso).toMatch(/No es un concepto de cumplimiento/);
    expect(inst.aviso).toMatch(/pendientes de validación/);
    expect(`${inst.aviso} ${inst.description}`).not.toMatch(/certific/i);
  });

  it('solo puede haber una versión vigente (índice único)', async () => {
    await expect(ctx.pool.query("INSERT INTO instrument_versions (version_number, title, is_current) VALUES (3, 'v3', true)")).rejects.toThrow(/one_current/);
    expect((await ctx.pool.query('SELECT count(*)::int AS n FROM instrument_versions WHERE is_current')).rows[0].n).toBe(1);
  });
});

describe('requisitos obligatorios: no se compensan con promedios', () => {
  it('cuenta cumple, no cumple, no aplica y sin responder, y lista los incumplimientos con su norma', async () => {
    const d = (await create([['OB-01', 'no'], ['OB-02', 'si'], ['OB-03', 'si'], ['OB-04', 'na'], ['OB-05', 'no']])).json().item;
    expect(d.obligatorios).toMatchObject({ total: 11, aplicables: 10, cumple: 2, noAplica: 1, sinResponder: 6 });
    expect(d.obligatorios.noCumple.map((x: { code: string }) => x.code)).toEqual(['OB-01', 'OB-05']);
    expect(d.obligatorios.noCumple[0].legalBasis).toMatch(/Decreto 780\/2016/);
  });

  it('una madurez perfecta no oculta un incumplimiento obligatorio', async () => {
    const all = ['RES-1', 'RES-2', 'RES-3', 'RES-4', 'VEN-1', 'VEN-2', 'VEN-3', 'VEN-4', 'VEN-5', 'CAP-1', 'CAP-2', 'CAP-3', 'CAP-4', 'MEJ-1', 'MEJ-2', 'MEJ-3', 'MEJ-4'];
    const d = (await create([['OB-01', 'no'], ...all.map((c): A => [c, 'si'])])).json().item;
    expect(d.overallScore).toBe(5);
    expect(d.obligatorios.noCumple).toHaveLength(1);
  });

  it('las respuestas de obligatorios no alteran los puntajes de madurez', async () => {
    const d = (await create([['OB-01', 'si'], ['OB-02', 'no']])).json().item;
    expect(d.overallScore).toBeNull();
    expect(d.areaScores.every((a: { score: number | null }) => a.score === null)).toBe(true);
  });
});

describe('madurez por área (1 a 5): máx(1, redondeo(cumple/aplicables × 4) + 1)', () => {
  it.each([
    ['4 de 4 cumplen', [['RES-1', 'si'], ['RES-2', 'si'], ['RES-3', 'si'], ['RES-4', 'si']], 5],
    ['3 de 4 cumplen', [['RES-1', 'si'], ['RES-2', 'si'], ['RES-3', 'si'], ['RES-4', 'no']], 4],
    ['2 de 4 cumplen', [['RES-1', 'si'], ['RES-2', 'si'], ['RES-3', 'no'], ['RES-4', 'no']], 3],
    ['1 de 4 cumple', [['RES-1', 'si'], ['RES-2', 'no'], ['RES-3', 'no'], ['RES-4', 'no']], 2],
    ['ninguno cumple (mínimo 1)', [['RES-1', 'no'], ['RES-2', 'no']], 1],
    ['«no aplica» no cuenta: 1 de 1', [['RES-1', 'si'], ['RES-2', 'na'], ['RES-3', 'na']], 5],
  ] as [string, A[], number][])('%s → %i', async (_n, list, expected) => {
    const d = (await create(list)).json().item;
    expect(area(d, 'residuos')).toBe(expected);
    expect(d.overallScore).toBe(expected);
  });

  it('un área con todo «no aplica» o sin respuestas queda sin puntaje (no se inventa)', async () => {
    const d = (await create([['RES-1', 'na'], ['VEN-1', 'si']])).json().item;
    expect(area(d, 'residuos')).toBeNull();
    expect(area(d, 'vencimientos_perdidas')).toBe(5);
    expect(d.overallScore).toBe(5);
  });

  it('el promedio global usa solo las áreas con puntaje y se redondea a un decimal', async () => {
    const d = (await create([['RES-1', 'si'], ['RES-2', 'si'], ['RES-3', 'si'], ['RES-4', 'no'], ['VEN-1', 'si'], ['VEN-2', 'no'], ['VEN-3', 'no'], ['CAP-1', 'no']])).json().item;
    expect(area(d, 'residuos')).toBe(4);
    expect(area(d, 'vencimientos_perdidas')).toBe(2); // 1 de 3 → round(1.33)=1 → 2
    expect(area(d, 'capacitacion_documentos')).toBe(1);
    expect(d.overallScore).toBe(2.3); // (4 + 2 + 1) / 3
  });
});

describe('validación y edición', () => {
  it.each([
    ['respuesta desconocida', { itemId: 'RES-1', response: 'quizas' }],
    ['puntaje numérico en el instrumento v2', { itemId: 'RES-1', score: 3 }],
    ['response y score juntos', { itemId: 'RES-1', response: 'si', score: 3 }],
    ['sin response ni score', { itemId: 'RES-1' }],
  ])('rechaza: %s', async (_n, a) => {
    const res = await send(ctx, 'POST', P(), { performedOn: await today(), answers: [{ ...a, itemId: id[a.itemId] }] }, t.owner.cookie);
    expect(res.statusCode).toBe(400);
  });

  it('rechaza ítems repetidos, ítems inexistentes y fechas futuras', async () => {
    expect((await create([['RES-1', 'si'], ['RES-1', 'no']])).statusCode).toBe(400);
    const bad = await send(ctx, 'POST', P(), { performedOn: await today(), answers: [{ itemId: '77777777-7777-4777-8777-777777777777', response: 'si' }] }, t.owner.cookie);
    expect(bad.statusCode).toBe(400);
    const future = (await ctx.pool.query("SELECT to_char((now() AT TIME ZONE 'America/Bogota')::date + 1, 'YYYY-MM-DD') AS d")).rows[0].d;
    expect((await create([], { performedOn: future })).statusCode).toBe(400);
  });

  it('un fallo en las respuestas no deja un diagnóstico a medias', async () => {
    await send(ctx, 'POST', P(), { performedOn: await today(), answers: [{ itemId: '77777777-7777-4777-8777-777777777777', response: 'si' }] }, t.owner.cookie);
    expect((await ctx.pool.query('SELECT count(*)::int AS n FROM diagnoses')).rows[0].n).toBe(0);
  });

  it('al editar: cambia, agrega y borra respuestas (null) y recalcula', async () => {
    const d0 = (await create([['RES-1', 'no'], ['RES-2', 'no']])).json().item;
    expect(area(d0, 'residuos')).toBe(1);
    const up = await send(ctx, 'PATCH', `${P()}/${d0.id}`, { answers: ans([['RES-1', 'si'], ['RES-3', 'si'], ['OB-01', 'si']]), notes: 'Revisado' }, t.op.cookie);
    const d = up.json().item;
    expect(d.answeredCount).toBe(4);
    expect(area(d, 'residuos')).toBe(4); // 2 de 3 → round(2.67)=3 → 4
    expect(d.notes).toBe('Revisado');
    const del = await send(ctx, 'PATCH', `${P()}/${d0.id}`, { answers: ans([['RES-1', null], ['RES-2', null], ['RES-3', null]]) }, t.op.cookie);
    expect(del.json().item.answeredCount).toBe(1);
    expect(area(del.json().item, 'residuos')).toBeNull();
    expect((await send(ctx, 'PATCH', `${P()}/${d0.id}`, {}, t.owner.cookie)).statusCode).toBe(400);
  });

  it('la base de datos exige exactamente un valor por respuesta y áreas válidas', async () => {
    const d = (await create([['RES-1', 'si']])).json().item;
    await expect(ctx.pool.query('UPDATE diagnosis_answers SET score = 3 WHERE diagnosis_id=$1', [d.id])).rejects.toThrow(/one_value/);
    await expect(ctx.pool.query("INSERT INTO diagnosis_area_scores (diagnosis_id, area, area_score, answered_count) VALUES ($1, 'otra', 3, 1)", [d.id])).rejects.toThrow(/area/);
  });
});

describe('línea base, seguimiento y lectura de diagnósticos anteriores', () => {
  it('el listado resume obligatorios y madurez de cada diagnóstico', async () => {
    await create([['OB-01', 'no'], ['OB-02', 'si'], ['RES-1', 'si']]);
    await create([['OB-01', 'si'], ['OB-02', 'si'], ['RES-1', 'si'], ['RES-2', 'no']]);
    const res = (await get(ctx, P(), t.op.cookie)).json();
    expect(res.total).toBe(2);
    const sorted = [...res.items].sort((a: { answeredCount: number }, b: { answeredCount: number }) => a.answeredCount - b.answeredCount);
    expect(sorted[0].obligatorios).toMatchObject({ cumple: 1, aplicables: 11, pendientes: 1, sinResponder: 9 });
    expect(sorted[1].obligatorios).toMatchObject({ cumple: 2, pendientes: 0 });
    expect(sorted[1].areaScores.find((a: { area: string }) => a.area === 'residuos').score).toBe(3);
  });

  it('un diagnóstico conserva la versión del instrumento con que se hizo', async () => {
    const d = (await create([['RES-1', 'si']])).json().item;
    expect(d.instrument).toMatchObject({ versionNumber: 2, scoring: 'compliance_ratio' });
  });

  it('los diagnósticos hechos con el instrumento anterior (v1, puntaje 1–5) siguen siendo legibles', async () => {
    const v1 = (await ctx.pool.query('SELECT id FROM instrument_versions WHERE version_number = 1')).rows[0].id;
    const item = (await ctx.pool.query("SELECT id FROM instrument_items WHERE version_id=$1 AND item_code='RES-01'", [v1])).rows[0].id;
    const dg = (await ctx.pool.query("INSERT INTO diagnoses (drugstore_id, instrument_version_id, performed_on) VALUES ($1,$2,'2026-01-10') RETURNING id", [t.id, v1])).rows[0].id;
    await ctx.pool.query('INSERT INTO diagnosis_answers (diagnosis_id, version_id, item_id, score) VALUES ($1,$2,$3,4)', [dg, v1, item]);
    await ctx.pool.query("INSERT INTO diagnosis_area_scores (diagnosis_id, area, area_score, answered_count) VALUES ($1,'residuos',4.0,1)", [dg]);
    const d = (await get(ctx, `${P()}/${dg}`, t.owner.cookie)).json().item;
    expect(d.instrument).toMatchObject({ versionNumber: 1, scoring: 'likert_avg' });
    expect(d.answers[0]).toMatchObject({ code: 'RES-01', score: 4, response: null });
    expect(d.overallScore).toBe(4);
    expect(d.obligatorios.total).toBe(0);
    // y no se puede responder con la forma del instrumento vigente
    const bad = await send(ctx, 'PATCH', `${P()}/${dg}`, { answers: [{ itemId: item, response: 'si' }] }, t.owner.cookie);
    expect(bad.statusCode).toBe(400);
  });

  it('el operador puede diagnosticar y queda auditado con created_by', async () => {
    const dg = (await create([], {}, t.op.cookie)).json().item.id;
    expect((await ctx.pool.query('SELECT created_by FROM diagnoses WHERE id=$1', [dg])).rows[0].created_by).toBe(t.op.id);
    expect((await ctx.pool.query('SELECT action FROM audit_logs WHERE resource_id=$1', [dg])).rows).toEqual([{ action: 'diagnoses.create' }]);
  });
});

describe('mejoras que nacen de un incumplimiento', () => {
  it('se puede crear una mejora ligada al requisito incumplido, con acción, responsable y fecha por definir', async () => {
    const res = await send(ctx, 'POST', `/drugstores/${t.id}/improvement-actions`, { finding: 'Incumplimiento: PGIRASA sin elaborar', originItemId: id['OB-01'] }, t.op.cookie);
    expect(res.statusCode).toBe(201);
    expect(res.json().item).toMatchObject({ correctiveAction: null, responsible: null, dueOn: null, state: 'pendiente', originItemId: id['OB-01'], overdue: false });
    const edit = await send(ctx, 'PATCH', `${P().replace('diagnoses', 'improvement-actions')}/${res.json().item.id}`, { correctiveAction: 'Elaborar el PGIRASA', responsible: 'Regente', dueOn: '2030-01-01' }, t.op.cookie);
    expect(edit.json().item).toMatchObject({ correctiveAction: 'Elaborar el PGIRASA', responsible: 'Regente' });
  });
});

describe('aislamiento entre droguerías', () => {
  const some = '88888888-8888-4888-8888-888888888888';
  itIsolates(() => ctx, () => t, (d) => [
    ['GET', `/drugstores/${d}/diagnoses/instrument/current`],
    ['GET', `/drugstores/${d}/diagnoses`],
    ['POST', `/drugstores/${d}/diagnoses`, { performedOn: '2025-01-01', answers: [] }],
    ['GET', `/drugstores/${d}/diagnoses/${some}`],
    ['PATCH', `/drugstores/${d}/diagnoses/${some}`, { notes: 'x' }],
  ]);

  it('un miembro de B no alcanza diagnósticos de A', async () => {
    const dg = (await create([['RES-1', 'si']])).json().item.id;
    const o = t.other.owner.cookie;
    expect((await get(ctx, `/drugstores/${t.other.id}/diagnoses/${dg}`, o)).statusCode).toBe(404);
    expect((await send(ctx, 'PATCH', `/drugstores/${t.other.id}/diagnoses/${dg}`, { notes: 'Intruso' }, o)).statusCode).toBe(404);
    expect((await get(ctx, `/drugstores/${t.other.id}/diagnoses`, o)).json().total).toBe(0);
  });
});
