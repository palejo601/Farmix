// Registro y edición de productos: formulario, fotografía, OCR con revisión humana.
import { $, $$, h, toast, modal, confirmDlg, busy, fmtBytes, errMsg } from './ui.js';
import * as db from './db.js';
import { processFile, toStored, fromStored, blobToCanvas, freeCanvas, enhance } from './photos.js';
import { recognize, recognizeOnline, nativeOcrEngine, ENGINE_NAME } from './ocr.js';
import { extractFields, extractZone, dateOK } from './extract.js';
import { liveScan } from './live.js';
import { readBoxes, mergeBoxes } from './boxes.js';
import { readRelief, voteRelief, readReliefAuto } from './relief.js';
import { readTiles } from './tiles.js';
import { fixLotLines } from './glyphs.js';
import { verifyFields } from './verify.js';
import { LOW } from './perf.js';
import { aiReady, aiConfig, aiReadLotDates } from './ai.js';
import { monthToNumber } from './extract.js';

export const FIELDS = [
  ['nombre', 'Nombre del producto'], ['codigoBarras', 'Código de barras'], ['principioActivo', 'Principio activo'],
  ['concentracion', 'Concentración'], ['formaFarmaceutica', 'Forma farmacéutica'], ['presentacion', 'Presentación'],
  ['laboratorio', 'Laboratorio o fabricante'], ['registroSanitario', 'Registro sanitario'], ['lote', 'Número de lote'],
  ['fechaFabricacion', 'Fecha de fabricación'], ['vencimiento', 'Fecha de vencimiento'], ['ubicacion', 'Ubicación'], ['condiciones', 'Condiciones de almacenamiento'], ['observaciones', 'Observaciones'],
];
export const SRC_LABEL = { manual: 'Manual', ocr: 'OCR · confirmado por el usuario', codigo: 'Leído del código de barras' };
const SRC_CHIP = { ocr: 'OCR', codigo: 'Código leído' };

// Estado del formulario en edición
let st = blank();
function blank() { return { id: null, createdAt: null, origen: {}, formatoCodigo: '', photo: null, src: null, photoUrl: null, photoState: 'keep', thumb: '', log: [], dirty: false }; }
const input = f => $('#f-' + f);
const norm = s => (s || '').toString().trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');

function chips() {
  for (const [f] of FIELDS) {
    const lab = $(`label[for="f-${f}"]`); lab.querySelector('.src')?.remove();
    const s = st.origen[f];
    if (SRC_CHIP[s] && input(f).value.trim()) lab.append(h('span', { class: 'chip src' + (s === 'ocr' ? ' warn' : '') }, SRC_CHIP[s]));
  }
}

function showPhoto() {
  if (st.photoUrl) { URL.revokeObjectURL(st.photoUrl); st.photoUrl = null; }   // liberar la URL temporal anterior
  const has = !!st.photo;
  $('#photo-box').hidden = !has; $('#photo-empty').hidden = has;
  if (has) {
    st.photoUrl = URL.createObjectURL(st.photo.blob);
    $('#photo-preview').src = st.photoUrl;
    $('#photo-info').textContent = `${st.photo.w} × ${st.photo.h} px · ${fmtBytes(st.photo.blob.size)} guardados en el dispositivo`;
  } else $('#photo-preview').removeAttribute('src');
}

function fill(rec) {
  for (const [f] of FIELDS) { input(f).value = rec?.[f] || ''; input(f).classList.remove('invalid'); }
  clearSuggestions(); $('#autofill-note').hidden = true;
  $('#form-error').hidden = true;
  $('#form-title').textContent = st.id ? 'Editar registro' : 'Registrar producto';
  $('#btn-save').lastChild.textContent = st.id ? 'Guardar cambios' : 'Guardar registro';
  chips(); showPhoto();
}
const values = () => Object.fromEntries(FIELDS.map(([f]) => [f, input(f).value.trim()]));

// ---- Borrador: recuperación ante cierres inesperados ----
let draftTimer = 0;
function scheduleDraft() {
  st.dirty = true;
  clearTimeout(draftTimer);
  draftTimer = setTimeout(saveDraft, 500);
}
async function saveDraft() {
  try {
    await db.kvSet('draft', { id: st.id, createdAt: st.createdAt, origen: st.origen, formatoCodigo: st.formatoCodigo, photoState: st.photoState, thumb: st.thumb, log: st.log, values: values(),
      photo: st.photoState === 'new' && st.photo ? await toStored(st.photo) : null, at: Date.now() });
    const c = $('#draft-chip'); c.hidden = false; c.textContent = 'Borrador guardado';
  } catch { /* el borrador es un apoyo: no interrumpe el trabajo */ }
}
async function clearDraft() { clearTimeout(draftTimer); st.dirty = false; $('#draft-chip').hidden = true; await db.kvDel('draft').catch(() => {}); }

export async function restoreDraft() {
  const d = await db.kvGet('draft').catch(() => null);
  if (!d || !Object.values(d.values || {}).some(Boolean) && !d.photo) return false;
  st = { ...blank(), id: d.id, createdAt: d.createdAt, origen: d.origen || {}, formatoCodigo: d.formatoCodigo || '', photoState: d.photoState || 'keep', thumb: d.thumb || '', log: d.log || [], dirty: true };
  if (d.photo) st.photo = fromStored(d.photo);
  else if (d.id && d.photoState === 'keep') st.photo = fromStored(await db.getPhoto(d.id).catch(() => null));
  fill(d.values);
  const c = $('#draft-chip'); c.hidden = false; c.textContent = 'Borrador recuperado';
  toast('Se recuperó un registro sin guardar. Revíselo y pulse Guardar, o Limpiar para descartarlo.', 'warn', 6000);
  return true;
}

export async function newRecord(force = false) {
  if (!force && st.dirty && !(await confirmDlg('Descartar cambios', 'Hay datos sin guardar en el formulario. ¿Desea descartarlos?', 'Descartar', true))) return false;
  st = blank(); fill(null); await clearDraft();
  return true;
}

export async function editRecord(id) {
  const rec = await db.getRecord(id);
  if (!rec) { toast('El registro ya no existe.', 'err'); return; }
  if (st.dirty && st.id !== id && !(await confirmDlg('Descartar cambios', 'Hay datos sin guardar en el formulario. ¿Desea descartarlos y abrir este registro?', 'Descartar', true))) return;
  st = { ...blank(), id: rec.id, createdAt: rec.createdAt, origen: { ...(rec.origen || {}) }, formatoCodigo: rec.formatoCodigo || '', thumb: rec.thumb || '', log: rec.log || [] };
  st.photo = fromStored(await db.getPhoto(id).catch(() => null));
  fill(rec); await clearDraft();
  location.hash = '#registrar';
}

// ---- Fotografía ----
function photoProgress(text, frac) {
  const p = $('#photo-progress');
  if (text === false) { p.hidden = true; return; }
  p.hidden = false; p.querySelector('i').style.width = Math.round((frac || 0) * 100) + '%'; p.querySelector('span').textContent = text;
}

