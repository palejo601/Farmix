import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { z } from 'zod';
import type { Db } from '../../db/client.js';
import { expirationProducts, segregationChecks, wasteRecords } from '../../db/schema.js';
import { todaySql } from '../../shared/crud.js';
import { sql } from 'drizzle-orm';
import { createBody as expirationBody } from '../expirations/schema.js';
import { createBody as segregationBody } from '../segregation/schema.js';
import { createBody as wasteBody } from '../waste/schema.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;
export type KindKey = 'expirations' | 'waste' | 'segregation';
export const KIND_KEYS = ['expirations', 'waste', 'segregation'] as const;

type Tx = Pick<Db, 'insert' | 'update' | 'select'>;

export interface Kind {
  key: KindKey;
  /** Campo de la API → encabezados aceptados en el archivo (normalizados, sin tildes). */
  columns: Record<string, string[]>;
  required: string[];
  numeric: string[];
  schema: z.ZodType<Row>;
  /** Reglas que dependen de la fecha actual u otros campos. Devuelve el mensaje de error o null. */
  check(row: Row, today: string): string | null;
  /** Clave natural para detectar duplicados. */
  naturalKey(row: Row): string;
  loadExisting(db: Db, drugstoreId: string): Promise<Row[]>;
  insert(tx: Tx, drugstoreId: string, userId: string, row: Row): Promise<string>;
  remove(tx: Tx, drugstoreId: string, userId: string, ids: string[]): Promise<void>;
}

const lc = (v: unknown) => String(v ?? '').trim().toLowerCase();
const futureCheck = (field: string, label: string) => (row: Row, today: string) => (row[field] > today ? `${label} no puede ser futura` : null);
const stamp = (userId: string) => ({ deletedAt: new Date(), updatedBy: userId, updatedAt: new Date() });

const expirations: Kind = {
  key: 'expirations',
  columns: {
    productName: ['producto', 'nombre', 'nombre_producto', 'medicamento'],
    batch: ['lote'],
    sanitaryRegistry: ['registro_sanitario', 'registro'],
    holder: ['titular'],
    expiresOn: ['vencimiento', 'fecha_vencimiento', 'fecha_de_vencimiento'],
    quantity: ['cantidad'],
    unitCost: ['costo', 'costo_unitario'],
    destination: ['destino'],
    supportRef: ['soporte'],
  },
  required: ['productName', 'batch', 'expiresOn', 'quantity'],
  numeric: ['quantity', 'unitCost'],
  schema: expirationBody,
  check: () => null,
  naturalKey: (r) => `${lc(r.productName)}|${lc(r.batch)}`,
  async loadExisting(db, id) {
    return db.select({ productName: expirationProducts.productName, batch: expirationProducts.batch })
      .from(expirationProducts).where(and(eq(expirationProducts.drugstoreId, id), isNull(expirationProducts.deletedAt)));
  },
  async insert(tx, drugstoreId, userId, r) {
    const dest = r.destination ?? 'pendiente';
    const [row] = await tx.insert(expirationProducts).values({
      drugstoreId, productName: r.productName, batch: r.batch, sanitaryRegistry: r.sanitaryRegistry ?? null, holder: r.holder ?? null,
      expiresOn: r.expiresOn, quantity: r.quantity, unitCost: Number(r.unitCost ?? 0).toFixed(2), destination: dest,
      supportRef: r.supportRef ?? null, managedAt: dest === 'pendiente' ? null : new Date(), createdBy: userId, updatedBy: userId,
    }).returning({ id: expirationProducts.id });
    return row!.id;
  },
  async remove(tx, drugstoreId, userId, ids) {
    if (ids.length) await tx.update(expirationProducts).set(stamp(userId)).where(and(eq(expirationProducts.drugstoreId, drugstoreId), inArray(expirationProducts.id, ids)));
  },
};

