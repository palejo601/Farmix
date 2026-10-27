import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Alert, Empty, Modal, Spinner, errText, useLoad, useToast } from '../ui';
import { label } from '../format';

export function DrugstoresPage() {
  const { data, error, loading, reload } = useLoad(() => api.get('/drugstores'), []);
  const [open, setOpen] = useState(false);
  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Mis droguerías</h1>
          <p className="muted">Elija una droguería para gestionar sus vencimientos, residuos, personal y reportes.</p>
        </div>
        <button className="primary" onClick={() => setOpen(true)}>+ Nueva droguería</button>
      </div>
      {error && <Alert>{error}</Alert>}
      {loading ? <Spinner /> : data?.drugstores.length === 0 ? (
        <Empty>Todavía no pertenece a ninguna droguería. Cree la primera o pida que lo agreguen como miembro.</Empty>
      ) : (
        <div className="cards">
          {data?.drugstores.map((d: any) => (
            <Link key={d.id} to={`/d/${d.id}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="k">{d.city}</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{d.name}</div>
              <div className="s">Su rol: {label(d.role)} · alerta de vencimiento: {d.expiryAlertDays} días</div>
            </Link>
          ))}
        </div>
      )}
      {open && <NewDrugstore onClose={() => setOpen(false)} onDone={() => { setOpen(false); reload(); }} />}
    </section>
  );
}

function NewDrugstore({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [v, setV] = useState({ name: '', city: 'Sincelejo', expiryAlertDays: '60' });
  const [error, setError] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      await api.post('/drugstores', { name: v.name, city: v.city, expiryAlertDays: Number(v.expiryAlertDays) });
      toast('Droguería creada');
      onDone();
    } catch (err) { setError(errText(err)); }
  }
  return (
    <Modal title="Nueva droguería" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        {error && <div className="full"><Alert>{error}</Alert></div>}
        <label className="full">Nombre<input required minLength={2} maxLength={120} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></label>
        <label>Ciudad<input required value={v.city} onChange={(e) => setV({ ...v, city: e.target.value })} /></label>
        <label>Anticipación de alerta (días)<input type="number" min={1} max={365} required value={v.expiryAlertDays} onChange={(e) => setV({ ...v, expiryAlertDays: e.target.value })} /><small className="muted">Un producto es «próximo a vencer» si faltan menos días.</small></label>
        <div className="form-actions full"><button type="button" onClick={onClose}>Cancelar</button><button className="primary">Crear</button></div>
      </form>
    </Modal>
  );
}
