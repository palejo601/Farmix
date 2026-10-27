import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { detectType } from '../src/modules/files/service.js';
import { baseEnv, closeCtx, freshDb, get, makeApp, send, type Ctx } from './helpers.js';
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

const PDF = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.from('contenido simulado')]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('png simulado')]);
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from('jpg simulado')]);

function multipart(filename: string, data: Buffer, field = 'file', mime = 'application/octet-stream') {
  const b = '----farmixtest' + randomBytes(6).toString('hex');
  const head = Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="${field}"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`);
  return { payload: Buffer.concat([head, data, Buffer.from(`\r\n--${b}--\r\n`)]), headers: { 'content-type': `multipart/form-data; boundary=${b}` } };
}
const upload = (data: Buffer, filename = 'soporte.pdf', cookie = t.owner.cookie, id = t.id, field = 'file', mime?: string) => {
  const m = multipart(filename, data, field, mime);
  return ctx.app.inject({ method: 'POST', url: `/api/v1/drugstores/${id}/files`, payload: m.payload, headers: { ...m.headers, cookie } });
};
const download = (fileId: string, cookie = t.owner.cookie, id = t.id) =>
  ctx.app.inject({ method: 'GET', url: `/api/v1/drugstores/${id}/files/${fileId}`, headers: { cookie } });

describe('subida', () => {
  it.each([
    ['PDF', PDF, 'application/pdf', 'pdf'],
    ['PNG', PNG, 'image/png', 'png'],
    ['JPEG', JPG, 'image/jpeg', 'jpg'],
  ])('acepta %s verificando los bytes iniciales', async (_n, data, mime, ext) => {
    const res = await upload(data, `archivo.${ext}`);
    expect(res.statusCode).toBe(201);
    expect(res.json().file).toMatchObject({ mimeType: mime, sizeBytes: data.length, originalName: `archivo.${ext}` });
    const row = await ctx.pool.query('SELECT stored_name, sha256 FROM support_files WHERE id=$1', [res.json().file.id]);
    expect(row.rows[0].stored_name).toMatch(new RegExp(`^[a-f0-9]{32}\\.${ext}$`));
    expect(row.rows[0].sha256).toHaveLength(64);
  });

  it('rechaza un archivo cuyo contenido no coincide con su extensión o tipo declarado', async () => {
    const fake = await upload(Buffer.from('<script>alert(1)</script>'), 'falso.pdf', t.owner.cookie, t.id, 'file', 'application/pdf');
    expect(fake.statusCode).toBe(400);
    expect((await upload(Buffer.from('MZ ejecutable'), 'programa.exe')).statusCode).toBe(400);
    expect((await upload(Buffer.from('texto plano'), 'nota.txt')).statusCode).toBe(400);
  });

  it('rechaza archivos vacíos y otros campos', async () => {
    expect((await upload(Buffer.alloc(0))).statusCode).toBe(400);
    expect((await upload(PDF, 'a.pdf', t.owner.cookie, t.id, 'otro')).statusCode).toBe(400);
  });

  it('rechaza lo que supera 5 MB con 413', async () => {
    const big = Buffer.concat([Buffer.from('%PDF-'), Buffer.alloc(5 * 1024 * 1024 + 10)]);
    const res = await upload(big);
    expect(res.statusCode).toBe(413);
    expect(res.json().error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('exige multipart', async () => {
    const res = await send(ctx, 'POST', `/drugstores/${t.id}/files`, { file: 'x' }, t.owner.cookie);
    expect(res.statusCode).toBe(400);
  });

  it('el nombre guardado es aleatorio y el original se sanea (sin rutas)', async () => {
    const res = await upload(PDF, '../../etc/pasaporte secreto.pdf');
    expect(res.json().file.originalName).toBe('pasaporte secreto.pdf');
    const row = await ctx.pool.query('SELECT stored_name FROM support_files WHERE id=$1', [res.json().file.id]);
    expect(row.rows[0].stored_name).not.toContain('pasaporte');
  });

  it('el contenido se guarda en disco, fuera de la base de datos', async () => {
    const res = await upload(PDF);
    const stored = (await ctx.pool.query('SELECT stored_name FROM support_files WHERE id=$1', [res.json().file.id])).rows[0].stored_name;
    const onDisk = path.resolve(baseEnv.STORAGE_DIR, t.id, stored);
    expect(existsSync(onDisk)).toBe(true);
    expect((await readFile(onDisk)).equals(PDF)).toBe(true);
    const cols = await ctx.pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='support_files'");
    expect(cols.rows.filter((c) => c.data_type === 'bytea')).toEqual([]);
  });

  it('detectType reconoce solo los tres formatos', () => {
    expect(detectType(PDF)?.ext).toBe('pdf');
    expect(detectType(PNG)?.ext).toBe('png');
    expect(detectType(JPG)?.ext).toBe('jpg');
    expect(detectType(Buffer.from('GIF89a'))).toBeNull();
    expect(detectType(Buffer.alloc(0))).toBeNull();
  });
});

describe('descarga y borrado', () => {
  it('un miembro descarga el mismo contenido con cabeceras seguras', async () => {
    const id = (await upload(PDF, 'informe.pdf')).json().file.id;
    const res = await download(id, t.op.cookie);
    expect(res.statusCode).toBe(200);
    expect(res.rawPayload.equals(PDF)).toBe(true);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toContain("attachment; filename*=UTF-8''informe.pdf");
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['cache-control']).toContain('no-store');
  });

  it('descargas y subidas quedan auditadas', async () => {
    const id = (await upload(PDF, 'a.pdf', t.op.cookie)).json().file.id;
    await download(id, t.admin.cookie);
    const a = await ctx.pool.query('SELECT action, user_id FROM audit_logs WHERE resource_id=$1 ORDER BY id', [id]);
    expect(a.rows).toEqual([{ action: 'files.upload', user_id: t.op.id }, { action: 'files.download', user_id: t.admin.id }]);
  });

  it('borrar exige administrador; luego la descarga da 404', async () => {
    const id = (await upload(PDF)).json().file.id;
    const del = (cookie: string) => send(ctx, 'DELETE', `/drugstores/${t.id}/files/${id}`, undefined, cookie);
    expect((await del(t.op.cookie)).statusCode).toBe(403);
    expect((await del(t.admin.cookie)).statusCode).toBe(204);
    expect((await download(id)).statusCode).toBe(404);
    expect((await ctx.pool.query('SELECT deleted_at FROM support_files WHERE id=$1', [id])).rows[0].deleted_at).not.toBeNull();
  });

  it('la base de datos rechaza nombres de almacenamiento inseguros', async () => {
    const id = (await upload(PDF)).json().file.id;
    await expect(ctx.pool.query("UPDATE support_files SET stored_name = '../../etc/passwd' WHERE id=$1", [id])).rejects.toThrow(/stored_name/);
  });
});

describe('soporte en capacitaciones', () => {
  async function training() {
    const w = (await send(ctx, 'POST', `/drugstores/${t.id}/workers`, { workerCode: 'W1', fullName: 'Persona Simulada' }, t.owner.cookie)).json().item.id;
    const tp = (await send(ctx, 'POST', `/drugstores/${t.id}/training-topics`, { topicName: 'Tema simulado' }, t.owner.cookie)).json().item.id;
    return { w, tp };
  }

  it('enlaza un soporte de la misma droguería y lo desenlaza al borrar el archivo', async () => {
    const { w, tp } = await training();
    const fid = (await upload(PDF)).json().file.id;
    const tr = await send(ctx, 'POST', `/drugstores/${t.id}/trainings`, { workerId: w, topicId: tp, supportFileId: fid }, t.owner.cookie);
    expect(tr.statusCode).toBe(201);
    expect(tr.json().item.supportFileId).toBe(fid);
    await send(ctx, 'DELETE', `/drugstores/${t.id}/files/${fid}`, undefined, t.owner.cookie);
    const after = await get(ctx, `/drugstores/${t.id}/trainings`, t.owner.cookie);
    expect(after.json().items[0].supportFileId).toBeNull();
  });

  it('no permite enlazar un soporte de otra droguería', async () => {
    const { w, tp } = await training();
    const foreign = (await upload(PDF, 'ajeno.pdf', t.other.owner.cookie, t.other.id)).json().file.id;
    const tr = await send(ctx, 'POST', `/drugstores/${t.id}/trainings`, { workerId: w, topicId: tp, supportFileId: foreign }, t.owner.cookie);
    expect(tr.statusCode).toBe(404);
    const ok = (await send(ctx, 'POST', `/drugstores/${t.id}/trainings`, { workerId: w, topicId: tp }, t.owner.cookie)).json().item.id;
    const up = await send(ctx, 'PATCH', `/drugstores/${t.id}/trainings/${ok}`, { supportFileId: foreign }, t.owner.cookie);
    expect(up.statusCode).toBe(404);
  });
});

describe('aislamiento entre droguerías', () => {
  const some = '99999999-9999-4999-8999-999999999999';
  itIsolates(() => ctx, () => t, (id) => [
    ['POST', `/drugstores/${id}/files`, { x: 1 }],
    ['GET', `/drugstores/${id}/files/${some}`],
    ['DELETE', `/drugstores/${id}/files/${some}`],
  ]);

  it('una cuenta ajena no sube ni descarga; un miembro de B no alcanza archivos de A', async () => {
    const id = (await upload(PDF)).json().file.id;
    expect((await upload(PDF, 'x.pdf', t.outsider.cookie)).statusCode).toBe(404);
    expect((await download(id, t.outsider.cookie)).statusCode).toBe(404);
    expect((await download(id, t.other.owner.cookie, t.other.id)).statusCode).toBe(404);
    expect((await send(ctx, 'DELETE', `/drugstores/${t.other.id}/files/${id}`, undefined, t.other.owner.cookie)).statusCode).toBe(404);
    expect((await download(id)).statusCode).toBe(200);
  });
});
