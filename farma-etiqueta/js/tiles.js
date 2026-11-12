// Texto pequeño y aislado (lote y fechas impresos junto al código de barras, en una esquina…): la lectura de la página
// completa a veces ni lo detecta. Aquí la foto se lee por partes ampliadas (cuadrícula con solape), saltando las zonas
// lisas. Si aparecen renglones de lote o fechas, esa zona se recorta, se amplía y se lee de nuevo con dos tratamientos
// (normal y realzado) para detectar confusiones típicas (B/8, O/0, G/6): si las dos lecturas difieren, el dato queda dudoso.
import { recognize } from './ocr.js';
import { enhance, freeCanvas } from './photos.js';
import { fixLotLines } from './glyphs.js';

const LABEL = /(?:^|[\s\[\(|])(?:[LFV](?=\s?[\]\)|]?\s?[.:\-]\s?\S)|L[O0]TE?|BATCH|VENC\w*|VENCE|VTO|EXP\w*|CAD\w*|FAB\w*|ELAB\w*|MFG)/i;

// ¿Tiene la zona bordes suficientes para contener texto? (descarta fondos lisos o desenfocados).
function busy(src, x, y, w, h) {
  const c = document.createElement('canvas'), k = Math.min(1, 220 / Math.max(w, h));
  c.width = Math.max(2, Math.round(w * k)); c.height = Math.max(2, Math.round(h * k));
  const cx = c.getContext('2d', { willReadFrequently: true }); cx.drawImage(src, x, y, w, h, 0, 0, c.width, c.height);
  const d = cx.getImageData(0, 0, c.width, c.height).data; let e = 0;
  for (let i = 4; i < d.length; i += 4) if (Math.abs(d[i] - d[i - 4]) > 40) e++;
  c.width = c.height = 0;
  return e / (c.width * c.height || (d.length / 4)) > 0.015;
}
function crop(src, x, y, w, h, k) {
  const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
  const cx = c.getContext('2d'); cx.imageSmoothingQuality = 'high'; cx.drawImage(src, x, y, w, h, 0, 0, c.width, c.height);
  return c;
}

// Devuelve { lines, alt } — alt: lectura realzada de la zona de lote/fechas (null si no se encontró esa zona).
// hi: la misma foto a resolución completa (Blob), para releer la zona de lote y fechas con todo el detalle.
export async function readTiles(src, progress = () => {}, alive = () => true, hi = null, cols = 2, rows = 3) {
  const W = src.width, H = src.height, tw = W / cols * 1.2, th = H / rows * 1.2, K = 2, all = [];
  let n = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (!alive()) return { lines: all, alt: null };
    n++;
    const x = Math.max(0, Math.min(W - tw, c * W / cols - tw * 0.08)), y = Math.max(0, Math.min(H - th, r * H / rows - th * 0.08));
    if (!busy(src, x, y, tw, th)) continue;
    progress(`Leyendo la foto por partes (${n} de ${cols * rows})…`);
    const cv = crop(src, x, y, tw, th, K);
    try {
      const res = await recognize(cv, () => {}, '11');
      const tr = b => b && { x0: x + b.x0 / K, y0: y + b.y0 / K, x1: x + b.x1 / K, y1: y + b.y1 / K };
      for (const l of res.lines) all.push({ ...l, box: l.bbox && { x: x + l.bbox.x0 / K, y: y + l.bbox.y0 / K, x1: x + l.bbox.x1 / K, y1: y + l.bbox.y1 / K }, words: (l.words || []).map(w => ({ ...w, bbox: tr(w.bbox) })) });
    } finally { freeCanvas(cv); }
  }
  // Zona de lote y fechas: renglones con etiqueta (L. F. V. LOTE VENCE…) cercanos entre sí.
  const lab = all.filter(l => l.box && LABEL.test(l.text) && /\d/.test(l.text));
  if (!lab.length || !alive()) return { lines: all, alt: null };
  const lh = Math.max(...lab.map(l => l.box.y1 - l.box.y)) || 20;
  const ref = lab[0].box, near = lab.filter(l => Math.abs(l.box.y - ref.y) < lh * 6 && Math.abs(l.box.x - ref.x) < lh * 12);
  const x0 = Math.min(...near.map(l => l.box.x)) - lh, y0 = Math.min(...near.map(l => l.box.y)) - lh;
  const x1 = Math.max(...near.map(l => l.box.x1)) + lh, y1 = Math.max(...near.map(l => l.box.y1)) + lh;
  const rx = Math.max(0, x0), ry = Math.max(0, y0), rw = Math.min(W, x1) - rx, rh = Math.min(H, y1) - ry;
  progress('Releyendo lote y fechas ampliados…');
  let big = null, s = 1;
  try { if (hi instanceof Blob) { big = await createImageBitmap(hi); s = big.width / W; if (s < 1.05) { big.close(); big = null; s = 1; } } } catch { big = null; s = 1; }
  const k = Math.min(4, 45 / (lh * s));                        // renglones de ~45 px: el tamaño que mejor lee Tesseract
  const zc = crop(big || src, rx * s, ry * s, rw * s, rh * s, k), ec = enhance(zc);
  big?.close();
  try {
    const a = await recognize(zc, () => {}, '6'), b = await recognize(ec, () => {}, '6');
    fixLotLines(zc, a.lines); fixLotLines(zc, b.lines);
    // Las palabras de la zona releída pasan a coordenadas de la foto completa; las de las partes se descartan para no duplicar.
    const tz = w => w.bbox && { x0: rx + w.bbox.x0 / (k * s), y0: ry + w.bbox.y0 / (k * s), x1: rx + w.bbox.x1 / (k * s), y1: ry + w.bbox.y1 / (k * s) };
    for (const L of [...a.lines, ...b.lines]) L.words = (L.words || []).map(w => ({ ...w, bbox: tz(w) }));
    for (const L of all) L.words = [];
    return { lines: [...a.lines, ...all], alt: b.lines };
  } finally { freeCanvas(zc); freeCanvas(ec); }
}
