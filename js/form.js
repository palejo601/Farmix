// Registro y edición de productos: formulario, fotografía, lectura de código, OCR con revisión humana.
import { $, $$, h, toast, modal, confirmDlg, busy, fmtBytes, errMsg } from './ui.js';
import * as db from './db.js';
import { processFile, toStored, fromStored, blobToCanvas, freeCanvas, enhance } from './photos.js';
import { readBarcode, gtinCheck } from './barcode.js';
import { recognize } from './ocr.js';
import { extractFields } from './extract.js';

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
  try {
    photoProgress('Leyendo la fotografía…', .05);
    const p = await processFile(file, photoProgress);
    st.photo = { blob: p.blob, w: p.w, h: p.h }; st.thumb = p.thumb; st.photoState = 'new';
    st.src = file;                                         // original a resolución completa: mejora la lectura de letra pequeña
    showPhoto(); scheduleDraft();
    toast(`Fotografía lista (${fmtBytes(p.original)} → ${fmtBytes(p.blob.size)}).`, 'ok');
  } catch (e) {
    toast(errMsg(e), 'err', 6500);
    return;
  } finally { setTimeout(() => photoProgress(false), 600); }
  if (after === 'barcode') await runBarcode();
  else if (after === 'ocr' || after === 'all') await runOCR();
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

async function runBarcode(chained = false) {
  if (!st.photo) { toast('Primero seleccione una fotografía.', 'warn'); return; }
  for (;;) {
    let r, err = null;
    busy('Buscando código de barras…');
    try { r = await readBarcode(st.src || st.photo.blob, busy); } catch (e) { err = e; } finally { busy(false); }
    if (err) { await modal('No se pudo leer el código', h('p', {}, errMsg(err))); return; }
    if (!r) {
      const again = await modal('No se detectó ningún código de barras', h('div', {},
        h('p', {}, 'No se encontró un código legible en la fotografía. No se completó ningún dato.'),
        h('p', { class: 'muted small' }, 'Sugerencias: que el código ocupe buena parte de la imagen, esté enfocado, sin reflejos y completo. Puede reintentar, elegir otra fotografía o escribir el código manualmente.')),
        [{ label: chained ? 'Continuar sin código' : 'Cerrar', value: null }, { label: 'Reintentar', value: 'retry', class: 'primary' }]);
      if (again === 'retry') continue;
      return;
    }
    const chk = gtinCheck(r.value);
    const act = await modal('Código de barras leído', h('div', {},
      h('div', { class: 'code-result', id: 'bc-value' }, r.value),
      h('p', { class: 'muted small', style: 'margin-top:8px' }, `Formato: ${r.format} · Motor: ${r.engine}` + (chk === true ? ' · Dígito de control correcto' : chk === false ? ' · ATENCIÓN: el dígito de control no coincide' : '')),
      h('p', {}, 'Compare el número con el impreso bajo las barras del empaque antes de usarlo.')),
      [{ label: 'Descartar', value: null },
        { label: 'Copiar', keep: true, onclick: async () => { try { await navigator.clipboard.writeText(r.value); toast('Código copiado.', 'ok'); } catch { toast('No se pudo copiar automáticamente. Mantenga pulsado el número para copiarlo.', 'warn'); } } },
        { label: 'Reintentar', value: 'retry' },
        { label: 'Usar en el formulario', value: 'use', class: 'primary' }]);
    if (act === 'retry') continue;
    if (act === 'use') { setField('codigoBarras', r.value, 'codigo'); st.formatoCodigo = r.format; chips(); scheduleDraft(); toast('Código incorporado al formulario.', 'ok'); }
    return act;
  }
}

