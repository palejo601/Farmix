// Lectura de texto EN RELIEVE (troquelado sin tinta: lote y vencimiento marcados a presión sobre cartón blanco).
// El relieve no tiene color propio: solo deja bordes con brillo y sombra. Pasos:
// 1) Detalle local: |gris − promedio del entorno| (resalta bordes de los caracteres y elimina la iluminación).
// 2) Suavizado para unir los dos bordes de cada trazo y normalización por el contraste de la zona.
// 3) Umbral con histéresis: los trazos fuertes crecen hacia sus partes débiles conectadas; el grano del papel queda fuera.
// 4) Componentes → caracteres → renglones; se juntan los caracteres (los códigos troquelados vienen muy espaciados)
//    y cada renglón se lee aparte. La letra suelta a la izquierda (L, F, V) se lee sola y se antepone como etiqueta.
// Se prueba en varias escalas porque no se conoce el tamaño de la letra en la foto.
import { recognize } from './ocr.js';

const T = 60;   // altura de carácter (px) para la que están ajustados los parámetros

function boxBlur(src, W, H, r) {
  const I = new Float64Array((W + 1) * (H + 1)), o = new Float32Array(W * H);
  for (let y = 0; y < H; y++) { let s = 0; for (let x = 0; x < W; x++) { s += src[y * W + x]; I[(y + 1) * (W + 1) + x + 1] = I[y * (W + 1) + x + 1] + s; } }
  for (let y = 0; y < H; y++) {
    const a = Math.max(0, y - r), b = Math.min(H, y + r + 1);
    for (let x = 0; x < W; x++) {
      const l = Math.max(0, x - r), rr = Math.min(W, x + r + 1);
      o[y * W + x] = (I[b * (W + 1) + rr] - I[a * (W + 1) + rr] - I[b * (W + 1) + l] + I[a * (W + 1) + l]) / ((b - a) * (rr - l));
    }
  }
  return o;
}

// Imagen binaria (1 = trazo) del relieve, con parámetros para caracteres de ~T px.
function binarize(g, W, H, hi) {
  const N = W * H, bg = boxBlur(g, W, H, Math.round(T * 0.1)), v = new Float32Array(N);
  for (let i = 0; i < N; i++) v[i] = Math.abs(g[i] - bg[i]);
  const s = Math.max(1, Math.round(T * 0.033)), sm = boxBlur(boxBlur(v, W, H, s), W, H, s), loc = boxBlur(sm, W, H, Math.round(T * 0.75));
  const out = new Uint8Array(N), st = [];
  for (let i = 0; i < N; i++) if (sm[i] > loc[i] * hi + 0.5) { out[i] = 1; st.push(i); }
  const lo = hi * 0.5;
  while (st.length) {
    const q = st.pop(), qx = q % W;
    for (const d of [-1, 1, -W, W, -W - 1, -W + 1, W - 1, W + 1]) {
      const t = q + d; if (t < 0 || t >= N || out[t] || Math.abs((t % W) - qx) > 1) continue;
      if (sm[t] > loc[t] * lo) { out[t] = 1; st.push(t); }
    }
  }
  return out;
}

function components(bin, W, H) {
  const N = W * H, lab = new Int32Array(N), st = new Int32Array(N), cs = [];
  let id = 0;
  for (let p = 0; p < N; p++) {
    if (!bin[p] || lab[p]) continue;
    id++; let sp = 0, n = 0, x0 = W, y0 = H, x1 = 0, y1 = 0;
    st[sp++] = p; lab[p] = id;
    while (sp) {
      const q = st[--sp], qx = q % W, qy = (q - qx) / W; n++;
      if (qx < x0) x0 = qx; if (qx > x1) x1 = qx; if (qy < y0) y0 = qy; if (qy > y1) y1 = qy;
      for (let dy = -1; dy <= 1; dy++) { const ny = qy + dy; if (ny < 0 || ny >= H) continue;
        for (let dx = -1; dx <= 1; dx++) { const nx = qx + dx; if (nx < 0 || nx >= W) continue; const t = ny * W + nx; if (bin[t] && !lab[t]) { lab[t] = id; st[sp++] = t; } } }
    }
    cs.push({ id, n, x0, y0, x1, y1, h: y1 - y0 + 1, w: x1 - x0 + 1 });
  }
  return { lab, cs };
}

