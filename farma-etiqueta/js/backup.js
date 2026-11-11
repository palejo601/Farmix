// Copias de seguridad: exporta registros + fotografías en un único archivo JSON verificable y lo restaura.
import { $, h, toast, modal, confirmDlg, busy, download, stamp, fmtBytes, fmtDate, errMsg } from './ui.js';
import * as db from './db.js';

const FORMAT = 1;
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC_T[(c ^ u8[i]) & 255] ^ (c >>> 8); return ((c ^ 0xFFFFFFFF) >>> 0).toString(16).padStart(8, '0'); }
const enc = new TextEncoder();
function b64(u8) { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
function unb64(s) { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
const norm = s => (s || '').toString().trim().toLowerCase();

export async function exportBackup() {
  busy('Preparando respaldo…');
  try {
    const records = await db.allRecords();
    if (!records.length) { toast('No hay registros para respaldar.', 'warn'); return; }
    const photos = await db.allPhotos();
    const ids = new Set(records.map(r => r.id));
    const recJson = JSON.stringify(records);
    // Se arma por partes para no duplicar en memoria todas las fotografías.
    const parts = [`{"app":"FARMA-ETIQUETA","formato":${FORMAT},"exportado":${Date.now()},"totalRegistros":${records.length},"crcRegistros":"${crc32(enc.encode(recJson))}","registros":${recJson},"fotos":[`];
    let n = 0;
    for (const p of photos) {
      if (!ids.has(p.id)) continue;                         // la foto se vincula al registro por su mismo id
      const u8 = new Uint8Array(p.data);
      parts.push((n++ ? ',' : '') + JSON.stringify({ id: p.id, type: p.type, w: p.w, h: p.h, crc: crc32(u8), b64: b64(u8) }));
      busy('Incluyendo fotografías…', n / Math.max(1, photos.length));
    }
    parts.push(`],"totalFotos":${n}}`);
    const blob = new Blob(parts, { type: 'application/json' });
    download(blob, `farma-etiqueta-respaldo-${stamp()}.json`);
    await db.kvSet('lastBackup', { at: Date.now(), records: records.length, photos: n });
    toast(`Respaldo creado: ${records.length} registro(s), ${n} fotografía(s), ${fmtBytes(blob.size)}. Guárdelo fuera de este dispositivo.`, 'ok', 7000);
    refreshBackup();
  } catch (e) { toast('No se pudo crear el respaldo: ' + errMsg(e), 'err', 7000); }
  finally { busy(false); }
}

// Valida estructura e integridad. Lanza un error descriptivo si el archivo no es confiable.
export function parseBackup(text) {
  let d;
  try { d = JSON.parse(text); } catch { throw new Error('El archivo está dañado o incompleto: no se puede leer como respaldo.'); }
  if (!d || d.app !== 'FARMA-ETIQUETA' || !Array.isArray(d.registros) || !Array.isArray(d.fotos)) throw new Error('El archivo no es un respaldo de FARMA-ETIQUETA.');
  if (d.formato > FORMAT) throw new Error('El respaldo fue creado con una versión más reciente de la aplicación. Actualice la aplicación antes de restaurarlo.');
  if (d.registros.length !== d.totalRegistros || d.fotos.length !== d.totalFotos) throw new Error('El respaldo está incompleto: faltan registros o fotografías.');
  if (crc32(enc.encode(JSON.stringify(d.registros))) !== d.crcRegistros) throw new Error('El respaldo está dañado: los registros no superan la verificación de integridad.');
  const seen = new Set();
  for (const r of d.registros) {
    if (!r || typeof r.id !== 'string' || !r.id || typeof r.nombre !== 'string' || seen.has(r.id)) throw new Error('El respaldo contiene registros no válidos.');
    seen.add(r.id);
  }
  const photos = d.fotos.map(p => {
    if (!p || !seen.has(p.id) || typeof p.b64 !== 'string') throw new Error('El respaldo contiene fotografías sin registro asociado.');
    let u8; try { u8 = unb64(p.b64); } catch { throw new Error('El respaldo está dañado: una fotografía no se puede decodificar.'); }
    if (crc32(u8) !== p.crc) throw new Error('El respaldo está dañado: una fotografía no supera la verificación de integridad.');
    return { id: p.id, type: p.type || 'image/jpeg', w: p.w, h: p.h, data: u8.buffer };
  });
  return { records: d.registros, photos, exportedAt: d.exportado };
}

async function importFile(file) {
  let bk;
  busy('Verificando el respaldo…');
  try { bk = parseBackup(await file.text()); }
  catch (e) { busy(false); await modal('No se puede restaurar', h('p', {}, errMsg(e) + ' No se modificó ningún dato.')); return; }
  finally { busy(false); }
  const cur = await db.allRecords(), curIds = new Map(cur.map(r => [r.id, r]));
  const same = bk.records.filter(r => curIds.has(r.id));
  const key = r => norm(r.nombre) + '|' + norm(r.lote) + '|' + (r.codigoBarras || '');
  const curKeys = new Set(cur.map(key));
  const similar = bk.records.filter(r => !curIds.has(r.id) && curKeys.has(key(r)));
  const body = h('div', {},
    h('p', {}, `Respaldo del ${fmtDate(bk.exportedAt)} verificado: ${bk.records.length} registro(s) y ${bk.photos.length} fotografía(s).`),
    h('p', {}, `En este dispositivo hay ${cur.length} registro(s).`),
    same.length ? h('p', { class: 'banner danger', style: 'border-radius:10px' }, `${same.length} registro(s) del respaldo ya existen aquí (mismo identificador). Elija si conservar la versión actual o sobrescribirla con la del respaldo.`) : null,
    similar.length ? h('p', { class: 'banner', style: 'border-radius:10px' }, `Aviso: ${similar.length} registro(s) nuevos tienen el mismo nombre, lote y código que registros existentes; se agregarán como registros adicionales.`) : null,
    h('p', { class: 'muted small' }, 'Los registros que no están en el respaldo no se borran.'));
  const mode = await modal('Restaurar respaldo', body, [{ label: 'Cancelar', value: null },
    same.length ? { label: 'Agregar solo los nuevos', value: 'skip' } : null,
    same.length ? { label: 'Sobrescribir existentes', value: 'over', class: 'danger' } : { label: 'Restaurar', value: 'skip', class: 'primary' }].filter(Boolean), { sticky: true });
  if (!mode) return;
  if (mode === 'over' && !(await confirmDlg('Confirmar sobrescritura', `Se reemplazarán ${same.length} registro(s) y sus fotografías con la versión del respaldo. Esta acción no se puede deshacer.`, 'Sobrescribir', true))) return;
  const recs = mode === 'over' ? bk.records : bk.records.filter(r => !curIds.has(r.id));
  const ids = new Set(recs.map(r => r.id));
  busy('Restaurando…');
  try {
    await db.importAll(recs, bk.photos.filter(p => ids.has(p.id)));
    // En modo sobrescribir, un registro sin foto en el respaldo no debe conservar una foto antigua.
    if (mode === 'over') { const withPhoto = new Set(bk.photos.map(p => p.id)); for (const r of recs) if (!withPhoto.has(r.id) && curIds.has(r.id)) await db.saveRecord(r, null); }
    toast(`Restauración completa: ${recs.length} registro(s) escritos${mode === 'skip' && same.length ? `, ${same.length} existentes conservados` : ''}.`, 'ok', 7000);
    document.dispatchEvent(new CustomEvent('fe:changed'));
  } catch (e) { await modal('No se pudo restaurar', h('p', {}, errMsg(e) + ' La operación se canceló completa: no quedó nada a medias.')); }
  finally { busy(false); }
}

export async function refreshBackup() {
  const [n, last] = await Promise.all([db.countRecords().catch(() => 0), db.kvGet('lastBackup').catch(() => null)]);
  const txt = last ? `Último respaldo: ${fmtDate(last.at)} (${last.records} registros, ${last.photos} fotografías).` : 'Aún no se ha creado ningún respaldo en este dispositivo.';
  $('#bk-info').textContent = `Registros actuales: ${n}. ${txt}`;
  $('#home-backup').textContent = last ? 'Último: ' + new Date(last.at).toLocaleDateString('es') : 'Sin respaldos aún';
  $('#bk-export').disabled = !n;
}

export function initBackup() {
  $('#bk-export').addEventListener('click', exportBackup);
  $('#pick-backup').addEventListener('change', e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) importFile(f); });
  document.addEventListener('fe:changed', refreshBackup);
}
