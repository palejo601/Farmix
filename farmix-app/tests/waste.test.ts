import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { closeCtx, freshDb, get, makeApp, send, type Ctx } from './helpers.js';
import { itIsolates, setupTenant } from './tenant.js';

let ctx: Ctx;
let t: Awaited<ReturnType<typeof setupTenant>>;
beforeAll(async () => {
  ctx = await makeApp();
  await freshDb(ctx.pool);
});
beforeEach(async () => {
  await ctx.pool.query('TRUNCATE users, audit_logs CASCADE');
  t = await setupTenant(ctx);
});
afterAll(() => closeCtx(ctx));

async function day(n: number) {
  const r = await ctx.pool.query("SELECT to_char((now() AT TIME ZONE 'America/Bogota')::date + $1::int, 'YYYY-MM-DD') AS d", [n]);
  return r.rows[0].d as string;
}
const base = () => `/drugstores/${t.id}/waste-records`;
async function add(extra: Record<string, unknown> = {}, offset = 0, cookie = t.owner.cookie, id = t.id) {
  return send(ctx, 'POST', `/drugstores/${id}/waste-records`, {
    recordedOn: await day(offset), classification: 'aprovechable', quantity: 1.5, unit: 'kg', ...extra,
  }, cookie);
}

describe('crear y consultar', () => {
  it('guarda y devuelve el registro', async () => {
    const res = await add({ classification: 'peligroso_quimico', quantity: 0.25, unit: 'kg', notes: 'Envases simulados' });
    expect(res.statusCode).toBe(201);
    expect(res.json().item).toMatchObject({ classification: 'peligroso_quimico', quantity: 0.25, unit: 'kg', origin: null, notes: 'Envases simulados' });
    expect((await get(ctx, `${base()}/${res.json().item.id}`, t.op.cookie)).statusCode).toBe(200);
  });

  it.each(['riesgo_biologico', 'peligroso_quimico', 'aprovechable', 'organico_aprovechable', 'no_aprovechable'])('acepta la clasificación %s', async (c) => {
    expect((await add({ classification: c })).statusCode).toBe(201);
  });

  it.each([
    ['clasificación fuera de la lista', { classification: 'medicamento' }],
    ['unidad desconocida', { unit: 'lb' }],
    ['cantidad cero', { quantity: 0 }],
    ['cantidad negativa', { quantity: -1 }],
    ['cantidad con 4 decimales', { quantity: 0.0001 }],
    ['cantidad excesiva', { quantity: 100001 }],
    ['fecha inválida', { recordedOn: '2025-02-30' }],
    ['origen desconocido', { origin: 'hospital' }],
    ['nota demasiado larga', { notes: 'x'.repeat(501) }],
  ])('valida la entrada: %s', async (_n, patch) => {
    const res = await add(patch);
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('rechaza fechas futuras pero acepta hoy', async () => {
    expect((await add({}, 1)).statusCode).toBe(400);
    expect((await add({}, 0)).statusCode).toBe(201);
    expect((await add({}, -30)).statusCode).toBe(201);
  });
});

describe('medicamentos vencidos no son riesgo biológico', () => {
  it('rechaza origen medicamento_vencido con riesgo_biologico', async () => {
    const res = await add({ classification: 'riesgo_biologico', origin: 'medicamento_vencido' });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.message).toMatch(/medicamento vencido/);
  });

  it.each(['peligroso_quimico', 'no_aprovechable'])('acepta medicamento vencido como %s', async (c) => {
    const res = await add({ classification: c, origin: 'medicamento_vencido' });
    expect(res.statusCode).toBe(201);
    expect(res.json().item.origin).toBe('medicamento_vencido');
  });

  it('también se valida al editar, combinando con el valor guardado', async () => {
    const id = (await add({ classification: 'peligroso_quimico', origin: 'medicamento_vencido' })).json().item.id;
    expect((await send(ctx, 'PATCH', `${base()}/${id}`, { classification: 'riesgo_biologico' }, t.owner.cookie)).statusCode).toBe(400);
    const id2 = (await add({ classification: 'riesgo_biologico' })).json().item.id;
    expect((await send(ctx, 'PATCH', `${base()}/${id2}`, { origin: 'medicamento_vencido' }, t.owner.cookie)).statusCode).toBe(400);
    expect((await send(ctx, 'PATCH', `${base()}/${id2}`, { origin: 'otro' }, t.owner.cookie)).statusCode).toBe(200);
  });

  it('la base de datos también lo impide', async () => {
    const id = (await add({ classification: 'aprovechable' })).json().item.id;
    await expect(
      ctx.pool.query("UPDATE waste_records SET classification='riesgo_biologico', origin='medicamento_vencido' WHERE id=$1", [id]),
    ).rejects.toThrow(/expired_med_ck/);
  });
});

describe('edición y borrado', () => {
  it('edita parcialmente y puede limpiar origen y notas', async () => {
    const id = (await add({ origin: 'otro', notes: 'a' })).json().item.id;
    const up = await send(ctx, 'PATCH', `${base()}/${id}`, { quantity: 800, unit: 'g', origin: null, notes: null }, t.op.cookie);
    expect(up.json().item).toMatchObject({ quantity: 800, unit: 'g', origin: null, notes: null });
    expect((await send(ctx, 'PATCH', `${base()}/${id}`, {}, t.op.cookie)).statusCode).toBe(400);
  });

  it('el operador no borra; el administrador sí (borrado lógico) y queda auditado', async () => {
    const id = (await add({}, 0, t.op.cookie)).json().item.id;
    expect((await send(ctx, 'DELETE', `${base()}/${id}`, undefined, t.op.cookie)).statusCode).toBe(403);
    expect((await send(ctx, 'DELETE', `${base()}/${id}`, undefined, t.admin.cookie)).statusCode).toBe(204);
    expect((await get(ctx, `${base()}/${id}`, t.owner.cookie)).statusCode).toBe(404);
    const row = await ctx.pool.query('SELECT deleted_at, created_by, updated_by FROM waste_records WHERE id=$1', [id]);
    expect(row.rows[0].deleted_at).not.toBeNull();
    expect(row.rows[0]).toMatchObject({ created_by: t.op.id, updated_by: t.admin.id });
    const a = await ctx.pool.query('SELECT action, user_id FROM audit_logs WHERE resource_id=$1 ORDER BY id', [id]);
    expect(a.rows).toEqual([{ action: 'waste.create', user_id: t.op.id }, { action: 'waste.delete', user_id: t.admin.id }]);
  });
});

describe('listado', () => {
  it('filtra por rango de fechas y clasificación, ordena de más reciente a más antigua y pagina', async () => {
    await add({ classification: 'aprovechable' }, -10);
    await add({ classification: 'no_aprovechable' }, -5);
    await add({ classification: 'aprovechable' }, -1);
    const all = (await get(ctx, base(), t.owner.cookie)).json();
    expect(all.total).toBe(3);
    expect(all.items.map((i: { recordedOn: string }) => i.recordedOn)).toEqual([await day(-1), await day(-5), await day(-10)]);
    const range = (await get(ctx, `${base()}?from=${await day(-6)}&to=${await day(-2)}`, t.owner.cookie)).json();
    expect(range.items.map((i: { classification: string }) => i.classification)).toEqual(['no_aprovechable']);
    expect((await get(ctx, `${base()}?classification=aprovechable`, t.owner.cookie)).json().total).toBe(2);
    expect((await get(ctx, `${base()}?limit=1&offset=1`, t.owner.cookie)).json()).toMatchObject({ total: 3, limit: 1, offset: 1 });
  });

  it('valida los filtros', async () => {
    expect((await get(ctx, `${base()}?from=2025-05-02&to=2025-05-01`, t.owner.cookie)).statusCode).toBe(400);
    expect((await get(ctx, `${base()}?classification=otra`, t.owner.cookie)).statusCode).toBe(400);
    expect((await get(ctx, `${base()}?limit=0`, t.owner.cookie)).statusCode).toBe(400);
  });
});

describe('aislamiento entre droguerías', () => {
  const some = '33333333-3333-4333-8333-333333333333';
  itIsolates(
    () => ctx,
    () => t,
    (id) => [
      ['GET', `/drugstores/${id}/waste-records`],
      ['POST', `/drugstores/${id}/waste-records`, { recordedOn: '2025-01-01', classification: 'aprovechable', quantity: 1, unit: 'kg' }],
      ['GET', `/drugstores/${id}/waste-records/${some}`],
      ['PATCH', `/drugstores/${id}/waste-records/${some}`, { quantity: 2 }],
      ['DELETE', `/drugstores/${id}/waste-records/${some}`],
    ],
  );

  it('un miembro de B no alcanza registros de A ni los ve en su listado', async () => {
    const id = (await add()).json().item.id;
    const other = `/drugstores/${t.other.id}/waste-records`;
    const o = t.other.owner.cookie;
    expect((await get(ctx, `${other}/${id}`, o)).statusCode).toBe(404);
    expect((await send(ctx, 'PATCH', `${other}/${id}`, { quantity: 99 }, o)).statusCode).toBe(404);
    expect((await send(ctx, 'DELETE', `${other}/${id}`, undefined, o)).statusCode).toBe(404);
    expect((await get(ctx, other, o)).json().total).toBe(0);
    const row = await ctx.pool.query('SELECT quantity, deleted_at FROM waste_records WHERE id=$1', [id]);
    expect(Number(row.rows[0].quantity)).toBe(1.5);
    expect(row.rows[0].deleted_at).toBeNull();
  });
});
