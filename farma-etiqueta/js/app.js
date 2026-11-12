// Arranque, navegación y manejo global de errores. Cada módulo se inicia por separado:
// si uno falla (p. ej. OCR), el almacenamiento, el historial y la impresión siguen funcionando.
import { $, $$, toast, errMsg } from './ui.js';
import * as db from './db.js';
import { initForm, newRecord, restoreDraft } from './form.js';
import { warmOCR } from './ocr.js';
import { initHistory, refreshHistory } from './history.js';
import { initLabels, showLabels } from './labelsview.js';
import { initBackup, refreshBackup } from './backup.js';
import { initSettings, refreshStatus, registerSW } from './settings.js';
import { initServices, refreshServices } from './services.js';

const VIEWS = ['inicio', 'registrar', 'historial', 'rotulos', 'servicios', 'respaldo', 'config'];
const ENTER = { inicio: refreshStatus, historial: refreshHistory, rotulos: showLabels, servicios: refreshServices, respaldo: refreshBackup, config: refreshStatus };

window.addEventListener('error', e => { console.error(e.error || e.message); toast('Ocurrió un error inesperado: ' + (e.message || 'desconocido') + '. Sus registros guardados no se ven afectados.', 'err', 7000); });
window.addEventListener('unhandledrejection', e => { console.error(e.reason); toast('Ocurrió un error: ' + errMsg(e.reason), 'err', 7000); });

function route() {
  const v = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'inicio';
  for (const n of VIEWS) $('#v-' + n).hidden = n !== v;
  $$('.tabbar a').forEach(a => { const on = a.dataset.tab === v; a.classList.toggle('active', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); });
  window.scrollTo(0, 0);
  try { ENTER[v]?.(); } catch (e) { toast(errMsg(e), 'err'); }
}

async function start() {
  const safe = (name, fn) => { try { return fn(); } catch (e) { console.error(name, e); toast(`El módulo «${name}» no pudo iniciarse: ${errMsg(e)}`, 'err', 7000); } };
  safe('formulario', initForm); safe('historial', initHistory); safe('respaldo', initBackup); safe('configuración', initSettings); safe('servicios', initServices);
  try { await db.open(); }
  catch (e) { const w = $('#file-warning'); w.hidden = false; w.textContent = 'No se puede guardar información en este navegador: ' + errMsg(e); }
  await Promise.resolve(safe('rótulos', initLabels)).catch(e => toast(errMsg(e), 'err'));
  $$('a[data-new]').forEach(a => a.addEventListener('click', async e => { e.preventDefault(); if (await newRecord()) location.hash = '#registrar'; }));
  window.addEventListener('hashchange', route);
  const restored = await restoreDraft().catch(() => false);
  if (restored) location.hash = '#registrar';
  route();
  registerSW();
  refreshStatus(); refreshBackup();
  setTimeout(warmOCR, 1500);   // motor OCR listo antes de elegir la primera foto
}
start();
