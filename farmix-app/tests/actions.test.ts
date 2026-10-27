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
const base = () => `/drugstores/${t.id}/improvement-actions`;
async function add(extra: Record<string, unknown> = {}, due = 30, cookie = t.owner.cookie, id = t.id) {
  return send(ctx, 'POST', `/drugstores/${id}/improvement-actions`, {
    finding: 'Hallazgo simulado', correctiveAction: 'Acción simulada', responsible: 'Responsable Simulado', dueOn: await day(due), ...extra,
  }, cookie);
}

describe('crear y consultar', () => {
  it('crea en estado pendiente por defecto', async () => {
    const res = await add();
    expect(res.statusCode).toBe(201);
    expect(res.json().item).toMatchObject({ state: 'pendiente', closedOn: null, overdue: false });
    expect((await get(ctx, `${base()}/${res.json().item.id}`, t.op.cookie)).statusCode).toBe(200);
  });

  it.each([
    ['hallazgo corto', { finding: 'ab' }],
    ['responsable vacío', { responsible: '' }],
    ['estado desconocido', { state: 'terminada' }],
    ['fecha inválida', { dueOn: '31/12/2025' }],
  ])('valida la entrada: %s', async (_n, patch) => {
    expect((await add(patch)).statusCode).toBe(400);
  });
});

describe('estados y fecha de cierre', () => {
  it('una acción cerrada exige fecha de cierre', async () => {
    const res = await add({ state: 'cerrada' });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.message).toMatch(/fecha de cierre/);
    const ok = await add({ state: 'cerrada', closedOn: await day(-1) });
    expect(ok.statusCode).toBe(201);
    expect(ok.json().item).toMatchObject({ state: 'cerrada', overdue: false });
  });

  it('la fecha de cierre solo se admite en acciones cerradas y no puede ser futura', async () => {
    expect((await add({ state: 'en_curso', closedOn: await day(-1) })).statusCode).toBe(400);
    expect((await add({ state: 'cerrada', closedOn: await day(1) })).statusCode).toBe(400);
  });

  it('transiciones: pendiente → en curso → cerrada → reabierta', async () => {
    const id = (await add()).json().item.id;
    expect((await send(ctx, 'PATCH', `${base()}/${id}`, { state: 'en_curso' }, t.op.cookie)).json().item.state).toBe('en_curso');
    expect((await send(ctx, 'PATCH', `${base()}/${id}`, { state: 'cerrada' }, t.op.cookie)).statusCode).toBe(400);
    const closed = await send(ctx, 'PATCH', `${base()}/${id}`, { state: 'cerrada', closedOn: await day(0) }, t.op.cookie);
    expect(closed.json().item).toMatchObject({ state: 'cerrada', closedOn: await day(0) });
    const edit = await send(ctx, 'PATCH', `${base()}/${id}`, { responsible: 'Otra Persona' }, t.op.cookie);
    expect(edit.json().item.closedOn).toBe(await day(0));
    const reopen = await send(ctx, 'PATCH', `${base()}/${id}`, { state: 'en_curso' }, t.op.cookie);
    expect(reopen.json().item).toMatchObject({ state: 'en_curso', closedOn: null });
  });

  it('la base de datos impone la regla', async () => {
    const id = (await add()).json().item.id;
    await expect(ctx.pool.query("UPDATE improvement_actions SET progress_state='cerrada' WHERE id=$1", [id])).rejects.toThrow(/closed_ck/);
    await expect(ctx.pool.query('UPDATE improvement_actions SET closed_on = now()::date WHERE id=$1', [id])).rejects.toThrow(/closed_ck/);
  });

  it('no usa una columna llamada status', async () => {
    const cols = await ctx.pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='improvement_actions'");
    expect(cols.rows.map((c) => c.column_name)).not.toContain('status');
  });
});

