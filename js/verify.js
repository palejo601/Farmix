// Verificación de lote y fechas: un dato leído en la foto solo se da por SEGURO si una segunda lectura independiente
// —el renglón recortado de la foto a resolución completa, ampliado y leído con dos tratamientos— da exactamente lo mismo.
// Si la segunda lectura da otro valor, el dato queda dudoso con las dos opciones; si no se puede verificar, queda dudoso.
import { recognize, nativeOcrEngine } from './ocr.js';
import { enhance, freeCanvas } from './photos.js';
import { extractFields } from './extract.js';
import { fixLotLines } from './glyphs.js';

const LD = ['lote', 'fechaFabricacion', 'vencimiento'];
const nrm = v => (v || '').toUpperCase().replace(/[\s.\-\/]/g, '');

// fields: salida de extractFields (con .box en coordenadas de la imagen leída de ancho baseW). hi: Blob de la foto completa.
export async function verifyFields(fields, hi, baseW, progress = () => {}) {
  const todo = fields.filter(f => LD.includes(f.field) && f.box);
  if (!todo.length || !(hi instanceof Blob)) { for (const f of fields) if (LD.includes(f.field) && !f.doubt) markUnverified(f); return fields; }
  let bmp; try { bmp = await createImageBitmap(hi); } catch { for (const f of todo) markUnverified(f); return fields; }
  const s = bmp.width / baseW, native = !!(await nativeOcrEngine());
  try {
    for (const f of todo) {
      progress('Verificando ' + f.label.toLowerCase() + '…');
      const b = f.box, h = Math.max(8, Math.min(b.y1 - b.y0, b.x1 - b.x0));    // lado corto: sirve también para texto vertical
      const vert = b.y1 - b.y0 > (b.x1 - b.x0) * 1.5, px = h * (vert ? 0.6 : 1.5), py = h * (vert ? 1.5 : 0.6);
      const x0 = Math.max(0, (b.x0 - px) * s), y0 = Math.max(0, (b.y0 - py) * s);
      const x1 = Math.min(bmp.width, (b.x1 + px) * s), y1 = Math.min(bmp.height, (b.y1 + py) * s);
      const k = Math.min(4, 48 / (h * s)), c = document.createElement('canvas');
      c.width = Math.max(8, Math.round((x1 - x0) * k)); c.height = Math.max(8, Math.round((y1 - y0) * k));
      const cx = c.getContext('2d'); cx.imageSmoothingQuality = 'high'; cx.drawImage(bmp, x0, y0, x1 - x0, y1 - y0, 0, 0, c.width, c.height);
      // Segunda imagen: binarizada para Tesseract; para el lector nativo, en grises con más contraste (lee mejor fotos que binarios).
      let e;
      if (native) { e = document.createElement('canvas'); e.width = c.width; e.height = c.height; const ex = e.getContext('2d'); ex.filter = 'grayscale(1) contrast(1.5)'; ex.drawImage(c, 0, 0); }
      else e = enhance(c);
      const reads = [];
      try {
        for (const [img, psm] of [[c, '6'], [e, '6']]) {
          const r = await recognize(img, () => {}, psm);
          fixLotLines(img, r.lines);
          const hit = extractFields(r.lines).fields.find(x => x.field === f.field);
          if (hit) reads.push(hit.value);
        }
      } finally { freeCanvas(c); freeCanvas(e); }
      const agree = reads.filter(v => nrm(v) === nrm(f.value)).length;
      const other = reads.find(v => nrm(v) !== nrm(f.value));
      if (agree && !other) { f.verified = true; if (f.doubt && !f.notes.some(n => /B u 8|no parece válida|no es anterior/.test(n))) Object.assign(f, { doubt: false, checked: true }); f.notes.push('Verificado con una segunda lectura ampliada.'); }
      else if (other) Object.assign(f, { doubt: true, checked: false, alt: f.alt || other, notes: [...f.notes, `La lectura ampliada dio «${other}»: elija el que coincide con el empaque.`] });
      else markUnverified(f);
    }
  } finally { bmp.close?.(); }
  for (const f of fields) if (LD.includes(f.field) && !f.box && !f.doubt) markUnverified(f);
  return fields;
}
function markUnverified(f) { if (!f.verified) Object.assign(f, { doubt: true, checked: false, notes: [...f.notes, 'No se pudo confirmar con una segunda lectura: compárelo con el empaque.'] }); }
