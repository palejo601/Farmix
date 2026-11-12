// Asistente IA (Claude) para lote, fabricación y vencimiento. Opcional: solo con internet y con la clave del usuario.
// La foto se envía a la API de Anthropic; el resultado se COMPARA con el lector del teléfono:
//   - si los dos dan lo mismo → el dato se llena (dos lecturas independientes coinciden);
//   - si solo la IA lo lee, o los dos difieren → queda como sugerencia para que el usuario elija.
import { loadScript } from './ui.js';
import * as db from './db.js';

export const AI_MODEL = 'claude-opus-5-5';
const SIDE = 1568;                    // lado largo recomendado para imágenes: más no mejora la lectura y cuesta más

const SYSTEM = `Eres un lector experto de empaques de medicamentos. Tu única tarea es transcribir, desde la fotografía, el número de lote, la fecha de fabricación y la fecha de vencimiento impresos en el empaque.

Cómo se rotulan en los empaques:
- Lote: «Lote», «Lot», «L.», «L:», «Batch», «Lote N.:», o una casilla con la letra L.
- Fabricación: «F.F.», «Fab», «F.», «F:», «Prep.», «Elab.», «MFG», o una casilla con la letra F.
- Vencimiento: «F.V.», «Vence», «Venc.», «V.», «V:», «Vto», «Exp», «Cad», o una casilla con la letra V.
Los valores pueden estar al lado de la etiqueta, debajo, en otra columna, girados 90°, impresos por puntos, en relieve o con tinta tenue. La fecha suele ser MM/AAAA, MM.AAAA, MMMAAAA (FEB2026), DD/MM/AAAA o con el mes en letras.

Reglas:
- Transcribe cada carácter exactamente como está impreso. Distingue con cuidado B/8, D/0, O/0, S/5, I/1, Z/2, G/6 mirando la forma real de cada carácter. No completes, no corrijas y no inventes.
- La fabricación es anterior al vencimiento. No intercambies las fechas: asigna cada una según su etiqueta.
- Si un dato no aparece en la foto o no se puede leer con seguridad, devuelve null en «valor» y explica el motivo en «nota».
- «certeza»: «alta» solo si cada carácter es claramente legible; «media» si algún carácter es dudoso; «baja» si es casi ilegible.
- En «etiqueta» copia la etiqueta que acompaña al valor tal como aparece (por ejemplo «F.V.:»), o null si no hay.
- No escribas la fecha en otro formato: cópiala tal como se ve.`;

let lib = null;
async function sdk() { if (!lib) { await loadScript('vendor/lib/anthropic.iife.min.js'); lib = self.AnthropicAI; } return lib; }

export async function aiConfig() { return (await db.kvGet('aiAssist').catch(() => null)) || { enabled: false, key: '' }; }
export async function aiReady() { const c = await aiConfig(); return !!(c.enabled && c.key && navigator.onLine); }

function schema(z) {
  const campo = z.object({
    valor: z.string().nullable(),
    etiqueta: z.string().nullable(),
    certeza: z.enum(['alta', 'media', 'baja']),
    nota: z.string(),
  });
  return z.object({ lote: campo, fechaFabricacion: campo, vencimiento: campo });
}

function client(Anthropic, key) {
  // La clave es del propio usuario y queda solo en su teléfono: por eso se permite usar el SDK desde la app.
  return new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true, maxRetries: 1, timeout: 60000 });
}

// Prepara la foto: JPEG, lado largo ≤ 1568 px.
export async function photoForAI(blob) {
  const bmp = await createImageBitmap(blob);
  try {
    const k = Math.min(1, SIDE / Math.max(bmp.width, bmp.height)), c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(bmp, 0, 0, c.width, c.height);
    const b64 = c.toDataURL('image/jpeg', 0.88).split(',')[1]; c.width = c.height = 0;
    return b64;
  } finally { bmp.close?.(); }
}

