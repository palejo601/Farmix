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

async function call(method: 'GET' | 'POST', url: string, payload?: unknown) {
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

const d = (await call('POST', '/drugstores', { name: 'Droguería de demostración (datos simulados)' })).drugstore.id as string;
const P = `/drugstores/${d}`;

const products = [
  ['Analgésico simulado', 'SIM-001', -20, 40, 1200],
  ['Antibiótico simulado', 'SIM-002', -3, 12, 3500],
  ['Jarabe simulado', 'SIM-003', 15, 8, 2800],
  ['Vitamina simulada', 'SIM-004', 45, 30, 900],
  ['Crema simulada', 'SIM-005', 200, 25, 1500],
] as const;
for (const [productName, batch, off, quantity, unitCost] of products) {
  await call('POST', `${P}/expirations`, { productName, batch, expiresOn: day(off), quantity, unitCost, sanitaryRegistry: `SIMULADO-${batch}` });
}
await call('POST', `${P}/expirations`, { productName: 'Gotas simuladas', batch: 'SIM-006', expiresOn: day(-30), quantity: 6, unitCost: 2000, destination: 'devolucion_proveedor' });

for (const [i, [classification, quantity, unit]] of ([['aprovechable', 3.2, 'kg'], ['no_aprovechable', 5, 'kg'], ['peligroso_quimico', 450, 'g'], ['organico_aprovechable', 1.8, 'kg'], ['peligroso_quimico', 2, 'kg']] as const).entries()) {
  await call('POST', `${P}/waste-records`, { recordedOn: day(-3 - i * 9), classification, quantity, unit, notes: 'Registro simulado' });
}
for (const [off, reviewed, correct, location] of [[-2, 20, 15, 'Bodega'], [-12, 25, 21, 'Mostrador'], [-25, 18, 17, 'Bodega']] as const) {
  await call('POST', `${P}/segregation-checks`, { checkedOn: day(off), itemsReviewed: reviewed, itemsCorrect: correct, location, observations: 'Verificación simulada' });
}

const workers = [] as string[];
for (const [code, name] of [['D-1', 'Ana Ejemplo (simulada)'], ['D-2', 'Luis Ejemplo (simulado)'], ['D-3', 'Marta Ejemplo (simulada)']]) {
  workers.push((await call('POST', `${P}/workers`, { workerCode: code, fullName: name, jobTitle: 'Auxiliar (simulado)' })).item.id);
}
const t1 = (await call('POST', `${P}/training-topics`, { topicName: 'Manejo de residuos (simulado)', validityMonths: 12 })).item.id;
const t2 = (await call('POST', `${P}/training-topics`, { topicName: 'Control de vencimientos (simulado)', validityMonths: 6 })).item.id;
await call('POST', `${P}/trainings`, { workerId: workers[0], topicId: t1, trainedOn: day(-60) });
await call('POST', `${P}/trainings`, { workerId: workers[1], topicId: t1, trainedOn: day(-500), validUntil: day(-135) });
await call('POST', `${P}/trainings`, { workerId: workers[2], topicId: t2 });

await call('POST', `${P}/improvement-actions`, { finding: 'Falta rotular recipientes (simulado)', correctiveAction: 'Rotular recipientes de segregación', responsible: 'Ana Ejemplo (simulada)', dueOn: day(-4) });
await call('POST', `${P}/improvement-actions`, { finding: 'Vencidos sin destino definido (simulado)', correctiveAction: 'Definir destino de medicamentos vencidos', responsible: 'Luis Ejemplo (simulado)', dueOn: day(20), state: 'en_curso' });
await call('POST', `${P}/improvement-actions`, { finding: 'Sin registro de capacitaciones (simulado)', correctiveAction: 'Registrar capacitaciones con vigencia', responsible: 'Marta Ejemplo (simulada)', dueOn: day(-10), state: 'cerrada', closedOn: day(-2) });

const inst = (await call('GET', `${P}/diagnoses/instrument/current`)).instrument;
const answers = (inst.areas as { items: { id: string }[] }[]).flatMap((a, ai) => a.items.map((it, ii) => ({ itemId: it.id, score: 1 + ((ai * 2 + ii) % 5) })));
await call('POST', `${P}/diagnoses`, { performedOn: day(-1), notes: 'Diagnóstico simulado de demostración', answers });

console.log('\nDatos de demostración SIMULADOS creados.');
console.log(`  Correo:     ${email}`);
console.log(process.env.DEMO_PASSWORD ? '  Contraseña: la definida en DEMO_PASSWORD' : `  Contraseña: ${password}   (se muestra una sola vez)`);
console.log(`  Droguería:  ${d}\n`);
await app.close();
await pool.end();
