// Escáner en vivo: cámara trasera + recuadro guía. Solo se lee lo que está dentro del recuadro (rápido) y un dato se
// da por seguro cuando se lee igual en varias imágenes seguidas. Todo se procesa en el teléfono; nada sale del dispositivo.
// La cámara solo se enciende cuando el usuario pulsa «Escanear en vivo» y se apaga al cerrar.
import { h, toast, errMsg } from './ui.js';
import { recognize, nativeOcrEngine } from './ocr.js';
import { extractFields, extractZone } from './extract.js';
import { readBoxes } from './boxes.js';
import { aiReady, aiConfig, aiReadLotDates } from './ai.js';
import { monthToNumber } from './extract.js';
import { fixLotLines } from './glyphs.js';
import { LOW } from './perf.js';
import { readBarcodes, parseGS1 } from './barcode.js';

const NEED = 2;   // lecturas iguales necesarias para dar un dato por seguro (lote y fechas: 3, y sin otra lectura que compita)
const need = f => ['lote', 'fechaFabricacion', 'vencimiento'].includes(f) ? 3 : NEED;
const NAMES = { codigoBarras: 'Código de barras', nombre: 'Nombre', principioActivo: 'Principio activo', concentracion: 'Concentración', formaFarmaceutica: 'Forma', presentacion: 'Presentación',
  laboratorio: 'Laboratorio', registroSanitario: 'Registro', lote: 'Lote', fechaFabricacion: 'Fabricación', vencimiento: 'Vencimiento' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

function cameraError(e) {
  const n = e?.name || '';
  if (n === 'NotAllowedError' || n === 'SecurityError') return 'No hay permiso para usar la cámara. Actívelo en los ajustes del teléfono (Aplicaciones › FARMA-ETIQUETA › Permisos › Cámara) o en el candado del navegador.';
  if (n === 'NotFoundError' || n === 'OverconstrainedError') return 'No se encontró una cámara en este dispositivo.';
  if (n === 'NotReadableError') return 'La cámara está siendo usada por otra aplicación. Ciérrela e intente de nuevo.';
  return 'No se pudo abrir la cámara: ' + errMsg(e);
}

// Devuelve { values: {campo: valor}, photo: Blob|null, read: bool } o null si se cancela.
// read=true: el usuario pidió «Tomar foto y leer»: la foto se analiza completa como si viniera de la galería.
// lotMode: modo «escanear lote»: recuadro pequeño solo para el bloque de lote y fechas, más resolución de cámara,
// termina solo cuando lote y vencimiento quedan confirmados y, si no lo logra en 6 s, consulta una vez a la IA con ese recorte.
export async function liveScan({ lotMode = false } = {}) {
  if (!navigator.mediaDevices?.getUserMedia) { toast(isSecureContext ? 'Este navegador no permite usar la cámara en vivo. Use «Elegir de la galería».' : 'La cámara en vivo requiere abrir la app por HTTPS o instalarla.', 'err', 7000); return null; }
  let stream;
  const res = lotMode && !LOW ? { width: { ideal: 2560 }, height: { ideal: 1440 } } : { width: { ideal: 1920 }, height: { ideal: 1080 } };
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, ...res, advanced: [{ focusMode: 'continuous' }] } }); }
  catch (e) { toast(cameraError(e), 'err', 8000); return null; }
  const track = stream.getVideoTracks()[0];
  const video = h('video', { autoplay: true, muted: true, playsinline: true, 'aria-label': 'Imagen de la cámara' });
  video.muted = true; video.setAttribute('playsinline', ''); video.srcObject = stream;
  const guide = h('div', { class: 'live-guide' + (lotMode ? ' lot' : '') }, h('span', {}, lotMode ? 'Encuadre solo el lote y las fechas' : 'Ponga aquí el nombre, el lote o las fechas'));
  const status = h('p', { class: 'live-status', role: 'status' }, 'Preparando la lectura…');
  const raw = h('p', { class: 'live-raw' }, '');
  const list = h('div', { class: 'live-list' });
  const torchBtn = h('button', { type: 'button', class: 'btn', hidden: true }, 'Linterna');
  const useBtn = h('button', { type: 'button', class: 'btn primary', disabled: true }, 'Usar datos');
  const shotBtn = h('button', { type: 'button', class: 'btn' }, 'Tomar foto y leer');
  const closeBtn = h('button', { type: 'button', class: 'btn' }, 'Cerrar');
  const root = h('div', { class: 'live', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Escáner en vivo' },
    h('div', { class: 'live-view' }, video, guide), status, raw, list, h('div', { class: 'live-actions' }, closeBtn, torchBtn, shotBtn, useBtn));
  document.body.append(root); document.body.classList.add('no-scroll');
  try { await video.play(); } catch { /* algunos navegadores ya lo reproducen solos */ }

  try { await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }); } catch { /* sin enfoque continuo */ }
  let torch = false;
  try { if (track.getCapabilities?.().torch) torchBtn.hidden = false; } catch { /* sin linterna */ }
  torchBtn.onclick = async () => { try { torch = !torch; await track.applyConstraints({ advanced: [{ torch }] }); torchBtn.classList.toggle('primary', torch); } catch { toast('No se pudo encender la linterna.', 'warn'); } };

  const votes = {}, best = {};
  let aiBusy = false, aiTried = false, autoDone = false, barFmt = '', barDone = false; const t0 = performance.now();
  // Código de barras: se busca en el cuadro completo, en paralelo con el texto, hasta encontrarlo (lector del teléfono, ~0,1 s).
  const fullFrame = () => { const vw = video.videoWidth, vh = video.videoHeight, k = Math.min(1, 1600 / Math.max(vw, vh)), c = document.createElement('canvas');
    c.width = Math.round(vw * k); c.height = Math.round(vh * k); c.getContext('2d').drawImage(video, 0, 0, c.width, c.height); return c; };
  const barcodePass = async () => {
    if (barDone) return;
    const fc = fullFrame();
    try {
      for (const b of await readBarcodes(fc)) {
        const g = /DataMatrix|QR|Code 128/.test(b.format) ? parseGS1(b.value) : null;
        if (g) {                                  // GS1: GTIN, lote y fechas exactos impresos en el código → seguros de inmediato
          if (g.gtin) { vote('codigoBarras', g.gtin, 9); barFmt = 'EAN-13'; }
          if (g.lote) vote('lote', g.lote, 9); if (g.venc) vote('vencimiento', g.venc, 9); if (g.fab) vote('fechaFabricacion', g.fab, 9);
          barDone = true;
        } else if (/^(EAN|UPC)/.test(b.format) || !best.codigoBarras) { vote('codigoBarras', b.value, 9); barFmt = b.format; if (/^(EAN|UPC)/.test(b.format)) barDone = true; }
      }
    } finally { fc.width = fc.height = 0; }
  };
  // Seguro: leído igual varias veces y al menos el doble que cualquier otra lectura distinta (p. ej. 4B0123 frente a 480123).
  const sure = f => !!best[f] && (best[f].forced || (best[f].n >= need(f) && best[f].n >= 2 * best[f].rival));
  const render = () => {
    const okList = Object.keys(best).filter(f => sure(f));
    // Un dato sin confirmar se puede aceptar tocándolo (si coincide con el empaque).
    list.replaceChildren(...Object.keys(NAMES).filter(f => best[f]).map(f => sure(f)
      ? h('span', { class: 'chip ok' }, `✓ ${NAMES[f]}: ${best[f].v}`)
      : h('button', { type: 'button', class: 'chip warn', title: 'Tocar para aceptar', onclick: () => { best[f].forced = true; render(); } }, `… ${NAMES[f]}: ${best[f].v} (tocar si es correcto)`)));
    useBtn.disabled = !okList.length; useBtn.textContent = okList.length ? `Usar ${okList.length} dato(s)` : 'Usar datos';
    const falta = (lotMode ? ['lote', 'vencimiento'] : ['nombre', 'lote', 'vencimiento']).filter(f => !sure(f)).map(f => NAMES[f].toLowerCase());
    if (aiBusy) return;
    status.textContent = falta.length ? `Leyendo… falta: ${falta.join(', ')}. ${lotMode ? 'Acerque la cámara hasta que el lote llene el recuadro, sin reflejos.' : 'Acerque esa parte al recuadro, sin reflejos.'}` : lotMode ? 'Listo: lote y vencimiento confirmados.' : 'Listo: nombre, lote y vencimiento leídos. Pulse «Usar datos».';
    if (lotMode && !falta.length && !autoDone) { autoDone = true; setTimeout(() => useBtn.click(), 300); }   // termina solo (breve pausa para ver el ✓)
  };
  const vote = (f, v, w = 1) => {
    if (!v) return;
    const k = (votes[f] ||= {}); k[v] = (k[v] || 0) + w;
    const was = sure(f);
    const [top, second = ['', 0]] = Object.entries(k).sort((a, b) => b[1] - a[1]);
    best[f] = { v: top[0], n: top[1], rival: second[1], forced: best[f]?.forced && best[f].v === top[0] };
    if (!was && sure(f) && ['lote', 'vencimiento'].includes(f)) navigator.vibrate?.(60);
  };

  // Recorta del video lo que se ve dentro del recuadro (el video se muestra recortado para llenar la pantalla).
  const crop = (forAI = false) => {
    const vw = video.videoWidth, vh = video.videoHeight; if (!vw || !vh) return null;
    const vb = video.getBoundingClientRect(), gb = guide.getBoundingClientRect();
    const s = Math.max(vb.width / vw, vb.height / vh), ox = (vb.width - vw * s) / 2, oy = (vb.height - vh * s) / 2;
    const sx = Math.max(0, (gb.left - vb.left - ox) / s), sy = Math.max(0, (gb.top - vb.top - oy) / s);
    const sw = Math.min(vw - sx, gb.width / s), sh = Math.min(vh - sy, gb.height / s);
    const k = forAI ? 1 : Math.min(2.5, (LOW ? 1000 : 1400) / sw), c = document.createElement('canvas');
    c.width = Math.round(sw * k); c.height = Math.round(sh * k);
    const x = c.getContext('2d', { willReadFrequently: true }); if (!forAI) x.filter = 'grayscale(1) contrast(1.25)';
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
        const barP = barcodePass().catch(() => {});
        const r = await recognize(c, () => {}, n++ % 2 ? '11' : '6');   // alterna bloque y texto disperso
        await barP;
        if (!open) break;
        fixLotLines(c, r.lines);
        // Lectura muy clara (confianza ≥ 85 %) cuenta doble; con etiqueta (LOTE, VENCE…) cuenta 1; sin etiqueta, media.
        for (const f of extractFields(r.lines).fields) if (!f.doubt && (f.conf == null || f.conf >= 55)) vote(f.field, f.value, f.conf >= 85 ? 2 : 1);
        const z = extractZone(r.lines);
        for (const f of ['lote', 'fechaFabricacion', 'vencimiento']) if (z[f] && (z[f].labelled || f !== 'lote')) vote(f, z[f].value, z[f].labelled ? 1 : 0.5);   // un lote sin etiqueta no se adivina
        // Cada 3 imágenes se buscan casillas L / F / V dentro del recuadro.
        if (n % 3 === 0 && !(await nativeOcrEngine())) for (const f of await readBoxes(c).catch(() => [])) if (!f.doubt) vote(f.field, f.value);
        const txt = r.text.replace(/\s+/g, ' ').trim();
        raw.textContent = txt.length > 2 ? 'Texto visto: ' + txt.slice(0, 140) : 'No se ve texto en el recuadro: acerque la caja (a unos 10–15 cm), espere a que enfoque y evite reflejos.';
        render();
        // Modo lote: si en 6 s no se confirmaron lote y vencimiento, una sola consulta a la IA con el recorte a resolución completa.
        if (lotMode && !aiTried && performance.now() - t0 > 6000 && (!sure('lote') || !sure('vencimiento')) && await aiReady()) {
          aiTried = true; aiBusy = true; status.textContent = 'Consultando al Asistente IA con el recorte ampliado…';
          const ac = crop(true);
          try {
            const blob = await new Promise(r2 => ac.toBlob(r2, 'image/jpeg', 0.92));
            const ai = await aiReadLotDates(blob, (await aiConfig()).key, null);
            for (const f of ['lote', 'fechaFabricacion', 'vencimiento']) {
              const a = ai?.[f]; if (!a?.valor) continue;
              const v = f === 'lote' ? a.valor.trim() : monthToNumber(a.valor.trim());
              // La IA vale 2 lecturas si está segura; coincide con lo del teléfono → queda confirmado.
              vote(f, v, a.certeza === 'alta' ? 2 : 1);
            }
          } catch (e) { toast('Asistente IA: ' + errMsg(e), 'warn', 5000); }
          finally { ac.width = ac.height = 0; aiBusy = false; render(); }
        }
      } catch (e) { status.textContent = 'Error de lectura: ' + errMsg(e); await sleep(800); }
      finally { c.width = c.height = 0; }
    }
  })();

  const result = await new Promise(res => {
    closeBtn.onclick = () => res(null);
    shotBtn.onclick = async () => {
      shotBtn.disabled = true; status.textContent = 'Tomando la foto…';
      let photo = null;
      try { photo = track.getCapabilities && self.ImageCapture ? await new ImageCapture(track).takePhoto() : null; } catch { photo = null; }   // máxima resolución si el teléfono lo permite
      if (!photo) { try { photo = await frame(); } catch { photo = null; } }
      if (!photo) { shotBtn.disabled = false; toast('No se pudo tomar la foto.', 'err'); return; }
      const values = Object.fromEntries(Object.keys(best).filter(f => sure(f)).map(f => [f, best[f].v]));
      res({ values, photo, read: true });
    };
    useBtn.onclick = async () => {
      useBtn.disabled = true;
      const values = Object.fromEntries(Object.keys(best).filter(f => sure(f)).map(f => [f, best[f].v]));
      // Se copia el cuadro actual al instante (sin comprimir) y se cierra: la foto se prepara después, sin hacer esperar.
      let still = null;
      if (!lotMode) { try { still = document.createElement('canvas'); still.width = video.videoWidth; still.height = video.videoHeight; still.getContext('2d').drawImage(video, 0, 0); } catch { still = null; } }
      res({ values, still, formato: barFmt });
    };
  });
  open = false;
  track.stop(); stream.getTracks().forEach(t => t.stop()); video.srcObject = null;
  root.remove(); document.body.classList.remove('no-scroll');
  loop.catch(() => {});        // la lectura en curso termina sola; no se espera para devolver los datos
  return result;
}
