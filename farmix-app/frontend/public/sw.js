// Service worker de FARMIX: hace la interfaz instalable y rápida, sin guardar datos de la API.
//
// Estrategias:
// - /api/*: nunca se intercepta ni se guarda (datos privados de cada droguería; en un celular compartido
//   no deben quedar copias, y siempre se quiere el dato más reciente).
// - Navegación (abrir una página): primero la red; si no hay conexión, la página offline.html.
// - /assets/* (archivos con hash en el nombre, no cambian nunca): primero la caché.
// - Otros archivos propios (manifest, íconos): se responde con la caché y se actualiza en segundo plano.
//
// Al cambiar este archivo, suba VERSION para que los navegadores descarten las cachés anteriores.
const VERSION = 'farmix-v1';
const CACHE_BASE = `${VERSION}-base`;
const CACHE_ASSETS = `${VERSION}-assets`;
const MAX_ASSETS = 60;
const BASE = ['/offline.html', '/offline.css', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_BASE).then((c) => c.addAll(BASE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(`${VERSION}-`)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Evita que la caché de assets crezca sin límite con cada despliegue
async function recortar(cache) {
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_ASSETS)).map((k) => cache.delete(k)));
}

async function primeroCache(request) {
  const cache = await caches.open(CACHE_ASSETS);
  const guardado = await cache.match(request);
  if (guardado) return guardado;
  const res = await fetch(request);
  if (res.ok) {
    await cache.put(request, res.clone());
    await recortar(cache);
  }
  return res;
}

async function primeroRed(request) {
  try {
    return await fetch(request);
  } catch {
    return (await caches.match('/offline.html')) || Response.error();
  }
}

async function cacheYActualiza(request) {
  const cache = await caches.open(CACHE_BASE);
  const guardado = await cache.match(request);
  const red = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => guardado);
  return guardado || red;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') event.respondWith(primeroRed(request));
  else if (url.pathname.startsWith('/assets/')) event.respondWith(primeroCache(request));
  else event.respondWith(cacheYActualiza(request));
});
