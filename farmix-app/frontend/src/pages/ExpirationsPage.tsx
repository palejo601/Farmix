import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, fetchAll } from '../api';
import { atLeast, useDrugstore } from '../drugstore';
import { Alert, Chip, Empty, Kpi, Modal, Spinner, errText, useToast } from '../ui';
import { DESTINOS, label, date, money, num, todayISO } from '../format';

const FILTROS: [string, string][] = [['todos', 'Todos'], ['vencido', 'Vencidos'], ['proximo_a_vencer', 'Próximos'], ['vigente', 'Vigentes'], ['gestionado', 'Gestionados']];

/** Anillo con los días que faltan: sirve de vistazo (rojo = vencido, ámbar = próximo, verde = vigente). */
function Gauge({ days, status, alert }: { days: number; status: string; alert: number }) {
  const color = status === 'vencido' ? 'var(--bad)' : status === 'proximo_a_vencer' ? '#d99a1c' : status === 'gestionado' ? 'var(--muted)' : 'var(--ok)';
  const frac = status === 'vencido' ? 1 : Math.max(0.04, 1 - Math.min(days, alert * 3) / (alert * 3));
  const r = 17, c = 2 * Math.PI * r;
  return (
    <svg className="gauge" viewBox="0 0 44 44" role="img" aria-label={days < 0 ? `Vencido hace ${-days} días` : `Faltan ${days} días`}>
      <circle cx="22" cy="22" r={r} fill="none" stroke="var(--mute-bg)" strokeWidth="5" />
      <circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${c * frac} ${c}`} transform="rotate(-90 22 22)" />
      <text x="22" y="26" textAnchor="middle" fontSize="12" fontWeight="700" fill="currentColor">{Math.abs(days) > 99 ? '99+' : days}</text>
    </svg>
  );
}

export function ExpirationsPage() {
  const { drugstore, reload: reloadDrugstore } = useDrugstore();
  const toast = useToast();
  const base = `/drugstores/${drugstore.id}/expirations`;
  const [items, setItems] = useState<any[]>([]);
  const [losses, setLosses] = useState<any>(null);
  const [filtro, setFiltro] = useState('todos');
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [alarma, setAlarma] = useState(false);
  const canAdmin = atLeast(drugstore.role, 'administrador');

  const load = useCallback(async () => {
    try {
      const [all, l] = await Promise.all([fetchAll(base), api.get(`${base}/losses`)]);
      setItems(all); setLosses(l); setError('');
    } catch (e) { setError(errText(e)); } finally { setLoading(false); }
  }, [base]);
  useEffect(() => { void load(); }, [load, drugstore.expiryAlertDays]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { todos: items.length, vencido: 0, proximo_a_vencer: 0, vigente: 0, gestionado: 0 };
    items.forEach((x) => { c[x.status] = (c[x.status] ?? 0) + 1; });
    return c;
  }, [items]);
  const q = busca.toLowerCase().trim();
  const shown = items.filter((x) => (filtro === 'todos' || x.status === filtro) && (!q || `${x.productName} ${x.batch}`.toLowerCase().includes(q)));

  async function setDestino(x: any, destination: string) {
    try { await api.patch(`${base}/${x.id}`, { destination }); toast('Destino actualizado'); void load(); } catch (e) { toast(errText(e), 'error'); }
  }
  async function remove(x: any) {
    if (!window.confirm('¿Eliminar este producto? Se archivará (borrado lógico).')) return;
    try { await api.del(`${base}/${x.id}`); toast('Producto eliminado'); void load(); } catch (e) { toast(errText(e), 'error'); }
  }

  return (
    <section>
      <div className="page-head">
        <div><h1>Vencimientos</h1>
          <p className="muted">Cada producto con su lote, fecha y destino final. Aviso con <b>{drugstore.expiryAlertDays} días</b> de anticipación{canAdmin && <> · <button className="link" onClick={() => setAlarma(true)}>cambiar</button></>}.</p></div>
        <div className="toolbar"><Link to="../importar" className="no-print"><button>Importar</button></Link><button className="primary" onClick={() => setOpen(true)}>+ Producto</button></div>
      </div>
      {error && <Alert>{error}</Alert>}
      {losses && (
        <>
          <div className="kpis">
            <Kpi tone={losses.perdidaConfirmada.valor ? 'bad' : undefined} value={money(losses.perdidaConfirmada.valor)} label="Pérdida confirmada" sub="Destrucción o avería" />
            <Kpi tone={losses.valorEnRiesgo.valor ? 'warn' : undefined} value={money(losses.valorEnRiesgo.valor)} label="En riesgo sin gestionar" sub="Vencido o próximo a vencer" />
            <Kpi tone="good" value={money(losses.devueltoProveedor.valor)} label="Devuelto a proveedor" />
          </div>
          <p className="muted small">{losses.aviso}</p>
        </>
      )}
      <div className="toolbar">
        <input className="search" placeholder="Buscar producto o lote" aria-label="Buscar producto o lote" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>
      <div className="chips" role="group" aria-label="Filtrar por estado">
        {FILTROS.map(([k, l]) => <Chip key={k} active={filtro === k} count={counts[k] ?? 0} onClick={() => setFiltro(k)}>{l}</Chip>)}
      </div>
      {loading ? <Spinner /> : shown.length === 0 ? <Empty>{items.length ? 'No hay productos con este filtro.' : 'Aún no hay productos registrados.'}</Empty> : (
        <div className="list">
          {shown.map((x) => {
            const tone = x.status === 'vencido' ? 'bad' : x.status === 'proximo_a_vencer' ? 'warn' : x.status === 'gestionado' ? 'done' : '';
            const pill = x.status === 'vencido' ? ['bad', `Vencido hace ${-x.daysLeft} d`] : x.status === 'proximo_a_vencer' ? ['warn', x.daysLeft === 0 ? 'Vence hoy' : `Vence en ${x.daysLeft} d`] : x.status === 'gestionado' ? ['', 'Gestionado'] : ['ok', `Vigente · ${x.daysLeft} d`];
            return (
              <div className={`item ${tone}`} key={x.id}>
                <div className="vrow">
                  <Gauge days={x.daysLeft} status={x.status} alert={drugstore.expiryAlertDays} />
                  <div style={{ minWidth: 0 }}>
                    <div className="t">{x.productName}</div>
                    <div className="meta">Lote {x.batch} · {num(x.quantity, 0)} und · vence {date(x.expiresOn)}{x.sanitaryRegistry ? ` · Reg. ${x.sanitaryRegistry}` : ''}</div>
                  </div>
                </div>
                <div className="right"><span className={`pill ${pill[0]}`}>{pill[1]}</span><span className="val">{money(x.totalCost)}</span></div>
                <div className="item-foot">
                  <select aria-label={`Destino de ${x.productName}`} value={x.destination} onChange={(e) => setDestino(x, e.target.value)}>
                    {DESTINOS.map((d) => <option key={d} value={d}>{label(d)}</option>)}
                  </select>
                  {x.supportRef && <span className="muted small">Soporte: {x.supportRef}</span>}
                  {canAdmin && <button className="link danger" onClick={() => remove(x)}>Eliminar</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {open && <NuevoProducto base={base} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); toast('Producto agregado'); void load(); }} />}
      {alarma && <Alarma onClose={() => setAlarma(false)} onSaved={() => { setAlarma(false); reloadDrugstore(); }} />}
    </section>
  );
}

function NuevoProducto({ base, onClose, onSaved }: { base: string; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState({ productName: '', batch: '', expiresOn: '', quantity: '', unitCost: '', destination: 'pendiente', supportRef: '', sanitaryRegistry: '', holder: '' });
  const [error, setError] = useState('');
  const set = (k: string, val: string) => setV((s) => ({ ...s, [k]: val }));
  async function submit(e: FormEvent) {
    e.preventDefault(); setError('');
    const body: Record<string, unknown> = { productName: v.productName, batch: v.batch, expiresOn: v.expiresOn, quantity: Number(v.quantity), destination: v.destination };
    if (v.unitCost) body.unitCost = Number(v.unitCost);
    for (const k of ['supportRef', 'sanitaryRegistry', 'holder'] as const) if (v[k]) body[k] = v[k];
    try { await api.post(base, body); onSaved(); } catch (err) { setError(errText(err)); }
  }
  return (
    <Modal title="Agregar producto" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        {error && <div className="full"><Alert>{error}</Alert></div>}
        <label className="full">Producto<input required maxLength={160} placeholder="Ej: Amoxicilina 500 mg cápsulas" value={v.productName} onChange={(e) => set('productName', e.target.value)} /></label>
        <label>Lote<input required maxLength={60} value={v.batch} onChange={(e) => set('batch', e.target.value)} /></label>
        <label>Fecha de vencimiento<input required type="date" value={v.expiresOn} onChange={(e) => set('expiresOn', e.target.value)} /></label>
        <label>Cantidad<input required type="number" min={1} step={1} value={v.quantity} onChange={(e) => set('quantity', e.target.value)} /></label>
        <label>Costo unitario ($)<input type="number" min={0} step="0.01" value={v.unitCost} onChange={(e) => set('unitCost', e.target.value)} /></label>
        <label className="full">Destino<select value={v.destination} onChange={(e) => set('destination', e.target.value)}>{DESTINOS.map((d) => <option key={d} value={d}>{label(d)}</option>)}</select></label>
        <label className="full">Soporte (acta o nota crédito), si aplica<input maxLength={120} value={v.supportRef} onChange={(e) => set('supportRef', e.target.value)} /></label>
        <label>Registro sanitario<input maxLength={60} value={v.sanitaryRegistry} onChange={(e) => set('sanitaryRegistry', e.target.value)} /><small className="muted">Texto libre, tal como figura en el empaque.</small></label>
        <label>Titular<input maxLength={120} value={v.holder} onChange={(e) => set('holder', e.target.value)} /></label>
        <div className="form-actions full"><button type="button" onClick={onClose}>Cancelar</button><button className="primary">Guardar producto</button></div>
      </form>
    </Modal>
  );
}

function Alarma({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { drugstore } = useDrugstore();
  const [days, setDays] = useState(String(drugstore.expiryAlertDays));
  const [error, setError] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault();
    try { await api.patch(`/drugstores/${drugstore.id}`, { expiryAlertDays: Number(days) }); onSaved(); } catch (err) { setError(errText(err)); }
  }
  return (
    <Modal title="Días de anticipación del aviso" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        {error && <div className="full"><Alert>{error}</Alert></div>}
        <label className="full">Avisar cuando falten estos días o menos (1 a 365)<input type="number" min={1} max={365} required value={days} onChange={(e) => setDays(e.target.value)} />
          <small className="muted">La droguería define este valor; FARMIX no lo impone. Hoy es {date(todayISO())}.</small></label>
        <div className="form-actions full"><button type="button" onClick={onClose}>Cancelar</button><button className="primary">Guardar</button></div>
      </form>
    </Modal>
  );
}
