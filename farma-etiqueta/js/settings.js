// Configuración y estado: conexión, almacenamiento, recursos OCR sin conexión, instalación y actualización.
import { $, h, toast, confirmDlg, fmtBytes, errMsg, isNative, nativePlatform } from './ui.js';
const appName = () => nativePlatform() === 'ios' ? 'App iPhone / iPad' : 'App Android';
import * as db from './db.js';
import { initOCR, recognizeOnline, OCR_BASE, OCR_CORES } from './ocr.js';

export const APP_VERSION = '1.6.1';
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const secure = () => self.isSecureContext && 'serviceWorker' in navigator && 'caches' in self;
let installEvt = null, swReg = null;

export function mode() {
  if (isNative()) return appName() + ' instalada';
  if (location.protocol === 'file:') return 'Archivo local (funciones limitadas)';
  if (!secure()) return 'Sitio sin HTTPS (sin modo offline)';
  return standalone() ? 'Aplicación instalada (PWA)' : 'Sitio web HTTPS (instalable)';
}

// ¿Están guardados localmente todos los recursos que el OCR necesita en este dispositivo?
export async function ocrOffline() {
  if (isNative()) return true;                       // en la app todos los recursos van dentro del instalador
  if (!secure()) return false;
  try {
    const has = async u => !!(await caches.match(new URL(u, document.baseURI).href));
    for (const u of OCR_BASE) if (!(await has(u))) return false;
    for (const u of OCR_CORES) if (await has(u)) return true;
    return false;
  } catch { return false; }
}

function netChip() {
  const c = $('#net-chip'), on = navigator.onLine;
  c.textContent = on ? 'En línea' : 'Sin conexión'; c.className = 'chip' + (on ? '' : ' off');
}

export async function refreshStatus() {
  netChip();
  const on = await db.kvGet('onlineOcr').catch(() => null), onOK = !!(on?.enabled && on.key);
  const [ocr, n, est, persisted] = await Promise.all([ocrOffline(), db.countRecords().catch(() => null),
    navigator.storage?.estimate?.().catch(() => null), navigator.storage?.persisted?.().catch(() => false)]);
  const sw = isNative() ? 'Activo' : secure() ? (navigator.serviceWorker.controller ? 'Activo' : 'Instalándose…') : 'No disponible';
  const rows = [
    ['Conexión', navigator.onLine ? 'En línea' : 'Sin conexión', navigator.onLine ? '' : 'warn'],
    ['Modo de uso', mode(), secure() || isNative() ? '' : 'bad'],
    ['Aplicación sin conexión', sw, sw === 'Activo' ? '' : 'warn'],
    ['Recursos OCR', ocr ? 'Disponibles sin conexión' : 'Pendientes (requieren internet la primera vez)', ocr ? '' : 'warn'],
    ['Reconocimiento en línea', onOK ? (navigator.onLine ? 'Activo (OCR.space)' : 'Configurado; sin conexión se usa el OCR local') : 'No configurado (solo OCR local)', onOK ? '' : 'warn'],
    ['Registros guardados', n == null ? 'No disponible' : String(n), n == null ? 'bad' : ''],
    ['Almacenamiento usado', est ? `${fmtBytes(est.usage)} de ${fmtBytes(est.quota)}` : 'No informado por el navegador', ''],
    ['Almacenamiento persistente', persisted ? 'Concedido' : 'No concedido (el navegador podría liberar datos si falta espacio)', persisted ? '' : 'warn'],
  ];
  $('#cf-status').replaceChildren(...rows.map(([k, v, c]) => h('div', {}, h('dt', {}, k), h('dd', {}, h('span', { class: 'chip ' + c }, v)))));
  $('#home-status')?.replaceChildren(h('div', { class: 'row', style: 'margin:0' },
    h('span', { class: 'chip' + (navigator.onLine ? '' : ' off') }, navigator.onLine ? 'En línea' : 'Sin conexión'),
    h('span', { class: 'chip' + (ocr ? '' : ' warn') }, ocr ? 'OCR disponible sin conexión' : 'OCR: recursos pendientes'),
    h('span', { class: 'chip' + (sw === 'Activo' ? '' : ' warn') }, sw === 'Activo' ? 'App lista sin conexión' : 'Modo offline: ' + sw.toLowerCase()),
    h('span', { class: 'chip' + (n == null ? ' bad' : '') }, n == null ? 'Almacenamiento no disponible' : `${n} registro(s) guardados`)));
  $('#home-count').textContent = n == null ? '—' : `${n} registro(s)`;
  $('#cf-ocr').hidden = ocr; $('#cf-persist').hidden = !!persisted || !navigator.storage?.persist;
  $('#cf-install-btn').hidden = !installEvt;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  $('#cf-install').replaceChildren(h('p', {}, isNative() ? (nativePlatform() === 'ios' ? 'Está usando la app para iPhone / iPad instalada desde el computador: todo funciona sin conexión. Con un Apple ID gratuito la firma vence cada 7 días: vuelva a instalarla encima con el mismo programa (sin borrarla) y conservará sus registros.' : 'Está usando la app Android instalada: todo funciona sin conexión. Para actualizarla, instale el APK nuevo encima (sin desinstalar) y conservará sus registros.')
    : standalone() ? 'La aplicación ya está instalada en este dispositivo.'
    : location.protocol === 'file:' ? 'Un archivo HTML local no puede instalarse ni trabajar sin conexión. Publique la carpeta en un sitio HTTPS (vea README).'
    : !secure() ? 'Para instalarla y usarla sin conexión, la aplicación debe abrirse desde una dirección HTTPS.'
    : ios ? 'iPhone / iPad: abra esta página en Safari, toque Compartir (cuadro con flecha) y elija «Agregar a pantalla de inicio». No requiere App Store ni cuenta de desarrollador.'
    : 'Android / computador: use el botón «Instalar aplicación» o el menú del navegador (⋮) → «Instalar aplicación» / «Agregar a pantalla principal».'));
  $('#cf-about').textContent = `FARMA-ETIQUETA ${APP_VERSION}. Herramienta de apoyo para identificación y rotulado; no es un sistema de validación sanitaria. OCR: Tesseract.js 7 · PDF: jsPDF 4 · Word: docx 9 · Dibujo de barras en rótulos: JsBarcode 3.`;
}

