import { useState } from 'react';
import { api, qs } from '../api';
import { useDrugstore } from '../drugstore';
import { Alert, Spinner, useLoad } from '../ui';
import { AVISO_LEGAL, CLASES, TRAINING_LABEL, date, kg, label, money, num } from '../format';

const Sec = ({ n, t }: { n: string; t: string }) => <h3><span>{n}</span>{t}</h3>;

export function ReportPage() {
  const { drugstore } = useDrugstore();
  const [range, setRange] = useState({ from: '', to: '' });
  const { data: r, error, loading } = useLoad(() => api.get(`/drugstores/${drugstore.id}/reports/management${qs(range)}`), [drugstore.id, range.from, range.to]);

  return (
    <section>
      <div className="page-head no-print">
        <div><h1>Reporte de gestión</h1><p className="muted">Diagnóstico, vencimientos y pérdidas, residuos, capacitación y mejoras. Imprime o guarda como PDF desde el navegador.</p></div>
        <div className="filters" style={{ margin: 0 }}>
          <label>Residuos y segregación desde<input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></label>
          <label>Hasta<input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></label>
          <button className="primary" style={{ alignSelf: 'flex-end' }} onClick={() => window.print()}>Imprimir / guardar PDF</button>
        </div>
      </div>
      {error && <Alert>{error}</Alert>}
      {loading && !r ? <Spinner /> : r && <Documento r={r} />}
    </section>
  );
}

