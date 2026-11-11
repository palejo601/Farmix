// OCR con Tesseract.js (español + inglés). Todos los recursos son locales (vendor/tesseract):
// biblioteca, worker, núcleo WASM y datos de idioma. No se consulta ningún servicio externo.
import { loadScript, isNative } from './ui.js';

const abs = p => new URL(p, document.baseURI).href;
export const OCR_BASE = ['vendor/tesseract/tesseract.min.js', 'vendor/tesseract/worker.min.js',
  'vendor/tesseract/lang/spa.traineddata.gz', 'vendor/tesseract/lang/eng.traineddata.gz'];
export const OCR_CORES = ['tesseract-core-relaxedsimd-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js', 'tesseract-core-lstm.wasm.js']
  .map(f => 'vendor/tesseract/core/' + f);

let worker = null, starting = null, onProgress = () => {};
const STEP = { 'loading tesseract core': 'Cargando motor OCR…', 'initializing tesseract': 'Iniciando motor OCR…',
  'loading language traineddata': 'Cargando idiomas (español e inglés)…', 'initializing api': 'Preparando reconocimiento…', 'recognizing text': 'Reconociendo texto…' };

export function initOCR(progress) {
  if (progress) onProgress = progress;
  if (worker) return Promise.resolve(worker);
  return starting ||= (async () => {
    await loadScript('vendor/tesseract/tesseract.min.js');
    // En la app Android el empaquetador descomprime los .gz y les quita la extensión: allí los idiomas son «.traineddata» sin comprimir.
    const native = isNative() && self.Capacitor.getPlatform?.() !== 'ios';   // en iOS los .gz se conservan tal cual
    let timer;
    const create = Tesseract.createWorker(['spa', 'eng'], 1, {
      workerPath: abs('vendor/tesseract/worker.min.js'),
      corePath: abs('vendor/tesseract/core'),
      langPath: abs('vendor/tesseract/lang'),
      gzip: !native, cacheMethod: isNative() ? 'none' : 'write', workerBlobURL: false,
      logger: m => onProgress(STEP[m.status] || 'Procesando…', m.status === 'recognizing text' ? m.progress : null),
    });
    // Nunca se queda esperando indefinidamente: si el motor no arranca, se informa el error.
    const limit = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('El motor OCR tardó demasiado en iniciar (más de 2 minutos).')), 120000); });
    try { worker = await Promise.race([create, limit]); }
    catch (e) { create.then(w => w.terminate()).catch(() => {}); throw e; }
    finally { clearTimeout(timer); }
    return worker;
  })().catch(e => {
    throw new Error('No se pudo iniciar el OCR. ' + (navigator.onLine ? '' : 'Está sin conexión y los recursos OCR aún no se han guardado en este dispositivo. ') + (e?.message || e || ''));
  }).finally(() => { starting = null; });
}

// Devuelve {text, confidence, lines:[{text, conf, height}]}
// sparse también admite un modo de segmentación concreto ('6' = bloque de texto, '7' = un renglón).
// sparse=true usa segmentación de «texto disperso»: recupera textos sueltos (lote, fecha) junto a códigos de barras o gráficos.
let queue = Promise.resolve();
export function recognize(...a) { const run = queue.then(() => recognizeNow(...a)); queue = run.catch(() => {}); return run; }
// Prepara el motor en segundo plano al abrir la app, para que la primera foto no espere su arranque.
export function warmOCR() { initOCR().catch(() => {}); }
async function recognizeNow(canvas, progress = () => {}, sparse = false) {
  const w = await initOCR(progress);
  try {
    await w.setParameters({ tessedit_pageseg_mode: sparse === true ? '11' : sparse || '3', user_defined_dpi: '300' });
    const { data } = await w.recognize(canvas, {}, { text: true, blocks: true });
    const lines = [];
    for (const b of data.blocks || []) for (const p of b.paragraphs || []) for (const l of p.lines || [])
      lines.push({ text: l.text, conf: l.confidence, height: l.bbox ? l.bbox.y1 - l.bbox.y0 : 0 });
    if (!lines.length && data.text) data.text.split('\n').forEach(t => lines.push({ text: t, conf: data.confidence ?? null, height: 0 }));
    return { text: data.text || '', confidence: data.confidence ?? null, lines };
  } catch (e) {
    await resetOCR();
    throw new Error('Falló el reconocimiento de texto: ' + (e?.message || e));
  }
}

export async function resetOCR() { try { await worker?.terminate(); } catch { /* ya terminado */ } worker = null; }

// ---- Reconocimiento en línea (opcional, solo con internet): servicio OCR.space ----
// La fotografía se envía a ese servicio. Requiere la clave gratuita del usuario. El plan gratuito admite archivos de hasta 1 MB.
const ONLINE_URL = 'https://api.ocr.space/parse/image';
const jpeg = (c, q) => new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('No se pudo preparar la imagen.')), 'image/jpeg', q));
function shrink(src, maxSide) {
  const k = Math.min(1, maxSide / Math.max(src.width, src.height)), c = document.createElement('canvas');
  c.width = Math.round(src.width * k); c.height = Math.round(src.height * k);
  const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, c.width, c.height);
  return c;
}
export async function recognizeOnline(canvas, key, progress = () => {}) {
  progress('Preparando la imagen para el servicio en línea…', .1);
  let blob = null;
  for (const [side, q] of [[2400, .85], [2000, .8], [1700, .72], [1400, .65]]) {
    const c = shrink(canvas, side);
    try { blob = await jpeg(c, q); } finally { c.width = c.height = 0; }
    if (blob.size <= 1000000) break;
  }
  const fd = new FormData();
  fd.append('apikey', key); fd.append('language', 'spa'); fd.append('OCREngine', '2');
  fd.append('isOverlayRequired', 'true'); fd.append('scale', 'true'); fd.append('detectOrientation', 'true');
  fd.append('file', blob, 'foto.jpg');
  progress('Enviando la fotografía al servicio en línea…', .4);
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 45000);
  let d;
  try {
    const r = await fetch(ONLINE_URL, { method: 'POST', body: fd, signal: ctl.signal });
    d = await r.json().catch(() => null);
    if (!d) throw new Error('respuesta no válida (código ' + r.status + ')');
  } catch (e) {
    throw new Error(e.name === 'AbortError' ? 'el servicio tardó demasiado en responder' : (e.message || 'sin conexión con el servicio'));
  } finally { clearTimeout(timer); }
  if (typeof d === 'string') throw new Error(/key/i.test(d) ? 'la clave no es válida' : d);
  if (d.error && /not valid|invalid/i.test(d.error)) throw new Error('la clave no es válida');
  if (d.error) throw new Error(/rate limit/i.test(d.error) ? 'se alcanzó el límite de uso de la clave; intente más tarde' : String(d.error).slice(0, 160));
  if (d.IsErroredOnProcessing || !d.ParsedResults?.length) {
    const m = [].concat(d.ErrorMessage || d.ErrorDetails || 'el servicio no pudo procesar la imagen').join(' ');
    throw new Error(/api ?key|invalid/i.test(m) ? 'la clave no es válida' : m.slice(0, 160));
  }
  const pr = d.ParsedResults[0], lines = (pr.TextOverlay?.Lines || []).map(l => ({ text: l.LineText, conf: null, height: l.MaxHeight || 0 }));
  if (!lines.length && pr.ParsedText) pr.ParsedText.split(/\r?\n/).forEach(t => lines.push({ text: t, conf: null, height: 0 }));
  return { text: pr.ParsedText || lines.map(l => l.text).join('\n'), confidence: null, lines, online: true };
}
