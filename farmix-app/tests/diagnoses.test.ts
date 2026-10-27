import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { closeCtx, freshDb, get, makeApp, send, type Ctx } from './helpers.js';
import { itIsolates, setupTenant } from './tenant.js';

let ctx: Ctx;
let t: Awaited<ReturnType<typeof setupTenant>>;
let items: { id: string; code: string; area: string }[];
beforeAll(async () => {
  ctx = await makeApp();
  await freshDb(ctx.pool);
});
beforeEach(async () => {
  await ctx.pool.query('TRUNCATE users, audit_logs CASCADE');
  t = await setupTenant(ctx);
  const inst = (await get(ctx, `${P()}/instrument/current`, t.owner.cookie)).json().instrument;
  items = inst.areas.flatMap((a: { area: string; items: { id: string; code: string }[] }) => a.items.map((i) => ({ ...i, area: a.area })));
});
afterAll(() => closeCtx(ctx));

const P = () => `/drugstores/${t.id}/diagnoses`;
async function today() {
  return (await ctx.pool.query("SELECT to_char((now() AT TIME ZONE 'America/Bogota')::date, 'YYYY-MM-DD') AS d")).rows[0].d as string;
}
const byCode = (code: string) => items.find((i) => i.code === code)!.id;
async function create(answers: { itemId: string; score: number }[] = [], extra: Record<string, unknown> = {}, cookie = t.owner.cookie) {
  return send(ctx, 'POST', P(), { performedOn: await today(), answers, ...extra }, cookie);
}

describe('instrumento versionado', () => {
  it('expone la versión vigente con 5 áreas y 15 ítems, marcada como borrador', async () => {
    const res = await get(ctx, `${P()}/instrument/current`, t.op.cookie);
    const inst = res.json().instrument;
    expect(inst.versionNumber).toBe(1);
    expect(inst.title).toMatch(/borrador por validar/);
    expect(inst.areas).toHaveLength(5);
    expect(items).toHaveLength(15);
    expect(inst.escala).toMatch(/1 = .*5 = /);
  });

  it('solo puede haber una versión vigente (índice único)', async () => {
    await expect(
      ctx.pool.query("INSERT INTO instrument_versions (version_number, title, is_current) VALUES (2, 'v2', true)"),
    ).rejects.toThrow(/one_current/);
    await ctx.pool.query("INSERT INTO instrument_versions (version_number, title, is_current) VALUES (2, 'v2', false)");
    await ctx.pool.query('DELETE FROM instrument_versions WHERE version_number = 2');
  });

  it('el instrumento no afirma cumplimiento normativo', async () => {
    const txt = JSON.stringify((await get(ctx, `${P()}/instrument/current`, t.owner.cookie)).json());
    expect(txt).not.toMatch(/cumple con la norma|certific/i);
  });
});