// Dibuja los caracteres indicados uno junto al otro (sin los espacios grandes del troquelado), negro sobre blanco.
function compose(chars, lab, W, outH = 80) {
  const top = Math.min(...chars.map(c => c.y0)), bot = Math.max(...chars.map(c => c.y1)), lh = bot - top + 1;
  const gap = Math.round(lh * 0.25), pad = Math.round(lh * 0.4);
  const cw = chars.reduce((s, c) => s + c.w + gap, 0) + 2 * pad;
  const c = document.createElement('canvas'); c.width = cw; c.height = lh + 2 * pad;
  const x = c.getContext('2d'), im = x.createImageData(c.width, c.height); im.data.fill(255);
  let ox = pad;
  for (const ch of chars) {
    const ids = new Set(ch.ids);
    for (let y = ch.y0; y <= ch.y1; y++) for (let xx = ch.x0; xx <= ch.x1; xx++) if (ids.has(lab[y * W + xx])) {
      const o = ((y - top + pad) * c.width + (xx - ch.x0 + ox)) * 4; im.data[o] = im.data[o + 1] = im.data[o + 2] = 0;
    }
    ox += ch.w + gap;
  }
  x.putImageData(im, 0, 0);
  const k = outH / lh, s = document.createElement('canvas'); s.width = Math.round(c.width * k); s.height = Math.round(c.height * k);
  const sx = s.getContext('2d'); sx.fillStyle = '#fff'; sx.fillRect(0, 0, s.width, s.height); sx.imageSmoothingQuality = 'high'; sx.drawImage(c, 0, 0, s.width, s.height);
  c.width = c.height = 0;
  return s;
}

// Renglones de caracteres en una imagen binaria. Devuelve [{label: [char] | null, chars: [char...]}].
function findLines(bin, W, H) {
  const { lab, cs } = components(bin, W, H);
  const big = cs.filter(c => c.n >= T * 0.5 && c.h <= T * 2.5 && c.w <= T * 2.5);
  // Caracteres de tamaño compatible con la escala (ni grano de papel ni manchas grandes).
  const ch = big.filter(c => c.h >= T * 0.35 || c.w >= T * 0.45).sort((a, b) => b.h - a.h);
  const lines = [];
  for (const c of ch) {
    let L = lines.find(l => Math.min(l.y1, c.y1) - Math.max(l.y0, c.y0) >= 0.4 * Math.min(l.y1 - l.y0, c.h));
    if (!L) { L = { y0: c.y0, y1: c.y1, items: [] }; lines.push(L); }
    L.items.push(c);
    if (c.h >= T * 0.6) { L.y0 = Math.min(L.y0, c.y0); L.y1 = Math.max(L.y1, c.y1); }
  }
  const out = [];
  for (const L of lines) {
    L.items.sort((a, b) => a.x0 - b.x0);
    const chars = [];
    for (const c of L.items) {                  // piezas que se solapan en horizontal = un mismo carácter partido
      const last = chars[chars.length - 1];
      if (last && c.x0 <= last.x1 + T * 0.06) { last.x1 = Math.max(last.x1, c.x1); last.y0 = Math.min(last.y0, c.y0); last.y1 = Math.max(last.y1, c.y1); last.w = last.x1 - last.x0 + 1; last.h = last.y1 - last.y0 + 1; last.ids.push(c.id); }
      else chars.push({ ...c, ids: [c.id] });
    }
    const real = chars.filter(c => c.h >= T * 0.45);
    if (real.length < 3) continue;
    // Etiqueta: primer carácter separado del resto por un hueco mucho mayor que los demás.
    const gaps = real.slice(1).map((c, i) => c.x0 - real[i].x1);
    const med = [...gaps.slice(1)].sort((a, b) => a - b)[Math.floor((gaps.length - 1) / 2)] || 0;
    const hasLabel = gaps.length >= 3 && gaps[0] > Math.max(med * 1.8, T * 0.5);
    out.push({ y: L.y0, label: hasLabel ? real[0] : null, chars: hasLabel ? real.slice(1) : real, lab });
  }
  return out.sort((a, b) => a.y - b.y).slice(0, 6);
}

