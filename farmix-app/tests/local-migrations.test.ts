import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { closeCtx, freshDb, get, makeApp, send, type Ctx } from './helpers.js';
import { setupTenant } from './tenant.js';

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
async function data(extra: Record<string, unknown> = {}) {
  return {
    expirations: [
      { productName: 'Local simulado 1', batch: 'LS-1', expiresOn: await day(80), quantity: 4, unitCost: 100 },
      { productName: 'Local simulado 2', batch: 'LS-2', expiresOn: await day(-4), quantity: 2, unitCost: 50 },
    ],
    waste: [{ recordedOn: await day(-1), classification: 'aprovechable', quantity: 3, unit: 'kg' }],
    ...extra,
  };
}
const create = async (body: Record<string, unknown>, cookie = t.owner.cookie) =>
  send(ctx, 'POST', '/local-migrations', { drugstoreId: t.id, isDemo: false, data: await data(), ...body }, cookie);
const act = (id: string, what: 'confirm' | 'revert', cookie = t.owner.cookie) => send(ctx, 'POST', `/local-migrations/${id}/${what}`, undefined, cookie);
const count = async (table: string) => (await ctx.pool.query(`SELECT count(*)::int AS n FROM ${table} WHERE deleted_at IS NULL`)).rows[0].n as number;

