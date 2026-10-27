import { CrudPage, type ColumnDef, type FieldDef } from '../CrudPage';
import { useDrugstore } from '../drugstore';
import { Badge } from '../ui';
import { date, todayISO } from '../format';

const STATES = [{ value: 'pendiente', label: 'Pendiente' }, { value: 'en_curso', label: 'En curso' }, { value: 'cerrada', label: 'Cerrada' }];

const fields: FieldDef[] = [
  { name: 'finding', label: 'Hallazgo', type: 'textarea', required: true, maxLength: 500 },
  { name: 'correctiveAction', label: 'Acción', type: 'textarea', required: true, maxLength: 500 },
  { name: 'responsible', label: 'Responsable', type: 'text', required: true, maxLength: 120 },
  { name: 'dueOn', label: 'Fecha límite', type: 'date', required: true },
  { name: 'state', label: 'Estado', type: 'select', required: true, options: STATES, default: 'pendiente' },
  { name: 'closedOn', label: 'Fecha de cierre', type: 'date', nullable: true, showIf: (v) => v.state === 'cerrada', help: 'Obligatoria para cerrar la acción.' },
];

const columns: ColumnDef[] = [
  { header: 'Hallazgo', cell: (r) => <><b>{r.finding}</b><div className="muted small">{r.correctiveAction}</div></> },
  { header: 'Responsable', cell: (r) => r.responsible },
  { header: 'Fecha límite', cell: (r) => <>{date(r.dueOn)} {r.overdue && <Badge value="vencida" text="Atrasada" />}</> },
  { header: 'Cierre', cell: (r) => date(r.closedOn) },
  { header: 'Estado', cell: (r) => <Badge value={r.state} /> },
];

export function ActionsPage() {
  const { drugstore } = useDrugstore();
  return (
    <CrudPage
      title="Plan de mejoramiento"
      singular="acción"
      subtitle="Hallazgo, acción, responsable, fecha límite y estado. Una acción cerrada exige fecha de cierre."
      base={`/drugstores/${drugstore.id}/improvement-actions`}
      fields={fields}
      columns={columns}
      filters={[
        { name: 'state', label: 'Estado', options: STATES },
        { name: 'overdue', label: 'Atraso', options: [{ value: 'true', label: 'Atrasadas' }, { value: 'false', label: 'Al día' }] },
      ]}
      validate={(v) => (v.state === 'cerrada' && !v.closedOn ? 'Una acción cerrada exige fecha de cierre.' : v.closedOn && v.closedOn > todayISO() ? 'La fecha de cierre no puede ser futura.' : null)}
    />
  );
}