// Barra «/»: trazo delgado y diagonal (al bajar, se corre a la izquierda).
function isSlash(c, lab, W) {
  let n = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
  const ids = new Set(c.ids);
  for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) if (ids.has(lab[y * W + x])) { n++; sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; }
  const vx = sxx / n - (sx / n) ** 2, vy = syy / n - (sy / n) ** 2, cov = sxy / n - (sx / n) * (sy / n);
  const corr = cov / Math.sqrt(vx * vy || 1), ar = c.w / c.h;
  return corr < -0.85 && ar > 0.3 && ar < 1.1 && n / (c.w * c.h) < 0.45;
}

// Votación por posición entre lecturas del mismo renglón con igual número de caracteres.
export function voteRelief(lines) {
  const groups = [];
  for (const l of lines) {
    const t = l.text.replace(/^[LFV] /, '');
    let g = groups.find(g => Math.abs(g.y - l.y) < 0.03 && g.len === t.length);
    if (!g) { g = { y: l.y, len: t.length, reads: [], labels: [] }; groups.push(g); }
    g.reads.push(t); if (l.label) g.labels.push(l.label);
  }
  return groups.filter(g => g.reads.length >= 2).map(g => {
    let text = '', agree = 1;
    for (let i = 0; i < g.len; i++) {
      const cnt = {}; for (const r of g.reads) cnt[r[i]] = (cnt[r[i]] || 0) + 1;
      const [ch, n] = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
      text += ch; agree = Math.min(agree, n / g.reads.length);
    }
    const lab = g.labels.sort((a, b) => g.labels.filter(x => x === b).length - g.labels.filter(x => x === a).length)[0];
    return { text: (lab ? lab + ' ' : '') + text, conf: Math.round(agree * 100), height: 0, relief: true, reads: g.reads.length, y: g.y };
  }).sort((a, b) => b.reads - a.reads);
}
// Formato típico del troquelado: el lote va justo encima de la fecha. Si la letra «L» no se leyó, un código numérico
// ubicado inmediatamente encima de una fecha se propone como lote (la app lo deja SIEMPRE pendiente de revisión).
function inferLabels(lines) {
  const isDate = t => /^\d{1,2}\/\d{2,4}$/.test(t.replace(/^[LFV] /, ''));
  const dates = lines.filter(l => isDate(l.text));
  return lines.map(l => {
    if (/^[LFV] /.test(l.text) || isDate(l.text)) return l;
    const t = l.text.replace(/[^0-9A-Z]/g, '');
    const below = dates.find(d => d.y > l.y && d.y - l.y < 0.5);
    return t.length >= 5 && /\d{4}/.test(t) && below ? { ...l, text: 'L ' + t, inferred: true } : l;
  });
}

