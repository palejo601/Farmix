import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { atLeast, useDrugstore } from '../drugstore';
import { Alert, Badge, Empty, Kpi, Modal, Spinner, Tag, errText, useLoad, useToast } from '../ui';
import { AVISO_LEGAL, date, label, todayISO } from '../format';

type Seg = 'obligatorios' | 'madurez' | 'resultados' | 'mejoras';
type Resp = 'si' | 'no' | 'na';
const SEGS: [Seg, string][] = [['obligatorios', 'Obligatorios'], ['madurez', 'Madurez'], ['resultados', 'Resultados'], ['mejoras', 'Mejoras']];

/** Misma regla que calcula el servidor (se usa solo para la vista previa mientras se responde). */
const areaScore = (answers: (Resp | undefined)[]) => {
  const si = answers.filter((r) => r === 'si').length;
  const no = answers.filter((r) => r === 'no').length;
  return si + no ? Math.max(1, Math.round((si / (si + no)) * 4) + 1) : null;
};

export function DiagnosticoPage() {
  const { drugstore } = useDrugstore();
  const [params, setParams] = useSearchParams();
  const seg = (SEGS.find(([k]) => k === params.get('v'))?.[0] ?? 'obligatorios') as Seg;
  const P = `/drugstores/${drugstore.id}`;
  const inst = useLoad(() => api.get(`${P}/diagnoses/instrument/current`), [P]);
  const list = useLoad(() => api.get(`${P}/diagnoses?limit=200`), [P]);
  const acts = useLoad(() => api.get(`${P}/improvement-actions?limit=200`), [P]);
  const go = (v: Seg) => setParams({ v });

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Diagnóstico</h1>
          <p className="muted">Autoevaluación orientativa del manejo de residuos y vencimientos, con apoyo al PGIRASA. Requisitos obligatorios y madurez de gestión.</p>
        </div>
      </div>
      <div className="seg" role="tablist">
        {SEGS.map(([k, l]) => <button key={k} role="tab" aria-selected={seg === k} className={seg === k ? 'active' : ''} onClick={() => go(k)}>{l}</button>)}
      </div>
      {(inst.error || list.error) && <Alert>{inst.error || list.error}</Alert>}
      {inst.loading || list.loading ? <Spinner /> : !inst.data ? null : (
        <>
          {(seg === 'obligatorios' || seg === 'madurez') && (
            <Preguntas key={seg} seg={seg} instrument={inst.data.instrument} latest={list.data?.items[0]} total={list.data?.total ?? 0}
              onSaved={() => { list.reload(); go('resultados'); }} />
          )}
          {seg === 'resultados' && <Resultados instrument={inst.data.instrument} items={list.data?.items ?? []} actions={acts.data?.items ?? []} onNew={() => go('obligatorios')} onChanged={acts.reload} goMejoras={() => go('mejoras')} />}
          {seg === 'mejoras' && <Mejoras instrument={inst.data.instrument} actions={acts.data?.items ?? []} loading={acts.loading} reload={acts.reload} />}
        </>
      )}
    </section>
  );
}

