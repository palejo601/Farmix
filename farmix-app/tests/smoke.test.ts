import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PASSWORD, closeCtx, freshDb, makeApp, type Ctx } from './helpers.js';

/** Prueba de humo: levanta el servidor en un puerto real y recorre un flujo completo por HTTP. */
let ctx: Ctx;
let base = '';
let cookie = '';

async function api(method: string, path: string, body?: unknown, extra: RequestInit = {}) {
  const res = await fetch(`${base}/api/v1${path}`, {
    method,
    headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...extra,
  });
  const set = res.headers.get('set-cookie');
  if (set) cookie = set.split(';')[0]!;
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* respuesta sin JSON */ }
  return { status: res.status, json, headers: res.headers, text };
}

beforeAll(async () => {
  ctx = await makeApp();
  await freshDb(ctx.pool);
  await ctx.app.listen({ port: 0, host: '127.0.0.1' });
  const addr = ctx.app.server.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
});
afterAll(() => closeCtx(ctx));

describe('flujo completo de un usuario nuevo', () => {
  const state: Record<string, string> = {};
  const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

  it('health responde con X-Request-Id y cabeceras de seguridad', async () => {
    const r = await api('GET', '/health');
    expect(r.status).toBe(200);
    expect(r.headers.get('x-request-id')).toBeTruthy();
    expect(r.headers.get('content-security-policy')).toContain("default-src 'none'");
  });

  it('registro, sesión y aviso de privacidad', async () => {
    const r = await api('POST', '/auth/register', { email: 'humo@ejemplo.test', password: PASSWORD, fullName: 'Usuario de Humo', acceptPrivacy: true });
    expect(r.status).toBe(201);
    expect(cookie).toContain('farmix_sid=');
    expect((await api('GET', '/auth/session')).json.user.email).toBe('humo@ejemplo.test');
    expect((await api('POST', '/users/me/privacy-acceptance')).status).toBe(200);
  });

  it('crea la droguería y registra vencimientos, residuos y segregación', async () => {
    state.d = (await api('POST', '/drugstores', { name: 'Droguería de humo (simulada)' })).json.drugstore.id;
    const d = `/drugstores/${state.d}`;
    expect((await api('POST', `${d}/expirations`, { productName: 'Producto simulado', batch: 'H-1', expiresOn: day(-3), quantity: 5, unitCost: 1000 })).status).toBe(201);
    expect((await api('POST', `${d}/waste-records`, { recordedOn: day(-1), classification: 'aprovechable', quantity: 2, unit: 'kg' })).status).toBe(201);
    expect((await api('POST', `${d}/segregation-checks`, { checkedOn: day(-1), itemsReviewed: 10, itemsCorrect: 9, location: 'Bodega' })).status).toBe(201);
    expect((await api('GET', `${d}/expirations/losses`)).json.valorEnRiesgo.valor).toBe(5000); // vencido sin gestionar
  });

  it('personal, capacitación, plan de mejoramiento y diagnóstico', async () => {
    const d = `/drugstores/${state.d}`;
    const w = (await api('POST', `${d}/workers`, { workerCode: 'H1', fullName: 'Persona de Humo' })).json.item.id;
    const tp = (await api('POST', `${d}/training-topics`, { topicName: 'Tema de humo' })).json.item.id;
    expect((await api('POST', `${d}/trainings`, { workerId: w, topicId: tp, trainedOn: day(-5) })).json.item.status).toBe('sin_soporte');
    expect((await api('POST', `${d}/improvement-actions`, { finding: 'Hallazgo de humo', correctiveAction: 'Acción de humo', responsible: 'Responsable', dueOn: day(15) })).status).toBe(201);
    const inst = (await api('GET', `${d}/diagnoses/instrument/current`)).json.instrument;
    const first = inst.areas[0].items[0].id;
    const diag = await api('POST', `${d}/diagnoses`, { performedOn: day(0), answers: [{ itemId: inst.obligatorios[0].id, response: 'no' }, { itemId: first, response: 'si' }] });
    expect(diag.status).toBe(201);
    expect(diag.json.item.overallScore).toBe(5);
    expect(diag.json.item.obligatorios.noCumple[0].code).toBe('OB-01');
  });

  it('sube y descarga un soporte', async () => {
    const d = `/drugstores/${state.d}`;
    const pdf = Buffer.from('%PDF-1.4\nsoporte de humo');
    const form = new FormData();
    form.append('file', new Blob([pdf], { type: 'application/pdf' }), 'soporte.pdf');
    const up = await fetch(`${base}/api/v1${d}/files`, { method: 'POST', headers: { cookie }, body: form });
    expect(up.status).toBe(201);
    const fileId = (await up.json()).file.id;
    const down = await fetch(`${base}/api/v1${d}/files/${fileId}`, { headers: { cookie } });
    expect(down.status).toBe(200);
    expect(Buffer.from(await down.arrayBuffer()).equals(pdf)).toBe(true);
  });

  it('importa un CSV en dos pasos y migra datos locales con reversión', async () => {
    const d = `/drugstores/${state.d}`;
    const csv = `producto,lote,vencimiento,cantidad\nImportado simulado,I-1,${day(100)},3\n`;
    const form = new FormData();
    form.append('file', new Blob([csv]), 'productos.csv');
    const prev = await fetch(`${base}/api/v1${d}/imports/preview?kind=expirations`, { method: 'POST', headers: { cookie }, body: form });
    expect(prev.status).toBe(201);
    const imp = (await prev.json()).import;
    expect(imp.totals.validas).toBe(1);
    expect((await api('POST', `${d}/imports/${imp.id}/confirm`)).json.inserted).toBe(1);

    const mig = await api('POST', '/local-migrations', { drugstoreId: state.d, isDemo: true, data: { waste: [{ recordedOn: day(-2), classification: 'no_aprovechable', quantity: 1, unit: 'kg' }] } });
    expect(mig.status).toBe(201);
    expect((await api('POST', `/local-migrations/${mig.json.migration.id}/confirm`)).json.migration.phase).toBe('confirmada');
    expect((await api('POST', `/local-migrations/${mig.json.migration.id}/revert`)).json.migration.phase).toBe('revertida');
  });

  it('el reporte consolida todo', async () => {
    const r = (await api('GET', `/drugstores/${state.d}/reports/management`)).json;
    expect(r.vencimientos.productos.total).toBe(2);
    expect(r.residuos.totalKg).toBe(2);
    expect(r.segregacion.porcentajeCorrecto).toBe(90);
    expect(r.personal.trabajadores).toBe(1);
    expect(r.diagnostico.ultimo.puntajeGlobal).toBe(5);
    expect(r.diagnostico.ultimo.obligatorios.pendientes).toBe(1);
    expect(r.aviso).toMatch(/hipótesis por validar/);
  });

  it('descarga de datos personales, cierre de sesión y 401 posterior', async () => {
    expect((await api('GET', '/personal-data/export')).json.cuenta.email).toBe('humo@ejemplo.test');
    expect((await api('POST', '/auth/logout')).status).toBe(204);
    const old = cookie;
    expect((await api('GET', '/auth/session', undefined, { headers: { cookie: old } })).status).toBe(401);
    cookie = '';
    expect((await api('GET', '/drugstores')).status).toBe(401);
  });
});
