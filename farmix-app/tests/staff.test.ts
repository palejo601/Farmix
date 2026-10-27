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
const P = () => `/drugstores/${t.id}`;
let n = 0;
const worker = async (extra: Record<string, unknown> = {}, id = t.id, cookie = t.owner.cookie) =>
  send(ctx, 'POST', `/drugstores/${id}/workers`, { workerCode: `T-${++n}`, fullName: `Trabajador Simulado ${n}`, ...extra }, cookie);
const topic = async (extra: Record<string, unknown> = {}, id = t.id, cookie = t.owner.cookie) =>
  send(ctx, 'POST', `/drugstores/${id}/training-topics`, { topicName: `Tema simulado ${++n}`, ...extra }, cookie);

describe('trabajadores', () => {
  it('CRUD con borrado lógico y búsqueda', async () => {
    const a = (await worker({ workerCode: 'A-1', fullName: 'Ana Simulada', jobTitle: 'Auxiliar' })).json().item;
    expect(a).toMatchObject({ workerCode: 'A-1', fullName: 'Ana Simulada', jobTitle: 'Auxiliar' });
    await worker({ workerCode: 'B-2', fullName: 'Beto Simulado' });
    expect((await get(ctx, `${P()}/workers?q=ana`, t.op.cookie)).json().total).toBe(1);
    expect((await get(ctx, `${P()}/workers?q=b-2`, t.op.cookie)).json().total).toBe(1);
    expect((await get(ctx, `${P()}/workers?q=%25`, t.op.cookie)).json().total).toBe(0);
    const up = await send(ctx, 'PATCH', `${P()}/workers/${a.id}`, { jobTitle: null }, t.op.cookie);
    expect(up.json().item.jobTitle).toBeNull();
    expect((await send(ctx, 'DELETE', `${P()}/workers/${a.id}`, undefined, t.op.cookie)).statusCode).toBe(403);
    expect((await send(ctx, 'DELETE', `${P()}/workers/${a.id}`, undefined, t.admin.cookie)).statusCode).toBe(204);
    expect((await get(ctx, `${P()}/workers/${a.id}`, t.owner.cookie)).statusCode).toBe(404);
    const row = await ctx.pool.query('SELECT deleted_at, updated_by FROM workers WHERE id=$1', [a.id]);
    expect(row.rows[0].deleted_at).not.toBeNull();
  });

  it('el código es único por droguería (sin importar mayúsculas), pero se repite entre droguerías', async () => {
    await worker({ workerCode: 'X-1' });
    expect((await worker({ workerCode: 'x-1' })).statusCode).toBe(409);
    expect((await worker({ workerCode: 'X-1' }, t.other.id, t.other.owner.cookie)).statusCode).toBe(201);
    const id = (await worker({ workerCode: 'Y-1' })).json().item.id;
    expect((await send(ctx, 'PATCH', `${P()}/workers/${id}`, { workerCode: 'X-1' }, t.owner.cookie)).statusCode).toBe(409);
  });

  it('permite reutilizar el código tras borrar al trabajador', async () => {
    const id = (await worker({ workerCode: 'R-1' })).json().item.id;
    await send(ctx, 'DELETE', `${P()}/workers/${id}`, undefined, t.owner.cookie);
    expect((await worker({ workerCode: 'R-1' })).statusCode).toBe(201);
  });

  it.each([
    ['código vacío', { workerCode: '' }],
    ['nombre corto', { fullName: 'A' }],
    ['cargo largo', { jobTitle: 'x'.repeat(81) }],
  ])('valida la entrada: %s', async (_n, patch) => {
    expect((await worker(patch)).statusCode).toBe(400);
  });

  it('no almacena documento de identidad', async () => {
    const cols = await ctx.pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='workers'");
    expect(cols.rows.map((c) => c.column_name).filter((c) => /document|cedula|id_number/i.test(c))).toEqual([]);
  });
});

describe('temas', () => {
  it('crea con vigencia por defecto de 12 meses, lista y rechaza duplicados', async () => {
    const a = await topic({ topicName: 'Manejo de residuos' });
    expect(a.statusCode).toBe(201);
    expect(a.json().item.validityMonths).toBe(12);
    expect((await topic({ topicName: 'MANEJO DE RESIDUOS' })).statusCode).toBe(409);
    const items = (await get(ctx, `${P()}/training-topics`, t.op.cookie)).json().items;
    expect(items).toHaveLength(5); // 4 temas base de la droguería + el creado aquí
    expect(items.map((i: { topicName: string }) => i.topicName)).toContain('Gestión integral de residuos (PGIRASA)');
  });

  it.each([
    ['vigencia 0', { validityMonths: 0 }],
    ['vigencia 61', { validityMonths: 61 }],
    ['nombre corto', { topicName: 'x' }],
  ])('valida la entrada: %s', async (_n, patch) => {
    expect((await topic(patch)).statusCode).toBe(400);
  });
});

