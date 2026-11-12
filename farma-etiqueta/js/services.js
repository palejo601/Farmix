// Apartado «Rótulos por servicio»: se elige el servicio y se rotulan aparte sus productos, o un rótulo solo con el
// nombre del servicio (para cajas, gavetas o carros del servicio).
import { $, h, toast } from './ui.js';
import * as db from './db.js';
import { setLabelItems } from './labelsview.js';

export const SERVICES = [
  ['Hospitalización', ['Hospitalización 1', 'Hospitalización 2', 'Hospitalización 3', 'Hospitalización 4']],
  ['Urgencias', ['Urgencias – Consulta', 'Urgencias – Observación', 'Urgencias – Procedimiento']],
  ['Unidades de cuidado intensivo', ['UCI Adulto', 'UCI Neonatal']],
  ['Otros servicios', ['Ginecología']],
];
let current = '';

export function initServices() {
  $('#sv-grid').replaceChildren(...SERVICES.map(([g, list]) => h('div', { class: 'sv-group' }, h('h3', {}, g),
    h('div', { class: 'sv-buttons' }, ...list.map(s => h('button', { type: 'button', class: 'btn sv-btn', 'data-sv': s, onclick: () => choose(s) }, s))))));
}

export async function refreshServices() { if (current) await choose(current); }

async function choose(s) {
  current = s;
  document.querySelectorAll('.sv-btn').forEach(b => b.classList.toggle('primary', b.dataset.sv === s));
  const recs = (await db.allRecords()).filter(r => r.servicio === s).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es'));
  const qty = new Map(recs.map(r => [r.id, 1])), sel = new Set(recs.map(r => r.id));
  $('#sv-title').textContent = s;
  $('#sv-detail').hidden = false;
  $('#sv-count').textContent = recs.length ? `${recs.length} producto(s) registrados en este servicio.` : 'Aún no hay productos con este servicio. En el formulario del producto elija «Servicio» y guárdelo.';
  $('#sv-list').replaceChildren(...recs.map(r => h('div', { class: 'item' },
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: true, onchange: e => { e.target.checked ? sel.add(r.id) : sel.delete(r.id); } }),
      h('span', {}, h('b', {}, r.nombre), r.lote ? ` · Lote ${r.lote}` : '', r.vencimiento ? ` · Vence ${r.vencimiento}` : '', r.cantidad ? ` · ${r.cantidad}` : '')),
    h('input', { type: 'number', min: 1, max: 3000, step: 1, value: 1, inputMode: 'numeric', 'aria-label': 'Rótulos de ' + r.nombre,
      oninput: e => qty.set(r.id, Math.max(1, Math.min(3000, Math.round(+e.target.value) || 1))) }))));
  $('#sv-products').disabled = !recs.length;
  $('#sv-products').onclick = () => {
    const list = recs.filter(r => sel.has(r.id)).map(r => ({ rec: r, qty: qty.get(r.id) }));
    if (!list.length) return toast('Marque al menos un producto.', 'warn');
    setLabelItems(list);
  };
  $('#sv-name').onclick = () => setLabelItems([{ rec: { id: 'svc:' + s, servicio: s, nombre: '', servicioSolo: true }, qty: Math.max(1, Math.round(+$('#sv-name-qty').value) || 1) }]);
}