describe('creación (vista previa)', () => {
  it('valida y resume sin escribir en las tablas de negocio', async () => {
    const res = await create({ data: await data({ segregation: [{ checkedOn: await day(-1), location: 'Bodega', itemsReviewed: 2, itemsCorrect: 5 }] }) });
    expect(res.statusCode).toBe(201);
    const m = res.json().migration;
    expect(m.phase).toBe('pendiente');
    expect(m.summary.expirations).toEqual({ recibidas: 2, validas: 2, invalidas: 0, duplicadas: 0 });
    expect(m.summary.segregation).toMatchObject({ recibidas: 1, validas: 0, invalidas: 1 });
    expect(m.errors[0]).toMatchObject({ kind: 'segregation', row: 1, state: 'invalida' });
    expect(m.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(await count('expiration_products')).toBe(0);
    expect(await count('waste_records')).toBe(0);
  });

  it.each([
    ['sin datos', { data: {} }],
    ['listas vacías', { data: { expirations: [] } }],
    ['tipo desconocido', { data: { clientes: [{}] } }],
    ['droguería inválida', { drugstoreId: 'no-es-uuid' }],
  ])('valida la entrada: %s', async (_n, patch) => {
    expect((await create(patch)).statusCode).toBe(400);
  });

  it('el mismo usuario y los mismos datos no se pueden enviar dos veces', async () => {
    expect((await create({})).statusCode).toBe(201);
    const again = await create({});
    expect(again.statusCode).toBe(409);
    expect(again.json().error.message).toMatch(/ya fueron enviados/);
    expect((await ctx.pool.query('SELECT count(*)::int AS n FROM local_migrations')).rows[0].n).toBe(1);
  });

  it('la bandera de demostración distingue envíos con el mismo contenido', async () => {
    expect((await create({ isDemo: false })).statusCode).toBe(201);
    expect((await create({ isDemo: true })).statusCode).toBe(201);
    expect((await create({ isDemo: true })).statusCode).toBe(409);
  });

  it('el mismo contenido puede enviarlo otro usuario a su droguería', async () => {
    await create({});
    const other = await send(ctx, 'POST', '/local-migrations', { drugstoreId: t.other.id, isDemo: false, data: await data() }, t.other.owner.cookie);
    expect(other.statusCode).toBe(201);
  });
});

describe('confirmar y revertir', () => {
  it('confirma: registra los datos; confirmar de nuevo no duplica', async () => {
    const id = (await create({})).json().migration.id;
    const res = await act(id, 'confirm', t.op.cookie === '' ? t.owner.cookie : t.owner.cookie);
    expect(res.statusCode).toBe(200);
    expect(res.json().migration).toMatchObject({ phase: 'confirmada', inserted: { expirations: 2, waste: 1, segregation: 0 } });
    expect(await count('expiration_products')).toBe(2);
    expect((await act(id, 'confirm')).statusCode).toBe(409);
    expect(await count('expiration_products')).toBe(2);
    const losses = (await get(ctx, `/drugstores/${t.id}/expirations/losses`, t.owner.cookie)).json();
    expect(losses.perdidaConfirmada.productos).toBe(1);
  });

  it('revierte solo lo que la migración creó (borrado lógico)', async () => {
    await send(ctx, 'POST', `/drugstores/${t.id}/expirations`, { productName: 'Propio previo', batch: 'P-1', expiresOn: await day(30), quantity: 1 }, t.owner.cookie);
    const id = (await create({})).json().migration.id;
    await act(id, 'confirm');
    expect(await count('expiration_products')).toBe(3);
    const rev = await act(id, 'revert');
    expect(rev.json().migration.phase).toBe('revertida');
    expect(await count('expiration_products')).toBe(1);
    expect(await count('waste_records')).toBe(0);
    const total = await ctx.pool.query('SELECT count(*)::int AS n FROM expiration_products');
    expect(total.rows[0].n).toBe(3);
    expect((await act(id, 'revert')).statusCode).toBe(409);
  });

  it('no se puede revertir antes de confirmar', async () => {
    const id = (await create({})).json().migration.id;
    expect((await act(id, 'revert')).statusCode).toBe(409);
  });

  it('tras revertir, los mismos datos se pueden enviar y confirmar otra vez sin duplicar', async () => {
    const id = (await create({})).json().migration.id;
    await act(id, 'confirm');
    await act(id, 'revert');
    const again = await create({});
    expect(again.statusCode).toBe(201);
    expect((await act(again.json().migration.id, 'confirm')).json().migration.inserted.expirations).toBe(2);
    expect(await count('expiration_products')).toBe(2);
  });

  it('no duplica datos que ya existían al confirmar', async () => {
    const id = (await create({})).json().migration.id;
    await send(ctx, 'POST', `/drugstores/${t.id}/expirations`, { productName: 'LOCAL SIMULADO 1', batch: 'ls-1', expiresOn: await day(10), quantity: 1 }, t.owner.cookie);
    const res = await act(id, 'confirm');
    expect(res.json().migration.inserted.expirations).toBe(1);
    expect(await count('expiration_products')).toBe(2);
  });

  it('la base de datos mantiene la coherencia de fases', async () => {
    const id = (await create({})).json().migration.id;
    await expect(ctx.pool.query("UPDATE local_migrations SET phase='confirmada' WHERE id=$1", [id])).rejects.toThrow(/phase_ck/);
  });

  it('queda auditado', async () => {
    const id = (await create({})).json().migration.id;
    await act(id, 'confirm');
    await act(id, 'revert');
    const a = await ctx.pool.query('SELECT action FROM audit_logs WHERE resource_id=$1 ORDER BY id', [id]);
    expect(a.rows.map((x) => x.action)).toEqual(['local_migrations.create', 'local_migrations.confirm', 'local_migrations.revert']);
  });
});

describe('aislamiento', () => {
  it('una cuenta ajena no migra a una droguería que no es suya', async () => {
    expect((await create({}, t.outsider.cookie)).statusCode).toBe(404);
    expect((await create({ drugstoreId: t.other.id })).statusCode).toBe(404);
    expect(await count('expiration_products')).toBe(0);
  });

  it('otro usuario no puede confirmar ni revertir una migración ajena', async () => {
    const id = (await create({})).json().migration.id;
    expect((await act(id, 'confirm', t.other.owner.cookie)).statusCode).toBe(404);
    expect((await act(id, 'confirm', t.admin.cookie)).statusCode).toBe(404);
    expect((await act(id, 'revert', t.other.owner.cookie)).statusCode).toBe(404);
    expect(await count('expiration_products')).toBe(0);
  });

  it('quien pierde su membresía ya no puede confirmar', async () => {
    const op = await send(ctx, 'POST', '/local-migrations', { drugstoreId: t.id, isDemo: false, data: await data() }, t.op.cookie);
    expect(op.statusCode).toBe(201);
    await send(ctx, 'DELETE', `/drugstores/${t.id}/members/${t.op.id}`, undefined, t.owner.cookie);
    expect((await act(op.json().migration.id, 'confirm', t.op.cookie)).statusCode).toBe(404);
  });
});
