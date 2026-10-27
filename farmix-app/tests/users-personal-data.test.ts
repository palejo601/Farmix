import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { purgeDueAccounts } from '../src/modules/personal-data/service.js';
import { PASSWORD, closeCtx, freshDb, get, makeApp, registerUser, send, type Ctx } from './helpers.js';

let ctx: Ctx;
beforeAll(async () => {
  ctx = await makeApp();
  await freshDb(ctx.pool);
});
beforeEach(async () => {
  await ctx.pool.query('TRUNCATE users, dev_mailbox, audit_logs CASCADE');
});
afterAll(() => closeCtx(ctx));

describe('perfil', () => {
  it('lee y actualiza el perfil', async () => {
    const { cookie } = await registerUser(ctx);
    expect((await get(ctx, '/users/me', cookie)).statusCode).toBe(200);
    const upd = await send(ctx, 'PATCH', '/users/me', { fullName: '  Nuevo Nombre ' }, cookie);
    expect(upd.json().user.fullName).toBe('Nuevo Nombre');
  });

  it('valida el nombre', async () => {
    const { cookie } = await registerUser(ctx);
    expect((await send(ctx, 'PATCH', '/users/me', { fullName: 'x' }, cookie)).statusCode).toBe(400);
  });

  it('registra la aceptación del aviso de privacidad', async () => {
    const { cookie, email } = await registerUser(ctx);
    await ctx.pool.query('UPDATE users SET privacy_accepted_at = NULL, privacy_version = NULL WHERE email=$1', [email]);
    const res = await send(ctx, 'POST', '/users/me/privacy-acceptance', undefined, cookie);
    expect(res.json().user.privacyAcceptedAt).toBeTruthy();
  });

  it('una cuenta solo ve su propio perfil', async () => {
    const a = await registerUser(ctx);
    const b = await registerUser(ctx);
    expect((await get(ctx, '/users/me', a.cookie)).json().user.id).toBe(a.id);
    expect((await get(ctx, '/users/me', b.cookie)).json().user.id).toBe(b.id);
  });
});

describe('datos personales (Ley 1581 de 2012)', () => {
  it('descarga los datos propios sin hash de contraseña', async () => {
    const { cookie, email } = await registerUser(ctx);
    const res = await get(ctx, '/personal-data/export', cookie);
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.json().cuenta.email).toBe(email);
    expect(res.body).not.toMatch(/argon2|password/i);
    expect(res.json().aviso).toContain('producto mínimo viable en estudio');
  });

  it('programa la eliminación con 15 días de gracia y es idempotente', async () => {
    const { cookie } = await registerUser(ctx);
    const a = await send(ctx, 'POST', '/personal-data/deletion-request', undefined, cookie);
    expect(a.statusCode).toBe(202);
    const days = (Date.parse(a.json().deletionScheduledAt) - Date.parse(a.json().deletionRequestedAt)) / 86_400_000;
    expect(days).toBeCloseTo(15, 3);
    const b = await send(ctx, 'POST', '/personal-data/deletion-request', undefined, cookie);
    expect(b.json().deletionScheduledAt).toBe(a.json().deletionScheduledAt);
  });

  it('permite cancelar durante la gracia', async () => {
    const { cookie } = await registerUser(ctx);
    await send(ctx, 'POST', '/personal-data/deletion-request', undefined, cookie);
    expect((await send(ctx, 'DELETE', '/personal-data/deletion-request', undefined, cookie)).statusCode).toBe(204);
    expect((await get(ctx, '/users/me', cookie)).json().user.deletionScheduledAt).toBeNull();
  });

  it('no elimina antes de vencer la gracia y sí después, conservando la auditoría anonimizada', async () => {
    const { cookie, id } = await registerUser(ctx);
    const keep = await registerUser(ctx);
    await send(ctx, 'POST', '/personal-data/deletion-request', undefined, cookie);
    expect(await purgeDueAccounts(ctx.app.db)).toBe(0);
    await ctx.pool.query("UPDATE users SET deletion_scheduled_at = now() - interval '1 minute' WHERE id=$1", [id]);
    expect(await purgeDueAccounts(ctx.app.db)).toBe(1);
    expect((await ctx.pool.query('SELECT 1 FROM users WHERE id=$1', [id])).rowCount).toBe(0);
    expect((await ctx.pool.query('SELECT 1 FROM users WHERE id=$1', [keep.id])).rowCount).toBe(1);
    const audit = await ctx.pool.query("SELECT user_id FROM audit_logs WHERE action='personal_data.deletion_request'");
    expect(audit.rows[0].user_id).toBeNull();
    expect((await get(ctx, '/auth/session', cookie)).statusCode).toBe(401);
  });
});