export async function setPhotoFromFile(file, after) {
  location.hash = '#registrar';
  const tStart = performance.now();          // el tiempo mostrado incluye preparar la foto
  try {
    photoProgress('Leyendo la fotografía…', .05);
    const p = await processFile(file, photoProgress);
    st.photo = { blob: p.blob, w: p.w, h: p.h }; st.thumb = p.thumb; st.photoState = 'new';
    st.src = p.hi;                                         // copia de lectura en memoria (no se reabre el archivo original)
    st.quality = p.quality || null;
    showPhoto(); scheduleDraft();
    toast(`Fotografía lista (${fmtBytes(p.original)} → ${fmtBytes(p.blob.size)}).`, 'ok');
  } catch (e) {
    toast(errMsg(e), 'err', 6500);
    return;
  } finally { setTimeout(() => photoProgress(false), 600); }
  if (after === 'live') return;                          // foto tomada por el escáner en vivo: los datos ya se leyeron
  if ((await db.kvGet('autoFill').catch(() => null)) !== false) { await autoFill(tStart); return; }
  if (after === 'ocr' || after === 'all') await runOCR();
}

async function removePhoto() {
  if (!(await confirmDlg('Eliminar fotografía', '¿Quitar la fotografía de este registro? Los datos escritos se conservan.', 'Eliminar', true))) return;
  st.photo = null; st.src = null; st.thumb = ''; st.photoState = 'del';
  showPhoto(); scheduleDraft();
}

// ---- Código de barras ----
function setField(f, v, src) {
  input(f).value = v; st.origen[f] = src; input(f).classList.remove('invalid');
}

// ---- OCR con pantalla de revisión ----
// extra = otra fotografía (otra cara del empaque) que solo se lee; no reemplaza la foto guardada del registro.
// Lectura de una foto: texto (en línea si está configurado; si no, en el teléfono).
// extras=true añade en el mismo paso las lecturas extra de lote y fechas. No toca el formulario.
async function analyze(source, extras = true, side = 2600) {
  let res, canvas, onlineErr = '';
  try {
    busy('Leyendo el texto de la foto…');
    canvas = await blobToCanvas(source, side);
    // Con internet y clave configurada se usa primero el servicio en línea; si falla o no hay conexión, el OCR local.
    const on = await db.kvGet('onlineOcr').catch(() => null);
    if (on?.enabled && on.key && navigator.onLine) {
      try { res = await recognizeOnline(canvas, on.key, busy); }
      catch (e) { onlineErr = errMsg(e); }
    }
    if (!res) res = await recognize(canvas, busy);
    if (!res.online) fixLotLines(canvas, res.lines);           // B u 8: se decide por la forma del carácter
    const o = { ...extractFields(res.lines), res, onlineErr, baseW: canvas.width, baseH: canvas.height };
    if (extras) await morePasses(canvas, o, busy, () => true, source);
    return o;
  } finally { freeCanvas(canvas); }
}

// Lecturas adicionales solo si faltan lote o vencimiento: suelen estar impresos aparte, por puntos o con poco contraste.
// alive() permite cancelarlas entre una lectura y otra (por ejemplo, si el usuario cambió de foto).
const LD = ['lote', 'vencimiento', 'fechaFabricacion'];
async function morePasses(canvas, o, prog, alive = () => true, hiSrc = null) {
  const miss = f => !o.fields.some(x => x.field === f && !x.doubt);
  const need = () => alive() && (miss('lote') || miss('vencimiento'));
  const merge = (r, note, doubt, anyHit = false) => {
    const e2 = extractFields(r.lines);
    for (const f of LD) {
      const hit = e2.fields.find(x => x.field === f && (anyHit || !x.doubt));
      if (miss(f) && hit) { o.fields = o.fields.filter(x => x.field !== f).concat({ ...hit, doubt, checked: hit.checked && !doubt, notes: [...hit.notes, note] }); if (f === 'vencimiento') o.warnings = []; }
    }
    o.res.text += '\n— Lectura adicional —\n' + r.text;
  };
  // Primero las casillas impresas (L, F, V): recortes pequeños, rápidos de leer.
  const native = await nativeOcrEngine();
  if (!native && alive()) { try { mergeBoxes(o.fields, await readBoxes(canvas, t => prog(t))); } catch { /* sin casillas legibles */ } if (!miss('vencimiento')) o.warnings = []; }
  // (con el lector nativo la «segunda lectura dispersa» daría lo mismo que la primera: se omite)
  if (!native && need()) merge(await recognize(canvas, (t, f) => prog('Segunda lectura (lote y fechas)…', f), true), 'Detectado en una segunda lectura de la imagen.', false);
  // Texto pequeño o aislado que la lectura de la página completa no detectó: lectura por partes ampliadas (solo Tesseract).
  if (!native && need()) {
    try {
      const t = await readTiles(canvas, x => prog(x), alive, hiSrc);
      const e1 = extractFields(t.lines).fields, e2 = t.alt ? extractFields(t.alt).fields : [];
      for (const f of LD) {
        const a = e1.find(x => x.field === f), b = e2.find(x => x.field === f);
        if (!miss(f) || !a) continue;
        const differ = b && b.value.replace(/\s/g, '') !== a.value.replace(/\s/g, '');
        const hit = { ...a, doubt: a.doubt || differ, checked: !(a.doubt || differ), alt: differ ? b.value : null,
          notes: [...a.notes, 'Leído en una zona ampliada de la foto.', ...(differ ? [`Otra lectura de la misma zona dio «${b.value}»: confusión probable entre letras y números (B/8, O/0, G/6). Elija la que coincide con el empaque.`] : [])] };
        o.fields = o.fields.filter(x => x.field !== f).concat(hit);
        if (f === 'vencimiento') o.warnings = [];
      }
      o.res.text += '\n— Lectura por partes —\n' + t.lines.map(l => l.text).join('\n');
    } catch { /* sin texto adicional */ }
  }
  // Texto GIRADO (solapas con lote y fechas en vertical): si se ve una etiqueta de lote o fecha sin su valor, se lee la foto girada.
  // Apple Vision no lee texto a 90°: en iPhone se prueba siempre girada si aún faltan datos.
  // ML Kit ya lee texto girado: la lectura de la foto girada solo se hace con Apple Vision o con Tesseract.
  if (native !== 'mlkit' && need() && (native === 'vision' || /\b(?:LOTE?|LOT|VENC\w*|VENCE|PREP\w*|F\.\s?V|F\.\s?F|EXP)\b/i.test(o.res.text))) {
    for (const deg of [90, 270]) {
      if (!need()) break;
      prog(`Leyendo el texto girado (${deg}°)…`);
      const k = Math.min(1, 2200 / Math.max(canvas.width, canvas.height)), rc = document.createElement('canvas');
      rc.width = Math.round(canvas.height * k); rc.height = Math.round(canvas.width * k);
      const x = rc.getContext('2d'); x.translate(rc.width / 2, rc.height / 2); x.rotate(deg * Math.PI / 180);
      x.drawImage(canvas, -canvas.width * k / 2, -canvas.height * k / 2, canvas.width * k, canvas.height * k);
      try { const rr = await recognize(rc, () => {}, '3'); fixLotLines(rc, rr.lines); merge(rr, `Leído en la foto girada ${deg}°: compárelo con el empaque.`, true, true); }
      catch { /* sin texto girado */ } finally { freeCanvas(rc); }
    }
  }
  // Lote y fechas EN RELIEVE (troquelados sin tinta): siempre quedan pendientes de revisión, nunca se dan por seguros.
  // Es la lectura más pesada: en teléfonos lentos no se hace sola (para esos casos está «Escanear lote y fechas»).
  if (!LOW && need()) {
    try {
      const rl = await readReliefAuto(canvas, t => prog(t));
      if (rl.length) merge({ lines: rl, text: rl.map(l => l.text).join('\n') }, 'Leído en RELIEVE (marcado sin tinta): esta lectura confunde dígitos con frecuencia. Compárelo carácter por carácter con el empaque.', true, true);
    } catch { /* sin texto en relieve */ }
  }
  if (!(LOW && native) && need()) {
    prog('Realzando la imagen…');
    const ec = enhance(canvas);
    try { merge(await recognize(ec, (t, f) => prog('Tercera lectura con imagen realzada…', f), true), 'Leído tras realzar la imagen (impresión tenue o por puntos): este tipo de lectura falla con frecuencia. Compárelo carácter por carácter con el empaque antes de marcarlo.', true); }
    finally { freeCanvas(ec); }
  }
}

