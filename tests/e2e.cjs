// Pruebas automáticas de extremo a extremo (Playwright + Chromium).
// Uso: node tests/e2e.cjs            (requiere el paquete «playwright» instalado)
// Emula un teléfono Android (Pixel 7). No sustituye la prueba en un dispositivo físico.
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.join(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.wasm': 'application/wasm', '.gz': 'application/gzip' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('404'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});

const results = []; let failed = 0;
const check = (name, ok, extra = '') => { results.push([ok ? 'OK ' : 'FALLA', name, extra]); if (!ok) failed++; console.log((ok ? '  ✔ ' : '  ✘ ') + name + (extra ? ' — ' + extra : '')); };
const EAN = '7701234567897';

(async () => {
  await new Promise(r => server.listen(0, r));
  const URL0 = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['Pixel 7'], locale: 'es-CO', acceptDownloads: true });
  let page = await ctx.newPage();
  const errors = []; const watch = p => { p.on('pageerror', e => errors.push(String(e))); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); };
  watch(page);
  await page.goto(URL0);
  await page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 30000 });
  // Las pruebas 1-7 ejercitan cada lectura por separado: se desactiva el llenado automático (se prueba aparte al final).
  const setAuto = v => page.evaluate(v => new Promise(r => { const q = indexedDB.open('farma-etiqueta'); q.onsuccess = () => { const t = q.result.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, 'autoFill'); t.oncomplete = () => { q.result.close(); r(); }; }; }), v);
  await setAuto(false);

  // --- Imágenes de prueba generadas en el propio navegador (sintéticas) ---
  await page.addScriptTag({ url: 'vendor/lib/JsBarcode.all.min.js' });
  const img = async (kind) => Buffer.from((await page.evaluate(async ({ kind, EAN }) => {
    const c = document.createElement('canvas'); c.width = 1400; c.height = 1000; const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.fillStyle = '#111';
    if (kind === 'pack' || kind === 'pack2') {
      x.font = 'bold 120px Arial'; x.fillText('CALMADOL', 80, 170);
      x.font = '64px Arial'; x.fillText('Acetaminofén 500 mg', 80, 290);
      x.font = '52px Arial'; x.fillText('Tabletas recubiertas', 80, 380); x.fillText('Caja por 20 tabletas', 80, 460);
      x.fillText('Laboratorios Andinos S.A.', 80, 560); x.fillText('Reg. San. INVIMA 2019M-0012345', 80, 650);
      if (kind === 'pack') { x.font = 'bold 56px Arial'; x.fillText('LOTE: AB12345', 80, 780); x.fillText('VENCE: 05/2027', 80, 870); }
    }
    if (kind === 'boxes') {                                    // casillas impresas L / F / V con el valor al lado
      x.font = 'bold 110px Arial'; x.fillText('LOSARTÁN MK', 80, 170); x.font = '60px Arial'; x.fillText('Losartán potásico 50 mg', 80, 280);
      x.fillText('Caja x 30 tabletas', 80, 370);
      [['L', '4B0123'], ['F', '05/2024'], ['V', '05/2027']].forEach(([k, v], i) => { const bx = 80 + i * 430, by = 600, S = 56;
        x.lineWidth = 4; x.strokeRect(bx, by, S, S); x.font = 'bold 42px Arial'; x.textAlign = 'center'; x.fillText(k, bx + S / 2, by + 43); x.textAlign = 'left';
        x.font = 'bold 50px monospace'; x.fillText(v, bx + S + 22, by + 46); });
    }
    if (kind === 'ean' || kind === 'blur' || kind === 'pack') {
      const b = document.createElement('canvas'); JsBarcode(b, EAN, { format: 'EAN13', width: 4, height: 150, margin: 30 });
      if (kind === 'blur') x.filter = 'blur(2px)';
      if (kind === 'pack') x.drawImage(b, 880, 700, 480, 260); else x.drawImage(b, 350, 330);
    }
    if (kind === 'none') { x.font = '60px Arial'; x.fillText('Imagen sin código de barras', 200, 500); for (let i = 0; i < 40; i++) x.fillRect(100 + i * 30, 700, 12, 12); }
    return c.toDataURL(kind === 'ean' ? 'image/png' : 'image/jpeg', 0.9).split(',')[1];
  }, { kind, EAN })), 'base64');
  const F = { ean: { name: 'ean13.png', mimeType: 'image/png', buffer: await img('ean') }, blur: { name: 'borrosa.jpg', mimeType: 'image/jpeg', buffer: await img('blur') },
    none: { name: 'sin-codigo.jpg', mimeType: 'image/jpeg', buffer: await img('none') }, pack: { name: 'empaque.jpg', mimeType: 'image/jpeg', buffer: await img('pack') },
    pack2: { name: 'empaque-sin-lote.jpg', mimeType: 'image/jpeg', buffer: await img('pack2') }, boxes: { name: 'casillas.jpg', mimeType: 'image/jpeg', buffer: await img('boxes') } };
  const more = () => page.evaluate(() => { const d = document.getElementById('more-opts'); if (d) d.open = true; });
  const clickMore = async sel => { await more(); await page.click(sel); };
  const choose = async (sel, file) => { await more(); const [fc] = await Promise.all([page.waitForEvent('filechooser', { timeout: 8000 }), page.click(sel)]); await fc.setFiles(file); return fc; };
  const modalText = () => page.locator('.modal').last().innerText();
  const btn = t => page.locator('.modal footer button', { hasText: t }).last();
  const saveForm = async () => {
    await page.click('#btn-save'); await page.waitForTimeout(250);
    if (await btn('Sí, revisé y guardar').count()) { saved.confirm = await modalText(); await btn('Sí, revisé y guardar').click(); }
  };
  const saved = {};
  const waitIdle = () => page.waitForFunction(() => document.getElementById('busy').hidden, null, { timeout: 180000 });

  console.log('\nPrueba 1 — Selector de fotografías');
  await page.click('.tabbar a[data-tab=registrar]');
  const fc = await choose('#photo-empty label[for=pick-gallery]', F.pack);
  check('El botón «Elegir de la galería» abre el selector de archivos del sistema', true);
  const inp = await page.evaluate(() => { const i = document.getElementById('pick-gallery'); return { type: i.type, accept: i.accept, capture: i.hasAttribute('capture') }; });
  check('Es un <input type=file> real, acepta JPEG/PNG/WEBP y no fuerza la cámara', inp.type === 'file' && /jpeg/.test(inp.accept) && /png/.test(inp.accept) && /webp/.test(inp.accept) && !inp.capture, inp.accept);
  await page.waitForSelector('#photo-box:not([hidden])');
  const nat = await page.evaluate(() => new Promise(r => { const i = document.getElementById('photo-preview'); i.complete && i.naturalWidth ? r(i.naturalWidth) : i.onload = () => r(i.naturalWidth); }));
  check('Aparece la vista previa de la fotografía', nat > 0, nat + ' px');
  await choose('#photo-box label[for=pick-files]', F.ean);
  await page.waitForFunction(() => /ean|×/.test(document.getElementById('photo-info').textContent));
  check('La fotografía se puede cambiar (selector «archivos»)', true);
  await page.click('#btn-photo-del'); await btn('Eliminar').click();
  check('La fotografía se puede eliminar (con confirmación)', await page.locator('#photo-empty').isVisible());
  await page.setInputFiles('#pick-gallery', { name: 'roto.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xFF, 0xD8, 0xFF, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) });
  await page.waitForSelector('.toast.err'); const t1 = await page.locator('.toast.err').last().innerText();
  check('Archivo dañado: mensaje comprensible y sin bloqueo', /dañada|no se puede abrir/i.test(t1), t1);
  await page.setInputFiles('#pick-gallery', { name: 'nota.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('esto no es una imagen, es texto') });
  await page.waitForFunction(() => [...document.querySelectorAll('.toast.err')].some(t => /Formato no admitido/.test(t.textContent)));
  check('Archivo que no es imagen: rechazado por contenido, no por extensión', true);
  const noGUM = !/getUserMedia/.test(['app', 'form', 'photos', 'ocr'].map(f => fs.readFileSync(path.join(ROOT, 'js', f + '.js'), 'utf8')).join(''));
  check('La cámara solo se usa en el escáner en vivo (js/live.js), al pulsar su botón', noGUM && /getUserMedia/.test(fs.readFileSync(path.join(ROOT, 'js', 'live.js'), 'utf8')));

  console.log('\nPrueba 2 — Pantalla principal y sin lector de códigos de barras');
  await page.goto(URL0 + '#inicio'); await page.waitForSelector('#v-inicio:not([hidden])');
  const tiles = await page.$$eval('#v-inicio .tile b', t => t.map(x => x.textContent));
  check('La pantalla principal tiene únicamente: Escanear fotografía, Crear rótulo, Historial', JSON.stringify(tiles) === JSON.stringify(['Escanear fotografía', 'Crear rótulo', 'Historial']), tiles.join(' · '));
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8'), allJs = fs.readdirSync(path.join(ROOT, 'js')).map(f => fs.readFileSync(path.join(ROOT, 'js', f), 'utf8')).join('');
  check('Lector de códigos eliminado (sin barcode.js, ZXing ni BarcodeDetector)', !fs.existsSync(path.join(ROOT, 'js', 'barcode.js')) && !fs.existsSync(path.join(ROOT, 'vendor', 'zxing')) && !/zxing|BarcodeDetector|readBarcode/i.test(sw + allJs) && await page.locator('#btn-barcode').count() === 0);
  await page.click('#v-inicio .tile:has-text("Crear rótulo")'); check('«Crear rótulo» abre el generador', !!await page.waitForSelector('#v-rotulos:not([hidden])', { timeout: 5000 }).catch(() => null));
  await page.goto(URL0 + '#inicio'); await page.click('#v-inicio .tile:has-text("Historial")'); check('«Historial» abre el historial', !!await page.waitForSelector('#v-historial:not([hidden])', { timeout: 5000 }).catch(() => null));
  await page.click('.tabbar a[data-tab=registrar]');

  console.log('\nPrueba 3 — OCR');
  await page.click('#btn-form-clear'); if (await btn('Descartar').count()) await btn('Descartar').click();
  await choose('#photo-empty label[for=pick-gallery]', F.pack); await page.waitForSelector('#photo-box:not([hidden])');
  await clickMore('#btn-ocr'); await page.waitForSelector('.ocr-row', { timeout: 180000 });
  const rows = await page.$$eval('.ocr-row', rs => rs.map(r => ({ label: r.querySelector('b').textContent, value: r.querySelector('input:not([type=checkbox])').value, conf: r.querySelector('.chip').textContent, checked: r.querySelector('input[type=checkbox]').checked })));
  const get = l => rows.find(r => r.label === l)?.value;
  console.log('    Texto leído:', JSON.stringify(await page.locator('pre.raw').first().textContent()));
  console.log('    Campos detectados:', JSON.stringify(rows.map(r => `${r.label}=${r.value} [${r.conf}]`)));
  check('OCR extrae el nombre', get('Nombre del producto') === 'CALMADOL', get('Nombre del producto'));
  check('OCR extrae la concentración', get('Concentración') === '500 mg', get('Concentración'));
  check('OCR extrae el lote sin alterarlo', get('Número de lote') === 'AB12345', get('Número de lote'));
  check('OCR extrae el vencimiento sin alterarlo', get('Fecha de vencimiento') === '05/2027', get('Fecha de vencimiento'));
  check('OCR extrae registro sanitario, laboratorio, forma y presentación', /2019M-0012345/.test(get('Registro sanitario') || '') && /Andinos/.test(get('Laboratorio') || '') && /Tabletas/i.test(get('Forma farmacéutica') || '') && /20 tabletas/.test(get('Presentación') || ''),
    [get('Registro sanitario'), get('Laboratorio'), get('Forma farmacéutica'), get('Presentación')].join(' | '));
  check('La revisión muestra nivel de confianza y advierte que no es información verificada', rows.every(r => /Confianza/.test(r.conf)) && /NO es información farmacéutica verificada/.test(await modalText()));
  check('Nada se escribe en el formulario antes de confirmar', await page.inputValue('#f-lote') === '');
  const loteInput = page.locator('.ocr-row', { hasText: 'Número de lote' }).locator('input:not([type=checkbox])');
  await loteInput.fill('AB12346');
  await btn('Aplicar al formulario').click();
  check('Corrección manual en la revisión y aplicación al formulario', await page.inputValue('#f-lote') === 'AB12346' && await page.inputValue('#f-nombre') === 'CALMADOL');
  // Zona marcada en otra fotografía: se amplía, se lee varias veces y se confirma viendo la imagen
  const infoBefore = await page.locator('#photo-info').innerText();
  const dragZone = async (x0, y0, x1, y1) => { const b = await page.locator('.zone-wrap').boundingBox(); await page.mouse.move(b.x + b.width * x0, b.y + b.height * y0); await page.mouse.down(); await page.mouse.move(b.x + b.width * x1, b.y + b.height * y1, { steps: 6 }); await page.mouse.up(); };
  await choose('#photo-box label[data-after=extra]', F.pack); await page.waitForSelector('.zone-wrap img');
  await page.waitForFunction(() => document.querySelector('.zone-wrap img').naturalWidth > 0);
  await dragZone(0.03, 0.70, 0.61, 0.92); await btn('Leer zona marcada').click();
  await page.waitForSelector('.zone-shot', { timeout: 180000 }); await waitIdle();
  const zr = await page.$$eval('.modal .ocr-row', rs => rs.map(r => [r.querySelector('b').textContent, r.querySelector('input').value, r.querySelector('.chip').textContent]));
  check('«Marcar lote y fechas»: lee la zona ampliada y muestra los tres campos para confirmar', zr.length === 3 && zr[0][1] === 'AB12345' && zr[2][1] === '05/2027' && zr[1][1] === '', JSON.stringify(zr));
  check('La zona de otra foto no reemplaza la foto guardada y nada se aplica sin confirmar', await page.locator('#photo-info').innerText() === infoBefore && await page.inputValue('#f-lote') === 'AB12346');
  await page.locator('.modal .ocr-row input').nth(1).fill('05/2025');
  await btn('Usar estos datos').click();
  check('Al confirmar se aplican lote, fabricación (escrita a mano) y vencimiento', await page.inputValue('#f-lote') === 'AB12345' && await page.inputValue('#f-fechaFabricacion') === '05/2025' && await page.inputValue('#f-vencimiento') === '05/2027');
  await page.fill('#f-lote', 'AB12346');
  // No inventa: empaque sin lote ni vencimiento
  await choose('#photo-box label[for=pick-gallery]', F.pack2); await page.waitForTimeout(700);
  await clickMore('#btn-ocr'); await page.waitForSelector('.ocr-row', { timeout: 180000 });
  const rows2 = await page.$$eval('.ocr-row b', bs => bs.map(b => b.textContent)), txt2 = await modalText();
  check('Empaque sin lote ni fecha: no inventa esos campos y advierte que falta el vencimiento', !rows2.includes('Número de lote') && !rows2.includes('Fecha de vencimiento') && /No se detectó la fecha de vencimiento/.test(txt2));
  await btn('Cancelar').click();
  await choose('#photo-box label[for=pick-gallery]', F.pack); await page.waitForTimeout(700);
  await page.fill('#f-codigoBarras', EAN);
  await page.fill('#f-ubicacion', 'Estante B-3');
  await saveForm(); await page.waitForSelector('#v-historial:not([hidden]) .rec');
  check('Antes de guardar se exige confirmar lote/fechas leídos por la foto', /Compare con el empaque/.test(saved.confirm || '') && /Fecha de vencimiento: 05\/2027/.test(saved.confirm || ''), (saved.confirm || '').replace(/\s+/g, ' ').slice(0, 160));
  check('Registro confirmado y guardado', /CALMADOL/.test(await page.locator('.rec').first().innerText()));

  console.log('\nPrueba 4 — Almacenamiento persistente');
  await page.close(); page = await ctx.newPage(); watch(page); await page.goto(URL0 + '#historial');
  await page.waitForSelector('.rec');
  const card = await page.locator('.rec').first().innerText();
  check('Tras cerrar y reabrir, el registro sigue disponible', /CALMADOL/.test(card) && /AB12346/.test(card) && /05\/2027/.test(card) && card.includes(EAN));
  check('La miniatura de la fotografía sigue disponible', await page.locator('.rec img.thumb').count() === 1);
  await page.locator('.rec button', { hasText: 'Abrir' }).click(); await page.waitForSelector('.detail-photo');
  const ph = await page.evaluate(() => new Promise(r => { const i = document.querySelector('.detail-photo'); const f = () => r([i.naturalWidth, i.naturalHeight]); i.complete && i.naturalWidth ? f() : (i.onload = f, i.onerror = () => r([0, 0])); }));
  check('La fotografía completa se recupera de IndexedDB', ph[0] > 0, ph.join(' × ') + ' px');
  check('El detalle distingue datos leídos (OCR / código) de datos manuales', /OCR/.test(await modalText()) && /código de barras/i.test(await modalText()));
  await btn('Cerrar').click();
  const stored = await page.evaluate(() => new Promise(r => { const q = indexedDB.open('farma-etiqueta'); q.onsuccess = () => { const g = q.result.transaction('photos').objectStore('photos').getAll(); g.onsuccess = () => r(g.result.map(p => ({ bytes: p.data.byteLength, isBuf: p.data instanceof ArrayBuffer }))); }; }));
  check('La foto está guardada como bytes en IndexedDB (no como URL temporal)', stored.length === 1 && stored[0].isBuf && stored[0].bytes > 5000, JSON.stringify(stored));
  // borrador: recuperación ante cierre inesperado
  await page.click('.tabbar a[data-tab=registrar]'); await page.fill('#f-nombre', 'Borrador de prueba'); await page.waitForTimeout(900);
  await page.close(); page = await ctx.newPage(); watch(page); await page.goto(URL0); await page.waitForSelector('#v-registrar:not([hidden])');
  check('Cierre inesperado: el formulario sin guardar se recupera', await page.inputValue('#f-nombre') === 'Borrador de prueba');
  await page.click('#btn-form-clear'); await btn('Descartar').click();
  await page.fill('#f-nombre', 'Sin lote'); await page.click('#btn-save'); await page.waitForSelector('.modal');
  check('Al guardar sin lote ni vencimiento se advierte y se pide confirmación', /no tiene número de lote ni fecha de vencimiento/.test(await modalText()));
  await btn('Cancelar').click(); await page.click('#btn-form-clear'); await btn('Descartar').click();
  // duplicados
  await page.fill('#f-nombre', 'calmadol'); await page.fill('#f-lote', 'ab12346'); await page.fill('#f-concentracion', '500 mg'); await page.fill('#f-codigoBarras', EAN); await page.fill('#f-vencimiento', '05/2027');
  await page.click('#btn-save'); await page.waitForSelector('.modal');
  check('Control de duplicados: avisa antes de guardar un registro repetido', /duplicado/i.test(await modalText()));
  await btn('Cancelar').click(); await page.click('#btn-form-clear'); await btn('Descartar').click();

  console.log('\nPrueba 5 — Funcionamiento sin conexión');
  await page.goto(URL0 + '#config'); await page.waitForSelector('#cf-status div');
  await page.waitForFunction(() => /Disponibles sin conexión/.test(document.getElementById('cf-status').textContent), null, { timeout: 20000 }).catch(() => {});
  check('Indicador: recursos OCR disponibles sin conexión (tras el primer uso)', /Disponibles sin conexión/.test(await page.locator('#cf-status').innerText()));
  await ctx.setOffline(true);
  await page.close(); page = await ctx.newPage(); watch(page);
  await page.goto(URL0 + '#historial'); await page.waitForSelector('.rec');
  check('Sin internet: la aplicación abre y muestra el historial', /CALMADOL/.test(await page.locator('.rec').first().innerText()));
  check('Sin internet: el indicador de conexión lo informa', /Sin conexión/.test(await page.locator('#net-chip').innerText()));
  await page.click('.tabbar a[data-tab=registrar]');
  await choose('#photo-empty label[for=pick-gallery]', F.pack); await page.waitForSelector('#photo-box:not([hidden])');
  await page.fill('#f-codigoBarras', EAN);
  await clickMore('#btn-ocr'); await page.waitForSelector('.ocr-row', { timeout: 180000 });
  const offLote = await page.locator('.ocr-row', { hasText: 'Número de lote' }).locator('input:not([type=checkbox])').inputValue();
  check('Sin internet: OCR completo (motor, WASM e idiomas locales)', offLote === 'AB12345', offLote);
  await btn('Aplicar al formulario').click(); await page.fill('#f-nombre', 'Producto offline'); await saveForm();
  await page.waitForSelector('#v-historial:not([hidden]) .rec');
  check('Sin internet: registrar un producto', await page.locator('.rec').count() === 2);
  await page.locator('.rec', { hasText: 'Producto offline' }).locator('button', { hasText: 'Editar' }).click();
  await page.waitForSelector('#v-registrar:not([hidden])'); await page.fill('#f-observaciones', 'Editado sin conexión'); await saveForm();
  await page.waitForSelector('#v-historial:not([hidden]) .rec');
  await page.fill('#h-search', 'offline ab12345');
  check('Sin internet: editar un registro y buscarlo por nombre + lote', await page.locator('.rec').count() === 1);
  await page.fill('#h-search', EAN); check('Búsqueda por código de barras', await page.locator('.rec').count() === 2);
  await page.fill('#h-search', 'andinos'); check('Búsqueda por laboratorio', await page.locator('.rec').count() === 2);
  await page.fill('#h-search', 'acetaminofen'); check('Búsqueda por principio activo (sin tildes)', await page.locator('.rec').count() >= 1);
  await page.fill('#h-search', ''); await page.selectOption('#h-filter', 'vencido'); check('Filtro «vencidos» (ninguno en los datos de prueba)', await page.locator('.rec').count() === 0);
  await page.selectOption('#h-filter', '');

  console.log('\nPrueba 6 — Rótulos, impresión y exportación (aún sin conexión)');
  await page.locator('.rec', { hasText: 'CALMADOL' }).first().locator('button', { hasText: 'Rótulo' }).click();
  await page.waitForSelector('#lb-preview svg');
  check('Sin internet: se generan rótulos con vista previa', true);
  await page.locator('#lb-items input[type=number]').fill('30'); await page.locator('#lb-items input[type=number]').dispatchEvent('input');
  await page.selectOption('#lb-size', '1'); await page.fill('#sh-cols', '2'); await page.fill('#sh-rows', '5');
  let sum = await page.locator('#sh-summary').innerText();
  check('30 rótulos con 10 por hoja → 3 páginas', /10 rótulo\(s\) por hoja/.test(sum) && /3 página/.test(sum), sum);
  // Medidas físicas y textos sin recortes en todos los tamaños
  const sizes = await page.$$eval('#lb-size option', o => o.map(x => [x.value, x.textContent]));
  let allFit = true, detail = [];
  for (const [v, name] of sizes.filter(s => s[0] !== '-1')) {
    await page.selectOption('#lb-size', v); await page.click('#sh-auto'); await page.waitForTimeout(60);
    const r = await page.evaluate(() => {
      const w = +document.getElementById('lb-w').value, h = +document.getElementById('lb-h').value;
      const svg = document.querySelector('#lb-preview svg'), g = svg.querySelector('g[transform]');
      let out = 0, n = 0, overlap = 0; const boxes = [];
      for (const t of g.querySelectorAll('text')) { const b = t.getBBox(); n++; if (b.x < -0.05 || b.x + b.width > w + 0.05 || b.y < -0.05 || b.y + b.height > h + 0.05) out++; boxes.push(b); }
      for (let i = 1; i < boxes.length; i++) if (boxes[i].y + boxes[i].height * 0.2 < boxes[i - 1].y + boxes[i - 1].height * 0.55) overlap++;
      const bars = g.querySelector('g[shape-rendering]'); let barOk = true;
      if (bars) { const b = bars.getBBox(); barOk = b.x >= 0 && b.x + b.width <= w && b.y + b.height <= h; }
      return { w, h, n, out, overlap, bars: !!bars, barOk, warn: document.getElementById('lb-warnings').innerText, err: !document.getElementById('sh-error').hidden };
    });
    if (r.out || r.overlap || !r.barOk || r.err || !r.n) allFit = false;
    detail.push(`${r.w}×${r.h}: ${r.n} líneas${r.bars ? '+barras' : ''}${r.warn ? ' (aviso)' : ''}`);
  }
  check('Lista de tamaños según la especificación', JSON.stringify(sizes.filter(s => s[0] !== '-1').map(s => s[1].match(/\d+ × \d+/)[0])) === JSON.stringify(['100 × 70', '70 × 50', '50 × 30', '40 × 20', '30 × 15', '20 × 10']) && sizes.some(s => s[0] === '-1'), sizes.map(s => s[1]).join(' · '));
  check('Los 6 tamaños predefinidos (100×70, 70×50, 50×30, 40×20, 30×15, 20×10): texto dentro del rótulo, sin cortes ni superposición', allFit, detail.join(' · '));
  await page.selectOption('#lb-size', '5'); await page.waitForTimeout(60);
  check('Rótulo 20 × 10 mm: el código de barras se omite con aviso en vez de imprimirse ilegible', /código de barras no cabe/.test(await page.locator('#lb-warnings').innerText()));
  await page.selectOption('#lb-size', '-1'); await page.fill('#lb-w', '60'); await page.fill('#lb-h', '35'); await page.click('#sh-auto');
  sum = await page.locator('#sh-summary').innerText(); check('Tamaño personalizado 60 × 35 mm', /60 × 35 mm/.test(sum), sum);
  await page.fill('#sh-cols', '9'); await page.locator('#sh-cols').dispatchEvent('input');
  check('Distribución imposible: error claro e impresión deshabilitada', await page.locator('#sh-error').isVisible() && await page.locator('#lb-print').isDisabled());
  // Impresión CSS: se captura el resultado real del motor de impresión de Chromium
  await page.selectOption('#lb-size', '1'); await page.selectOption('#sh-paper', 'Carta'); await page.fill('#sh-cols', '2'); await page.fill('#sh-rows', '4');
  await page.fill('#sh-mt', '12'); await page.fill('#sh-ml', '15'); await page.fill('#sh-gh', '4'); await page.fill('#sh-gv', '5'); await page.locator('#sh-gv').dispatchEvent('input');
  await page.evaluate(() => { window.print = () => {}; }); await page.click('#lb-print');
  const geo = await page.evaluate(() => { const s = document.querySelector('#print-root svg'); return { n: document.querySelectorAll('#print-root svg').length, w: s.getAttribute('width'), h: s.getAttribute('height'),
    page: document.getElementById('page-style').textContent, cells: [...s.querySelectorAll(':scope > g')].slice(0, 3).map(g => g.getAttribute('transform')), per: s.querySelectorAll(':scope > g').length }; });
  check('Impresión: hoja Carta en mm reales, márgenes y separaciones configurados', geo.w === '215.9mm' && geo.h === '279.4mm' && /size:215.9mm 279.4mm;margin:0/.test(geo.page) && geo.cells[0] === 'translate(15 12)' && geo.cells[1] === 'translate(89 12)' && geo.cells[2] === 'translate(15 67)', JSON.stringify(geo));
  check('Impresión: 30 rótulos a 8 por hoja → 4 páginas, sin rótulos adicionales', geo.n === 4 && geo.per === 8 && await page.evaluate(() => document.querySelectorAll('#print-root svg > g').length) === 30);
  await page.emulateMedia({ media: 'print' });
  const pdfPrint = (await page.pdf({ preferCSSPageSize: true, printBackground: true })).toString('latin1');
  await page.emulateMedia({ media: 'screen' });
  const mb = pdfPrint.match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)/), pc = (pdfPrint.match(/\/Type\s*\/Page[^s]/g) || []).length;
  check('Motor de impresión (PDF del navegador): 4 páginas tamaño Carta, sin página en blanco extra', pc === 4 && mb && Math.abs(mb[1] - 612) < 1.5 && Math.abs(mb[2] - 792) < 1.5, `${pc} páginas, ${mb?.[1]} × ${mb?.[2]} pt`);
  // PDF propio
  let [dl] = await Promise.all([page.waitForEvent('download'), page.click('#lb-pdf')]);
  const pdf = fs.readFileSync(await dl.path()).toString('latin1');
  const pm = pdf.match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)/), pn = (pdf.match(/\/Type\s*\/Page[^s]/g) || []).length;
  check('Exportar PDF: 4 páginas de 215,9 × 279,4 mm (medida real)', pn === 4 && Math.abs(pm[1] / 72 * 25.4 - 215.9) < 0.2 && Math.abs(pm[2] / 72 * 25.4 - 279.4) < 0.2, `${pn} pág., ${(pm[1] / 72 * 25.4).toFixed(1)} × ${(pm[2] / 72 * 25.4).toFixed(1)} mm`);
  // Word
  [dl] = await Promise.all([page.waitForEvent('download'), page.click('#lb-docx')]);
  const docxPath = path.join(require('os').tmpdir(), 'fe-test.docx'); await dl.saveAs(docxPath);
  const xml = require('child_process').execSync(`unzip -p "${docxPath}" word/document.xml`, { maxBuffer: 1e8 }).toString();
  const media = require('child_process').execSync(`unzip -l "${docxPath}"`).toString();
  check('Exportar Word: DOCX con tablas y texto editable (no una imagen pegada)', (xml.match(/<w:tbl>/g) || []).length === 4 && /<w:t[^>]*>CALMADOL<\/w:t>/.test(xml) && /Lote: AB12346/.test(xml), `${(xml.match(/<w:tbl>/g) || []).length} tablas, ${(xml.match(/<w:tc>/g) || []).length} celdas`);
  check('Exportar Word: medidas configuradas (celda 70 mm = 3969 twips, fila 50 mm exacta) y código de barras incluido', /w:w="3969"/.test(xml) && /w:val="2835" w:hRule="exact"|w:hRule="exact" w:val="2835"/.test(xml) && /media\/.*\.png/.test(media));
  const lbls = await page.$$eval('#v-rotulos .sticky-actions button', b => b.map(x => x.textContent.trim()));
  check('Botones separados: Ver PDF, Ver Word, Compartir PDF, Compartir Word', ['Ver PDF', 'Ver Word', 'Compartir PDF', 'Compartir Word'].every(t => lbls.includes(t)), lbls.join(' · '));
  check('«Ver» en Android (navegador) descarga el archivo y explica cómo abrirlo', /Descargas para abrirlo/.test(await page.locator('#toasts').innerText()));
  const [s1] = await Promise.all([page.waitForEvent('download'), page.click('#lb-pdf-share')]);
  const [s2] = await Promise.all([page.waitForEvent('download'), page.click('#lb-docx-share')]);
  check('Compartir PDF y Compartir Word entregan archivos reales (sin menú Compartir en este navegador: se descargan)', /\.pdf$/.test(s1.suggestedFilename()) && /\.docx$/.test(s2.suggestedFilename()) && fs.statSync(await s1.path()).size > 1000 && fs.statSync(await s2.path()).size > 1000);

  console.log('\nPrueba 7 — Respaldo y restauración');
  await page.click('.tabbar a[data-tab=respaldo]');
  [dl] = await Promise.all([page.waitForEvent('download'), page.click('#bk-export')]);
  const bkPath = path.join(require('os').tmpdir(), 'fe-backup.json'); await dl.saveAs(bkPath);
  const bk = JSON.parse(fs.readFileSync(bkPath, 'utf8'));
  check('Respaldo exportado con registros y fotografías', bk.registros.length === 2 && bk.fotos.length === 2 && bk.fotos.every(f => bk.registros.some(r => r.id === f.id)), `${bk.registros.length} registros, ${bk.fotos.length} fotos, ${(fs.statSync(bkPath).size / 1024).toFixed(0)} KB`);
  await page.click('.tabbar a[data-tab=historial]');
  await page.locator('.rec', { hasText: 'Producto offline' }).locator('button', { hasText: 'Eliminar' }).click();
  check('Eliminar pide confirmación', /no se puede deshacer/.test(await modalText())); await btn('Eliminar').click();
  await page.waitForFunction(() => document.querySelectorAll('.rec').length === 1);
  check('Registro de prueba eliminado', true);
  await page.click('.tabbar a[data-tab=respaldo]');
  const bad = fs.readFileSync(bkPath, 'utf8');
  await page.setInputFiles('#pick-backup', { name: 'cortado.json', mimeType: 'application/json', buffer: Buffer.from(bad.slice(0, bad.length / 2)) });
  await page.waitForSelector('.modal'); check('Respaldo truncado: detectado como dañado, sin modificar datos', /dañado|incompleto/.test(await modalText())); await btn('Cerrar').click();
  await page.setInputFiles('#pick-backup', { name: 'alterado.json', mimeType: 'application/json', buffer: Buffer.from(bad.replace('AB12346', 'AB99999')) });
  await page.waitForSelector('.modal'); check('Respaldo alterado: no supera la verificación de integridad', /integridad/.test(await modalText())); await btn('Cerrar').click();
  await page.setInputFiles('#pick-backup', bkPath); await page.waitForSelector('.modal');
  check('Restauración: advierte sobre registros que ya existen', /ya existen/.test(await modalText()));
  await btn('Agregar solo los nuevos').click(); await page.waitForSelector('.toast.ok');
  await page.click('.tabbar a[data-tab=historial]'); await page.waitForFunction(() => document.querySelectorAll('.rec').length === 2);
  await page.locator('.rec', { hasText: 'Producto offline' }).locator('button', { hasText: 'Abrir' }).click(); await page.waitForSelector('.detail-photo');
  const ph2 = await page.evaluate(() => new Promise(r => { const i = document.querySelector('.detail-photo'); const f = () => r(i.naturalWidth); i.complete && i.naturalWidth ? f() : (i.onload = f, i.onerror = () => r(0)); }));
  check('Tras restaurar: el registro y su fotografía se recuperan', ph2 > 0 && /Editado sin conexión/.test(await modalText()));
  await btn('Cerrar').click();
  await page.click('.tabbar a[data-tab=respaldo]'); await page.setInputFiles('#pick-backup', bkPath); await page.waitForSelector('.modal');
  await btn('Sobrescribir existentes').click(); await page.waitForFunction(() => /Confirmar sobrescritura/.test(document.querySelector('#modal-root').innerText));
  check('Sobrescribir exige una confirmación adicional', true); await btn('Cancelar').click();

  await ctx.setOffline(false);
  console.log('\nLlenado automático al elegir la foto');
  await page.goto(URL0 + '#config'); await page.waitForSelector('#cf-autofill');
  await page.check('#cf-autofill'); await page.waitForTimeout(300);
  await page.goto(URL0 + '#registrar'); await page.waitForSelector('#v-registrar:not([hidden])');
  if (await page.inputValue('#f-nombre')) { await page.click('#btn-form-clear'); if (await btn('Descartar').count()) await btn('Descartar').click(); }
  const t0 = Date.now();
  await choose('#photo-empty label[for=pick-gallery]', F.pack);
  await page.waitForSelector('#autofill-note:not([hidden])', { timeout: 180000 }); await waitIdle();
  const af = {}; for (const k of ['nombre', 'concentracion', 'lote', 'vencimiento', 'registroSanitario', 'laboratorio']) af[k] = await page.inputValue('#f-' + k);
  check('Solo con elegir la foto se llenan nombre, concentración, lote, vencimiento, registro y laboratorio', af.nombre === 'CALMADOL' && af.concentracion === '500 mg' && af.lote === 'AB12345' && af.vencimiento === '05/2027' && /2019M-0012345/.test(af.registroSanitario) && /Andinos/.test(af.laboratorio), `${((Date.now() - t0) / 1000).toFixed(1)} s · ` + JSON.stringify(af));
  const note = await page.locator('#autofill-note').innerText(), secs = +(note.match(/([\d.]+) s\)/) || [])[1];
  check('Sin ventanas que confirmar: aviso en el formulario para revisar antes de guardar', await page.locator('.modal').count() === 0 && /Se llenaron \d+ campo/.test(note));
  check('Tiempo de lectura medido y mostrado (objetivo ≤ 10 s)', secs > 0 && secs <= 10, secs + ' s medidos por la app');
  await page.click('#btn-form-clear'); await btn('Descartar').click();
  await page.fill('#f-nombre', 'Nombre escrito a mano');
  await page.setInputFiles('#pick-gallery', F.pack);
  await page.waitForSelector('#autofill-note:not([hidden])', { timeout: 180000 }); await waitIdle();
  check('Lo escrito a mano no se reemplaza: lo leído queda como sugerencia', await page.inputValue('#f-nombre') === 'Nombre escrito a mano' && /CALMADOL/.test(await page.locator('#f-nombre').locator('xpath=..').locator('.sugg').innerText()));
  await page.locator('#f-nombre').locator('xpath=..').locator('.sugg button').click();
  check('Tocar la sugerencia la aplica', await page.inputValue('#f-nombre') === 'CALMADOL');
  await page.click('#btn-form-clear'); await btn('Descartar').click();
  await choose('#photo-empty label[for=pick-gallery]', F.pack2);
  await page.waitForSelector('#autofill-note .bg-read', { timeout: 180000 });
  check('Lote y fechas faltantes se buscan en segundo plano sin bloquear la pantalla', await page.evaluate(() => document.getElementById('busy').hidden) && !!await page.inputValue('#f-nombre'), await page.locator('#autofill-note .bg-read').innerText());
  await page.waitForFunction(() => /No se encontró|Encontrado/.test(document.querySelector('#autofill-note .bg-read').textContent), null, { timeout: 180000 });
  check('Al terminar informa lo que no encontró y no inventa lote ni vencimiento', /No se encontró/.test(await page.locator('#autofill-note .bg-read').innerText()) && await page.inputValue('#f-lote') === '' && await page.inputValue('#f-vencimiento') === '');
  await page.click('#btn-form-clear'); await btn('Descartar').click();
  console.log('\nCasillas impresas L / F / V');
  await page.click('#btn-form-clear'); if (await btn('Descartar').count()) await btn('Descartar').click();
  await choose('#photo-empty label[for=pick-gallery]', F.boxes);
  await page.waitForSelector('#autofill-note:not([hidden])', { timeout: 180000 }); await waitIdle();
  await page.waitForFunction(() => { const b = document.querySelector('#autofill-note .bg-read'); return !b || /No se encontró|Encontrado|Compare|Lectura dudosa/.test(b.textContent); }, null, { timeout: 180000 });
  const bxv = {}; for (const k of ['lote', 'fechaFabricacion', 'vencimiento']) bxv[k] = await page.inputValue('#f-' + k);
  check('Casillas [L] [F] [V]: cada valor va a su campo, sin intercambiarse', bxv.lote === '4B0123' && bxv.fechaFabricacion === '05/2024' && bxv.vencimiento === '05/2027', JSON.stringify(bxv));
  await page.click('#btn-form-clear'); await btn('Descartar').click();
  const b8 = await page.evaluate(async () => {
    const { classifyB8 } = await import('./js/glyphs.js'); let ok = 0, wrong = 0, none = 0;
    for (const font of ['Arial', 'monospace', 'Courier New', 'DejaVu Sans']) for (const size of [24, 40, 64]) {
      const c = document.createElement('canvas'); c.width = size * 3; c.height = size * 1.6; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.fillStyle = '#333'; x.font = `${size}px ${font}`;
      x.fillText('B', size * 0.2, size * 1.2); x.fillText('8', size * 1.6, size * 1.2);
      for (const [ch, x0] of [['B', size * 0.2], ['8', size * 1.6]]) { const k = classifyB8(c, { x0, y0: size * 0.25, x1: x0 + x.measureText(ch).width, y1: size * 1.3 }); if (k === ch) ok++; else if (k == null) none++; else wrong++; }
    }
    return { ok, wrong, none };
  });
  check('B y 8 por la forma: nunca se confunden (si la forma no es clara, queda para revisión)', b8.wrong === 0 && b8.ok >= b8.none * 3, JSON.stringify(b8));
  console.log('\nEscáner en vivo (cámara simulada)');
  await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 720; c.height = 1280; const x = c.getContext('2d');
    const draw = () => { x.fillStyle = '#f2efe8'; x.fillRect(0, 0, 720, 1280); x.fillStyle = '#111'; x.font = 'bold 64px Arial'; x.fillText('CALMADOL 500 mg', 70, 500);
      x.font = 'bold 52px monospace'; x.fillText('LOTE: AB12345', 70, 590); x.fillText('VENCE: 05/2027', 70, 670); x.fillRect(0, 1270, 720 * Math.random(), 2); };
    draw(); setInterval(draw, 100);
    const stream = c.captureStream(10);
    navigator.mediaDevices.getUserMedia = async () => stream;
  });
  await page.click('#photo-empty .btn-live');
  await page.waitForSelector('.live video');
  const tl = Date.now();
  await page.waitForFunction(() => /Listo: nombre, lote y vencimiento/.test(document.querySelector('.live-status')?.textContent || ''), null, { timeout: 120000 });
  const chipsLive = await page.locator('.live-list').innerText();
  check('En vivo: nombre, lote y vencimiento se confirman leyéndolos varias veces', /Lote: AB12345/.test(chipsLive) && /Vencimiento: 05\/2027/.test(chipsLive), `${((Date.now() - tl) / 1000).toFixed(1)} s · ` + chipsLive.replace(/\n/g, ' | '));
  await page.locator('.live-actions .btn.primary').click();
  await page.waitForSelector('.live', { state: 'detached' }); await page.waitForSelector('#photo-box:not([hidden])');
  check('«Usar datos» llena el formulario, guarda una foto del escaneo y apaga la cámara', await page.inputValue('#f-lote') === 'AB12345' && await page.inputValue('#f-vencimiento') === '05/2027' && /CALMADOL/.test(await page.inputValue('#f-nombre')));
  await page.click('#btn-form-clear'); await btn('Descartar').click();
  await setAuto(false);
  console.log('\nGeneral');
  const ovf = await page.evaluate(async () => { const out = []; for (const v of ['inicio', 'registrar', 'historial', 'rotulos', 'respaldo', 'config']) { location.hash = '#' + v; await new Promise(r => setTimeout(r, 150)); if (document.documentElement.scrollWidth > innerWidth + 1) out.push(v); } return out; });
  check('Ninguna pantalla se desborda horizontalmente en teléfono (412 px)', ovf.length === 0, ovf.join(','));
  const small = await page.evaluate(() => [...document.querySelectorAll('.btn,.tabbar a,.tile')].filter(b => b.offsetParent && b.getBoundingClientRect().height < 40).length);
  check('Botones con altura táctil ≥ 40 px', small === 0, small + ' pequeños');
  const realErr = errors.filter(e => !/Failed to load resource|net::ERR_INTERNET_DISCONNECTED/.test(e));
  check('Sin errores de JavaScript durante toda la sesión', realErr.length === 0, realErr.slice(0, 3).join(' | '));

  await browser.close(); server.close();
  console.log(`\nResultado: ${results.length - failed} de ${results.length} comprobaciones correctas.`);
  if (process.argv.includes('--md')) fs.writeFileSync(path.join(ROOT, 'docs', 'resultado-pruebas.md'), `# Resultado de las pruebas automáticas\n\nEjecución: ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC · Chromium ${browser.version()} · emulación Pixel 7 (Android).\n\n| Estado | Comprobación | Detalle |\n|---|---|---|\n` + results.map(r => `| ${r[0].trim()} | ${r[1]} | ${String(r[2]).replace(/\|/g, '\\|').slice(0, 300)} |`).join('\n') + `\n\n**${results.length - failed} de ${results.length} correctas.**\n`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('ERROR DE PRUEBA:', e); process.exit(2); });
