import { randomBytes } from 'node:crypto';
import { buildApp } from '../app.js';
import { loadConfig } from '../config/env.js';
import { createDb } from '../db/client.js';

/**
 * Crea una cuenta y una droguería de DEMOSTRACIÓN con datos SIMULADOS (todos rotulados "simulado").
 * La clave se genera al azar y se imprime una sola vez. No usar en producción.
 */
const config = loadConfig({ ...process.env, LOG_LEVEL: 'warn' });
if (config.NODE_ENV === 'production' && process.env.SEED_DEMO !== 'true') {
  console.error('seed:demo no se ejecuta en producción salvo que se defina SEED_DEMO=true de forma explícita.');
  process.exit(1);
}

const { pool } = createDb(config.DATABASE_URL);
const app = await buildApp(config, pool);
const email = process.argv[2] ?? process.env.DEMO_EMAIL ?? 'demo@ejemplo.test';
const password = process.env.DEMO_PASSWORD || randomBytes(12).toString('base64url');
const existing = await pool.query('SELECT 1 FROM users WHERE lower(email) = lower($1)', [email]);
if (existing.rowCount) {
  console.log(`La cuenta de demostración ${email} ya existe: no se vuelve a sembrar.`);
  await app.close();
  await pool.end();
  process.exit(0);
}
const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
let cookie = '';

async function call(method: 'GET' | 'POST', url: string, payload?: unknown): Promise<any> {
  const res = await app.inject({ method, url: `/api/v1${url}`, payload: payload as object, headers: cookie ? { cookie } : {} });
  const c = res.cookies.find((x) => x.name === 'farmix_sid');
  if (c) cookie = `farmix_sid=${c.value}`;
  if (res.statusCode >= 400) throw new Error(`${method} ${url} → ${res.statusCode}: ${res.body}`);
  return res.json();
}

try {
  await call('POST', '/auth/register', { email, password, fullName: 'Usuario de demostración (simulado)', acceptPrivacy: true });
} catch (e) {
  console.error(`No se pudo crear ${email}: ${(e as Error).message}\nSi ya existe, use otro correo: npm run seed:demo -- otro@ejemplo.test`);
  await app.close();
  await pool.end();
  process.exit(1);
}

const d = (await call('POST', '/drugstores', { name: 'Droguería de demostración (datos simulados)', isDemo: true, employeeCount: 4 })).drugstore.id as string;
const P = `/drugstores/${d}`;

// Vencimientos: vencidos sin gestionar, próximos, vigentes, devuelto a proveedor, destruido y con avería.
const products = [
  ['Amoxicilina 500 mg cápsulas (simulado)', 'SIM-001', -20, 40, 1200, 'pendiente'],
  ['Acetaminofén 500 mg tabletas (simulado)', 'SIM-002', -3, 12, 350, 'pendiente'],
  ['Jarabe expectorante (simulado)', 'SIM-003', 15, 8, 2800, 'pendiente'],
  ['Vitamina C 500 mg (simulado)', 'SIM-004', 45, 30, 900, 'pendiente'],
  ['Crema dermatológica (simulado)', 'SIM-005', 200, 25, 1500, 'pendiente'],
  ['Gotas oftálmicas (simulado)', 'SIM-006', -30, 6, 2000, 'devuelto_proveedor'],
  ['Antigripal (simulado)', 'SIM-007', -50, 10, 800, 'destruccion_gestor'],
  ['Suero oral (simulado)', 'SIM-008', 90, 5, 1100, 'averia_deterioro'],
] as const;
for (const [productName, batch, off, quantity, unitCost, destination] of products) {
  await call('POST', `${P}/expirations`, {
    productName, batch, expiresOn: day(off), quantity, unitCost, destination,
    ...(destination !== 'pendiente' ? { supportRef: `ACTA-SIM-${batch}` } : {}),
  });
}

