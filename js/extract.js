// Extracción de campos a partir del texto OCR. Función pura (sin DOM) para poder probarla de forma aislada.
// Principios: solo se devuelve texto realmente leído; no se corrige ningún carácter; lo incierto se marca como dudoso.
// Entrada: lines = [{text, conf (0-100 | null), height (px | 0)}]
const MES = 'ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|SET|OCT|NOV|DIC|JAN|APR|AUG|DEC';
const DATE_SRC = String.raw`(?:\d{1,2}[\/\-. ]\d{1,2}[\/\-. ]\d{2,4}|\d{4}[\/\-.]\d{1,2}(?:[\/\-.]\d{1,2})?|\d{1,2}[\/\-. ]\d{4}|\d{1,2}[\/\-.]\d{2}|(?:\d{1,2}[\/\-. ]{0,2})?(?:${MES})[A-Z]{0,7}\.?[\/\-. ]{0,2}\d{2,4})`;
const DATE = new RegExp(DATE_SRC, 'i');
const DATE_G = new RegExp(DATE_SRC, 'ig');
const EXP_KW = /(?:^|[^A-Za-z])(EXPIRY(?:\s*DATE)?|EXPIRATION(?:\s*DATE)?|EXP(?:IRA)?|CADUCIDAD|CAD|VENCIMIENTO|VENCE|VENC|VTO|F\.?\s?V(?:ENC)?|FECHA\s+(?:DE\s+)?(?:VENC\w*|EXP\w*|CAD\w*)|USE\s+BY|V[AÁ]LIDO\s+HASTA)(?![A-Za-z])\.?\s*(?:DATE)?\s*[:.\-]?\s*/i;
const MFG_KW = /(?:^|[^A-Za-z])(MFG|MFD|FAB|ELAB|F\.?\s?F|FECHA\s+(?:DE\s+)?(?:FAB\w*|ELAB\w*)|MANUFACTUR\w*|PRODUCCI[OÓ]N)(?![A-Za-z])/i;
const LOT_KW = /(?:^|[^A-Za-z0-9])(L[O0]TE|L[O0]T|BATCH|LT)(?![A-Za-z])\.?\s*(?:N[°ºo]\.?|NO\.?|NUM\.?|#)?\s*[:.\-]?\s*([A-Z0-9][A-Z0-9\-\/]{1,19})/i;
const REG_KW = /(?:^|[^A-Za-z])(?:REG(?:ISTRO)?\.?\s*(?:SAN(?:ITARIO)?\.?)?\s*(?:N[°ºo]\.?|NO\.?)?\s*[:.\-]?\s*(?:INVIMA)?|INVIMA|R\.\s?S\.)\s*(?:N[°ºo]\.?|NO\.?)?\s*[:.\-]?\s*(\d{4}\s?[A-Z]{1,2}\s?-?\s?[\dA-Z][\dA-Z\-]{2,}|[A-Z0-9][A-Z0-9\-\/.]{4,})/i;
const CONC = /\d+(?:[.,]\d+)?\s?(?:mg|mcg|µg|ug|g|ml|mL|UI|U\.I\.|IU|mEq|%)(?![A-Za-z])(?:\s?\/\s?\d*(?:[.,]\d+)?\s?(?:ml|mL|g|mg|L|dosis|tableta|c[aá]psula|comprimido))?/i;
const FORMA = /(?:^|[^a-záéíóúñ])(tabletas?(?: recubiertas?| masticables?| efervescentes?)?|comprimidos?(?: recubiertos?)?|c[aá]psulas?(?: blandas?| duras?)?|grageas?|jarabe|suspensi[oó]n(?: oral| inyectable)?|soluci[oó]n(?: oral| inyectable| oft[aá]lmica| t[oó]pica| nasal)?|polvo para [a-záéíóúñ ]{3,40}|crema|ung[uü]ento|pomada|gel|gotas|supositorios?|[oó]vulos?|aerosol|inhalador|emulsi[oó]n|loci[oó]n|parches?|elixir|tablets?|capsules?|syrup|cream|ointment)(?![a-záéíóúñ])/i;
const PRES = /((?:caja|frasco|bl[ií]ster|envase|tubo|sobre|estuche|ampolla|vial|bolsa)s?\s+(?:con|por|x|de)\s+\d+[^\n]{0,40}|(?:^|\s)(?:x|por|con)\s?\d+\s*(?:tabletas?|c[aá]psulas?|comprimidos?|grageas?|sobres?|ampollas?|unidades|ml|mL|g)(?![a-z])[^\n]{0,20})/i;
const LAB = /(?:^|[^A-Za-z])(LABORATORIOS?|LAB\.)\s+[^\n]{2,60}/i;
const FAB = /(?:(?:FABRICADO|ELABORADO|MANUFACTURADO|PRODUCIDO|HECHO)\s+(?:Y\s+\w+\s+)?POR|FABRICANTE|MANUFACTURED\s+BY|MADE\s+BY)\s*[:.\-]?\s*([^\n]{0,70})/i;
// Caracteres que el OCR confunde con frecuencia cuando hay letras y números mezclados.
const AMBIG = /\d[OISBl]|[OISBl]\d|[A-Z][0158]|[0158][A-Z]/;

const clean = s => s.replace(/\s+/g, ' ').replace(/^[\s:.\-–|]+|[\s:.\-–|,;]+$/g, '').trim();
const LOW = 60, OK = 80;

export function extractFields(lines) {
  lines = lines.map(l => ({ text: clean(l.text || ''), conf: l.conf ?? null, height: l.height || 0 })).filter(l => l.text.length > 1);
  const out = [], used = new Set(), warnings = [];
  const add = (field, label, value, i, notes = [], forceDoubt = false) => {
    value = clean(value); if (!value) return;
    const conf = lines[i]?.conf ?? null;
    if (conf != null && conf < OK) notes.push('Confianza de lectura baja.');
    const doubt = forceDoubt || (conf != null && conf < OK);
    // Solo se premarcan los datos leídos con seguridad suficiente.
    out.push({ field, label, value, conf, doubt, notes, checked: !forceDoubt && (conf == null || conf >= LOW) });
    used.add(i);
  };

  // --- Vencimiento (antes que el lote, para no confundirlos) ---
  let expLabelNoDate = false, expFound = false;
  lines.forEach((l, i) => {
    if (expFound) return;
    const m = l.text.match(EXP_KW); if (!m) return;
    const rest = l.text.slice(m.index + m[0].length);
    let d = rest.match(DATE), src = i;
    if (!(d && d.index <= 8) && lines[i + 1] && !rest.trim()) { d = lines[i + 1].text.match(DATE); src = i + 1; if (d && d.index > 4) d = null; }
    else if (d && d.index > 8) d = null;
    if (d) { expFound = true; add('vencimiento', 'Fecha de vencimiento', d[0], src, /[OISBl]/.test(d[0].replace(new RegExp(MES, 'i'), '')) ? ['La fecha contiene letras que podrían ser números mal leídos. Verifique con el empaque.'] : [], false); }
    else expLabelNoDate = true;
  });
  if (!expFound) {
    const loose = [];
    lines.forEach((l, i) => { for (const d of l.text.matchAll(DATE_G)) { const before = l.text.slice(0, d.index); if (!MFG_KW.test(before) && !LOT_KW.test(before + d[0]) && /\d{2}/.test(d[0])) loose.push([d[0], i]); } });
    if (loose.length === 1) add('vencimiento', 'Fecha de vencimiento', loose[0][0], loose[0][1], ['Fecha encontrada sin la etiqueta EXP/VENCE: podría no ser el vencimiento.'], true);
    warnings.push(expLabelNoDate ? 'Se encontró la etiqueta de vencimiento, pero la fecha no es legible. Revísela en el empaque e ingrésela manualmente.'
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

  // --- Concentración, forma farmacéutica, presentación ---
  let concI = -1, concM = null;
  for (let i = 0; i < lines.length; i++) { const m = lines[i].text.match(CONC); if (m) { concI = i; concM = m; break; } }
  if (concM) add('concentracion', 'Concentración', concM[0], concI);
  for (let i = 0; i < lines.length; i++) { const m = lines[i].text.match(FORMA); if (m) { add('formaFarmaceutica', 'Forma farmacéutica', m[1], i); used.delete(i); break; } }
  for (let i = 0; i < lines.length; i++) { const m = lines[i].text.match(PRES); if (m) { add('presentacion', 'Presentación', m[1], i); used.delete(i); break; } }
  if (concI >= 0) used.delete(concI);

  // --- Nombre: la línea de texto más grande entre las legibles que no son lote/fecha/registro/laboratorio ---
  const letters = s => (s.match(/[A-Za-zÁÉÍÓÚÑáéíóúñ]/g) || []).length;
  const cand = lines.map((l, i) => ({ l, i })).filter(({ l, i }) => !used.has(i) && letters(l.text) >= 3 && letters(l.text) / l.text.length > .55 && (l.conf == null || l.conf >= LOW));
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
    if (letters(v) >= 4) { add('principioActivo', 'Principio activo', v, concI, ['Deducido por estar junto a la concentración: confírmelo.']); out.splice(Math.min(1, out.length - 1), 0, out.pop()); }
  }
  return { fields: out, warnings };
}
