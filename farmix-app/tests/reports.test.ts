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
const report = (q = '', cookie = t.owner.cookie, id = t.id) => get(ctx, `/drugstores/${id}/reports/management${q}`, cookie);
const post = (path: string, body: unknown, cookie = t.owner.cookie, id = t.id) => send(ctx, 'POST', `/drugstores/${id}${path}`, body, cookie);

describe('reporte vacío', () => {
  it('devuelve ceros y nulos, sin inventar cifras', async () => {
    const res = await report();
    expect(res.statusCode).toBe(200);
    const r = res.json();
    expect(r.drugstore).toMatchObject({ name: 'Droguería A (simulada)', expiryAlertDays: 60 });
    expect(r.vencimientos.productos.total).toBe(0);
    expect(r.vencimientos.perdidaConfirmada.valor).toBe(0);
    expect(r.residuos).toEqual({ registros: 0, totalKg: 0, porClasificacion: [] });
    expect(r.segregacion).toEqual({ verificaciones: 0, revisados: 0, bienSegregados: 0, porcentajeCorrecto: null });
    expect(r.planDeMejoramiento).toMatchObject({ total: 0, atrasadas: 0 });
    expect(r.diagnostico).toBeNull();
  });

  it('el aviso lo presenta como producto mínimo viable en estudio con hipótesis por validar', async () => {
    const r = (await report()).json();
    expect(r.aviso).toMatch(/producto mínimo viable en estudio/);
    expect(r.aviso).toMatch(/hipótesis por validar/);
    expect(JSON.stringify(r)).not.toMatch(/aplicación instalable|producto terminado/i);
  });
});

