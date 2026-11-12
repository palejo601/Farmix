// Almacenamiento persistente en IndexedDB. Registros y fotografías se guardan en la misma transacción.
// Al subir DB_VERSION solo se CREAN almacenes o índices faltantes: nunca se borran datos existentes.
const DB_NAME = 'farma-etiqueta';
const DB_VERSION = 1;
let dbp = null;

export function open() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    if (!('indexedDB' in self)) return rej(new Error('Este navegador no permite almacenamiento local (IndexedDB). En modo privado algunos navegadores lo bloquean.'));
    const r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains('records')) d.createObjectStore('records', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('photos')) d.createObjectStore('photos', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
    };
    r.onsuccess = () => {
      const d = r.result;
      d.onversionchange = () => { d.close(); dbp = null; };
      d.onclose = () => { dbp = null; };
      res(d);
    };
    r.onerror = () => rej(r.error || new Error('No se pudo abrir la base de datos local.'));
    r.onblocked = () => rej(new Error('La base de datos está en uso en otra pestaña. Ciérrela e intente de nuevo.'));
  }).catch(e => { dbp = null; throw e; });
  return dbp;
}

// Ejecuta fn(tx) y resuelve cuando la transacción se confirma en disco.
async function run(stores, mode, fn) {
  const d = await open();
  return new Promise((res, rej) => {
    let out;
    const t = d.transaction(stores, mode);
    t.oncomplete = () => res(out);
    t.onabort = t.onerror = () => {
      const e = t.error;
      rej(e && e.name === 'QuotaExceededError'
        ? new Error('No queda espacio de almacenamiento en el dispositivo. Libere espacio o exporte un respaldo y elimine registros antiguos.')
        : e || new Error('La operación de almacenamiento fue cancelada.'));
    };
    const r = fn(t);
    if (r && 'onsuccess' in r) r.onsuccess = () => { out = r.result; };
    else out = r;
  });
}

export const uid = () => (crypto.randomUUID ? crypto.randomUUID()
  : 'r' + Date.now().toString(36) + '-' + [...crypto.getRandomValues(new Uint8Array(10))].map(b => b.toString(16).padStart(2, '0')).join(''));

export const allRecords = () => run('records', 'readonly', t => t.objectStore('records').getAll());
export const getRecord = id => run('records', 'readonly', t => t.objectStore('records').get(id));
export const getPhoto = id => run('photos', 'readonly', t => t.objectStore('photos').get(id));
export const countRecords = () => run('records', 'readonly', t => t.objectStore('records').count());

// photo: undefined = conservar la existente · null = eliminar · objeto = reemplazar
export const saveRecord = (rec, photo) => run(['records', 'photos'], 'readwrite', t => {
  t.objectStore('records').put(rec);
  if (photo === null) t.objectStore('photos').delete(rec.id);
  else if (photo) t.objectStore('photos').put({ ...photo, id: rec.id });
});

export const deleteRecord = id => run(['records', 'photos'], 'readwrite', t => {
  t.objectStore('records').delete(id);
  t.objectStore('photos').delete(id);
});

export const allPhotos = () => run('photos', 'readonly', t => t.objectStore('photos').getAll());

// Importación atómica: o se escriben todos los elementos o ninguno.
export const importAll = (records, photos) => run(['records', 'photos'], 'readwrite', t => {
  const rs = t.objectStore('records'), ps = t.objectStore('photos');
  for (const r of records) rs.put(r);
  for (const p of photos) ps.put(p);
});

export const wipe = () => run(['records', 'photos'], 'readwrite', t => {
  t.objectStore('records').clear();
  const ps = t.objectStore('photos');
  ps.clear();
});

export const kvGet = k => run('kv', 'readonly', t => t.objectStore('kv').get(k));
export const kvSet = (k, v) => run('kv', 'readwrite', t => { t.objectStore('kv').put(v, k); });
export const kvDel = k => run('kv', 'readwrite', t => { t.objectStore('kv').delete(k); });
