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
    expect(r.drugstore).toMatchObject({ name: 'Droguería A (simulada)', expiryAlertDays: 60, isDemo: false });
    expect(r.datosSimulados).toBe(false);
    expect(r.codigo).toMatch(/^FARMIX-REP-\d{8}$/);
    expect(r.vencimientos.productos.total).toBe(0);
    expect(r.vencimientos.perdidaConfirmada.valor).toBe(0);
    expect(r.vencimientos.devueltoProveedor.valor).toBe(0);
    expect(r.residuos).toMatchObject({ registros: 0, totalKg: 0, porClasificacion: [], enUnidades: { registros: 0, cantidad: 0 } });
    expect(r.residuos.serieMensual).toHaveLength(6);
    expect(r.segregacion).toEqual({ verificaciones: 0, revisados: 0, bienSegregados: 0, porcentajeCorrecto: null });
    expect(r.personal).toMatchObject({ trabajadores: 0, trabajadoresAlDia: 0, equipo: [] });
    expect(r.planDeMejoramiento).toMatchObject({ total: 0, atrasadas: 0, pendientes: [] });
    expect(r.diagnostico).toEqual({ lineaBase: null, ultimo: null, totalDiagnosticos: 0 });
  });

  it('el aviso lo presenta como producto mínimo viable en estudio que apoya (sin sustituir) el PGIRASA', async () => {
    const r = (await report()).json();
    expect(r.aviso).toMatch(/producto mínimo viable en estudio/);
    expect(r.aviso).toMatch(/hipótesis por validar/);
    expect(r.aviso).toMatch(/PGIRASA/);
    expect(r.aviso).toMatch(/no lo sustituye/);
    expect(JSON.stringify(r)).not.toMatch(/aplicación instalable|producto terminado/i);
  });

  it('una droguería marcada como demostración se declara con datos simulados', async () => {
    const demo = await send(ctx, 'POST', '/drugstores', { name: 'Demo (simulada)', isDemo: true, employeeCount: 3 }, t.owner.cookie);
    expect(demo.json().drugstore).toMatchObject({ isDemo: true, employeeCount: 3 });
    const r = (await report('', t.owner.cookie, demo.json().drugstore.id)).json();
    expect(r.datosSimulados).toBe(true);
    expect(r.drugstore.employeeCount).toBe(3);
  });
});

