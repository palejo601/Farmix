import { useState } from 'react';
import { api, qs } from '../api';
import { useDrugstore } from '../drugstore';
import { Alert, Bar, Spinner, useLoad } from '../ui';
import { date, label, money, num } from '../format';

export function DashboardPage() {
  const { drugstore } = useDrugstore();
  const [range, setRange] = useState({ from: '', to: '' });
  const { data: r, error, loading } = useLoad(() => api.get(`/drugstores/${drugstore.id}/reports/management${qs(range)}`), [drugstore.id, range.from, range.to]);

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>{drugstore.name}</h1>
          <p className="muted">Reporte de gestión consolidado · {drugstore.city}</p>
        </div>
        <div className="filters" style={{ margin: 0 }}>
          <label>Desde<input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></label>
          <label>Hasta<input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></label>
          <button style={{ alignSelf: 'flex-end' }} onClick={() => window.print()}>Imprimir</button>
        </div>
      </div>
      {error && <Alert>{error}</Alert>}
      {loading && !r ? <Spinner /> : r && (
        <>
          <Alert kind="info">{r.aviso}</Alert>
          <p className="muted small">Periodo de residuos y segregación: {date(r.periodo.desde)} – {date(r.periodo.hasta)}. Vencimientos, personal y plan reflejan el estado actual.</p>

          <h3>Vencimientos</h3>
          <div className="cards">
            <div className="card"><div className="k">Productos registrados</div><div className="v">{r.vencimientos.productos.total}</div><div className="s">{r.vencimientos.productos.vigente} vigentes · {r.vencimientos.productos.gestionado} gestionados</div></div>
            <div className="card"><div className="k">Próximos a vencer (&lt; {drugstore.expiryAlertDays} d)</div><div className="v">{r.vencimientos.productos.proximoAVencer}</div><div className="s">Valor en riesgo: {money(r.vencimientos.valorEnRiesgo.valor)}</div></div>
            <div className="card"><div className="k">Vencidos sin gestionar</div><div className="v">{r.vencimientos.productos.vencido}</div><div className="s">Pérdida confirmada: {money(r.vencimientos.perdidaConfirmada.valor)}</div></div>
          </div>

          <div className="grid2">
            <div className="card">
              <h2>Residuos del periodo</h2>
              <p className="s muted">{r.residuos.registros} registros · {num(r.residuos.totalKg, 2)} kg en total</p>
              {r.residuos.porClasificacion.length === 0 ? <p className="muted">Sin registros en el periodo.</p> : r.residuos.porClasificacion.map((c: any) => (
                <div className="rowbar" key={c.clasificacion}><span>{label(c.clasificacion)}</span><Bar value={c.kg} max={Math.max(r.residuos.totalKg, 0.001)} tone="info" /><span>{num(c.kg, 2)} kg</span></div>
              ))}
            </div>
            <div className="card">
              <h2>Segregación del periodo</h2>
              {r.segregacion.porcentajeCorrecto === null ? <p className="muted">Sin verificaciones en el periodo.</p> : (
                <>
                  <div className="v">{num(r.segregacion.porcentajeCorrecto)}%</div>
                  <Bar value={r.segregacion.porcentajeCorrecto} tone={r.segregacion.porcentajeCorrecto >= 90 ? 'ok' : r.segregacion.porcentajeCorrecto >= 70 ? 'warn' : 'bad'} />
                  <p className="s muted">{r.segregacion.bienSegregados} de {r.segregacion.revisados} elementos bien segregados · {r.segregacion.verificaciones} verificaciones</p>
                </>
              )}
            </div>
            <div className="card">
              <h2>Personal y capacitación</h2>
              <p>{r.personal.trabajadores} trabajadores · {r.personal.capacitaciones.total} capacitaciones</p>
              <p className="s">Vigentes: <b>{r.personal.capacitaciones.vigente}</b> · Pendientes: <b>{r.personal.capacitaciones.pendiente}</b> · Vencidas: <b>{r.personal.capacitaciones.vencida}</b></p>
            </div>
            <div className="card">
              <h2>Plan de mejoramiento</h2>
              <p>{r.planDeMejoramiento.total} acciones</p>
              <p className="s">Pendientes: <b>{r.planDeMejoramiento.pendiente}</b> · En curso: <b>{r.planDeMejoramiento.enCurso}</b> · Cerradas: <b>{r.planDeMejoramiento.cerrada}</b> · Atrasadas: <b>{r.planDeMejoramiento.atrasadas}</b></p>
            </div>
          </div>

          <h3>Último diagnóstico</h3>
          {!r.diagnostico ? <p className="muted">Aún no hay diagnósticos.</p> : (
            <div className="card">
              <p className="s muted">Realizado el {date(r.diagnostico.fecha)} · instrumento v{r.diagnostico.versionInstrumento} (borrador por validar) · madurez 1 a 5, descriptiva</p>
              <div className="v">{r.diagnostico.puntajeGlobal === null ? '—' : num(r.diagnostico.puntajeGlobal)} <span className="s">/ 5 global</span></div>
              {r.diagnostico.areas.map((a: any) => (
                <div className="rowbar" key={a.area}><span>{a.label}</span><Bar value={a.score ?? 0} max={5} tone="info" /><span>{a.score === null ? 'sin datos' : num(a.score)}</span></div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