describe('capacitaciones', () => {
  async function setup(validityMonths = 12) {
    const w = (await worker()).json().item.id;
    const tp = (await topic({ validityMonths })).json().item.id;
    return { w, tp };
  }
  const train = (body: Record<string, unknown>, cookie = t.owner.cookie) => send(ctx, 'POST', `${P()}/trainings`, body, cookie);

  it('sin fecha de realización queda pendiente', async () => {
    const { w, tp } = await setup();
    const res = await train({ workerId: w, topicId: tp });
    expect(res.statusCode).toBe(201);
    expect(res.json().item).toMatchObject({ status: 'pendiente', trainedOn: null, validUntil: null });
  });

  it('con fecha de realización calcula la vigencia a partir del tema', async () => {
    const { w, tp } = await setup(6);
    const d = await day(-10);
    const res = await train({ workerId: w, topicId: tp, trainedOn: d });
    expect(res.json().item.status).toBe('sin_soporte'); // realizada y dentro de vigencia, pero sin certificado
    const exp = await ctx.pool.query("SELECT to_char($1::date + interval '6 months', 'YYYY-MM-DD') AS d", [d]);
    expect(res.json().item.validUntil).toBe(exp.rows[0].d);
  });

  it('clasifica vencida, sin soporte y pendiente según la fecha de vigencia', async () => {
    const { w, tp } = await setup();
    const w2 = (await worker()).json().item.id;
    const w3 = (await worker()).json().item.id;
    expect((await train({ workerId: w, topicId: tp, trainedOn: await day(-400), validUntil: await day(-1) })).json().item.status).toBe('vencida');
    expect((await train({ workerId: w2, topicId: tp, trainedOn: await day(-10), validUntil: await day(0) })).json().item.status).toBe('sin_soporte');
    expect((await train({ workerId: w3, topicId: tp })).json().item.status).toBe('pendiente');
    const list = (await get(ctx, `${P()}/trainings`, t.op.cookie)).json();
    expect(list.total).toBe(3);
    expect((await get(ctx, `${P()}/trainings?status=vencida`, t.op.cookie)).json().total).toBe(1);
    expect((await get(ctx, `${P()}/trainings?workerId=${w2}`, t.op.cookie)).json().items[0].workerName).toMatch(/Trabajador Simulado/);
  });

  it('con soporte adjunto la capacitación queda vigente; sin soporte, «sin_soporte»', async () => {
    const { w, tp } = await setup();
    const id = (await train({ workerId: w, topicId: tp, trainedOn: await day(-2) })).json().item.id;
    const file = await ctx.pool.query(
      "INSERT INTO support_files (drugstore_id, original_name, stored_name, mime_type, size_bytes, sha256) VALUES ($1, 'cert.pdf', $2, 'application/pdf', 10, $3) RETURNING id",
      [t.id, 'a'.repeat(32) + '.pdf', 'b'.repeat(64)],
    );
    const up = await send(ctx, 'PATCH', `${P()}/trainings/${id}`, { supportFileId: file.rows[0].id }, t.op.cookie);
    expect(up.json().item.status).toBe('vigente');
    const off = await send(ctx, 'PATCH', `${P()}/trainings/${id}`, { supportFileId: null }, t.op.cookie);
    expect(off.json().item.status).toBe('sin_soporte');
  });

  it('un solo registro por trabajador y tema', async () => {
    const { w, tp } = await setup();
    expect((await train({ workerId: w, topicId: tp })).statusCode).toBe(201);
    expect((await train({ workerId: w, topicId: tp })).statusCode).toBe(409);
  });

  it('valida fechas: sin vigencia sin realización, vigencia anterior y fechas futuras', async () => {
    const { w, tp } = await setup();
    expect((await train({ workerId: w, topicId: tp, validUntil: await day(30) })).statusCode).toBe(400);
    expect((await train({ workerId: w, topicId: tp, trainedOn: await day(-5), validUntil: await day(-6) })).statusCode).toBe(400);
    expect((await train({ workerId: w, topicId: tp, trainedOn: await day(1) })).statusCode).toBe(400);
  });

  it('el trabajador o el tema de otra droguería no se pueden usar', async () => {
    const { w } = await setup();
    const foreignTopic = (await topic({}, t.other.id, t.other.owner.cookie)).json().item.id;
    expect((await train({ workerId: w, topicId: foreignTopic })).statusCode).toBe(404);
    const foreignWorker = (await worker({}, t.other.id, t.other.owner.cookie)).json().item.id;
    const { tp } = await setup();
    expect((await train({ workerId: foreignWorker, topicId: tp })).statusCode).toBe(404);
  });

  it('la base de datos impide mezclar droguerías por clave compuesta', async () => {
    const { w } = await setup();
    const foreignTopic = (await topic({}, t.other.id, t.other.owner.cookie)).json().item.id;
    await expect(
      ctx.pool.query('INSERT INTO trainings (drugstore_id, worker_id, topic_id) VALUES ($1,$2,$3)', [t.id, w, foreignTopic]),
    ).rejects.toThrow(/foreign key/);
  });

  it('al editar: registrar realización recalcula vigencia; quitarla vuelve a pendiente', async () => {
    const { w, tp } = await setup(12);
    const id = (await train({ workerId: w, topicId: tp })).json().item.id;
    const done = await send(ctx, 'PATCH', `${P()}/trainings/${id}`, { trainedOn: await day(-1) }, t.op.cookie);
    expect(done.json().item.status).toBe('sin_soporte');
    expect(done.json().item.validUntil).not.toBeNull();
    const back = await send(ctx, 'PATCH', `${P()}/trainings/${id}`, { trainedOn: null }, t.op.cookie);
    expect(back.json().item).toMatchObject({ status: 'pendiente', validUntil: null });
    expect((await send(ctx, 'PATCH', `${P()}/trainings/${id}`, {}, t.op.cookie)).statusCode).toBe(400);
  });

  it('rechaza (400, no 500) una vigencia nula cuando hay fecha de realización', async () => {
    const { w, tp } = await setup();
    const id = (await train({ workerId: w, topicId: tp })).json().item.id;
    const res = await send(ctx, 'PATCH', `${P()}/trainings/${id}`, { trainedOn: await day(-1), validUntil: null }, t.owner.cookie);
    expect(res.statusCode).toBe(400);
  });

  it('borrar al trabajador oculta sus capacitaciones y libera el par', async () => {
    const { w, tp } = await setup();
    await train({ workerId: w, topicId: tp });
    await send(ctx, 'DELETE', `${P()}/workers/${w}`, undefined, t.owner.cookie);
    expect((await get(ctx, `${P()}/trainings`, t.owner.cookie)).json().total).toBe(0);
  });

  it('borrar una capacitación exige administrador; queda auditado', async () => {
    const { w, tp } = await setup();
    const id = (await train({ workerId: w, topicId: tp })).json().item.id;
    expect((await send(ctx, 'DELETE', `${P()}/trainings/${id}`, undefined, t.op.cookie)).statusCode).toBe(403);
    expect((await send(ctx, 'DELETE', `${P()}/trainings/${id}`, undefined, t.admin.cookie)).statusCode).toBe(204);
    const a = await ctx.pool.query('SELECT action FROM audit_logs WHERE resource_id=$1 ORDER BY id', [id]);
    expect(a.rows.map((x) => x.action)).toEqual(['staff.training_create', 'staff.training_delete']);
  });
});

