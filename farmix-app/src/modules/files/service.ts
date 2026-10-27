import { createHash, randomBytes } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { and, eq, isNull } from 'drizzle-orm';
import type { Config } from '../../config/env.js';
import type { Db } from '../../db/client.js';
import { supportFiles as t, trainings } from '../../db/schema.js';
import { audit } from '../../shared/audit.js';
import { invalid, notFound } from '../../shared/crud.js';
import type { Membership } from '../drugstores/guard.js';
import { MAX_FILE_BYTES } from './schema.js';

type Detected = { mime: 'application/pdf' | 'image/png' | 'image/jpeg'; ext: 'pdf' | 'png' | 'jpg' };

/** El tipo se decide por los bytes iniciales, nunca por el nombre ni por el Content-Type declarado. */
export function detectType(buf: Buffer): Detected | null {
  if (buf.subarray(0, 5).toString('latin1') === '%PDF-') return { mime: 'application/pdf', ext: 'pdf' };
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: 'image/png', ext: 'png' };
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  return null;
}

/** Nombre para mostrar: sin rutas, sin caracteres de control, longitud acotada. */
export function cleanName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? '';
  const cleaned = base.replace(/[\u0000-\u001f\u007f"<>|?*:]/g, '_').trim().slice(0, 120);
  return cleaned || 'soporte';
}

const scope = (id: string) => and(eq(t.drugstoreId, id), isNull(t.deletedAt));
const toDto = (r: typeof t.$inferSelect) => ({
  id: r.id, originalName: r.originalName, mimeType: r.mimeType as Detected['mime'], sizeBytes: r.sizeBytes, createdAt: r.createdAt.toISOString(),
});

const storagePath = (cfg: Config, drugstoreId: string, storedName: string) => path.resolve(cfg.STORAGE_DIR, drugstoreId, storedName);

export async function upload(db: Db, cfg: Config, m: Membership, userId: string, input: { filename: string; data: Buffer }, requestId: string) {
  if (input.data.length === 0) throw invalid('El archivo está vacío');
  if (input.data.length > MAX_FILE_BYTES) throw invalid('El archivo supera el tamaño máximo');
  const type = detectType(input.data);
  if (!type) throw invalid('Tipo de archivo no permitido: solo PDF, PNG o JPEG');
  const storedName = `${randomBytes(16).toString('hex')}.${type.ext}`;
  const file = storagePath(cfg, m.drugstore.id, storedName);
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  await writeFile(file, input.data, { flag: 'wx', mode: 0o600 });
  const [row] = await db
    .insert(t)
    .values({
      drugstoreId: m.drugstore.id, originalName: cleanName(input.filename), storedName, mimeType: type.mime, sizeBytes: input.data.length,
      sha256: createHash('sha256').update(input.data).digest('hex'), createdBy: userId, updatedBy: userId,
    })
    .returning();
  await audit(db, { userId, action: 'files.upload', resource: 'support_files', resourceId: row!.id, outcome: 'success', requestId });
  return toDto(row!);
}

export async function open(db: Db, cfg: Config, m: Membership, userId: string, id: string, requestId: string) {
  const [row] = await db.select().from(t).where(and(scope(m.drugstore.id), eq(t.id, id))).limit(1);
  if (!row) throw notFound();
  await audit(db, { userId, action: 'files.download', resource: 'support_files', resourceId: id, outcome: 'success', requestId });
  return { row, stream: createReadStream(storagePath(cfg, m.drugstore.id, row.storedName)) };
}

export async function remove(db: Db, m: Membership, userId: string, id: string, requestId: string) {
  const [row] = await db.select({ id: t.id }).from(t).where(and(scope(m.drugstore.id), eq(t.id, id))).limit(1);
  if (!row) throw notFound();
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.update(trainings).set({ supportFileId: null, updatedBy: userId, updatedAt: now }).where(and(eq(trainings.drugstoreId, m.drugstore.id), eq(trainings.supportFileId, id)));
    await tx.update(t).set({ deletedAt: now, updatedBy: userId, updatedAt: now }).where(and(scope(m.drugstore.id), eq(t.id, id)));
  });
  await audit(db, { userId, action: 'files.delete', resource: 'support_files', resourceId: id, outcome: 'success', requestId });
}
