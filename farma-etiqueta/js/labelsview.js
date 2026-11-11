// Pantalla de rótulos: selección de productos, tamaño, hoja, vista previa, impresión, PDF y Word.
import { $, $$, h, toast, modal, busy, loadScript, download, isNative, stamp, errMsg } from './ui.js';
import * as db from './db.js';
import { SIZES, LABEL_FIELDS, PAPERS, layoutLabel, sheetGeometry, maxFit, cellXY, pageSVG, runs } from './labels.js';

const MAX_LABELS = 3000;
let items = [];           // [{rec, qty}]
let cfg = {
  size: 1, w: 70, h: 50, border: true,
  fields: { nombre: true, principioActivo: true, concentracion: true, presentacion: false, lote: true, vencimiento: true, laboratorio: false, codigoBarras: true, condiciones: false, ubicacion: false },
  paper: 'A4', orient: 'v', cpw: 210, cph: 297, cols: 2, rows: 5, mt: 10, ml: 10, mb: 10, mr: 10, gh: 3, gv: 3,
};
let job = null;           // resultado del último cálculo: {sh, pages:[[layout…]], total, error}
const num = (id, def, min = 0) => { const v = parseFloat($('#' + id).value.replace(',', '.')); return Number.isFinite(v) && v >= min ? v : def; };

function sheet() {
  let [pw, ph] = cfg.paper === 'custom' ? [cfg.cpw, cfg.cph] : PAPERS[cfg.paper];
  if (cfg.paper !== 'custom' && cfg.orient === 'h') [pw, ph] = [ph, pw];
  if (cfg.paper === 'custom' && ((cfg.orient === 'h') !== (pw > ph))) [pw, ph] = [ph, pw];
  return { pw, ph, cols: cfg.cols, rows: cfg.rows, mt: cfg.mt, ml: cfg.ml, mb: cfg.mb, mr: cfg.mr, gh: cfg.gh, gv: cfg.gv };
}

function readCfg() {
  cfg.size = +$('#lb-size').value;
  if (cfg.size >= 0) { cfg.w = SIZES[cfg.size][1]; cfg.h = SIZES[cfg.size][2]; $('#lb-w').value = cfg.w; $('#lb-h').value = cfg.h; }
  else { cfg.w = num('lb-w', cfg.w, 10); cfg.h = num('lb-h', cfg.h, 8); }
  $('#lb-w').disabled = $('#lb-h').disabled = cfg.size >= 0;
  for (const [f] of LABEL_FIELDS) cfg.fields[f] = $('#lbf-' + f).checked;
  cfg.border = $('#lb-border').checked;
  cfg.paper = $('#sh-paper').value; cfg.orient = $('#sh-orient').value;
  $$('.sh-custom').forEach(e => { e.hidden = cfg.paper !== 'custom'; });
  cfg.cpw = num('sh-pw', cfg.cpw, 20); cfg.cph = num('sh-ph', cfg.cph, 20);
  cfg.cols = Math.round(num('sh-cols', cfg.cols, 1)); cfg.rows = Math.round(num('sh-rows', cfg.rows, 1));
  for (const k of ['mt', 'ml', 'mb', 'mr', 'gh', 'gv']) cfg[k] = num('sh-' + k, cfg[k]);
}
function writeCfg() {
  $('#lb-size').value = cfg.size; $('#lb-w').value = cfg.w; $('#lb-h').value = cfg.h; $('#lb-border').checked = cfg.border;
  for (const [f] of LABEL_FIELDS) $('#lbf-' + f).checked = !!cfg.fields[f];
  $('#sh-paper').value = cfg.paper; $('#sh-orient').value = cfg.orient; $('#sh-pw').value = cfg.cpw; $('#sh-ph').value = cfg.cph;
  for (const k of ['cols', 'rows', 'mt', 'ml', 'mb', 'mr', 'gh', 'gv']) $('#sh-' + k).value = cfg[k];
}