describe('temas base', () => {
  it('toda droguería nueva trae los 4 temas base de capacitación (PGIRASA, vencimientos, servicio farmacéutico, bioseguridad)', async () => {
    const names = (await get(ctx, `${P()}/training-topics`, t.owner.cookie)).json().items.map((i: { topicName: string }) => i.topicName);
    expect(names).toEqual(expect.arrayContaining([
      'Gestión integral de residuos (PGIRASA)', 'Control de vencimientos y rotación de lotes',
      'Procedimientos del servicio farmacéutico', 'Bioseguridad',
    ]));
    const other = (await get(ctx, `/drugstores/${t.other.id}/training-topics`, t.other.owner.cookie)).json().items;
    expect(other).toHaveLength(4);
  });
});

describe('aislamiento entre droguerías', () => {
  const some = '55555555-5555-4555-8555-555555555555';
  itIsolates(() => ctx, () => t, (id) => [
    ['GET', `/drugstores/${id}/workers`],
    ['POST', `/drugstores/${id}/workers`, { workerCode: 'Z', fullName: 'Zeta Simulado' }],
    ['GET', `/drugstores/${id}/workers/${some}`],
    ['PATCH', `/drugstores/${id}/workers/${some}`, { fullName: 'Otro Nombre' }],
    ['DELETE', `/drugstores/${id}/workers/${some}`],
    ['GET', `/drugstores/${id}/training-topics`],
    ['POST', `/drugstores/${id}/training-topics`, { topicName: 'Tema' }],
    ['GET', `/drugstores/${id}/trainings`],
    ['POST', `/drugstores/${id}/trainings`, { workerId: some, topicId: some }],
    ['PATCH', `/drugstores/${id}/trainings/${some}`, { trainedOn: null }],
    ['DELETE', `/drugstores/${id}/trainings/${some}`],
  ]);

  it('un miembro de B no alcanza personal de A', async () => {
    const id = (await worker()).json().item.id;
    const o = t.other.owner.cookie;
    expect((await get(ctx, `/drugstores/${t.other.id}/workers/${id}`, o)).statusCode).toBe(404);
    expect((await send(ctx, 'DELETE', `/drugstores/${t.other.id}/workers/${id}`, undefined, o)).statusCode).toBe(404);
    expect((await get(ctx, `/drugstores/${t.other.id}/workers`, o)).json().total).toBe(0);
    expect((await get(ctx, `${P()}/workers/${id}`, t.owner.cookie)).statusCode).toBe(200);
  });
});