async function prepareOCR() {
  const btn = $('#cf-ocr'), p = $('#cf-progress');
  if (!secure()) { toast('El modo sin conexión requiere abrir la aplicación desde HTTPS.', 'warn'); return; }
  btn.disabled = true; p.hidden = false;
  const show = (t, f) => { p.querySelector('span').textContent = t; p.querySelector('i').style.width = Math.round((f ?? .5) * 100) + '%'; };
  try {
    show('Esperando al servicio sin conexión…', .05);
    await navigator.serviceWorker.ready;
    // Se inicia el motor real: descarga exactamente lo que este dispositivo necesita y el service worker lo guarda.
    await initOCR((t) => show(t, .5));
    const cache = await caches.open('fe-ocr-v1');
    for (const u of OCR_BASE) if (!(await caches.match(new URL(u, document.baseURI).href))) await cache.add(u);
    show('Verificando…', .95);
    if (await ocrOffline()) toast('OCR listo para trabajar sin conexión.', 'ok');
    else toast('Los recursos se descargaron, pero no pudieron guardarse para uso sin conexión.', 'warn', 6000);
  } catch (e) { toast('No se pudieron preparar los recursos OCR: ' + errMsg(e), 'err', 7000); }
  finally { btn.disabled = false; p.hidden = true; refreshStatus(); }
}

export async function registerSW() {
  if (isNative() || !secure()) return;
  try {
    swReg = await navigator.serviceWorker.register('sw.js');
    const offer = w => { if (w && navigator.serviceWorker.controller) { $('#update-banner').hidden = false; $('#update-now').onclick = () => w.postMessage('skipWaiting'); } };
    if (swReg.waiting) offer(swReg.waiting);
    swReg.addEventListener('updatefound', () => { const w = swReg.installing; w?.addEventListener('statechange', () => { if (w.state === 'installed') offer(w); refreshStatus(); }); });
    let reloaded = false;
    const had = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (had && !reloaded) { reloaded = true; location.reload(); } else refreshStatus(); });
  } catch (e) { console.warn('Service worker no registrado:', e); }
}

