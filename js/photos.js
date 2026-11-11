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
