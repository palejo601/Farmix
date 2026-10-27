import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { LOCK_MINUTES, MAX_FAILED_LOGINS } from '../src/modules/auth/service.js';
import { PASSWORD, closeCtx, cookieOf, freshDb, get, makeApp, registerUser, send, type Ctx } from './helpers.js';

let ctx: Ctx;
beforeAll(async () => {
  ctx = await makeApp();
  await freshDb(ctx.pool);
});
beforeEach(async () => {
  await ctx.pool.query('TRUNCATE users, dev_mailbox, audit_logs CASCADE');
});
afterAll(() => closeCtx(ctx));

const login = (email: string, password = PASSWORD) => send(ctx, 'POST', '/auth/login', { email, password });

describe('registro', () => {
  it('crea la cuenta, abre sesión y no expone el hash', async () => {
    const { res } = await registerUser(ctx);
    expect(res.statusCode).toBe(201);
    expect(JSON.stringify(res.json())).not.toMatch(/hash|argon/i);
    expect(res.json().user.privacyAcceptedAt).toBeTruthy();
  });

  it('guarda la contraseña con Argon2id', async () => {
    const { email } = await registerUser(ctx);
    const r = await ctx.pool.query('SELECT password_hash FROM users WHERE email=$1', [email]);
    expect(r.rows[0].password_hash).toMatch(/^\$argon2id\$/);
    expect(r.rows[0].password_hash).not.toContain(PASSWORD);
  });

  it('la cookie es httpOnly y SameSite=Lax', async () => {
    const { res } = await registerUser(ctx);
    const c = res.cookies.find((x) => x.name === 'farmix_sid')!;
    expect(c.httpOnly).toBe(true);
    expect(c.sameSite).toBe('Lax');
    expect(c.secure).toBeFalsy();
  });

  it('la cookie es secure cuando COOKIE_SECURE=true', async () => {
    const secure = await makeApp({ COOKIE_SECURE: 'true' });
    const res = await secure.app.inject({
      method: 'POST', url: '/api/v1/auth/register',
      payload: { email: 'seg@ejemplo.test', password: PASSWORD, fullName: 'Seguro', acceptPrivacy: true },
    });
    expect(res.cookies.find((x) => x.name === 'farmix_sid')!.secure).toBe(true);
    await closeCtx(secure);
  });

  it('rechaza correo duplicado sin importar mayúsculas', async () => {
    const { email } = await registerUser(ctx, 'dup@ejemplo.test');
    expect(email).toBe('dup@ejemplo.test');
    const again = await registerUser(ctx, 'DUP@Ejemplo.test');
    expect(again.res.statusCode).toBe(409);
  });

  it.each([
    ['contraseña corta', { password: 'corta' }],
    ['correo inválido', { email: 'no-es-correo' }],
    ['sin aceptar aviso', { acceptPrivacy: false }],
    ['nombre vacío', { fullName: ' ' }],
  ])('valida la entrada: %s', async (_n, patch) => {
    const res = await send(ctx, 'POST', '/auth/register', {
      email: 'v@ejemplo.test', password: PASSWORD, fullName: 'Nombre', acceptPrivacy: true, ...patch,
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });
});

describe('ingreso y bloqueo', () => {
  it('ingresa con credenciales correctas', async () => {
    const { email } = await registerUser(ctx);
    const res = await login(email);
    expect(res.statusCode).toBe(200);
    expect(cookieOf(res)).toBeTruthy();
  });

  it('da el mismo error para clave errónea y correo inexistente', async () => {
    const { email } = await registerUser(ctx);
    const a = await login(email, 'otra-clave-equivocada');
    const b = await login('nadie@ejemplo.test');
    expect(a.statusCode).toBe(401);
    expect(b.statusCode).toBe(401);
    expect(a.json().error.message).toBe(b.json().error.message);
  });

  it(`bloquea la cuenta tras ${MAX_FAILED_LOGINS} intentos fallidos, incluso con la clave correcta`, async () => {
    const { email } = await registerUser(ctx);
    for (let i = 0; i < MAX_FAILED_LOGINS; i++) expect((await login(email, 'mala-clave-123')).statusCode).toBe(401);
    const locked = await login(email);
    expect(locked.statusCode).toBe(429);
    const row = await ctx.pool.query('SELECT locked_until FROM users WHERE email=$1', [email]);
    const mins = (new Date(row.rows[0].locked_until).getTime() - Date.now()) / 60_000;
    expect(mins).toBeGreaterThan(LOCK_MINUTES - 1);
  });

  it('permite ingresar de nuevo cuando vence el bloqueo', async () => {
    const { email } = await registerUser(ctx);
    for (let i = 0; i < MAX_FAILED_LOGINS; i++) await login(email, 'mala-clave-123');
    await ctx.pool.query("UPDATE users SET locked_until = now() - interval '1 minute' WHERE email=$1", [email]);
    expect((await login(email)).statusCode).toBe(200);
  });

  it('limita las solicitudes de autenticación por minuto', async () => {
    const limited = await makeApp({ AUTH_RATE_LIMIT_MAX: '3' });
    const codes: number[] = [];
    for (let i = 0; i < 5; i++) {
      const r = await limited.app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: 'a@ejemplo.test', password: 'x' } });
      codes.push(r.statusCode);
    }
    expect(codes.slice(0, 3)).toEqual([401, 401, 401]);
    expect(codes.slice(3)).toEqual([429, 429]);
    await closeCtx(limited);
  });
});

