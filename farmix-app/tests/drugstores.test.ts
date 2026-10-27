import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { purgeDueAccounts } from '../src/modules/personal-data/service.js';
import { closeCtx, freshDb, get, makeApp, registerUser, send, type Ctx } from './helpers.js';

let ctx: Ctx;
beforeAll(async () => {
  ctx = await makeApp();
  await freshDb(ctx.pool);
});
beforeEach(async () => {
  await ctx.pool.query('TRUNCATE users, audit_logs CASCADE');
});
afterAll(() => closeCtx(ctx));

async function setup() {
  const owner = await registerUser(ctx);
  const created = await send(ctx, 'POST', '/drugstores', { name: 'Droguería Central' }, owner.cookie);
  const id = created.json().drugstore.id as string;
  const admin = await registerUser(ctx);
  const op = await registerUser(ctx);
  const outsider = await registerUser(ctx);
  await send(ctx, 'POST', `/drugstores/${id}/members`, { email: admin.email, role: 'administrador' }, owner.cookie);
  await send(ctx, 'POST', `/drugstores/${id}/members`, { email: op.email, role: 'operador' }, owner.cookie);
  return { id, owner, admin, op, outsider };
}

describe('CRUD de droguerías', () => {
  it('crea con valores por defecto y convierte al creador en propietario', async () => {
    const { cookie } = await registerUser(ctx);
    const res = await send(ctx, 'POST', '/drugstores', { name: ' Mi Droguería ' }, cookie);
    expect(res.statusCode).toBe(201);
    expect(res.json().drugstore).toMatchObject({ name: 'Mi Droguería', city: 'Sincelejo', expiryAlertDays: 60, role: 'propietario' });
  });

  it.each([
    ['nombre corto', { name: 'x' }],
    ['anticipación 0', { name: 'Droguería', expiryAlertDays: 0 }],
    ['anticipación 400', { name: 'Droguería', expiryAlertDays: 400 }],
    ['anticipación decimal', { name: 'Droguería', expiryAlertDays: 10.5 }],
  ])('valida la entrada: %s', async (_n, body) => {
    const { cookie } = await registerUser(ctx);
    expect((await send(ctx, 'POST', '/drugstores', body, cookie)).statusCode).toBe(400);
  });

  it('lista solo las droguerías propias, con su rol', async () => {
    const { id, owner, op, outsider } = await setup();
    expect((await get(ctx, '/drugstores', owner.cookie)).json().drugstores).toHaveLength(1);
    expect((await get(ctx, '/drugstores', op.cookie)).json().drugstores[0]).toMatchObject({ id, role: 'operador' });
    expect((await get(ctx, '/drugstores', outsider.cookie)).json().drugstores).toEqual([]);
  });

  it('edita y rechaza un cuerpo vacío', async () => {
    const { id, owner } = await setup();
    const ok = await send(ctx, 'PATCH', `/drugstores/${id}`, { expiryAlertDays: 90 }, owner.cookie);
    expect(ok.json().drugstore.expiryAlertDays).toBe(90);
    expect((await send(ctx, 'PATCH', `/drugstores/${id}`, {}, owner.cookie)).statusCode).toBe(400);
  });

  it('borra de forma lógica: desaparece para todos pero la fila se conserva', async () => {
    const { id, owner, op } = await setup();
    expect((await send(ctx, 'DELETE', `/drugstores/${id}`, undefined, owner.cookie)).statusCode).toBe(204);
    expect((await get(ctx, `/drugstores/${id}`, owner.cookie)).statusCode).toBe(404);
    expect((await get(ctx, `/drugstores/${id}/members`, op.cookie)).statusCode).toBe(404);
    expect((await get(ctx, '/drugstores', owner.cookie)).json().drugstores).toEqual([]);
    const row = await ctx.pool.query('SELECT deleted_at, updated_by FROM drugstores WHERE id=$1', [id]);
    expect(row.rows[0].deleted_at).not.toBeNull();
    expect(row.rows[0].updated_by).toBe(owner.id);
  });

  it('rellena los campos de auditoría y registra la acción', async () => {
    const { id, owner } = await setup();
    const row = await ctx.pool.query('SELECT created_by, updated_by FROM drugstores WHERE id=$1', [id]);
    expect(row.rows[0]).toEqual({ created_by: owner.id, updated_by: owner.id });
    const a = await ctx.pool.query("SELECT outcome FROM audit_logs WHERE action='drugstores.create' AND resource_id=$1", [id]);
    expect(a.rows).toEqual([{ outcome: 'success' }]);
  });
});