// Usa la copia de lectura en alta resolución; si no se puede abrir, la foto guardada del registro.
async function withPhoto(fn) {
  try { return await fn(st.src || st.photo.blob); }
  catch (e) { if (st.src && st.photo) { st.src = null; return fn(st.photo.blob); } throw e; }
}

async function runOCR(extra = null) {
  if (!(extra instanceof Blob)) extra = null;
  if (!extra && !st.photo) { toast('Primero seleccione una fotografía.', 'warn'); return; }
  let r;
  busy('Preparando la lectura…');
  try { r = extra ? await analyze(extra) : await withPhoto(src => analyze(src)); }
  catch (e) { busy(false); await modal('No se pudo reconocer el texto', h('div', {}, h('p', {}, errMsg(e)), h('p', { class: 'muted small' }, 'Los datos del formulario no se modificaron. Puede ingresarlos manualmente.'))); return; }
  finally { busy(false); }
  return review(r.fields, r.warnings, r.res, r.onlineErr, extra);
}

// ---- Llenado automático: al elegir la foto el formulario se completa solo ----
function clearSuggestions() { $$('#product-form .sugg').forEach(e => e.remove()); }
function suggest(field, value, note, alt = null) {
  const box = input(field)?.parentElement; if (!box) return;
  box.querySelector('.sugg')?.remove();
  const use = v => h('button', { type: 'button', class: 'btn small', onclick: e => { setField(field, v, 'ocr'); chips(); scheduleDraft(); e.target.closest('.sugg').remove(); } }, `Usar «${v}»`);
  box.append(h('div', { class: 'sugg' }, h('span', {}, note + ' '), use(value), alt && alt !== value ? use(alt) : null));
}
// srcBlob: otra cara de la misma caja (no reemplaza la foto del registro); en ese caso solo se completa lo que está vacío.
export async function autoFill(tStart, srcBlob = null) {
  if (!st.photo) { toast('Primero seleccione una fotografía.', 'warn'); return; }
  const face = !!srcBlob, SRC = () => srcBlob || st.src || st.photo.blob;
  if (!face) clearSuggestions();
  const note = $('#autofill-note'), label = Object.fromEntries(FIELDS);
  let r; const t0 = tStart || performance.now();
  busy('Leyendo la foto…');
  const seq = ++readSeq;
  // Asistente IA: arranca YA con la foto completa, en paralelo con el lector del teléfono, y no bloquea la pantalla.
  // Si necesita releer ampliado, usa la zona que el teléfono ubique (llega como promesa).
  const aiOn = await aiReady();
  let zoneOk; const zoneP = new Promise(res => { zoneOk = res; });
  const aiP = aiOn ? aiConfig().then(c => aiReadLotDates(SRC(), c.key, zoneP)).catch(e => ({ error: errMsg(e) })) : null;
  // Primera lectura sobre la copia de alta calidad (la guardada está comprimida y confunde dígitos); luego se verifican lote y fechas.
  try {
    const side = (await nativeOcrEngine()) ? (LOW ? 2400 : 3200) : (LOW ? 1800 : 2200);   // el lector nativo aprovecha más resolución; menos en teléfonos lentos
    r = face ? await analyze(srcBlob, false, side) : await withPhoto(src => analyze(src, false, side)).catch(() => analyze(st.photo.blob, false, 1800));
    zoneOk(lotZone(r));
    if (!r.res.online) await verifyFields(r.fields, SRC(), r.baseW, t => busy(t));
  }
  catch (e) {
    zoneOk(null);
    if (aiP) { aiFollowUp(r || { fields: [] }, seq, aiP, new Set()); }
    busy(false); note.hidden = false; note.className = 'banner danger';
    note.textContent = 'No se pudo leer la foto: ' + errMsg(e) + ' Puede volver a intentarlo o escribir los datos.';
    return;
  } finally { busy(false); }
  const { res, onlineErr } = r, fields = [...r.fields], secs = ((performance.now() - t0) / 1000).toFixed(1);
  st.diag = { quality: st.quality, engine: res.online ? 'OCR.space (en línea)' : ENGINE_NAME[res.engine || ''], secs, text: res.text, fields: r.fields, ai: aiP ? { notes: ['Leyendo…'] } : null };
  let filled = 0; const doubts = [], filledNow = new Set();
  for (const f of fields) {
    const cur = input(f.field).value.trim(), src = st.origen[f.field];
    const mine = cur && (face || src !== 'ocr');   // lo escrito por el usuario nunca se reemplaza; con otra cara, nada ya lleno
    if (cur === f.value) continue;
    const weak = f.doubt || (f.conf != null && f.conf < 60);
    if (weak || mine) { suggest(f.field, f.value, f.alt ? 'Dos lecturas posibles, elija la que coincide con el empaque:' : weak ? 'Lectura dudosa, verifíquela:' : 'En la foto se leyó otro valor:', f.alt); doubts.push(label[f.field]); continue; }
    setField(f.field, f.value, 'ocr'); filledNow.add(f.field);
    filled++;
  }
  chips(); scheduleDraft();
  const missing = ['lote', 'vencimiento'].filter(k => !input(k).value.trim() && !fields.some(x => x.field === k)).map(k => label[k].toLowerCase());
  note.hidden = false; note.className = 'banner' + (filled ? '' : ' danger');
  note.replaceChildren(h('div', {},
    h('b', {}, face ? (filled ? `Otra cara de la caja: se completaron ${filled} campo(s)` : 'Otra cara de la caja: no se agregaron datos nuevos con seguridad') : filled ? `Se llenaron ${filled} campo(s) desde la foto` : 'No se pudo llenar ningún campo con seguridad'),
    ` (${res.online ? 'lectura en línea' : 'lectura en el teléfono con ' + ENGINE_NAME[res.engine || '']}, ${secs} s${onlineErr ? '; el servicio en línea no respondió' : ''}). Compruebe que coincidan con el empaque antes de guardar.`,
    doubts.length ? h('div', { style: 'margin-top:6px' }, `Para revisar: ${doubts.join(', ')} (vea la sugerencia bajo cada campo).`) : null,
    missing.length ? h('div', { class: 'miss', style: 'margin-top:6px' }, `No se encontró ${missing.join(' ni ')}: use «Marcar lote y fechas» o escríbalo.`) : null,
    st.quality?.blurry || st.quality?.shiny ? h('div', { class: 'warn-photo', style: 'margin-top:6px' }, `⚠ La foto ${st.quality.blurry ? 'parece borrosa' : 'tiene reflejos'}: los datos pueden salir mal. Para mejores resultados, tome otra foto ${st.quality.blurry ? 'más cerca y enfocando el lote (toque la pantalla para enfocar)' : 'inclinando un poco la caja para quitar el brillo'}.`) : null,
    aiP ? h('div', { class: 'ai-line', style: 'margin-top:6px' }, 'Asistente IA: leyendo el lote y las fechas… (puede seguir revisando el formulario)') : null,
    h('button', { type: 'button', class: 'btn small', style: 'margin-top:8px', onclick: showDiag }, 'Ver qué leyó la app')));
  toast(filled ? `Formulario llenado con ${filled} dato(s) de la foto.` : 'No se pudieron leer datos con seguridad en esta foto.', filled ? 'ok' : 'warn');
  // Primero las lecturas extra del teléfono (si faltan datos) y después se compara con la IA, en ese orden, sin bloquear.
  (async () => {
    if (missing.length || doubts.some(d => /lote|vencim|fabric/i.test(d))) await background(r, seq, missing, srcBlob, filledNow);
    if (aiP) await aiFollowUp(r, seq, aiP, filledNow);
  })();
}

