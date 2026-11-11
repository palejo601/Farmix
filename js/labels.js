// Motor de rótulos: calcula la distribución en milímetros una sola vez y la misma geometría
// se usa para la vista previa, la impresión (SVG), el PDF y el Word. Así la vista previa es fiel.
export const SIZES = [
  ['Grande', 100, 70], ['Mediano', 70, 50], ['Pequeño', 50, 30], ['Blíster', 40, 20], ['Ampolla o vial', 30, 15], ['Tableta o cápsula', 20, 10],
];
export const LABEL_FIELDS = [
  ['nombre', 'Nombre del producto'], ['principioActivo', 'Principio activo'], ['concentracion', 'Concentración'], ['presentacion', 'Presentación'],
  ['lote', 'Lote'], ['vencimiento', 'Vencimiento'], ['laboratorio', 'Laboratorio'], ['codigoBarras', 'Código de barras'],
  ['condiciones', 'Condiciones de almacenamiento'], ['ubicacion', 'Ubicación'],
];
export const PAPERS = { A4: [210, 297], Carta: [215.9, 279.4], Legal: [215.9, 355.6] };
const FONT = 'Arial, Helvetica, sans-serif';
const MIN_FONT = 1.25;      // mm (≈3,5 pt): por debajo de esto el texto deja de ser legible
const MIN_MODULE = 0.165;   // mm: ancho mínimo de barra para que el código siga siendo legible
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

let mctx = null;
const mcache = new Map();
// Ancho del texto para tamaño de letra 1 (se multiplica por el tamaño en mm). Margen de seguridad del 3 %.
export function measure(text, bold) {
  const k = (bold ? 'b' : 'n') + text;
  let v = mcache.get(k);
  if (v == null) {
    mctx ||= document.createElement('canvas').getContext('2d');
    mctx.font = `${bold ? 'bold ' : ''}100px ${FONT}`;
    v = mctx.measureText(text).width / 100 * 1.03;
    if (mcache.size > 4000) mcache.clear();
    mcache.set(k, v);
  }
  return v;
}

function wrap(text, size, bold, W) {
  const out = []; let line = '';
  const push = w => {
    while (measure(w, bold) * size > W && w.length > 1) {      // palabra más ancha que el rótulo: se parte, no se recorta
      let n = w.length - 1;
      while (n > 1 && measure(w.slice(0, n), bold) * size > W) n--;
      out.push(w.slice(0, n)); w = w.slice(n);
    }
    return w;
  };
  for (let w of text.split(/\s+/).filter(Boolean)) {
    const t = line ? line + ' ' + w : w;
    if (measure(t, bold) * size <= W) line = t;
    else { if (line) out.push(line); line = push(w); }
  }
  if (line) out.push(line);
  return out;
}

// Codificación de barras con JsBarcode (solo se usa su codificador; el dibujo es propio para conservar proporciones).
export function encodeBarcode(code, fmtLabel) {
  if (!code || !self.JsBarcode) return null;
  const digits = /^\d+$/.test(code);
  const pref = { 'EAN-13': 'EAN13', 'EAN-8': 'EAN8', 'UPC-A': 'UPC', 'UPC-E': 'UPCE', 'Code 39': 'CODE39', ITF: 'ITF', 'Code 128': 'CODE128' }[fmtLabel];
  const guess = digits && code.length === 13 ? 'EAN13' : digits && code.length === 8 ? 'EAN8' : digits && code.length === 12 ? 'UPC' : 'CODE128';
  for (const format of [...new Set([pref, guess, 'CODE128'].filter(Boolean))]) {
    try {
      const o = {}; let ok = true;
      self.JsBarcode(o, code, { format, flat: true, valid: v => { ok = v; } });
      const bits = (o.encodings || []).map(e => e.data).join('');
      if (ok && bits) return { bits, format };
    } catch { /* se prueba el siguiente formato */ }
  }
  return null;
}

