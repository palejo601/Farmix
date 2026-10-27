import type { Db } from '../../db/client.js';
import { getToday } from '../imports/kinds.js';
import * as actions from '../actions/service.js';
import * as diagnoses from '../diagnoses/service.js';
import * as expirations from '../expirations/service.js';
import * as segregation from '../segregation/service.js';
import * as staff from '../staff/service.js';
import * as waste from '../waste/service.js';
import type { Membership } from '../drugstores/guard.js';

const AVISO =
  'Reporte descriptivo generado a partir de los datos registrados en FARMIX, un producto mínimo viable en estudio. ' +
  'Las cifras son hipótesis por validar: no demuestran reducción de pérdidas ni cumplimiento normativo. ' +
  'FARMIX apoya el registro y el seguimiento del PGIRASA; no lo sustituye ni reemplaza la visita de la autoridad sanitaria o ambiental. ' +
  'Los datos los registra el propio establecimiento y no han sido verificados de forma independiente.';

const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

async function diagSummary(db: Db, m: Membership, offset: number) {
  const l = await diagnoses.list(db, m, { limit: 1, offset });
  const first = l.items[0];
  if (!first) return null;
  const x = await diagnoses.get(db, m, first.id);
  return {
    id: x.id, fecha: x.performedOn, versionInstrumento: x.instrument.versionNumber, puntajeGlobal: x.overallScore,
    obligatorios: {
      cumple: x.obligatorios.cumple, aplicables: x.obligatorios.aplicables, pendientes: x.obligatorios.noCumple.length, sinResponder: x.obligatorios.sinResponder,
      noCumple: x.obligatorios.noCumple.map((o) => ({ code: o.code, prompt: o.prompt, legalBasis: o.legalBasis })),
    },
    areas: x.areaScores.map((a) => ({ area: a.area, label: a.label, score: a.score })),
  };
}

export async function management(db: Db, m: Membership, q: { from?: string; to?: string }) {
  const today = await getToday(db);
  const hasta = q.to ?? today;
  const desde = q.from ?? addDays(hasta, -89);
  const [productos, perdidas, residuos, serie, seg, personal, plan, pendientes, total] = await Promise.all([
    expirations.statusCounts(db, m),
    expirations.losses(db, m),
    waste.summary(db, m, { from: desde, to: hasta }),
    waste.monthlySeries(db, m, 6),
    segregation.list(db, m, { from: desde, to: hasta, limit: 1, offset: 0 }),
    staff.trainingCounts(db, m),
    actions.counts(db, m),
    actions.pending(db, m),
    diagnoses.list(db, m, { limit: 1, offset: 0 }),
  ]);
  const n = total.total;
  const [ultimo, lineaBase] = await Promise.all([diagSummary(db, m, 0), n > 0 ? diagSummary(db, m, n - 1) : Promise.resolve(null)]);
  return {
    generadoEn: new Date().toISOString(),
    codigo: `FARMIX-REP-${today.replace(/-/g, '')}`,
    aviso: AVISO,
    datosSimulados: m.drugstore.isDemo,
    periodo: { desde, hasta },
    drugstore: { id: m.drugstore.id, name: m.drugstore.name, city: m.drugstore.city, expiryAlertDays: m.drugstore.expiryAlertDays, employeeCount: m.drugstore.employeeCount, isDemo: m.drugstore.isDemo },
    vencimientos: { productos, perdidaConfirmada: perdidas.perdidaConfirmada, valorEnRiesgo: perdidas.valorEnRiesgo, devueltoProveedor: perdidas.devueltoProveedor, moneda: perdidas.moneda },
    residuos: { ...residuos, serieMensual: serie },
    segregacion: { verificaciones: seg.total, ...seg.resumen },
    personal,
    planDeMejoramiento: { ...plan, pendientes: pendientes.map((p) => ({ id: p.id, hallazgo: p.hallazgo, accion: p.accion, responsable: p.responsable, fechaLimite: p.fechaLimite, atrasada: p.atrasada })) },
    diagnostico: { lineaBase, ultimo, totalDiagnosticos: n },
  };
}