// Residuos: kilogramos por clasificación en varios meses y un registro en unidades (no se suma a kg).
const waste = [
  ['aprovechable', 3.2, 'kg', 'Cartón y papel', 'Entrega a recicladores'],
  ['no_aprovechable', 5, 'kg', 'Residuos de barrido', 'Ruta de recolección'],
  ['peligroso_quimico', 450, 'g', 'Medicamentos vencidos', 'Entrega a gestor autorizado'],
  ['organico_aprovechable', 1.8, 'kg', 'Restos de comida', 'Compostaje'],
  ['peligroso_quimico', 2, 'kg', 'Medicamentos vencidos', 'Entrega a gestor autorizado'],
  ['riesgo_biologico', 0.4, 'kg', 'Guantes y gasas', 'Guardián y bolsa roja'],
] as const;
for (const [i, [classification, quantity, unit, wasteType, handling]] of waste.entries()) {
  await call('POST', `${P}/waste-records`, { recordedOn: day(-3 - i * 25), classification, quantity, unit, wasteType, handling, ...(classification === 'peligroso_quimico' ? { supportRef: `CERT-SIM-${i + 1}` } : {}) });
}
await call('POST', `${P}/waste-records`, { recordedOn: day(-10), classification: 'peligroso_quimico', quantity: 2, unit: 'unidades', wasteType: 'Luminarias', handling: 'Entrega a gestor autorizado' });

for (const [off, reviewed, correct, location] of [[-2, 20, 15, 'Bodega'], [-12, 25, 21, 'Mostrador'], [-25, 18, 17, 'Bodega']] as const) {
  await call('POST', `${P}/segregation-checks`, { checkedOn: day(off), itemsReviewed: reviewed, itemsCorrect: correct, location, observations: 'Verificación simulada' });
}

// Personal y capacitación: los 4 temas base ya existen. Un soporte de ejemplo (PDF mínimo, simulado).
const workers = [] as string[];
for (const [code, name, cargo] of [['D-1', 'Ana Ejemplo (simulada)', 'Regente de farmacia'], ['D-2', 'Luis Ejemplo (simulado)', 'Auxiliar de droguería'], ['D-3', 'Marta Ejemplo (simulada)', 'Auxiliar de bodega']]) {
  workers.push((await call('POST', `${P}/workers`, { workerCode: code, fullName: name, jobTitle: cargo })).item.id);
}
const topics = (await call('GET', `${P}/training-topics`)).items as { id: string; topicName: string }[];
const topic = (n: string) => topics.find((t) => t.topicName.startsWith(n))!.id;
const boundary = '----farmixdemo';
const pdf = Buffer.from('%PDF-1.4\n% Certificado de capacitación SIMULADO (datos de demostración)\n');
const body = Buffer.concat([
  Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="certificado-simulado.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
  pdf, Buffer.from(`\r\n--${boundary}--\r\n`),
]);
const up = await app.inject({ method: 'POST', url: `/api/v1${P}/files`, payload: body, headers: { 'content-type': `multipart/form-data; boundary=${boundary}`, cookie } });
const fileId = up.json().file.id as string;
await call('POST', `${P}/trainings`, { workerId: workers[0], topicId: topic('Gestión integral'), trainedOn: day(-60), supportFileId: fileId });
await call('POST', `${P}/trainings`, { workerId: workers[0], topicId: topic('Control de vencimientos'), trainedOn: day(-60) });
await call('POST', `${P}/trainings`, { workerId: workers[1], topicId: topic('Gestión integral'), trainedOn: day(-500), validUntil: day(-135), supportFileId: fileId });
await call('POST', `${P}/trainings`, { workerId: workers[2], topicId: topic('Bioseguridad') });