// Compara la lectura de la IA con lo que hay en el formulario en ese momento (sin pisar lo que el usuario cambió):
//  - el teléfono llenó el dato y la IA coincide → queda confirmado por dos lecturas independientes;
//  - el teléfono lo llenó y la IA difiere → el dato se quita y quedan las dos opciones para elegir;
//  - el dato estaba como sugerencia y la IA coincide con una opción → se llena; si no, se ofrece también lo de la IA;
//  - el dato no estaba → se propone lo que leyó la IA.
async function aiFollowUp(r, seq, aiP, filledNow = new Set()) {
  const ai = await aiP;
  if (seq !== readSeq || !st.photo) return;
  const label = Object.fromEntries(FIELDS), line = $('#autofill-note .ai-line'), notes = [];
  if (ai?.error) { notes.push(ai.error); if (line) line.textContent = 'Asistente IA: ' + ai.error; st.diag && (st.diag.ai = { error: ai.error }); return; }
  if (ai.zoom) notes.push('(la IA leyó también la zona ampliada del lote y las fechas)');
  const nrm = v => (v || '').toUpperCase().replace(/[\s.\-\/]/g, '');
  let ok = 0, diff = 0, add = 0;
  for (const f of ['lote', 'fechaFabricacion', 'vencimiento']) {
    const a = ai[f];
    if (!a?.valor) { notes.push(`${label[f]}: la IA no lo encontró${a?.nota ? ' (' + a.nota + ')' : ''}.`); continue; }
    const val = f === 'lote' ? a.valor.trim() : monthToNumber(a.valor.trim());
    const cur = input(f).value.trim(), byPhone = cur && filledNow.has(f) && st.origen[f] === 'ocr';
    const sugg = [...(input(f).parentElement.querySelectorAll('.sugg button') || [])].map(b => b.textContent.replace(/^Usar «|»$/g, ''));
    if (cur && nrm(cur) === nrm(val)) { ok++; notes.push(`${label[f]}: «${val}» — teléfono e IA coinciden.`); continue; }
    if (byPhone) {
      setField(f, '', 'ocr'); suggest(f, cur, 'El teléfono y la IA no coinciden: elija el que está en el empaque:', val); diff++;
      notes.push(`${label[f]}: teléfono «${cur}» / IA «${val}» (certeza ${a.certeza}) — no coinciden, quedan las dos opciones.`);
    } else if (cur) {
      suggest(f, val, 'La IA leyó otro valor:'); diff++;
      notes.push(`${label[f]}: escrito a mano «${cur}» / IA «${val}» — se respeta lo escrito; la IA queda como sugerencia.`);
    } else if (sugg.some(s => nrm(s) === nrm(val))) {
      setField(f, sugg.find(s => nrm(s) === nrm(val)), 'ocr'); input(f).parentElement.querySelector('.sugg')?.remove(); ok++;
      notes.push(`${label[f]}: «${val}» — la IA coincide con una de las lecturas del teléfono: se llenó.`);
    } else {
      suggest(f, val, `Leído por la IA (certeza ${a.certeza}), compárelo con el empaque:`, sugg[0] || null); add++;
      notes.push(`${label[f]}: «${val}» — solo lo leyó la IA (certeza ${a.certeza}).`);
    }
  }
  // Datos del producto (nombre, principio activo, concentración…): letra grande, menos riesgo. Si el campo está vacío y la IA
  // lo lee con certeza alta, se llena; si no, queda como sugerencia. Lo que ya tiene valor nunca se cambia.
  let prod = 0;
  for (const [f, d] of Object.entries(ai.producto || {})) {
    const el = input(f); if (!el || !d?.valor) continue;
    const val = d.valor.trim(), cur = el.value.trim();
    if (cur && nrm(cur) === nrm(val)) continue;
    if (cur) { if (!el.parentElement.querySelector('.sugg')) suggest(f, val, 'La IA leyó:'); continue; }
    if (d.certeza === 'alta') { setField(f, val, 'ocr'); prod++; notes.push(`${label[f]}: «${val}» — leído por la IA.`); }
    else if (!el.parentElement.querySelector('.sugg')) suggest(f, val, `Leído por la IA (certeza ${d.certeza}):`);
  }
  chips(); scheduleDraft();
  if (st.diag) st.diag.ai = { notes };
  if (line) line.textContent = `Asistente IA: ${ok} dato(s) de lote y fechas confirmados por dos lecturas` + (prod ? `, ${prod} dato(s) del producto completados` : '') + (diff ? `, ${diff} no coinciden (elija la opción correcta)` : '') + (add ? `, ${add} propuesto(s) solo por la IA` : '') + '.';
  if (diff || add) toast('El Asistente IA terminó: revise las opciones bajo el lote y las fechas.', 'warn', 5000);
}

// ---- Otra cara de la misma caja: se lee completa (teléfono + IA) y solo completa lo que falta ----
async function addFace(file) {
  let p;
  try { busy('Preparando la otra cara de la caja…'); p = await processFile(file, () => {}); }
  catch (e) { toast(errMsg(e), 'err', 6500); return; }
  finally { busy(false); }
  await autoFill(performance.now(), p.hi || p.blob);
}

