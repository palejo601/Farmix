import { useState, type FormEvent } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { Alert, errText, useToast } from '../ui';
import { date } from '../format';

export function AccountPage() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user?.fullName ?? '');
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [err, setErr] = useState({ profile: '', pw: '', del: '' });
  if (!user) return null;

  async function saveName(e: FormEvent) {
    e.preventDefault();
    try { await api.patch('/users/me', { fullName: name }); await refresh(); toast('Perfil actualizado'); setErr((s) => ({ ...s, profile: '' })); } catch (x) { setErr((s) => ({ ...s, profile: errText(x) })); }
  }
  async function changePw(e: FormEvent) {
    e.preventDefault();
    try { await api.post('/auth/change-password', pw); setPw({ currentPassword: '', newPassword: '' }); toast('Contraseña actualizada; las demás sesiones se cerraron'); setErr((s) => ({ ...s, pw: '' })); } catch (x) { setErr((s) => ({ ...s, pw: errText(x) })); }
  }
  async function accept() {
    try { await api.post('/users/me/privacy-acceptance'); await refresh(); toast('Aviso de privacidad aceptado'); } catch (x) { toast(errText(x), 'error'); }
  }
  async function requestDeletion() {
    if (!window.confirm('Su cuenta se eliminará dentro de 15 días. Hasta entonces puede cancelar la solicitud. ¿Continuar?')) return;
    try { await api.post('/personal-data/deletion-request'); await refresh(); toast('Eliminación programada'); } catch (x) { setErr((s) => ({ ...s, del: errText(x) })); }
  }
  async function cancelDeletion() {
    try { await api.del('/personal-data/deletion-request'); await refresh(); toast('Solicitud cancelada'); } catch (x) { setErr((s) => ({ ...s, del: errText(x) })); }
  }

  return (
    <section>
      <div className="page-head"><div><h1>Mi cuenta</h1><p className="muted">{user.email} · creada el {date(user.createdAt)}</p></div></div>
      <div className="grid2">
        <form className="card" onSubmit={saveName} style={{ display: 'grid', gap: '.7rem', alignContent: 'start' }}>
          <h2>Perfil</h2>
          {err.profile && <Alert>{err.profile}</Alert>}
          <label>Nombre completo<input required minLength={2} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} /></label>
          <button className="primary">Guardar</button>
        </form>
        <form className="card" onSubmit={changePw} style={{ display: 'grid', gap: '.7rem', alignContent: 'start' }}>
          <h2>Cambiar contraseña</h2>
          {err.pw && <Alert>{err.pw}</Alert>}
          <label>Contraseña actual<input type="password" required autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></label>
          <label>Nueva contraseña (mín. 10)<input type="password" required minLength={10} autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></label>
          <button className="primary">Cambiar</button>
        </form>
        <div className="card">
          <h2>Privacidad y datos personales</h2>
          <p className="small">Ley 1581 de 2012. FARMIX no almacena datos clínicos ni de pacientes.</p>
          <p className="small">Aviso de privacidad: {user.privacyAcceptedAt ? <>aceptado el {date(user.privacyAcceptedAt)}</> : <>pendiente <button className="link" onClick={accept}>aceptar ahora</button></>}</p>
          <p><a href="/api/v1/personal-data/export" download>Descargar mis datos (JSON)</a></p>
        </div>
        <div className="card">
          <h2>Eliminar mi cuenta</h2>
          {err.del && <Alert>{err.del}</Alert>}
          {user.deletionScheduledAt ? (
            <>
              <Alert kind="warn">Eliminación programada para el {date(user.deletionScheduledAt)}. Sus droguerías de las que es propietario se archivarán.</Alert>
              <button onClick={cancelDeletion}>Cancelar la eliminación</button>
            </>
          ) : (
            <>
              <p className="small muted">Tiene 15 días de gracia para arrepentirse. Si es propietario de droguerías, se archivarán al eliminarse la cuenta.</p>
              <button className="link danger" onClick={requestDeletion}>Solicitar eliminación de mi cuenta</button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
