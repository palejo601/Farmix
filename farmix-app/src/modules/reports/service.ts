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
  'Las cifras son hipótesis por validar: no demuestran reducción de pérdidas ni cumplimiento normativo.';

const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

export async function management(db: Db, m: Membership, q: { from?: string; to?: string }) {
  const today = await getToday(db);
  const hasta = q.to ?? today;
  const desde = q.from ?? addDays(hasta, -89);
  const [productos, perdidas, residuos, seg, personal, plan, lastList] = await Promise.all([
    expirations.statusCounts(db, m),
    expirations.losses(db, m),
    waste.summary(db, m, { from: desde, to: hasta }),
    segregation.list(db, m, { from: desde, to: hasta, limit: 1, offset: 0 }),
    staff.trainingCounts(db, m),
    actions.counts(db, m),
    diagnoses.list(db, m, { limit: 1, offset: 0 }),
  ]);
  const last = lastList.items[0] ? await diagnoses.get(db, m, lastList.items[0].id) : null;
  return {
    generadoEn: new Date().toISOString(),
    aviso: AVISO,
    periodo: { desde, hasta },
    drugstore: { id: m.drugstore.id, name: m.drugstore.name, city: m.drugstore.city, expiryAlertDays: m.drugstore.expiryAlertDays },
    vencimientos: { productos, perdidaConfirmada: perdidas.perdidaConfirmada, valorEnRiesgo: perdidas.valorEnRiesgo, moneda: perdidas.moneda },
    residuos,
    segregacion: { verificaciones: seg.total, ...seg.resumen },
    personal,
    planDeMejoramiento: plan,
    diagnostico: last
      ? {
          id: last.id, fecha: last.performedOn, versionInstrumento: last.instrument.versionNumber, puntajeGlobal: last.overallScore,
          areas: last.areaScores.map((a) => ({ area: a.area, label: a.label, score: a.score })),
        }
      : null,
  };
}