// ---- Escáner en vivo: los datos leídos varias veces iguales se llevan al formulario ----
async function runLive(opts = {}) {
  const r = await liveScan(opts);
  if (!r) return;
  if (r.read) {                                           // «Tomar foto y leer»: lectura completa de la foto (como desde la galería)
    await setPhotoFromFile(new File([r.photo], 'foto-camara.jpg', { type: r.photo.type || 'image/jpeg' }), 'live');
    if (!st.photo) return;
    await autoFill();
    for (const [f, v] of Object.entries(r.values)) if (!input(f).value.trim()) setField(f, v, 'ocr');
    chips(); scheduleDraft(); return;
  }
  if (r.formato && r.values.codigoBarras) st.formatoCodigo = r.formato;   // para dibujar el código en el rótulo
  // La foto del escaneo se guarda después, en segundo plano: los datos aparecen al instante.
  if (r.still && !st.photo && !opts.lotMode) setTimeout(() => r.still.toBlob(b => { r.still.width = r.still.height = 0; if (b && !st.photo) setPhotoFromFile(new File([b], 'escaneo-en-vivo.jpg', { type: 'image/jpeg' }), 'live'); }, 'image/jpeg', 0.9), 50);
  const label = Object.fromEntries(FIELDS); let n = 0; const sug = [];
  clearSuggestions();
  for (const [f, v] of Object.entries(r.values)) {
    const cur = input(f)?.value.trim(); if (cur == null || cur === v) continue;
    if (cur && st.origen[f] !== 'ocr') { suggest(f, v, 'En vivo se leyó otro valor:'); sug.push(label[f]); continue; }   // lo escrito a mano no se reemplaza
    setField(f, v, 'ocr'); n++;
  }
  chips(); scheduleDraft();
  const missing = ['lote', 'vencimiento'].filter(k => !input(k).value.trim()).map(k => label[k].toLowerCase());
  const note = $('#autofill-note'); note.hidden = false; note.className = 'banner' + (n ? '' : ' danger');
  note.replaceChildren(h('div', {}, h('b', {}, n ? `Escáner en vivo: ${n} campo(s) llenados` : 'El escáner en vivo no agregó datos nuevos'),
    '. Compárelos con el empaque antes de guardar.',
    sug.length ? h('div', { style: 'margin-top:6px' }, `Para revisar: ${sug.join(', ')} (vea la sugerencia bajo cada campo).`) : null,
    missing.length ? h('div', { style: 'margin-top:6px' }, `Falta ${missing.join(' y ')}: vuelva a escanear esa parte o escríbalo.`) : null));
  toast(n ? `${n} dato(s) del escáner en vivo en el formulario.` : 'No se agregaron datos nuevos.', n ? 'ok' : 'warn');
}

// Zona del lote y las fechas según la lectura del teléfono (fracciones 0-1 de la foto), para enviarla ampliada a la IA.
const LABEL_W = /^(?:L[O0]TE|LOT|BATCH|VENC\w*|VENCE|VTO|EXP\w*|CAD\w*|PREP\w*|FAB\w*|F\.?F\.?|F\.?V\.?|[LFV][.:])[.:;,]*/i;
function lotZone(r) {
  const W = r.baseW, H = r.baseH; if (!W || !H) return null;
  const boxes = r.fields.filter(f => LD.includes(f.field) && f.box).map(f => f.box);
  for (const l of r.res.lines || []) for (const w of l.words || []) if (w.bbox && LABEL_W.test((w.text || '').trim())) boxes.push(w.bbox);
  if (!boxes.length) return null;
  const x0 = Math.min(...boxes.map(b => b.x0)), y0 = Math.min(...boxes.map(b => b.y0)), x1 = Math.max(...boxes.map(b => b.x1)), y1 = Math.max(...boxes.map(b => b.y1));
  const h = Math.max(...boxes.map(b => Math.min(b.y1 - b.y0, b.x1 - b.x0)));
  // Los valores pueden estar a la derecha o debajo de las etiquetas: la zona se extiende en esas direcciones.
  return { x0: x0 / W, y0: y0 / H, x1: Math.min(W, x1 + h * 10) / W, y1: Math.min(H, y1 + h * 3) / H };
}

// Diagnóstico: el texto exacto que vio el lector y lo que se decidió con el lote y las fechas (para revisar o enviar a soporte).
async function showDiag() {
  const d = st.diag; if (!d) { toast('Aún no hay una lectura de foto.', 'warn'); return; }
  const label = Object.fromEntries(FIELDS);
  const rows = ['lote', 'fechaFabricacion', 'vencimiento'].map(k => {
    const f = d.fields.find(x => x.field === k);
    return `${label[k]}: ${f ? `«${f.value}»${f.alt ? ` o «${f.alt}»` : ''} — ${f.doubt ? 'DUDOSO (sugerencia)' : 'seguro (llenado)'}${f.notes?.length ? '\n   · ' + f.notes.join('\n   · ') : ''}` : 'no encontrado'}`;
  });
  const aiTxt = d.ai ? '\n\n— Asistente IA —\n' + (d.ai.error || d.ai.notes.join('\n')) : '';
  const q = d.quality ? ` · nitidez ${d.quality.sharp}${d.quality.blurry ? ' (borrosa)' : ''} · reflejo ${d.quality.glare} %` : '';
  const txt = `FARMA-ETIQUETA ${(await import('./settings.js')).APP_VERSION} · lector: ${d.engine} · ${d.secs} s${q}\n\n${rows.join('\n')}${aiTxt}\n\n— Texto leído —\n${(d.text || '').trim() || '(sin texto)'}`;
  await modal('Qué leyó la app', h('div', {}, h('p', { class: 'muted small' }, 'Haga una captura de esta pantalla o cópiela para enviarla.'), h('pre', { class: 'raw', style: 'max-height:55vh' }, txt)),
    [{ label: 'Cerrar', value: null }, { label: 'Copiar', class: 'primary', keep: true, onclick: async () => { try { await navigator.clipboard.writeText(txt); toast('Copiado.', 'ok'); } catch { toast('No se pudo copiar: haga una captura de pantalla.', 'warn'); } } }]);
}

