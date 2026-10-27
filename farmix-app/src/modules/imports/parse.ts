import ExcelJS from 'exceljs';
import { parse } from 'csv-parse/sync';
import { invalid } from '../../shared/crud.js';
import type { Kind, Row } from './kinds.js';

export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 1000;

const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

function cellText(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'object') {
    const o = v as { result?: unknown; richText?: { text: string }[]; text?: unknown };
    if ('result' in o) return cellText(o.result);
    if (o.richText) return o.richText.map((t) => t.text).join('');
    if ('text' in o) return cellText(o.text);
    return '';
  }
  return String(v).trim();
}

/** Devuelve la tabla como filas de texto; la primera es el encabezado. */
export async function readTable(buf: Buffer, filename: string): Promise<string[][]> {
  const isZip = buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;
  if (isZip) {
    const wb = new ExcelJS.Workbook();
    try {
      await wb.xlsx.load(buf as unknown as ArrayBuffer);
    } catch {
      throw invalid('No se pudo leer el archivo de Excel');
    }
    const ws = wb.worksheets[0];
    if (!ws) throw invalid('El libro de Excel no tiene hojas');
    const out: string[][] = [];
    ws.eachRow({ includeEmpty: false }, (row) => {
      const cells: string[] = [];
      for (let c = 1; c <= ws.columnCount; c++) cells.push(cellText(row.getCell(c).value));
      out.push(cells);
    });
    return out;
  }
  if (!/\.csv$/i.test(filename) || buf.includes(0)) throw invalid('Formato no permitido: use un archivo .xlsx o .csv');
  const text = buf.toString('utf8');
  const first = text.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = [';', '\t', ','].map((d) => [d, first.split(d).length] as const).sort((a, b) => b[1] - a[1])[0]![0];
  try {
    return parse(text, { bom: true, delimiter, skip_empty_lines: true, trim: true, relax_column_count: true }) as string[][];
  } catch {
    throw invalid('No se pudo leer el archivo CSV');
  }
}

const toNumber = (s: string) => Number(s.replace(/\s/g, '').replace(',', '.'));

/** Convierte la tabla en filas con los campos de la API; informa columnas obligatorias que faltan. */
export function mapRows(kind: Kind, table: string[][]): { n: number; data: Row }[] {
  const [header, ...body] = table;
  if (!header) throw invalid('El archivo está vacío');
  const idx: Record<string, number> = {};
  for (const [field, aliases] of Object.entries(kind.columns)) {
    const i = header.findIndex((h) => aliases.includes(norm(h)));
    if (i >= 0) idx[field] = i;
  }
  const missing = kind.required.filter((f) => idx[f] === undefined);
  if (missing.length) {
    throw invalid(`Faltan columnas obligatorias: ${missing.map((f) => kind.columns[f]![0]).join(', ')}`);
  }
  if (body.length === 0) throw invalid('El archivo no tiene filas de datos');
  if (body.length > MAX_IMPORT_ROWS) throw invalid(`El archivo supera el máximo de ${MAX_IMPORT_ROWS} filas`);
  return body.map((cells, i) => {
    const data: Row = {};
    for (const [field, col] of Object.entries(idx)) {
      const raw = (cells[col] ?? '').trim();
      if (raw === '') continue;
      data[field] = kind.numeric.includes(field) ? toNumber(raw) : raw;
    }
    return { n: i + 2, data };
  });
}
