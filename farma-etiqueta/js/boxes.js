// Casillas impresas en empaques: recuadros pequeños con una letra (L = lote, F = fabricación, V = vencimiento).
// 1) Se binariza la imagen con umbral adaptativo y se buscan contornos rectangulares huecos (los cuatro lados marcados,
//    el interior casi vacío salvo la letra). Así no se confunden con letras como O, D o 0.
// 2) La letra de cada casilla se recorta, se amplía, se le sube el contraste y se lee sola (solo se admiten L, F o V).
// 3) El valor se lee en la franja a la derecha de la casilla y, si no hay nada válido, en la franja de abajo.
// 4) Si algo no es seguro (letra dudosa, valor dudoso, letras repetidas con valores distintos, fabricación ≥ vencimiento),
//    el dato queda pendiente de revisión: nunca se intercambian ni se completan valores.
import { recognize } from './ocr.js';
import { ym, findDates, lotOK, monthToNumber } from './extract.js';

const FIELD = { L: ['lote', 'Número de lote'], F: ['fechaFabricacion', 'Fecha de fabricación'], V: ['vencimiento', 'Fecha de vencimiento'] };
const MAX_BOXES = 8;

// Devuelve los recuadros encontrados [{x, y, w, h}] en coordenadas de la imagen original.
export function findBoxes(src) {
  const k = Math.min(1, 1400 / Math.max(src.width, src.height));
  const W = Math.max(1, Math.round(src.width * k)), H = Math.max(1, Math.round(src.height * k));
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(src, 0, 0, W, H);
  const px = x.getImageData(0, 0, W, H).data; c.width = c.height = 0;
  const N = W * H, g = new Uint8Array(N);
  for (let i = 0, j = 0; i < N; i++, j += 4) g[i] = (px[j] * 77 + px[j + 1] * 150 + px[j + 2] * 29) >> 8;
  // Umbral adaptativo con imagen integral: oscuro = más oscuro que su entorno.
  const I = new Float64Array((W + 1) * (H + 1));
  for (let yy = 0; yy < H; yy++) { let row = 0; for (let xx = 0; xx < W; xx++) { row += g[yy * W + xx]; I[(yy + 1) * (W + 1) + xx + 1] = I[yy * (W + 1) + xx + 1] + row; } }
  const r = Math.max(6, Math.round(Math.min(W, H) / 50)), dark = new Uint8Array(N);
  for (let yy = 0; yy < H; yy++) {
    const y0 = Math.max(0, yy - r), y1 = Math.min(H, yy + r + 1);
    for (let xx = 0; xx < W; xx++) {
      const x0 = Math.max(0, xx - r), x1 = Math.min(W, xx + r + 1);
      const s = I[y1 * (W + 1) + x1] - I[y0 * (W + 1) + x1] - I[y1 * (W + 1) + x0] + I[y0 * (W + 1) + x0];
      if (g[yy * W + xx] < s / ((y1 - y0) * (x1 - x0)) - 12) dark[yy * W + xx] = 1;
    }
  }
  // Componentes conexos (8 vecinos).
  const lab = new Int32Array(N), stack = new Int32Array(N), comps = [];
  let id = 0;
  for (let p = 0; p < N; p++) {
    if (!dark[p] || lab[p]) continue;
    id++; let sp = 0, n = 0, minx = W, miny = H, maxx = 0, maxy = 0;
    stack[sp++] = p; lab[p] = id;
    while (sp) {
      const q = stack[--sp], qx = q % W, qy = (q - qx) / W; n++;
      if (qx < minx) minx = qx; if (qx > maxx) maxx = qx; if (qy < miny) miny = qy; if (qy > maxy) maxy = qy;
      for (let dy = -1; dy <= 1; dy++) { const ny = qy + dy; if (ny < 0 || ny >= H) continue;
        for (let dx = -1; dx <= 1; dx++) { const nx = qx + dx; if (nx < 0 || nx >= W) continue; const t = ny * W + nx; if (dark[t] && !lab[t]) { lab[t] = id; stack[sp++] = t; } } }
    }
    comps.push({ id, n, x: minx, y: miny, w: maxx - minx + 1, h: maxy - miny + 1 });
  }
  const lim = Math.min(W, H) * 0.15, boxes = [];
  for (const b of comps) {
    if (b.w < 9 || b.h < 9 || b.w > lim || b.h > lim) continue;
    const ar = b.w / b.h; if (ar < 0.55 || ar > 1.9) continue;
    if (b.n / (b.w * b.h) > 0.5) continue;                       // relleno: no es un contorno
    const band = Math.max(1, Math.round(Math.min(b.w, b.h) * 0.2));
    const at = (xx, yy) => lab[yy * W + xx] === b.id;
    const side = (horiz, from) => {                              // fracción del lado cubierta por el contorno
      let hit = 0, len = horiz ? b.w : b.h;
      for (let t = 0; t < len; t++) {
        let ok = false;
        for (let d = 0; d < band && !ok; d++) ok = horiz ? at(b.x + t, from ? b.y + d : b.y + b.h - 1 - d) : at(from ? b.x + d : b.x + b.w - 1 - d, b.y + t);
        if (ok) hit++;
      }
      return hit / len;
    };
    if (side(true, true) < 0.75 || side(true, false) < 0.75 || side(false, true) < 0.75 || side(false, false) < 0.75) continue;
    // Interior: el contorno no entra (no es una letra gruesa) y hay una letra adentro (otra mancha oscura).
    let inOwn = 0, inDark = 0, inArea = 0;
    for (let yy = b.y + band; yy < b.y + b.h - band; yy++) for (let xx = b.x + band; xx < b.x + b.w - band; xx++) {
      inArea++; const t = yy * W + xx; if (lab[t] === b.id) inOwn++; else if (dark[t]) inDark++;
    }
    if (!inArea || inOwn / inArea > 0.12 || inDark / inArea < 0.04 || inDark / inArea > 0.6) continue;
    boxes.push({ x: b.x / k, y: b.y / k, w: b.w / k, h: b.h / k });
  }
  return boxes.sort((a, b) => a.y - b.y || a.x - b.x).slice(0, MAX_BOXES);
}