const SCALE_STEPS = [1, 0.5, 0.25];
// Lee el texto en relieve de un canvas. Devuelve líneas {text, conf, height} listas para extractFields / extractZone.
export async function readRelief(src, progress = () => {}, { scales = SCALE_STEPS, his = [3.0, 2.6, 2.2] } = {}) {
  const lines = [];
  const base = Math.min(1, 2400 / Math.max(src.width, src.height));
  for (const sc of scales) {
    const k = base * sc, W = Math.round(src.width * k), H = Math.round(src.height * k);
    if (Math.min(W, H) < T * 1.5) continue;
    progress('Buscando texto en relieve…');
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(src, 0, 0, W, H);
    const d = x.getImageData(0, 0, W, H).data; c.width = c.height = 0;
    const g = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) g[i] = 0.3 * d[i * 4] + 0.59 * d[i * 4 + 1] + 0.11 * d[i * 4 + 2];
    await new Promise(r => setTimeout(r));                  // deja respirar la interfaz entre escalas
    for (const hi of his) {
      const found = findLines(binarize(g, W, H, hi), W, H);
      for (const L of found) {
        let label = '';
        if (L.label) {
          const lc = compose([L.label], L.lab, W, 70);
          try { const r = await recognize(lc, () => {}, '10', { tessedit_char_whitelist: 'LFV' }); if ((r.confidence ?? 0) >= 40) label = r.text.trim(); } finally { lc.width = lc.height = 0; }
          if (!/^[LFV]$/.test(label)) label = '';
        }
        const vc = compose(L.chars, L.lab, W), slash = L.chars.map(c => isSlash(c, L.lab, W));
        try {
          for (const [psm, wl] of [['7', '0123456789/-.ABCDEFGHIJKLMNOPQRSTUVWXYZ'], ['7', '0123456789/'], ['13', '']]) {
            const r = await recognize(vc, () => {}, psm, { tessedit_char_whitelist: wl });
            let t = r.text.replace(/\s+/g, '');
            // Si se leyó un carácter por cada mancha, la barra «/» se corrige por su forma (diagonal delgada).
            if (t.length === L.chars.length) t = [...t].map((ch, i) => slash[i] ? '/' : ch === '/' ? '?' : ch).join('');
            const xs = [...L.chars, ...(L.label ? [L.label] : [])];
            if (t.length >= 3) lines.push({ text: (label ? label + ' ' : '') + t, conf: r.confidence ?? null, height: 0, relief: true, n: L.chars.length, y: L.y / H, label,
              box: { x: Math.min(...xs.map(c => c.x0)) / k, y: Math.min(...xs.map(c => c.y0)) / k, x1: (Math.max(...xs.map(c => c.x1)) + 1) / k, y1: (Math.max(...xs.map(c => c.y1)) + 1) / k } });
          }
        } finally { vc.width = vc.height = 0; }
      }
    }
  }
  return lines;
}

// Foto completa: 1) se ubican los renglones en relieve; 2) se recorta esa zona con margen, se amplía y se vuelve a leer
// en todas las escalas (como si el usuario la hubiera marcado). Devuelve las líneas votadas.
export async function readReliefAuto(src, progress = () => {}) {
  const first = (await readRelief(src, progress, { scales: [1, 0.5], his: [2.6] })).filter(l => l.n >= 5 && /\d/.test(l.text));
  if (!first.length) return [];
  const x0 = Math.min(...first.map(l => l.box.x)), y0 = Math.min(...first.map(l => l.box.y)), x1 = Math.max(...first.map(l => l.box.x1)), y1 = Math.max(...first.map(l => l.box.y1));
  const mh = (y1 - y0) * 0.6 + 10, mw = (x1 - x0) * 0.15 + 10;
  const rx = Math.max(0, x0 - mw), ry = Math.max(0, y0 - mh), rw = Math.min(src.width, x1 + mw) - rx, rh = Math.min(src.height, y1 + mh) - ry;
  const k = Math.min(3, 1800 / rw), c = document.createElement('canvas'); c.width = Math.round(rw * k); c.height = Math.round(rh * k);
  c.getContext('2d').drawImage(src, rx, ry, rw, rh, 0, 0, c.width, c.height);
  try { return inferLabels(voteRelief(await readRelief(c, progress))); } finally { c.width = c.height = 0; }
}
