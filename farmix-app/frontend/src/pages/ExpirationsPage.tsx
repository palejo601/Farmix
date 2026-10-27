import { useState } from 'react';
import { api } from '../api';
import { CrudPage, type ColumnDef, type FieldDef } from '../CrudPage';
import { useDrugstore } from '../drugstore';
import { Badge, useLoad } from '../ui';
import { LABELS, date, label, money, num } from '../format';

const DEST = ['pendiente', 'devolucion_proveedor', 'disposicion_final', 'otro'].map((v) => ({ value: v, label: LABELS[v]! }));
const STATUS = ['vigente', 'proximo_a_vencer', 'vencido', 'gestionado'].map((v) => ({ value: v, label: LABELS[v]! }));

const fields: FieldDef[] = [
  { name: 'productName', label: 'Producto', type: 'text', required: true, maxLength: 160 },
  { name: 'batch', label: 'Lote', type: 'text', required: true, maxLength: 60 },
  { name: 'sanitaryRegistry', label: 'Registro sanitario', type: 'text', nullable: true, maxLength: 60, help: 'Texto libre tal como figura en el empaque.' },
  { name: 'holder', label: 'Titular', type: 'text', nullable: true, maxLength: 120 },
  { name: 'expiresOn', label: 'Fecha de vencimiento', type: 'date', required: true },
  { name: 'quantity', label: 'Cantidad (unidades)', type: 'number', required: true, min: 1, max: 1000000, step: '1' },
  { name: 'unitCost', label: 'Costo unitario (COP)', type: 'number', min: 0, step: '0.01' },
  { name: 'destination', label: 'Destino', type: 'select', options: DEST, default: 'pendiente', help: 'Al asignar un destino distinto de «Pendiente» el producto pasa a «Gestionado».' },
];

const columns: ColumnDef[] = [
  { header: 'Producto', cell: (r) => <><b>{r.productName}</b><div className="muted small">Lote {r.batch}{r.sanitaryRegistry ? ` · Reg. ${r.sanitaryRegistry}` : ''}</div></> },
  { header: 'Vence', cell: (r) => <>{date(r.expiresOn)}<div className="muted small">{r.daysLeft >= 0 ? `en ${r.daysLeft} d` : `hace ${-r.daysLeft} d`}</div></> },
  { header: 'Cant.', className: 'num', cell: (r) => num(r.quantity, 0) },
  { header: 'Valor', className: 'num', cell: (r) => money(r.totalCost) },
  { header: 'Destino', cell: (r) => label(r.destination) },
  { header: 'Estado', cell: (r) => <Badge value={r.status} /> },
];

export function ExpirationsPage() {
  const { drugstore } = useDrugstore();
  const base = `/drugstores/${drugstore.id}/expirations`;
  const [tick, setTick] = useState(0);
  const { data: l } = useLoad(() => api.get(`${base}/losses`), [base, tick]);
  return (
    <CrudPage
      title="Vencimientos"
      singular="producto"
      subtitle={<>Un producto es «próximo a vencer» si le faltan menos de <b>{drugstore.expiryAlertDays} días</b> (configurable por droguería).</>}
      base={base}
      fields={fields}
      columns={columns}
      filters={[{ name: 'status', label: 'Estado', options: STATUS }]}
      onChanged={() => setTick((t) => t + 1)}
      header={
        l && (
          <>
            <div className="cards">
              <div className="card"><div className="k">Pérdida confirmada (vencido sin gestionar)</div><div className="v">{money(l.perdidaConfirmada.valor)}</div><div className="s">{l.perdidaConfirmada.productos} productos · {num(l.perdidaConfirmada.unidades, 0)} unidades</div></div>
              <div className="card"><div className="k">Valor en riesgo (próximo a vencer)</div><div className="v">{money(l.valorEnRiesgo.valor)}</div><div className="s">{l.valorEnRiesgo.productos} productos · {num(l.valorEnRiesgo.unidades, 0)} unidades</div></div>
            </div>
            <p className="muted small">{l.aviso}</p>
          </>
        )
      }
    />
  );
}