// Recorta, amplía a la altura indicada, sube el contraste y deja margen blanco (Tesseract lee mejor con margen).
function cut(src, rx, ry, rw, rh, outH) {
  rx = Math.max(0, rx); ry = Math.max(0, ry); rw = Math.min(src.width - rx, rw); rh = Math.min(src.height - ry, rh);
  if (rw < 4 || rh < 4) return null;
  const k = outH / rh, pad = Math.round(outH * 0.3), c = document.createElement('canvas');
  c.width = Math.round(rw * k) + 2 * pad; c.height = Math.round(rh * k) + 2 * pad;
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
  x.filter = 'grayscale(1) contrast(1.6)'; x.imageSmoothingQuality = 'high';
  x.drawImage(src, rx, ry, rw, rh, pad, pad, c.width - 2 * pad, c.height - 2 * pad);
  return c;
}
const clean = t => (t || '').replace(/\s+/g, ' ').replace(/^[\s\[\]\(\)\{\}|!:.\-]+/, '').trim();
function parseValue(letter, text) {
  const t = clean(text);
  if (letter === 'L') return lotOK(t);
  const d = findDates(t).find(m => ym(m[0]) != null);
  return d && d.index <= 3 ? monthToNumber(d[0]) : null;
}

// Lee las casillas de la imagen. Devuelve campos con el formato de extractFields: {field, label, value, conf, doubt, notes}.
export async function readBoxes(src, progress = () => {}) {
  const boxes = findBoxes(src);
  if (!boxes.length) return [];
  const found = [];
  for (const b of boxes) {
    progress('Leyendo casillas del empaque…');
    const inset = Math.min(b.w, b.h) * 0.16;
    const lc = cut(src, b.x + inset, b.y + inset, b.w - 2 * inset, b.h - 2 * inset, 70);
    if (!lc) continue;
    let r; try { r = await recognize(lc, () => {}, '10', { tessedit_char_whitelist: 'LFV' }); } finally { lc.width = lc.height = 0; }
    const letter = clean(r.text).toUpperCase();
    if (!/^[LFV]$/.test(letter)) continue;
    found.push({ b, letter, lconf: r.confidence ?? 0 });
  }
  const out = [];
  for (const f of found) {
    const { b, letter } = f;
    // El valor llega hasta la siguiente casilla del mismo renglón (para no mezclar dos valores).
    const next = found.filter(o => o !== f && Math.abs(o.b.y - b.y) < b.h * 0.6 && o.b.x > b.x).sort((p, q) => p.b.x - q.b.x)[0];
    const right = Math.min((next ? next.b.x : src.width) - (b.x + b.w * 1.1), b.h * 10);
    let value = null, vconf = 0, where = '';
    for (const [rx, ry, rw, rh, w] of [[b.x + b.w * 1.1, b.y - b.h * 0.25, right, b.h * 1.5, 'a la derecha'], [b.x - b.w * 0.5, b.y + b.h * 1.05, b.h * 9, b.h * 1.6, 'debajo']]) {
      if (rw < b.h) continue;
      const vc = cut(src, rx, ry, rw, rh, 64); if (!vc) continue;
      let r; try { r = await recognize(vc, () => {}, '7'); } finally { vc.width = vc.height = 0; }
      value = parseValue(letter, r.text); vconf = r.confidence ?? 0; where = w;
      if (value) break;
    }
    if (!value) continue;
    const [field, label] = FIELD[letter], notes = [`Leído de la casilla «${letter}» (valor ${where}).`];
    let doubt = false;
    if (f.lconf < 60) { doubt = true; notes.push('La letra de la casilla no se leyó con claridad.'); }
    if (vconf < 70) { doubt = true; notes.push('El valor junto a la casilla se leyó con poca confianza.'); }
    out.push({ field, label, value, conf: Math.min(f.lconf, vconf), doubt, checked: !doubt, notes });
  }
  // La misma letra en dos casillas con valores distintos: no se sabe cuál es → ambas pendientes de revisión.
  for (const f of out) if (out.some(o => o !== f && o.field === f.field && o.value !== f.value)) { f.doubt = true; f.checked = false; f.notes.push('Hay dos casillas con la misma letra y valores distintos.'); }
  const fF = out.find(o => o.field === 'fechaFabricacion'), fV = out.find(o => o.field === 'vencimiento');
  if (fF && fV && ym(fF.value) >= ym(fV.value)) for (const o of [fF, fV]) { o.doubt = true; o.checked = false; o.notes.push('La fabricación no es anterior al vencimiento: casillas posiblemente confundidas. No se intercambiaron.'); }
  return out.filter((o, i) => out.findIndex(p => p.field === o.field && p.value === o.value) === i);
}

// Combina las casillas con lo leído en el texto: si coinciden, el dato se refuerza; si difieren, queda para revisión.
export function mergeBoxes(fields, boxFields) {
  for (const bf of boxFields) {
    const cur = fields.find(f => f.field === bf.field);
    if (!cur) { fields.push(bf); continue; }
    if (cur.value === bf.value) { if (!bf.doubt && cur.doubt) Object.assign(cur, { doubt: false, checked: true, notes: [...cur.notes, 'Confirmado por la casilla impresa.'] }); continue; }
    if (fields.some(f => f.field === bf.field && f.value === bf.value)) continue;
    Object.assign(cur, { doubt: true, checked: false, notes: [...cur.notes, `La casilla «${bf.notes[0].match(/«(.)»/)?.[1] || ''}» indica «${bf.value}»: valores distintos, revíselos con el empaque.`] });
  }
  return fields;
}