// Busca lote y fechas sin bloquear la pantalla: el usuario puede revisar y escribir mientras tanto.
let readSeq = 0;
async function background(r, seq, missing, srcBlob = null, filledNow = new Set()) {
  const note = $('#autofill-note'), label = Object.fromEntries(FIELDS), alive = () => seq === readSeq && !!st.photo;
  const miss = note.querySelector('.miss'); if (miss) miss.hidden = true;
  const line = h('div', { class: 'bg-read', style: 'margin-top:6px' }, 'Buscando lote y fechas con lecturas adicionales… Puede seguir revisando el formulario.');
  note.append(line);
  const prog = (t, f) => { if (alive()) line.textContent = t + (f != null ? ` ${Math.round(f * 100)} %` : '') + ' (puede seguir revisando el formulario)'; };
  const before = new Set(r.fields.filter(x => !x.doubt).map(x => x.field)), t0 = performance.now();
  let canvas, canvasW = 2600;
  try {
    canvas = srcBlob ? await blobToCanvas(srcBlob, 2600) : await withPhoto(src => blobToCanvas(src, 2600)); canvasW = canvas.width;
    await morePasses(canvas, r, prog, alive, srcBlob || st.src || st.photo?.blob);
  } catch { /* se informa abajo como «no encontrado» */ } finally { freeCanvas(canvas); }
  if (!alive()) return;
  // Todo lo nuevo de las lecturas en segundo plano se verifica igual que la primera lectura; si no se confirma, queda dudoso.
  try { await verifyFields(r.fields.filter(x => LD.includes(x.field) && !before.has(x.field) && !x.doubt), srcBlob || st.src || st.photo?.blob, canvasW, t => prog(t)); } catch { /* queda dudoso */ }
  if (!alive()) return;
  const found = [];
  for (const f of r.fields.filter(x => LD.includes(x.field) && !before.has(x.field))) {
    if (input(f.field).value.trim()) continue;                       // nunca pisa lo que ya escribió o aceptó el usuario
    if (f.doubt) suggest(f.field, f.value, f.alt ? 'Dos lecturas posibles, elija la que coincide con el empaque:' : 'Lectura dudosa, verifíquela:', f.alt); else { setField(f.field, f.value, 'ocr'); filledNow.add(f.field); found.push(label[f.field]); }
  }
  chips(); scheduleDraft();
  const hasSugg = k => !!input(k).parentElement.querySelector('.sugg');
  const sugg = LD.filter(k => !input(k).value.trim() && hasSugg(k)).map(k => label[k].toLowerCase());
  const still = ['lote', 'vencimiento'].filter(k => !input(k).value.trim() && !hasSugg(k)).map(k => label[k].toLowerCase());
  line.textContent = (found.length ? `Encontrado en segundo plano: ${found.join(', ')} (${((performance.now() - t0) / 1000).toFixed(1)} s más). ` : '')
    + (sugg.length ? `Lectura dudosa de ${sugg.join(', ')} (por ejemplo, impresión en relieve): compárela con el empaque y toque «Usar» si coincide, o corríjala. ` : '')
    + (still.length ? `No se encontró ${still.join(' ni ')}: use «Escanear lote y fechas con la cámara» o escríbalo.` : sugg.length ? '' : 'Compare el lote y las fechas con el empaque.');
  if (found.length) toast(`Se agregó ${found.join(', ').toLowerCase()} desde la foto.`, 'ok');
}

async function review(fields, warnings, res, onlineErr, extra) {
  const rows = fields.map(f => {
    const inp = h('input', { value: f.value, 'aria-label': f.label + ' detectado', spellcheck: false });
    const cur = input(f.field).value.trim();
    // Con una foto adicional no se pisa lo que ya está en el formulario, salvo que el usuario lo marque.
    const cb = h('input', { type: 'checkbox', checked: f.checked && !(extra && cur), 'aria-label': 'Usar ' + f.label });
    const node = h('div', { class: 'ocr-row' + (f.doubt ? ' doubt' : '') },
      h('div', { class: 'top' }, cb, h('b', {}, f.label),
        h('span', { class: 'chip ' + (f.conf == null ? '' : f.conf >= 80 ? '' : f.conf >= 60 ? 'warn' : 'bad') }, f.conf == null ? 'Confianza n/d' : `Confianza ${Math.round(f.conf)} %`),
        f.doubt ? h('span', { class: 'chip warn' }, 'Dudoso') : null),
      inp,
      ...f.notes.map(n => h('p', { class: 'why' }, '⚠ ' + n)),
      cur && cur !== f.value ? h('p', { class: 'why' }, `Reemplazará el valor actual: «${cur}»`) : null);
    return { f, cb, inp, node };
  });
  const body = h('div', {},
    h('p', { class: 'muted small' }, res.online ? 'Leído con el servicio en línea (OCR.space). La fotografía se envió a ese servicio.' : 'Leído con el OCR local del dispositivo' + (onlineErr ? `. El servicio en línea no se pudo usar: ${onlineErr}.` : '.')),
    h('p', { class: 'banner', style: 'border-radius:10px' }, 'Texto leído automáticamente: NO es información farmacéutica verificada. Compare cada dato con el empaque, corrija lo necesario y marque solo lo que desea usar.'),
    ...warnings.map(w => h('p', { class: 'banner danger', style: 'border-radius:10px' }, w)),
    rows.length ? rows.map(r => r.node) : h('p', { class: 'empty' }, 'No se identificó ningún campo con seguridad. No se completó ningún dato; puede ingresarlos manualmente.'),
    h('details', {}, h('summary', {}, `Texto completo leído${res.confidence != null ? ` (confianza global ${Math.round(res.confidence)} %)` : ''}`), h('pre', { class: 'raw' }, res.text.trim() || '(sin texto)')));
  const ok = await modal('Revisión del texto reconocido', body, [{ label: 'Cancelar', value: false }, rows.length ? { label: 'Aplicar al formulario', value: true, class: 'primary' } : null].filter(Boolean), { sticky: true });
  if (!ok) return;
  let n = 0;
  for (const r of rows) {
    const v = r.inp.value.trim();
    if (!r.cb.checked || !v) continue;
    setField(r.f.field, v, v !== r.f.value ? 'manual' : 'ocr'); n++;
  }
  chips(); scheduleDraft();
  toast(n ? `${n} dato(s) aplicados. Revise el formulario y pulse Guardar para confirmar.` : 'No se aplicó ningún dato.', n ? 'ok' : 'warn', 5500);
}

// ---- Lote y fechas: el usuario marca la zona, se amplía, se lee varias veces y se confirma viendo la imagen ----
const ZF = [['lote', 'Número de lote'], ['fechaFabricacion', 'Fecha de fabricación'], ['vencimiento', 'Fecha de vencimiento']];

// Selector de zona sobre la fotografía. Devuelve {x,y,w,h} en fracciones, 'all' (leer toda la foto) o null.
async function pickZone(blob) {
  const url = URL.createObjectURL(blob);
  let r = { x: .08, y: .35, w: .84, h: .3 };
  const box = h('div', { class: 'zone-box' });
  const img = h('img', { src: url, alt: 'Fotografía para marcar la zona', draggable: false });
  const wrap = h('div', { class: 'zone-wrap' }, img, box);
  const draw = () => { box.style.left = r.x * 100 + '%'; box.style.top = r.y * 100 + '%'; box.style.width = r.w * 100 + '%'; box.style.height = r.h * 100 + '%'; };
  let p0 = null;
  const pos = e => { const b = wrap.getBoundingClientRect(); return [Math.min(1, Math.max(0, (e.clientX - b.left) / b.width)), Math.min(1, Math.max(0, (e.clientY - b.top) / b.height))]; };
  wrap.addEventListener('pointerdown', e => { p0 = pos(e); wrap.setPointerCapture(e.pointerId); e.preventDefault(); });
  wrap.addEventListener('pointermove', e => { if (!p0) return; const [x, y] = pos(e); r = { x: Math.min(p0[0], x), y: Math.min(p0[1], y), w: Math.abs(x - p0[0]), h: Math.abs(y - p0[1]) }; draw(); });
  const end = () => { p0 = null; if (r.w < .04 || r.h < .02) { r = { x: .08, y: .35, w: .84, h: .3 }; draw(); } };
  wrap.addEventListener('pointerup', end); wrap.addEventListener('pointercancel', end);
  draw();
  try {
    const act = await modal('Marque dónde están el lote y las fechas', h('div', {},
      h('p', { class: 'small' }, 'Arrastre el dedo sobre la foto para encerrar el lote, la fecha de fabricación y la de vencimiento. Cuanto más ajustado el recuadro, mejor se lee.'), wrap),
      [{ label: 'Cancelar', value: null }, { label: 'Leer zona marcada', value: 'zone', class: 'primary' }], { sticky: true });
    return act === 'zone' ? r : null;
  } finally { URL.revokeObjectURL(url); }
}