function renderItems() {
  $('#lb-items').replaceChildren(...(items.length ? items.map((it, i) => h('div', { class: 'item' },
    h('div', {}, h('b', {}, it.rec.nombre), it.rec.lote ? h('div', { class: 'muted small' }, 'Lote ' + it.rec.lote) : null),
    h('input', { type: 'number', min: 1, max: MAX_LABELS, step: 1, value: it.qty, inputMode: 'numeric', 'aria-label': 'Cantidad de rótulos de ' + it.rec.nombre,
      oninput: e => { it.qty = Math.max(1, Math.min(MAX_LABELS, Math.round(+e.target.value) || 1)); update(); } }),
    h('button', { class: 'btn small danger-outline', 'aria-label': 'Quitar ' + it.rec.nombre, onclick: () => { items.splice(i, 1); renderItems(); update(); } }, 'Quitar')))
    : [h('p', { class: 'muted' }, 'Agregue uno o más productos del historial e indique cuántos rótulos necesita de cada uno.')]));
}

let saveT = 0;
function update() {
  readCfg();
  clearTimeout(saveT); saveT = setTimeout(() => db.kvSet('labelCfg', cfg).catch(() => {}), 600);
  const sh = sheet(), total = Math.min(MAX_LABELS, items.reduce((a, it) => a + it.qty, 0));
  const geo = sheetGeometry(sh, cfg.w, cfg.h, total);
  const warn = new Set(), labels = [];
  if (!geo.error) for (const it of items) {
    const lay = layoutLabel(it.rec, cfg);
    lay.warnings.forEach(w => warn.add(`${it.rec.nombre}: ${w}`));
    if (!lay.items.length) warn.add(`${it.rec.nombre}: ninguno de los campos seleccionados tiene datos; el rótulo quedaría vacío.`);
    for (let k = 0; k < it.qty && labels.length < MAX_LABELS; k++) labels.push(lay);
  }
  const pages = [];
  for (let i = 0; i < labels.length; i += geo.per) pages.push(labels.slice(i, i + geo.per));
  job = { sh, pages, total: labels.length, error: geo.error };
  $('#sh-error').hidden = !geo.error; $('#sh-error').textContent = geo.error;
  $('#sh-summary').textContent = geo.error ? '' : `${cfg.w} × ${cfg.h} mm · ${geo.per} rótulo(s) por hoja (${cfg.cols} × ${cfg.rows}) · ${labels.length} rótulo(s) en total · ${pages.length} página(s) de ${sh.pw} × ${sh.ph} mm`;
  $('#lb-warnings').replaceChildren(...[...warn].map(w => h('li', {}, w)));
  const ok = !geo.error && labels.length > 0;
  for (const id of ['lb-print', 'lb-pdf', 'lb-docx']) $('#' + id).disabled = !ok;
  const pv = $('#lb-preview');
  if (!ok) { pv.replaceChildren(h('p', { class: 'muted', style: 'margin:0' }, geo.error ? 'Corrija la distribución de la hoja para ver la vista previa.' : 'Agregue productos para ver la vista previa.')); return; }
  const shown = pages.slice(0, 12);
  pv.innerHTML = shown.map((p, i) => `<div><div class="pg">Página ${i + 1} de ${pages.length}</div>${pageSVG(p, sh, cfg.w, cfg.h, cfg.border, false)}</div>`).join('')
    + (pages.length > shown.length ? `<p class="muted small">Se muestran las primeras ${shown.length} páginas; las demás siguen la misma distribución.</p>` : '');
}

