// Utilidades de interfaz: nodos, avisos, modales, indicador de proceso, carga diferida de bibliotecas.
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k in e && k !== 'list' && k !== 'for') e[k] = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(k));
  return e;
}

export function toast(msg, type = '', ms = 4200) {
  const t = h('div', { class: 'toast ' + type, role: type === 'err' ? 'alert' : 'status' }, msg);
  $('#toasts').append(t);
  setTimeout(() => t.remove(), ms);
}

// Modal genérico. buttons: [{label, value, class}]. Devuelve la opción elegida (null si se cierra).
export function modal(title, body, buttons = [{ label: 'Cerrar', value: null }], opts = {}) {
  return new Promise(resolve => {
    const prev = document.activeElement;
    const close = v => { bg.remove(); document.removeEventListener('keydown', onKey); prev?.focus?.(); resolve(v); };
    const onKey = e => { if (e.key === 'Escape' && !opts.sticky) close(null); };
    const foot = h('footer', {}, buttons.map(b => b.node || h('button', {
      type: 'button', class: 'btn ' + (b.class || ''),
      onclick: async () => { if (b.onclick) { const r = await b.onclick(close); if (r === false) return; if (b.keep) return; } close(b.value); },
    }, b.label)));
    const box = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      h('header', {}, title), h('div', { class: 'body' }, body), foot);
    const bg = h('div', { class: 'modal-bg', onclick: e => { if (e.target === bg && !opts.sticky) close(null); } }, box);
    $('#modal-root').append(bg);
    document.addEventListener('keydown', onKey);
    (foot.querySelector('.primary') || foot.querySelector('button'))?.focus();
    opts.onopen?.(close, box);
  });
}

export const confirmDlg = (title, text, okLabel = 'Aceptar', danger = false) =>
  modal(title, h('p', {}, text), [
    { label: 'Cancelar', value: false },
    { label: okLabel, value: true, class: danger ? 'danger' : 'primary' },
  ]).then(v => v === true);

export function busy(text, frac) {
  const b = $('#busy');
  if (text === false) { b.hidden = true; return; }
  b.hidden = false;
  $('#busy-text').textContent = text;
  $('#busy-bar').style.width = frac == null ? '0' : Math.round(frac * 100) + '%';
  $('#busy-bar').parentElement.hidden = frac == null;
}

const loaded = {};
export function loadScript(src) {
  return loaded[src] ||= new Promise((res, rej) => {
    const s = h('script', { src });
    s.onload = res;
    s.onerror = () => { delete loaded[src]; s.remove(); rej(new Error('No se pudo cargar el componente «' + src + '». Si está sin conexión, abra la aplicación una vez con internet para que quede guardado.')); };
    document.head.append(s);
  });
}

export function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export const fmtDate = ts => ts ? new Date(ts).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' }) : '';
export const fmtBytes = n => n == null ? '—' : n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(0) + ' KB' : (n / 1048576).toFixed(1) + ' MB';
export const stamp = () => new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
export const errMsg = e => (e && e.message) || String(e);