// Calcula el rótulo. o = {w, h, fields:{campo:bool}}. Devuelve {items, blocks, bar, warnings, pad}.
export function layoutLabel(rec, o) {
  const { w, h } = o, on = f => o.fields[f] && (rec[f] || '').toString().trim();
  const P = clamp(Math.min(w, h) * 0.07, 0.7, 3), W = w - 2 * P, H = h - 2 * P, warnings = [];
  let blocks = [];
  const add = (key, text, scale, bold = false) => blocks.push({ key, text, scale, bold });
  if (on('nombre')) add('Nombre', on('nombre'), 1.45, true);
  const pa = [on('principioActivo'), on('concentracion')].filter(Boolean).join(' ');
  if (pa) add('Principio activo / concentración', pa, 1.1);
  if (on('presentacion')) add('Presentación', on('presentacion'), 0.95);
  const lot = on('lote') ? 'Lote: ' + on('lote') : '', ven = on('vencimiento') ? 'Vence: ' + on('vencimiento') : '';
  if (lot && ven) add('Lote / vencimiento', lot + ' ' + ven, 1.1, true); else if (lot || ven) add('Lote / vencimiento', lot || ven, 1.1, true);
  if (on('laboratorio')) add('Laboratorio', on('laboratorio'), 0.9);
  if (on('condiciones')) add('Almacenamiento', on('condiciones'), 0.85);
  if (on('ubicacion')) add('Ubicación', 'Ubic.: ' + on('ubicacion'), 0.85);

  // Código de barras: conserva la proporción de módulos y sus zonas de silencio.
  let bar = null;
  if (on('codigoBarras')) {
    const enc = encodeBarcode(on('codigoBarras'), rec.formatoCodigo);
    if (!enc) warnings.push('El código de barras no se puede representar (caracteres no admitidos).');
    else {
      const n = enc.bits.length + 20, mw = Math.min(0.4, W / n);
      if (mw < MIN_MODULE) warnings.push(`El código de barras no cabe con barras legibles en ${w} × ${h} mm; se omitió. Use un rótulo más ancho.`);
      else bar = { bits: enc.bits, mw, text: on('codigoBarras'), bh: clamp(H * 0.26, 3, 14), ts: clamp(H * 0.06, 1.3, 2.6) };
    }
  }
  const barH = b => b ? b.bh + b.ts * 1.15 + 0.6 : 0;

  // Mayor tamaño de letra con el que todo cabe sin recortes ni superposición.
  const lines = (s, bl = blocks) => bl.map(b => {
    const size = s * b.scale;
    let ls;
    if (b.text.includes(' ')) {           // lote y vencimiento: juntos si caben; si no, en renglones separados
      const one = b.text.replace(' ', '   ');
      ls = measure(one, b.bold) * size <= W ? [one] : b.text.split(' ').flatMap(t => wrap(t, size, b.bold, W));
    } else ls = wrap(b.text, size, b.bold, W);
    return { ...b, size, lines: ls };
  });
  const height = ls => ls.reduce((a, b) => a + b.lines.length * b.size * 1.2 + b.size * 0.12, 0);
  const fit = (avail, bl = blocks) => {
    let lo = MIN_FONT, hi = clamp(H * 0.42, MIN_FONT, 8.5);
    if (height(lines(lo, bl)) > avail) return null;
    for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; if (height(lines(m, bl)) <= avail) lo = m; else hi = m; }
    return lines(lo, bl);
  };
  let laid = blocks.length ? fit(H - barH(bar)) : [];
  if (!laid && bar) { bar.bh = 3; bar.ts = 1.3; laid = fit(H - barH(bar)); }
  if (!laid) {                     // no cabe ni al tamaño mínimo: se retiran los últimos campos y se avisa (nunca se corta texto)
    const dropped = [];
    let bl = blocks.slice();
    while (bl.length > 1 && !(laid = fit(H - barH(bar), bl))) dropped.unshift(bl.pop().key);
    if (!laid && bar) { dropped.push('Código de barras'); bar = null; laid = fit(H, bl); }
    if (!laid) { laid = lines(MIN_FONT, bl).map(b => ({ ...b, lines: b.lines.slice(0, Math.max(1, Math.floor(H / (b.size * 1.2)))) })); warnings.push('El nombre es demasiado largo para este tamaño de rótulo.'); }
    if (dropped.length) warnings.push(`No caben en ${w} × ${h} mm y se omitieron: ${dropped.join(', ')}. Elija un tamaño mayor o desmarque campos.`);
    blocks = bl;
  }

  const items = [], textH = height(laid);
  let y = P + (bar ? 0 : Math.max(0, (H - textH) / 2));
  for (const b of laid) {
    for (const l of b.lines) { y += b.size * 1.2; items.push({ t: 'text', x: w / 2, y: y - b.size * 0.3, size: b.size, bold: b.bold, text: l }); }
    y += b.size * 0.12;
  }
  if (bar) {
    const bw = bar.bits.length * bar.mw, top = h - P - barH(bar) + 0.6;
    bar.x = (w - bw) / 2; bar.y = top;
    items.push({ t: 'bars', x: bar.x, y: top, mw: bar.mw, h: bar.bh, bits: bar.bits });
    items.push({ t: 'text', x: w / 2, y: top + bar.bh + bar.ts, size: bar.ts, bold: false, text: bar.text, mono: true });
  }
  return { items, blocks: laid, bar, warnings, pad: P };
}

