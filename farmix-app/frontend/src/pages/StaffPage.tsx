import { useState } from 'react';
import { api } from '../api';
import { CrudPage, type ColumnDef, type FieldDef, type Opt } from '../CrudPage';
import { useDrugstore } from '../drugstore';
import { Badge } from '../ui';
import { date, todayISO } from '../format';

export function StaffPage() {
  const { drugstore } = useDrugstore();
  const P = `/drugstores/${drugstore.id}`;
  const [tab, setTab] = useState<'workers' | 'topics' | 'trainings'>('workers');
  const workerOpts = async (): Promise<Opt[]> => (await api.get(`${P}/workers?limit=200`)).items.map((w: any) => ({ value: w.id, label: `${w.fullName} (${w.workerCode})` }));
  const topicOpts = async (): Promise<Opt[]> => (await api.get(`${P}/training-topics`)).items.map((t: any) => ({ value: t.id, label: t.topicName }));

  const workerFields: FieldDef[] = [
    { name: 'workerCode', label: 'Código interno', type: 'text', required: true, maxLength: 30, help: 'Único dentro de la droguería. No se guarda documento de identidad.' },
    { name: 'fullName', label: 'Nombre completo', type: 'text', required: true, maxLength: 120 },
    { name: 'jobTitle', label: 'Cargo', type: 'text', nullable: true, maxLength: 80 },
  ];
  const workerCols: ColumnDef[] = [
    { header: 'Código', cell: (r) => r.workerCode },
    { header: 'Nombre', cell: (r) => <b>{r.fullName}</b> },
    { header: 'Cargo', cell: (r) => r.jobTitle ?? '' },
  ];
  const topicFields: FieldDef[] = [
    { name: 'topicName', label: 'Tema', type: 'text', required: true, maxLength: 120 },
    { name: 'validityMonths', label: 'Vigencia (meses)', type: 'number', min: 1, max: 60, step: '1', default: '12' },
    { name: 'description', label: 'Descripción', type: 'textarea', nullable: true, maxLength: 300 },
  ];
  const topicCols: ColumnDef[] = [
    { header: 'Tema', cell: (r) => <b>{r.topicName}</b> },
    { header: 'Vigencia', cell: (r) => `${r.validityMonths} meses` },
    { header: 'Descripción', cell: (r) => r.description ?? '' },
  ];
  const trainFields: FieldDef[] = [
    { name: 'workerId', label: 'Trabajador', type: 'select', required: true, loadOptions: workerOpts, createOnly: true },
    { name: 'topicId', label: 'Tema', type: 'select', required: true, loadOptions: topicOpts, createOnly: true },
    { name: 'trainedOn', label: 'Fecha de realización', type: 'date', nullable: true, help: 'Déjela vacía si la capacitación está pendiente.' },
    { name: 'validUntil', label: 'Vigente hasta', type: 'date', help: 'Si la deja vacía al crear, se calcula según la vigencia del tema.' },
    { name: 'supportFileId', label: 'Soporte (PDF o imagen, máx. 5 MB)', type: 'file', nullable: true },
  ];
  const trainCols: ColumnDef[] = [
    { header: 'Trabajador', cell: (r) => <b>{r.workerName}</b> },
    { header: 'Tema', cell: (r) => r.topicName },
    { header: 'Realizada', cell: (r) => date(r.trainedOn) },
    { header: 'Vigente hasta', cell: (r) => date(r.validUntil) },
    { header: 'Soporte', cell: (r) => (r.supportFileId ? <a href={`/api/v1${P}/files/${r.supportFileId}`} target="_blank" rel="noreferrer">Descargar</a> : '—') },
    { header: 'Estado', cell: (r) => <Badge value={r.status} /> },
  ];

  return (
    <>
      <div className="tabs" role="tablist">
        {([['workers', 'Trabajadores'], ['topics', 'Temas'], ['trainings', 'Capacitaciones']] as const).map(([k, t]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{t}</button>
        ))}
      </div>
      {tab === 'workers' && <CrudPage key="w" title="Trabajadores" singular="trabajador" base={`${P}/workers`} fields={workerFields} columns={workerCols} />}
      {tab === 'topics' && (
        <CrudPage key="t" title="Temas de capacitación" singular="tema" subtitle="Cada tema define cuántos meses dura la vigencia." base={`${P}/training-topics`} fields={topicFields} columns={topicCols} allowEdit={false} allowDelete={false} />
      )}
      {tab === 'trainings' && (
        <CrudPage
          key="c" title="Capacitaciones" singular="capacitación" subtitle="Un registro por trabajador y tema. Estado: pendiente (sin fecha), vigente o vencida según la fecha de vigencia."
          base={`${P}/trainings`} fields={trainFields} columns={trainCols}
          filters={[{ name: 'status', label: 'Estado', options: [{ value: 'vigente', label: 'Vigente' }, { value: 'pendiente', label: 'Pendiente' }, { value: 'vencida', label: 'Vencida' }] }]}
          validate={(v) => (v.trainedOn && v.trainedOn > todayISO() ? 'La fecha de realización no puede ser futura.' : v.validUntil && !v.trainedOn ? 'No puede haber vigencia sin fecha de realización.' : null)}
        />
      )}
    </>
  );
}