// Diagnóstico: línea base (hace 45 días) y seguimiento (hace 2 días) para ver el antes y después.
const inst = (await call('GET', `${P}/diagnoses/instrument/current`)).instrument;
const id = Object.fromEntries([...inst.obligatorios, ...inst.areas.flatMap((a: { items: unknown[] }) => a.items)].map((i: { code: string; id: string }) => [i.code, i.id]));
const R = (pairs: [string, 'si' | 'no' | 'na'][]) => pairs.map(([c, response]) => ({ itemId: id[c], response }));
const base = await call('POST', `${P}/diagnoses`, { performedOn: day(-45), notes: 'Línea base simulada', answers: R([
  ['OB-01', 'no'], ['OB-02', 'si'], ['OB-03', 'no'], ['OB-04', 'si'], ['OB-05', 'na'], ['OB-06', 'no'], ['OB-07', 'si'], ['OB-08', 'no'], ['OB-09', 'si'], ['OB-10', 'si'], ['OB-11', 'si'],
  ['RES-1', 'no'], ['RES-2', 'si'], ['RES-3', 'no'], ['RES-4', 'no'], ['VEN-1', 'si'], ['VEN-2', 'no'], ['VEN-3', 'no'], ['VEN-4', 'no'], ['VEN-5', 'no'],
  ['CAP-1', 'si'], ['CAP-2', 'no'], ['CAP-3', 'no'], ['CAP-4', 'no'], ['MEJ-1', 'no'], ['MEJ-2', 'no'], ['MEJ-3', 'no'], ['MEJ-4', 'no'],
]) });
await call('POST', `${P}/diagnoses`, { performedOn: day(-2), notes: 'Seguimiento simulado', answers: R([
  ['OB-01', 'no'], ['OB-02', 'si'], ['OB-03', 'si'], ['OB-04', 'si'], ['OB-05', 'na'], ['OB-06', 'si'], ['OB-07', 'si'], ['OB-08', 'si'], ['OB-09', 'si'], ['OB-10', 'si'], ['OB-11', 'si'],
  ['RES-1', 'si'], ['RES-2', 'si'], ['RES-3', 'si'], ['RES-4', 'no'], ['VEN-1', 'si'], ['VEN-2', 'si'], ['VEN-3', 'no'], ['VEN-4', 'si'], ['VEN-5', 'si'],
  ['CAP-1', 'si'], ['CAP-2', 'si'], ['CAP-3', 'si'], ['CAP-4', 'no'], ['MEJ-1', 'no'], ['MEJ-2', 'si'], ['MEJ-3', 'si'], ['MEJ-4', 'si'],
]) });
void base;

// Mejoras: nacen de incumplimientos de la línea base (algunas con acción, responsable y fecha por definir).
await call('POST', `${P}/improvement-actions`, { finding: 'Incumplimiento: PGIRASA sin elaborar o sin actualizar (simulado)', correctiveAction: 'Elaborar el PGIRASA según el manual vigente', responsible: 'Ana Ejemplo (simulada)', dueOn: day(30), state: 'en_curso', originItemId: id['OB-01'] });
await call('POST', `${P}/improvement-actions`, { finding: 'Incumplimiento: área de vencidos sin identificar (simulado)', correctiveAction: 'Adecuar y rotular el área de vencidos', responsible: 'Luis Ejemplo (simulado)', dueOn: day(-20), state: 'cerrada', closedOn: day(-10), originItemId: id['OB-03'] });
await call('POST', `${P}/improvement-actions`, { finding: 'Incumplimiento: sin registros de temperatura y humedad (simulado)', correctiveAction: 'Instalar termohigrómetro y registrar a diario', responsible: 'Marta Ejemplo (simulada)', dueOn: day(-5), state: 'cerrada', closedOn: day(-3), originItemId: id['OB-06'] });
await call('POST', `${P}/improvement-actions`, { finding: 'Baja adherencia a los procedimientos de segregación (simulado)', correctiveAction: 'Capacitar al equipo y verificar cada mes con lista de chequeo', responsible: 'Ana Ejemplo (simulada)', dueOn: day(-4) });
await call('POST', `${P}/improvement-actions`, { finding: 'Falta calcular indicadores de gestión (simulado)', originItemId: id['MEJ-1'] });

console.log('\nDatos de demostración SIMULADOS creados.');
console.log(`  Correo:     ${email}`);
console.log(process.env.DEMO_PASSWORD ? '  Contraseña: la definida en DEMO_PASSWORD' : `  Contraseña: ${password}   (se muestra una sola vez)`);
console.log(`  Droguería:  ${d}\n`);
await app.close();
await pool.end();
