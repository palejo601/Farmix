// Historial: búsqueda, filtros, detalle, edición, eliminación y acceso a rótulos.
import { $, h, toast, modal, confirmDlg, fmtDate, errMsg } from './ui.js';
import * as db from './db.js';
import { FIELDS, SRC_LABEL, editRecord } from './form.js';
import { fromStored } from './photos.js';

const norm = s => (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const MES = { ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6, jul: 7, ago: 8, aug: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12, dec: 12 };

// Interpreta la fecha escrita (solo para avisos de estado; el texto guardado nunca se altera). Sin día → fin de mes.
export function parseVenc(s) {
  s = norm(s).trim(); if (!s) return null;
  let d, m, y, x;
  if ((x = s.match(/^(\d{4})[\/\-.](\d{1,2})(?:[\/\-.](\d{1,2}))?$/))) [y, m, d] = [+x[1], +x[2], x[3] ? +x[3] : 0];
  else if ((x = s.match(/^(\d{1,2})[\/\-. ](\d{1,2})[\/\-. ](\d{2,4})$/))) [d, m, y] = [+x[1], +x[2], +x[3]];
  else if ((x = s.match(/^(\d{1,2})[\/\-. ](\d{2,4})$/))) [d, m, y] = [0, +x[1], +x[2]];
  else if ((x = s.match(/^(?:(\d{1,2})[\/\-. ]*)?([a-z]{3})[a-z]*\.?[\/\-. ]*(\d{2,4})$/)) && MES[x[2]]) [d, m, y] = [x[1] ? +x[1] : 0, MES[x[2]], +x[3]];
  else return null;
  if (y < 100) y += 2000;
  if (m < 1 || m > 12 || d > 31 || y < 2000 || y > 2100) return null;
  return d ? new Date(y, m - 1, d, 23, 59, 59) : new Date(y, m, 0, 23, 59, 59);
}
export function vencState(s) {
  if (!s) return 'sinvenc';
  const d = parseVenc(s); if (!d) return 'nd';
  const days = (d - Date.now()) / 864e5;
  return days < 0 ? 'vencido' : days <= 90 ? 'prox' : 'ok';
}

let cache = [];
const meta = (label, v) => v ? h('div', { class: 'meta' }, h('b', {}, label + ': '), v) : null;

function card(r) {
  const vs = vencState(r.vencimiento);
  const thumb = r.thumb ? h('img', { class: 'thumb', src: r.thumb, alt: 'Fotografía de ' + r.nombre, loading: 'lazy' })
    : h('div', { class: 'thumb', html: '<svg viewBox="0 0 24 24"><use href="#i-photo"/></svg>', title: 'Sin fotografía' });
  return h('article', { class: 'rec' }, thumb,
    h('div', {},
      h('h4', {}, r.nombre),
      (r.principioActivo || r.concentracion) ? h('div', { class: 'meta' }, [r.principioActivo, r.concentracion].filter(Boolean).join(' · ')) : null,
      meta('Lote', r.lote),
      r.vencimiento ? h('div', { class: 'meta' }, h('b', {}, 'Vence: '), r.vencimiento, ' ',
        vs === 'vencido' ? h('span', { class: 'chip bad' }, 'Vencido') : vs === 'prox' ? h('span', { class: 'chip warn' }, 'Próximo a vencer') : null)
        : h('div', { class: 'meta' }, h('span', { class: 'chip warn' }, 'Sin fecha de vencimiento')),
      meta('Código', r.codigoBarras), meta('Laboratorio', r.laboratorio),
      h('div', { class: 'meta muted' }, 'Registrado: ' + fmtDate(r.createdAt))),
    h('div', { class: 'acts' },
      h('button', { class: 'btn small', onclick: () => detail(r.id) }, 'Abrir'),
      h('button', { class: 'btn small', onclick: () => editRecord(r.id) }, 'Editar'),
      h('button', { class: 'btn small primary', onclick: () => { document.dispatchEvent(new CustomEvent('fe:label', { detail: r.id })); } }, 'Rótulo'),
      h('button', { class: 'btn small danger-outline', onclick: () => remove(r) }, 'Eliminar')));
}

function render() {
  const q = norm($('#h-search').value).trim().split(/\s+/).filter(Boolean), f = $('#h-filter').value, s = $('#h-sort').value;
  let list = cache.filter(r => {
    const hay = norm([r.nombre, r.principioActivo, r.lote, r.codigoBarras, r.laboratorio, r.servicio, r.cantidad, r.unidades].join(' '));
    if (!q.every(t => hay.includes(t))) return false;
    if (f === 'foto') return r.tieneFoto; if (f === 'sinfoto') return !r.tieneFoto;
    if (f) return vencState(r.vencimiento) === f;
    return true;
  });
  const far = 9e15;
  list.sort(s === 'nombre' ? (a, b) => a.nombre.localeCompare(b.nombre, 'es') : s === 'venc' ? (a, b) => (parseVenc(a.vencimiento) || far) - (parseVenc(b.vencimiento) || far) : (a, b) => b.createdAt - a.createdAt);
  $('#hist-count').textContent = list.length === cache.length ? `${cache.length} registro(s)` : `${list.length} de ${cache.length}`;
  $('#hist-list').replaceChildren(...(list.length ? list.map(card) : [h('div', { class: 'empty' },
    cache.length ? 'Ningún registro coincide con la búsqueda o el filtro.' : 'Aún no hay registros guardados. Use «Registrar» para crear el primero.')]));
}

export async function refreshHistory() {
  try { cache = await db.allRecords(); render(); }
  catch (e) { $('#hist-list').replaceChildren(h('div', { class: 'banner danger' }, 'No se pudo leer el historial: ' + errMsg(e))); }
}

async function detail(id) {
  const r = await db.getRecord(id); if (!r) { toast('El registro ya no existe.', 'err'); return refreshHistory(); }
  const p = fromStored(await db.getPhoto(id).catch(() => null));
  const url = p ? URL.createObjectURL(p.blob) : null;
  const body = h('div', {},
    url ? h('img', { class: 'detail-photo', src: url, alt: 'Fotografía del producto' }) : h('p', { class: 'muted' }, 'Sin fotografía asociada.'),
    h('dl', { class: 'kv' }, FIELDS.filter(([f]) => r[f]).flatMap(([f, label]) => [h('dt', {}, label), h('dd', {}, r[f],
      r.origen?.[f] && r.origen[f] !== 'manual' ? h('span', { class: 'chip src' + (r.origen[f] === 'ocr' ? ' warn' : '') }, SRC_LABEL[r.origen[f]]) : null)]),
      r.formatoCodigo ? [h('dt', {}, 'Formato del código'), h('dd', {}, r.formatoCodigo)] : [],
      h('dt', {}, 'Registrado'), h('dd', {}, fmtDate(r.createdAt)), h('dt', {}, 'Última modificación'), h('dd', {}, fmtDate(r.updatedAt))),
    h('details', {}, h('summary', {}, 'Trazabilidad de cambios'), h('ul', { class: 'log' }, (r.log || []).slice().reverse().map(l =>
      h('li', {}, `${fmtDate(l.at)} — ${l.accion}${l.campos?.length ? ': ' + l.campos.join(', ') : ''}`)))),
    h('p', { class: 'note' }, 'Datos de apoyo ingresados o leídos en este dispositivo. Verifique siempre contra el empaque original.'));
  const act = await modal(r.nombre, body, [{ label: 'Cerrar', value: null }, { label: 'Editar', value: 'edit' }, { label: 'Imprimir rótulo', value: 'label', class: 'primary' }]);
  if (url) URL.revokeObjectURL(url);
  if (act === 'edit') editRecord(id);
  if (act === 'label') document.dispatchEvent(new CustomEvent('fe:label', { detail: id }));
}

async function remove(r) {
  if (!(await confirmDlg('Eliminar registro', `Se eliminará «${r.nombre}»${r.lote ? ' (lote ' + r.lote + ')' : ''} junto con su fotografía. Esta acción no se puede deshacer.`, 'Eliminar', true))) return;
  try { await db.deleteRecord(r.id); toast('Registro eliminado.', 'ok'); document.dispatchEvent(new CustomEvent('fe:changed')); }
  catch (e) { toast('No se pudo eliminar: ' + errMsg(e), 'err'); }
}

export function initHistory() {
  for (const id of ['h-search', 'h-filter', 'h-sort']) $('#' + id).addEventListener('input', render);
  document.addEventListener('fe:changed', refreshHistory);
}