async function pick() {
  const all = (await db.allRecords()).sort((a, b) => b.createdAt - a.createdAt);
  if (!all.length) { toast('Aún no hay registros. Registre un producto primero.', 'warn'); return; }
  const sel = new Set();
  const list = h('div', { class: 'list' });
  const draw = q => {
    q = q.toLowerCase();
    list.replaceChildren(...all.filter(r => [r.nombre, r.principioActivo, r.lote, r.codigoBarras, r.laboratorio].join(' ').toLowerCase().includes(q)).slice(0, 200).map(r =>
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: sel.has(r.id), onchange: e => { e.target.checked ? sel.add(r.id) : sel.delete(r.id); } }),
        h('span', {}, h('b', {}, r.nombre), r.lote ? ` · Lote ${r.lote}` : '', r.vencimiento ? ` · Vence ${r.vencimiento}` : ''))));
  };
  draw('');
  const ok = await modal('Agregar productos', h('div', {}, h('input', { type: 'search', placeholder: 'Buscar…', 'aria-label': 'Buscar producto', oninput: e => draw(e.target.value) }), list),
    [{ label: 'Cancelar', value: false }, { label: 'Agregar seleccionados', value: true, class: 'primary' }]);
  if (!ok) return;
  for (const r of all) if (sel.has(r.id) && !items.some(it => it.rec.id === r.id)) items.push({ rec: r, qty: 1 });
  renderItems(); update();
}

export async function addLabelFor(id) {
  const rec = await db.getRecord(id); if (!rec) return;
  await libs();
  const cur = items.find(it => it.rec.id === id);
  if (cur) cur.rec = rec; else items.push({ rec, qty: 1 });
  location.hash = '#rotulos';
}

const libs = () => loadScript('vendor/lib/JsBarcode.all.min.js').catch(e => toast(errMsg(e), 'err'));

export async function showLabels() {
  await libs();
  // refrescar datos por si se editaron o eliminaron registros
  const all = new Map((await db.allRecords()).map(r => [r.id, r]));
  items = items.filter(it => all.has(it.rec.id)).map(it => ({ ...it, rec: all.get(it.rec.id) }));
  renderItems(); update();
}

// ---- Impresión con CSS: página y rótulos en milímetros reales ----
function print() {
  if (!job || job.error || !job.total) return;
  if (isNative()) { toast('En la app Android se genera el PDF: ábralo o envíelo a su impresora desde el menú que aparece.', '', 6000); return exportPDF(); }
  const { sh, pages } = job;
  let st = $('#page-style'); if (!st) { st = h('style', { id: 'page-style' }); document.head.append(st); }
  st.textContent = `@page{size:${sh.pw}mm ${sh.ph}mm;margin:0}`;
  $('#print-root').innerHTML = pages.map(p => pageSVG(p, sh, cfg.w, cfg.h, cfg.border, true)).join('');
  window.print();
}

// ---- PDF vectorial (jsPDF) con la misma geometría ----
async function exportPDF() {
  if (!job || job.error || !job.total) return;
  busy('Generando PDF…');
  try {
    await loadScript('vendor/lib/jspdf.umd.min.js');
    const { sh, pages } = job, { w, h: lh } = cfg;
    const doc = new self.jspdf.jsPDF({ unit: 'mm', format: [sh.pw, sh.ph], orientation: sh.pw > sh.ph ? 'landscape' : 'portrait', compress: true });
    const K = 72 / 25.4;
    pages.forEach((labels, pi) => {
      if (pi) doc.addPage([sh.pw, sh.ph], sh.pw > sh.ph ? 'landscape' : 'portrait');
      labels.forEach((lay, i) => {
        const { x, y } = cellXY(sh, w, lh, i);
        if (cfg.border) { doc.setDrawColor(85); doc.setLineWidth(0.15); doc.roundedRect(x + 0.1, y + 0.1, w - 0.2, lh - 0.2, 0.8, 0.8, 'S'); }
        doc.setFillColor(0); doc.setTextColor(0);
        for (const it of lay.items) {
          if (it.t === 'bars') { for (const [a, n] of runs(it.bits)) doc.rect(x + it.x + a * it.mw, y + it.y, n * it.mw, it.h, 'F'); continue; }
          doc.setFont('helvetica', it.bold ? 'bold' : 'normal');
          let pt = it.size * K; doc.setFontSize(pt);
          const tw = doc.getTextWidth(it.text), max = w - 2 * lay.pad;
          if (tw > max) doc.setFontSize(pt * max / tw);          // Helvetica del PDF puede ser algo más ancha: nunca se sale del rótulo
          doc.text(it.text, x + it.x, y + it.y, { align: 'center', charSpace: it.mono ? it.size * 0.08 : 0 });
        }
      });
    });
    await download(doc.output('blob'), `rotulos-${stamp()}.pdf`);
    toast(`PDF generado: ${job.total} rótulo(s) en ${pages.length} página(s).`, 'ok');
  } catch (e) { toast('No se pudo generar el PDF: ' + errMsg(e), 'err', 6000); }
  finally { busy(false); }
}

