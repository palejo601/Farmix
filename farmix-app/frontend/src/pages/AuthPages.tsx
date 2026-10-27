import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { Alert, errText } from '../ui';

function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="logo"><i>+</i> FARMIX</div>
        <p className="muted small">Producto mínimo viable en estudio · gestión de residuos y vencimientos para droguerías independientes de Sincelejo.</p>
        <h1 style={{ marginTop: '1rem' }}>{title}</h1>
        {children}
      </div>
    </div>
  );
}

export function LoginPage() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/" replace />;
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try { await login(email, password); nav('/'); } catch (err) { setError(errText(err)); } finally { setBusy(false); }
  }
  return (
    <Shell title="Ingresar">
      <form onSubmit={submit}>
        {error && <Alert>{error}</Alert>}
        <label>Correo<input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Contraseña<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <button className="primary" disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar'}</button>
      </form>
      <p className="small"><Link to="/recuperar">¿Olvidó su contraseña?</Link> · <Link to="/registro">Crear una cuenta</Link></p>
    </Shell>
  );
}

export function RegisterPage() {
  const { user, register } = useAuth();
  const nav = useNavigate();
  const [v, setV] = useState({ fullName: '', email: '', password: '' });
  const [accept, setAccept] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/" replace />;
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try { await register(v); nav('/'); } catch (err) { setError(errText(err)); } finally { setBusy(false); }
  }
  return (
    <Shell title="Crear cuenta">
      <form onSubmit={submit}>
        {error && <Alert>{error}</Alert>}
        <label>Nombre completo<input required minLength={2} maxLength={120} autoComplete="name" value={v.fullName} onChange={(e) => setV({ ...v, fullName: e.target.value })} /></label>
        <label>Correo<input type="email" required autoComplete="username" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} /></label>
        <label>Contraseña<input type="password" required minLength={10} maxLength={128} autoComplete="new-password" value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} /><small className="muted">Mínimo 10 caracteres.</small></label>
        <label style={{ flexDirection: 'row', gap: '.5rem', alignItems: 'flex-start', fontWeight: 400 }}>
          <input type="checkbox" required style={{ width: 'auto', marginTop: '.3rem' }} checked={accept} onChange={(e) => setAccept(e.target.checked)} />
          <span className="small">
            Acepto el aviso de privacidad: FARMIX trata solo los datos de cuenta y de gestión que usted registra, no almacena datos clínicos ni de pacientes, y puedo descargar mis datos o solicitar la eliminación de mi cuenta en cualquier momento (Ley 1581 de 2012).
          </span>
        </label>
        <button className="primary" disabled={busy || !accept}>{busy ? 'Creando…' : 'Crear cuenta'}</button>
      </form>
      <p className="small">¿Ya tiene cuenta? <Link to="/login">Ingresar</Link></p>
    </Shell>
  );
}

export function ResetPage() {
  const [step, setStep] = useState<'request' | 'confirm' | 'done'>('request');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function request(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try { setMsg((await api.post('/auth/password-reset/request', { email })).message); setStep('confirm'); } catch (err) { setError(errText(err)); } finally { setBusy(false); }
  }
  async function confirm(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try { await api.post('/auth/password-reset/confirm', { token, newPassword: pw }); setStep('done'); } catch (err) { setError(errText(err)); } finally { setBusy(false); }
  }
  return (
    <Shell title="Recuperar contraseña">
      {error && <Alert>{error}</Alert>}
      {step === 'request' && (
        <form onSubmit={request}>
          <label>Correo de la cuenta<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <button className="primary" disabled={busy}>Enviar instrucciones</button>
        </form>
      )}
      {step === 'confirm' && (
        <form onSubmit={confirm}>
          <Alert kind="info">{msg}</Alert>
          {import.meta.env.DEV && (
            <Alert kind="warn">
              Modo desarrollo (<code>MAIL_MODE=dev</code>): el correo no se envía; el código queda en la tabla <code>dev_mailbox</code>:
              <pre className="code">psql "$DATABASE_URL" -c "SELECT body FROM dev_mailbox ORDER BY id DESC LIMIT 1"</pre>
            </Alert>
          )}
          <label>Código recibido<input required minLength={20} value={token} onChange={(e) => setToken(e.target.value.trim())} /></label>
          <label>Nueva contraseña<input type="password" required minLength={10} maxLength={128} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></label>
          <button className="primary" disabled={busy}>Restablecer</button>
        </form>
      )}
      {step === 'done' && <Alert kind="ok">Contraseña restablecida. Ya puede ingresar con la nueva.</Alert>}
      <p className="small"><Link to="/login">Volver a ingresar</Link></p>
    </Shell>
  );
}
