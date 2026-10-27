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

/** Fecha (YYYY-MM-DD) a n días de hoy en Bogotá, calculada igual que la API. */
async function day(n: number) {
  const r = await ctx.pool.query("SELECT to_char((now() AT TIME ZONE 'America/Bogota')::date + $1::int, 'YYYY-MM-DD') AS d", [n]);
  return r.rows[0].d as string;
}
let seq = 0;
async function add(offset: number, extra: Record<string, unknown> = {}, cookie = t.owner.cookie, id = t.id) {
  const res = await send(ctx, 'POST', `/drugstores/${id}/expirations`, {
    productName: `Producto simulado ${++seq}`, batch: `LOTE-SIM-${seq}`, expiresOn: await day(offset), quantity: 10, unitCost: 1000, ...extra,
  }, cookie);
  return res;
}
const base = () => `/drugstores/${t.id}/expirations`;

describe('crear y consultar', () => {
  it('guarda los campos y devuelve los calculados', async () => {
    const res = await add(10, { sanitaryRegistry: 'SIMULADO-001', holder: 'Titular simulado', quantity: 4, unitCost: 2500.5 });
    expect(res.statusCode).toBe(201);
    expect(res.json().item).toMatchObject({
      sanitaryRegistry: 'SIMULADO-001', holder: 'Titular simulado', quantity: 4, unitCost: 2500.5, totalCost: 10002,
      destination: 'pendiente', managedAt: null, status: 'proximo_a_vencer', daysLeft: 10,
    });
    expect((await get(ctx, `${base()}/${res.json().item.id}`, t.op.cookie)).statusCode).toBe(200);
  });

  it('no guarda la clasificación en la base de datos', async () => {
    const cols = await ctx.pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='expiration_products'");
    expect(cols.rows.map((c) => c.column_name)).not.toContain('status');
  });

  it.each([
    ['sin producto', { productName: '' }],
    ['sin lote', { batch: ' ' }],
    ['fecha inválida', { expiresOn: '2025-13-40' }],
    ['fecha fuera de rango', { expiresOn: '1999-01-01' }],
    ['cantidad cero', { quantity: 0 }],
    ['cantidad decimal', { quantity: 1.5 }],
    ['costo negativo', { unitCost: -1 }],
    ['costo con 3 decimales', { unitCost: 1.234 }],
    ['destino desconocido', { destination: 'vendido' }],
    ['registro demasiado largo', { sanitaryRegistry: 'x'.repeat(61) }],
  ])('valida la entrada: %s', async (_n, patch) => {
    const res = await add(10, patch);
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('rechaza el mismo producto y lote (sin importar mayúsculas), pero permite reusarlo tras borrarlo', async () => {
    const a = await add(10, { productName: 'Gotas Simuladas', batch: 'L-1' });
    expect((await add(10, { productName: 'GOTAS simuladas', batch: 'l-1' })).statusCode).toBe(409);
    await send(ctx, 'DELETE', `${base()}/${a.json().item.id}`, undefined, t.admin.cookie);
    expect((await add(10, { productName: 'Gotas Simuladas', batch: 'L-1' })).statusCode).toBe(201);
  });

  it('el mismo producto y lote puede existir en otra droguería', async () => {
    await add(10, { productName: 'Compartido', batch: 'L-9' });
    const other = await add(10, { productName: 'Compartido', batch: 'L-9' }, t.other.owner.cookie, t.other.id);
    expect(other.statusCode).toBe(201);
  });
});

describe('clasificación (anticipación por defecto: 60 días)', () => {
  it.each([
    [-1, 'vencido'],
    [0, 'proximo_a_vencer'],
    [59, 'proximo_a_vencer'],
    [60, 'vigente'],
    [61, 'vigente'],
  ])('vence en %i días → %s', async (offset, expected) => {
    const res = await add(offset);
    expect(res.json().item.status).toBe(expected);
    expect(res.json().item.daysLeft).toBe(offset);
  });

  it('un producto gestionado se clasifica como gestionado aunque esté vencido', async () => {
    const res = await add(-5, { destination: 'devolucion_proveedor' });
    expect(res.json().item.status).toBe('gestionado');
    expect(res.json().item.managedAt).not.toBeNull();
  });

  it('respeta la anticipación definida por la droguería', async () => {
    await send(ctx, 'PATCH', `/drugstores/${t.id}`, { expiryAlertDays: 30 }, t.owner.cookie);
    expect((await add(29)).json().item.status).toBe('proximo_a_vencer');
    expect((await add(30)).json().item.status).toBe('vigente');
  });
});

describe('edición, destino y borrado', () => {
  it('al asignar destino se registra la gestión y al volver a pendiente se limpia', async () => {
    const id = (await add(-3)).json().item.id;
    const up = await send(ctx, 'PATCH', `${base()}/${id}`, { destination: 'disposicion_final' }, t.op.cookie);
    expect(up.json().item).toMatchObject({ status: 'gestionado', destination: 'disposicion_final' });
    expect(up.json().item.managedAt).not.toBeNull();
    const back = await send(ctx, 'PATCH', `${base()}/${id}`, { destination: 'pendiente' }, t.op.cookie);
    expect(back.json().item).toMatchObject({ status: 'vencido', managedAt: null });
  });

  it('conserva la fecha de gestión al cambiar entre destinos gestionados', async () => {
    const id = (await add(-3, { destination: 'otro' })).json().item.id;
    const first = (await get(ctx, `${base()}/${id}`, t.owner.cookie)).json().item.managedAt;
    const up = await send(ctx, 'PATCH', `${base()}/${id}`, { destination: 'disposicion_final' }, t.owner.cookie);
    expect(up.json().item.managedAt).toBe(first);
  });

  it('rechaza cuerpo vacío y datos inválidos al editar', async () => {
    const id = (await add(10)).json().item.id;
    expect((await send(ctx, 'PATCH', `${base()}/${id}`, {}, t.owner.cookie)).statusCode).toBe(400);
    expect((await send(ctx, 'PATCH', `${base()}/${id}`, { quantity: -2 }, t.owner.cookie)).statusCode).toBe(400);
  });

  it('el operador crea y edita, pero solo administrador o propietario borra', async () => {
    const id = (await add(10, {}, t.op.cookie)).json().item.id;
    expect((await send(ctx, 'PATCH', `${base()}/${id}`, { quantity: 3 }, t.op.cookie)).statusCode).toBe(200);
    expect((await send(ctx, 'DELETE', `${base()}/${id}`, undefined, t.op.cookie)).statusCode).toBe(403);
    expect((await send(ctx, 'DELETE', `${base()}/${id}`, undefined, t.admin.cookie)).statusCode).toBe(204);
    expect((await get(ctx, `${base()}/${id}`, t.owner.cookie)).statusCode).toBe(404);
    const row = await ctx.pool.query('SELECT deleted_at, updated_by FROM expiration_products WHERE id=$1', [id]);
    expect(row.rows[0].deleted_at).not.toBeNull();
    expect(row.rows[0].updated_by).toBe(t.admin.id);
  });

  it('llena created_by/updated_by y audita creación, edición y borrado', async () => {
    const id = (await add(10, {}, t.op.cookie)).json().item.id;
    await send(ctx, 'PATCH', `${base()}/${id}`, { quantity: 2 }, t.admin.cookie);
    await send(ctx, 'DELETE', `${base()}/${id}`, undefined, t.admin.cookie);
    const row = await ctx.pool.query('SELECT created_by FROM expiration_products WHERE id=$1', [id]);
    expect(row.rows[0].created_by).toBe(t.op.id);
    const a = await ctx.pool.query("SELECT action, user_id, outcome FROM audit_logs WHERE resource_id=$1 ORDER BY id", [id]);
    expect(a.rows).toEqual([
      { action: 'expirations.create', user_id: t.op.id, outcome: 'success' },
      { action: 'expirations.update', user_id: t.admin.id, outcome: 'success' },
      { action: 'expirations.delete', user_id: t.admin.id, outcome: 'success' },
    ]);
  });
});

describe('listado, alertas y pérdidas', () => {
  it('filtra por estado y pagina con total', async () => {
    await add(-2); await add(5); await add(100); await add(200);
    const venc = await get(ctx, `${base()}?status=vencido`, t.owner.cookie);
    expect(venc.json().total).toBe(1);
    const page = await get(ctx, `${base()}?limit=2&offset=1`, t.owner.cookie);
    expect(page.json()).toMatchObject({ total: 4, limit: 2, offset: 1 });
    expect(page.json().items.map((i: { daysLeft: number }) => i.daysLeft)).toEqual([5, 100]);
    expect((await get(ctx, `${base()}?status=otro`, t.owner.cookie)).statusCode).toBe(400);
    expect((await get(ctx, `${base()}?limit=1000`, t.owner.cookie)).statusCode).toBe(400);
  });

  it('las alertas incluyen vencidos y próximos, ordenados por fecha', async () => {
    await add(30); await add(-10); await add(120); await add(-1, { destination: 'otro' });
    const res = await get(ctx, `${base()}/alerts`, t.op.cookie);
    expect(res.json().items.map((i: { daysLeft: number }) => i.daysLeft)).toEqual([-10, 30]);
    expect(res.json().summary).toEqual({ vencidos: 1, proximos: 1 });
  });

  it('calcula pérdida confirmada (vencido sin gestionar) y valor en riesgo (próximo)', async () => {
    await add(-5, { quantity: 10, unitCost: 1000 });                 // pérdida 10.000
    await add(-1, { quantity: 2, unitCost: 500.5 });                 // pérdida 1.001
    await add(-9, { quantity: 99, unitCost: 9999, destination: 'devolucion_proveedor' }); // gestionado: no cuenta
    await add(20, { quantity: 5, unitCost: 200 });                   // en riesgo 1.000
    await add(500, { quantity: 50, unitCost: 100 });                 // vigente: no cuenta
    const borrado = (await add(-3, { quantity: 1, unitCost: 777 })).json().item.id;
    await send(ctx, 'DELETE', `${base()}/${borrado}`, undefined, t.owner.cookie);
    const res = (await get(ctx, `${base()}/losses`, t.owner.cookie)).json();
    expect(res.moneda).toBe('COP');
    expect(res.perdidaConfirmada).toEqual({ productos: 2, unidades: 12, valor: 11001 });
    expect(res.valorEnRiesgo).toEqual({ productos: 1, unidades: 5, valor: 1000 });
    expect(res.anticipacionDias).toBe(60);
    expect(res.aviso).toMatch(/hipótesis por validar/);
  });

  it('sin productos devuelve ceros', async () => {
    const res = (await get(ctx, `${base()}/losses`, t.owner.cookie)).json();
    expect(res.perdidaConfirmada).toEqual({ productos: 0, unidades: 0, valor: 0 });
  });
});

describe('aislamiento entre droguerías', () => {
  const some = '22222222-2222-4222-8222-222222222222';
  itIsolates(
    () => ctx,
    () => t,
    (id) => [
      ['GET', `/drugstores/${id}/expirations`],
      ['POST', `/drugstores/${id}/expirations`, { productName: 'X', batch: 'Y', expiresOn: '2030-01-01', quantity: 1 }],
      ['GET', `/drugstores/${id}/expirations/alerts`],
      ['GET', `/drugstores/${id}/expirations/losses`],
      ['GET', `/drugstores/${id}/expirations/${some}`],
      ['PATCH', `/drugstores/${id}/expirations/${some}`, { quantity: 2 }],
      ['DELETE', `/drugstores/${id}/expirations/${some}`],
    ],
  );

  it('un miembro de B no alcanza productos de A usando su propia droguería', async () => {
    const id = (await add(-5)).json().item.id;
    const other = `/drugstores/${t.other.id}/expirations`;
    expect((await get(ctx, `${other}/${id}`, t.other.owner.cookie)).statusCode).toBe(404);
    expect((await send(ctx, 'PATCH', `${other}/${id}`, { quantity: 99 }, t.other.owner.cookie)).statusCode).toBe(404);
    expect((await send(ctx, 'DELETE', `${other}/${id}`, undefined, t.other.owner.cookie)).statusCode).toBe(404);
    const row = await ctx.pool.query('SELECT quantity, deleted_at FROM expiration_products WHERE id=$1', [id]);
    expect(row.rows[0]).toEqual({ quantity: 10, deleted_at: null });
  });

  it('listados, alertas y pérdidas de B no incluyen datos de A', async () => {
    await add(-5);
    const o = t.other.owner.cookie;
    expect((await get(ctx, `/drugstores/${t.other.id}/expirations`, o)).json().total).toBe(0);
    expect((await get(ctx, `/drugstores/${t.other.id}/expirations/alerts`, o)).json().items).toEqual([]);
    expect((await get(ctx, `/drugstores/${t.other.id}/expirations/losses`, o)).json().perdidaConfirmada.valor).toBe(0);
  });
});

describe('restricciones de la base de datos', () => {
  it('rechaza cantidad 0 y destino gestionado sin fecha de gestión', async () => {
    const id = (await add(10)).json().item.id;
    await expect(ctx.pool.query('UPDATE expiration_products SET quantity = 0 WHERE id=$1', [id])).rejects.toThrow(/quantity/);
    await expect(ctx.pool.query("UPDATE expiration_products SET destination = 'otro' WHERE id=$1", [id])).rejects.toThrow(/managed_ck/);
  });
});