function cropCanvas(src, r, target = 1800) {
  const sx = Math.round(r.x * src.width), sy = Math.round(r.y * src.height), sw = Math.max(8, Math.round(r.w * src.width)), sh = Math.max(8, Math.round(r.h * src.height));
  const k = Math.max(1, Math.min(4, target / Math.max(sw, sh))), c = document.createElement('canvas');
  c.width = Math.round(sw * k); c.height = Math.round(sh * k);
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.imageSmoothingQuality = 'high';
  x.drawImage(src, sx, sy, sw, sh, 0, 0, c.width, c.height);
  return c;
}
function inverted(src) {
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const x = c.getContext('2d'); x.drawImage(src, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) { p[i] = 255 - p[i]; p[i + 1] = 255 - p[i + 1]; p[i + 2] = 255 - p[i + 2]; }
  x.putImageData(d, 0, 0); return c;
}

async function runZone(file = null) {
  if (!(file instanceof Blob)) file = null;
  if (!file && !st.photo) { toast('Primero seleccione una fotografía.', 'warn'); return; }
  const source = file || st.src || st.photo.blob;
  const zone = await pickZone(source);
  if (!zone) return;
  let full, crop, shot = '', onlineErr = '', usedOnline = false;
  const passes = [];                                   // [{name, weight, found, text}]
  busy('Preparando la zona…');
  try {
    full = await blobToCanvas(source, 4000);
    crop = cropCanvas(full, zone);
    shot = crop.toDataURL('image/jpeg', .85);
    const on = await db.kvGet('onlineOcr').catch(() => null);
    if (on?.enabled && on.key && navigator.onLine) {
      try { const r = await recognizeOnline(crop, on.key, busy); passes.push({ name: 'en línea', weight: 2, found: extractZone(r.lines), text: r.text }); usedOnline = true; }
      catch (e) { onlineErr = errMsg(e); }
    }
    // Varias lecturas locales de la misma zona con distintos tratamientos: lo que coincide entre ellas es más fiable.
    const variants = [['normal', () => crop, '6'], ['realzada', () => enhance(crop), '6'], ['dispersa', () => crop, '11'], ['invertida', () => enhance(inverted(crop)), '6']];
    for (let i = 0; i < variants.length; i++) {
      const [name, make, psm] = variants[i];
      busy(`Leyendo la zona (${i + 1} de ${variants.length})…`, (i + 1) / (variants.length + 1));
      const c = make();
      try { const r = await recognize(c, () => {}, psm); fixLotLines(c, r.lines); passes.push({ name, weight: 1, found: extractZone(r.lines), text: r.text }); }
      catch { /* una lectura fallida no impide las demás */ }
      finally { if (c !== crop) freeCanvas(c); }
    }
    // Texto en relieve (troquelado sin tinta) dentro de la zona: varias escalas y umbrales, votación por carácter.
    busy('Buscando texto en relieve…');
    try {
      const rl = voteRelief(await readRelief(crop));
      if (rl.length) passes.push({ name: 'relieve', weight: 1, found: extractZone(rl), text: rl.map(l => l.text).join('\n') });
    } catch { /* sin relieve */ }
    // Casillas impresas dentro de la zona (L, F, V): cada letra se lee aparte y se une al valor de al lado o de abajo.
    busy('Buscando casillas L, F y V…');
    try {
      const bx = await readBoxes(crop), found = {};
      for (const f of bx) if (!f.doubt) found[f.field] = { value: f.value, labelled: true };
      if (Object.keys(found).length) passes.push({ name: 'casillas', weight: 1.5, found, text: bx.map(f => f.notes[0] + ' ' + f.value).join('\n') });
    } catch { /* sin casillas */ }
  }
  catch (e) { busy(false); await modal('No se pudo leer la zona', h('p', {}, errMsg(e))); return; }
  finally { freeCanvas(full); freeCanvas(crop); busy(false); }

  // Votación por campo
  const rows = ZF.map(([field, label]) => {
    const votes = new Map();
    for (const p of passes) { const f = p.found[field]; if (!f) continue; const k = f.value.toUpperCase().replace(/\s+/g, ''); const v = votes.get(k) || { value: f.value, w: 0, n: 0, labelled: false }; v.w += p.weight + (f.labelled ? .5 : 0); v.n++; v.labelled ||= !!f.labelled; votes.set(k, v); }
    const cands = [...votes.values()].sort((a, b) => b.w - a.w), best = cands[0], cur = input(field).value.trim();
    const badDate = best && field !== 'lote' && !dateOK(best.value);
    const sure = best && !badDate && (cands.length === 1 || best.w >= 2);
    // Un valor sin etiqueta que solo apareció en una lectura no se escribe en el campo: se ofrece como opción.
    const fill = best && (sure || best.labelled || best.n > 1);
    const inp = h('input', { value: fill ? best.value : cur, placeholder: 'Escríbalo mirando la imagen', 'aria-label': label, spellcheck: false, autocapitalize: 'characters' });
    const note = !best ? 'No se pudo leer: escríbalo mirando la imagen de arriba.'
      : !fill ? 'Lectura poco fiable: no se escribió. Si coincide con la imagen, tóquela; si no, escríbalo.'
      : badDate ? 'La fecha leída no es válida: corríjala mirando la imagen.'
      : cands.length > 1 ? `Las lecturas no coinciden (${best.n} de ${passes.length} leyeron este valor). Verifíquelo con la imagen.`
      : best.n === 1 && passes.length > 1 ? 'Solo una de las lecturas obtuvo este valor. Verifíquelo con la imagen.' : `${best.n} de ${passes.length} lecturas coinciden.`;
    const node = h('div', { class: 'ocr-row' + (sure ? '' : ' doubt') },
      h('div', { class: 'top' }, h('b', {}, label), best && fill ? h('span', { class: 'chip ' + (sure ? '' : 'warn') }, sure ? 'Leído' : 'Dudoso') : h('span', { class: 'chip ' + (cur ? '' : 'bad') }, cur ? 'Ya en el formulario' : 'Sin leer')),
      inp,
      cands.length > 1 || (best && !fill) ? h('div', { class: 'row', style: 'margin-top:6px' }, cands.slice(0, 4).map(c => h('button', { type: 'button', class: 'btn small', onclick: () => { inp.value = c.value; } }, c.value))) : null,
      h('p', { class: 'why' }, note),
      cur && best && cur !== best.value ? h('p', { class: 'why' }, `Valor actual en el formulario: «${cur}»`) : null);
    return { field, inp, node, proposed: fill ? best.value : '' };
  });
  const body = h('div', {},
    h('img', { class: 'zone-shot', src: shot, alt: 'Zona marcada ampliada' }),
    h('p', { class: 'muted small' }, usedOnline ? 'Leído con el servicio en línea y con el OCR local.' : 'Leído con el OCR local' + (onlineErr ? ` (el servicio en línea no se pudo usar: ${onlineErr}).` : '.')),
    h('p', { class: 'banner', style: 'border-radius:10px' }, 'Compare cada dato con la imagen ampliada y corrija lo que no coincida. Deje vacío lo que el empaque no tenga.'),
    rows.map(r => r.node),
    h('details', {}, h('summary', {}, 'Texto leído en cada intento'), h('pre', { class: 'raw' }, passes.map(p => `[${p.name}]\n${(p.text || '').trim() || '(nada)'}`).join('\n\n'))));
  const ok = await modal('Lote y fechas', body, [{ label: 'Cancelar', value: false }, { label: 'Usar estos datos', value: true, class: 'primary' }], { sticky: true });
  if (!ok) return;
  let n = 0;
  for (const r of rows) { const v = r.inp.value.trim(); if (!v || v === input(r.field).value.trim()) continue; setField(r.field, v, r.proposed && v === r.proposed ? 'ocr' : 'manual'); n++; }
  chips(); scheduleDraft();
  toast(n ? `${n} dato(s) del lote aplicados. Pulse Guardar para confirmar el registro.` : 'No se cambió ningún dato.', n ? 'ok' : 'warn', 5000);
}

