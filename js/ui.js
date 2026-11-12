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

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const nativePlatform = () => (self.Capacitor?.isNativePlatform?.() ? self.Capacitor.getPlatform?.() || 'android' : '');   // 'android' | 'ios' | ''
export const isNative = () => !!self.Capacitor?.isNativePlatform?.();

// En la app Android el WebView no descarga archivos: se escribe el archivo y se abre el menú del sistema para guardarlo, abrirlo o enviarlo.
async function nativeWrite(blob, name) {
  const data = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
  return (await self.Capacitor.Plugins.Filesystem.writeFile({ path: name, data, directory: 'CACHE' })).uri;
}
async function nativeSave(blob, name) {
  const uri = await nativeWrite(blob, name);
  try { await self.Capacitor.Plugins.Share.share({ title: name, files: [uri], dialogTitle: 'Guardar o enviar ' + name }); }
  catch (e) { if (!/cancel/i.test(e?.message || '')) throw e; }
}
export const isAndroid = () => /android/i.test(navigator.userAgent);
// Versión de computador (Windows .exe): abre con el programa instalado (Word, lector de PDF) y guarda con «Guardar como».
const desk = () => self.farmaDesktop;
const deskBuf = async blob => new Uint8Array(await blob.arrayBuffer());

// VER: abre el archivo en una aplicación del teléfono (visor de PDF, Word, WPS…), sin pasar por Compartir.
// win = ventana abierta en el momento del toque (en la web, el navegador bloquea las ventanas abiertas después).
export function preopen() { return !desk() && !isNative() && !isAndroid() ? window.open('', '_blank') : null; }
export async function viewFile(blob, name, win = null) {
  if (desk()) { const err = await desk().open(name, await deskBuf(blob)); if (err) throw new Error(`No se pudo abrir ${name}: ${err}. Instale un programa que abra ${/pdf/.test(blob.type) ? 'PDF' : 'Word'}.`); return; }
  if (isNative()) {
    const uri = await nativeWrite(blob, name), FO = self.Capacitor.Plugins.FileOpener;
    if (!FO) throw new Error('Esta versión de la app no puede abrir archivos. Instale la versión más reciente.');
    try { await FO.open({ filePath: uri, contentType: blob.type, openWithDefault: true }); }
    catch (e) { throw new Error(/activity|no app|not found|handle/i.test(errMsg(e)) ? `No hay ninguna aplicación instalada que abra ${/pdf/.test(blob.type) ? 'PDF' : 'Word'}. Instale una (por ejemplo WPS Office o Word) o use «Compartir».` : errMsg(e)); }
    return;
  }
  // iPhone y computador: el navegador muestra el PDF y la vista previa del Word en una pestaña.
  if (win && !win.closed) { const url = URL.createObjectURL(blob); win.location.href = url; setTimeout(() => URL.revokeObjectURL(url), 120000); return; }
  // Android (navegador): se descarga y el sistema ofrece «Abrir» con la aplicación instalada.
  const url = URL.createObjectURL(blob), a = h('a', { href: url, download: name });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
  toast('Archivo descargado: tóquelo en la notificación o en Descargas para abrirlo.', 'ok', 6000);
}

// COMPARTIR: menú del sistema (WhatsApp, correo, Drive…). Si el navegador no lo permite, se descarga.
export async function shareFile(blob, name) {
  if (isNative()) return nativeSave(blob, name);
  if (desk()) return download(blob, name);
  const file = new File([blob], name, { type: blob.type || 'application/octet-stream' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }); return; }
    catch (e) { if (e?.name === 'AbortError') return; if (e?.name !== 'NotAllowedError') throw e; }
    busy(false);                                   // Safari pide un toque directo: se ofrece el botón
    await modal('Archivo listo', h('p', {}, `«${name}» está listo para compartir.`), [{ label: 'Cerrar', value: null },
      { label: 'Compartir', class: 'primary', keep: true, onclick: async () => { try { await navigator.share({ files: [file], title: name }); } catch (e) { if (e?.name !== 'AbortError') toast('No se pudo abrir el menú Compartir: ' + errMsg(e), 'err'); } } }]);
    return;
  }
  const url = URL.createObjectURL(blob), a = h('a', { href: url, download: name });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
  toast('Este navegador no permite compartir archivos: se descargó para que lo envíe desde Descargas.', 'warn', 6000);
}

export async function download(blob, name) {
  if (isNative()) return nativeSave(blob, name);
  if (desk()) { const path = await desk().save(name, await deskBuf(blob)); if (path) toast('Guardado en ' + path, 'ok', 5000); return; }
  // iPhone / iPad: una PWA instalada no descarga archivos de forma fiable. Se ofrece un botón que abre el menú Compartir
  // (Guardar en Archivos, imprimir, enviar). Debe pulsarlo el usuario: Safari exige un gesto directo.
  if (isIOS() && navigator.canShare) {
    const file = new File([blob], name, { type: blob.type || 'application/octet-stream' });
    if (navigator.canShare({ files: [file] })) {
      busy(false);                                   // el indicador de proceso no debe tapar el botón
      await modal('Archivo listo', h('p', {}, `«${name}» está listo. Pulse el botón y elija «Guardar en Archivos», imprimir o enviarlo.`), [
        { label: 'Cerrar', value: null },
        { label: 'Guardar o compartir', class: 'primary', keep: true, onclick: async () => { try { await navigator.share({ files: [file], title: name }); } catch (e) { if (e?.name !== 'AbortError') toast('No se pudo abrir el menú Compartir: ' + errMsg(e), 'err'); } } },
      ]);
      return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export const fmtDate = ts => ts ? new Date(ts).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' }) : '';
export const fmtBytes = n => n == null ? '—' : n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(0) + ' KB' : (n / 1048576).toFixed(1) + ' MB';
export const stamp = () => new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
export const errMsg = e => (e && e.message) || String(e);