// ---- OCR con pantalla de revisión ----
// extra = otra fotografía (otra cara del empaque) que solo se lee; no reemplaza la foto guardada del registro.
async function runOCR(extra = null) {
  if (!(extra instanceof Blob)) extra = null;
  if (!extra && !st.photo) { toast('Primero seleccione una fotografía.', 'warn'); return; }
  const source = extra || st.src || st.photo.blob;
  let res, canvas, fields, warnings, code = null;
  busy('Preparando OCR…');
  try {
    // En el mismo paso se busca el código de barras (si el formulario aún no lo tiene).
    if (!input('codigoBarras').value.trim()) { try { code = await readBarcode(source, busy); } catch { code = null; } }
    busy('Preparando OCR…');
    canvas = await blobToCanvas(source, 3000); res = await recognize(canvas, busy);
    ({ fields, warnings } = extractFields(res.lines));
    // Lecturas adicionales solo si faltan lote o vencimiento: suelen estar impresos aparte, por puntos o con poco contraste.
    const miss = f => !fields.some(x => x.field === f && !x.doubt);
    const need = () => miss('lote') || miss('vencimiento');
    const merge = (r, note, doubt) => {
      const e2 = extractFields(r.lines);
      for (const f of ['lote', 'vencimiento', 'fechaFabricacion']) {
        const hit = e2.fields.find(x => x.field === f && !x.doubt);
        if (miss(f) && hit) { fields = fields.filter(x => x.field !== f).concat({ ...hit, doubt, checked: hit.checked && !doubt, notes: [...hit.notes, note] }); if (f === 'vencimiento') warnings = []; }
      }
      res.text += '\n— Lectura adicional —\n' + r.text;
    };
    if (need()) merge(await recognize(canvas, (t, f) => busy('Segunda lectura (lote y fechas)…', f), true), 'Detectado en una segunda lectura de la imagen.', false);
    if (need()) {
      busy('Realzando la imagen…');
      const ec = enhance(canvas);
      try { merge(await recognize(ec, (t, f) => busy('Tercera lectura con imagen realzada…', f), true), 'Leído tras realzar la imagen (impresión tenue o por puntos): este tipo de lectura falla con frecuencia. Compárelo carácter por carácter con el empaque antes de marcarlo.', true); }
      finally { freeCanvas(ec); }
    }
  }
  catch (e) { busy(false); await modal('No se pudo reconocer el texto', h('div', {}, h('p', {}, errMsg(e)), h('p', { class: 'muted small' }, 'Los datos del formulario no se modificaron. Puede ingresarlos manualmente.'))); return; }
  finally { freeCanvas(canvas); busy(false); }

  if (code) fields.push({ field: 'codigoBarras', label: 'Código de barras', value: code.value, conf: null, doubt: false, checked: true, code,
    notes: [`Decodificado de las barras (${code.format}), no del texto. Compárelo con el número impreso.`] });
  const rows = fields.map(f => {
    const inp = h('input', { value: f.value, 'aria-label': f.label + ' detectado', spellcheck: false });
    const cur = input(f.field).value.trim();
    // Con una foto adicional no se pisa lo que ya está en el formulario, salvo que el usuario lo marque.
    const cb = h('input', { type: 'checkbox', checked: f.checked && !(extra && cur), 'aria-label': 'Usar ' + f.label });
    const node = h('div', { class: 'ocr-row' + (f.doubt ? ' doubt' : '') },
      h('div', { class: 'top' }, cb, h('b', {}, f.label),
        h('span', { class: 'chip ' + (f.conf == null ? '' : f.conf >= 80 ? '' : f.conf >= 60 ? 'warn' : 'bad') }, f.code ? 'Código decodificado' : f.conf == null ? 'Confianza n/d' : `Confianza ${Math.round(f.conf)} %`),
        f.doubt ? h('span', { class: 'chip warn' }, 'Dudoso') : null),
      inp,
      ...f.notes.map(n => h('p', { class: 'why' }, '⚠ ' + n)),
      cur && cur !== f.value ? h('p', { class: 'why' }, `Reemplazará el valor actual: «${cur}»`) : null);
    return { f, cb, inp, node };
  });
  const body = h('div', {},
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
    setField(r.f.field, v, v !== r.f.value ? 'manual' : r.f.code ? 'codigo' : 'ocr'); n++;
    if (r.f.code && v === r.f.value) st.formatoCodigo = r.f.code.format;     // si el usuario lo corrigió, pasa a ser dato manual
  }
  chips(); scheduleDraft();
  toast(n ? `${n} dato(s) aplicados. Revise el formulario y pulse Guardar para confirmar.` : 'No se aplicó ningún dato.', n ? 'ok' : 'warn', 5500);
}

// ---- Guardado ----
async function save(ev) {
  ev.preventDefault();
  const v = values(), err = $('#form-error');
  err.hidden = true;
  if (!v.nombre) { input('nombre').classList.add('invalid'); err.textContent = 'Escriba el nombre del producto para poder guardar.'; err.hidden = false; input('nombre').focus(); return; }
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
    if (f) { st.origen[f] = 'manual'; e.target.classList.remove('invalid'); $(`label[for="f-${f}"] .src`)?.remove(); scheduleDraft(); }
  });
  $('#btn-form-clear').addEventListener('click', () => newRecord());
  $('#btn-photo-del').addEventListener('click', removePhoto);
  $('#btn-barcode').addEventListener('click', () => runBarcode());
  $('#btn-ocr').addEventListener('click', () => runOCR());

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
      if (a === 'extra') { if (st.photo) await runOCR(file); return; }
      if (a && st.dirty && !(await confirmDlg('Formulario con datos', 'El formulario tiene datos sin guardar. ¿Usar esta fotografía en ese mismo registro?', 'Usar aquí'))) return;
      await setPhotoFromFile(file, a);
    });
  }
  window.addEventListener('pagehide', () => { if (st.dirty) saveDraft(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && st.dirty) saveDraft(); });
  fill(null);
}
