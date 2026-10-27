import { useState, type FormEvent } from 'react';
import { api } from '../api';
import { useDrugstore } from '../drugstore';
import { Alert, Bar, Empty, Modal, Spinner, errText, useLoad, useToast } from '../ui';
import { date, num, todayISO } from '../format';

export function DiagnosesPage() {
  const { drugstore } = useDrugstore();
  const P = `/drugstores/${drugstore.id}/diagnoses`;
  const list = useLoad(() => api.get(P), [P]);
  const inst = useLoad(() => api.get(`${P}/instrument/current`), [P]);
  const [editing, setEditing] = useState<null | { id?: string }>(null);

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Diagnóstico</h1>
          <p className="muted">Autoevaluación con instrumento versionado. Puntaje de madurez de 1 a 5 por área.</p>
        </div>
        <button className="primary" disabled={!inst.data} onClick={() => setEditing({})}>+ Nuevo diagnóstico</button>
      </div>
      <Alert kind="warn">El instrumento actual (v{inst.data?.instrument.versionNumber ?? '1'}) es un <b>borrador por validar</b>. Los puntajes son descriptivos y no constituyen concepto ni certificación de cumplimiento normativo.</Alert>
      {list.error && <Alert>{list.error}</Alert>}
      {list.loading ? <Spinner /> : list.data?.items.length === 0 ? <Empty>Aún no hay diagnósticos.</Empty> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Fecha</th><th>Instrumento</th><th>Respondidos</th><th>Madurez global</th><th /></tr></thead>
            <tbody>
              {list.data?.items.map((d: any) => (
                <tr key={d.id}>
                  <td>{date(d.performedOn)}</td><td>v{d.versionNumber}</td><td>{d.answeredCount} de {d.itemCount}</td>
                  <td>{d.overallScore === null ? '—' : `${num(d.overallScore)} / 5`}</td>
                  <td className="actions"><button className="link" onClick={() => setEditing({ id: d.id })}>Abrir</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && inst.data && (
        <Editor base={P} instrument={inst.data.instrument} id={editing.id} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); list.reload(); }} />
      )}
    </section>
  );
}

function Editor({ base, instrument, id, onClose, onSaved }: { base: string; instrument: any; id?: string; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const existing = useLoad(() => (id ? api.get(`${base}/${id}`) : Promise.resolve(null)), [id]);
  const [form, setForm] = useState<{ performedOn: string; notes: string; answers: Record<string, number> } | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const detail = existing.data?.item;
  if (!form && (!id || detail)) {
    setForm({
      performedOn: detail?.performedOn ?? todayISO(),
      notes: detail?.notes ?? '',
      answers: Object.fromEntries((detail?.answers ?? []).map((a: any) => [a.itemId, a.score])),
    });
  }
  const bandOf = (area: string) => detail?.areaScores.find((a: any) => a.area === area);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true); setError('');
    const answers = Object.entries(form.answers).map(([itemId, score]) => ({ itemId, score }));
    try {
      if (id) await api.patch(`${base}/${id}`, { performedOn: form.performedOn, notes: form.notes || null, answers });
      else await api.post(base, { performedOn: form.performedOn, notes: form.notes || null, answers });
      toast('Diagnóstico guardado');
      onSaved();
    } catch (err) { setError(errText(err)); } finally { setSaving(false); }
  }

  return (
    <Modal title={id ? 'Diagnóstico' : 'Nuevo diagnóstico'} onClose={onClose} wide>
      {existing.loading || !form ? <Spinner /> : (
        <form onSubmit={submit}>
          {error && <Alert>{error}</Alert>}
          <p className="muted small">{instrument.title}. Escala: {instrument.escala}. Puede dejar ítems sin responder.</p>
          <div className="form">
            <label>Fecha<input type="date" required max={todayISO()} value={form.performedOn} onChange={(e) => setForm({ ...form, performedOn: e.target.value })} /></label>
            <label>Notas<input maxLength={1000} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
          </div>
          {detail && (
            <div className="card" style={{ margin: '.8rem 0' }}>
              <b>Madurez global: {detail.overallScore === null ? '—' : `${num(detail.overallScore)} / 5`}</b> <span className="muted small">(según lo último guardado)</span>
            </div>
          )}
          {instrument.areas.map((a: any) => {
            const s = bandOf(a.area);
            return (
              <div key={a.area}>
                <h3>{a.label} {s?.score != null && <span className="muted small">· {num(s.score)} / 5</span>}</h3>
                {s?.score != null && <Bar value={s.score} max={5} tone="info" />}
                {a.items.map((it: any) => (
                  <div className="item-q" key={it.id}>
                    <p><span className="muted small">{it.code}</span> {it.prompt}</p>
                    <div className="likert" role="radiogroup" aria-label={it.code}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <label key={n}>
                          <input type="radio" name={it.id} checked={form.answers[it.id] === n} onChange={() => setForm({ ...form, answers: { ...form.answers, [it.id]: n } })} />{n}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
          <div className="form-actions" style={{ marginTop: '1rem' }}>
            <button type="button" onClick={onClose}>Cerrar</button>
            <button className="primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