describe('número de empleados y datos de demostración', () => {
  it('guarda el número de empleados y la bandera de demostración (simulada)', async () => {
    const { cookie } = await registerUser(ctx);
    const res = await send(ctx, 'POST', '/drugstores', { name: 'Droguería demo (simulada)', employeeCount: 4, isDemo: true }, cookie);
    expect(res.json().drugstore).toMatchObject({ employeeCount: 4, isDemo: true });
    const normal = await send(ctx, 'POST', '/drugstores', { name: 'Droguería normal' }, cookie);
    expect(normal.json().drugstore).toMatchObject({ employeeCount: null, isDemo: false });
    const up = await send(ctx, 'PATCH', `/drugstores/${normal.json().drugstore.id}`, { employeeCount: 7 }, cookie);
    expect(up.json().drugstore.employeeCount).toBe(7);
    expect((await send(ctx, 'PATCH', `/drugstores/${normal.json().drugstore.id}`, { employeeCount: -1 }, cookie)).statusCode).toBe(400);
  });
});

describe('aislamiento: una cuenta ajena recibe 404 en todas las rutas', () => {
  const routes: [string, (id: string, uid: string) => string, unknown?][] = [
    ['GET', (id) => `/drugstores/${id}`],
    ['PATCH', (id) => `/drugstores/${id}`, { name: 'Hackeada' }],
    ['DELETE', (id) => `/drugstores/${id}`],
    ['GET', (id) => `/drugstores/${id}/members`],
    ['POST', (id) => `/drugstores/${id}/members`, { email: 'x@ejemplo.test', role: 'operador' }],
    ['PATCH', (id, uid) => `/drugstores/${id}/members/${uid}`, { role: 'operador' }],
    ['DELETE', (id, uid) => `/drugstores/${id}/members/${uid}`],
  ];

  it.each(routes)('%s', async (method, url, body) => {
    const { id, owner, outsider } = await setup();
    const res = await send(ctx, method as 'GET', url(id, owner.id), body, outsider.cookie);
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('NOT_FOUND');
    // Incluso con un cuerpo inválido, el tercero recibe 404 y no una pista de validación.
    const bad = await send(ctx, method as 'POST', url(id, owner.id), { basura: true }, outsider.cookie);
    expect(bad.statusCode).toBe(404);
  });

  it('el id inexistente o mal formado también da 404', async () => {
    const { owner } = await setup();
    expect((await get(ctx, '/drugstores/00000000-0000-4000-8000-000000000000', owner.cookie)).statusCode).toBe(404);
    expect((await get(ctx, '/drugstores/no-es-uuid', owner.cookie)).statusCode).toBe(404);
  });

  it('la droguería ajena no se modifica', async () => {
    const { id, outsider } = await setup();
    await send(ctx, 'PATCH', `/drugstores/${id}`, { name: 'Hackeada' }, outsider.cookie);
    const row = await ctx.pool.query('SELECT name FROM drugstores WHERE id=$1', [id]);
    expect(row.rows[0].name).toBe('Droguería Central');
  });

  it('un miembro retirado pierde el acceso', async () => {
    const { id, owner, op } = await setup();
    await send(ctx, 'DELETE', `/drugstores/${id}/members/${op.id}`, undefined, owner.cookie);
    expect((await get(ctx, `/drugstores/${id}`, op.cookie)).statusCode).toBe(404);
  });
});