// ---- Word (DOCX) editable: tabla con celdas de medida exacta y texto real ----
async function barPNG(bits) {
  const c = document.createElement('canvas'); c.width = bits.length * 4; c.height = 80;
  const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.fillStyle = '#000';
  for (const [a, n] of runs(bits)) ctx.fillRect(a * 4, 0, n * 4, 80);
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  return new Uint8Array(await blob.arrayBuffer());
}
async function exportDOCX() {
  if (!job || job.error || !job.total) return;
  busy('Generando documento Word…');
  try {
    await loadScript('vendor/lib/docx.iife.min.js');
    const D = self.docx, { sh, pages } = job, { w, h: lh } = cfg;
    const tw = mm => Math.round(mm * 56.6929), px = mm => mm * 96 / 25.4, hp = mm => Math.max(4, Math.round(mm * 2.8346 * 2 * 0.92));
    const none = { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' }, line = { style: D.BorderStyle.SINGLE, size: 4, color: '555555' };
    const borders = b => ({ top: b, bottom: b, left: b, right: b });
    const tiny = () => new D.Paragraph({ spacing: { before: 0, after: 0, line: 20, lineRule: D.LineRuleType.EXACT }, children: [new D.TextRun({ text: '', size: 2 })] });
    const pngs = new Map();
    for (const p of pages) for (const lay of p) if (lay.bar && !pngs.has(lay.bar.bits)) pngs.set(lay.bar.bits, await barPNG(lay.bar.bits));
    const cellFor = lay => {
      const kids = lay.blocks.map(b => new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { before: 0, after: 0 },
        children: [new D.TextRun({ text: b.lines.join(' '), bold: b.bold, size: hp(b.size), font: 'Arial' })] }));
      if (lay.bar) {
        kids.push(new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { before: 40, after: 0 }, children: [new D.ImageRun({ type: 'png', data: pngs.get(lay.bar.bits),
          transformation: { width: px(lay.bar.bits.length * lay.bar.mw), height: px(lay.bar.bh) } })] }));
        kids.push(new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { before: 0, after: 0 }, children: [new D.TextRun({ text: lay.bar.text, size: hp(lay.bar.ts), font: 'Arial' })] }));
      }
      if (!kids.length) kids.push(tiny());
      return kids;
    };
    const colW = []; for (let c = 0; c < sh.cols; c++) { colW.push(tw(w)); if (c < sh.cols - 1 && sh.gh > 0) colW.push(tw(sh.gh)); }
    const children = [];
    pages.forEach((labels, pi) => {
      const rows = [];
      for (let r = 0; r < sh.rows && r * sh.cols < labels.length; r++) {
        const cells = [];
        for (let c = 0; c < sh.cols; c++) {
          const lay = labels[r * sh.cols + c];
          cells.push(new D.TableCell({ width: { size: tw(w), type: D.WidthType.DXA }, verticalAlign: D.VerticalAlign.CENTER, borders: borders(lay && cfg.border ? line : none),
            margins: { top: tw(lay ? lay.pad * 0.6 : 0), bottom: tw(lay ? lay.pad * 0.6 : 0), left: tw(lay ? lay.pad : 0), right: tw(lay ? lay.pad : 0) }, children: lay ? cellFor(lay) : [tiny()] }));
          if (c < sh.cols - 1 && sh.gh > 0) cells.push(new D.TableCell({ width: { size: tw(sh.gh), type: D.WidthType.DXA }, borders: borders(none), margins: { top: 0, bottom: 0, left: 0, right: 0 }, children: [tiny()] }));
        }
        rows.push(new D.TableRow({ height: { value: tw(lh), rule: D.HeightRule.EXACT }, cantSplit: true, children: cells }));
        if (sh.gv > 0 && (r + 1) * sh.cols < labels.length && r < sh.rows - 1)
          rows.push(new D.TableRow({ height: { value: tw(sh.gv), rule: D.HeightRule.EXACT }, children: colW.map(cw => new D.TableCell({ width: { size: cw, type: D.WidthType.DXA }, borders: borders(none), margins: { top: 0, bottom: 0, left: 0, right: 0 }, children: [tiny()] })) }));
      }
      if (pi) children.push(new D.Paragraph({ pageBreakBefore: true, spacing: { before: 0, after: 0, line: 20, lineRule: D.LineRuleType.EXACT }, children: [new D.TextRun({ text: '', size: 2 })] }));
      children.push(new D.Table({ layout: D.TableLayoutType.FIXED, columnWidths: colW, width: { size: colW.reduce((a, b) => a + b, 0), type: D.WidthType.DXA }, rows,
        borders: { ...borders(none), insideHorizontal: none, insideVertical: none } }));
    });
    children.push(tiny());
    const land = sh.pw > sh.ph;
    const doc = new D.Document({ creator: 'FARMA-ETIQUETA', title: 'Rótulos', sections: [{
      properties: { page: { size: { width: tw(Math.min(sh.pw, sh.ph)), height: tw(Math.max(sh.pw, sh.ph)), orientation: land ? D.PageOrientation.LANDSCAPE : D.PageOrientation.PORTRAIT },
        margin: { top: tw(sh.mt), bottom: tw(Math.max(0, sh.mb - 2)), left: tw(sh.ml), right: tw(Math.max(0, sh.mr - 1)), header: 0, footer: 0, gutter: 0 } } },
      children }] });
    await download(await D.Packer.toBlob(doc), `rotulos-${stamp()}.docx`);
    toast(`Documento Word generado: ${job.total} rótulo(s). El texto y las tablas son editables.`, 'ok');
  } catch (e) { toast('No se pudo generar el documento Word: ' + errMsg(e), 'err', 6000); }
  finally { busy(false); }
}

