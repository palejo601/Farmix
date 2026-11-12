// Extracción de campos a partir del texto OCR. Función pura (sin DOM) para poder probarla de forma aislada.
// Principios: solo se devuelve texto realmente leído; no se corrige ningún carácter; lo incierto se marca como dudoso.
// Entrada: lines = [{text, conf (0-100 | null), height (px | 0)}]
const MES = 'ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|SET|OCT|NOV|DIC|JAN|APR|AUG|DEC';
const DATE_SRC = String.raw`(?:\d{1,2}[\/\-. ]\d{1,2}[\/\-. ]\d{2,4}|\d{4}[\/\-.]\d{1,2}(?:[\/\-.]\d{1,2})?|\d{1,2}[\/\-. ]\d{4}|\d{1,2}[\/\-.]\d{2}|(?:\d{1,2}[\/\-. ]{0,2})?(?:${MES})[A-Z]{0,7}\.?[\/\-. ]{0,2}\d{2,4})`;
const DATE = new RegExp(DATE_SRC, 'i');
const DATE_G = new RegExp(DATE_SRC, 'ig');
const EXP_KW = /(?:^|[^A-Za-z])(EXPIRY(?:\s*DATE)?|EXPIRATION(?:\s*DATE)?|EXP(?:IRA)?|CADUCIDAD|CAD|VENCIMIENTO|VENCE|VENC|VTO|F\.?\s?V(?:ENC)?|FECHA\s+(?:DE\s+)?(?:VENC\w*|EXP\w*|CAD\w*)|USE\s+BY|V[AÁ]LIDO\s+HASTA)(?![A-Za-z])\.?\s*(?:DATE)?\s*[:.\-]?\s*/i;
const MFG_KW = /(?:^|[^A-Za-z])(MFG|MFD|FAB|ELAB|F\.?\s?F|FECHA\s+(?:DE\s+)?(?:FAB\w*|ELAB\w*)|MANUFACTUR\w*|PRODUCCI[OÓ]N)(?![A-Za-z])/i;
const MFG_DATE = /(?:^|[^A-Za-z])(MFG|MFD|MAN|F\.?\s?FAB|FAB(?:RICACI[OÓ]N)?|ELAB(?:ORACI[OÓ]N)?|F\.\s?F|F\.?\s?ELAB|FECHA\s+(?:DE\s+)?(?:FAB\w*|ELAB\w*|MANUF\w*)|MANUFACTUR(?:ING|E)\s*DATE)(?![A-Za-z])\.?\s*(?:DATE)?\s*[:.\-]?\s*/i;
const LOT_ONLY = /(?:^|[^A-Za-z0-9])(L[O0]TE|L[O0]T|BATCH)(?:\s*\/\s*[A-Za-z]+)?\.?\s*(?:N[°ºo]\.?|NO\.?|#)?\s*[:.\-]?\s*$/i;
const HEAD = [['lote', /(?:^|[^A-Za-z])(L[O0]TE|L[O0]T|BATCH)(?![A-Za-z])/i, 'LOTE'], ['fab', /(?:^|[^A-Za-z])(F\.?\s?FAB|FAB|MFG|MFD|ELAB|F\.\s?F)(?![A-Za-z])/i, 'FAB'], ['exp', /(?:^|[^A-Za-z])(F\.?\s?VENC?|VENCE|VENC|VTO|EXP|CAD|F\.\s?V)(?![A-Za-z])/i, 'VENCE']];
// Aproximación año*12+mes para ordenar dos fechas (no altera el texto leído).
function ym(s) {
  const MM = { ENE: 1, JAN: 1, FEB: 2, MAR: 3, ABR: 4, APR: 4, MAY: 5, JUN: 6, JUL: 7, AGO: 8, AUG: 8, SEP: 9, SET: 9, OCT: 10, NOV: 11, DIC: 12, DEC: 12 };
  const n = (s.match(/\d+/g) || []).map(Number), mon = (s.match(/[A-Za-z]{3}/) || [''])[0].toUpperCase();
  let y, m;
  if (MM[mon]) { m = MM[mon]; y = n[n.length - 1]; }
  else if (n.length >= 2 && n[0] > 31) { y = n[0]; m = n[1]; }
  else if (n.length === 2) { m = n[0]; y = n[1]; }
  else if (n.length >= 3) { m = n[1]; y = n[2]; }
  else return null;
  if (y < 100) y += 2000;
  return m >= 1 && m <= 12 && y > 2000 && y < 2100 ? y * 12 + m : null;
}
const LOT_KW = /(?:^|[^A-Za-z0-9])(L[O0]TE|L[O0]T|BATCH|LT)(?![A-Za-z])\.?\s*(?:N[°ºo]\.?|NO\.?|NUM\.?|#)?\s*[:.\-]?\s*([A-Z0-9][A-Z0-9\-\/]{1,19})/i;
const REG_KW = /(?:^|[^A-Za-z])(?:REG(?:ISTRO)?\.?\s*(?:SAN(?:ITARIO)?\.?)?\s*(?:N[°ºo]\.?|NO\.?)?\s*[:.\-]?\s*(?:INVIMA)?|INVIMA|R\.\s?S\.)\s*(?:N[°ºo]\.?|NO\.?)?\s*[:.\-]?\s*(\d{4}\s?[A-Z]{1,2}\s?-?\s?[\dA-Z][\dA-Z\-]{2,}|[A-Z0-9][A-Z0-9\-\/.]{4,})/i;
const CONC = /\d+(?:[.,]\d+)?\s?(?:mg|mcg|µg|μg|ug|g|ml|mL|UI|U\.I\.|IU|mEq|%)(?![A-Za-z])(?:\s?\/\s?\d*(?:[.,]\d+)?\s?(?:ml|mL|g|mg|L|dosis|tableta|c[aá]psula|comprimido))?/i;
const FORMA = /(?:^|[^a-záéíóúñ])(tabletas?(?: recubiertas?| masticables?| efervescentes?)?|comprimidos?(?: recubiertos?)?|c[aá]psulas?(?: blandas?| duras?)?|grageas?|jarabe|suspensi[oó]n(?: oral| inyectable)?|soluci[oó]n(?: oral| inyectable| oft[aá]lmica| t[oó]pica| nasal)?|polvo para [a-záéíóúñ ]{3,40}|crema|ung[uü]ento|pomada|gel|gotas|supositorios?|[oó]vulos?|aerosol|inhalador|emulsi[oó]n|loci[oó]n|parches?|elixir|tablets?|capsules?|syrup|cream|ointment)(?![a-záéíóúñ])/i;
const PRES = /(contenido\s*(?:neto)?\s*:?\s*\d+[^\n]{0,30}|(?:caja|frasco|bl[ií]ster|envase|tubo|sobre|estuche|ampolla|vial|bolsa)s?\s+(?:con|por|x|de)\s+\d+[^\n]{0,40}|(?:^|\s)(?:x|por|con)\s?\d+\s*(?:tabletas?|c[aá]psulas?|comprimidos?|grageas?|sobres?|ampollas?|unidades|ml|mL|g)(?![a-z])[^\n]{0,20})/i;
const PRES2 = /(?:^|[^\d.,\/])(\d{1,4}\s+(?:tabletas?|c[aá]psulas?|comprimidos?|grageas?|sobres?|ampollas?|[oó]vulos?|supositorios?)(?: recubiertas?| blandas?)?)(?![a-záéíóúñ])/i;
const COND = /(?:cons[eé]rve(?:se)?|almac[eé]n(?:ar|ese|e)|mant[eé]ng(?:a|ase)|gu[aá]rd(?:ar|ese|e)|store)(?![a-záéíóúñ])[^\n]{6,110}/i;
const CONTIENE = /contienen?\s*:?\s*([A-Za-zÁÉÍÓÚÑáéíóúñ][A-Za-zÁÉÍÓÚÑáéíóúñ ]{3,60}?)(?:\s+equivalente[^\d]{0,40})?\s*$/i;
const LAB = /(?:^|[^A-Za-z])(LABORATORIOS?|LAB\.)\s+[^\n]{2,60}/i;
const FAB = /(?:(?:FABRICADO|ELABORADO|MANUFACTURADO|PRODUCIDO|HECHO)\s+(?:Y\s+\w+\s+)?POR|FABRICANTE|MANUFACTURED\s+BY|MADE\s+BY)\s*[:.\-]?\s*([^\n]{0,70})/i;
// Caracteres que el OCR confunde con frecuencia cuando hay letras y números mezclados.
const AMBIG = /\d[OISBl]|[OISBl]\d|[A-Z][0158]|[0158][A-Z]/;

const LETTER = /[A-Za-zÁÉÍÓÚÑáéíóúñ]/;
const inWord = (text, m) => /^[A-Za-z]/.test(m[0]) && m.index > 0 && LETTER.test(text[m.index - 1]);
// Fechas válidas de un texto: no pueden empezar dentro de una palabra o de un número más largo («4B0123 05/2024»).
function findDates(text) {
  const re = new RegExp(DATE_SRC, 'ig'), out = []; let m;
  while ((m = re.exec(text))) {
    if (m.index > 0 && /[A-Za-z0-9ÁÉÍÓÚÑáéíóúñ]/.test(text[m.index - 1])) { re.lastIndex = m.index + 1; continue; }
    out.push(m);
  }
  return out;
}
// ---------- Casillas impresas: una sola letra dentro de un recuadro (L = lote, F = fabricación, V = vencimiento) ----------
// El OCR suele leer el borde del recuadro como «[», «|», «(», «I», «l» o «1»: «[L] 4B0123», «|F| 05/2024», «(V) 05/2027».
// Solo se acepta la letra si a continuación (o en el renglón de abajo) está un valor del tipo correcto:
// L → código con al menos un dígito; F y V → fecha válida. Así «V» de «Vía oral» o «F» sueltas no se toman como etiqueta.
// Borde izquierdo: corchete o barra (con o sin espacio) o I/l/1 pegado a la letra; borde derecho: corchete o barra, o I/l pegado.
// Un «1» separado por espacio después de la letra es parte del valor («L 1575101»), no un borde.
const BOX_L = String.raw`(?:[\[\(\{|!]\s?|[Il1](?=[LFV]))?`, BOX_R = String.raw`(?:\s?[\]\)\}|!]|[Il1](?=[\s:.\-]))?`;
const BOX_TOKEN = new RegExp(String.raw`(^|\s)${BOX_L}([LFV])${BOX_R}\s?[:.\-]?\s*(?=\S)`, 'g');
const BOX_ONLY = new RegExp(String.raw`^\s*${BOX_L}\s?([LFV])\s?${BOX_R}\s?[:.\-]?\s*$`);
const BOX_HEAD = new RegExp(String.raw`^(?:\s*${BOX_L}\s?[LFV]\s?${BOX_R}\s*){2,3}$`);
const BOX_WORD = { L: 'LOTE', F: 'FAB', V: 'VENCE' };
const LOT_VAL = /^[A-Z0-9][A-Z0-9\-\/]{2,19}/i;
const lotOK = t => { const m = t.match(LOT_VAL); return m && /\d/.test(m[0]) && !new RegExp('^' + DATE_SRC + '$', 'i').test(m[0]) ? m[0] : null; };
const dateAt = t => { const m = t.match(new RegExp('^' + DATE_SRC, 'i')); return m && ym(m[0]) != null ? m[0] : null; };
const valOK = (k, t) => k === 'L' ? lotOK(t) : dateAt(t);
export function boxLabels(lines) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i], t = l.text;
    // Renglón solo con casillas («L  F  V») y los valores en el renglón siguiente: se vuelve una tabla con encabezados.
    if (BOX_HEAD.test(t) && lines[i + 1] && /\d/.test(lines[i + 1].text)) {
      out.push({ ...l, text: [...t.matchAll(/[LFV]/g)].map(m => BOX_WORD[m[0]]).join('  ') }); continue;
    }
    // Casilla sola en un renglón y su valor debajo.
    const only = t.match(BOX_ONLY);
    if (only && lines[i + 1] && valOK(only[1], lines[i + 1].text.trim())) { out.push({ ...l, text: BOX_WORD[only[1]] + ':' }); continue; }
    // Casillas en el mismo renglón que su valor: cada una se separa en su propio renglón «ETIQUETA: valor».
    const hits = [];
    for (const m of t.matchAll(BOX_TOKEN)) {
      const after = m[0].slice(m[0].lastIndexOf(m[2]) + 1);
      if (!/^[\s:.\-\]\)\}|!Il1]/.test(after)) continue;          // «L0TE», «Fab»: la letra es parte de una palabra
      const at = m.index + m[0].length, v = valOK(m[2], t.slice(at));
      if (v) hits.push({ k: m[2], start: m.index + m[1].length, at });
    }
    if (!hits.length) { out.push(l); continue; }
    if (hits[0].start > 0 && t.slice(0, hits[0].start).trim()) out.push({ ...l, text: t.slice(0, hits[0].start).trim() });
    hits.forEach((h, j) => out.push({ ...l, text: BOX_WORD[h.k] + ': ' + t.slice(h.at, j + 1 < hits.length ? hits[j + 1].start : undefined).trim() }));
  }
  return out;
}

