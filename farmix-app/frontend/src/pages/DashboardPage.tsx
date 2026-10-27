import { Link } from 'react-router-dom';
import { api } from '../api';
import { useDrugstore } from '../drugstore';
import { Alert, Kpi, Spinner, useLoad } from '../ui';
import { kg, money, num } from '../format';

const pl = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
type Att = { tone: 'bad' | 'warn' | 'ok'; text: string; to: string; cta: string };

export function DashboardPage() {
  const { drugstore } = useDrugstore();
  const { data: r, error, loading } = useLoad(() => api.get(`/drugstores/${drugstore.id}/reports/management`), [drugstore.id]);

  const att: Att[] = [];
  if (r) {
    const v = r.vencimientos, d = r.diagnostico.ultimo, p = r.personal.capacitaciones, m = r.planDeMejoramiento;
    if (v.productos.vencido) att.push({ tone: 'bad', text: `${pl(v.productos.vencido, 'producto vencido', 'productos vencidos')} sin gestionar (${money(v.valorEnRiesgo.valor)} en riesgo)`, to: 'vencimientos', cta: 'Gestionar' });
    if (v.productos.proximoAVencer) att.push({ tone: 'warn', text: `${pl(v.productos.proximoAVencer, 'producto vence', 'productos vencen')} en ${drugstore.expiryAlertDays} días o menos`, to: 'vencimientos', cta: 'Ver' });
    if (d && d.obligatorios.pendientes) att.push({ tone: 'bad', text: `${pl(d.obligatorios.pendientes, 'requisito obligatorio pendiente', 'requisitos obligatorios pendientes')} en el último diagnóstico`, to: 'diagnostico?v=resultados', cta: 'Ver pendientes' });
    if (m.atrasadas) att.push({ tone: 'bad', text: `${pl(m.atrasadas, 'mejora con la fecha límite vencida', 'mejoras con la fecha límite vencida')}`, to: 'diagnostico?v=mejoras', cta: 'Ver mejoras' });
    if (p.pendiente + p.vencida) att.push({ tone: 'warn', text: `${pl(p.pendiente + p.vencida, 'capacitación pendiente o vencida', 'capacitaciones pendientes o vencidas')}`, to: 'personal', cta: 'Ver equipo' });
    if (p.sinSoporte) att.push({ tone: 'warn', text: `${pl(p.sinSoporte, 'capacitación sin soporte', 'capacitaciones sin soporte')}`, to: 'personal', cta: 'Adjuntar' });
    if (!d) att.push({ tone: 'warn', text: 'Aún no hay un diagnóstico: guarda tu línea base', to: 'diagnostico', cta: 'Empezar' });
  }
  const total = r ? r.vencimientos.productos.total + r.residuos.registros + r.personal.trabajadores : 0;
  const steps = r ? [
    { n: 'Registrar', s: 'Vencimientos, residuos y personal', done: total > 0 },
    { n: 'Medir', s: 'Diagnóstico y línea base', done: !!r.diagnostico.ultimo },
    { n: 'Analizar', s: 'Alertas y pendientes', done: !!r.diagnostico.ultimo && att.length === 0 },
    { n: 'Mejorar', s: 'Acciones con responsable y fecha', done: r.planDeMejoramiento.cerrada > 0 },
    { n: 'Volver a medir', s: 'Comparar con la línea base', done: r.diagnostico.totalDiagnosticos > 1 },
  ] : [];
  const nowIdx = steps.findIndex((s) => !s.done);

  return (
    <section>
      <div className="page-head">
        <div><h1>{drugstore.name}</h1><p className="muted">{drugstore.city}{drugstore.employeeCount !== null ? ` · ${drugstore.employeeCount} empleados` : ''} · Medir. Analizar. Mejorar.</p></div>
        <Link to="reporte"><button className="primary">Ver reporte de gestión</button></Link>
      </div>
      {error && <Alert>{error}</Alert>}
      {loading && !r ? <Spinner /> : r && (
        <>
          <div className="cycle" aria-label="Ciclo de mejora">
            {steps.map((s, i) => <div key={s.n} className={`step ${s.done ? 'done' : i === nowIdx ? 'now' : ''}`}><b>{i + 1}. {s.n}</b><span>{s.s}</span></div>)}
          </div>

          <h3>Analizar · lo que necesita atención</h3>
          {att.length === 0 ? <div className="att ok">Sin alertas por ahora.</div> : (
            <div className="attention">{att.map((a) => <div key={a.text} className={`att ${a.tone}`}><span>{a.text}</span><Link to={a.to}><button>{a.cta}</button></Link></div>)}</div>
          )}

          <h3>Medir</h3>
          <div className="kpis">
            <Kpi tone={r.diagnostico.ultimo?.obligatorios.pendientes ? 'bad' : r.diagnostico.ultimo ? 'good' : undefined}
              value={r.diagnostico.ultimo ? `${r.diagnostico.ultimo.obligatorios.cumple}/${r.diagnostico.ultimo.obligatorios.aplicables}` : '—'} label="Requisitos obligatorios que cumple" />
            <Kpi value={r.diagnostico.ultimo?.puntajeGlobal ?? '—'} label="Madurez de gestión (1 a 5)" />
            <Kpi tone={r.vencimientos.perdidaConfirmada.valor ? 'bad' : undefined} value={money(r.vencimientos.perdidaConfirmada.valor)} label="Pérdida confirmada" sub="Destrucción o avería" />
            <Kpi tone={r.vencimientos.valorEnRiesgo.valor ? 'warn' : undefined} value={money(r.vencimientos.valorEnRiesgo.valor)} label="En riesgo sin gestionar" />
            <Kpi tone="good" value={money(r.vencimientos.devueltoProveedor.valor)} label="Devuelto a proveedor" />
            <Kpi value={kg(r.residuos.totalKg)} label="Residuos del periodo" sub={r.residuos.enUnidades.registros ? `+ ${num(r.residuos.enUnidades.cantidad, 0)} unidades (aparte)` : undefined} />
            <Kpi value={r.segregacion.porcentajeCorrecto === null ? '—' : `${num(r.segregacion.porcentajeCorrecto)}%`} label="Segregación correcta" sub={`${r.segregacion.verificaciones} verificaciones`} />
            <Kpi value={`${r.personal.trabajadoresAlDia}/${r.personal.trabajadores}`} label="Trabajadores con capacitación al día" />
          </div>

          <h3>Mejorar</h3>
          <div className="card">
            <p style={{ marginTop: 0 }}>{r.planDeMejoramiento.total} mejoras · pendientes <b>{r.planDeMejoramiento.pendiente}</b> · en curso <b>{r.planDeMejoramiento.enCurso}</b> · cerradas <b>{r.planDeMejoramiento.cerrada}</b> · atrasadas <b>{r.planDeMejoramiento.atrasadas}</b></p>
            <Link to="diagnostico?v=mejoras"><button>Abrir el plan de mejora</button></Link>
          </div>
          <div className="note">{r.aviso}</div>
        </>
      )}
    </section>
  );
}