describe('reporte con datos', () => {
  async function seed() {
    await post('/expirations', { productName: 'Vencido sim', batch: 'V1', expiresOn: await day(-5), quantity: 10, unitCost: 1000 });
    await post('/expirations', { productName: 'Próximo sim', batch: 'P1', expiresOn: await day(20), quantity: 4, unitCost: 500 });
    await post('/expirations', { productName: 'Vigente sim', batch: 'G1', expiresOn: await day(300), quantity: 1 });
    await post('/expirations', { productName: 'Gestionado sim', batch: 'M1', expiresOn: await day(-9), quantity: 9, unitCost: 10, destination: 'devolucion_proveedor' });
    await post('/waste-records', { recordedOn: await day(-2), classification: 'aprovechable', quantity: 2, unit: 'kg' });
    await post('/waste-records', { recordedOn: await day(-3), classification: 'aprovechable', quantity: 500, unit: 'g' });
    await post('/waste-records', { recordedOn: await day(-3), classification: 'peligroso_quimico', quantity: 1, unit: 'kg' });
    await post('/waste-records', { recordedOn: await day(-200), classification: 'no_aprovechable', quantity: 50, unit: 'kg' });
    await post('/segregation-checks', { checkedOn: await day(-1), itemsReviewed: 10, itemsCorrect: 8, location: 'Bodega' });
    await post('/segregation-checks', { checkedOn: await day(-4), itemsReviewed: 30, itemsCorrect: 27, location: 'Mostrador' });
    await post('/segregation-checks', { checkedOn: await day(-300), itemsReviewed: 100, itemsCorrect: 1, location: 'Antigua' });
    const w = (await post('/workers', { workerCode: 'W1', fullName: 'Persona Simulada' })).json().item.id;
    const w2 = (await post('/workers', { workerCode: 'W2', fullName: 'Otra Simulada' })).json().item.id;
    const tp = (await post('/training-topics', { topicName: 'Tema simulado' })).json().item.id;
    await post('/trainings', { workerId: w, topicId: tp, trainedOn: await day(-10) });
    await post('/trainings', { workerId: w2, topicId: tp });
    await post('/improvement-actions', { finding: 'Hallazgo uno', correctiveAction: 'Acción uno', responsible: 'Responsable', dueOn: await day(-2) });
    await post('/improvement-actions', { finding: 'Hallazgo dos', correctiveAction: 'Acción dos', responsible: 'Responsable', dueOn: await day(10), state: 'en_curso' });
    await post('/improvement-actions', { finding: 'Hallazgo tres', correctiveAction: 'Acción tres', responsible: 'Responsable', dueOn: await day(-20), state: 'cerrada', closedOn: await day(-1) });
    const inst = (await get(ctx, `/drugstores/${t.id}/diagnoses/instrument/current`, t.owner.cookie)).json().instrument;
    const codes = Object.fromEntries(inst.areas.flatMap((a: { items: { id: string; code: string }[] }) => a.items.map((i) => [i.code, i.id])));
    await post('/diagnoses', { performedOn: await day(-1), answers: [{ itemId: codes['RES-01'], score: 4 }, { itemId: codes['VEN-01'], score: 2 }] });
  }

  it('consolida todos los módulos con cifras coherentes', async () => {
    await seed();
    const r = (await report()).json();
    expect(r.vencimientos.productos).toEqual({ total: 4, vigente: 1, proximoAVencer: 1, vencido: 1, gestionado: 1 });
    expect(r.vencimientos.perdidaConfirmada).toEqual({ productos: 1, unidades: 10, valor: 10000 });
    expect(r.vencimientos.valorEnRiesgo).toEqual({ productos: 1, unidades: 4, valor: 2000 });
    expect(r.residuos.totalKg).toBe(3.5);
    expect(r.residuos.porClasificacion).toEqual([
      { clasificacion: 'aprovechable', registros: 2, kg: 2.5 },
      { clasificacion: 'peligroso_quimico', registros: 1, kg: 1 },
    ]);
    expect(r.segregacion).toEqual({ verificaciones: 2, revisados: 40, bienSegregados: 35, porcentajeCorrecto: 87.5 });
    expect(r.personal).toEqual({ trabajadores: 2, capacitaciones: { total: 2, vigente: 1, pendiente: 1, vencida: 0 } });
    expect(r.planDeMejoramiento).toEqual({ total: 3, pendiente: 1, enCurso: 1, cerrada: 1, atrasadas: 1 });
    expect(r.diagnostico).toMatchObject({ versionInstrumento: 1, puntajeGlobal: 3 });
    expect(r.diagnostico.areas.find((a: { area: string }) => a.area === 'residuos').score).toBe(4);
  });

  it('el periodo por defecto son 90 días y se puede cambiar', async () => {
    await seed();
    const def = (await report()).json();
    expect(def.periodo).toEqual({ desde: await day(-89), hasta: await day(0) });
    const wide = (await report(`?from=${await day(-400)}`)).json();
    expect(wide.residuos.totalKg).toBe(53.5);
    expect(wide.segregacion.verificaciones).toBe(3);
    const narrow = (await report(`?from=${await day(-2)}&to=${await day(0)}`)).json();
    expect(narrow.residuos.totalKg).toBe(2);
  });

  it('valida el periodo', async () => {
    expect((await report('?from=2025-05-02&to=2025-05-01')).statusCode).toBe(400);
    expect((await report('?from=hoy')).statusCode).toBe(400);
  });

  it('el operador puede leerlo; no incluye datos de otra droguería', async () => {
    await seed();
    expect((await report('', t.op.cookie)).statusCode).toBe(200);
    const other = (await report('', t.other.owner.cookie, t.other.id)).json();
    expect(other.vencimientos.productos.total).toBe(0);
    expect(other.residuos.registros).toBe(0);
    expect(other.personal.trabajadores).toBe(0);
    expect(other.diagnostico).toBeNull();
  });

  it('no cuenta registros borrados', async () => {
    await seed();
    const list = (await get(ctx, `/drugstores/${t.id}/waste-records`, t.owner.cookie)).json().items;
    for (const i of list) await send(ctx, 'DELETE', `/drugstores/${t.id}/waste-records/${i.id}`, undefined, t.owner.cookie);
    expect((await report()).json().residuos.registros).toBe(0);
  });
});

describe('aislamiento entre droguerías', () => {
  itIsolates(() => ctx, () => t, (id) => [['GET', `/drugstores/${id}/reports/management`]]);
});