// Distribución de la hoja. Devuelve {pw, ph, per, pages, error}
export function sheetGeometry(sh, w, h, total) {
  const usedW = sh.ml + sh.mr + sh.cols * w + (sh.cols - 1) * sh.gh, usedH = sh.mt + sh.mb + sh.rows * h + (sh.rows - 1) * sh.gv;
  let error = '';
  if (usedW > sh.pw + 0.05) error = `No caben ${sh.cols} rótulos por fila: se necesitan ${usedW.toFixed(1)} mm y la hoja mide ${sh.pw} mm de ancho.`;
  else if (usedH > sh.ph + 0.05) error = `No caben ${sh.rows} rótulos por columna: se necesitan ${usedH.toFixed(1)} mm y la hoja mide ${sh.ph} mm de alto.`;
  const per = sh.cols * sh.rows;
  return { per, pages: Math.ceil(total / per) || 0, error };
}
export const maxFit = (sh, w, h) => ({
  cols: Math.max(1, Math.floor((sh.pw - sh.ml - sh.mr + sh.gh + 0.05) / (w + sh.gh))),
  rows: Math.max(1, Math.floor((sh.ph - sh.mt - sh.mb + sh.gv + 0.05) / (h + sh.gv))),
});
export const cellXY = (sh, w, h, i) => ({ x: sh.ml + (i % sh.cols) * (w + sh.gh), y: sh.mt + Math.floor(i / sh.cols) * (h + sh.gv) });

const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const n3 = v => +v.toFixed(3);
export function runs(bits) { const r = []; let i = 0; while (i < bits.length) { if (bits[i] === '1') { let j = i; while (bits[j] === '1') j++; r.push([i, j - i]); i = j; } else i++; } return r; }

// SVG de una página completa con unidades en mm (viewBox = hoja). physical=true fija ancho/alto reales para imprimir.
export function pageSVG(labels, sh, w, h, border, physical) {
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sh.pw} ${sh.ph}" ${physical ? `width="${sh.pw}mm" height="${sh.ph}mm"` : ''} font-family="${FONT}" fill="#000">`;
  labels.forEach((lay, i) => {
    const { x, y } = cellXY(sh, w, h, i);
    s += `<g transform="translate(${n3(x)} ${n3(y)})">`;
    if (border) s += `<rect x="0.1" y="0.1" width="${n3(w - 0.2)}" height="${n3(h - 0.2)}" rx="0.8" fill="none" stroke="#555" stroke-width="0.15"/>`;
    for (const it of lay.items) {
      if (it.t === 'text') s += `<text x="${n3(it.x)}" y="${n3(it.y)}" font-size="${n3(it.size)}" text-anchor="middle"${it.bold ? ' font-weight="bold"' : ''}${it.mono ? ' letter-spacing="0.08em"' : ''}>${esc(it.text)}</text>`;
      else s += `<g shape-rendering="crispEdges">` + runs(it.bits).map(([a, n]) => `<rect x="${n3(it.x + a * it.mw)}" y="${n3(it.y)}" width="${n3(n * it.mw)}" height="${n3(it.h)}"/>`).join('') + `</g>`;
    }
    s += `</g>`;
  });
  return s + `</svg>`;
}