export async function initLabels() {
  const saved = await db.kvGet('labelCfg').catch(() => null);
  if (saved) cfg = { ...cfg, ...saved, fields: { ...cfg.fields, ...(saved.fields || {}) } };
  $('#lb-size').replaceChildren(...SIZES.map(([n, w, hh], i) => h('option', { value: i }, `${n} — ${w} × ${hh} mm`)), h('option', { value: -1 }, 'Personalizado'));
  $('#lb-fields').replaceChildren(...LABEL_FIELDS.map(([f, label]) => h('label', { class: 'check' }, h('input', { type: 'checkbox', id: 'lbf-' + f }), label)));
  writeCfg();
  $('#v-rotulos').addEventListener('input', e => { if (!e.target.closest('#lb-items')) update(); });
  $('#lb-add').addEventListener('click', pick);
  $('#sh-auto').addEventListener('click', () => { readCfg(); const m = maxFit(sheet(), cfg.w, cfg.h); $('#sh-cols').value = m.cols; $('#sh-rows').value = m.rows; update(); });
  $('#lb-print').addEventListener('click', print);
  $('#lb-pdf').addEventListener('click', exportPDF);
  $('#lb-docx').addEventListener('click', exportDOCX);
  window.addEventListener('afterprint', () => { $('#print-root').innerHTML = ''; });
  document.addEventListener('fe:label', e => addLabelFor(e.detail));
}
