// Prueba de extremo a extremo de la interfaz (opcional). Requiere backend en :3000 y `npm run dev` en :5173
// (o BASE_URL del servicio único). Uso: DEMO_PASSWORD=... [DEMO_EMAIL=...] [SHOTS=/ruta] node e2e/ui-smoke.cjs
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
const ok = (n) => { results.push(['OK', n]); console.log('  ✓', n); };
const fail = (n, e) => { results.push(['FALLA', n]); console.log('  ✗', n, '→', String(e).split('\n')[0]); };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, locale: 'es-CO' });
  const page = await ctx.newPage();
  page.setDefaultTimeout(7000);
  page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
  page.on('console', (m) => m.type() === 'error' && !/status of (4\d\d)/.test(m.text()) && problems.push('console: ' + m.text()));
  page.on('response', (r) => r.status() >= 500 && problems.push(`HTTP ${r.status()} ${r.url()}`));
  page.on('dialog', (d) => d.accept());
  const dlg = () => page.getByRole('dialog');
  const shot = async (n) => SHOTS && page.screenshot({ path: `${SHOTS}/${n}.png`, fullPage: true });
  const step = async (name, fn) => { try { await fn(); ok(name); } catch (e) { fail(name, e); await shot('error-' + name.replace(/\W+/g, '_')); await page.keyboard.press('Escape').catch(() => {}); } };
  const nav = (name) => page.getByRole('link', { name, exact: true }).click();
  const stamp = Date.now().toString().slice(-6);
  const hoy = new Date().toISOString().slice(0, 10);
  const dia = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

  await step('login: rechaza credenciales inválidas', async () => {
    await page.goto(BASE + '/login');
    await shot('01-login');
    await page.getByLabel('Correo').fill(EMAIL);
    await page.getByLabel('Contraseña').fill('clave-incorrecta-123');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.getByRole('alert').getByText('Credenciales inválidas').waitFor();
  });
  await step('login y lista de droguerías (demostración marcada como simulada)', async () => {
    await page.getByLabel('Contraseña').fill(PASSWORD);
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.getByRole('heading', { name: 'Mis droguerías' }).waitFor();
    await page.getByText(/DEMOSTRACIÓN \(datos simulados\)/).waitFor();
    await shot('02-droguerias');
  });
  await step('inicio: ciclo Medir · Analizar · Mejorar con alertas', async () => {
    await page.getByText('Droguería de demostración (datos simulados)').first().click();
    await page.getByText('Medir. Analizar. Mejorar.').waitFor();
    await page.getByText(/DATOS SIMULADOS/).first().waitFor();
    await page.getByRole('heading', { name: /Analizar · lo que necesita atención/ }).waitFor();
    await page.getByText('Requisitos obligatorios que cumple').waitFor();
    await page.getByText('Pérdida confirmada').first().waitFor();
    await shot('03-inicio');
  });
  await step('vencimientos: tres cifras y filtros con conteo', async () => {
    await nav('Vencimientos');
    await page.getByRole('heading', { name: 'Vencimientos', level: 1 }).waitFor();
    for (const t of ['Pérdida confirmada', 'En riesgo sin gestionar', 'Devuelto a proveedor']) await page.getByText(t, { exact: true }).first().waitFor();
    await page.getByRole('button', { name: /Vencidos/ }).click();
    await page.getByText(/Vencido hace/).first().waitFor();
    await page.getByRole('button', { name: /Todos/ }).click();
    await shot('04-vencimientos');
  });
  await step('vencimientos: crea producto vencido y lo gestiona', async () => {
    await page.getByRole('button', { name: '+ Producto' }).click();
    await dlg().getByLabel(/^Producto/).fill(`Producto E2E ${stamp} (simulado)`);
    await dlg().getByLabel(/^Lote/).fill(`E2E-${stamp}`);
    await dlg().getByLabel(/^Fecha de vencimiento/).fill(dia(-3));
    await dlg().getByLabel(/^Cantidad/).fill('7');
    await dlg().getByLabel(/^Costo unitario/).fill('1000');
    await dlg().getByRole('button', { name: 'Guardar producto' }).click();
    const card = page.locator('.item', { hasText: `Producto E2E ${stamp}` });
    await card.getByText(/Vencido hace 3 d/).waitFor();
    await card.getByLabel(/^Destino de/).selectOption('destruccion_gestor');
    await card.getByText('Gestionado', { exact: true }).waitFor();
  });
  await step('vencimientos: un duplicado muestra el error de la API', async () => {
    await page.getByRole('button', { name: '+ Producto' }).click();
    await dlg().getByLabel(/^Producto/).fill(`Producto E2E ${stamp} (simulado)`);
    await dlg().getByLabel(/^Lote/).fill(`E2E-${stamp}`);
    await dlg().getByLabel(/^Fecha de vencimiento/).fill('2030-01-01');
    await dlg().getByLabel(/^Cantidad/).fill('1');
    await dlg().getByRole('button', { name: 'Guardar producto' }).click();
    await dlg().getByRole('alert').getByText(/Ya existe un producto/).waitFor();
    await dlg().getByRole('button', { name: 'Cancelar' }).click();
  });
  await step('residuos: medicamento vencido ≠ riesgo biológico; registra y grafica', async () => {
    await nav('Residuos');
    await page.getByRole('heading', { name: 'Residuos', level: 1 }).waitFor();
    await page.getByText('Últimos 6 meses (kg)').waitFor();
    await page.getByRole('button', { name: '+ Registrar residuo' }).click();
    await dlg().getByLabel(/^Clasificación/).selectOption('riesgo_biologico');
    await dlg().getByLabel(/^Cantidad/).fill('1');
    await dlg().getByLabel(/^Origen/).selectOption('medicamento_vencido');
    await dlg().getByRole('button', { name: 'Guardar registro' }).click();
    await dlg().getByRole('alert').getByText(/no se clasifica como riesgo biológico/).waitFor();
    await dlg().getByLabel(/^Clasificación/).selectOption('peligroso_quimico');
    await dlg().getByLabel(/^Tipo de residuo/).fill(`Medicamentos E2E ${stamp}`);
    await dlg().getByLabel(/^Cómo se manejó/).fill('Entrega a gestor autorizado');
    await dlg().getByRole('button', { name: 'Guardar registro' }).click();
    await page.locator('.item', { hasText: `Medicamentos E2E ${stamp}` }).getByText('Peligroso químico').waitFor();
    await shot('05-residuos');
  });
  await step('residuos: unidades no se suman a kg', async () => {
    await page.getByRole('button', { name: '+ Registrar residuo' }).click();
    await dlg().getByLabel(/^Unidad/).selectOption('unidades');
    await dlg().getByLabel(/^Cantidad/).fill('3');
    await dlg().getByLabel(/^Tipo de residuo/).fill(`Luminarias E2E ${stamp}`);
    await dlg().getByRole('button', { name: 'Guardar registro' }).click();
    await page.getByText(/Registros en unidades \(no se suman a kg\)/).waitFor();
  });
  await step('segregación: bien segregados no supera revisados', async () => {
    await page.getByRole('tab', { name: 'Verificación de segregación' }).click();
    await page.getByRole('button', { name: /\+ Nuevo verificación|\+ Nueva verificación/ }).click();
    await dlg().getByLabel(/^Lugar/).fill(`Pasillo E2E ${stamp}`);
    await dlg().getByLabel(/^Elementos revisados/).fill('5');
    await dlg().getByLabel(/^Bien segregados/).fill('9');
    await dlg().getByRole('button', { name: 'Guardar' }).click();
    await dlg().getByRole('alert').getByText(/no pueden superar/).waitFor();
    await dlg().getByLabel(/^Bien segregados/).fill('4');
    await dlg().getByRole('button', { name: 'Guardar' }).click();
    await page.getByRole('row').filter({ hasText: `Pasillo E2E ${stamp}` }).getByText('80%').waitFor();
  });
  await step('personal: trabajador y capacitación con soporte → Capacitado; sin soporte → Sin soporte', async () => {
    await nav('Personal');
    await page.getByRole('button', { name: '+ Trabajador' }).click();
    await dlg().getByLabel(/^Nombre completo/).fill(`Persona E2E ${stamp} (simulada)`);
    await dlg().getByLabel(/^Cargo/).fill('Auxiliar de droguería');
    await dlg().getByRole('button', { name: 'Guardar' }).click();
    const card = page.locator('.pers', { hasText: `Persona E2E ${stamp}` });
    await card.waitFor();
    await card.getByRole('button', { name: /Bioseguridad/ }).click();      // tema pendiente → abre registrar
    await dlg().getByLabel(/^Fecha de la capacitación/).fill(hoy);
    await dlg().getByRole('button', { name: 'Guardar capacitación' }).click();
    await card.getByRole('button', { name: /Bioseguridad.*Sin soporte/ }).waitFor();
    await card.getByRole('button', { name: /Gestión integral de residuos/ }).click();
    await dlg().getByLabel(/^Fecha de la capacitación/).fill(hoy);
    await dlg().getByLabel(/^Soporte: certificado/).setInputFiles({ name: 'certificado.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nsoporte E2E simulado') });
    await dlg().getByRole('button', { name: 'Guardar capacitación' }).click();
    await card.getByRole('button', { name: /Gestión integral de residuos.*Capacitado/ }).waitFor();
    await shot('06-personal');
  });
  await step('diagnóstico: responde obligatorios y madurez, guarda y compara con la línea base', async () => {
    await nav('Diagnóstico');
    await page.getByRole('heading', { name: 'Requisitos obligatorios' }).waitFor();
    await page.getByText(/Res\. 591\/2024; Decreto 780\/2016/).first().waitFor();
    await shot('07-diagnostico-obligatorios');
    await page.locator('.q', { hasText: 'dirección técnica' }).getByRole('button', { name: 'No cumple', exact: true }).click(); // nuevo incumplimiento
    await page.getByRole('tab', { name: 'Madurez' }).click();
    await page.getByRole('heading', { name: 'Madurez de gestión' }).waitFor();
    await page.locator('.q', { hasText: 'Calcula indicadores' }).getByRole('button', { name: 'Cumple', exact: true }).click();
    await page.getByRole('button', { name: 'Guardar diagnóstico' }).click();
    await page.getByText('Antes y después').first().waitFor();
    await page.getByText('Línea base del').waitFor();
    await page.getByText(/La comparación es descriptiva/).waitFor();
    await shot('08-diagnostico-resultados');
  });
  await step('diagnóstico: una mejora nace de un incumplimiento y se mueve en el tablero', async () => {
    await page.getByText(/dirección técnica está a cargo/).waitFor();          // aparece en «Pendientes del último diagnóstico»
    await page.locator('.item', { hasText: 'dirección técnica' }).getByRole('button', { name: '+ Crear mejora' }).click();
    await page.locator('.col h3', { hasText: 'Pendiente' }).waitFor();
    const card = page.locator('.icard', { hasText: 'dirección técnica' });
    await card.getByText('Por definir').waitFor();
    await card.getByRole('button', { name: 'Mover a En curso' }).click();
    await page.getByText('Mejora movida').waitFor();
    await shot('09-mejoras');
  });
  await step('mejoras: nueva mejora cerrada exige fecha (se completa con hoy)', async () => {
    await page.getByRole('button', { name: '+ Nueva mejora' }).click();
    await dlg().getByLabel(/^Problema detectado/).fill(`Hallazgo E2E ${stamp}`);
    await dlg().getByLabel(/^Estado/).selectOption('cerrada');
    await dlg().getByRole('button', { name: 'Guardar' }).click();
    await page.locator('.icard', { hasText: `Hallazgo E2E ${stamp}` }).getByText('Cierre').waitFor();
  });
  await step('reporte: documento con las seis secciones y marca de datos simulados', async () => {
    await nav('Reporte');
    await page.getByRole('heading', { name: 'Reporte de gestión', level: 1 }).first().waitFor();
    for (const s of ['Resumen', 'Diagnóstico', 'Vencimientos y pérdidas', 'Residuos (últimos 6 meses)', 'Capacitación del personal', 'Mejoras']) await page.locator('.doc h3', { hasText: s }).waitFor();
    await page.locator('.doc-demo').waitFor();
    await page.getByText(/FARMIX-REP-\d{8}/).waitFor();
    await shot('10-reporte');
  });
  await step('normativa: marco legal con fuentes oficiales y aviso', async () => {
    await nav('Normativa');
    await page.getByText('Resolución 591 de 2024').first().waitFor();
    await page.getByText('Decreto 766 de 2026').first().waitFor();
    await page.getByText('Pendiente de verificación').first().waitFor();
    await page.getByRole('link', { name: /Consultar fuente oficial/ }).first().waitFor();
    await shot('11-normativa');
  });
  await step('importar: vista previa sin guardar y confirmación', async () => {
    await nav('Importar Excel / CSV');
    const csv = `producto,lote,vencimiento,cantidad,destino\nImportado E2E ${stamp},I-${stamp},${dia(120)},3,pendiente\nMalo,L,no-fecha,1,pendiente\n`;
    await page.setInputFiles('input[type=file]', { name: 'prueba.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
    await page.getByRole('button', { name: 'Ver vista previa' }).click();
    await page.getByText('todavía no se ha guardado nada').waitFor();
    await page.getByRole('row').filter({ hasText: 'Con errores' }).waitFor();
    await page.getByRole('button', { name: /Confirmar e importar 1 filas/ }).click();
    await page.getByText(/Importación confirmada: 1 filas registradas/).waitFor();
  });
  await step('migrar: vista previa, confirmar y revertir', async () => {
    await nav('Migrar datos locales');
    await page.getByRole('button', { name: 'Usar ejemplo' }).click();
    await page.getByRole('button', { name: 'Crear vista previa' }).click();
    await page.getByRole('button', { name: 'Confirmar migración' }).click();
    await page.getByRole('button', { name: 'Revertir migración' }).click();
    await page.getByText('Migración revertida.').waitFor();
  });
  await step('miembros y configuración', async () => {
    await nav('Miembros');
    await page.getByRole('heading', { name: 'Miembros' }).waitFor();
    await page.getByRole('cell', { name: 'Propietario' }).first().waitFor();
    await nav('Configuración');
    await page.getByLabel(/^Número de empleados/).waitFor();
    await shot('12-config');
  });
  await step('cuenta: privacidad, descarga y cierre de sesión', async () => {
    await page.getByRole('button', { name: 'Mi cuenta' }).click();
    await page.getByRole('heading', { name: 'Mi cuenta', exact: true }).waitFor();
    await page.getByText(/aceptado el/).waitFor();
    await page.getByRole('link', { name: 'Descargar mis datos (JSON)' }).waitFor();
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await page.getByRole('heading', { name: 'Ingresar' }).waitFor();
  });
  await step('ruta protegida sin sesión redirige al ingreso', async () => {
    await page.goto(BASE + '/');
    await page.getByRole('heading', { name: 'Ingresar' }).waitFor();
  });
  await step('registro exige aceptar el aviso; la droguería nueva trae los 4 temas base', async () => {
    await page.goto(BASE + '/registro');
    await page.getByLabel('Nombre completo').fill('Persona Nueva');
    await page.getByLabel('Correo').fill(`nuevo${stamp}@ejemplo.test`);
    await page.getByLabel('Contraseña').fill('Contrasena-larga-1');
    if (!(await page.getByRole('button', { name: 'Crear cuenta' }).isDisabled())) throw new Error('el botón debería estar deshabilitado');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await page.getByText(/Todavía no pertenece/).waitFor();
    await page.getByRole('button', { name: '+ Nueva droguería' }).click();
    await dlg().getByLabel('Nombre', { exact: true }).fill(`Droguería nueva ${stamp}`);
    await dlg().getByLabel(/^Número de empleados/).fill('3');
    await dlg().getByRole('button', { name: 'Crear' }).click();
    await page.getByText(`Droguería nueva ${stamp}`).click();
    await nav('Personal');
    await page.getByRole('button', { name: 'Temas' }).click();
    for (const t of ['Gestión integral de residuos (PGIRASA)', 'Control de vencimientos y rotación de lotes', 'Procedimientos del servicio farmacéutico', 'Bioseguridad']) await dlg().getByText(t).waitFor();
    await page.keyboard.press('Escape');
    await shot('13-droguería-nueva');
  });
  await step('móvil: el menú lateral se abre', async () => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.getByRole('button', { name: 'Menú' }).click();
    await page.getByRole('link', { name: 'Vencimientos', exact: true }).click();
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