// ---- Guardado ----
async function save(ev) {
  ev.preventDefault();
  const v = values(), err = $('#form-error');
  err.hidden = true;
  if (!v.nombre) { input('nombre').classList.add('invalid'); err.textContent = 'Escriba el nombre del producto para poder guardar.'; err.hidden = false; input('nombre').focus(); return; }
  const label = Object.fromEntries(FIELDS);
  const pend = $$('#product-form .sugg').map(e => label[e.parentElement.querySelector('input,textarea')?.name]).filter(Boolean);
  const leidos = ['lote', 'fechaFabricacion', 'vencimiento'].filter(k => v[k] && st.origen[k] === 'ocr').map(k => `${label[k]}: ${v[k]}`);
  if ((pend.length || leidos.length) && !(await confirmDlg('Confirme los datos leídos de la foto',
    (pend.length ? `Datos dudosos sin resolver (no se guardarán): ${pend.join(', ')}. ` : '') + (leidos.length ? `Compare con el empaque: ${leidos.join(' · ')}. ` : '') + '¿Confirma que los revisó?', 'Sí, revisé y guardar'))) return;
  const falta = [!v.lote && 'número de lote', !v.vencimiento && 'fecha de vencimiento'].filter(Boolean);
  if (falta.length && !(await confirmDlg('Faltan datos del lote', `Este registro no tiene ${falta.join(' ni ')}. Puede completarlos con «Marcar lote y fechas en la foto» o escribirlos. ¿Guardar así de todas formas?`, 'Guardar así'))) return;
  const btn = $('#btn-save'); btn.disabled = true;
  try {
    const all = await db.allRecords();
    const dup = all.find(r => r.id !== st.id && norm(r.nombre) === norm(v.nombre) && norm(r.lote) === norm(v.lote)
      && norm(r.concentracion) === norm(v.concentracion) && (r.codigoBarras || '') === v.codigoBarras);
    if (dup && !(await confirmDlg('Posible registro duplicado', `Ya existe «${dup.nombre}»${dup.lote ? ' con lote ' + dup.lote : ''} con los mismos datos de identificación. ¿Guardar de todas formas como un registro adicional?`, 'Guardar de todas formas'))) return;
    const now = Date.now(), prev = st.id ? all.find(r => r.id === st.id) : null;
    const changed = prev ? FIELDS.filter(([f]) => (prev[f] || '') !== v[f]).map(([f]) => f) : [];
    if (st.photoState !== 'keep') changed.push('fotografía');
    const origen = {};
    for (const [f] of FIELDS) if (v[f]) origen[f] = st.origen[f] || 'manual';
    const rec = { ...v, id: st.id || db.uid(), formatoCodigo: v.codigoBarras ? st.formatoCodigo : '', origen,
      tieneFoto: !!st.photo, thumb: st.photo ? st.thumb : '', createdAt: st.createdAt || now, updatedAt: now,
      log: [...(st.log || []), { at: now, accion: prev ? 'edición' : 'creación', campos: changed }].slice(-40) };
    await db.saveRecord(rec, st.photoState === 'new' && st.photo ? await toStored(st.photo) : st.photoState === 'del' ? null : undefined);
    const back = await db.getRecord(rec.id);                 // verificación de lectura tras escribir
    if (!back) throw new Error('El registro no pudo verificarse después de guardarlo.');
    await clearDraft(); st = blank(); fill(null);
    toast('Registro guardado en el dispositivo.' + (v.vencimiento ? '' : ' Aviso: no tiene fecha de vencimiento.'), v.vencimiento ? 'ok' : 'warn', 5000);
    document.dispatchEvent(new CustomEvent('fe:changed'));
    location.hash = '#historial';
  } catch (e) {
    err.textContent = 'No se pudo guardar: ' + errMsg(e) + ' Sus datos siguen en el formulario.'; err.hidden = false;
  } finally { btn.disabled = false; }
}

export function initForm() {
  const form = $('#product-form');
  form.addEventListener('submit', save);
  form.addEventListener('input', e => {
    const f = e.target.name;
    if (f) { st.origen[f] = 'manual'; e.target.classList.remove('invalid'); e.target.parentElement.querySelector('.sugg')?.remove(); $(`label[for="f-${f}"] .src`)?.remove(); scheduleDraft(); }
  });
  $('#btn-form-clear').addEventListener('click', () => newRecord());
  $('#btn-photo-del').addEventListener('click', removePhoto);
  $('#btn-ocr').addEventListener('click', () => runOCR());
  $('#btn-zone').addEventListener('click', () => runZone());
  $('#btn-auto').addEventListener('click', () => autoFill());
  $$('.btn-live').forEach(b => b.addEventListener('click', () => runLive()));
  $$('.btn-live-lot').forEach(b => b.addEventListener('click', () => runLive({ lotMode: true })));

  // Selectores de archivo: la apertura la hace el propio <label for>, en el mismo gesto del usuario.
  let after = null;
  $$('label[for="pick-gallery"],label[for="pick-files"]').forEach(l => {
    l.addEventListener('click', () => { after = l.dataset.after || null; });
    l.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); l.click(); } });
  });
  for (const id of ['pick-gallery', 'pick-files']) {
    $('#' + id).addEventListener('change', async e => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';                                   // permite volver a elegir el mismo archivo
      const a = after; after = null;
      if (!file) return;
      if (a === 'extra') { if (st.photo) await addFace(file); else await setPhotoFromFile(file, null); return; }
      if (a && st.dirty && !(await confirmDlg('Formulario con datos', 'El formulario tiene datos sin guardar. ¿Usar esta fotografía en ese mismo registro?', 'Usar aquí'))) return;
      await setPhotoFromFile(file, a);
    });
  }
  window.addEventListener('pagehide', () => { if (st.dirty) saveDraft(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && st.dirty) saveDraft(); });
  fill(null);
}