const waste: Kind = {
  key: 'waste',
  columns: {
    recordedOn: ['fecha', 'fecha_registro'],
    classification: ['clasificacion'],
    quantity: ['cantidad'],
    unit: ['unidad'],
    origin: ['origen'],
    notes: ['notas', 'observaciones'],
    wasteType: ['tipo', 'tipo_de_residuo'],
    handling: ['manejo', 'como_se_manejo'],
    supportRef: ['soporte'],
  },
  required: ['recordedOn', 'classification', 'quantity', 'unit'],
  numeric: ['quantity'],
  schema: wasteBody,
  check(r, today) {
    if (r.origin === 'medicamento_vencido' && r.classification === 'riesgo_biologico') return 'Un medicamento vencido no se clasifica como riesgo biológico';
    return futureCheck('recordedOn', 'La fecha')(r, today);
  },
  naturalKey: (r) => [r.recordedOn, r.classification, Number(r.quantity), r.unit, r.origin ?? '', lc(r.notes)].join('|'),
  async loadExisting(db, id) {
    const rows = await db.select().from(wasteRecords).where(and(eq(wasteRecords.drugstoreId, id), isNull(wasteRecords.deletedAt)));
    return rows.map((r) => ({ ...r, quantity: Number(r.quantity) }));
  },
  async insert(tx, drugstoreId, userId, r) {
    const [row] = await tx.insert(wasteRecords).values({
      drugstoreId, recordedOn: r.recordedOn, classification: r.classification, quantity: String(r.quantity), unit: r.unit,
      origin: r.origin ?? null, notes: r.notes ?? null, wasteType: r.wasteType ?? null, handling: r.handling ?? null, supportRef: r.supportRef ?? null,
      createdBy: userId, updatedBy: userId,
    }).returning({ id: wasteRecords.id });
    return row!.id;
  },
  async remove(tx, drugstoreId, userId, ids) {
    if (ids.length) await tx.update(wasteRecords).set(stamp(userId)).where(and(eq(wasteRecords.drugstoreId, drugstoreId), inArray(wasteRecords.id, ids)));
  },
};

const segregation: Kind = {
  key: 'segregation',
  columns: {
    checkedOn: ['fecha', 'fecha_verificacion'],
    location: ['lugar', 'ubicacion'],
    itemsReviewed: ['revisados', 'items_revisados'],
    itemsCorrect: ['bien_segregados', 'correctos', 'items_correctos'],
    observations: ['observaciones', 'notas'],
  },
  required: ['checkedOn', 'location', 'itemsReviewed', 'itemsCorrect'],
  numeric: ['itemsReviewed', 'itemsCorrect'],
  schema: segregationBody,
  check: futureCheck('checkedOn', 'La fecha'),
  naturalKey: (r) => [r.checkedOn, lc(r.location), r.itemsReviewed, r.itemsCorrect, lc(r.observations)].join('|'),
  async loadExisting(db, id) {
    return db.select().from(segregationChecks).where(and(eq(segregationChecks.drugstoreId, id), isNull(segregationChecks.deletedAt)));
  },
  async insert(tx, drugstoreId, userId, r) {
    const [row] = await tx.insert(segregationChecks).values({
      drugstoreId, checkedOn: r.checkedOn, itemsReviewed: r.itemsReviewed, itemsCorrect: r.itemsCorrect, location: r.location,
      observations: r.observations ?? null, createdBy: userId, updatedBy: userId,
    }).returning({ id: segregationChecks.id });
    return row!.id;
  },
  async remove(tx, drugstoreId, userId, ids) {
    if (ids.length) await tx.update(segregationChecks).set(stamp(userId)).where(and(eq(segregationChecks.drugstoreId, drugstoreId), inArray(segregationChecks.id, ids)));
  },
};

export const KINDS: Record<KindKey, Kind> = { expirations, waste, segregation };

export type RowState = 'valida' | 'invalida' | 'duplicada';
export interface RowResult {
  row: number;
  state: RowState;
  errors: string[];
  data?: Row;
}

export async function getToday(db: Db): Promise<string> {
  const r = await db.execute(sql`SELECT to_char(${todaySql}, 'YYYY-MM-DD') AS d`);
  return (r.rows[0] as { d: string }).d;
}

/** Valida fila por fila y detecta duplicados dentro del lote y contra lo ya registrado. No escribe nada. */
export async function analyze(db: Db, kind: Kind, drugstoreId: string, rows: { n: number; data: Row }[]): Promise<RowResult[]> {
  const today = await getToday(db);
  const existing = new Set((await kind.loadExisting(db, drugstoreId)).map((r) => kind.naturalKey(r)));
  const seen = new Map<string, number>();
  return rows.map(({ n, data }): RowResult => {
    const parsed = kind.schema.safeParse(data);
    if (!parsed.success) {
      return { row: n, state: 'invalida', errors: parsed.error.issues.map((i) => `${i.path.join('.') || 'fila'}: ${i.message}`) };
    }
    const msg = kind.check(parsed.data, today);
    if (msg) return { row: n, state: 'invalida', errors: [msg] };
    const key = kind.naturalKey(parsed.data);
    if (seen.has(key)) return { row: n, state: 'duplicada', errors: [`Repetida en el archivo (igual a la fila ${seen.get(key)})`] };
    if (existing.has(key)) return { row: n, state: 'duplicada', errors: ['Ya existe en la droguería'] };
    seen.set(key, n);
    return { row: n, state: 'valida', errors: [], data: parsed.data };
  });
}