const clean = s => s.replace(/\s+/g, ' ').replace(/^[\s:.\-–|]+|[\s:.\-–|,;]+$/g, '').trim();
const LOW = 60, OK = 80;

const MFIX = [[/\bAG[O0Q](?=[\s\/\-.]?\d{2,4}\b)/gi, 'AGO'], [/\bA6[O0](?=[\s\/\-.]?\d{2,4}\b)/gi, 'AGO'], [/\b[O0]CT(?=[\s\/\-.]?\d{2,4}\b)/gi, 'OCT'], [/\bN[O0]V(?=[\s\/\-.]?\d{2,4}\b)/gi, 'NOV'],
  [/\bF[E3]B(?=[\s\/\-.]?\d{2,4}\b)/gi, 'FEB'], [/\bS[E3]P(?=[\s\/\-.]?\d{2,4}\b)/gi, 'SEP'], [/\bD[I1l]C(?=[\s\/\-.]?\d{2,4}\b)/gi, 'DIC'], [/\bEN[E3](?=[\s\/\-.]?\d{2,4}\b)/gi, 'ENE']];
// Mes escrito con letras (FEB, FEBRERO, AGO, AUG…) → número: «FEB2026» → «02/2026», «15 MAR 2027» → «15/03/2027».
// El año se deja tal como está impreso. Si no hay mes en letras, la fecha se devuelve sin cambios.
const MNUM = { ENE: 1, JAN: 1, FEB: 2, MAR: 3, ABR: 4, APR: 4, MAY: 5, JUN: 6, JUL: 7, AGO: 8, AUG: 8, SEP: 9, SET: 9, OCT: 10, NOV: 11, DIC: 12, DEC: 12 };
export function monthToNumber(s) {
  const w = (s.match(/[A-Za-zÁÉÍÓÚáéíóú]{3,}/) || [''])[0], n = MNUM[w.slice(0, 3).toUpperCase()];
  if (!n) return s;
  const nums = s.match(/\d+/g) || [], year = nums[nums.length - 1];
  if (!year || year.length < 2) return s;
  const before = s.slice(0, s.indexOf(w)).match(/\d{1,2}/);
  return (before ? before[0].padStart(2, '0') + '/' : '') + String(n).padStart(2, '0') + '/' + year;
}
const YFIX = { Z: '2', O: '0', Q: '0', D: '0', S: '5', I: '1', l: '1', '|': '1', B: '8' };
const fixMonth = t => MFIX.reduce((s, [re, m]) => s.replace(re, m), t)
  .replace(new RegExp('((?:' + MES + ')[A-Z]{0,7}\\.?[\\/\\-. ]{0,2})([0-9ZOQDSIl|B]{4})(?![A-Za-z0-9])', 'gi'), (m, a, y) => /\d{2}/.test(y) ? a + y.replace(/[ZOQDSIl|B]/g, c => YFIX[c]) : m);
