import { useState } from 'react';
import { api } from '../api';
import { useDrugstore } from '../drugstore';
import { Alert, Badge, errText, useToast } from '../ui';
import { label } from '../format';

const SAMPLE = JSON.stringify({
  expirations: [{ productName: 'Producto local (simulado)', batch: 'LOC-1', expiresOn: '2027-03-31', quantity: 5, unitCost: 1200 }],
  waste: [{ recordedOn: '2026-01-10', classification: 'aprovechable', quantity: 1.5, unit: 'kg', wasteType: 'Cartón' }],
  segregation: [{ checkedOn: '2026-01-10', location: 'Bodega', itemsReviewed: 10, itemsCorrect: 9 }],
}, null, 2);

export function LocalMigrationPage() {
  const { drugstore } = useDrugstore();
  const toast = useToast();
  const [text, setText] = useState('');
  const [isDemo, setIsDemo] = useState(false);
  const [mig, setMig] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(action: 'create' | 'confirm' | 'revert') {
    setBusy(true); setError('');
    try {
      if (action === 'create') {
        let data: unknown;
        try { data = JSON.parse(text); } catch { throw new Error('El contenido no es un JSON válido.'); }
        setMig((await api.post('/local-migrations', { drugstoreId: drugstore.id, isDemo, data })).migration);
      } else {
        setMig((await api.post(`/local-migrations/${mig.id}/${action}`)).migration);
        toast(action === 'confirm' ? 'Migración confirmada' : 'Migración revertida');
      }
    } catch (e) { setError(errText(e)); } finally { setBusy(false); }
  }

  return (
    <section>
      <div className="page-head"><div><h1>Migrar datos guardados en el navegador</h1>
        <p className="muted">Pegue (o cargue) un JSON con las listas <code>expirations</code>, <code>waste</code> y <code>segregation</code>. Primero se muestra una vista previa; al confirmar se registran, y puede revertir lo que esa migración creó.</p></div></div>
      <div className="card">
        <label>Contenido JSON
          <textarea rows={10} value={text} onChange={(e) => { setText(e.target.value); setMig(null); }} placeholder={SAMPLE} spellCheck={false} style={{ fontFamily: 'ui-monospace, monospace', fontSize: '.85rem' }} />
        </label>
        <div className="form-actions" style={{ justifyContent: 'flex-start', alignItems: 'center', flexWrap: 'wrap', marginTop: '.7rem' }}>
          <input type="file" accept=".json,application/json" style={{ width: 'auto' }} onChange={async (e) => { const f = e.target.files?.[0]; if (f) { setText(await f.text()); setMig(null); } }} />
          <button type="button" onClick={() => { setText(SAMPLE); setMig(null); }}>Usar ejemplo</button>
          <label style={{ flexDirection: 'row', alignItems: 'center', gap: '.4rem', fontWeight: 400 }}><input type="checkbox" style={{ width: 'auto' }} checked={isDemo} onChange={(e) => setIsDemo(e.target.checked)} />Son datos de demostración (simulados)</label>
          <button className="primary" disabled={!text.trim() || busy} onClick={() => run('create')}>Crear vista previa</button>
        </div>
      </div>
      {error && <Alert>{error}</Alert>}
      {mig && (
        <>
          <h3>Migración <Badge value={mig.phase} text={label(mig.phase)} /></h3>
          <Alert kind="info">{mig.aviso}</Alert>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Tipo</th><th>Recibidas</th><th>Válidas</th><th>Con errores</th><th>Duplicadas</th>{mig.inserted && <th>Registradas</th>}</tr></thead>
              <tbody>
                {Object.entries(mig.summary).map(([k, s]: [string, any]) => (
                  <tr key={k}><td>{label(k) === k ? ({ expirations: 'Vencimientos', waste: 'Residuos', segregation: 'Segregación' } as any)[k] : label(k)}</td><td>{s.recibidas}</td><td>{s.validas}</td><td>{s.invalidas}</td><td>{s.duplicadas}</td>{mig.inserted && <td>{mig.inserted[k] ?? 0}</td>}</tr>
                ))}
              </tbody>
            </table>
          </div>
          {mig.errors.length > 0 && <ul className="small">{mig.errors.map((e: any, i: number) => <li key={i}>{e.kind} · fila {e.row}: {e.errors.join(' · ')}</li>)}</ul>}
          <div className="form-actions" style={{ justifyContent: 'flex-start', marginTop: '.8rem' }}>
            {mig.phase === 'pendiente' && <button className="primary" disabled={busy} onClick={() => run('confirm')}>Confirmar migración</button>}
            {mig.phase === 'confirmada' && <button disabled={busy} onClick={() => window.confirm('Se archivarán los registros que creó esta migración. ¿Revertir?') && run('revert')}>Revertir migración</button>}
          </div>
        </>
      )}
    </section>
  );
}
