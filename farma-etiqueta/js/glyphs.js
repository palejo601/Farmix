// Distinción B / 8 por la FORMA del carácter (el OCR los confunde con frecuencia en los lotes).
// B: su lado izquierdo es un trazo recto vertical de arriba abajo.  8: su lado izquierdo es curvo y se estrecha en el centro.
// Se mide, renglón por renglón del carácter, dónde empieza la tinta por la izquierda:
//   - esquinas = en los renglones de arriba y de abajo (B: pegada al borde; 8: hacia el centro, porque es redondo);
//   - cintura = cuánto se mete la tinta en la franja central (casi nulo en la B).
// Devuelve 'B', '8' o null (forma no concluyente: el dato queda para revisión, no se adivina).
// B: tronco continuo y poca redondez. 8: tronco interrumpido y redondo, o muy redondo. Entre medias: no se decide.
const decide = (score, stem) => stem >= 0.97 && score <= 0.58 ? 'B' : (stem <= 0.92 && score >= 0.4) || score >= 0.65 ? '8' : null;
export function classifyB8(src, bx, scoreOnly = false) {
  const pad = 2, x0 = Math.max(0, Math.floor(bx.x0) - pad), y0 = Math.max(0, Math.floor(bx.y0) - pad);
  const w = Math.min(src.width - x0, Math.ceil(bx.x1 - bx.x0) + 2 * pad), h = Math.min(src.height - y0, Math.ceil(bx.y1 - bx.y0) + 2 * pad);
  if (w < 5 || h < 8) return null;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const cx = c.getContext('2d', { willReadFrequently: true }); cx.drawImage(src, x0, y0, w, h, 0, 0, w, h);
  const d = cx.getImageData(0, 0, w, h).data; c.width = c.height = 0;
  const g = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) g[i] = 0.3 * d[i * 4] + 0.59 * d[i * 4 + 1] + 0.11 * d[i * 4 + 2];
  // Umbral de Otsu dentro del carácter.
  const hist = new Array(256).fill(0); for (const v of g) hist[v | 0]++;
  let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sb = 0, wb = 0, best = 0, t = 128;
  for (let i = 0; i < 256; i++) { wb += hist[i]; if (!wb) continue; const wf = g.length - wb; if (!wf) break; sb += i * hist[i]; const mb = sb / wb, mf = (sum - sb) / wf, bv = wb * wf * (mb - mf) ** 2; if (bv > best) { best = bv; t = i; } }
  const ink = (x, y) => g[y * w + x] <= t;
  // Caja real de la tinta (el recuadro del OCR puede traer margen).
  let ix0 = w, ix1 = -1, iy0 = h, iy1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (ink(x, y)) { if (x < ix0) ix0 = x; if (x > ix1) ix1 = x; if (y < iy0) iy0 = y; if (y > iy1) iy1 = y; }
  const iw = ix1 - ix0 + 1, ih = iy1 - iy0 + 1;
  if (iw < 4 || ih < 24) return null;          // con menos de 24 px de alto la forma no es fiable: no se decide
  // Inicio de la tinta por la izquierda en cada renglón del carácter (0 = pegado al borde, 1 = borde derecho).
  const left = [];
  for (let y = iy0; y <= iy1; y++) { let x = ix0; while (x <= ix1 && !ink(x, y)) x++; left.push((x - ix0) / iw); }
  const med = a => { const q = [...a].sort((p, r) => p - r); return q[Math.floor(q.length / 2)]; };
  const band = Math.max(1, Math.round(ih * 0.1));
  const top = med(left.slice(0, band)), bot = med(left.slice(-band));                 // esquinas: rectas en B, redondas en 8
  const waist = Math.max(...left.slice(Math.round(ih * 0.4), Math.round(ih * 0.6) + 1)); // cintura: marcada en 8
  // Puntaje de redondez: bajo en la B (esquinas rectas, sin cintura), alto en el 8. Entre 0,35 y 0,55 no se decide.
  const score = top + bot + 1.5 * waist;
  // Tronco: fracción de renglones (sin las puntas) cuya tinta empieza junto al punto más a la izquierda. La B tiene un
  // trazo vertical continuo (casi todos); el 8 solo toca ese punto en lo más ancho de sus dos círculos.
  const inner = left.slice(band, left.length - band), lmin = Math.min(...inner);
  const stem = inner.filter(v => v <= lmin + 0.12).length / (inner.length || 1);
  if (scoreOnly) return { score, stem };
  return decide(score, stem);
}

