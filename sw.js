// Service worker de FARMA-ETIQUETA.
// - Guarda la aplicación para abrirla sin conexión.
// - Guarda los recursos OCR la primera vez que se usan (caché separada que NO se borra al actualizar).
// - Nunca toca IndexedDB: actualizar la aplicación no elimina registros ni fotografías.
// Para publicar una versión nueva, cambie VERSION.
const VERSION = '1.20.3';
const SHELL = 'fe-shell-' + VERSION;
const OCR = 'fe-ocr-v2';
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/app.js', 'js/ui.js', 'js/db.js', 'js/photos.js', 'js/ocr.js', 'js/extract.js', 'js/form.js', 'js/live.js', 'js/boxes.js', 'js/relief.js', 'js/tiles.js', 'js/glyphs.js', 'js/verify.js', 'js/ai.js', 'js/perf.js', 'js/barcode.js',
  'js/history.js', 'js/labels.js', 'js/labelsview.js', 'js/backup.js', 'js/settings.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  'vendor/lib/JsBarcode.all.min.js', 'vendor/lib/jspdf.umd.min.js', 'vendor/lib/docx.iife.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if ((k.startsWith('fe-shell-') && k !== SHELL) || k === 'fe-ocr-v1') await caches.delete(k);   // fe-ocr-v1: modelos OCR anteriores (más lentos)
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith((async () => {
    const isOCR = url.pathname.includes('/vendor/tesseract/');
    const hit = await caches.match(req, { ignoreSearch: req.mode === 'navigate' }) || (req.mode === 'navigate' && await caches.match('index.html'));
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok && res.type === 'basic') { const copy = res.clone(); e.waitUntil(caches.open(isOCR ? OCR : SHELL).then(c => c.put(req, copy)).catch(() => {})); }
      return res;
    } catch (err) {
      return new Response('Sin conexión y recurso no guardado.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  })());
});
