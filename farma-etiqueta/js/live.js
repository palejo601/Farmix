// Escáner en vivo: cámara trasera + recuadro guía. Solo se lee lo que está dentro del recuadro (rápido) y un dato se
// da por seguro cuando se lee igual en varias imágenes seguidas. Todo se procesa en el teléfono; nada sale del dispositivo.
// La cámara solo se enciende cuando el usuario pulsa «Escanear en vivo» y se apaga al cerrar.
import { h, toast, errMsg } from './ui.js';
import { recognize } from './ocr.js';
import { extractFields, extractZone } from './extract.js';

const NEED = 2;   // lecturas iguales necesarias para dar un dato por seguro
const NAMES = { nombre: 'Nombre', principioActivo: 'Principio activo', concentracion: 'Concentración', formaFarmaceutica: 'Forma', presentacion: 'Presentación',
  laboratorio: 'Laboratorio', registroSanitario: 'Registro', lote: 'Lote', fechaFabricacion: 'Fabricación', vencimiento: 'Vencimiento' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

function cameraError(e) {
  const n = e?.name || '';
  if (n === 'NotAllowedError' || n === 'SecurityError') return 'No hay permiso para usar la cámara. Actívelo en los ajustes del teléfono (Aplicaciones › FARMA-ETIQUETA › Permisos › Cámara) o en el candado del navegador.';
  if (n === 'NotFoundError' || n === 'OverconstrainedError') return 'No se encontró una cámara en este dispositivo.';
  if (n === 'NotReadableError') return 'La cámara está siendo usada por otra aplicación. Ciérrela e intente de nuevo.';
  return 'No se pudo abrir la cámara: ' + errMsg(e);
}

// Devuelve { values: {campo: valor}, photo: Blob|null } o null si se cancela.
export async function liveScan() {
  if (!navigator.mediaDevices?.getUserMedia) { toast(isSecureContext ? 'Este navegador no permite usar la cámara en vivo. Use «Elegir de la galería».' : 'La cámara en vivo requiere abrir la app por HTTPS o instalarla.', 'err', 7000); return null; }
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } }); }
  catch (e) { toast(cameraError(e), 'err', 8000); return null; }
  const track = stream.getVideoTracks()[0];
  const video = h('video', { autoplay: true, muted: true, playsinline: true, 'aria-label': 'Imagen de la cámara' });
  video.muted = true; video.setAttribute('playsinline', ''); video.srcObject = stream;
  const guide = h('div', { class: 'live-guide' }, h('span', {}, 'Ponga aquí el nombre, el lote o las fechas'));
  const status = h('p', { class: 'live-status', role: 'status' }, 'Preparando la lectura…');
  const list = h('div', { class: 'live-list' });
  const torchBtn = h('button', { type: 'button', class: 'btn', hidden: true }, 'Linterna');
  const useBtn = h('button', { type: 'button', class: 'btn primary', disabled: true }, 'Usar datos');
  const closeBtn = h('button', { type: 'button', class: 'btn' }, 'Cerrar');
  const root = h('div', { class: 'live', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Escáner en vivo' },
    h('div', { class: 'live-view' }, video, guide), status, list, h('div', { class: 'live-actions' }, closeBtn, torchBtn, useBtn));
  document.body.append(root); document.body.classList.add('no-scroll');
  try { await video.play(); } catch { /* algunos navegadores ya lo reproducen solos */ }

  let torch = false;
  try { if (track.getCapabilities?.().torch) torchBtn.hidden = false; } catch { /* sin linterna */ }
  torchBtn.onclick = async () => { try { torch = !torch; await track.applyConstraints({ advanced: [{ torch }] }); torchBtn.classList.toggle('primary', torch); } catch { toast('No se pudo encender la linterna.', 'warn'); } };

  const votes = {}, best = {};
  const render = () => {
    const sure = Object.keys(best).filter(f => best[f].n >= NEED);
    list.replaceChildren(...Object.keys(NAMES).filter(f => best[f]).map(f =>
      h('span', { class: 'chip' + (best[f].n >= NEED ? ' ok' : ' warn') }, `${best[f].n >= NEED ? '✓' : '…'} ${NAMES[f]}: ${best[f].v}`)));
    useBtn.disabled = !sure.length; useBtn.textContent = sure.length ? `Usar ${sure.length} dato(s)` : 'Usar datos';
    const falta = ['nombre', 'lote', 'vencimiento'].filter(f => !(best[f]?.n >= NEED)).map(f => NAMES[f].toLowerCase());
    status.textContent = falta.length ? `Leyendo… falta: ${falta.join(', ')}. Acerque esa parte al recuadro, sin reflejos.` : 'Listo: nombre, lote y vencimiento leídos. Pulse «Usar datos».';
  };
  const vote = (f, v) => {
    if (!v) return;
    const k = (votes[f] ||= {}); k[v] = (k[v] || 0) + 1;
    const was = best[f]?.n >= NEED;
    if (!best[f] || k[v] >= best[f].n) best[f] = { v, n: k[v] };
    if (!was && best[f].n >= NEED && ['lote', 'vencimiento'].includes(f)) navigator.vibrate?.(60);
  };

  // Recorta del video lo que se ve dentro del recuadro (el video se muestra recortado para llenar la pantalla).
  const crop = () => {
    const vw = video.videoWidth, vh = video.videoHeight; if (!vw || !vh) return null;
    const vb = video.getBoundingClientRect(), gb = guide.getBoundingClientRect();
    const s = Math.max(vb.width / vw, vb.height / vh), ox = (vb.width - vw * s) / 2, oy = (vb.height - vh * s) / 2;
    const sx = Math.max(0, (gb.left - vb.left - ox) / s), sy = Math.max(0, (gb.top - vb.top - oy) / s);
    const sw = Math.min(vw - sx, gb.width / s), sh = Math.min(vh - sy, gb.height / s);
    const k = Math.min(2.5, 1400 / sw), c = document.createElement('canvas');
    c.width = Math.round(sw * k); c.height = Math.round(sh * k);
    const x = c.getContext('2d', { willReadFrequently: true }); x.filter = 'grayscale(1) contrast(1.25)';
    x.drawImage(video, sx, sy, sw, sh, 0, 0, c.width, c.height);
    return c;
  };
  const frame = () => new Promise(res => {
    const c = document.createElement('canvas'); c.width = video.videoWidth; c.height = video.videoHeight;
    c.getContext('2d').drawImage(video, 0, 0); c.toBlob(b => { c.width = c.height = 0; res(b); }, 'image/jpeg', 0.9);
  });

  let open = true, n = 0;
  const loop = (async () => {
    while (open) {
      if (document.hidden || video.readyState < 2) { await sleep(250); continue; }
      const c = crop(); if (!c) { await sleep(200); continue; }
      try {
        const r = await recognize(c, () => {}, n++ % 2 ? '11' : '6');   // alterna bloque y texto disperso
        if (!open) break;
        for (const f of extractFields(r.lines).fields) if (!f.doubt && (f.conf == null || f.conf >= 55)) vote(f.field, f.value);
        const z = extractZone(r.lines);
        for (const f of ['lote', 'fechaFabricacion', 'vencimiento']) if (z[f]?.labelled) vote(f, z[f].value);
        render();
      } catch (e) { status.textContent = 'Error de lectura: ' + errMsg(e); await sleep(800); }
      finally { c.width = c.height = 0; }
    }
  })();

  const result = await new Promise(res => {
    closeBtn.onclick = () => res(null);
    useBtn.onclick = async () => {
      useBtn.disabled = true;
      const values = Object.fromEntries(Object.keys(best).filter(f => best[f].n >= NEED).map(f => [f, best[f].v]));
      let photo = null; try { photo = await frame(); } catch { /* sin foto: se usan solo los datos */ }
      res({ values, photo });
    };
  });
  open = false;
  track.stop(); stream.getTracks().forEach(t => t.stop()); video.srcObject = null;
  root.remove(); document.body.classList.remove('no-scroll');
  await loop.catch(() => {});
  return result;
}
