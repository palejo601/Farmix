// Códigos de barras con el lector del propio teléfono (Google ML Kit en Android, Apple Vision en iPhone; en el navegador,
// BarcodeDetector si existe). Rápido (~50-100 ms) y sin internet. Además interpreta los códigos GS1 (DataMatrix de
// empaques farmacéuticos), que traen el GTIN, el LOTE y el VENCIMIENTO exactos.

// Dígito de control EAN/UPC (módulo 10). Un código que no lo cumple se descarta: así no se acepta una lectura errónea.
export function gtinOK(code) {
  if (!/^\d{8}$|^\d{12,14}$/.test(code)) return false;
  const d = [...code].map(Number), check = d.pop();
  const sum = d.reverse().reduce((s, n, i) => s + n * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

// GS1: «(01)07702057712938(17)270831(10)6B0985» o la forma cruda con separador GS (\x1D). Devuelve {gtin, lote, venc, fab}.
const AI_FIXED = { '01': 14, '02': 14, '11': 6, '12': 6, '13': 6, '15': 6, '16': 6, '17': 6, '20': 2 };
export function parseGS1(raw) {
  let s = (raw || '').replace(/^\][A-Za-z]\d/, '').trim();            // prefijo de simbología (]d2, ]C1…)
  if (!s) return null;
  const out = {};
  if (/^\(\d{2}\)/.test(s)) {                                            // forma legible con paréntesis
    for (const m of s.matchAll(/\((\d{2,4})\)([^(]*)/g)) out[m[1]] = m[2].trim();
  } else {
    let i = 0;
    while (i < s.length) {
      const ai = s.slice(i, i + 2);
      if (!/^\d\d$/.test(ai)) return null;
      i += 2;
      if (AI_FIXED[ai]) { out[ai] = s.slice(i, i + AI_FIXED[ai]); i += AI_FIXED[ai]; }
      else { const gs = s.indexOf('\x1D', i), end = gs < 0 ? s.length : gs; out[ai] = s.slice(i, end); i = end + 1; }
      if (s[i] === '\x1D') i++;
    }
  }
  if (!out['01'] && !out['10'] && !out['17']) return null;
  const date = v => {                                                    // AAMMDD → MM/AAAA (día 00 = fin de mes) o DD/MM/AAAA
    if (!/^\d{6}$/.test(v || '')) return null;
    const y = 2000 + +v.slice(0, 2), m = v.slice(2, 4), d = v.slice(4, 6);
    if (+m < 1 || +m > 12) return null;
    return d === '00' ? `${m}/${y}` : `${d}/${m}/${y}`;
  };
  const g = out['01'] && gtinOK(out['01']) ? out['01'].replace(/^0(?=\d{13}$)/, '') : null;   // GTIN-14 → EAN-13
  return { gtin: g, lote: out['10'] || null, venc: date(out['17']), fab: date(out['11']) };
}

let detector = null;
// canvas → [{value, format}] (solo códigos válidos). Nunca lanza error: si no hay lector, devuelve [].
export async function readBarcodes(canvas) {
  try {
    const plug = self.Capacitor?.Plugins?.NativeOcr;
    let codes = [];
    if (plug?.barcodes) {
      const image = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
      codes = (await plug.barcodes({ image })).codes || [];
    } else if ('BarcodeDetector' in self) {
      if (!(detector instanceof self.BarcodeDetector)) detector = new self.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'qr_code', 'data_matrix'] });
      const names = { ean_13: 'EAN-13', ean_8: 'EAN-8', upc_a: 'UPC-A', upc_e: 'UPC-E', code_128: 'Code 128', code_39: 'Code 39', itf: 'ITF', qr_code: 'QR', data_matrix: 'DataMatrix' };
      codes = (await detector.detect(canvas)).map(c => ({ value: c.rawValue, format: names[c.format] || c.format }));
    }
    return codes.filter(c => c.value && (!/^(EAN|UPC)/.test(c.format) || gtinOK(c.value)));
  } catch { return []; }
}