describe('vencimiento de la acción y listado', () => {
  it('marca como atrasada solo si no está cerrada y pasó la fecha límite', async () => {
    const late = (await add({}, -2)).json().item;
    expect(late.overdue).toBe(true);
    const today = (await add({}, 0)).json().item;
    expect(today.overdue).toBe(false);
    const closedLate = (await add({ state: 'cerrada', closedOn: await day(-1) }, -5)).json().item;
    expect(closedLate.overdue).toBe(false);
  });

  it('filtra por estado y atraso, ordena por fecha límite y pagina', async () => {
    await add({}, 20); await add({ state: 'en_curso' }, -3); await add({}, 5);
    const all = (await get(ctx, base(), t.owner.cookie)).json();
    expect(all.items.map((i: { dueOn: string }) => i.dueOn)).toEqual([await day(-3), await day(5), await day(20)]);
    expect((await get(ctx, `${base()}?overdue=true`, t.owner.cookie)).json().total).toBe(1);
    expect((await get(ctx, `${base()}?overdue=false`, t.owner.cookie)).json().total).toBe(2);
    expect((await get(ctx, `${base()}?state=en_curso`, t.owner.cookie)).json().total).toBe(1);
    expect((await get(ctx, `${base()}?limit=1&offset=2`, t.owner.cookie)).json().items[0].dueOn).toBe(await day(20));
    expect((await get(ctx, `${base()}?state=x`, t.owner.cookie)).statusCode).toBe(400);
  });
});

describe('borrado, permisos y auditoría', () => {
  it('el operador crea y edita; borrar exige administrador; borrado lógico auditado', async () => {
    const id = (await add({}, 10, t.op.cookie)).json().item.id;
    expect((await send(ctx, 'PATCH', `${base()}/${id}`, { responsible: 'Nuevo Responsable' }, t.op.cookie)).statusCode).toBe(200);
    expect((await send(ctx, 'PATCH', `${base()}/${id}`, {}, t.op.cookie)).statusCode).toBe(400);
    expect((await send(ctx, 'DELETE', `${base()}/${id}`, undefined, t.op.cookie)).statusCode).toBe(403);
    expect((await send(ctx, 'DELETE', `${base()}/${id}`, undefined, t.owner.cookie)).statusCode).toBe(204);
    expect((await get(ctx, `${base()}/${id}`, t.owner.cookie)).statusCode).toBe(404);
    const a = await ctx.pool.query('SELECT action, user_id FROM audit_logs WHERE resource_id=$1 ORDER BY id', [id]);
    expect(a.rows.map((x) => x.action)).toEqual(['actions.create', 'actions.update', 'actions.delete']);
    const row = await ctx.pool.query('SELECT deleted_at, created_by FROM improvement_actions WHERE id=$1', [id]);
    expect(row.rows[0].deleted_at).not.toBeNull();
    expect(row.rows[0].created_by).toBe(t.op.id);
  });
});

describe('aislamiento entre droguerías', () => {
  const some = '66666666-6666-4666-8666-666666666666';
  itIsolates(() => ctx, () => t, (id) => [
    ['GET', `/drugstores/${id}/improvement-actions`],
    ['POST', `/drugstores/${id}/improvement-actions`, { finding: 'abc', correctiveAction: 'abc', responsible: 'Ab', dueOn: '2030-01-01' }],
    ['GET', `/drugstores/${id}/improvement-actions/${some}`],
    ['PATCH', `/drugstores/${id}/improvement-actions/${some}`, { responsible: 'Otro' }],
    ['DELETE', `/drugstores/${id}/improvement-actions/${some}`],
  ]);

  it('un miembro de B no alcanza acciones de A', async () => {
    const id = (await add()).json().item.id;
    const o = t.other.owner.cookie;
    const other = `/drugstores/${t.other.id}/improvement-actions`;
    expect((await get(ctx, `${other}/${id}`, o)).statusCode).toBe(404);
    expect((await send(ctx, 'PATCH', `${other}/${id}`, { responsible: 'Intruso' }, o)).statusCode).toBe(404);
    expect((await get(ctx, other, o)).json().total).toBe(0);
  });
});