const unspace = t => t.replace(/(^|[\s:])([0-9](?: [0-9A-Z\/\-.]){3,})(?=$|\s)/g, (m, a, b) => /\d.*\d/.test(b) ? a + b.replace(/ /g, '') : m);
export function extractFields(lines) {
  lines = boxLabels(lines.map(l => ({ text: fixMonth(unspace((l.text || '').replace(/\s+/g, ' ').trim())), conf: l.conf ?? null, height: l.height || 0, b8: l.b8, words: l.words, bbox: l.bbox, rot: l.rot })))
    .map(l => ({ ...l, text: clean(l.text) })).filter(l => l.text.length > 1);
  // Rótulos en tabla: una fila de encabezados («LOTE  FAB  VENCE») y debajo la fila de valores. Se reordenan como «etiqueta: valor».
  for (let i = 0; i + 1 < lines.length; i++) {
    const hd = lines[i].text, vals = lines[i + 1].text;
    if (/\d/.test(hd)) continue;
    const keys = HEAD.map(([k, re, lab]) => ({ k, lab, at: hd.search(re) })).filter(x => x.at >= 0).sort((a, b) => a.at - b.at);
    if (keys.length < 2 || !/\d/.test(vals)) continue;
    const dates = findDates(vals).map(d => d[0]);
    let rest = vals; for (const d of dates) rest = rest.replace(d, ' ');
    const lot = rest.split(/\s+/).find(t => /\d/.test(t) && /^[A-Z0-9][A-Z0-9\-\/]{2,19}$/i.test(t));
    const nd = keys.filter(x => x.k !== 'lote').length;
    if (dates.length !== nd || (keys.some(x => x.k === 'lote') && !lot)) continue;
    const conf = Math.min(lines[i].conf ?? 100, lines[i + 1].conf ?? 100), made = []; let di = 0;
    for (const x of keys) made.push({ text: x.lab + ': ' + (x.k === 'lote' ? lot : dates[di++]), conf: lines[i].conf == null ? null : conf, height: 0 });
    lines.splice(i, 2, ...made); i += made.length - 1;
  }
  const out = [], used = new Set(), warnings = [];
  const add = (field, label, value, i, notes = [], forceDoubt = false) => {
    value = clean(value); if (!value) return;
    if (field === 'vencimiento' || field === 'fechaFabricacion') {
      const num = monthToNumber(value);
      if (num !== value) { notes = [...notes, `En el empaque dice «${value}» (mes en letras): se convirtió a número.`]; value = num; }
    }
    const conf = lines[i]?.conf ?? null;
    if (field === 'lote' && lines[i]?.b8 === 'unsure') { notes.push('No se pudo distinguir con seguridad si un carácter es letra o número (B/8, D/0): compárelo con el empaque.'); forceDoubt = true; }
    if (field === 'lote' && lines[i]?.b8 === 'fixed') notes.push('B y 8 se distinguieron por la forma del carácter (la B tiene el lado izquierdo recto).');
    // Una fecha con mes o año imposibles («85/2027») es una lectura errónea: se muestra, pero nunca se premarca.
    if ((field === 'vencimiento' || field === 'fechaFabricacion') && ym(value) == null) { notes.push('La fecha leída no parece válida (mes o año fuera de rango): probablemente está mal leída.'); forceDoubt = true; }
    if (conf != null && conf < OK) notes.push('Confianza de lectura baja.');
    const doubt = forceDoubt || (conf != null && conf < OK);
    // Solo se premarcan los datos leídos con seguridad suficiente.
    out.push({ field, label, value, conf, doubt, notes, checked: !forceDoubt && (conf == null || conf >= LOW), box: lines[i]?.bbox || null });
    used.add(i);
  };

  // --- Fecha de fabricación ---
  let mfgFound = false;
  for (let i = 0; i < lines.length && !mfgFound; i++) {
    const m = lines[i].text.match(MFG_DATE); if (!m) continue;
    const rest = lines[i].text.slice(m.index + m[0].length);
    let d = rest.match(DATE), src = i;
    if (d && (d.index > 4 || inWord(rest, d))) d = null;
    if (!d && !rest.trim() && lines[i + 1]) { d = lines[i + 1].text.match(DATE); src = i + 1; if (d && d.index > 4) d = null; }
    if (d) { mfgFound = true; add('fechaFabricacion', 'Fecha de fabricación', d[0], src); }
  }

  // --- Vencimiento (antes que el lote, para no confundirlos) ---
  let expLabelNoDate = false, expFound = false;
  lines.forEach((l, i) => {
    if (expFound) return;
    const m = l.text.match(EXP_KW); if (!m) return;
    const rest = l.text.slice(m.index + m[0].length);
    let d = rest.match(DATE), src = i;
    if (d && inWord(rest, d)) d = null;
    if (!(d && d.index <= 8) && lines[i + 1] && !rest.trim()) { d = lines[i + 1].text.match(DATE); src = i + 1; if (d && d.index > 4) d = null; }
    else if (d && d.index > 8) d = null;
    if (d) { expFound = true; add('vencimiento', 'Fecha de vencimiento', d[0], src, /[OISBl]/.test(d[0].replace(new RegExp(MES, 'i'), '')) ? ['La fecha contiene letras que podrían ser números mal leídos. Verifique con el empaque.'] : [], false); }
    else expLabelNoDate = true;
  });
  if (!expFound) {
    const loose = [];
    lines.forEach((l, i) => { for (const d of findDates(l.text)) { const before = l.text.slice(0, d.index); if (!MFG_KW.test(before) && !LOT_KW.test(before + d[0]) && !inWord(l.text, d) && !(d.index > 0 && /\d/.test(l.text[d.index - 1])) && !(/^\d{1,2} \d{4}$/.test(d[0]) && +d[0].split(' ')[0] > 12) && /20\d{2}|\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2}/.test(d[0])) loose.push([d[0], i]); } });
    // Dos fechas sin etiqueta: la más antigua suele ser la fabricación y la posterior el vencimiento. Se proponen como dudosas.
    if (loose.length === 2 && !mfgFound) {
      const a = ym(loose[0][0]), b = ym(loose[1][0]);
      if (a && b && a !== b) {
        const [fab, ven] = a < b ? loose : [loose[1], loose[0]];
        add('fechaFabricacion', 'Fecha de fabricación', fab[0], fab[1], ['Fecha sin etiqueta: se asume fabricación por ser la más antigua. Confírmela.'], true);
        add('vencimiento', 'Fecha de vencimiento', ven[0], ven[1], ['Fecha sin etiqueta: se asume vencimiento por ser la posterior. Confírmela.'], true);
        expFound = true; warnings.push('Las fechas no tienen etiqueta en la foto: se proponen como dudosas, confírmelas con el empaque.');
      }
    }
    if (expFound) { /* ya propuestas */ } else
    if (loose.length === 1) add('vencimiento', 'Fecha de vencimiento', loose[0][0], loose[0][1], ['Fecha encontrada sin la etiqueta EXP/VENCE: podría no ser el vencimiento.'], true);
    if (!expFound) warnings.push(expLabelNoDate ? 'Se encontró la etiqueta de vencimiento, pero la fecha no es legible. Revísela en el empaque e ingrésela manualmente.'
      : loose.length === 1 ? 'No se detectó una fecha rotulada como vencimiento. Se propone una fecha dudosa: confírmela con el empaque.'
      : 'No se detectó la fecha de vencimiento. Revísela en el empaque e ingrésela manualmente.');
  }

  // --- Lote ---
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].text.match(LOT_KW); if (!m) continue;
    const v = m[2];
    if (!/\d/.test(v)) continue;                       // «LOTE Y FECHA…»: no es un número de lote
    const notes = [];
    if (new RegExp('^' + DATE_SRC + '$', 'i').test(v)) notes.push('El valor tiene forma de fecha: confirme que sea el lote.');
    if (AMBIG.test(v)) notes.push('Combina letras y números que el OCR suele confundir (O/0, I/1, S/5, B/8). No se corrigió nada: verifique con el empaque.');
    add('lote', 'Número de lote', v, i, notes, notes.length > 1);
    break;
  }
  // «LOTE» en un renglón y el valor en el siguiente
  if (!out.some(f => f.field === 'lote')) for (let i = 0; i + 1 < lines.length; i++) {
    if (!LOT_ONLY.test(lines[i].text)) continue;
    const m = lines[i + 1].text.match(/^[A-Z0-9][A-Z0-9\-\/]{2,19}/i);
    if (!m || !/\d/.test(m[0]) || new RegExp('^' + DATE_SRC + '$', 'i').test(m[0])) continue;
    add('lote', 'Número de lote', m[0], i + 1, AMBIG.test(m[0]) ? ['Combina letras y números que el OCR suele confundir (O/0, I/1, S/5, B/8). No se corrigió nada: verifique con el empaque.'] : []);
    used.add(i); break;
  }

  // --- Registro sanitario ---
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].text.match(REG_KW); if (!m || !/\d/.test(m[1])) continue;
    add('registroSanitario', 'Registro sanitario', (/INVIMA/i.test(m[0]) && !/^INVIMA/i.test(m[1]) ? 'INVIMA ' : '') + m[1], i);
    break;
  }

  // --- Laboratorio / fabricante ---
  let labI = -1;
  for (let i = 0; i < lines.length; i++) { const m = lines[i].text.match(LAB); if (m) { add('laboratorio', 'Laboratorio', m[0].replace(/^[^A-Za-z]+/, ''), i); labI = i; break; } }
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].text.match(FAB); if (!m) continue;
    let v = clean(m[1]), src = i;
    if (v.length < 3 && lines[i + 1]) { v = lines[i + 1].text; src = i + 1; }
    if (v.length >= 3 && src !== labI) { add('laboratorio', 'Fabricante', v, src); if (labI >= 0) out[out.length - 1].checked = false; }
    used.add(i);
    break;
  }

  // --- Empresa sin la palabra «Laboratorios» ni «Fabricado por»: razón social (S.A., S.A.S., Ltda., Inc.…) ---
  if (!out.some(f => f.field === 'laboratorio')) for (let i = 0; i < lines.length; i++) {
    const m = lines[i].text.match(/([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ&.\- ]{2,50}?\s(?:S\.?\s?A\.?\s?S\.?|S\.?\s?A\.?|Ltda\.?|LTDA\.?|Inc\.?|S\.?\s?L\.?|GmbH|AG|Corp\.?|LLC)(?![A-Za-z]))[^\n]{0,40}/);
    if (!m || used.has(i) || /reg|invima|lote|vence/i.test(m[0])) continue;
    add('laboratorio', 'Laboratorio', m[0], i, ['Identificado por la razón social: confirme que sea el laboratorio o fabricante.']);
    break;
  }

  // --- Concentración, forma farmacéutica, presentación ---
  let concI = -1, concM = null;
  for (let i = 0; i < lines.length; i++) { const m = lines[i].text.match(CONC); if (m) { concI = i; concM = m; break; } }
  if (concM) add('concentracion', 'Concentración', concM[0], concI);
  for (let i = 0; i < lines.length; i++) { const m = lines[i].text.match(FORMA); if (m) { const u = used.has(i); add('formaFarmaceutica', 'Forma farmacéutica', m[1], i); if (!u) used.delete(i); break; } }
  for (let i = 0; i < lines.length; i++) { const m = lines[i].text.match(PRES); if (m) { const u = used.has(i) || m[1].length > lines[i].text.length * 0.7; add('presentacion', 'Presentación', m[1], i); if (!u) used.delete(i); break; } }
  if (!out.some(f => f.field === 'presentacion')) for (let i = 0; i < lines.length; i++) { const m = lines[i].text.match(PRES2); if (m) { add('presentacion', 'Presentación', m[1], i, ['Cantidad encontrada sin la palabra «caja» o «contenido»: confirme que sea la presentación.']); used.delete(i); break; } }
  if (concI >= 0) used.delete(concI);
  // --- Condiciones de almacenamiento ---
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].text.match(COND); if (!m || /alcance|ni[ñn]os|children/i.test(m[0]) || !/\d|luz|humedad|fresco|seco|refriger|light|dry/i.test(m[0] + (lines[i + 1]?.text || ''))) continue;
    let v = m[0];
    if (!/[.;]$/.test(lines[i].text) && lines[i + 1] && lines[i + 1].text.length < 70 && !LOT_KW.test(lines[i + 1].text) && !EXP_KW.test(lines[i + 1].text)) { v += ' ' + lines[i + 1].text; used.add(i + 1); }
    add('condiciones', 'Condiciones de almacenamiento', v, i);
    break;
  }
  // --- «Cada tableta contiene: X 50 mg»: principio activo declarado en la composición ---
  let comp = null;
  for (let i = 0; i < lines.length && !comp; i++) {
    const joined = lines[i].text + (lines[i + 1] ? ' ' + lines[i + 1].text : '');
    for (const t of [lines[i].text, joined]) {
      if (!/contienen?/i.test(t)) continue;
      const c = t.match(CONC); if (!c) continue;
      const m = t.slice(0, c.index).match(CONTIENE);
      if (m) { comp = { pa: m[1], conc: c[0], i }; break; }
    }
  }
  if (comp) {
    used.add(comp.i);
    if (!out.some(f => f.field === 'concentracion')) add('concentracion', 'Concentración', comp.conc, comp.i);
  }

  // --- Nombre: la línea de texto más grande entre las legibles que no son lote/fecha/registro/laboratorio ---
  const letters = s => (s.match(/[A-Za-zÁÉÍÓÚÑáéíóúñ]/g) || []).length;
  const cand = lines.map((l, i) => ({ l, i })).filter(({ l, i }) => !used.has(i) && !HEAD.some(([, re]) => re.test(l.text)) && letters(l.text) >= 3 && letters(l.text) / l.text.length > .55 && l.text.length <= 45 && l.text.split(' ').length <= 6 && (l.conf == null || l.conf >= LOW));
  let nameI = -1;
  if (cand.length) {
    const best = cand.reduce((a, b) => (b.l.height > a.l.height * 1.05 ? b : a));
    nameI = best.i;
    let v = best.l.text;
    if (nameI === concI && concM.index > 2) v = v.slice(0, concM.index);
    const notes = [best.l.height ? 'Elegido por ser el texto de mayor tamaño: confirme que sea el nombre.' : 'Elegido por posición: confirme que sea el nombre.'];
    add('nombre', 'Nombre del producto', v, nameI, notes);
    out.unshift(out.pop());
  }
  // --- Principio activo: texto que antecede a la concentración, solo si está en una línea distinta al nombre ---
  if (concI >= 0 && concI !== nameI && concM.index > 2) {
    const v = clean(lines[concI].text.slice(0, concM.index));
    if (letters(v) >= 4 && !comp) { add('principioActivo', 'Principio activo', v, concI, ['Deducido por estar junto a la concentración: confírmelo.']); out.splice(Math.min(1, out.length - 1), 0, out.pop()); }
  }
  if (comp) { add('principioActivo', 'Principio activo', comp.pa, comp.i, ['Tomado de la composición («contiene…»): confírmelo.']); out.splice(Math.min(1, out.length - 1), 0, out.pop()); }
  // Lectura por posición (etiqueta → valor al lado o debajo): completa lo que faltó y avisa si contradice lo leído por renglones.
  const kv = kvExtract(lines.flatMap(l => l.words || []));
  const nrm = v => (v || '').toUpperCase().replace(/[\s.\-\/]/g, '');
  for (const [f, label] of [['lote', 'Número de lote'], ['fechaFabricacion', 'Fecha de fabricación'], ['vencimiento', 'Fecha de vencimiento']]) {
    const k = kv[f]; if (!k) continue;
    const i = out.findIndex(x => x.field === f), cur = out[i];
    const mine = { field: f, label, value: k.value, conf: k.conf, doubt: k.conf < OK, checked: k.conf >= LOW, box: k.box, notes: ['Leído junto a su etiqueta (por posición en el empaque).'] };
    if (!cur) { out.push(mine); if (f === 'vencimiento') warnings.length = 0; }
    else if (nrm(cur.value) === nrm(k.value)) { if (cur.doubt && !mine.doubt && !cur.notes.some(n => /B u 8/.test(n))) Object.assign(cur, { doubt: false, checked: true }); }
    else if (cur.notes.some(n => /sin (?:la )?etiqueta/i.test(n))) { out[i] = mine; }      // la etiquetada gana a una fecha suelta
    else Object.assign(cur, { doubt: true, checked: false, alt: k.value, notes: [...cur.notes, `Junto a la etiqueta se leyó «${k.value}»: elija el que coincide con el empaque.`] });
  }
  const fF = out.find(f => f.field === 'fechaFabricacion'), fV = out.find(f => f.field === 'vencimiento');
  if (fF && fV && ym(fF.value) != null && ym(fV.value) != null && ym(fF.value) >= ym(fV.value)) {
    for (const f of [fF, fV]) { f.doubt = true; f.checked = false; f.notes.push('La fabricación no es anterior al vencimiento: puede haber casillas confundidas o fechas mal leídas. No se intercambiaron; revíselas con el empaque.'); }
  }
  return { fields: out, warnings };
}