function Documento({ r }: { r: any }) {
  const d = r.diagnostico, b = d.lineaBase, u = d.ultimo, v = r.vencimientos, plan = r.planDeMejoramiento, p = r.personal;
  const totalClase = Object.fromEntries(CLASES.map((c) => [c, r.residuos.serieMensual.reduce((s: number, m: any) => s + (m.kg[c] ?? 0), 0)]));
  const kg6 = CLASES.reduce((s, c) => s + (totalClase[c] ?? 0), 0);
  const areas: string[] = [...new Set<string>([...(b?.areas ?? []), ...(u?.areas ?? [])].map((a: any) => a.area))];
  const sc = (x: any, a: string) => x?.areas.find((y: any) => y.area === a)?.score ?? '—';
  const KP = ({ v: val, l }: { v: React.ReactNode; l: string }) => <div><b>{val}</b><span>{l}</span></div>;

  return (
    <article className="doc">
      <div className="mut" style={{ fontWeight: 800, letterSpacing: '.04em' }}>FARMIX · Gestión de vencimientos, residuos y mejora continua</div>
      <h1>Reporte de gestión</h1>
      <p className="mut">Reporte del establecimiento · apoyo al seguimiento del PGIRASA</p>
      <table><tbody>
        <tr><th>Establecimiento</th><td>{r.drugstore.name}</td></tr>
        <tr><th>Ciudad</th><td>{r.drugstore.city}</td></tr>
        <tr><th>Fecha de generación</th><td>{date(r.generadoEn)}</td></tr>
        <tr><th>Código del documento</th><td>{r.codigo}</td></tr>
        <tr><th>Generado con</th><td>FARMIX · Producto Mínimo Viable (MVP) en estudio</td></tr>
      </tbody></table>
      {r.datosSimulados && <div className="doc-demo">DATOS SIMULADOS: no corresponden a un establecimiento real ni a resultados de FARMIX.</div>}

      <Sec n="01" t="Resumen" />
      <div className="kp">
        <KP v={u ? `${u.obligatorios.cumple}/${u.obligatorios.aplicables}` : '—'} l="Requisitos obligatorios que cumple (último diagnóstico)" />
        <KP v={v.productos.vencido} l="Vencidos sin gestionar" />
        <KP v={money(v.perdidaConfirmada.valor)} l="Pérdida confirmada" />
        <KP v={p.trabajadores ? `${p.trabajadoresAlDia}/${p.trabajadores}` : '—'} l="Trabajadores con capacitación al día" />
        <KP v={plan.pendiente + plan.enCurso} l="Mejoras pendientes" />
        <KP v={kg(kg6)} l="Residuos registrados (6 meses)" />
      </div>

      <Sec n="02" t="Diagnóstico" />
      {!u ? <p className="mut">Sin diagnósticos guardados.</p> : (
        <>
          <p>Línea base: <b>{date(b.fecha)}</b> · Último diagnóstico: <b>{date(u.fecha)}</b> ({d.totalDiagnosticos} guardados).</p>
          <p>Requisitos obligatorios que cumple: <b>{b.obligatorios.cumple}/{b.obligatorios.aplicables}</b> en la línea base y <b>{u.obligatorios.cumple}/{u.obligatorios.aplicables}</b> en el último diagnóstico.</p>
          {u.obligatorios.noCumple.length ? (
            <table><thead><tr><th>Requisito obligatorio pendiente</th><th>Fundamento</th></tr></thead><tbody>{u.obligatorios.noCumple.map((o: any) => <tr key={o.code}><td>{o.prompt}</td><td>{o.legalBasis}</td></tr>)}</tbody></table>
          ) : <p>No hay requisitos obligatorios pendientes.</p>}
          <table><thead><tr><th>Madurez de gestión</th><th>Línea base</th><th>Último</th></tr></thead><tbody>
            {areas.map((a) => <tr key={a}><td>{label(a)}</td><td>{sc(b, a)}</td><td>{sc(u, a)}</td></tr>)}
            <tr><td><b>Promedio</b></td><td><b>{b.puntajeGlobal ?? '—'}</b></td><td><b>{u.puntajeGlobal ?? '—'}</b></td></tr>
          </tbody></table>
        </>
      )}

      <Sec n="03" t="Vencimientos y pérdidas" />
      <table><thead><tr><th>Indicador</th><th>Valor</th></tr></thead><tbody>
        <tr><td>Vencidos sin gestionar</td><td>{v.productos.vencido}</td></tr>
        <tr><td>Próximos a vencer ({r.drugstore.expiryAlertDays} días o menos)</td><td>{v.productos.proximoAVencer}</td></tr>
        <tr><td>Pérdida confirmada (destrucción o avería)</td><td>{money(v.perdidaConfirmada.valor)}</td></tr>
        <tr><td>En riesgo (sin gestionar)</td><td>{money(v.valorEnRiesgo.valor)}</td></tr>
        <tr><td>Devuelto a proveedor</td><td>{money(v.devueltoProveedor.valor)}</td></tr>
      </tbody></table>

      <Sec n="04" t="Residuos (últimos 6 meses)" />
      <table><thead><tr><th>Clase de residuo</th><th>Cantidad</th></tr></thead><tbody>{CLASES.map((c) => <tr key={c}><td>{label(c)}</td><td>{kg(totalClase[c] ?? 0)}</td></tr>)}</tbody></table>
      {r.residuos.enUnidades.registros > 0 && <p className="mut">Además hay registros en unidades ({num(r.residuos.enUnidades.cantidad, 0)}) que no se suman a los kilogramos.</p>}
      {r.segregacion.porcentajeCorrecto !== null && <p>Segregación verificada en el periodo {date(r.periodo.desde)} – {date(r.periodo.hasta)}: <b>{num(r.segregacion.porcentajeCorrecto)}%</b> correcta ({r.segregacion.bienSegregados} de {r.segregacion.revisados} elementos).</p>}

      <Sec n="05" t="Capacitación del personal" />
      {!p.trabajadores ? <p className="mut">Sin trabajadores registrados.</p> : (
        <>
          <p>Trabajadores: <b>{p.trabajadores}</b> · Al día: <b>{p.trabajadoresAlDia}</b> · Pendientes o vencidas: <b>{p.capacitaciones.pendiente + p.capacitaciones.vencida}</b> · Sin soporte: <b>{p.capacitaciones.sinSoporte}</b></p>
          <table><thead><tr><th>Trabajador</th><th>Cargo</th><th>Al día</th><th>Falta</th></tr></thead><tbody>
            {p.equipo.map((e: any) => <tr key={e.workerId}><td>{e.nombre}</td><td>{e.cargo ?? '—'}</td><td>{e.alDia}/{e.total}</td><td>{e.faltan.length ? e.faltan.map((f: any) => `${f.tema} (${TRAINING_LABEL[f.estado]?.toLowerCase()})`).join(', ') : '—'}</td></tr>)}
          </tbody></table>
        </>
      )}

      <Sec n="06" t="Mejoras" />
      <p>Registradas: <b>{plan.total}</b> · Cerradas: <b>{plan.cerrada}</b> · Pendientes: <b>{plan.pendiente + plan.enCurso}</b></p>
      {plan.pendientes.length > 0 && <table><thead><tr><th>Acción pendiente</th><th>Responsable</th><th>Fecha límite</th></tr></thead><tbody>{plan.pendientes.map((a: any) => <tr key={a.id}><td>{a.accion ?? a.hallazgo}</td><td>{a.responsable ?? '—'}</td><td>{a.fechaLimite ? date(a.fechaLimite) : '—'}{a.atrasada ? ' (atrasada)' : ''}</td></tr>)}</tbody></table>}

      <div className="fnote">{AVISO_LEGAL}<br />{r.aviso}</div>
    </article>
  );
}
