// Lectura de códigos de barras desde una fotografía (sin cámara en vivo).
// 1) BarcodeDetector nativo cuando existe · 2) ZXing (WebAssembly, local) como alternativa siempre disponible.
// El valor devuelto es exactamente el decodificado: no se completa ni corrige ningún dígito.
import { loadScript } from './ui.js';
import { blobToCanvas, freeCanvas } from './photos.js';

const NATIVE = { ean_13: 'EAN-13', ean_8: 'EAN-8', upc_a: 'UPC-A', upc_e: 'UPC-E', code_128: 'Code 128', code_39: 'Code 39', itf: 'ITF' };
const ZX_FORMATS = ['EAN13', 'EAN8', 'UPCA', 'UPCE', 'Code128', 'Code39', 'ITF'];
const ZX_LABEL = { EAN13: 'EAN-13', 'EAN-13': 'EAN-13', EAN8: 'EAN-8', 'EAN-8': 'EAN-8', UPCA: 'UPC-A', 'UPC-A': 'UPC-A', UPCE: 'UPC-E', 'UPC-E': 'UPC-E', Code128: 'Code 128', Code39: 'Code 39', ITF: 'ITF' };

async function tryNative(canvas) {
  if (!('BarcodeDetector' in self)) return null;
  try {
    const sup = await BarcodeDetector.getSupportedFormats();
    const formats = Object.keys(NATIVE).filter(f => sup.includes(f));
    if (!formats.length) return null;
    const found = await new BarcodeDetector({ formats }).detect(canvas);
    const hit = found.find(f => f.rawValue);
    return hit ? { value: hit.rawValue, format: NATIVE[hit.format] || hit.format, engine: 'BarcodeDetector' } : null;
  } catch { return null; }
}

let zxReady = null;
function zxing() {
  return zxReady ||= loadScript('vendor/zxing/zxing-reader.js').then(async () => {
    const base = new URL('vendor/zxing/', document.baseURI).href;
    await ZXingWASM.prepareZXingModule({ overrides: { locateFile: p => base + p }, fireImmediately: true });
    return ZXingWASM;
  }).catch(e => { zxReady = null; throw e; });
}

async function tryZXing(canvas) {
  const zx = await zxing();
  const img = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, canvas.width, canvas.height);
  const res = await zx.readBarcodes(img, { formats: ZX_FORMATS, tryHarder: true, tryRotate: true, tryInvert: true, tryDownscale: true, tryDenoise: true, maxNumberOfSymbols: 1 });
  const hit = res.find(r => r.isValid !== false && r.text);
  return hit ? { value: hit.text, format: ZX_LABEL[hit.format] || String(hit.format), engine: 'ZXing' } : null;
}

// Variantes de la imagen para reintentar: contraste, giro y escala.
function variant(src, kind) {
  const c = document.createElement('canvas');
  const rot = kind === 'rot';
  const k = kind === 'up' ? 2 : kind === 'down' ? 0.5 : 1;
  c.width = Math.round((rot ? src.height : src.width) * k);
  c.height = Math.round((rot ? src.width : src.height) * k);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (rot) { ctx.translate(c.width, 0); ctx.rotate(Math.PI / 2); ctx.drawImage(src, 0, 0); }
  else ctx.drawImage(src, 0, 0, c.width, c.height);
  if (kind === 'contrast') {
    const d = ctx.getImageData(0, 0, c.width, c.height), p = d.data;
    let lo = 255, hi = 0;
    for (let i = 0; i < p.length; i += 16) { const g = (p[i] * 3 + p[i + 1] * 6 + p[i + 2]) / 10; if (g < lo) lo = g; if (g > hi) hi = g; }
    const s = 255 / Math.max(1, hi - lo);
    for (let i = 0; i < p.length; i += 4) { const g = Math.max(0, Math.min(255, ((p[i] * 3 + p[i + 1] * 6 + p[i + 2]) / 10 - lo) * s)); p[i] = p[i + 1] = p[i + 2] = g; }
    ctx.putImageData(d, 0, 0);
  }
  return c;
}

// Devuelve {value, format, engine} o null si no se detecta ningún código.
export async function readBarcode(blob, progress = () => {}) {
  const base = await blobToCanvas(blob, 2200);
  try {
    progress('Buscando código de barras…', .15);
    let r = await tryNative(base);
    if (r) return r;
    let zxErr = null;
    const kinds = ['orig', 'contrast', 'rot', base.width < 1300 ? 'up' : 'down'];
    for (let i = 0; i < kinds.length; i++) {
      progress(i ? 'Reintentando con otro ajuste de imagen…' : 'Decodificando…', .25 + i * .18);
      const c = kinds[i] === 'orig' ? base : variant(base, kinds[i]);
      try { r = await tryZXing(c); } catch (e) { zxErr = e; break; } finally { if (c !== base) freeCanvas(c); }
      if (r) return r;
    }
    if (zxErr) throw new Error('El lector de códigos no pudo iniciarse: ' + zxErr.message);
    return null;
  } finally { freeCanvas(base); }
}

// Comprueba el dígito de control GTIN (solo informativo; nunca altera el código).
export function gtinCheck(code) {
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(code)) return null;
  const d = [...code].map(Number), chk = d.pop();
  const sum = d.reverse().reduce((a, n, i) => a + n * (i % 2 ? 1 : 3), 0);
  return (10 - sum % 10) % 10 === chk;
}