describe('sesión', () => {
  it('devuelve la sesión actual y la cierra en logout', async () => {
    const { cookie, email } = await registerUser(ctx);
    const ses = await get(ctx, '/auth/session', cookie);
    expect(ses.statusCode).toBe(200);
    expect(ses.json().user.email).toBe(email);
    expect((await send(ctx, 'POST', '/auth/logout', undefined, cookie)).statusCode).toBe(204);
    expect((await get(ctx, '/auth/session', cookie)).statusCode).toBe(401);
  });

  it('expira por inactividad', async () => {
    const { cookie } = await registerUser(ctx);
    await ctx.pool.query("UPDATE sessions SET last_seen_at = now() - interval '9 hours'");
    expect((await get(ctx, '/auth/session', cookie)).statusCode).toBe(401);
  });

  it('expira de forma absoluta aunque haya actividad', async () => {
    const { cookie } = await registerUser(ctx);
    await ctx.pool.query("UPDATE sessions SET expires_at = now() - interval '1 second'");
    expect((await get(ctx, '/auth/session', cookie)).statusCode).toBe(401);
  });

  it('rechaza un token falso o manipulado', async () => {
    expect((await get(ctx, '/auth/session', 'farmix_sid=token-inventado')).statusCode).toBe(401);
  });

  it('almacena solo el hash del token de sesión', async () => {
    const { cookie } = await registerUser(ctx);
    const token = cookie.split('=')[1]!;
    const r = await ctx.pool.query('SELECT token_hash FROM sessions');
    expect(r.rows[0].token_hash).not.toBe(token);
    expect(r.rows[0].token_hash).toHaveLength(64);
  });
});