// Devuelve { lote, fechaFabricacion, vencimiento } (cada uno {valor, etiqueta, certeza, nota}) o lanza un error comprensible.
export async function aiReadLotDates(blob, key) {
  const { Anthropic, betaZodOutputFormat, z } = await sdk();
  const data = await photoForAI(blob);
  let res;
  try {
    res = await client(Anthropic, key).beta.messages.parse({
      model: AI_MODEL,
      max_tokens: 2000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',                       // si el modelo declina, la API reintenta con otro modelo en la misma llamada
      system: SYSTEM,
      output_config: { effort: 'medium', format: betaZodOutputFormat(schema(z)) },
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } },
        { type: 'text', text: 'Transcribe el lote, la fecha de fabricación y la fecha de vencimiento de este empaque.' },
      ] }],
    });
  } catch (e) { throw new Error(aiError(e, Anthropic)); }
  if (res.stop_reason === 'refusal') throw new Error('La IA no respondió a esta foto.');
  if (res.stop_reason === 'max_tokens' || !res.parsed_output) throw new Error('La IA no devolvió una respuesta válida.');
  return res.parsed_output;
}

function aiError(e, A) {
  if (A && e instanceof A.AuthenticationError) return 'La clave de la IA no es válida. Revísela en Configuración.';
  if (A && e instanceof A.PermissionDeniedError) return 'La clave de la IA no tiene permiso para este modelo.';
  if (A && e instanceof A.RateLimitError) return 'La IA está ocupada o se alcanzó el límite de la cuenta. Intente en un momento.';
  if (A && e instanceof A.APIConnectionTimeoutError) return 'La IA tardó demasiado en responder.';
  if (A && e instanceof A.APIConnectionError) return 'No hay conexión con la IA (revise internet).';
  if (A && e instanceof A.BadRequestError) return 'La IA rechazó la solicitud: ' + (e.message || '').slice(0, 160);
  if (A && e instanceof A.APIError) return 'Error de la IA (' + (e.status || '?') + ').';
  return 'No se pudo usar la IA: ' + (e?.message || e);
}

// Prueba de la clave sin enviar ninguna foto.
export async function aiTest(key) {
  const { Anthropic } = await sdk();
  try {
    const r = await client(Anthropic, key).messages.create({ model: AI_MODEL, max_tokens: 64, output_config: { effort: 'low' },
      messages: [{ role: 'user', content: 'Responde solo: OK' }] });
    return r.content.some(b => b.type === 'text');
  } catch (e) { throw new Error(aiError(e, Anthropic)); }
}

// Combina la lectura de la IA con la del teléfono (fields de extractFields). Devuelve las notas para el diagnóstico.
const nrm = v => (v || '').toUpperCase().replace(/[\s.\-\/]/g, '');
export function mergeAI(fields, ai, toNumber, label) {
  const out = [];
  for (const f of ['lote', 'fechaFabricacion', 'vencimiento']) {
    const a = ai?.[f]; if (!a || !a.valor) { out.push(`${label[f]}: la IA no lo encontró${a?.nota ? ' (' + a.nota + ')' : ''}.`); continue; }
    const val = f === 'lote' ? a.valor.trim() : toNumber(a.valor.trim());
    const cur = fields.find(x => x.field === f);
    if (cur && nrm(cur.value) === nrm(val)) {
      cur.doubt = false; cur.checked = true; cur.aiAgree = true;
      cur.notes = [...cur.notes.filter(n => !/No se pudo confirmar|elija el que coincide|lectura ampliada dio/.test(n)), 'Confirmado por el Asistente IA (dos lecturas independientes coinciden).'];
      out.push(`${label[f]}: «${val}» — teléfono e IA coinciden.`);
    } else if (cur) {
      Object.assign(cur, { doubt: true, checked: false, alt: val, notes: [...cur.notes, `El Asistente IA leyó «${val}» (certeza ${a.certeza}): elija el que coincide con el empaque.`] });
      out.push(`${label[f]}: teléfono «${cur.value}» / IA «${val}» — no coinciden, quedan las dos opciones.`);
    } else {
      fields.push({ field: f, label: label[f], value: val, conf: null, doubt: true, checked: false, ai: true,
        notes: [`Leído solo por el Asistente IA (certeza ${a.certeza}${a.etiqueta ? ', junto a «' + a.etiqueta + '»' : ''}): compárelo con el empaque.`] });
      out.push(`${label[f]}: «${val}» — solo lo leyó la IA (certeza ${a.certeza}).`);
    }
  }
  return out;
}
