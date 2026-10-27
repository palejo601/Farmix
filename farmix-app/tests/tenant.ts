import { expect, it } from 'vitest';
import { registerUser, send, type Ctx } from './helpers.js';

/** Escenario estándar de pruebas multi-droguería: A (propietario, administrador, operador), un ajeno y la droguería B. */
export async function setupTenant(ctx: Ctx) {
  const owner = await registerUser(ctx);
  const id = (await send(ctx, 'POST', '/drugstores', { name: 'Droguería A (simulada)' }, owner.cookie)).json().drugstore.id as string;
  const admin = await registerUser(ctx);
  const op = await registerUser(ctx);
  const outsider = await registerUser(ctx);
  await send(ctx, 'POST', `/drugstores/${id}/members`, { email: admin.email, role: 'administrador' }, owner.cookie);
  await send(ctx, 'POST', `/drugstores/${id}/members`, { email: op.email, role: 'operador' }, owner.cookie);
  const otherOwner = await registerUser(ctx);
  const otherId = (await send(ctx, 'POST', '/drugstores', { name: 'Droguería B (simulada)' }, otherOwner.cookie)).json().drugstore.id as string;
  return { id, owner, admin, op, outsider, other: { id: otherId, owner: otherOwner } };
}

export type Route = [method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown];

/** Una cuenta ajena recibe 404 en cada ruta, incluso con cuerpo inválido. */
export function itIsolates(getCtx: () => Ctx, getTenant: () => Awaited<ReturnType<typeof setupTenant>>, routes: (id: string) => Route[]) {
  it('una cuenta ajena recibe 404 en todas las rutas del módulo', async () => {
    const ctx = getCtx();
    const t = getTenant();
    const list = routes(t.id);
    expect(list.length).toBeGreaterThan(0);
    for (const [method, path, body] of list) {
      const res = await send(ctx, method, path, body, t.outsider.cookie);
      expect(res.statusCode, `${method} ${path}`).toBe(404);
      const bad = await send(ctx, method, path, method === 'GET' || method === 'DELETE' ? undefined : { basura: true }, t.outsider.cookie);
      expect(bad.statusCode, `${method} ${path} (cuerpo inválido)`).toBe(404);
    }
  });
}