describe('contraseñas', () => {
  it('cambia la contraseña y cierra las demás sesiones', async () => {
    const { email, cookie } = await registerUser(ctx);
    const otra = cookieOf(await login(email));
    const wrong = await send(ctx, 'POST', '/auth/change-password', { currentPassword: 'incorrecta-123', newPassword: 'Nueva-clave-456' }, cookie);
    expect(wrong.statusCode).toBe(401);
    const ok = await send(ctx, 'POST', '/auth/change-password', { currentPassword: PASSWORD, newPassword: 'Nueva-clave-456' }, cookie);
    expect(ok.statusCode).toBe(200);
    expect((await get(ctx, '/auth/session', cookie)).statusCode).toBe(200);
    expect((await get(ctx, '/auth/session', otra)).statusCode).toBe(401);
    expect((await login(email, 'Nueva-clave-456')).statusCode).toBe(200);
    expect((await login(email)).statusCode).toBe(401);
  });

  it('recuperación: respuesta idéntica exista o no la cuenta', async () => {
    const { email } = await registerUser(ctx);
    const a = await send(ctx, 'POST', '/auth/password-reset/request', { email });
    const b = await send(ctx, 'POST', '/auth/password-reset/request', { email: 'nadie@ejemplo.test' });
    expect(a.statusCode).toBe(202);
    expect(b.statusCode).toBe(202);
    expect(a.json()).toEqual(b.json());
    const mail = await ctx.pool.query('SELECT to_email FROM dev_mailbox');
    expect(mail.rows).toEqual([{ to_email: email }]);
  });

  async function resetToken(email: string) {
    await send(ctx, 'POST', '/auth/password-reset/request', { email });
    const m = await ctx.pool.query('SELECT body FROM dev_mailbox ORDER BY id DESC LIMIT 1');
    return (m.rows[0].body as string).split(': ')[1]!;
  }

  it('recuperación: restablece, desbloquea, cierra sesiones y el código es de un solo uso', async () => {
    const { email, cookie } = await registerUser(ctx);
    for (let i = 0; i < MAX_FAILED_LOGINS; i++) await login(email, 'mala-clave-123');
    const token = await resetToken(email);
    const ok = await send(ctx, 'POST', '/auth/password-reset/confirm', { token, newPassword: 'Restablecida-789' });
    expect(ok.statusCode).toBe(200);
    expect((await get(ctx, '/auth/session', cookie)).statusCode).toBe(401);
    expect((await login(email, 'Restablecida-789')).statusCode).toBe(200);
    const again = await send(ctx, 'POST', '/auth/password-reset/confirm', { token, newPassword: 'Otra-clave-1234' });
    expect(again.statusCode).toBe(400);
  });

  it('recuperación: rechaza código vencido o inventado', async () => {
    const { email } = await registerUser(ctx);
    const token = await resetToken(email);
    await ctx.pool.query("UPDATE password_resets SET expires_at = now() - interval '1 second'");
    expect((await send(ctx, 'POST', '/auth/password-reset/confirm', { token, newPassword: 'Otra-clave-1234' })).statusCode).toBe(400);
    expect((await send(ctx, 'POST', '/auth/password-reset/confirm', { token: 'x'.repeat(40), newPassword: 'Otra-clave-1234' })).statusCode).toBe(400);
  });
});

describe('protecciones transversales', () => {
  it('rechaza peticiones que cambian datos con Origin ajeno', async () => {
    const res = await ctx.app.inject({
      method: 'POST', url: '/api/v1/auth/login', headers: { origin: 'https://sitio-malicioso.test' },
      payload: { email: 'a@ejemplo.test', password: 'x' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('acepta el Origin configurado', async () => {
    const res = await ctx.app.inject({
      method: 'POST', url: '/api/v1/auth/login', headers: { origin: 'http://localhost:5173' },
      payload: { email: 'a@ejemplo.test', password: 'x' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('auditoría', () => {
  it('registra ingresos exitosos y fallidos sin contraseñas', async () => {
    const { email } = await registerUser(ctx);
    await login(email, 'mala-clave-123');
    await login(email);
    const r = await ctx.pool.query("SELECT action, outcome, request_id FROM audit_logs WHERE action='auth.login' ORDER BY id");
    expect(r.rows.map((x) => x.outcome)).toEqual(['failure', 'success']);
    expect(r.rows[0].request_id).toBeTruthy();
    const all = JSON.stringify((await ctx.pool.query('SELECT * FROM audit_logs')).rows);
    expect(all).not.toContain(PASSWORD);
    expect(all).not.toContain('mala-clave-123');
  });
});
