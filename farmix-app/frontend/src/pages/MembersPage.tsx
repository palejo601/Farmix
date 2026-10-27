import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { atLeast, useDrugstore } from '../drugstore';
import { Alert, Spinner, errText, useLoad, useToast } from '../ui';
import { date, label } from '../format';

export function MembersPage() {
  const { drugstore } = useDrugstore();
  const { user } = useAuth();
  const toast = useToast();
  const P = `/drugstores/${drugstore.id}/members`;
  const { data, error, loading, reload } = useLoad(() => api.get(P), [P]);
  const [form, setForm] = useState({ email: '', role: 'operador' });
  const [formError, setFormError] = useState('');
  const isOwner = drugstore.role === 'propietario';
  const canManage = atLeast(drugstore.role, 'administrador');
  const manageable = (role: string) => role !== 'propietario' && (isOwner || (canManage && role === 'operador'));

  async function add(e: FormEvent) {
    e.preventDefault(); setFormError('');
    try { await api.post(P, form); toast('Miembro agregado'); setForm({ ...form, email: '' }); reload(); } catch (err) { setFormError(errText(err)); }
  }
  async function change(userId: string, role: string) {
    try { await api.patch(`${P}/${userId}`, { role }); toast('Rol actualizado'); } catch (err) { toast(errText(err), 'error'); }
    reload();
  }
  async function remove(userId: string, self: boolean) {
    if (!window.confirm(self ? '¿Retirarse de esta droguería?' : '¿Retirar a este miembro?')) return;
    try { await api.del(`${P}/${userId}`); toast('Miembro retirado'); if (self) window.location.assign('/'); else reload(); } catch (err) { toast(errText(err), 'error'); }
  }

  return (
    <section>
      <div className="page-head"><div><h1>Miembros</h1><p className="muted">Propietario: todo. Administrador: gestiona operadores y edita la droguería. Operador: registra y consulta.</p></div></div>
      {error && <Alert>{error}</Alert>}
      {loading ? <Spinner /> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Desde</th><th /></tr></thead>
            <tbody>
              {data?.members.map((m: any) => (
                <tr key={m.userId}>
                  <td><b>{m.fullName}</b>{m.userId === user?.id && ' (usted)'}</td><td>{m.email}</td>
                  <td>
                    {manageable(m.role) ? (
                      <select value={m.role} onChange={(e) => change(m.userId, e.target.value)} aria-label={`Rol de ${m.fullName}`}>
                        <option value="operador">Operador</option>
                        {isOwner && <option value="administrador">Administrador</option>}
                      </select>
                    ) : label(m.role)}
                  </td>
                  <td>{date(m.createdAt)}</td>
                  <td className="actions">
                    {(manageable(m.role) || (m.userId === user?.id && m.role !== 'propietario')) && (
                      <button className="link danger" onClick={() => remove(m.userId, m.userId === user?.id)}>{m.userId === user?.id ? 'Retirarme' : 'Retirar'}</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {canManage && (
        <form className="card form" onSubmit={add} style={{ marginTop: '1rem' }}>
          <h2 className="full">Agregar miembro</h2>
          {formError && <div className="full"><Alert>{formError}</Alert></div>}
          <label>Correo de una cuenta ya registrada<input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label>Rol
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="operador">Operador</option>
              {isOwner && <option value="administrador">Administrador</option>}
            </select>
          </label>
          <div className="form-actions full"><button className="primary">Agregar</button></div>
        </form>
      )}
    </section>
  );
}

export function SettingsPage() {
  const { drugstore, reload } = useDrugstore();
  const toast = useToast();
  const nav = useNavigate();
  const [v, setV] = useState({ name: drugstore.name, city: drugstore.city, expiryAlertDays: String(drugstore.expiryAlertDays), employeeCount: drugstore.employeeCount === null ? '' : String(drugstore.employeeCount) });
  const [error, setError] = useState('');
  async function save(e: FormEvent) {
    e.preventDefault(); setError('');
    try { await api.patch(`/drugstores/${drugstore.id}`, { name: v.name, city: v.city, expiryAlertDays: Number(v.expiryAlertDays), employeeCount: v.employeeCount === '' ? null : Number(v.employeeCount) }); toast('Configuración guardada'); reload(); } catch (err) { setError(errText(err)); }
  }
  async function del() {
    if (!window.confirm(`¿Eliminar la droguería «${drugstore.name}»? Se archivará (borrado lógico) y dejará de ser visible para todos sus miembros.`)) return;
    try { await api.del(`/drugstores/${drugstore.id}`); toast('Droguería eliminada'); nav('/'); } catch (err) { toast(errText(err), 'error'); }
  }
  return (
    <section>
      <div className="page-head"><div><h1>Configuración</h1></div></div>
      <form className="card form" onSubmit={save}>
        {error && <div className="full"><Alert>{error}</Alert></div>}
        <label className="full">Nombre<input required minLength={2} maxLength={120} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></label>
        <label>Ciudad<input required value={v.city} onChange={(e) => setV({ ...v, city: e.target.value })} /></label>
        <label>Días de anticipación del aviso de vencimiento<input type="number" min={1} max={365} required value={v.expiryAlertDays} onChange={(e) => setV({ ...v, expiryAlertDays: e.target.value })} /></label>
        <label>Número de empleados<input type="number" min={0} max={10000} value={v.employeeCount} onChange={(e) => setV({ ...v, employeeCount: e.target.value })} /></label>
        <div className="form-actions full"><button className="primary">Guardar</button></div>
      </form>
      {drugstore.role === 'propietario' && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h2>Zona de riesgo</h2>
          <p className="muted small">Solo el propietario puede eliminar la droguería.</p>
          <button className="link danger" onClick={del}>Eliminar esta droguería</button>
        </div>
      )}
    </section>
  );
}
