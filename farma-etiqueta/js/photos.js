// Lectura segura de fotografías: validación, orientación EXIF, redimensionado y compresión.
const MAX_BYTES = 30 * 1024 * 1024;
const MAX_SIDE = 1800;   // lado mayor de la fotografía guardada
const QUALITY = 0.82;

async function sniff(file) {
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return 'image/png';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  return null;
}

// Decodifica respetando la orientación EXIF (createImageBitmap) con alternativa mediante <img>.
async function decode(blob) {
  if ('createImageBitmap' in self) {
    try { return await createImageBitmap(blob, { imageOrientation: 'from-image' }); } catch { /* alternativa abajo */ }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('decode')); img.src = url; });
    return img; // los navegadores actuales aplican EXIF al dibujar <img> en canvas
  } finally { URL.revokeObjectURL(url); }
}

export function toCanvas(src, maxSide) {
  const w0 = src.width || src.naturalWidth, h0 = src.height || src.naturalHeight;
  const k = Math.min(1, maxSide / Math.max(w0, h0));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w0 * k)); c.height = Math.max(1, Math.round(h0 * k));
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, c.width, c.height);
  return c;
}
const toBlob = (c, type, q) => new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('No se pudo comprimir la imagen.')), type, q));
export const freeCanvas = c => { if (c) { c.width = c.height = 0; } };

// Procesa el archivo elegido por el usuario. Devuelve {blob, w, h, thumb, original}.
export async function processFile(file, progress = () => {}) {
  if (!file) throw new Error('No se seleccionó ningún archivo.');
  if (file.size === 0) throw new Error('El archivo está vacío.');
  if (file.size > MAX_BYTES) throw new Error('La fotografía supera 30 MB. Elija una imagen más liviana.');
  progress('Verificando el archivo…', .1);
  const type = await sniff(file).catch(() => { throw new Error('No se pudo leer el archivo. Verifique que siga disponible en el dispositivo.'); });
  if (!type) throw new Error('Formato no admitido. Use una fotografía JPG, PNG o WEBP' + (/hei[cf]/i.test(file.type + file.name) ? ' (las fotos HEIC deben convertirse primero).' : '.'));
  progress('Leyendo la fotografía…', .35);
  let src;
  try { src = await decode(file); }
  catch { throw new Error('La fotografía está dañada o no se puede abrir. Elija otra imagen.'); }
  let canvas;
  try {
    progress('Ajustando tamaño y orientación…', .6);
    canvas = toCanvas(src, MAX_SIDE);
    progress('Comprimiendo…', .8);
    const blob = await toBlob(canvas, 'image/jpeg', QUALITY);
    const tc = toCanvas(canvas, 144);
    const thumb = tc.toDataURL('image/jpeg', 0.7);
    freeCanvas(tc);
    progress('Lista', 1);
    return { blob, w: canvas.width, h: canvas.height, thumb, original: file.size };
  } finally {
    src.close?.();
    freeCanvas(canvas);
  }
}

// Convierte la fotografía guardada en un canvas para OCR / lectura de códigos.
export async function blobToCanvas(blob, maxSide = 2200) {
  const src = await decode(blob);
  try { return toCanvas(src, maxSide); } finally { src.close?.(); }
}

// Forma de guardado en IndexedDB: bytes reales (ArrayBuffer), nunca una URL temporal.
export const toStored = async p => ({ type: p.blob.type, data: await p.blob.arrayBuffer(), w: p.w, h: p.h });
export const fromStored = s => s ? { blob: new Blob([s.data], { type: s.type || 'image/jpeg' }), w: s.w, h: s.h } : null;

// Realce para una lectura adicional: binarización adaptativa (compensa sombras y brillos) y engrosado leve del trazo,
// que une los puntos de las impresiones por inyección (lote y fechas). Devuelve un canvas nuevo.
export function enhance(src, maxSide = 2400) {
  const c = toCanvas(src, maxSide), w = c.width, h = c.height;
  const ctx = c.getContext('2d', { willReadFrequently: true }), img = ctx.getImageData(0, 0, w, h), p = img.data;
  const g = new Uint8Array(w * h), W1 = w + 1, integ = new Uint32Array(W1 * (h + 1));
  for (let y = 0, i = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++, i++) { const v = (p[i * 4] * 3 + p[i * 4 + 1] * 6 + p[i * 4 + 2]) / 10 | 0; g[i] = v; row += v; integ[(y + 1) * W1 + x + 1] = integ[y * W1 + x + 1] + row; }
  }
  const r = Math.max(8, Math.round(Math.min(w, h) / 40)), dark = new Uint8Array(w * h);
  for (let y = 0, i = 0; y < h; y++) {
    const y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1);
    for (let x = 0; x < w; x++, i++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1);
      const sum = integ[y1 * W1 + x1] - integ[y0 * W1 + x1] - integ[y1 * W1 + x0] + integ[y0 * W1 + x0];
      if (g[i] * (x1 - x0) * (y1 - y0) < sum * 0.80) dark[i] = 1;
    }
  }
  for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i++) {
    const d = dark[i] || (x > 0 && dark[i - 1]) || (x < w - 1 && dark[i + 1]) || (y > 0 && dark[i - w]) || (y < h - 1 && dark[i + w]);
    const v = d ? 0 : 255; p[i * 4] = p[i * 4 + 1] = p[i * 4 + 2] = v; p[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
