import { Tag } from '../ui';
import { LEYES } from '../normativa';
import { AVISO_LEGAL } from '../format';

export function NormativaPage() {
  return (
    <section>
      <div className="page-head"><div><h1>Normativa</h1>
        <p className="muted" style={{ maxWidth: '70ch' }}>Normativa aplicable a la gestión farmacéutica, residuos y operación de droguerías en Colombia, según el plan de negocios (verificada a septiembre de 2026). FARMIX apoya el registro y el seguimiento del PGIRASA; no lo sustituye: el plan sigue siendo un documento de la droguería exigido por la norma.</p></div></div>
      <div className="law-list">
        {LEYES.map((l) => (
          <article className="law" key={l.n} style={{ ['--c' as string]: l.c }}>
            <div className="toolbar" style={{ margin: 0 }}><span className="y">{l.y}</span><b>{l.n}</b><span className="muted small">{l.k}</span><span style={{ flex: 1 }} /><Tag kind={l.r === 'Obligación legal' ? 'law' : 'pend'}>{l.r}</Tag></div>
            <p style={{ margin: '.3rem 0' }}>{l.d}</p>
            <dl><dt>¿Qué aporta a FARMIX?</dt><dd>{l.a}</dd></dl>
            <a href={l.u} target="_blank" rel="noopener noreferrer">Consultar fuente oficial ↗</a> <span className="muted small">{l.s}</span>
            {l.u2 && <span className="small"> · También en <a href={l.u2} target="_blank" rel="noopener noreferrer">{l.s2} ↗</a></span>}
          </article>
        ))}
      </div>
      <div className="card"><Tag kind="prop">Propuesta propia de FARMIX</Tag> <b>Criterios de madurez de gestión</b>
        <p className="muted small" style={{ marginBottom: 0 }}>Buenas prácticas para medir y mejorar. No son una exigencia legal; así se diferencian de los requisitos obligatorios del diagnóstico.</p></div>
      <div className="note">{AVISO_LEGAL}</div>
    </section>
  );
}