describe('reporte con datos', () => {
  async function seed() {
    await post('/expirations', { productName: 'Vencido sim', batch: 'V1', expiresOn: await day(-5), quantity: 10, unitCost: 1000 });
    await post('/expirations', { productName: 'Próximo sim', batch: 'P1', expiresOn: await day(20), quantity: 4, unitCost: 500 });
    await post('/expirations', { productName: 'Vigente sim', batch: 'G1', expiresOn: await day(300), quantity: 1 });
    await post('/expirations', { productName: 'Destruido sim', batch: 'M1', expiresOn: await day(-9), quantity: 9, unitCost: 10, destination: 'destruccion_gestor' });
    await post('/expirations', { productName: 'Devuelto sim', batch: 'D1', expiresOn: await day(-2), quantity: 5, unitCost: 100, destination: 'devuelto_proveedor' });
    await post('/waste-records', { recordedOn: await day(-2), classification: 'aprovechable', quantity: 2, unit: 'kg' });
    await post('/waste-records', { recordedOn: await day(-3), classification: 'aprovechable', quantity: 500, unit: 'g' });
    await post('/waste-records', { recordedOn: await day(-3), classification: 'peligroso_quimico', quantity: 1, unit: 'kg', wasteType: 'Medicamentos vencidos', handling: 'Entrega a gestor autorizado', supportRef: 'CERT-SIM-1' });
    await post('/waste-records', { recordedOn: await day(-4), classification: 'peligroso_quimico', quantity: 2, unit: 'unidades', wasteType: 'Luminarias' });
    await post('/waste-records', { recordedOn: await day(-200), classification: 'no_aprovechable', quantity: 50, unit: 'kg' });
    await post('/segregation-checks', { checkedOn: await day(-1), itemsReviewed: 10, itemsCorrect: 8, location: 'Bodega' });
    await post('/segregation-checks', { checkedOn: await day(-4), itemsReviewed: 30, itemsCorrect: 27, location: 'Mostrador' });
    await post('/segregation-checks', { checkedOn: await day(-300), itemsReviewed: 100, itemsCorrect: 1, location: 'Antigua' });
    const w1 = (await post('/workers', { workerCode: 'W1', fullName: 'Persona Simulada' })).json().item.id;
    await post('/workers', { workerCode: 'W2', fullName: 'Otra Simulada' });
    const topics = (await get(ctx, `/drugstores/${t.id}/training-topics`, t.owner.cookie)).json().items;
    const byName = (n: string) => topics.find((x: { topicName: string }) => x.topicName.startsWith(n)).id;
    const file = await ctx.pool.query(
      "INSERT INTO support_files (drugstore_id, original_name, stored_name, mime_type, size_bytes, sha256) VALUES ($1, 'c.pdf', $2, 'application/pdf', 10, $3) RETURNING id",
      [t.id, 'c'.repeat(32) + '.pdf', 'd'.repeat(64)],
    );
    await post('/trainings', { workerId: w1, topicId: byName('Gestión integral'), trainedOn: await day(-10), supportFileId: file.rows[0].id });
    await post('/trainings', { workerId: w1, topicId: byName('Bioseguridad'), trainedOn: await day(-10) });
    await post('/improvement-actions', { finding: 'Hallazgo uno', correctiveAction: 'Acción uno', responsible: 'Responsable', dueOn: await day(-2) });
    await post('/improvement-actions', { finding: 'Hallazgo dos', dueOn: await day(10), state: 'en_curso' });
    await post('/improvement-actions', { finding: 'Hallazgo tres', correctiveAction: 'Acción tres', responsible: 'Responsable', dueOn: await day(-20), state: 'cerrada', closedOn: await day(-1) });
    const inst = (await get(ctx, `/drugstores/${t.id}/diagnoses/instrument/current`, t.owner.cookie)).json().instrument;
    const id = (code: string) => [...inst.obligatorios, ...inst.areas.flatMap((a: { items: unknown[] }) => a.items)].find((i: { code: string }) => i.code === code).id;
    await post('/diagnoses', { performedOn: await day(-30), answers: [
      { itemId: id('OB-01'), response: 'no' }, { itemId: id('OB-02'), response: 'si' }, { itemId: id('OB-03'), response: 'si' }, { itemId: id('OB-04'), response: 'na' },
      { itemId: id('RES-1'), response: 'si' }, { itemId: id('RES-2'), response: 'no' },
    ] });
    await post('/diagnoses', { performedOn: await day(-1), answers: [
      { itemId: id('OB-01'), response: 'si' }, { itemId: id('OB-02'), response: 'si' }, { itemId: id('OB-03'), response: 'si' }, { itemId: id('OB-04'), response: 'na' },
      { itemId: id('RES-1'), response: 'si' }, { itemId: id('RES-2'), response: 'si' }, { itemId: id('VEN-1'), response: 'si' }, { itemId: id('VEN-2'), response: 'no' },
    ] });
  }

  it('consolida todos los módulos con cifras coherentes', async () => {
    await seed();
    const r = (await report()).json();
    expect(r.vencimientos.productos).toEqual({ total: 5, vigente: 1, proximoAVencer: 1, vencido: 1, gestionado: 2 });
    expect(r.vencimientos.perdidaConfirmada).toEqual({ productos: 1, unidades: 9, valor: 90 });
    expect(r.vencimientos.valorEnRiesgo).toEqual({ productos: 2, unidades: 14, valor: 12000 });
    expect(r.vencimientos.devueltoProveedor).toEqual({ productos: 1, unidades: 5, valor: 500 });
    expect(r.residuos.totalKg).toBe(3.5);
    expect(r.residuos.porClasificacion).toEqual([
      { clasificacion: 'aprovechable', registros: 2, kg: 2.5 },
      { clasificacion: 'peligroso_quimico', registros: 1, kg: 1 },
    ]);
    expect(r.residuos.enUnidades).toEqual({ registros: 1, cantidad: 2 });
    expect(r.segregacion).toEqual({ verificaciones: 2, revisados: 40, bienSegregados: 35, porcentajeCorrecto: 87.5 });
    expect(r.planDeMejoramiento).toMatchObject({ total: 3, pendiente: 1, enCurso: 1, cerrada: 1, atrasadas: 1 });
    expect(r.planDeMejoramiento.pendientes.map((p: { hallazgo: string }) => p.hallazgo)).toEqual(['Hallazgo uno', 'Hallazgo dos']);
    expect(r.planDeMejoramiento.pendientes[1].accion).toBeNull();
  });

  it('personal: cada par trabajador × tema cuenta; sin registro = pendiente; sin soporte aparte', async () => {
    await seed();
    const p = (await report()).json().personal;
    expect(p.trabajadores).toBe(2);
    expect(p.capacitaciones).toEqual({ total: 8, vigente: 1, pendiente: 6, vencida: 0, sinSoporte: 1 });
    expect(p.trabajadoresAlDia).toBe(0);
    const w1 = p.equipo.find((e: { nombre: string }) => e.nombre === 'Persona Simulada');
    expect(w1).toMatchObject({ alDia: 1, total: 4 });
    expect(w1.faltan.find((f: { tema: string }) => f.tema === 'Bioseguridad').estado).toBe('sin_soporte');
    expect(p.equipo.find((e: { nombre: string }) => e.nombre === 'Otra Simulada').alDia).toBe(0);
  });

  it('serie mensual de residuos: 6 meses, kg por clasificación; las unidades no se suman', async () => {
    await seed();
    const s = (await report()).json().residuos.serieMensual as { mes: string; kg: Record<string, number> }[];
    expect(s).toHaveLength(6);
    const sum = (c: string) => Math.round(s.reduce((a, m) => a + m.kg[c]!, 0) * 1000) / 1000;
    expect(sum('aprovechable')).toBe(2.5);
    expect(sum('peligroso_quimico')).toBe(1); // las 2 «unidades» no se convierten a kg
    expect(sum('no_aprovechable')).toBe(0); // el registro de hace 200 días queda fuera de los 6 meses
    expect(s.map((m) => m.mes)).toEqual([...s.map((m) => m.mes)].sort());
  });

  it('diagnóstico: línea base vs último, con obligatorios y madurez por área', async () => {
    await seed();
    const d = (await report()).json().diagnostico;
    expect(d.totalDiagnosticos).toBe(2);
    expect(d.lineaBase.fecha).toBe(await day(-30));
    expect(d.lineaBase.obligatorios).toMatchObject({ cumple: 2, aplicables: 10, pendientes: 1, sinResponder: 7 });
    expect(d.lineaBase.obligatorios.noCumple[0]).toMatchObject({ code: 'OB-01' });
    expect(d.lineaBase.obligatorios.noCumple[0].legalBasis).toMatch(/Res\. 591\/2024/);
    expect(d.lineaBase.puntajeGlobal).toBe(3);
    expect(d.ultimo.fecha).toBe(await day(-1));
    expect(d.ultimo.obligatorios).toMatchObject({ cumple: 3, aplicables: 10, pendientes: 0 });
    expect(d.ultimo.puntajeGlobal).toBe(4);
    const score = (a: string) => d.ultimo.areas.find((x: { area: string }) => x.area === a).score;
    expect(score('residuos')).toBe(5);
    expect(score('vencimientos_perdidas')).toBe(3);
    expect(score('seguimiento_mejora')).toBeNull();
  });

  it('el periodo por defecto son 90 días y se puede cambiar', async () => {
    await seed();
    expect((await report()).json().periodo).toEqual({ desde: await day(-89), hasta: await day(0) });
    const wide = (await report(`?from=${await day(-400)}`)).json();
    expect(wide.residuos.totalKg).toBe(53.5);
    expect(wide.segregacion.verificaciones).toBe(3);
    expect((await report(`?from=${await day(-2)}&to=${await day(0)}`)).json().residuos.totalKg).toBe(2);
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
    expect(other.diagnostico.ultimo).toBeNull();
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
