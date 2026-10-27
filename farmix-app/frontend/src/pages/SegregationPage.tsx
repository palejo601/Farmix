import { useState } from 'react';
import { api } from '../api';
import { CrudPage, type ColumnDef, type FieldDef } from '../CrudPage';
import { useDrugstore } from '../drugstore';
import { Bar, useLoad } from '../ui';
import { date, num, todayISO } from '../format';

const fields: FieldDef[] = [
  { name: 'checkedOn', label: 'Fecha', type: 'date', required: true, default: todayISO() },
  { name: 'location', label: 'Lugar', type: 'text', required: true, maxLength: 120, placeholder: 'Bodega, mostrador…' },
  { name: 'itemsReviewed', label: 'Elementos revisados', type: 'number', required: true, min: 1, step: '1' },
  { name: 'itemsCorrect', label: 'Bien segregados', type: 'number', required: true, min: 0, step: '1' },
  { name: 'observations', label: 'Observaciones', type: 'textarea', nullable: true, maxLength: 500 },
];

const tone = (p: number) => (p >= 90 ? 'ok' : p >= 70 ? 'warn' : 'bad');
const columns: ColumnDef[] = [
  { header: 'Fecha', cell: (r) => date(r.checkedOn) },
  { header: 'Lugar', cell: (r) => r.location },
  { header: 'Revisados', className: 'num', cell: (r) => r.itemsReviewed },
  { header: 'Bien segregados', className: 'num', cell: (r) => r.itemsCorrect },
  { header: '% correcto', cell: (r) => <div style={{ minWidth: 110 }}><b>{num(r.percentCorrect)}%</b><Bar value={r.percentCorrect} tone={tone(r.percentCorrect)} /></div> },
  { header: 'Observaciones', cell: (r) => r.observations ?? '' },
];

export function SegregationPage() {
  const { drugstore } = useDrugstore();
  const base = `/drugstores/${drugstore.id}/segregation-checks`;
  const [tick, setTick] = useState(0);
  const { data } = useLoad(() => api.get(`${base}?limit=1`), [base, tick]);
  const r = data?.resumen;
  return (
    <CrudPage
      title="Segregación"
      singular="verificación"
      subtitle="Porcentaje correcto = bien segregados ÷ revisados × 100, calculado al consultar."
      base={base}
      fields={fields}
      columns={columns}
      onChanged={() => setTick((t) => t + 1)}
      validate={(v) => (Number(v.itemsCorrect) > Number(v.itemsReviewed) ? 'Los bien segregados no pueden superar los revisados.' : v.checkedOn > todayISO() ? 'La fecha no puede ser futura.' : null)}
      header={r && (
        <div className="cards">
          <div className="card"><div className="k">Porcentaje correcto (todas las verificaciones)</div><div className="v">{r.porcentajeCorrecto === null ? '—' : `${num(r.porcentajeCorrecto)}%`}</div><div className="s">{r.bienSegregados} de {r.revisados} elementos · dato descriptivo</div></div>
        </div>
      )}
    />
  );
}