// ---------- Lectura de una ZONA marcada por el usuario (se sabe que contiene lote y fechas) ----------
const lev1 = (a, b) => {                       // ¿distancia de edición ≤ 1?
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, d = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++d > 1) return false;
    if (a.length > b.length) i++; else if (a.length < b.length) j++; else { i++; j++; }
  }
  return d + (a.length - i) + (b.length - j) <= 1;
};
const FUZZY = [['LOTE', 'LOTE'], ['BATCH', 'LOTE'], ['VENCE', 'VENCE'], ['VENC', 'VENCE'], ['VENCIMIENTO', 'VENCE'], ['EXPIRA', 'VENCE'], ['FABRICACION', 'FAB'], ['ELAB', 'FAB']];
// Corrige solo las ETIQUETAS mal leídas («LUTE», «VENLE»); los valores nunca se tocan.
function fixLabels(text) {
  return text.replace(/[A-Za-zÁÉÍÓÚáéíóú0]{4,11}(?=\s*[:.\-]?\s|\s*[:.\-]|$)/g, w => {
    if (/\d/.test(w.replace(/0/g, ''))) return w;
    const u = w.toUpperCase().replace(/0/g, 'O').normalize('NFD').replace(/[̀-ͯ]/g, '');
    const hit = FUZZY.find(([k]) => lev1(u, k));
    return hit ? hit[1] : w;
  });
}
const ZKEY = /^(LOTE?|LOT|BATCH|VENCE|VENC|VTO|EXP|CAD|FAB|MFG|MFD|ELAB|FECHA|DATE|DE|NO|N[°º]?)$/i;
// Devuelve {lote, fechaFabricacion, vencimiento}: cada uno {value, labelled} o ausente.
export function extractZone(lines) {
  const ls = boxLabels(lines.map(l => ({ ...l, text: fixMonth(unspace((l.text || '').replace(/\s+/g, ' ').trim())) }))).map(l => ({ ...l, text: fixLabels(clean(l.text)) })).filter(l => l.text.length > 1);
  const out = {};
  for (const f of extractFields(ls).fields) if (['lote', 'fechaFabricacion', 'vencimiento'].includes(f.field) && !f.doubt && !out[f.field]) out[f.field] = { value: f.value, labelled: true };
  // Sin etiqueta legible: en la zona marcada, las fechas válidas y el código alfanumérico restante son los candidatos.
  const taken = new Set(Object.values(out).map(o => o.value));
  const dates = [];
  let rest = '';
  for (const l of ls) {
    let t = l.text;
    for (const d of findDates(l.text)) { if (ym(d[0]) != null && !taken.has(d[0])) dates.push(d[0]); t = t.replace(d[0], ' '); }
    rest += ' ' + t;
  }
  const uniq = [...new Set(dates)].sort((a, b) => ym(a) - ym(b));
  if (!out.vencimiento && !out.fechaFabricacion) {
    if (uniq.length >= 2) { out.fechaFabricacion = { value: uniq[0] }; out.vencimiento = { value: uniq[uniq.length - 1] }; }
    else if (uniq.length === 1) out.vencimiento = { value: uniq[0] };
  } else if (!out.vencimiento) { const v = uniq.filter(d => ym(d) > ym(out.fechaFabricacion.value)).pop(); if (v) out.vencimiento = { value: v }; }
  else if (!out.fechaFabricacion) { const v = uniq.find(d => ym(d) < ym(out.vencimiento.value)); if (v) out.fechaFabricacion = { value: v }; }
  if (!out.lote) {
    const tok = rest.split(/[\s:;,|]+/).map(t => t.replace(/^[.\-]+|[.\-]+$/g, '')).find(t => /^[A-Z0-9][A-Z0-9\-\/]{2,15}$/i.test(t) && /\d/.test(t) && !ZKEY.test(t));
    if (tok) out.lote = { value: tok };
  }
  for (const f of ['fechaFabricacion', 'vencimiento']) if (out[f]) out[f].value = monthToNumber(out[f].value);
  return out;
}
export const dateOK = s => ym(s) != null;
export { ym, findDates, lotOK };

