// OCR con Tesseract.js (español + inglés). Todos los recursos son locales (vendor/tesseract):
// biblioteca, worker, núcleo WASM y datos de idioma. No se consulta ningún servicio externo.
import { loadScript } from './ui.js';

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
    const w = await Tesseract.createWorker(['spa', 'eng'], 1, {
      workerPath: abs('vendor/tesseract/worker.min.js'),
      corePath: abs('vendor/tesseract/core'),
      langPath: abs('vendor/tesseract/lang'),
      gzip: true, workerBlobURL: false,
      logger: m => onProgress(STEP[m.status] || 'Procesando…', m.status === 'recognizing text' ? m.progress : null),
      errorHandler: () => {},
    });
    worker = w;
    return w;
  })().catch(e => {
    throw new Error('No se pudo iniciar el OCR. ' + (navigator.onLine ? '' : 'Está sin conexión y los recursos OCR aún no se han guardado en este dispositivo. ') + (e?.message || e || ''));
  }).finally(() => { starting = null; });
}

// Devuelve {text, confidence, lines:[{text, conf, height}]}
// sparse=true usa segmentación de «texto disperso»: recupera textos sueltos (lote, fecha) junto a códigos de barras o gráficos.
export async function recognize(canvas, progress = () => {}, sparse = false) {
  const w = await initOCR(progress);
  try {
    await w.setParameters({ tessedit_pageseg_mode: sparse ? '11' : '3', user_defined_dpi: '300' });
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