// Revisa un valor de lote leído: cada «8» o «B» se reclasifica por su forma usando las cajas de los caracteres del OCR.
// symbols: [{text, bbox}] del renglón (en coordenadas de src). Devuelve { value, changed, unsure }.
export function fixB8(src, value, symbols) {
  if (!/[8B0OD]/.test(value) || !symbols?.length) return { value, changed: false, unsure: false };
  const chars = symbols.filter(s => s.text && s.text.trim());
  const joined = chars.map(s => s.text).join('');
  const at = joined.lastIndexOf(value);
  if (at < 0) return { value, changed: false, unsure: /[8BD]/.test(value) && /[A-Z]/.test(value) };
  let changed = false, unsure = false;
  // Familias por forma: lado izquierdo recto → B o D; redondo → 8 o 0 (la O se deja como O si era O).
  const FAM = { '8': ['B', '8'], B: ['B', '8'], '0': ['D', '0'], D: ['D', '0'], O: ['D', 'O'] };
  const map = (ch, k) => k == null ? null : FAM[ch][k === 'B' ? 0 : 1];
  const idx = [...value].map((ch, i) => FAM[ch] ? i : -1).filter(i => i >= 0);
  const sc = Object.fromEntries(idx.map(i => [i, classifyB8(src, chars[at + i].bbox, true)]));
  // Familia D/0: el 0 es un óvalo alto (su lado izquierdo parece recto), así que solo cuenta la redondez, con zona gris amplia.
  const cls = (v, ch) => v == null ? null : /[0OD]/.test(ch) ? (v.score <= 0.25 ? 'B' : v.score >= 0.5 ? '8' : null) : decide(v.score, v.stem);
  const known = idx.filter(i => cls(sc[i], value[i]));
  const bS = known.filter(i => cls(sc[i], value[i]) === 'B' && FAM[value[i]] === FAM[value[i]]).map(i => sc[i].score), eS = known.filter(i => cls(sc[i], value[i]) === '8').map(i => sc[i].score);
  // (en el código interno «B» = recto y «8» = redondo para cualquier familia)
  const out = [...value];
  for (const i of idx) {
    let k = cls(sc[i], value[i]);
    // En el mismo lote hay una B y un 8 seguros: un carácter dudoso se asigna al que más se parece, si la diferencia es clara.
    if (false) {   // (asignación por comparación desactivada: producía errores con letra pequeña)
      const dB = Math.abs(sc[i].score - Math.max(...bS)), d8 = Math.abs(sc[i].score - Math.min(...eS));
      if (Math.abs(dB - d8) >= 0.1) k = dB < d8 ? 'B' : '8';
    }
    if (!k) { if (value[i] !== '0' && value[i] !== 'O') unsure = true; continue; }   // un 0 sin forma clara no vuelve dudoso el lote
    const nk = map(value[i], k);
    if (nk !== out[i]) { changed = true; out[i] = nk; }
  }
  return { value: out.join(''), changed, unsure };

}

// Aplica la revisión B/8 a los renglones de lote de una lectura OCR (lines con symbols en coordenadas de src).
// Marca line.b8 = 'fixed' (se corrigió por la forma) o 'unsure' (no se pudo distinguir: el lote queda dudoso).
const LOTV = /(?:^|[^A-Za-z0-9])(?:L[O0]TE?|LOT|BATCH|L)(?![A-Za-z])\s?[.:\-]?\s*(?:N[°ºo]\.?\s*)?([A-Z0-9][A-Z0-9\-\/]{2,19})/i;
export function fixLotLines(src, lines) {
  for (const l of lines || []) {
    const m = (l.text || '').match(LOTV); if (!m || !/[8B0OD]/.test(m[1])) continue;
    const r = fixB8(src, m[1], l.symbols);
    if (r.changed) { l.text = l.text.replace(m[1], r.value); l.b8 = 'fixed'; for (const w of l.words || []) if (w.text && w.text.includes(m[1])) w.text = w.text.replace(m[1], r.value); }
    if (r.unsure) l.b8 = 'unsure';
  }
  return lines;
}
