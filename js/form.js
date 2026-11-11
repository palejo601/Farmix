// Registro y edición de productos: formulario, fotografía, OCR con revisión humana.
import { $, $$, h, toast, modal, confirmDlg, busy, fmtBytes, errMsg } from './ui.js';
import * as db from './db.js';
import { processFile, toStored, fromStored, blobToCanvas, freeCanvas, enhance } from './photos.js';
import { recognize, recognizeOnline } from './ocr.js';
import { extractFields, extractZone, dateOK } from './extract.js';
import { liveScan } from './live.js';

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
    const o = { ...extractFields(res.lines), res, onlineErr };
    if (extras) await morePasses(canvas, o, busy);
    return o;
  } finally { freeCanvas(canvas); }
}

// Lecturas adicionales solo si faltan lote o vencimiento: suelen estar impresos aparte, por puntos o con poco contraste.
// alive() permite cancelarlas entre una lectura y otra (por ejemplo, si el usuario cambió de foto).
const LD = ['lote', 'vencimiento', 'fechaFabricacion'];
async function morePasses(canvas, o, prog, alive = () => true) {
  const miss = f => !o.fields.some(x => x.field === f && !x.doubt);
  const need = () => alive() && (miss('lote') || miss('vencimiento'));
  const merge = (r, note, doubt) => {
    const e2 = extractFields(r.lines);
    for (const f of LD) {
      const hit = e2.fields.find(x => x.field === f && !x.doubt);
      if (miss(f) && hit) { o.fields = o.fields.filter(x => x.field !== f).concat({ ...hit, doubt, checked: hit.checked && !doubt, notes: [...hit.notes, note] }); if (f === 'vencimiento') o.warnings = []; }
    }
    o.res.text += '\n— Lectura adicional —\n' + r.text;
  };
  if (need()) merge(await recognize(canvas, (t, f) => prog('Segunda lectura (lote y fechas)…', f), true), 'Detectado en una segunda lectura de la imagen.', false);
  if (need()) {
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
function suggest(field, value, note) {
  const box = input(field)?.parentElement; if (!box) return;
  box.querySelector('.sugg')?.remove();
  box.append(h('div', { class: 'sugg' }, h('span', {}, note + ' '),
    h('button', { type: 'button', class: 'btn small', onclick: e => { setField(field, value, 'ocr'); chips(); scheduleDraft(); e.target.closest('.sugg').remove(); } }, `Usar «${value}»`)));
}
export async function autoFill(tStart) {
  if (!st.photo) { toast('Primero seleccione una fotografía.', 'warn'); return; }
  clearSuggestions();
  const note = $('#autofill-note'), label = Object.fromEntries(FIELDS);
  let r; const t0 = tStart || performance.now();
  busy('Leyendo la foto…');
  const seq = ++readSeq;
  // Primera lectura sobre la foto guardada (1800 px): rápida; lote y fechas se buscan después a más resolución.
  try { r = await analyze(st.photo.blob, false, 1800).catch(() => withPhoto(src => analyze(src, false, 1800))); }
  catch (e) {
    busy(false); note.hidden = false; note.className = 'banner danger';
    note.textContent = 'No se pudo leer la foto: ' + errMsg(e) + ' Puede volver a intentarlo o escribir los datos.';
    return;
  } finally { busy(false); }
  const { res, onlineErr } = r, fields = [...r.fields], secs = ((performance.now() - t0) / 1000).toFixed(1);
  let filled = 0; const doubts = [];
  for (const f of fields) {
    const cur = input(f.field).value.trim(), src = st.origen[f.field];
    const mine = cur && src !== 'ocr';          // lo escrito por el usuario nunca se reemplaza
    if (cur === f.value) continue;
    const weak = f.doubt || (f.conf != null && f.conf < 60);
    if (weak || mine) { suggest(f.field, f.value, weak ? 'Lectura dudosa, verifíquela:' : 'En la foto se leyó otro valor:'); doubts.push(label[f.field]); continue; }
    setField(f.field, f.value, 'ocr');
    filled++;
  }
  chips(); scheduleDraft();
  const missing = ['lote', 'vencimiento'].filter(k => !input(k).value.trim() && !fields.some(x => x.field === k)).map(k => label[k].toLowerCase());
  note.hidden = false; note.className = 'banner' + (filled ? '' : ' danger');
  note.replaceChildren(h('div', {},
    h('b', {}, filled ? `Se llenaron ${filled} campo(s) desde la foto` : 'No se pudo llenar ningún campo con seguridad'),
    ` (${res.online ? 'lectura en línea' : 'lectura en el teléfono'}, ${secs} s${onlineErr ? '; el servicio en línea no respondió' : ''}). Compruebe que coincidan con el empaque antes de guardar.`,
    doubts.length ? h('div', { style: 'margin-top:6px' }, `Para revisar: ${doubts.join(', ')} (vea la sugerencia bajo cada campo).`) : null,
    missing.length ? h('div', { class: 'miss', style: 'margin-top:6px' }, `No se encontró ${missing.join(' ni ')}: use «Marcar lote y fechas» o escríbalo.`) : null));
  toast(filled ? `Formulario llenado con ${filled} dato(s) de la foto.` : 'No se pudieron leer datos con seguridad en esta foto.', filled ? 'ok' : 'warn');
  if (missing.length || doubts.some(d => /lote|vencim|fabric/i.test(d))) background(r, seq, missing);
}

// ---- Escáner en vivo: los datos leídos varias veces iguales se llevan al formulario ----
async function runLive() {
  const r = await liveScan();
  if (!r) return;
  if (r.read) {                                           // «Tomar foto y leer»: lectura completa de la foto (como desde la galería)
    await setPhotoFromFile(new File([r.photo], 'foto-camara.jpg', { type: r.photo.type || 'image/jpeg' }), 'live');
    if (!st.photo) return;
    await autoFill();
    for (const [f, v] of Object.entries(r.values)) if (!input(f).value.trim()) setField(f, v, 'ocr');
    chips(); scheduleDraft(); return;
  }
  if (r.photo && !st.photo) await setPhotoFromFile(new File([r.photo], 'escaneo-en-vivo.jpg', { type: 'image/jpeg' }), 'live');
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

// Busca lote y fechas sin bloquear la pantalla: el usuario puede revisar y escribir mientras tanto.
let readSeq = 0;
async function background(r, seq, missing) {
  const note = $('#autofill-note'), label = Object.fromEntries(FIELDS), alive = () => seq === readSeq && !!st.photo;
  const miss = note.querySelector('.miss'); if (miss) miss.hidden = true;
  const line = h('div', { class: 'bg-read', style: 'margin-top:6px' }, 'Buscando lote y fechas con lecturas adicionales… Puede seguir revisando el formulario.');
  note.append(line);
  const prog = (t, f) => { if (alive()) line.textContent = t + (f != null ? ` ${Math.round(f * 100)} %` : '') + ' (puede seguir revisando el formulario)'; };
  const before = new Set(r.fields.filter(x => !x.doubt).map(x => x.field)), t0 = performance.now();
  let canvas;
  try {
    canvas = await withPhoto(src => blobToCanvas(src, 2600));
    await morePasses(canvas, r, prog, alive);
  } catch { /* se informa abajo como «no encontrado» */ } finally { freeCanvas(canvas); }
  if (!alive()) return;
  const found = [];
  for (const f of r.fields.filter(x => LD.includes(x.field) && !before.has(x.field))) {
    if (input(f.field).value.trim()) continue;                       // nunca pisa lo que ya escribió o aceptó el usuario
    if (f.doubt) suggest(f.field, f.value, 'Lectura dudosa, verifíquela:'); else { setField(f.field, f.value, 'ocr'); found.push(label[f.field]); }
  }
  chips(); scheduleDraft();
  const still = ['lote', 'vencimiento'].filter(k => !input(k).value.trim()).map(k => label[k].toLowerCase());
  line.textContent = (found.length ? `Encontrado en segundo plano: ${found.join(', ')} (${((performance.now() - t0) / 1000).toFixed(1)} s más). ` : '')
    + (still.length ? `No se encontró ${still.join(' ni ')}: use «Marcar lote y fechas» o escríbalo.` : 'Compare el lote y las fechas con el empaque.');
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
      try { const r = await recognize(c, () => {}, psm); passes.push({ name, weight: 1, found: extractZone(r.lines), text: r.text }); }
      catch { /* una lectura fallida no impide las demás */ }
      finally { if (c !== crop) freeCanvas(c); }
    }
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
  $$('.btn-live').forEach(b => b.addEventListener('click', runLive));

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
      if (a === 'extra') { if (st.photo) await runZone(file); return; }
      if (a && st.dirty && !(await confirmDlg('Formulario con datos', 'El formulario tiene datos sin guardar. ¿Usar esta fotografía en ese mismo registro?', 'Usar aquí'))) return;
      await setPhotoFromFile(file, a);
    });
  }
  window.addEventListener('pagehide', () => { if (st.dirty) saveDraft(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && st.dirty) saveDraft(); });
  fill(null);
}
