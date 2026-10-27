import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, fetchAll } from '../api';
import { atLeast, useDrugstore } from '../drugstore';
import { Alert, Chip, Empty, Kpi, Modal, Spinner, errText, useToast } from '../ui';
import { TRAINING_LABEL, TONE, date, todayISO } from '../format';

const CARGOS = ['Regente de farmacia', 'Químico farmacéutico', 'Auxiliar de droguería', 'Auxiliar de bodega', 'Cajero'];

export function StaffPage() {
  const { drugstore } = useDrugstore();
  const toast = useToast();
  const P = `/drugstores/${drugstore.id}`;
  const canAdmin = atLeast(drugstore.role, 'administrador');
  const [workers, setWorkers] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [filtro, setFiltro] = useState<'todos' | 'aldia' | 'pend'>('todos');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<null | { kind: 'worker'; w?: any } | { kind: 'topics' } | { kind: 'cap'; worker?: string; topic?: string } | { kind: 'ver'; t: any }>(null);

  const load = useCallback(async () => {
    try {
      const [w, t, tr] = await Promise.all([fetchAll(`${P}/workers`), api.get(`${P}/training-topics`), fetchAll(`${P}/trainings`)]);
      setWorkers(w); setTopics(t.items); setTrainings(tr); setError('');
    } catch (e) { setError(errText(e)); } finally { setLoading(false); }
  }, [P]);
  useEffect(() => { void load(); }, [load]);

  const rec = (w: string, t: string) => trainings.find((x) => x.workerId === w && x.topicId === t);
  const estado = (w: string, t: string) => rec(w, t)?.status ?? 'pendiente';
  const resumen = (w: any) => {
    const e = topics.map((t) => estado(w.id, t.id));
    return { total: e.length, ok: e.filter((x) => x === 'vigente').length, pend: e.filter((x) => x === 'pendiente' || x === 'vencida').length, sin: e.filter((x) => x === 'sin_soporte').length };
  };
  const R = workers.map(resumen);
  const kpi = { n: workers.length, alDia: R.filter((r) => r.total > 0 && r.ok === r.total).length, pend: R.reduce((s, r) => s + r.pend, 0), sin: R.reduce((s, r) => s + r.sin, 0) };
  const lista = workers.filter((w) => { const r = resumen(w); return filtro === 'todos' || (filtro === 'aldia' ? r.total > 0 && r.ok === r.total : r.pend + r.sin > 0); });

  return (
    <section>
      <div className="page-head">
        <div><h1>Personal y capacitación</h1><p className="muted">Quién está capacitado en qué, con su soporte (certificado o lista de asistencia). Solo se registran nombre y cargo.</p></div>
        <div className="toolbar">
          <button onClick={() => setModal({ kind: 'topics' })}>Temas</button>
          <button onClick={() => setModal({ kind: 'worker' })}>+ Trabajador</button>
          <button className="primary" onClick={() => setModal({ kind: 'cap' })}>Registrar capacitación</button>
        </div>
      </div>
      {error && <Alert>{error}</Alert>}
      {loading ? <Spinner /> : (
        <>
          <div className="kpis">
            <Kpi value={kpi.n} label="Trabajadores" />
            <Kpi tone="good" value={kpi.alDia} label="Con todas sus capacitaciones al día" />
            <Kpi tone={kpi.pend ? 'warn' : undefined} value={kpi.pend} label="Capacitaciones pendientes o vencidas" />
            <Kpi tone={kpi.sin ? 'bad' : undefined} value={kpi.sin} label="Capacitaciones sin soporte" />
          </div>
          <div className="chips">
            {([['todos', 'Todos'], ['aldia', 'Al día'], ['pend', 'Con pendientes']] as const).map(([k, l]) => <Chip key={k} active={filtro === k} onClick={() => setFiltro(k)}>{l}</Chip>)}
          </div>
          {workers.length === 0 ? <Empty>Aún no hay trabajadores. Agrega a tu equipo para empezar a hacer seguimiento a sus capacitaciones.</Empty> : lista.map((w) => {
            const r = resumen(w);
            return (
              <div className="pers" key={w.id}>
                <div className="pers-h">
                  <div className="pers-av" aria-hidden>{w.fullName.split(' ').map((x: string) => x[0]).slice(0, 2).join('').toUpperCase()}</div>
                  <div className="pers-id"><div className="t" style={{ fontWeight: 700 }}>{w.fullName}</div><div className="muted small">{w.jobTitle ?? 'Sin cargo'} · código {w.workerCode}</div></div>
                  <div className="pers-pct"><b>{r.ok}/{r.total}</b><span>al día</span></div>
                  <button className="link" onClick={() => setModal({ kind: 'worker', w })}>Editar</button>
                </div>
                <div className="progress" aria-hidden><div style={{ width: `${r.total ? (r.ok / r.total) * 100 : 0}%` }} /></div>
                <div className="pers-temas">
                  {topics.map((t) => {
                    const e = estado(w.id, t.id), rg = rec(w.id, t.id);
                    const tone = TONE[e] === 'ok' ? 'ok' : TONE[e] === 'bad' ? 'bad' : e === 'sin_soporte' ? 'warn' : '';
                    return (
                      <button key={t.id} className={`tcap ${tone}`} onClick={() => (rg ? setModal({ kind: 'ver', t: rg }) : setModal({ kind: 'cap', worker: w.id, topic: t.id }))}>
                        <span className="tt">{t.topicName}</span>
                        <span className="ts">{TRAINING_LABEL[e]}{rg?.trainedOn ? ` · ${date(rg.trainedOn)}` : ''}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {trainings.length > 0 && (
            <div className="card" style={{ marginTop: '1rem' }}>
              <h2>Registros de capacitación <span className="muted small">({trainings.length})</span></h2>
              <div className="table-wrap"><table>
                <thead><tr><th>Fecha</th><th>Trabajador</th><th>Tema</th><th>Vigente hasta</th><th>Estado</th><th>Soporte</th></tr></thead>
                <tbody>{trainings.map((t) => (
                  <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => setModal({ kind: 'ver', t })}>
                    <td>{date(t.trainedOn)}</td><td>{t.workerName}</td><td>{t.topicName}</td><td>{date(t.validUntil)}</td>
                    <td><span className={`pill ${TONE[t.status] === 'ok' ? 'ok' : TONE[t.status] === 'bad' ? 'bad' : t.status === 'sin_soporte' ? 'warn' : ''}`}>{TRAINING_LABEL[t.status]}</span></td>
                    <td>{t.supportFileId ? <a href={`/api/v1${P}/files/${t.supportFileId}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>Ver</a> : <span className="muted small">Sin soporte</span>}</td>
                  </tr>))}</tbody>
              </table></div>
            </div>
          )}
          <div className="note">Solo se registran el nombre y el cargo de cada trabajador (no el documento de identidad). Los soportes contienen datos personales: su tratamiento debe cumplir la Ley 1581 de 2012. Esta información sirve para el seguimiento interno y el plan de mejora; no reemplaza los registros que exija la autoridad.</div>
        </>
      )}
      {modal?.kind === 'worker' && <Trabajador base={`${P}/workers`} w={modal.w} count={workers.length} canDelete={canAdmin} onClose={() => setModal(null)} onDone={() => { setModal(null); void load(); }} />}
      {modal?.kind === 'topics' && <Temas base={`${P}/training-topics`} topics={topics} onClose={() => setModal(null)} onChanged={() => void load()} />}
      {modal?.kind === 'cap' && <Capacitacion P={P} workers={workers} topics={topics} trainings={trainings} pre={modal} onClose={() => setModal(null)} onDone={() => { setModal(null); toast('Capacitación guardada'); void load(); }} />}
      {modal?.kind === 'ver' && <Detalle P={P} t={modal.t} canDelete={canAdmin} onClose={() => setModal(null)} onDone={() => { setModal(null); void load(); }} />}
    </section>
  );
}

function Trabajador({ base, w, count, canDelete, onClose, onDone }: { base: string; w?: any; count: number; canDelete: boolean; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [v, setV] = useState({ fullName: w?.fullName ?? '', jobTitle: w?.jobTitle ?? '', workerCode: w?.workerCode ?? `T-${String(count + 1).padStart(3, '0')}` });
  const [error, setError] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      if (w) await api.patch(`${base}/${w.id}`, { fullName: v.fullName, jobTitle: v.jobTitle || null, workerCode: v.workerCode });
      else await api.post(base, { fullName: v.fullName, jobTitle: v.jobTitle || undefined, workerCode: v.workerCode });
      toast(w ? 'Cambios guardados' : 'Trabajador agregado'); onDone();
    } catch (err) { setError(errText(err)); }
  }
  async function retire() {
    if (!window.confirm('¿Retirar a este trabajador? Se archivará con sus capacitaciones (borrado lógico).')) return;
    try { await api.del(`${base}/${w.id}`); toast('Trabajador retirado'); onDone(); } catch (err) { setError(errText(err)); }
  }
  return (
    <Modal title={w ? 'Editar trabajador' : 'Nuevo trabajador'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        {error && <div className="full"><Alert>{error}</Alert></div>}
        <label className="full">Nombre completo<input required minLength={2} maxLength={120} value={v.fullName} onChange={(e) => setV({ ...v, fullName: e.target.value })} /></label>
        <label>Cargo<input list="cargos" maxLength={80} value={v.jobTitle} onChange={(e) => setV({ ...v, jobTitle: e.target.value })} /><datalist id="cargos">{CARGOS.map((c) => <option key={c} value={c} />)}</datalist></label>
        <label>Código interno<input required maxLength={30} value={v.workerCode} onChange={(e) => setV({ ...v, workerCode: e.target.value })} /><small className="muted">Único en la droguería. No se guarda documento de identidad.</small></label>
        <div className="form-actions full">{w && canDelete && <button type="button" className="link danger" onClick={retire}>Retirar</button>}<span style={{ flex: 1 }} /><button type="button" onClick={onClose}>Cancelar</button><button className="primary">Guardar</button></div>
      </form>
    </Modal>
  );
}

function Temas({ base, topics, onClose, onChanged }: { base: string; topics: any[]; onClose: () => void; onChanged: () => void }) {
  const [name, setName] = useState('');
  const [months, setMonths] = useState('12');
  const [error, setError] = useState('');
  async function add(e: FormEvent) {
    e.preventDefault();
    try { await api.post(base, { topicName: name, validityMonths: Number(months) }); setName(''); onChanged(); setError(''); } catch (err) { setError(errText(err)); }
  }
  return (
    <Modal title="Temas de capacitación" onClose={onClose}>
      <p className="muted small" style={{ marginTop: 0 }}>Son los temas en los que cada trabajador debe estar capacitado. Puedes agregar los de tu plan de capacitación.</p>
      <div className="list">{topics.map((t) => <div className="item" key={t.id}><span>{t.topicName}</span><span className="muted small">vigencia {t.validityMonths} meses</span></div>)}</div>
      <form className="form" onSubmit={add} style={{ marginTop: '1rem' }}>
        {error && <div className="full"><Alert>{error}</Alert></div>}
        <label>Nuevo tema<input required minLength={2} maxLength={120} placeholder="Ej.: Atención al usuario" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label>Vigencia (meses)<input type="number" min={1} max={60} value={months} onChange={(e) => setMonths(e.target.value)} /></label>
        <div className="form-actions full"><button className="primary">Agregar tema</button></div>
      </form>
    </Modal>
  );
}

function Capacitacion({ P, workers, topics, trainings, pre, onClose, onDone }: { P: string; workers: any[]; topics: any[]; trainings: any[]; pre: { worker?: string; topic?: string }; onClose: () => void; onDone: () => void }) {
  const [sel, setSel] = useState<string[]>(pre.worker ? [pre.worker] : []);
  const [topic, setTopic] = useState(pre.topic ?? topics[0]?.id ?? '');
  const [fecha, setFecha] = useState(todayISO());
  const [vig, setVig] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!workers.length) return <Modal title="Registrar capacitación" onClose={onClose}><p>Primero agrega un trabajador.</p></Modal>;
  if (!topics.length) return <Modal title="Registrar capacitación" onClose={onClose}><p>Primero agrega un tema.</p></Modal>;

  async function submit(e: FormEvent) {
    e.preventDefault(); setError('');
    if (!sel.length) return setError('Marca al menos un trabajador.');
    if (file && file.size > 5 * 1024 * 1024) return setError('El soporte supera 5 MB.');
    setBusy(true);
    try {
      const supportFileId = file ? (await api.upload(`${P}/files`, file)).file.id : undefined;
      const failed: string[] = [];
      for (const w of sel) {
        const existing = trainings.find((t) => t.workerId === w && t.topicId === topic);
        const body: Record<string, unknown> = { trainedOn: fecha, ...(vig ? { validUntil: vig } : {}), ...(supportFileId ? { supportFileId } : {}) };
        try {
          if (existing) await api.patch(`${P}/trainings/${existing.id}`, body);
          else await api.post(`${P}/trainings`, { workerId: w, topicId: topic, ...body });
        } catch (err) { failed.push(`${workers.find((x) => x.id === w)?.fullName}: ${errText(err)}`); }
      }
      if (failed.length) setError(failed.join(' · ')); else onDone();
    } catch (err) { setError(errText(err)); } finally { setBusy(false); }
  }
  return (
    <Modal title="Registrar capacitación" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        {error && <div className="full"><Alert>{error}</Alert></div>}
        <div className="full"><b>Trabajadores capacitados</b>
          <div className="chk-list">{workers.map((w) => (
            <label className="chk" key={w.id}><input type="checkbox" checked={sel.includes(w.id)} onChange={(e) => setSel(e.target.checked ? [...sel, w.id] : sel.filter((x) => x !== w.id))} /><span><b>{w.fullName}</b> <span className="muted small">{w.jobTitle ?? ''}</span></span></label>
          ))}</div>
          <small className="muted">Si fue una capacitación grupal, marca a todos los asistentes.</small></div>
        <label className="full">Tema<select value={topic} onChange={(e) => setTopic(e.target.value)}>{topics.map((t) => <option key={t.id} value={t.id}>{t.topicName}</option>)}</select></label>
        <label>Fecha de la capacitación<input type="date" required max={todayISO()} value={fecha} onChange={(e) => setFecha(e.target.value)} /></label>
        <label>Vigente hasta (opcional)<input type="date" value={vig} onChange={(e) => setVig(e.target.value)} /><small className="muted">Si la dejas vacía se calcula con la vigencia del tema.</small></label>
        <label className="full">Soporte: certificado o lista de asistencia (PDF o imagen, máx. 5 MB)<input type="file" accept="application/pdf,image/png,image/jpeg" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
        <div className="form-actions full"><button type="button" onClick={onClose}>Cancelar</button><button className="primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar capacitación'}</button></div>
      </form>
    </Modal>
  );
}

function Detalle({ P, t, canDelete, onClose, onDone }: { P: string; t: any; canDelete: boolean; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [error, setError] = useState('');
  async function remove() {
    if (!window.confirm('¿Eliminar este registro de capacitación?')) return;
    try { await api.del(`${P}/trainings/${t.id}`); toast('Registro eliminado'); onDone(); } catch (e) { setError(errText(e)); }
  }
  return (
    <Modal title="Detalle de la capacitación" onClose={onClose}>
      {error && <Alert>{error}</Alert>}
      <dl className="law" style={{ border: 0, padding: 0 }}><dl>
        <dt>Trabajador</dt><dd>{t.workerName}</dd><dt>Tema</dt><dd>{t.topicName}</dd>
        <dt>Fecha</dt><dd>{date(t.trainedOn)}</dd><dt>Vigente hasta</dt><dd>{date(t.validUntil)}</dd>
        <dt>Estado</dt><dd>{TRAINING_LABEL[t.status]}</dd>
        <dt>Soporte</dt><dd>{t.supportFileId ? <a href={`/api/v1${P}/files/${t.supportFileId}`} target="_blank" rel="noreferrer">Descargar soporte</a> : 'Sin soporte'}</dd>
      </dl></dl>
      <div className="form-actions">{canDelete && <button className="link danger" onClick={remove}>Eliminar</button>}<span style={{ flex: 1 }} /><button onClick={onClose}>Cerrar</button></div>
    </Modal>
  );
}