export function initSettings() {
  addEventListener('online', refreshStatus); addEventListener('offline', refreshStatus);
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; refreshStatus(); });
  addEventListener('appinstalled', () => { installEvt = null; refreshStatus(); });
  $('#cf-install-btn').addEventListener('click', async () => { if (!installEvt) return; installEvt.prompt(); await installEvt.userChoice.catch(() => {}); installEvt = null; refreshStatus(); });
  $('#cf-ocr').addEventListener('click', prepareOCR);
  // Llenado automático (activo por defecto)
  db.kvGet('autoFill').then(v => { $('#cf-autofill').checked = v !== false; }).catch(() => { $('#cf-autofill').checked = true; });
  $('#cf-autofill').addEventListener('change', async e => { await db.kvSet('autoFill', e.target.checked).catch(() => {}); toast(e.target.checked ? 'Al elegir una foto, el formulario se llenará solo.' : 'Llenado automático desactivado.', 'ok'); });
  // Reconocimiento en línea
  db.kvGet('onlineOcr').then(o => { $('#on-key').value = o?.key || ''; $('#on-enabled').checked = !!o?.enabled; }).catch(() => {});
  const saveOnline = async () => {
    const key = $('#on-key').value.trim(), enabled = $('#on-enabled').checked;
    if (enabled && !key) { toast('Pegue primero la clave para poder activar el servicio en línea.', 'warn'); $('#on-enabled').checked = false; return false; }
    await db.kvSet('onlineOcr', { key, enabled });
    refreshStatus(); return true;
  };
  $('#on-save').addEventListener('click', async () => { if (await saveOnline()) toast($('#on-enabled').checked ? 'Servicio en línea activado: con internet las fotos se leerán con OCR.space.' : 'Guardado. El servicio en línea está desactivado.', 'ok', 5000); });
  $('#on-test').addEventListener('click', async e => {
    const key = $('#on-key').value.trim();
    if (!key) { toast('Pegue primero la clave.', 'warn'); return; }
    if (!navigator.onLine) { toast('Sin conexión: no se puede probar la clave ahora.', 'warn'); return; }
    const c = document.createElement('canvas'); c.width = 600; c.height = 160;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 600, 160); x.fillStyle = '#000'; x.font = 'bold 64px Arial, sans-serif'; x.fillText('PRUEBA 2468', 40, 105);
    e.target.disabled = true;
    try {
      const r = await recognizeOnline(c, key);
      if (/2468/.test(r.text)) { $('#on-enabled').checked = true; await saveOnline(); toast('La clave funciona. Servicio en línea activado.', 'ok', 5000); }
      else toast('El servicio respondió, pero no leyó la imagen de prueba. Intente de nuevo.', 'warn', 6000);
    } catch (err) { toast('No se pudo usar la clave: ' + errMsg(err) + '.', 'err', 7000); }
    finally { e.target.disabled = false; }
  });
  $('#cf-persist').addEventListener('click', async () => {
    const ok = await navigator.storage.persist().catch(() => false);
    toast(ok ? 'Almacenamiento persistente concedido.' : 'El navegador no lo concedió. Suele concederlo cuando la aplicación está instalada; mantenga respaldos periódicos.', ok ? 'ok' : 'warn', 6000);
    refreshStatus();
  });
  $('#cf-update').addEventListener('click', async () => {
    if (isNative()) { toast(nativePlatform() === 'ios' ? 'La app se actualiza instalando el .ipa de la versión nueva desde el computador.' : 'La app Android se actualiza instalando el APK de la versión nueva.', ''); return; }
    if (!swReg) { toast('Las actualizaciones automáticas requieren HTTPS.', 'warn'); return; }
    try { await swReg.update(); toast(swReg.waiting || swReg.installing ? 'Nueva versión encontrada.' : 'Ya tiene la versión más reciente.', 'ok'); }
    catch { toast('No se pudo buscar actualizaciones (¿sin conexión?).', 'warn'); }
  });
  $('#cf-wipe').addEventListener('click', async () => {
    const n = await db.countRecords().catch(() => 0);
    if (!n) { toast('No hay registros que borrar.', 'warn'); return; }
    if (!(await confirmDlg('Borrar todos los registros', `Se eliminarán ${n} registro(s) y todas sus fotografías de este dispositivo. Si no tiene un respaldo, no podrá recuperarlos.`, 'Continuar', true))) return;
    if (!(await confirmDlg('Confirmación final', 'Esta acción es definitiva. ¿Borrar todo?', 'Borrar todo', true))) return;
    try { await db.wipe(); toast('Todos los registros fueron eliminados.', 'ok'); document.dispatchEvent(new CustomEvent('fe:changed')); }
    catch (e) { toast('No se pudo borrar: ' + errMsg(e), 'err'); }
  });
  document.addEventListener('fe:changed', refreshStatus);
  navigator.storage?.persist?.().catch(() => {});   // solicitud silenciosa; no afecta si el navegador la rechaza
}
