// Prueba de extremo a extremo de la interfaz (opcional). Requiere backend en :3000 y `npm run dev` en :5173.
// Uso: DEMO_EMAIL=... DEMO_PASSWORD=... node e2e/ui-smoke.cjs   (SHOTS=/ruta para guardar capturas)
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const EMAIL = process.env.DEMO_EMAIL ?? 'demo@ejemplo.test';
const PASSWORD = process.env.DEMO_PASSWORD;
const SHOTS = process.env.SHOTS;
if (!PASSWORD) { console.error('Defina DEMO_PASSWORD (la imprime `npm run seed:demo`).'); process.exit(2); }
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
const problems = [];
const ok = (name) => { results.push(['OK', name]); console.log('  ✓', name); };
const fail = (name, e) => { results.push(['FALLA', name]); console.log('  ✗', name, '→', String(e).split('\n')[0]); };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, locale: 'es-CO' });
  const page = await ctx.newPage();
  page.setDefaultTimeout(6000);
  page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
  page.on('console', (m) => m.type() === 'error' && !/status of (4\d\d)/.test(m.text()) && problems.push('console: ' + m.text()));
  page.on('response', (r) => r.status() >= 500 && problems.push(`HTTP ${r.status()} ${r.url()}`));
  page.on('dialog', (d) => d.accept());
  const dlg = () => page.getByRole('dialog');
  const shot = async (n) => SHOTS && page.screenshot({ path: `${SHOTS}/${n}.png`, fullPage: true });
  const step = async (name, fn) => { try { await fn(); ok(name); } catch (e) { fail(name, e); await shot('error-' + name.replace(/\W+/g, '_')); await page.keyboard.press('Escape').catch(() => {}); } };
  const stamp = Date.now().toString().slice(-6);

  await step('login: rechaza credenciales inválidas', async () => {
    await page.goto(BASE + '/login');
    await shot('01-login');
    await page.getByLabel('Correo').fill(EMAIL);
    await page.getByLabel('Contraseña').fill('clave-incorrecta-123');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.getByRole('alert').getByText('Credenciales inválidas').waitFor();
  });
  await step('login: ingresa y lista droguerías', async () => {
    await page.getByLabel('Contraseña').fill(PASSWORD);
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.getByRole('heading', { name: 'Mis droguerías' }).waitFor();
    await page.getByText('Droguería de demostración (datos simulados)').waitFor();
    await shot('02-droguerias');
  });
  await step('resumen: reporte consolidado', async () => {
    await page.getByText('Droguería de demostración (datos simulados)').click();
    await page.getByRole('heading', { name: 'Vencimientos', level: 3 }).waitFor();
    await page.getByText('hipótesis por validar').first().waitFor();
    await page.getByText('Último diagnóstico').waitFor();
    await shot('03-resumen');
  });
  await step('vencimientos: crea producto y se clasifica', async () => {
    await page.getByRole('link', { name: 'Vencimientos' }).click();
    await page.getByRole('heading', { name: 'Vencimientos', level: 1 }).waitFor();
    await page.getByText('Pérdida confirmada').waitFor();
    await page.getByRole('button', { name: '+ Nuevo producto' }).click();
    await dlg().getByLabel(/^Producto/).fill(`Producto E2E ${stamp} (simulado)`);
    await dlg().getByLabel(/^Lote/).fill(`E2E-${stamp}`);
    const d = new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10);
    await dlg().getByLabel(/^Fecha de vencimiento/).fill(d);
    await dlg().getByLabel(/^Cantidad/).fill('7');
    await dlg().getByLabel(/^Costo unitario/).fill('1000');
    await dlg().getByRole('button', { name: 'Guardar' }).click();
    const row = page.getByRole('row').filter({ hasText: `Producto E2E ${stamp}` });
    await row.getByText('Vencido', { exact: true }).waitFor();
    await shot('04-vencimientos');
  });
  await step('vencimientos: gestionar cambia el estado', async () => {
    const row = page.getByRole('row').filter({ hasText: `Producto E2E ${stamp}` });
    await row.getByRole('button', { name: 'Editar' }).click();
    await dlg().getByLabel(/^Destino/).selectOption('devolucion_proveedor');
    await dlg().getByRole('button', { name: 'Guardar' }).click();
    await row.getByText('Gestionado', { exact: true }).waitFor();
  });
  await step('vencimientos: duplicado muestra el error de la API', async () => {
    await page.getByRole('button', { name: '+ Nuevo producto' }).click();
    await dlg().getByLabel(/^Producto/).fill(`Producto E2E ${stamp} (simulado)`);
    await dlg().getByLabel(/^Lote/).fill(`E2E-${stamp}`);
    await dlg().getByLabel(/^Fecha de vencimiento/).fill('2030-01-01');
    await dlg().getByLabel(/^Cantidad/).fill('1');
    await dlg().getByRole('button', { name: 'Guardar' }).click();
    await dlg().getByRole('alert').getByText(/Ya existe un producto/).waitFor();
    await dlg().getByRole('button', { name: 'Cancelar' }).click();
  });
  await step('residuos: medicamento vencido ≠ riesgo biológico', async () => {
    await page.getByRole('link', { name: 'Residuos' }).click();
    await page.getByRole('button', { name: '+ Nuevo registro' }).click();
    await dlg().getByLabel(/^Clasificación/).selectOption('riesgo_biologico');
    await dlg().getByLabel(/^Cantidad/).fill('1');
    await dlg().getByLabel(/^Origen/).selectOption('medicamento_vencido');
    await dlg().getByRole('button', { name: 'Guardar' }).click();
    await dlg().getByRole('alert').getByText(/no se clasifica como riesgo biológico/).waitFor();
    await dlg().getByLabel(/^Clasificación/).selectOption('peligroso_quimico');
    await dlg().getByRole('button', { name: 'Guardar' }).click();
    await page.getByRole('row').filter({ hasText: 'Peligroso químico' }).first().waitFor();
    await shot('05-residuos');
  });
  await step('segregación: bien segregados no supera revisados', async () => {
    await page.getByRole('link', { name: 'Segregación' }).click();
    await page.getByRole('button', { name: '+ Nuevo verificación' }).click();
    await dlg().getByLabel(/^Lugar/).fill(`Pasillo E2E ${stamp}`);
    await dlg().getByLabel(/^Elementos revisados/).fill('5');
    await dlg().getByLabel(/^Bien segregados/).fill('9');
    await dlg().getByRole('button', { name: 'Guardar' }).click();
    await dlg().getByRole('alert').getByText(/no pueden superar/).waitFor();
    await dlg().getByLabel(/^Bien segregados/).fill('4');
    await dlg().getByRole('button', { name: 'Guardar' }).click();
    await page.getByRole('row').filter({ hasText: `Pasillo E2E ${stamp}` }).getByText('80%').waitFor();
    await shot('06-segregacion');
  });
  await step('personal: trabajador, tema y capacitación pendiente → vigente', async () => {
    await page.getByRole('link', { name: 'Personal y capacitación' }).click();
    await page.getByRole('button', { name: '+ Nuevo trabajador' }).click();
    await dlg().getByLabel(/^Código interno/).fill(`E${stamp}`);
    await dlg().getByLabel(/^Nombre completo/).fill(`Persona E2E ${stamp} (simulada)`);
    await dlg().getByRole('button', { name: 'Guardar' }).click();
    await page.getByText(`Persona E2E ${stamp}`).waitFor();
    await page.getByRole('tab', { name: 'Temas' }).click();
    await page.getByRole('button', { name: '+ Nuevo tema' }).click();
    await dlg().getByLabel(/^Tema/).fill(`Tema E2E ${stamp}`);
    await dlg().getByRole('button', { name: 'Guardar' }).click();
    await page.getByText(`Tema E2E ${stamp}`).waitFor();
    await page.getByRole('tab', { name: 'Capacitaciones' }).click();
    await page.getByRole('button', { name: '+ Nueva capacitación' }).click().catch(async () => page.getByRole('button', { name: '+ Nuevo capacitación' }).click());
    await dlg().getByLabel(/^Trabajador/).selectOption({ label: `Persona E2E ${stamp} (simulada) (E${stamp})` });
    await dlg().getByLabel(/^Tema/).selectOption({ label: `Tema E2E ${stamp}` });
    await dlg().getByRole('button', { name: 'Guardar' }).click();
    const row = page.getByRole('row').filter({ hasText: `Persona E2E ${stamp}` });
    await row.getByText('Pendiente').waitFor();
    await row.getByRole('button', { name: 'Editar' }).click();
    await dlg().getByLabel(/^Fecha de realización/).fill(new Date().toISOString().slice(0, 10));
    await dlg().getByRole('button', { name: 'Guardar' }).click();
    await row.getByText('Vigente', { exact: true }).waitFor();
    await shot('07-personal');
  });
  await step('plan: una acción cerrada exige fecha de cierre', async () => {
    await page.getByRole('link', { name: 'Plan de mejoramiento' }).click();
    await page.getByRole('button', { name: '+ Nuevo acción' }).click().catch(async () => page.getByRole('button', { name: '+ Nueva acción' }).click());
    await dlg().getByLabel(/^Hallazgo/).fill(`Hallazgo E2E ${stamp}`);
    await dlg().getByLabel(/^Acción/).fill('Acción correctiva E2E');
    await dlg().getByLabel(/^Responsable/).fill('Responsable E2E');
    await dlg().getByLabel(/^Fecha límite/).fill('2030-05-05');
    await dlg().getByLabel(/^Estado/).selectOption('cerrada');
    await dlg().getByRole('button', { name: 'Guardar' }).click();
    await dlg().getByRole('alert').getByText(/exige fecha de cierre/).waitFor();
    await dlg().getByLabel(/^Fecha de cierre/).fill(new Date().toISOString().slice(0, 10));
    await dlg().getByRole('button', { name: 'Guardar' }).click();
    await page.getByRole('row').filter({ hasText: `Hallazgo E2E ${stamp}` }).getByText('Cerrada', { exact: true }).waitFor();
    await shot('08-plan');
  });
  await step('diagnóstico: responde ítems y calcula madurez', async () => {
    await page.getByRole('link', { name: 'Diagnóstico' }).click();
    await page.getByRole('button', { name: '+ Nuevo diagnóstico' }).click();
    await dlg().getByRole('radiogroup', { name: 'RES-01' }).getByLabel('5').check();
    await dlg().getByRole('radiogroup', { name: 'RES-02' }).getByLabel('3').check();
    await dlg().getByRole('button', { name: 'Guardar' }).click();
    await page.getByRole('row').filter({ hasText: '2 de 15' }).first().waitFor();
    await page.getByRole('row').filter({ hasText: '2 de 15' }).first().getByRole('button', { name: 'Abrir' }).click();
    await page.getByText(/Madurez global: 4 \/ 5/).waitFor();
    await shot('09-diagnostico');
    await page.keyboard.press('Escape');
  });
  await step('importar: vista previa sin guardar y confirmación', async () => {
    await page.getByRole('link', { name: 'Importar Excel / CSV' }).click();
    const d = new Date(Date.now() + 120 * 864e5).toISOString().slice(0, 10);
    const csv = `producto,lote,vencimiento,cantidad\nImportado E2E ${stamp},I-${stamp},${d},3\nMalo,L,no-fecha,1\n`;
    await page.setInputFiles('input[type=file]', { name: 'prueba.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
    await page.getByRole('button', { name: 'Ver vista previa' }).click();
    await page.getByText('todavía no se ha guardado nada').waitFor();
    await page.getByRole('row').filter({ hasText: 'Con errores' }).waitFor();
    await shot('10-importar');
    await page.getByRole('button', { name: /Confirmar e importar 1 filas/ }).click();
    await page.getByText(/Importación confirmada: 1 filas registradas/).waitFor();
  });
  await step('migrar: vista previa, confirmar y revertir', async () => {
    await page.getByRole('link', { name: 'Migrar datos locales' }).click();
    await page.getByRole('button', { name: 'Usar ejemplo' }).click();
    await page.getByRole('button', { name: 'Crear vista previa' }).click();
    await page.getByRole('button', { name: 'Confirmar migración' }).click();
    await page.getByRole('button', { name: 'Revertir migración' }).click();
    await page.getByText('Migración revertida.').waitFor();
  });
  await step('miembros y configuración', async () => {
    await page.getByRole('link', { name: 'Miembros' }).click();
    await page.getByRole('heading', { name: 'Miembros' }).waitFor();
    await page.getByRole('cell', { name: 'Propietario' }).first().waitFor();
    await page.getByRole('link', { name: 'Configuración' }).click();
    await page.getByRole('heading', { name: 'Configuración' }).waitFor();
    await shot('11-config');
  });
  await step('cuenta: privacidad, descarga y cierre de sesión', async () => {
    await page.getByRole('button', { name: 'Mi cuenta' }).click();
    await page.getByRole('heading', { name: 'Mi cuenta', exact: true }).waitFor();
    await page.getByText(/aceptado el/).waitFor();
    await page.getByRole('link', { name: 'Descargar mis datos (JSON)' }).waitFor();
    await shot('12-cuenta');
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await page.getByRole('heading', { name: 'Ingresar' }).waitFor();
  });
  await step('ruta protegida sin sesión redirige al ingreso', async () => {
    await page.goto(BASE + '/');
    await page.getByRole('heading', { name: 'Ingresar' }).waitFor();
  });
  await step('registro exige aceptar el aviso de privacidad', async () => {
    await page.goto(BASE + '/registro');
    await page.getByLabel('Nombre completo').fill('Persona Nueva');
    await page.getByLabel('Correo').fill(`nuevo${stamp}@ejemplo.test`);
    await page.getByLabel('Contraseña').fill('Contrasena-larga-1');
    if (!(await page.getByRole('button', { name: 'Crear cuenta' }).isDisabled())) throw new Error('el botón debería estar deshabilitado');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await page.getByRole('heading', { name: 'Mis droguerías' }).waitFor();
    await page.getByText(/Todavía no pertenece/).waitFor();
    await shot('13-cuenta-nueva');
  });
  await step('móvil: el menú lateral se abre', async () => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.getByRole('button', { name: '+ Nueva droguería' }).click();
    await dlg().getByLabel('Nombre').fill(`Droguería móvil ${stamp} (simulada)`);
    await dlg().getByRole('button', { name: 'Crear' }).click();
    await page.getByText(`Droguería móvil ${stamp}`).click();
    await page.getByRole('button', { name: 'Menú' }).click();
    await page.getByRole('link', { name: 'Vencimientos' }).click();
    await page.getByRole('heading', { name: 'Vencimientos', level: 1 }).waitFor();
    await page.waitForTimeout(500);
    await shot('14-movil');
  });

  await browser.close();
  const bad = results.filter((r) => r[0] === 'FALLA').length;
  console.log(`\n${results.length - bad}/${results.length} pasos correctos`);
  if (problems.length) { console.log('Problemas del navegador:'); [...new Set(problems)].forEach((p) => console.log(' -', p)); }
  process.exit(bad || problems.length ? 1 : 0);
})();