describe('matriz de roles', () => {
  it('operador: solo lectura (403 al editar, borrar o gestionar miembros)', async () => {
    const { id, op, admin } = await setup();
    expect((await get(ctx, `/drugstores/${id}`, op.cookie)).statusCode).toBe(200);
    expect((await get(ctx, `/drugstores/${id}/members`, op.cookie)).statusCode).toBe(200);
    expect((await send(ctx, 'PATCH', `/drugstores/${id}`, { name: 'Nuevo' }, op.cookie)).statusCode).toBe(403);
    expect((await send(ctx, 'DELETE', `/drugstores/${id}`, undefined, op.cookie)).statusCode).toBe(403);
    expect((await send(ctx, 'POST', `/drugstores/${id}/members`, { email: 'a@ejemplo.test', role: 'operador' }, op.cookie)).statusCode).toBe(403);
    expect((await send(ctx, 'DELETE', `/drugstores/${id}/members/${admin.id}`, undefined, op.cookie)).statusCode).toBe(403);
  });

  it('administrador: edita y gestiona operadores, pero no borra ni toca administradores', async () => {
    const { id, admin, op, owner } = await setup();
    expect((await send(ctx, 'PATCH', `/drugstores/${id}`, { name: 'Renombrada' }, admin.cookie)).statusCode).toBe(200);
    expect((await send(ctx, 'DELETE', `/drugstores/${id}`, undefined, admin.cookie)).statusCode).toBe(403);
    const nuevo = await registerUser(ctx);
    expect((await send(ctx, 'POST', `/drugstores/${id}/members`, { email: nuevo.email, role: 'operador' }, admin.cookie)).statusCode).toBe(201);
    const otroAdmin = await registerUser(ctx);
    expect((await send(ctx, 'POST', `/drugstores/${id}/members`, { email: otroAdmin.email, role: 'administrador' }, admin.cookie)).statusCode).toBe(403);
    expect((await send(ctx, 'PATCH', `/drugstores/${id}/members/${op.id}`, { role: 'administrador' }, admin.cookie)).statusCode).toBe(403);
    expect((await send(ctx, 'DELETE', `/drugstores/${id}/members/${op.id}`, undefined, admin.cookie)).statusCode).toBe(204);
    expect((await send(ctx, 'DELETE', `/drugstores/${id}/members/${owner.id}`, undefined, admin.cookie)).statusCode).toBe(409);
  });

  it('propietario: gestiona administradores y cambia roles', async () => {
    const { id, owner, op } = await setup();
    const up = await send(ctx, 'PATCH', `/drugstores/${id}/members/${op.id}`, { role: 'administrador' }, owner.cookie);
    expect(up.json().member.role).toBe('administrador');
    expect((await send(ctx, 'PATCH', `/drugstores/${id}/members/${op.id}`, { role: 'propietario' }, owner.cookie)).statusCode).toBe(400);
  });

  it('el propietario no puede ser retirado ni degradado (siempre queda uno)', async () => {
    const { id, owner } = await setup();
    expect((await send(ctx, 'DELETE', `/drugstores/${id}/members/${owner.id}`, undefined, owner.cookie)).statusCode).toBe(409);
    expect((await send(ctx, 'PATCH', `/drugstores/${id}/members/${owner.id}`, { role: 'operador' }, owner.cookie)).statusCode).toBe(409);
  });

  it('un miembro puede retirarse a sí mismo', async () => {
    const { id, op } = await setup();
    expect((await send(ctx, 'DELETE', `/drugstores/${id}/members/${op.id}`, undefined, op.cookie)).statusCode).toBe(204);
  });

  it('la base de datos impide dos propietarios activos', async () => {
    const { id, op } = await setup();
    await expect(
      ctx.pool.query("UPDATE drugstore_members SET member_role='propietario' WHERE drugstore_id=$1 AND user_id=$2", [id, op.id]),
    ).rejects.toThrow(/drugstore_members_owner_uq/);
  });
});

describe('miembros', () => {
  it('agrega por correo, lista y rechaza duplicados o cuentas inexistentes', async () => {
    const { id, owner, outsider } = await setup();
    const list = await get(ctx, `/drugstores/${id}/members`, owner.cookie);
    expect(list.json().members.map((m: { role: string }) => m.role)).toEqual(['propietario', 'administrador', 'operador']);
    expect(JSON.stringify(list.json())).not.toMatch(/hash|argon/i);
    const add = await send(ctx, 'POST', `/drugstores/${id}/members`, { email: outsider.email.toUpperCase(), role: 'operador' }, owner.cookie);
    expect(add.statusCode).toBe(201);
    const dup = await send(ctx, 'POST', `/drugstores/${id}/members`, { email: outsider.email, role: 'operador' }, owner.cookie);
    expect(dup.statusCode).toBe(409);
    const none = await send(ctx, 'POST', `/drugstores/${id}/members`, { email: 'nadie@ejemplo.test', role: 'operador' }, owner.cookie);
    expect(none.statusCode).toBe(404);
  });

  it('no se puede asignar el rol propietario por la API', async () => {
    const { id, owner, outsider } = await setup();
    const res = await send(ctx, 'POST', `/drugstores/${id}/members`, { email: outsider.email, role: 'propietario' }, owner.cookie);
    expect(res.statusCode).toBe(400);
  });

  it('se puede volver a agregar a un miembro retirado', async () => {
    const { id, owner, op } = await setup();
    await send(ctx, 'DELETE', `/drugstores/${id}/members/${op.id}`, undefined, owner.cookie);
    const again = await send(ctx, 'POST', `/drugstores/${id}/members`, { email: op.email, role: 'operador' }, owner.cookie);
    expect(again.statusCode).toBe(201);
  });
});

describe('eliminación de la cuenta del propietario', () => {
  it('archiva (borrado lógico) sus droguerías al depurar la cuenta', async () => {
    const { id, owner, op } = await setup();
    await ctx.pool.query("UPDATE users SET deletion_requested_at=now(), deletion_scheduled_at = now() - interval '1 minute' WHERE id=$1", [owner.id]);
    expect(await purgeDueAccounts(ctx.app.db)).toBe(1);
    const row = await ctx.pool.query('SELECT deleted_at FROM drugstores WHERE id=$1', [id]);
    expect(row.rows[0].deleted_at).not.toBeNull();
    expect((await get(ctx, `/drugstores/${id}`, op.cookie)).statusCode).toBe(404);
  });
});
