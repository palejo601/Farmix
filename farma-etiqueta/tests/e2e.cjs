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
  // Las pruebas cubren todas las lecturas: modo «completo» (la máquina de pruebas tiene 4 núcleos y se detectaría como antigua).
  await ctx.addInitScript(() => { try { if (!localStorage.getItem('perfMode')) localStorage.setItem('perfMode', 'completo'); } catch {} });
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
  check('Códigos de barras solo con el lector del teléfono (sin bibliotecas externas como ZXing)', !fs.existsSync(path.join(ROOT, 'vendor', 'zxing')) && !/zxing/i.test(sw + allJs) && await page.locator('#btn-barcode').count() === 0);
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
  await page.click('#btn-zone'); await page.waitForSelector('.zone-wrap img');
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
  for (const [v, name] of sizes.filter(s => +s[0] >= 0)) {
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
  await page.selectOption('#lb-size', '0'); await page.click('#sh-auto'); await page.waitForTimeout(300);
  { const t = await page.locator('#lb-preview svg').first().textContent(); check('El rótulo incluye el registro sanitario INVIMA', /Reg\. San\..*2019M-0012345/.test(t), (t.match(/Reg\. San\.[^L]*/) || [''])[0]); }
  { // Hoja completa: un rótulo que ocupa la hoja, vertical y horizontal
    const r = [];
    for (const o of ['v', 'h']) {
      await page.selectOption('#lb-size', '-2'); await page.selectOption('#sh-orient', o); await page.waitForTimeout(300);
      r.push(await page.evaluate(() => {
        const w = +document.getElementById('lb-w').value, h = +document.getElementById('lb-h').value, g = document.querySelector('#lb-preview svg g[transform]');
        let out = 0, big = 0; for (const t of g.querySelectorAll('text')) { const b = t.getBBox(); if (b.x < -0.05 || b.x + b.width > w + 0.05 || b.y < -0.05 || b.y + b.height > h + 0.05) out++; big = Math.max(big, b.height); }
        return { w, h, out, big: Math.round(big), err: !document.getElementById('sh-error').hidden, sum: document.getElementById('sh-summary').innerText };
      }));
    }
    check('Tamaño «Hoja completa»: ocupa la hoja A4 en vertical (190 × 277) y horizontal (277 × 190), texto grande y dentro', r[0].w === 190 && r[0].h === 277 && r[1].w === 277 && r[1].h === 190 && !r[0].out && !r[1].out && !r[0].err && !r[1].err && r[0].big >= 15, JSON.stringify(r.map(x => ({ w: x.w, h: x.h, letra_mm: x.big, fuera: x.out }))));
    await page.selectOption('#sh-orient', 'v');
  }
  check('Lista de tamaños según la especificación', JSON.stringify(sizes.filter(s => +s[0] >= 0).map(s => s[1].match(/\d+ × \d+/)[0])) === JSON.stringify(['100 × 70', '70 × 50', '50 × 30', '40 × 20', '30 × 15', '20 × 10', '100 × 50', '150 × 100']) && sizes.some(s => s[0] === '-1') && sizes.some(s => s[0] === '-2'), sizes.map(s => s[1]).join(' · '));
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
  const bxv = {}; for (const k of ['lote', 'fechaFabricacion', 'vencimiento']) bxv[k] = await page.inputValue('#f-' + k) || ((await page.locator('#f-' + k).locator('xpath=..').locator('.sugg button').allInnerTexts())[0] || '').replace(/^Usar «|»$/g, '');
  check('Casillas [L] [F] [V]: cada valor va a su campo (lleno o propuesto), sin intercambiarse', bxv.lote === '4B0123' && bxv.fechaFabricacion === '05/2024' && bxv.vencimiento === '05/2027', JSON.stringify(bxv));
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
  check('B y 8 por la forma: nunca se confunden (si la forma no es clara, queda para revisión)', b8.wrong === 0 && b8.ok >= b8.none * 2, JSON.stringify(b8));
  console.log('\nOtra cara de la caja');
  await page.click('#btn-form-clear'); if (await btn('Descartar').count()) await btn('Descartar').click();
  await choose('#photo-empty label[for=pick-gallery]', F.pack2);
  await page.waitForSelector('#autofill-note:not([hidden])', { timeout: 180000 }); await waitIdle();
  await page.waitForFunction(() => { const b = document.querySelector('#autofill-note .bg-read'); return !b || /No se encontró|Encontrado|Compare|Lectura dudosa/.test(b.textContent); }, null, { timeout: 180000 });
  await page.fill('#f-nombre', 'Nombre escrito a mano');
  const info1 = await page.locator('#photo-info').innerText();
  await choose('#photo-box label[data-after=extra]', F.pack);
  await page.waitForFunction(() => /Otra cara de la caja/.test(document.querySelector('#autofill-note')?.textContent || ''), null, { timeout: 180000 }); await waitIdle();
  const face = { lote: await page.inputValue('#f-lote'), venc: await page.inputValue('#f-vencimiento'), nombre: await page.inputValue('#f-nombre'), info: await page.locator('#photo-info').innerText() };
  check('Otra cara de la caja: completa lote y vencimiento que faltaban, sin cambiar lo escrito ni la foto del registro', face.lote === 'AB12345' && face.venc === '05/2027' && face.nombre === 'Nombre escrito a mano' && face.info === info1, JSON.stringify(face));
  await page.click('#btn-form-clear'); await btn('Descartar').click();
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
  const tUse = Date.now();
  await page.locator('.live-actions .btn.primary').click();
  await page.waitForFunction(() => document.getElementById('f-lote').value === 'AB12345', null, { timeout: 10000 });
  const msUse = Date.now() - tUse;
  check('«Usar datos» pasa los datos al formulario al instante (menos de 1 s)', msUse < 1000, msUse + ' ms');
  await page.waitForSelector('.live', { state: 'detached' }); await page.waitForSelector('#photo-box:not([hidden])');
  check('«Usar datos» llena el formulario, guarda una foto del escaneo y apaga la cámara', await page.inputValue('#f-lote') === 'AB12345' && await page.inputValue('#f-vencimiento') === '05/2027' && /CALMADOL/.test(await page.inputValue('#f-nombre')));
  await page.click('#btn-form-clear'); if (await btn('Descartar').count()) await btn('Descartar').click();
  await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 720; c.height = 1280; const x = c.getContext('2d');
    const draw = () => { x.fillStyle = '#f2efe8'; x.fillRect(0, 0, 720, 1280); x.fillStyle = '#111'; x.font = 'bold 52px monospace';
      x.fillText('LOTE: 6B0985', 90, 570); x.fillText('VENCE: 08/2027', 90, 650); x.fillRect(0, 1270, 720 * Math.random(), 2); };
    draw(); setInterval(draw, 100);
    const stream = c.captureStream(10); navigator.mediaDevices.getUserMedia = async () => stream;
  });
  await page.evaluate(() => { self.BarcodeDetector = class { async detect() { return [{ rawValue: '7702057712938', format: 'ean_13' }]; } }; });
  const tLot = Date.now();
  await page.click('.btn-live-lot'); await page.waitForSelector('.live .live-guide.lot');
  await page.waitForSelector('.live', { state: 'detached', timeout: 60000 });
  const lotScan = { lote: await page.inputValue('#f-lote'), venc: await page.inputValue('#f-vencimiento'), photo: await page.locator('#photo-box').isVisible() };
  check('Escanear lote y fechas: confirma lote y vencimiento y se cierra solo, sin tocar la foto del registro', lotScan.lote === '6B0985' && lotScan.venc === '08/2027' && !lotScan.photo, `${((Date.now() - tLot) / 1000).toFixed(1)} s · ` + JSON.stringify(lotScan));
  check('Escáner en vivo: escribe también el código de barras (con dígito de control válido)', await page.inputValue('#f-codigoBarras') === '7702057712938', await page.inputValue('#f-codigoBarras'));
  // DataMatrix GS1 (lote y vencimiento dentro del código): sin texto legible, todo sale del código en menos de 1 s
  await page.click('#btn-form-clear'); if (await btn('Descartar').count()) await btn('Descartar').click();
  await page.evaluate(() => {
    self.BarcodeDetector = class { async detect() { return [{ rawValue: '0107702057712938172708001041005B', format: 'data_matrix' }]; } };
    const c = document.createElement('canvas'); c.width = 720; c.height = 1280; const x = c.getContext('2d');
    const draw = () => { x.fillStyle = '#e9e4da'; x.fillRect(0, 0, 720, 1280); x.fillRect(0, 1270, 720 * Math.random(), 2); }; draw(); setInterval(draw, 100);
    const stream = c.captureStream(10); navigator.mediaDevices.getUserMedia = async () => stream;
  });
  const tGs = Date.now();
  await page.click('.btn-live-lot'); await page.waitForSelector('.live', { state: 'detached', timeout: 30000 });
  const gs = { ms: Date.now() - tGs, lote: await page.inputValue('#f-lote'), venc: await page.inputValue('#f-vencimiento'), cb: await page.inputValue('#f-codigoBarras') };
  check('Código GS1 (DataMatrix): lote, vencimiento y código de barras exactos y al instante', gs.lote === '41005B' && gs.venc === '08/2027' && gs.cb === '7702057712938' && gs.ms < 2500, JSON.stringify(gs));
  await page.evaluate(() => { delete self.BarcodeDetector; });
  await page.click('#btn-form-clear'); await btn('Descartar').click();
  console.log('\nLector nativo (ML Kit / Apple Vision) — simulado: aquí no hay teléfono');
  const natUnit = await page.evaluate(async () => {
    const { mapNative } = await import('./js/ocr.js'); const { extractFields } = await import('./js/extract.js');
    const W = (text, x0, y0, x1, y1) => ({ text, conf: 95, box: [x0, y0, x1, y1], symbols: [] });
    const L = (angle, ...ws) => ({ text: ws.map(w => w.text).join(' '), conf: 95, angle, box: [Math.min(...ws.map(w => w.box[0])), Math.min(...ws.map(w => w.box[1])), Math.max(...ws.map(w => w.box[2])), Math.max(...ws.map(w => w.box[3]))], words: ws });
    const pick = r => Object.fromEntries(extractFields(mapNative({ engine: 'mlkit', lines: r }).lines).fields.filter(f => ['lote', 'fechaFabricacion', 'vencimiento'].includes(f.field)).map(f => [f.field, f.value]));
    // Solapa con texto vertical (etiquetas abajo, valores arriba), en los dos sentidos de giro
    const flap = a => [L(a, W('Lote', 1460, 640, 1490, 700), W('N.:', 1460, 590, 1490, 630)), L(a, W('Prep.:', 1500, 610, 1530, 700)), L(a, W('Venc.:', 1540, 610, 1570, 700)),
      L(a, W('41005B', 1460, 350, 1490, 470)), L(a, W('02.2024', 1500, 330, 1530, 470)), L(a, W('02.2027', 1540, 330, 1570, 470)), L(0, W('SPASMOMEN', 200, 300, 700, 380))];
    // Etiquetas y valores en renglones separados por columnas, con otro texto a la izquierda
    const cols = [L(0, W('MANTENER', 80, 300, 260, 330), W('FUERA', 270, 300, 380, 330)), L(0, W('Lote:', 800, 300, 880, 330)), L(0, W('5280924', 960, 296, 1150, 326)),
      L(0, W('F.F.:', 800, 340, 870, 370)), L(0, W('SEP/2024', 960, 336, 1170, 366)), L(0, W('F.V.:', 800, 380, 870, 410)), L(0, W('SEP/2026', 960, 376, 1170, 406))];
    const dots = [L(0, W('L:', 1050, 455, 1085, 480), W('S16057', 1100, 455, 1275, 480)), L(0, W('F:', 1050, 482, 1085, 507), W('11/2024', 1100, 482, 1300, 507)), L(0, W('V:', 1050, 509, 1085, 534), W('11/2026', 1100, 509, 1300, 534))];
    return { up: pick(flap(-90)), down: pick(flap(90).map(l => l)), cols: pick(cols), dots: pick(dots) };
  });
  const srt = o => JSON.stringify(Object.keys(o).sort().map(k => [k, o[k]])), eq = (a, b) => srt(a) === srt(b);
  check('Nativo: texto vertical de solapa (Lote N.: / Prep.: / Venc.:) → cada valor con su etiqueta', eq(natUnit.up, { lote: '41005B', fechaFabricacion: '02.2024', vencimiento: '02.2027' }) || eq(natUnit.down, { lote: '41005B', fechaFabricacion: '02.2024', vencimiento: '02.2027' }), JSON.stringify(natUnit.up) + ' / ' + JSON.stringify(natUnit.down));
  check('Nativo: etiquetas y valores en columnas separadas (Lote: / F.F.: / F.V.:)', eq(natUnit.cols, { lote: '5280924', fechaFabricacion: '09/2024', vencimiento: '09/2026' }), JSON.stringify(natUnit.cols));
  check('Nativo: «L: S16057 · F: 11/2024 · V: 11/2026»', eq(natUnit.dots, { lote: 'S16057', fechaFabricacion: '11/2024', vencimiento: '11/2026' }), JSON.stringify(natUnit.dots));
  // Flujo completo con un lector nativo simulado: elegir foto → leer → verificar → llenar
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('mockOcr')) return;
    const W = (text, x0, y0, x1, y1) => ({ text, conf: 95, box: [x0, y0, x1, y1], symbols: [] });
    const L = (...ws) => ({ text: ws.map(w => w.text).join(' '), conf: 95, angle: 0, box: [Math.min(...ws.map(w => w.box[0])), Math.min(...ws.map(w => w.box[1])), Math.max(...ws.map(w => w.box[2])), Math.max(...ws.map(w => w.box[3]))], words: ws });
    self.__ocrCalls = 0;
    self.Capacitor = { Plugins: { NativeOcr: { available: async () => ({ engine: 'mlkit' }), recognize: async () => { self.__ocrCalls++; return { engine: 'mlkit', lines: [L(W('CALMADOL', 80, 80, 700, 170)),
      L(W('Lote:', 800, 300, 880, 330)), L(W('5280924', 960, 296, 1150, 326)), L(W('F.F.:', 800, 340, 870, 370)), L(W('SEP/2024', 960, 336, 1170, 366)), L(W('F.V.:', 800, 380, 870, 410)), L(W('SEP/2026', 960, 376, 1170, 406))] }; } } } };
  });
  await page.evaluate(() => sessionStorage.setItem('mockOcr', '1')); await page.reload(); await page.waitForSelector('#v-registrar:not([hidden])');
  if (await page.inputValue('#f-nombre')) { await page.click('#btn-form-clear'); if (await btn('Descartar').count()) await btn('Descartar').click(); }
  await choose('#photo-empty label[for=pick-gallery]', F.pack);
  await page.waitForSelector('#autofill-note:not([hidden])', { timeout: 60000 }); await waitIdle();
  const natF = {}; for (const k of ['nombre', 'lote', 'fechaFabricacion', 'vencimiento']) natF[k] = await page.inputValue('#f-' + k);
  const natNote = await page.locator('#autofill-note').innerText(), natCalls = await page.evaluate(() => self.__ocrCalls);
  check('Nativo (simulado): la app usa el lector del teléfono, verifica y llena lote y fechas', natF.lote === '5280924' && natF.fechaFabricacion === '09/2024' && natF.vencimiento === '09/2026' && /Google ML Kit/.test(natNote) && natCalls >= 3, JSON.stringify(natF) + ` · ${natCalls} lecturas · ` + natNote.split('\n')[0].slice(0, 90));
  await page.locator('#autofill-note button', { hasText: 'Ver qué leyó la app' }).click(); await page.waitForSelector('.modal pre.raw');
  const diag = await page.locator('.modal pre.raw').innerText();
  check('«Ver qué leyó la app»: muestra el lector usado, el texto leído y la decisión sobre el lote', /lector: Google ML Kit/.test(diag) && /Número de lote: «5280924»/.test(diag) && /Texto leído/.test(diag), diag.split('\n').slice(0, 3).join(' | '));
  await btn('Cerrar').click();
  await btn('Cerrar').count() && await btn('Cerrar').click();
  // Asistente IA (Claude) con la API simulada: aquí no se hace ninguna llamada real.
  let aiReq = null;
  await page.route('https://api.anthropic.com/**', async route => {
    aiReq = { headers: await route.request().allHeaders(), body: JSON.parse(route.request().postData() || '{}') };
    const out = { lote: { valor: '5280924', etiqueta: 'Lote:', certeza: 'alta', nota: '' }, fechaFabricacion: { valor: 'SEP/2024', etiqueta: 'F.F.:', certeza: 'alta', nota: '' }, vencimiento: { valor: 'SEP/2027', etiqueta: 'F.V.:', certeza: 'media', nota: '' }, zona: { x0: 0.5, y0: 0.2, x1: 0.8, y1: 0.4 }, producto: { nombre: { valor: 'CALMADOL', certeza: 'alta' }, principioActivo: { valor: 'Acetaminofén', certeza: 'alta' }, concentracion: { valor: '500 mg', certeza: 'alta' }, formaFarmaceutica: { valor: null, certeza: 'baja' }, presentacion: { valor: null, certeza: 'baja' }, laboratorio: { valor: 'Laboratorios Andinos S.A.', certeza: 'alta' }, registroSanitario: { valor: null, certeza: 'baja' } } };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'msg_test', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [{ type: 'text', text: JSON.stringify(out) }], stop_reason: 'end_turn', stop_details: null, usage: { input_tokens: 1500, output_tokens: 120 } }) });
  });
  await page.evaluate(() => new Promise(r => { const q = indexedDB.open('farma-etiqueta'); q.onsuccess = () => { const t = q.result.transaction('kv', 'readwrite'); t.objectStore('kv').put({ key: 'sk-ant-prueba', enabled: true }, 'aiAssist'); t.oncomplete = () => { q.result.close(); r(); }; }; }));
  await page.click('#btn-form-clear'); if (await btn('Descartar').count()) await btn('Descartar').click();
  await choose('#photo-empty label[for=pick-gallery]', F.pack);
  await page.waitForSelector('#autofill-note:not([hidden])', { timeout: 60000 }); await waitIdle();
  const busyFree = await page.evaluate(() => document.getElementById('busy').hidden);
  await page.waitForFunction(() => { const l = document.querySelector('#autofill-note .ai-line'); return l && !/leyendo/.test(l.textContent); }, null, { timeout: 60000 });
  const ai = {}; for (const k of ['lote', 'fechaFabricacion', 'vencimiento']) ai[k] = await page.inputValue('#f-' + k);
  const aiSug = await page.locator('#f-vencimiento').locator('xpath=..').locator('.sugg button').allInnerTexts();
  const aiImg = aiReq?.body?.messages?.[0]?.content?.find(c => c.type === 'image');
  check('Asistente IA: se llama a Claude con la foto, el modelo por defecto y salida estructurada', aiReq && aiReq.body.model === 'claude-opus-5-5' && aiImg?.source?.media_type === 'image/jpeg' && !!aiReq.body.output_config?.format && /sk-ant-prueba/.test(aiReq.headers['authorization'] || aiReq.headers['x-api-key'] || ''), aiReq ? `${aiReq.body.model} · imagen ${Math.round((aiImg?.source?.data?.length || 0) * 0.75 / 1024)} KB` : 'sin llamada');
  check('Asistente IA: lote y fabricación coinciden con el teléfono → se llenan; el vencimiento difiere → quedan las dos opciones', ai.lote === '5280924' && ai.fechaFabricacion === '09/2024' && ai.vencimiento === '' && aiSug.some(t => /09\/2026/.test(t)) && aiSug.some(t => /09\/2027/.test(t)), JSON.stringify(ai) + ' · ' + aiSug.join(' | '));
  const nImg = (aiReq?.body?.messages?.[0]?.content || []).filter(c => c.type === 'image').length;
  check('Asistente IA: completa también datos del producto que el teléfono no leyó (principio activo)', await page.inputValue('#f-principioActivo') === 'Acetaminofén', await page.inputValue('#f-principioActivo'));
  check('Asistente IA: no bloquea la pantalla mientras lee (el formulario se llena antes con el teléfono)', busyFree);
  check('Asistente IA: recibe la foto completa y la zona del lote ampliada', nImg === 2, nImg + ' imágenes');
  const q = await page.evaluate(async () => {
    const { photoQuality } = await import('./js/photos.js');
    const mk = blur => new Promise(r => { const c = document.createElement('canvas'); c.width = 1600; c.height = 1000; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 1600, 1000); x.filter = blur ? 'blur(6px)' : 'none'; x.fillStyle = '#111'; x.font = '40px Arial';
      for (let i = 0; i < 14; i++) x.fillText('Lote 6B0985  F.FEB2026  V.AGO2027  Reg. INVIMA 2019M', 60, 70 + i * 65); c.toBlob(r, 'image/jpeg', 0.9); });
    return { nitida: await photoQuality(await mk(false)), borrosa: await photoQuality(await mk(true)) };
  });
  check('Calidad de la foto: detecta una foto borrosa y no marca una nítida', !q.nitida.blurry && q.borrosa.blurry, `nítida ${q.nitida.sharp} · borrosa ${q.borrosa.sharp}`);
  await page.unroute('https://api.anthropic.com/**');
  await page.route('https://api.anthropic.com/**', route => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }) }));
  await page.click('#btn-form-clear'); if (await btn('Descartar').count()) await btn('Descartar').click();
  await page.evaluate(() => document.querySelector('#autofill-note').replaceChildren());
  await choose('#photo-empty label[for=pick-gallery]', F.pack);
  await page.waitForFunction(() => { const l = document.querySelector('#autofill-note .ai-line'); return l && !/leyendo/.test(l.textContent); }, null, { timeout: 60000 });
  const e401 = await page.locator('#autofill-note .ai-line').innerText(), lote401 = await page.inputValue('#f-lote');
  check('Asistente IA con clave inválida: mensaje claro y la lectura del teléfono sigue funcionando', /clave de la IA no es válida/.test(e401) && lote401 === '5280924', e401);
  await page.unroute('https://api.anthropic.com/**');
  let calls = 0;
  await page.route('https://api.anthropic.com/**', async route => {
    calls++; const body = JSON.parse(route.request().postData() || '{}'), imgs = body.messages[0].content.filter(c => c.type === 'image').length;
    const C = (valor, certeza) => ({ valor, etiqueta: null, certeza, nota: valor ? '' : 'muy pequeño' });
    const out = imgs === 1 ? { lote: C(null, 'baja'), fechaFabricacion: C(null, 'baja'), vencimiento: C('11/2026', 'media'), zona: { x0: 0.52, y0: 0.4, x1: 0.66, y1: 0.47 }, producto: { nombre: { valor: 'CALMADOL', certeza: 'alta' }, principioActivo: { valor: 'Acetaminofén', certeza: 'alta' }, concentracion: { valor: '500 mg', certeza: 'alta' }, formaFarmaceutica: { valor: null, certeza: 'baja' }, presentacion: { valor: null, certeza: 'baja' }, laboratorio: { valor: 'Laboratorios Andinos S.A.', certeza: 'alta' }, registroSanitario: { valor: null, certeza: 'baja' } } }
                           : { lote: C('S16057', 'alta'), fechaFabricacion: C('11/2024', 'alta'), vencimiento: C('11/2026', 'alta'), zona: null, producto: { nombre: { valor: 'CALMADOL', certeza: 'alta' }, principioActivo: { valor: 'Acetaminofén', certeza: 'alta' }, concentracion: { valor: '500 mg', certeza: 'alta' }, formaFarmaceutica: { valor: null, certeza: 'baja' }, presentacion: { valor: null, certeza: 'baja' }, laboratorio: { valor: 'Laboratorios Andinos S.A.', certeza: 'alta' }, registroSanitario: { valor: null, certeza: 'baja' } } };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'msg_' + calls, type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [{ type: 'text', text: JSON.stringify(out) }], stop_reason: 'end_turn', stop_details: null, usage: { input_tokens: 2000, output_tokens: 150 } }) });
  });
  const loc = await page.evaluate(async () => {
    const { aiReadLotDates } = await import('./js/ai.js');
    const c = document.createElement('canvas'); c.width = 2000; c.height = 1125; const x = c.getContext('2d'); x.fillStyle = '#ddd'; x.fillRect(0, 0, 2000, 1125);
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.9));
    const r = await aiReadLotDates(blob, 'sk-ant-prueba', null); return { lote: r.lote.valor, fab: r.fechaFabricacion.valor, venc: r.vencimiento.valor, zoom: r.zoom };
  });
  check('Asistente IA: si no ve bien el lote, ubica la zona y la relee ampliada (2 llamadas)', calls === 2 && loc.lote === 'S16057' && loc.fab === '11/2024' && loc.zoom, `${calls} llamadas · ` + JSON.stringify(loc));
  await page.unroute('https://api.anthropic.com/**');
  await page.evaluate(() => new Promise(r => { const q = indexedDB.open('farma-etiqueta'); q.onsuccess = () => { const t = q.result.transaction('kv', 'readwrite'); t.objectStore('kv').delete('aiAssist'); t.oncomplete = () => { q.result.close(); r(); }; }; }));
  await page.click('#btn-form-clear'); if (await btn('Descartar').count()) await btn('Descartar').click();
  await page.evaluate(() => sessionStorage.removeItem('mockOcr')); await page.reload(); await page.waitForTimeout(500);
  await setAuto(false);
  const perf = await page.evaluate(async () => { const m = await import('./js/perf.js'); return { low: m.LOW, info: m.deviceInfo() }; });
  await page.goto(URL0 + '#config'); await page.waitForSelector('#cf-perf');
  const perfTxt = await page.locator('#cf-perf-info').innerText();
  check('Rendimiento: modo para teléfonos antiguos configurable y explicado en Configuración', (await page.$$eval('#cf-perf option', o => o.map(x => x.value))).join() === 'auto,rapido,completo' && /núcleos/.test(perfTxt) && perf.low === false, perfTxt);
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
