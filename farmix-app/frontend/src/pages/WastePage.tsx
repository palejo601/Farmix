import { CrudPage, type ColumnDef, type FieldDef } from '../CrudPage';
import { useDrugstore } from '../drugstore';
import { LABELS, date, label, num, todayISO } from '../format';

const CLASS = ['riesgo_biologico', 'peligroso_quimico', 'aprovechable', 'organico_aprovechable', 'no_aprovechable'].map((v) => ({ value: v, label: LABELS[v]! }));

const fields: FieldDef[] = [
  { name: 'recordedOn', label: 'Fecha', type: 'date', required: true, default: todayISO(), max: undefined },
  { name: 'classification', label: 'Clasificación', type: 'select', required: true, options: CLASS },
  { name: 'quantity', label: 'Cantidad', type: 'number', required: true, step: '0.001', min: 0.001 },
  { name: 'unit', label: 'Unidad', type: 'select', required: true, default: 'kg', options: [{ value: 'kg', label: 'Kilogramos (kg)' }, { value: 'g', label: 'Gramos (g)' }] },
  { name: 'origin', label: 'Origen', type: 'select', nullable: true, options: [{ value: 'medicamento_vencido', label: 'Medicamento vencido' }, { value: 'otro', label: 'Otro' }], help: 'Un medicamento vencido no se clasifica como riesgo biológico.' },
  { name: 'notes', label: 'Notas', type: 'textarea', nullable: true, maxLength: 500 },
];

const columns: ColumnDef[] = [
  { header: 'Fecha', cell: (r) => date(r.recordedOn) },
  { header: 'Clasificación', cell: (r) => label(r.classification) },
  { header: 'Cantidad', className: 'num', cell: (r) => `${num(r.quantity, 3)} ${r.unit}` },
  { header: 'Origen', cell: (r) => label(r.origin) },
  { header: 'Notas', cell: (r) => r.notes ?? '' },
];

export function WastePage() {
  const { drugstore } = useDrugstore();
  return (
    <CrudPage
      title="Residuos"
      singular="registro"
      subtitle="Registro por fecha, clasificación, cantidad y unidad."
      base={`/drugstores/${drugstore.id}/waste-records`}
      fields={fields}
      columns={columns}
      filters={[{ name: 'classification', label: 'Clasificación', options: CLASS }]}
      validate={(v) =>
        v.origin === 'medicamento_vencido' && v.classification === 'riesgo_biologico' ? 'Un medicamento vencido no se clasifica como riesgo biológico.'
        : v.recordedOn > todayISO() ? 'La fecha no puede ser futura.' : null
      }
    />
  );
}