// ───────────── Preguntas (obligatorios / madurez) ─────────────
function Preguntas({ seg, instrument, latest, total, onSaved }: { seg: 'obligatorios' | 'madurez'; instrument: any; latest?: any; total: number; onSaved: () => void }) {
  const { drugstore } = useDrugstore();
  const toast = useToast();
  const key = `farmix:borrador:${drugstore.id}`;
  const [draft, setDraft] = useState<Record<string, Resp>>(() => {
    try { return JSON.parse(localStorage.getItem(key) ?? '{}'); } catch { return {}; }
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const oblig = seg === 'obligatorios';

  // Primer uso: parte de las respuestas del último diagnóstico guardado (como el prototipo).
  useEffect(() => {
    if (localStorage.getItem(key) !== null || !latest) return;
    api.get(`/drugstores/${drugstore.id}/diagnoses/${latest.id}`).then((r) => {
      const seed: Record<string, Resp> = {};
      for (const a of r.item.answers) if (a.response) seed[a.itemId] = a.response;
      setDraft(seed);
    }).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latest?.id]);

  const set = (id: string, v: Resp) => {
    const next = { ...draft };
    if (next[id] === v) delete next[id]; else next[id] = v;
    setDraft(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* sin almacenamiento */ }
  };
  const ids: string[] = oblig ? instrument.obligatorios.map((o: any) => o.id) : instrument.areas.flatMap((a: any) => a.items.map((i: any) => i.id));
  const answered = ids.filter((id) => draft[id]).length;
  const obligSinResponder = instrument.obligatorios.filter((o: any) => !draft[o.id]).length;

  async function save() {
    if (obligSinResponder > 0 && !window.confirm(`Faltan ${obligSinResponder} requisito(s) obligatorio(s) por responder. ¿Guardar de todas formas?`)) return;
    setSaving(true); setError('');
    try {
      const answers = Object.entries(draft).map(([itemId, response]) => ({ itemId, response }));
      await api.post(`/drugstores/${drugstore.id}/diagnoses`, { performedOn: todayISO(), answers });
      toast('Diagnóstico guardado');
      onSaved();
    } catch (e) { setError(errText(e)); } finally { setSaving(false); }
  }

  const Opts = ({ id }: { id: string }) => (
    <div className="opts" role="group">
      {([['si', 'Cumple'], ['no', 'No cumple'], ['na', 'No aplica']] as [Resp, string][]).map(([k, l]) => (
        <button key={k} type="button" aria-pressed={draft[id] === k} className={`opt ${draft[id] === k ? k : ''}`} onClick={() => set(id, k)}>{l}</button>
      ))}
    </div>
  );

  return (
    <div className="card">
      <div className="toolbar">
        <h2 style={{ margin: 0 }}>{oblig ? 'Requisitos obligatorios' : 'Madurez de gestión'}</h2>
        {oblig ? <Tag kind="law">Obligación legal</Tag> : <Tag kind="prop">Propuesta de FARMIX</Tag>}
        <span className="spacer" /><span className="muted small">{answered} de {ids.length} respondidas</span>
      </div>
      <div className="progress" aria-hidden><div style={{ width: `${(answered / ids.length) * 100}%` }} /></div>
      <p className="muted small">{oblig ? 'Exigencias de la norma. Un «No cumple» se muestra como pendiente y no se compensa con los demás.' : 'Buenas prácticas propuestas por FARMIX (no son exigencias legales). Cada área recibe un puntaje de 1 a 5.'}</p>
      {error && <Alert>{error}</Alert>}
      {oblig ? instrument.obligatorios.map((o: any) => (
        <div className="q" key={o.id}><div className="qt">{o.prompt}</div><div className="qf">{o.legalBasis}</div><Opts id={o.id} /></div>
      )) : instrument.areas.map((a: any) => (
        <div key={a.area}>
          <div className="area-head"><b>{a.label}</b><span className="score">{areaScore(a.items.map((i: any) => draft[i.id])) ?? '—'} / 5</span></div>
          {a.items.map((i: any) => <div className="q" key={i.id}><div className="qt">{i.prompt}</div><Opts id={i.id} /></div>)}
        </div>
      ))}
      <div className="note">{AVISO_LEGAL}</div>
      <div className="sticky-save">
        <button className="primary" disabled={saving || Object.keys(draft).length === 0} onClick={save}>
          {saving ? 'Guardando…' : total ? 'Guardar diagnóstico' : 'Guardar línea base'}
        </button>
      </div>
    </div>
  );
}

// ───────────── Resultados ─────────────
function Resultados({ instrument, items, actions, onNew, onChanged, goMejoras }: { instrument: any; items: any[]; actions: any[]; onNew: () => void; onChanged: () => void; goMejoras: () => void }) {
  const { drugstore } = useDrugstore();
  const toast = useToast();
  const latest = items[0];
  const base = items[items.length - 1];
  const detail = useLoad(() => (latest ? api.get(`/drugstores/${drugstore.id}/diagnoses/${latest.id}`) : Promise.resolve(null)), [latest?.id]);
  if (!latest) return <Empty>Todavía no has guardado un diagnóstico. <br /><button className="primary" style={{ marginTop: '.6rem' }} onClick={onNew}>Empezar diagnóstico</button></Empty>;

  const pendientes: any[] = detail.data?.item.obligatorios.noCumple ?? [];
  const hasAction = (itemId: string) => actions.some((a) => a.originItemId === itemId && a.state !== 'cerrada');
  async function crear(o: any) {
    try {
      await api.post(`/drugstores/${drugstore.id}/improvement-actions`, { finding: `Incumplimiento: ${o.prompt.replace(/^¿|\?$/g, '')}`, originItemId: o.itemId });
      toast('Mejora creada'); onChanged(); goMejoras();
    } catch (e) { toast(errText(e), 'error'); }
  }
  const diff = (a: number | null, b: number | null, inverse = false) => {
    if (a === null || b === null) return <td>—</td>;
    const d = Math.round((b - a) * 10) / 10;
    const good = inverse ? d < 0 : d > 0;
    return <td className={d === 0 ? '' : good ? 'up' : 'down'}>{d > 0 ? '+' : ''}{d}</td>;
  };
  const areasAll: string[] = [...new Set<string>([...(base?.areaScores ?? []), ...latest.areaScores].map((a: any) => a.area))];
  const sc = (d: any, area: string) => d.areaScores.find((a: any) => a.area === area)?.score ?? null;
  const o = latest.obligatorios;

  return (
    <>
      <div className="kpis">
        <Kpi tone={o.pendientes ? 'bad' : 'good'} value={`${o.cumple}/${o.aplicables}`} label="Obligatorios que cumple" />
        <Kpi tone={o.pendientes ? 'bad' : 'good'} value={o.pendientes} label="Pendientes por resolver" sub={o.sinResponder ? `${o.sinResponder} sin responder` : undefined} />
        <Kpi value={latest.overallScore ?? '—'} label="Madurez (1 a 5)" />
        <Kpi value={items.length} label="Diagnósticos guardados" />
      </div>
      {items.length > 1 ? (
        <div className="card">
          <h2>Antes y después</h2>
          <p className="muted small">Línea base del {date(base.performedOn)} comparada con el diagnóstico del {date(latest.performedOn)}.</p>
          <div className="table-wrap">
            <table className="cmp">
              <thead><tr><th>Indicador</th><th>Antes</th><th>Ahora</th><th>Cambio</th></tr></thead>
              <tbody>
                <tr><td>Obligatorios que cumple</td><td>{base.obligatorios.cumple}/{base.obligatorios.aplicables}</td><td>{o.cumple}/{o.aplicables}</td>{diff(base.obligatorios.cumple, o.cumple)}</tr>
                <tr><td>Pendientes por resolver</td><td>{base.obligatorios.pendientes}</td><td>{o.pendientes}</td>{diff(base.obligatorios.pendientes, o.pendientes, true)}</tr>
                {areasAll.map((a) => <tr key={a}><td>{label(a)}</td><td>{sc(base, a) ?? '—'}</td><td>{sc(latest, a) ?? '—'}</td>{diff(sc(base, a), sc(latest, a))}</tr>)}
                <tr><td><b>Madurez promedio</b></td><td>{base.overallScore ?? '—'}</td><td>{latest.overallScore ?? '—'}</td>{diff(base.overallScore, latest.overallScore)}</tr>
              </tbody>
            </table>
          </div>
          <div className="note">La comparación es descriptiva: un cambio no demuestra por sí solo que se deba a FARMIX. La reducción real de pérdidas o residuos es una hipótesis por validar.</div>
        </div>
      ) : (
        <div className="card"><h2>Antes y después</h2><p className="muted" style={{ margin: 0 }}>Cuando implementes mejoras, vuelve a responder el diagnóstico y guárdalo: aquí verás la comparación con tu línea base.</p></div>
      )}
      {pendientes.length > 0 && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h2>Pendientes del último diagnóstico</h2>
          <p className="muted small">Conviértelos en mejoras para hacerles seguimiento.</p>
          <div className="list">
            {pendientes.map((p) => (
              <div className="item bad" key={p.itemId}>
                <div><div className="t">{p.prompt}</div><div className="meta">{p.legalBasis}</div></div>
                <div className="right">{hasAction(p.itemId) ? <span className="pill">Mejora creada</span> : <button onClick={() => crear(p)}>+ Crear mejora</button>}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="card" style={{ marginTop: '1rem' }}>
        <h2>Historial</h2>
        <div className="list">
          {items.map((d, i) => (
            <div className="item" key={d.id}>
              <div><div className="t">{i === items.length - 1 ? 'Línea base' : `Seguimiento ${items.length - 1 - i}`}</div>
                <div className="meta">{date(d.performedOn)} · {d.obligatorios.cumple}/{d.obligatorios.aplicables} obligatorios · madurez {d.overallScore ?? '—'}{d.versionNumber < 2 ? ' · instrumento anterior' : ''}</div></div>
            </div>
          ))}
        </div>
      </div>
      <div className="note">{instrument.aviso}</div>
    </>
  );
}

// ───────────── Mejoras (tablero) ─────────────
const ESTADOS = [['pendiente', 'Pendiente'], ['en_curso', 'En curso'], ['cerrada', 'Cerrada']] as const;

function Mejoras({ instrument, actions, loading, reload }: { instrument: any; actions: any[]; loading: boolean; reload: () => void }) {
  const { drugstore } = useDrugstore();
  const toast = useToast();
  const [edit, setEdit] = useState<null | { a?: any }>(null);
  const P = `/drugstores/${drugstore.id}/improvement-actions`;
  const codes = useMemo(() => new Map<string, string>([...instrument.obligatorios, ...instrument.areas.flatMap((a: any) => a.items)].map((i: any) => [i.id, i.code])), [instrument]);

  async function move(a: any, state: string) {
    try {
      await api.patch(`${P}/${a.id}`, { state, ...(state === 'cerrada' ? { closedOn: todayISO() } : {}) });
      toast(state === 'cerrada' ? '¡Mejora cerrada!' : 'Mejora movida'); reload();
    } catch (e) { toast(errText(e), 'error'); }
  }
  return (
    <>
      <div className="toolbar">
        <span className="muted small">{actions.filter((a) => a.state === 'cerrada').length} de {actions.length} mejoras cerradas · toca una tarjeta para editarla</span>
        <span className="spacer" /><button className="primary" onClick={() => setEdit({})}>+ Nueva mejora</button>
      </div>
      {loading && !actions.length ? <Spinner /> : !actions.length ? <Empty>Aún no hay mejoras. Créalas desde los pendientes del diagnóstico o con el botón «Nueva mejora».</Empty> : (
        <div className="board">
          {ESTADOS.map(([st, title], k) => {
            const col = actions.filter((a) => a.state === st);
            return (
              <div className="col" key={st}>
                <h3>{title}<span>{col.length}</span></h3>
                {!col.length && <p className="muted small">Sin mejoras en este estado.</p>}
                {col.map((a) => (
                  <div className={`icard ${a.overdue ? 'late' : ''}`} key={a.id} tabIndex={0} role="button" aria-label={`Editar mejora: ${a.finding}`} onClick={() => setEdit({ a })} onKeyDown={(e) => e.key === 'Enter' && setEdit({ a })}>
                    <div className="flow">
                      <b>Problema</b><span>{a.finding}</span>
                      <b>Acción</b><span>{a.correctiveAction ?? 'Por definir'}</span>
                      <b>Responsable</b><span>{a.responsible ?? 'Sin asignar'}</span>
                      <b>Fecha límite</b><span>{a.dueOn ? date(a.dueOn) : 'Sin fecha'} {a.overdue && <Badge value="vencida" text="Atrasada" />}</span>
                      {a.closedOn && <><b>Cierre</b><span>{date(a.closedOn)}</span></>}
                      {a.originItemId && <><b>Origen</b><span>Requisito {codes.get(a.originItemId) ?? ''}</span></>}
                    </div>
                    {k < 2 && <div className="mv"><button onClick={(ev) => { ev.stopPropagation(); void move(a, ESTADOS[k + 1]![0]); }}>Mover a {ESTADOS[k + 1]![1]}</button></div>}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
      {edit && <EditarMejora base={P} a={edit.a} canDelete={atLeast(drugstore.role, 'administrador')} onClose={() => setEdit(null)} onDone={() => { setEdit(null); reload(); }} />}
    </>
  );
}

function EditarMejora({ base, a, canDelete, onClose, onDone }: { base: string; a?: any; canDelete: boolean; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [v, setV] = useState({ finding: a?.finding ?? '', correctiveAction: a?.correctiveAction ?? '', responsible: a?.responsible ?? '', dueOn: a?.dueOn ?? '', state: a?.state ?? 'pendiente', closedOn: a?.closedOn ?? '' });
  const [error, setError] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault(); setError('');
    const closing = v.state === 'cerrada';
    const body: Record<string, unknown> = {
      finding: v.finding, correctiveAction: v.correctiveAction || null, responsible: v.responsible || null, dueOn: v.dueOn || null,
      state: v.state, closedOn: closing ? v.closedOn || todayISO() : null,
    };
    try {
      if (a) await api.patch(`${base}/${a.id}`, body); else await api.post(base, { ...body, closedOn: closing ? body.closedOn : undefined });
      toast('Mejora guardada'); onDone();
    } catch (err) { setError(errText(err)); }
  }
  async function remove() {
    if (!window.confirm('¿Eliminar esta mejora?')) return;
    try { await api.del(`${base}/${a.id}`); toast('Mejora eliminada'); onDone(); } catch (err) { setError(errText(err)); }
  }
  return (
    <Modal title={a ? 'Editar mejora' : 'Nueva mejora'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        {error && <div className="full"><Alert>{error}</Alert></div>}
        <label className="full">Problema detectado<input required minLength={3} maxLength={500} value={v.finding} onChange={(e) => setV({ ...v, finding: e.target.value })} /></label>
        <label className="full">Qué se va a hacer<input maxLength={500} value={v.correctiveAction} onChange={(e) => setV({ ...v, correctiveAction: e.target.value })} /></label>
        <label>Responsable<input maxLength={120} value={v.responsible} onChange={(e) => setV({ ...v, responsible: e.target.value })} /></label>
        <label>Fecha límite<input type="date" value={v.dueOn} onChange={(e) => setV({ ...v, dueOn: e.target.value })} /></label>
        <label className={v.state === 'cerrada' ? '' : 'full'}>Estado
          <select value={v.state} onChange={(e) => setV({ ...v, state: e.target.value })}>{ESTADOS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        </label>
        {v.state === 'cerrada' && <label>Fecha de cierre<input type="date" max={todayISO()} value={v.closedOn} onChange={(e) => setV({ ...v, closedOn: e.target.value })} /><small className="muted">Si la dejas vacía se usa hoy.</small></label>}
        <div className="form-actions full">
          {a && canDelete && <button type="button" className="link danger" onClick={remove}>Eliminar</button>}
          <span style={{ flex: 1 }} /><button type="button" onClick={onClose}>Cancelar</button><button className="primary">Guardar</button>
        </div>
      </form>
    </Modal>
  );
}