// ---------- Lectura POR POSICIÓN: etiqueta → valor a su derecha o debajo ----------
// En muchos empaques las etiquetas (Lote:, F.F.:, F.V.:, Prep.:, Venc.:) van en una columna y los valores al lado, y el OCR
// mezcla cada renglón con el texto de la otra columna. Aquí se usan las coordenadas de cada palabra.
// words: [{text, bbox:{x0,y0,x1,y1}, conf}] de toda la imagen. Devuelve {lote, fechaFabricacion, vencimiento}: {value, conf}.
const KV = [
  ['lote', /^(?:L[O0]TE|LOT|BATCH|L)[.:;,]*$/i],
  ['fechaFabricacion', /^(?:F\.?F\.?|FAB\w*|F|MFG|MFD|ELAB\w*|PREP\w*)[.:;,]*$/i],
  ['vencimiento', /^(?:F\.?V\.?|V|VENC\w*|VENCE|VTO|EXP\w*|CAD\w*)[.:;,]*$/i],
];
const SKIP = /^(?:N[°ºo]?\.?|NO\.?|#|:|\.)[.:;,]*$/i;            // «Lote N.:» → se salta «N.:»
export function kvExtract(words) {
  const all = (words || []).filter(w => w?.bbox && w.text && w.text.trim());
  const out = kvCore(all.filter(w => !w.rot));
  // Texto vertical (solapas): se «endereza» en los dos sentidos posibles y se toma el que dé más datos.
  const vert = all.filter(w => w.rot);
  if (vert.length) {
    const turn = s => vert.map(w => ({ ...w, raw: w.bbox, bbox: s > 0 ? { x0: w.bbox.y0, x1: w.bbox.y1, y0: -w.bbox.x1, y1: -w.bbox.x0 } : { x0: -w.bbox.y1, x1: -w.bbox.y0, y0: w.bbox.x0, y1: w.bbox.x1 } }));
    const a = kvCore(turn(1)), b = kvCore(turn(-1)), best = Object.keys(a).length >= Object.keys(b).length ? a : b;
    for (const k of Object.keys(best)) if (!out[k]) out[k] = best[k];
  }
  return out;
}
function kvCore(words) {
  const ws = words.map(w => ({ ...w, text: w.text.trim(), h: w.bbox.y1 - w.bbox.y0, cy: (w.bbox.y0 + w.bbox.y1) / 2 }));
  const out = {};
  for (const [field, re] of KV) {
    for (const lab of ws) {
      // «L.6B0985» o «Lote:25D04» pegados en una sola palabra
      const glued = lab.text.match(/^(L[O0]TE|LOT|L|F\.?F|F\.?V|F|V|VENC\w*|PREP\w*)[.:;,]+(.+)$/i);
      let cands;
      if (glued && /\d/.test(glued[2]) && re.test(glued[1] + '.')) cands = [{ ...lab, text: glued[2] }];
      else if (re.test(lab.text)) {
        const h = Math.max(lab.h, 8);
        const right = ws.filter(w => w !== lab && w.bbox.x0 >= lab.bbox.x1 - h * 0.2 && w.bbox.x0 - lab.bbox.x1 < h * 14 && Math.abs(w.cy - lab.cy) < h * 0.7 && !SKIP.test(w.text)).sort((a, b) => a.bbox.x0 - b.bbox.x0);
        const below = ws.filter(w => w !== lab && w.bbox.y0 >= lab.bbox.y1 - h * 0.2 && w.bbox.y0 - lab.bbox.y1 < h * 1.2 && Math.abs(w.bbox.x0 - lab.bbox.x0) < h * 3).sort((a, b) => a.bbox.y0 - b.bbox.y0);
        cands = right.length ? right : below;
      } else continue;
      // Valor: primera palabra (o 2–3 juntas para fechas con espacios) del tipo correcto.
      for (let i = 0; i < cands.length && !out[field]; i++) {
        if (KV.some(([, r]) => r.test(cands[i].text))) break;          // llegó a otra etiqueta
        const join = [0, 1, 2].map(n => cands.slice(i, i + n + 1).map(w => w.text).join('')).map(t => t.replace(/^[^A-Z0-9]+|[^A-Z0-9]+$/gi, ''));
        let v = null;
        if (field === 'lote') v = lotOK(join[0]);
        else for (const t of join) { const fx = fixMonth(unspace(t)); const d = new RegExp('^' + DATE_SRC + '$', 'i').test(fx) && ym(fx) != null ? fx : null; if (d) { v = monthToNumber(d); break; } }
        const R = w => w.raw || w.bbox, bs = [R(lab), ...cands.slice(i, i + 3).map(R)];      // caja en coordenadas reales de la foto
        if (v) out[field] = { value: v, conf: Math.min(lab.conf ?? 100, cands[i].conf ?? 100), box: { x0: Math.min(...bs.map(b => b.x0)), y0: Math.min(...bs.map(b => b.y0)), x1: Math.max(...bs.map(b => b.x1)), y1: Math.max(...bs.map(b => b.y1)) } };
        if (field === 'lote') break;
      }
      if (out[field]) break;
    }
  }
  return out;
}