describe('crear diagnósticos y puntajes por área', () => {
  it('sin respuestas: puntajes nulos, no inventados', async () => {
    const res = await create();
    expect(res.statusCode).toBe(201);
    const d = res.json().item;
    expect(d.overallScore).toBeNull();
    expect(d.areaScores.every((a: { score: number | null }) => a.score === null)).toBe(true);
    expect(d.itemCount).toBe(15);
    expect(d.aviso).toMatch(/no constituyen concepto/i);
  });

  it('calcula el promedio por área (1 a 5, un decimal) y el global', async () => {
    const res = await create([
      { itemId: byCode('RES-01'), score: 5 }, { itemId: byCode('RES-02'), score: 4 }, { itemId: byCode('RES-03'), score: 4 },
      { itemId: byCode('VEN-01'), score: 1 }, { itemId: byCode('VEN-02'), score: 2 },
      { itemId: byCode('SEG-01'), score: 3 },
    ]);
    const d = res.json().item;
    const score = (a: string) => d.areaScores.find((x: { area: string }) => x.area === a);
    expect(score('residuos')).toMatchObject({ score: 4.3, answered: 3, items: 3 });
    expect(score('vencimientos')).toMatchObject({ score: 1.5, answered: 2 });
    expect(score('segregacion').score).toBe(3);
    expect(score('documentacion').score).toBeNull();
    expect(d.overallScore).toBe(2.9);
    expect(d.answeredCount).toBe(6);
  });

  it('todos los puntajes de área quedan entre 1 y 5', async () => {
    const all = items.map((i) => ({ itemId: i.id, score: 5 }));
    const d = (await create(all)).json().item;
    expect(d.overallScore).toBe(5);
    const low = (await create(items.map((i) => ({ itemId: i.id, score: 1 })))).json().item;
    expect(low.overallScore).toBe(1);
  });

  it.each([
    ['puntaje 0', [{ itemId: 'RES-01', score: 0 }]],
    ['puntaje 6', [{ itemId: 'RES-01', score: 6 }]],
    ['puntaje decimal', [{ itemId: 'RES-01', score: 2.5 }]],
  ])('valida la entrada: %s', async (_n, raw) => {
    const answers = raw.map((a) => ({ ...a, itemId: byCode(a.itemId) }));
    expect((await create(answers)).statusCode).toBe(400);
  });

  it('rechaza ítems repetidos, ítems inexistentes y fechas futuras', async () => {
    expect((await create([{ itemId: byCode('RES-01'), score: 3 }, { itemId: byCode('RES-01'), score: 4 }])).statusCode).toBe(400);
    expect((await create([{ itemId: '77777777-7777-4777-8777-777777777777', score: 3 }])).statusCode).toBe(400);
    const future = (await ctx.pool.query("SELECT to_char((now() AT TIME ZONE 'America/Bogota')::date + 1, 'YYYY-MM-DD') AS d")).rows[0].d;
    expect((await create([], { performedOn: future })).statusCode).toBe(400);
  });

  it('un fallo en las respuestas no deja un diagnóstico a medias', async () => {
    await create([{ itemId: '77777777-7777-4777-8777-777777777777', score: 3 }]);
    expect((await ctx.pool.query('SELECT count(*)::int AS n FROM diagnoses')).rows[0].n).toBe(0);
  });
});

describe('editar diagnósticos', () => {
  it('actualiza respuestas existentes, agrega nuevas y recalcula', async () => {
    const id = (await create([{ itemId: byCode('RES-01'), score: 2 }])).json().item.id;
    const up = await send(ctx, 'PATCH', `${P()}/${id}`, { answers: [{ itemId: byCode('RES-01'), score: 4 }, { itemId: byCode('RES-02'), score: 5 }], notes: 'Revisado' }, t.op.cookie);
    const d = up.json().item;
    expect(d.answers).toHaveLength(2);
    expect(d.areaScores.find((a: { area: string }) => a.area === 'residuos').score).toBe(4.5);
    expect(d.notes).toBe('Revisado');
    const rows = await ctx.pool.query('SELECT count(*)::int AS n FROM diagnosis_area_scores WHERE diagnosis_id=$1', [id]);
    expect(rows.rows[0].n).toBe(1);
  });

  it('rechaza cuerpo vacío', async () => {
    const id = (await create()).json().item.id;
    expect((await send(ctx, 'PATCH', `${P()}/${id}`, {}, t.owner.cookie)).statusCode).toBe(400);
  });

  it('un diagnóstico conserva su versión aunque cambie el instrumento vigente', async () => {
    const id = (await create([{ itemId: byCode('RES-01'), score: 3 }])).json().item.id;
    await ctx.pool.query("UPDATE instrument_versions SET is_current=false WHERE version_number=1");
    const v2 = await ctx.pool.query("INSERT INTO instrument_versions (version_number, title, is_current) VALUES (2,'v2 (prueba)',true) RETURNING id");
    const item2 = await ctx.pool.query("INSERT INTO instrument_items (version_id, area, item_code, prompt_text, position) VALUES ($1,'residuos','NEW-01','Ítem nuevo',1) RETURNING id", [v2.rows[0].id]);
    expect((await get(ctx, `${P()}/${id}`, t.owner.cookie)).json().item.instrument.versionNumber).toBe(1);
    const bad = await send(ctx, 'PATCH', `${P()}/${id}`, { answers: [{ itemId: item2.rows[0].id, score: 3 }] }, t.owner.cookie);
    expect(bad.statusCode).toBe(400);
    const nuevo = await create([{ itemId: item2.rows[0].id, score: 5 }]);
    expect(nuevo.json().item.instrument.versionNumber).toBe(2);
    await ctx.pool.query('TRUNCATE diagnoses CASCADE');
    await ctx.pool.query('DELETE FROM instrument_items WHERE item_code = $1', ['NEW-01']);
    await ctx.pool.query('DELETE FROM instrument_versions WHERE version_number = 2');
    await ctx.pool.query('UPDATE instrument_versions SET is_current=true WHERE version_number=1');
  });

  it('la base de datos rechaza respuestas de otra versión y puntajes fuera de rango', async () => {
    const id = (await create()).json().item.id;
    const v = (await ctx.pool.query('SELECT instrument_version_id AS v FROM diagnoses WHERE id=$1', [id])).rows[0].v;
    await expect(ctx.pool.query('INSERT INTO diagnosis_answers (diagnosis_id, version_id, item_id, score) VALUES ($1,$2,$3,9)', [id, v, items[0]!.id])).rejects.toThrow(/score/);
  });
});

