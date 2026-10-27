import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, fetchAll } from '../api';
import { atLeast, useDrugstore } from '../drugstore';
import { Alert, Empty, Kpi, Modal, Spinner, errText, useToast } from '../ui';
import { CLASES, COLOR_CLASE, INFO_CLASE, date, kg, label, monthLabel, num, todayISO } from '../format';
import { SegregationPage } from './SegregationPage';

export function WastePage() {
  const [tab, setTab] = useState<'registros' | 'segregacion'>('registros');
  return (
    <>
      <div className="seg" role="tablist">
        <button role="tab" aria-selected={tab === 'registros'} className={tab === 'registros' ? 'active' : ''} onClick={() => setTab('registros')}>Registros de residuos</button>
        <button role="tab" aria-selected={tab === 'segregacion'} className={tab === 'segregacion' ? 'active' : ''} onClick={() => setTab('segregacion')}>Verificación de segregación</button>
      </div>
      {tab === 'registros' ? <Registros /> : <SegregationPage />}
    </>
  );
}

function Registros() {
  const { drugstore } = useDrugstore();
  const toast = useToast();
  const base = `/drugstores/${drugstore.id}/waste-records`;
  const [items, setItems] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [off, setOff] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const canAdmin = atLeast(drugstore.role, 'administrador');

  const load = useCallback(async () => {
    try {
      const [all, rep] = await Promise.all([fetchAll(base), api.get(`/drugstores/${drugstore.id}/reports/management`)]);
      setItems(all); setReport(rep); setError('');
    } catch (e) { setError(errText(e)); } finally { setLoading(false); }
  }, [base, drugstore.id]);
  useEffect(() => { void load(); }, [load]);

  const serie: { mes: string; kg: Record<string, number> }[] = report?.residuos.serieMensual ?? [];
  const actual = serie[serie.length - 1]?.kg ?? {};
  const visibles = CLASES.filter((c) => !off.includes(c));
  const maxMes = Math.max(0.001, ...serie.map((m) => visibles.reduce((s, c) => s + (m.kg[c] ?? 0), 0)));
  const toggle = (c: string) => setOff((o) => (o.includes(c) ? o.filter((x) => x !== c) : o.length < CLASES.length - 1 ? [...o, c] : o));
  const unidades = items.filter((r) => r.unit === 'unidades');

  async function remove(r: any) {
    if (!window.confirm('¿Eliminar este registro? Se archivará (borrado lógico).')) return;
    try { await api.del(`${base}/${r.id}`); toast('Registro eliminado'); void load(); } catch (e) { toast(errText(e), 'error'); }
  }

  return (
    <section>
      <div className="page-head">
        <div><h1>Residuos</h1><p className="muted">Registro por tipo y clasificación (Res. 591 de 2024; colores según la Res. 2184 de 2019, mod. Res. 1344 de 2020). Los kilogramos y las unidades nunca se suman.</p></div>
        <div className="toolbar"><Link to="../importar"><button>Importar</button></Link><button className="primary" onClick={() => setOpen(true)}>+ Registrar residuo</button></div>
      </div>
      {error && <Alert>{error}</Alert>}
      {loading ? <Spinner /> : (
        <>
          <div className="kpis">
            {CLASES.map((c) => (
              <Kpi key={c} value={kg(actual[c] ?? 0)} label={<><i className="cdot" style={{ background: COLOR_CLASE[c] }} />{label(c)} este mes</>} />
            ))}
            {unidades.length > 0 && <Kpi value={unidades.reduce((s, r) => s + r.quantity, 0)} label="Registros en unidades (no se suman a kg)" />}
          </div>
          <div className="card">
            <h2>Últimos 6 meses (kg)</h2>
            {items.length === 0 ? <p className="muted">Aún no hay registros.</p> : (
              <>
                <div className="chart" role="img" aria-label="Kilogramos por mes y clasificación">
                  {serie.map((m) => {
                    const total = visibles.reduce((s, c) => s + (m.kg[c] ?? 0), 0);
                    return (
                      <div className="m" key={m.mes} title={`${m.mes}: ${num(total, 2)} kg`}>
                        <span>{total ? num(total, 1) : ''}</span>
                        <div className="stack">{visibles.map((c) => (m.kg[c] ?? 0) > 0 && <div key={c} className="seg-b" style={{ height: `${((m.kg[c] ?? 0) / maxMes) * 100}%`, background: COLOR_CLASE[c] }} />)}</div>
                        <span>{monthLabel(m.mes)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="legend" aria-label="Mostrar u ocultar clasificaciones">
                  {CLASES.map((c) => <button key={c} className={off.includes(c) ? 'off' : ''} aria-pressed={!off.includes(c)} onClick={() => toggle(c)}><i className="cdot" style={{ background: COLOR_CLASE[c] }} />{label(c)}</button>)}
                </div>
              </>
            )}
          </div>
          <div className="card" style={{ marginTop: '1rem' }}>
            <h2>Cómo separar cada clase</h2>
            <div className="list">
              {CLASES.map((c) => <div key={c}><i className="cdot" style={{ background: COLOR_CLASE[c] }} /><b>{label(c)}.</b> {INFO_CLASE[c]![0]}. <span className="muted">{INFO_CLASE[c]![1]}.</span></div>)}
            </div>
            <p className="muted small">Los medicamentos vencidos no llevan bolsa de color: van al área de vencidos y al gestor autorizado o posconsumo, y no se clasifican como riesgo biológico.</p>
          </div>
          {items.length > 0 && (
            <div className="card" style={{ marginTop: '1rem' }}>
              <h2>Registros</h2>
              <div className="list">
                {items.slice(0, 40).map((r) => (
                  <div className="item" key={r.id}>
                    <div><div className="t">{r.wasteType ?? 'Residuo'}</div>
                      <div className="meta">{date(r.recordedOn)}{r.handling ? ` · ${r.handling}` : ''}{r.supportRef ? ` · Soporte ${r.supportRef}` : ''}{r.origin === 'medicamento_vencido' ? ' · medicamento vencido' : ''}</div></div>
                    <div className="right"><span className="val">{num(r.quantity, 3)} {r.unit}</span>
                      <span className="pill"><i className="cdot" style={{ background: COLOR_CLASE[r.classification] }} />{label(r.classification)}</span>
                      {canAdmin && <button className="link danger" onClick={() => remove(r)}>Eliminar</button>}</div>
                  </div>
                ))}
              </div>
              {items.length > 40 && <p className="muted small">Se muestran los 40 registros más recientes de {items.length}.</p>}
            </div>
          )}
          {items.length === 0 && <Empty>Aún no hay registros de residuos.</Empty>}
        </>
      )}
      {open && <Nuevo base={base} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); toast('Residuo registrado'); void load(); }} />}
    </section>
  );
}

function Nuevo({ base, onClose, onSaved }: { base: string; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState({ wasteType: '', classification: 'aprovechable', recordedOn: todayISO(), quantity: '', unit: 'kg', handling: '', supportRef: '', origin: '' });
  const [error, setError] = useState('');
  const set = (k: string, val: string) => setV((s) => ({ ...s, [k]: val }));
  const info = INFO_CLASE[v.classification]!;
  async function submit(e: FormEvent) {
    e.preventDefault(); setError('');
    if (v.origin === 'medicamento_vencido' && v.classification === 'riesgo_biologico') return setError('Un medicamento vencido no se clasifica como riesgo biológico.');
    if (v.recordedOn > todayISO()) return setError('La fecha no puede ser futura.');
    const body: Record<string, unknown> = { classification: v.classification, recordedOn: v.recordedOn, quantity: Number(v.quantity), unit: v.unit };
    for (const k of ['wasteType', 'handling', 'supportRef', 'origin'] as const) if (v[k]) body[k] = v[k];
    try { await api.post(base, body); onSaved(); } catch (err) { setError(errText(err)); }
  }
  return (
    <Modal title="Registrar residuo" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        {error && <div className="full"><Alert>{error}</Alert></div>}
        <label className="full">Tipo de residuo<input maxLength={120} placeholder="Ej: medicamentos vencidos, cortopunzantes" value={v.wasteType} onChange={(e) => set('wasteType', e.target.value)} /></label>
        <label className="full">Clasificación
          <select value={v.classification} onChange={(e) => set('classification', e.target.value)}>{CLASES.map((c) => <option key={c} value={c}>{label(c)}</option>)}</select>
          <small className="muted"><b>{info[0]}.</b> {info[1]}.</small>
        </label>
        <label>Fecha<input type="date" required max={todayISO()} value={v.recordedOn} onChange={(e) => set('recordedOn', e.target.value)} /></label>
        <label>Cantidad<input type="number" required min={0.001} step="0.001" value={v.quantity} onChange={(e) => set('quantity', e.target.value)} /></label>
        <label>Unidad<select value={v.unit} onChange={(e) => set('unit', e.target.value)}><option value="kg">kg</option><option value="g">g</option><option value="unidades">unidades</option></select></label>
        <label>Origen<select value={v.origin} onChange={(e) => set('origin', e.target.value)}><option value="">—</option><option value="medicamento_vencido">Medicamento vencido</option><option value="otro">Otro</option></select></label>
        <label className="full">Cómo se manejó<input maxLength={200} placeholder="Ej: entrega a gestor autorizado" value={v.handling} onChange={(e) => set('handling', e.target.value)} /></label>
        <label className="full">Soporte (n.º de certificado), si aplica<input maxLength={120} value={v.supportRef} onChange={(e) => set('supportRef', e.target.value)} /></label>
        <div className="form-actions full"><button type="button" onClick={onClose}>Cancelar</button><button className="primary">Guardar registro</button></div>
      </form>
    </Modal>
  );
}
