import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { percent } from '../src/modules/segregation/service.js';
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
const base = () => `/drugstores/${t.id}/segregation-checks`;
async function add(extra: Record<string, unknown> = {}, offset = 0, cookie = t.owner.cookie, id = t.id) {
  return send(ctx, 'POST', `/drugstores/${id}/segregation-checks`, {
    checkedOn: await day(offset), itemsReviewed: 20, itemsCorrect: 15, location: 'Bodega', ...extra,
  }, cookie);
}

describe('porcentaje calculado al consultar', () => {
  it('bien segregados / revisados × 100', async () => {
    const res = await add({ itemsReviewed: 3, itemsCorrect: 2 });
    expect(res.statusCode).toBe(201);
    expect(res.json().item.percentCorrect).toBe(66.7);
    expect((await add({ itemsReviewed: 20, itemsCorrect: 20 })).json().item.percentCorrect).toBe(100);
    expect((await add({ itemsReviewed: 20, itemsCorrect: 0 })).json().item.percentCorrect).toBe(0);
  });

  it('percent() redondea a un decimal', () => {
    expect(percent(1, 3)).toBe(33.3);
    expect(percent(15, 20)).toBe(75);
  });

  it('no existe columna de porcentaje en la base de datos', async () => {
    const cols = await ctx.pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='segregation_checks'");
    expect(cols.rows.map((c) => c.column_name).filter((c) => /percent|pct|porcent/i.test(c))).toEqual([]);
  });

  it('el porcentaje se recalcula al editar', async () => {
    const id = (await add({ itemsReviewed: 10, itemsCorrect: 5 })).json().item.id;
    const up = await send(ctx, 'PATCH', `${base()}/${id}`, { itemsCorrect: 9 }, t.op.cookie);
    expect(up.json().item.percentCorrect).toBe(90);
  });
});

describe('restricción correct <= reviewed', () => {
  it('la API rechaza bien segregados mayores que revisados', async () => {
    const res = await add({ itemsReviewed: 5, itemsCorrect: 6 });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.details[0].campo).toBe('itemsCorrect');
  });

  it('al editar se compara con el valor guardado', async () => {
    const id = (await add({ itemsReviewed: 10, itemsCorrect: 8 })).json().item.id;
    expect((await send(ctx, 'PATCH', `${base()}/${id}`, { itemsCorrect: 11 }, t.owner.cookie)).statusCode).toBe(400);
    expect((await send(ctx, 'PATCH', `${base()}/${id}`, { itemsReviewed: 7 }, t.owner.cookie)).statusCode).toBe(400);
    expect((await send(ctx, 'PATCH', `${base()}/${id}`, { itemsReviewed: 12, itemsCorrect: 12 }, t.owner.cookie)).statusCode).toBe(200);
  });

  it('la base de datos también la impone', async () => {
    const id = (await add()).json().item.id;
    await expect(ctx.pool.query('UPDATE segregation_checks SET items_correct = items_reviewed + 1 WHERE id=$1', [id])).rejects.toThrow(/correct_le_reviewed/);
  });
});

describe('validación y ciclo de vida', () => {
  it.each([
    ['cero revisados', { itemsReviewed: 0, itemsCorrect: 0 }],
    ['revisados decimal', { itemsReviewed: 2.5 }],
    ['correctos negativos', { itemsCorrect: -1 }],
    ['lugar vacío', { location: ' ' }],
    ['fecha inválida', { checkedOn: 'ayer' }],
    ['observación larga', { observations: 'x'.repeat(501) }],
  ])('valida la entrada: %s', async (_n, patch) => {
    expect((await add(patch)).statusCode).toBe(400);
  });

  it('rechaza fechas futuras', async () => {
    expect((await add({}, 1)).statusCode).toBe(400);
  });

  it('borrado lógico solo para administrador o propietario, con auditoría', async () => {
    const id = (await add({}, 0, t.op.cookie)).json().item.id;
    expect((await send(ctx, 'DELETE', `${base()}/${id}`, undefined, t.op.cookie)).statusCode).toBe(403);
    expect((await send(ctx, 'DELETE', `${base()}/${id}`, undefined, t.admin.cookie)).statusCode).toBe(204);
    expect((await get(ctx, `${base()}/${id}`, t.owner.cookie)).statusCode).toBe(404);
    const row = await ctx.pool.query('SELECT deleted_at, created_by FROM segregation_checks WHERE id=$1', [id]);
    expect(row.rows[0].deleted_at).not.toBeNull();
    expect(row.rows[0].created_by).toBe(t.op.id);
    const a = await ctx.pool.query('SELECT action FROM audit_logs WHERE resource_id=$1 ORDER BY id', [id]);
    expect(a.rows.map((x) => x.action)).toEqual(['segregation.create', 'segregation.delete']);
  });
});

describe('listado y resumen', () => {
  it('filtra por fecha y lugar, y resume solo el conjunto filtrado', async () => {
    await add({ location: 'Bodega', itemsReviewed: 10, itemsCorrect: 5 }, -10);
    await add({ location: 'Mostrador', itemsReviewed: 10, itemsCorrect: 10 }, -5);
    await add({ location: 'bodega', itemsReviewed: 30, itemsCorrect: 25 }, -1);
    const all = (await get(ctx, base(), t.owner.cookie)).json();
    expect(all.total).toBe(3);
    expect(all.resumen).toEqual({ revisados: 50, bienSegregados: 40, porcentajeCorrecto: 80 });
    expect(all.items.map((i: { checkedOn: string }) => i.checkedOn)).toEqual([await day(-1), await day(-5), await day(-10)]);
    const bodega = (await get(ctx, `${base()}?location=BODEGA`, t.owner.cookie)).json();
    expect(bodega.total).toBe(2);
    expect(bodega.resumen).toEqual({ revisados: 40, bienSegregados: 30, porcentajeCorrecto: 75 });
    const rango = (await get(ctx, `${base()}?from=${await day(-6)}&to=${await day(-2)}`, t.owner.cookie)).json();
    expect(rango.total).toBe(1);
  });

  it('sin datos el porcentaje del resumen es nulo, no un número inventado', async () => {
    expect((await get(ctx, base(), t.owner.cookie)).json().resumen).toEqual({ revisados: 0, bienSegregados: 0, porcentajeCorrecto: null });
  });
});

describe('aislamiento entre droguerías', () => {
  const some = '44444444-4444-4444-8444-444444444444';
  itIsolates(() => ctx, () => t, (id) => [
    ['GET', `/drugstores/${id}/segregation-checks`],
    ['POST', `/drugstores/${id}/segregation-checks`, { checkedOn: '2025-01-01', itemsReviewed: 2, itemsCorrect: 1, location: 'X' }],
    ['GET', `/drugstores/${id}/segregation-checks/${some}`],
    ['PATCH', `/drugstores/${id}/segregation-checks/${some}`, { itemsCorrect: 1 }],
    ['DELETE', `/drugstores/${id}/segregation-checks/${some}`],
  ]);

  it('un miembro de B no alcanza verificaciones de A', async () => {
    const id = (await add()).json().item.id;
    const other = `/drugstores/${t.other.id}/segregation-checks`;
    const o = t.other.owner.cookie;
    expect((await get(ctx, `${other}/${id}`, o)).statusCode).toBe(404);
    expect((await send(ctx, 'PATCH', `${other}/${id}`, { itemsCorrect: 1 }, o)).statusCode).toBe(404);
    expect((await send(ctx, 'DELETE', `${other}/${id}`, undefined, o)).statusCode).toBe(404);
    expect((await get(ctx, other, o)).json().total).toBe(0);
  });
});