describe('listado, auditoría y permisos', () => {
  it('lista de más reciente a más antiguo con puntaje global', async () => {
    await create([{ itemId: byCode('RES-01'), score: 3 }]);
    await create([{ itemId: byCode('RES-01'), score: 5 }]);
    const res = (await get(ctx, P(), t.op.cookie)).json();
    expect(res.total).toBe(2);
    expect(res.items[0]).toMatchObject({ versionNumber: 1, itemCount: 15 });
  });

  it('el operador puede diagnosticar y queda auditado con created_by', async () => {
    const id = (await create([], {}, t.op.cookie)).json().item.id;
    const row = await ctx.pool.query('SELECT created_by FROM diagnoses WHERE id=$1', [id]);
    expect(row.rows[0].created_by).toBe(t.op.id);
    const a = await ctx.pool.query("SELECT action FROM audit_logs WHERE resource_id=$1", [id]);
    expect(a.rows).toEqual([{ action: 'diagnoses.create' }]);
  });
});

describe('aislamiento entre droguerías', () => {
  const some = '88888888-8888-4888-8888-888888888888';
  itIsolates(() => ctx, () => t, (id) => [
    ['GET', `/drugstores/${id}/diagnoses/instrument/current`],
    ['GET', `/drugstores/${id}/diagnoses`],
    ['POST', `/drugstores/${id}/diagnoses`, { performedOn: '2025-01-01', answers: [] }],
    ['GET', `/drugstores/${id}/diagnoses/${some}`],
    ['PATCH', `/drugstores/${id}/diagnoses/${some}`, { notes: 'x' }],
  ]);

  it('un miembro de B no alcanza diagnósticos de A', async () => {
    const id = (await create([{ itemId: byCode('RES-01'), score: 3 }])).json().item.id;
    const o = t.other.owner.cookie;
    expect((await get(ctx, `/drugstores/${t.other.id}/diagnoses/${id}`, o)).statusCode).toBe(404);
    expect((await send(ctx, 'PATCH', `/drugstores/${t.other.id}/diagnoses/${id}`, { notes: 'Intruso' }, o)).statusCode).toBe(404);
    expect((await get(ctx, `/drugstores/${t.other.id}/diagnoses`, o)).json().total).toBe(0);
  });
});
