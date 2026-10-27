import { randomBytes } from 'node:crypto';
import ExcelJS from 'exceljs';
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
function multipart(filename: string, data: Buffer, field = 'file') {
  const b = '----farmiximp' + randomBytes(6).toString('hex');
  const head = Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="${field}"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`);
  return { payload: Buffer.concat([head, data, Buffer.from(`\r\n--${b}--\r\n`)]), headers: { 'content-type': `multipart/form-data; boundary=${b}` } };
}
const preview = (kind: string, filename: string, data: Buffer, cookie = t.owner.cookie, id = t.id) => {
  const m = multipart(filename, data);
  return ctx.app.inject({ method: 'POST', url: `/api/v1/drugstores/${id}/imports/preview?kind=${kind}`, payload: m.payload, headers: { ...m.headers, cookie } });
};
const csv = (lines: string[]) => Buffer.from(lines.join('\n'), 'utf8');
const confirm = (importId: string, cookie = t.owner.cookie, id = t.id) => send(ctx, 'POST', `/drugstores/${id}/imports/${importId}/confirm`, undefined, cookie);
const count = async (table: string) => (await ctx.pool.query(`SELECT count(*)::int AS n FROM ${table} WHERE deleted_at IS NULL`)).rows[0].n as number;

describe('vista previa (no escribe nada)', () => {
  it('valida fila por fila y deja las tablas de negocio intactas', async () => {
    const res = await preview('expirations', 'productos.csv', csv([
      'producto,lote,vencimiento,cantidad,costo',
      `Producto simulado A,L1,${await day(100)},10,1500`,
      `Producto simulado B,L2,${await day(10)},5,200.5`,
      'Producto simulado C,L3,no-es-fecha,5,100',
    ]));
    expect(res.statusCode).toBe(201);
    const imp = res.json().import;
    expect(imp.phase).toBe('vista_previa');
    expect(imp.totals).toEqual({ filas: 3, validas: 2, invalidas: 1, duplicadas: 0 });
    expect(imp.rows[2]).toMatchObject({ row: 4, state: 'invalida' });
    expect(imp.rows[2].errors[0]).toMatch(/expiresOn/);
    expect(imp.aviso).toMatch(/todavía no se ha guardado nada/);
    expect(await count('expiration_products')).toBe(0);
  });

  it('acepta CSV con punto y coma, encabezados con tildes y decimales con coma', async () => {
    const res = await preview('expirations', 'es.csv', csv([
      'Producto;Lote;Fecha de vencimiento;Cantidad;Costo unitario',
      `Gotas simuladas;A-1;${await day(200)};3;1234,50`,
    ]));
    expect(res.json().import.rows[0]).toMatchObject({ state: 'valida', data: { unitCost: 1234.5, quantity: 3 } });
  });

  it('lee archivos de Excel (.xlsx), incluidas celdas de fecha', async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Hoja1');
    ws.addRow(['Producto', 'Lote', 'Vencimiento', 'Cantidad']);
    ws.addRow(['Producto Excel simulado', 'X-1', new Date(`${await day(90)}T00:00:00Z`), 7]);
    const buf = Buffer.from(await wb.xlsx.writeBuffer());
    const res = await preview('expirations', 'productos.xlsx', buf);
    expect(res.statusCode).toBe(201);
    expect(res.json().import.rows[0]).toMatchObject({ state: 'valida', data: { expiresOn: await day(90), quantity: 7 } });
  });

  it('detecta duplicados dentro del archivo y contra lo ya registrado', async () => {
    await send(ctx, 'POST', `/drugstores/${t.id}/expirations`, { productName: 'Ya Existe', batch: 'E-1', expiresOn: await day(50), quantity: 1 }, t.owner.cookie);
    const res = await preview('expirations', 'dup.csv', csv([
      'producto,lote,vencimiento,cantidad',
      `Nuevo,N-1,${await day(50)},1`,
      `NUEVO,n-1,${await day(60)},2`,
      `ya existe,e-1,${await day(70)},3`,
    ]));
    const rows = res.json().import.rows;
    expect(rows.map((r: { state: string }) => r.state)).toEqual(['valida', 'duplicada', 'duplicada']);
    expect(rows[1].errors[0]).toMatch(/fila 2/);
    expect(rows[2].errors[0]).toMatch(/Ya existe/);
  });

  it('rechaza archivos sin columnas obligatorias, vacíos, de otro formato o demasiado grandes', async () => {
    expect((await preview('expirations', 'a.csv', csv(['producto,lote', 'x,y']))).json().error.message).toMatch(/Faltan columnas obligatorias/);
    expect((await preview('expirations', 'a.csv', csv(['producto,lote,vencimiento,cantidad']))).statusCode).toBe(400);
    expect((await preview('expirations', 'a.csv', Buffer.alloc(0))).statusCode).toBe(400);
    expect((await preview('expirations', 'virus.exe', Buffer.from('MZ\0\0'))).statusCode).toBe(400);
    expect((await preview('expirations', 'datos.txt', csv(['a,b']))).statusCode).toBe(400);
    expect((await preview('expirations', 'grande.csv', Buffer.alloc(2 * 1024 * 1024 + 1, 97))).statusCode).toBe(413);
    expect((await preview('desconocido', 'a.csv', csv(['a']))).statusCode).toBe(400);
    const many = ['producto,lote,vencimiento,cantidad', ...Array.from({ length: 1001 }, (_, i) => `P${i},L${i},2030-01-01,1`)];
    expect((await preview('expirations', 'mil.csv', csv(many))).statusCode).toBe(400);
  });

  it('aplica las reglas de cada tipo (residuos y segregación)', async () => {
    const w = await preview('waste', 'residuos.csv', csv([
      'fecha,clasificacion,cantidad,unidad,origen',
      `${await day(-1)},peligroso_quimico,1.5,kg,medicamento_vencido`,
      `${await day(-1)},riesgo_biologico,1,kg,medicamento_vencido`,
      `${await day(1)},aprovechable,1,kg,`,
    ]));
    expect(w.json().import.rows.map((r: { state: string }) => r.state)).toEqual(['valida', 'invalida', 'invalida']);
    const s = await preview('segregation', 'seg.csv', csv([
      'fecha,lugar,revisados,bien segregados',
      `${await day(-1)},Bodega,10,8`,
      `${await day(-1)},Bodega,10,12`,
    ]));
    expect(s.json().import.rows.map((r: { state: string }) => r.state)).toEqual(['valida', 'invalida']);
  });
});

describe('confirmación', () => {
  async function prepared() {
    const res = await preview('expirations', 'p.csv', csv([
      'producto,lote,vencimiento,cantidad,costo',
      `Producto A,L1,${await day(100)},10,1000`,
      `Producto B,L2,${await day(-3)},5,200`,
      'Producto C,L3,fecha-mala,1,1',
    ]));
    return res.json().import.id as string;
  }

  it('escribe solo las filas válidas, con created_by y auditoría', async () => {
    const id = await prepared();
    const res = await confirm(id, t.op.cookie);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ inserted: 2, skipped: 1 });
    expect(res.json().import).toMatchObject({ phase: 'confirmada', insertedCount: 2 });
    expect(await count('expiration_products')).toBe(2);
    const row = await ctx.pool.query('SELECT created_by FROM expiration_products LIMIT 1');
    expect(row.rows[0].created_by).toBe(t.op.id);
    const a = await ctx.pool.query('SELECT action FROM audit_logs WHERE resource_id=$1 ORDER BY id', [id]);
    expect(a.rows.map((x) => x.action)).toEqual(['imports.preview', 'imports.confirm']);
    const list = (await get(ctx, `/drugstores/${t.id}/expirations/losses`, t.owner.cookie)).json();
    expect(list.valorEnRiesgo.productos).toBe(1);
  });

  it('no se puede confirmar dos veces', async () => {
    const id = await prepared();
    await confirm(id);
    expect((await confirm(id)).statusCode).toBe(409);
    expect(await count('expiration_products')).toBe(2);
  });

  it('la vista previa caduca a las 24 horas', async () => {
    const id = await prepared();
    const row = await ctx.pool.query("SELECT EXTRACT(EPOCH FROM (expires_at - created_at))::int AS secs FROM imports WHERE id=$1", [id]);
    expect(row.rows[0].secs).toBe(24 * 3600);
    await ctx.pool.query("UPDATE imports SET expires_at = now() - interval '1 second' WHERE id=$1", [id]);
    expect((await get(ctx, `/drugstores/${t.id}/imports/${id}`, t.owner.cookie)).json().import.caducada).toBe(true);
    const res = await confirm(id);
    expect(res.statusCode).toBe(409);
    expect(res.json().error.message).toMatch(/caducó/);
    expect(await count('expiration_products')).toBe(0);
  });

  it('vuelve a comprobar duplicados al confirmar', async () => {
    const id = await prepared();
    await send(ctx, 'POST', `/drugstores/${t.id}/expirations`, { productName: 'producto a', batch: 'l1', expiresOn: await day(30), quantity: 1 }, t.owner.cookie);
    const res = await confirm(id);
    expect(res.json()).toMatchObject({ inserted: 1, skipped: 2 });
    expect(await count('expiration_products')).toBe(2);
  });

  it('confirma residuos y segregación', async () => {
    const w = await preview('waste', 'r.csv', csv(['fecha,clasificacion,cantidad,unidad', `${await day(-1)},aprovechable,2,kg`]));
    expect((await confirm(w.json().import.id)).json().inserted).toBe(1);
    const s = await preview('segregation', 's.csv', csv(['fecha,lugar,revisados,bien segregados', `${await day(-1)},Bodega,10,9`]));
    expect((await confirm(s.json().import.id)).json().inserted).toBe(1);
    expect((await get(ctx, `/drugstores/${t.id}/segregation-checks`, t.owner.cookie)).json().resumen.porcentajeCorrecto).toBe(90);
    expect(await count('waste_records')).toBe(1);
  });

  it('un importe repetido del mismo archivo no duplica datos', async () => {
    const lines = ['producto,lote,vencimiento,cantidad', `Repetido,R1,${await day(100)},1`];
    await confirm((await preview('expirations', 'a.csv', csv(lines))).json().import.id);
    const second = await preview('expirations', 'a.csv', csv(lines));
    expect(second.json().import.totals).toMatchObject({ validas: 0, duplicadas: 1 });
    expect((await confirm(second.json().import.id)).json().inserted).toBe(0);
    expect(await count('expiration_products')).toBe(1);
  });
});

describe('aislamiento entre droguerías', () => {
  const some = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  itIsolates(() => ctx, () => t, (id) => [
    ['POST', `/drugstores/${id}/imports/preview?kind=waste`, { x: 1 }],
    ['POST', `/drugstores/${id}/imports/${some}/confirm`],
    ['GET', `/drugstores/${id}/imports/${some}`],
  ]);

  it('un miembro de B no ve ni confirma importaciones de A; el ajeno no puede subir', async () => {
    const id = (await preview('waste', 'r.csv', csv(['fecha,clasificacion,cantidad,unidad', `${await day(-1)},aprovechable,2,kg`]))).json().import.id;
    const o = t.other.owner.cookie;
    expect((await get(ctx, `/drugstores/${t.other.id}/imports/${id}`, o)).statusCode).toBe(404);
    expect((await confirm(id, o, t.other.id)).statusCode).toBe(404);
    expect((await preview('waste', 'r.csv', csv(['fecha,clasificacion,cantidad,unidad']), t.outsider.cookie)).statusCode).toBe(404);
    expect(await count('waste_records')).toBe(0);
  });
});
