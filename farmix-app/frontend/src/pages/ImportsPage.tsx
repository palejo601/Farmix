import { useState } from 'react';
import { api, ApiError } from '../api';
import { useDrugstore } from '../drugstore';
import { Alert, Badge, errText, useToast } from '../ui';
import { date } from '../format';

const KINDS: Record<string, { label: string; columns: string; sample: string }> = {
  expirations: {
    label: 'Vencimientos',
    columns: 'producto, lote, vencimiento, cantidad (obligatorias) · registro_sanitario, titular, costo, soporte, destino (pendiente, devuelto_proveedor, destruccion_gestor o averia_deterioro)',
    sample: 'producto,lote,registro_sanitario,titular,vencimiento,cantidad,costo,soporte,destino\nProducto de ejemplo (simulado),LOTE-EJ-1,,,2027-06-30,10,1500,,pendiente\n',
  },
  waste: {
    label: 'Residuos',
    columns: 'fecha, clasificacion, cantidad, unidad: kg, g o unidades (obligatorias) · tipo, manejo, soporte, origen, notas (opcionales)',
    sample: 'fecha,clasificacion,cantidad,unidad,tipo,manejo,soporte,origen,notas\n2026-01-15,aprovechable,2.5,kg,Cartón,Entrega a recicladores,,,Ejemplo simulado\n',
  },
  segregation: {
    label: 'Segregación',
    columns: 'fecha, lugar, revisados, bien_segregados (obligatorias) · observaciones (opcional)',
    sample: 'fecha,lugar,revisados,bien_segregados,observaciones\n2026-01-15,Bodega,20,17,Ejemplo simulado\n',
  },
};

export function ImportsPage() {
  const { drugstore } = useDrugstore();
  const toast = useToast();
  const P = `/drugstores/${drugstore.id}/imports`;
  const [kind, setKind] = useState('expirations');
  const [file, setFile] = useState<File | null>(null);
  const [imp, setImp] = useState<any>(null);
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function preview() {
    if (!file) return;
    setBusy(true); setError(''); setResult(null); setImp(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`/api/v1${P}/preview?kind=${kind}`, { method: 'POST', body: form, credentials: 'same-origin' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new ApiError(res.status, data?.error?.code ?? 'ERROR', data?.error?.message ?? `Error ${res.status}`, data?.error?.details ?? []);
      setImp(data.import);
    } catch (e) { setError(errText(e)); } finally { setBusy(false); }
  }
  async function confirm() {
    setBusy(true); setError('');
    try {
      const r = await api.post(`${P}/${imp.id}/confirm`);
      setResult({ inserted: r.inserted, skipped: r.skipped }); setImp(r.import);
      toast(`Importadas ${r.inserted} filas`);
    } catch (e) { setError(errText(e)); } finally { setBusy(false); }
  }
  const download = () => {
    const blob = new Blob(['﻿' + KINDS[kind]!.sample], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `plantilla-${kind}.csv`; a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <section>
      <div className="page-head"><div><h1>Importar desde Excel o CSV</h1><p className="muted">Dos pasos: vista previa (no guarda nada) y confirmación. La vista previa caduca a las 24 horas.</p></div></div>
      <div className="card">
        <div className="form">
          <label>¿Qué va a importar?
            <select value={kind} onChange={(e) => { setKind(e.target.value); setImp(null); setResult(null); }}>
              {Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </label>
          <label>Archivo (.xlsx o .csv, máx. 2 MB y 1000 filas)
            <input type="file" accept=".xlsx,.csv" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setImp(null); setResult(null); }} />
          </label>
        </div>
        <p className="small muted">Columnas: {KINDS[kind]!.columns}. Fechas en formato AAAA-MM-DD.</p>
        <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
          <button className="primary" disabled={!file || busy} onClick={preview}>{busy && !imp ? 'Analizando…' : 'Ver vista previa'}</button>
          <button onClick={download}>Descargar plantilla CSV</button>
        </div>
      </div>
      {error && <Alert>{error}</Alert>}
      {imp && (
        <>
          <h3>Resultado de la vista previa · {imp.fileName}</h3>
          <div className="cards">
            <div className="card"><div className="k">Filas</div><div className="v">{imp.totals.filas}</div></div>
            <div className="card"><div className="k">Válidas</div><div className="v">{imp.totals.validas}</div></div>
            <div className="card"><div className="k">Con errores</div><div className="v">{imp.totals.invalidas}</div></div>
            <div className="card"><div className="k">Duplicadas</div><div className="v">{imp.totals.duplicadas}</div></div>
          </div>
          {imp.phase === 'vista_previa' ? (
            <>
              <Alert kind={imp.caducada ? 'error' : 'info'}>{imp.caducada ? 'Esta vista previa caducó. Cargue el archivo de nuevo.' : `${imp.aviso} Caduca el ${new Date(imp.expiresAt).toLocaleString('es-CO')}.`}</Alert>
              <button className="primary" disabled={busy || imp.caducada || imp.totals.validas === 0} onClick={confirm}>Confirmar e importar {imp.totals.validas} filas</button>
            </>
          ) : result && <Alert kind="ok">Importación confirmada: {result.inserted} filas registradas, {result.skipped} omitidas (inválidas o duplicadas).</Alert>}
          <div className="table-wrap" style={{ marginTop: '1rem' }}>
            <table>
              <thead><tr><th>Fila</th><th>Estado</th><th>Detalle</th></tr></thead>
              <tbody>
                {imp.rows.map((r: any) => (
                  <tr key={r.row}>
                    <td>{r.row}</td><td><Badge value={r.state} text={r.state === 'valida' ? 'Válida' : r.state === 'invalida' ? 'Con errores' : 'Duplicada'} /></td>
                    <td className="small">{r.errors.length ? r.errors.join(' · ') : summarize(r.data)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function summarize(d?: Record<string, unknown>) {
  if (!d) return '';
  return Object.entries(d).map(([k, v]) => `${k}: ${typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? date(v) : v}`).join(' · ');
}
