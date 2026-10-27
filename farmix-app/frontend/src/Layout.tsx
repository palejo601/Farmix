import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from './auth';
import { DrugstoreCtx, atLeast, type Drugstore } from './drugstore';
import { api } from './api';
import { Alert, Spinner, useLoad } from './ui';
import { label } from './format';

export function Banner() {
  return <div className="mvp-banner">Producto mínimo viable en estudio · los indicadores son hipótesis por validar · los datos de demostración son simulados</div>;
}

/** Barra lateral + carga de la droguería activa (si no es miembro, la API responde 404). */
export function DrugstoreLayout() {
  const { id } = useParams();
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const { data, error, loading, reload } = useLoad(() => api.get(`/drugstores/${id}`), [id]);
  const d: Drugstore | undefined = data?.drugstore;

  const item = (to: string, text: string, end = false) => (
    <NavLink to={to} end={end} className={({ isActive }) => `nav ${isActive ? 'active' : ''}`} onClick={() => setOpen(false)}>{text}</NavLink>
  );

  return (
    <>
      <Banner />
      <div className="topbar"><button onClick={() => setOpen((o) => !o)} aria-label="Menú">☰</button><b>{d?.name ?? 'FARMIX'}</b></div>
      <div className="shell">
        <aside className={`side ${open ? 'open' : ''}`}>
          <div className="logo"><i>+</i> FARMIX</div>
          <Link to="/" className="nav" style={{ textDecoration: 'none' }}>← Mis droguerías</Link>
          {d && (
            <>
              <div className="group">Gestión</div>
              {item(`/d/${id}`, 'Resumen', true)}
              {item(`/d/${id}/vencimientos`, 'Vencimientos')}
              {item(`/d/${id}/residuos`, 'Residuos')}
              {item(`/d/${id}/segregacion`, 'Segregación')}
              {item(`/d/${id}/personal`, 'Personal y capacitación')}
              {item(`/d/${id}/plan`, 'Plan de mejoramiento')}
              {item(`/d/${id}/diagnostico`, 'Diagnóstico')}
              <div className="group">Datos</div>
              {item(`/d/${id}/importar`, 'Importar Excel / CSV')}
              {item(`/d/${id}/migrar`, 'Migrar datos locales')}
              <div className="group">Droguería</div>
              {item(`/d/${id}/miembros`, 'Miembros')}
              {atLeast(d.role, 'administrador') && item(`/d/${id}/configuracion`, 'Configuración')}
            </>
          )}
          <div className="foot">
            <div><b>{user?.fullName}</b></div>
            <div className="muted">{d ? `Rol: ${label(d.role)}` : user?.email}</div>
            <div style={{ marginTop: '.5rem', display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
              <button className="link" onClick={() => nav('/cuenta')}>Mi cuenta</button>
              <button className="link" onClick={async () => { await logout(); nav('/login'); }}>Cerrar sesión</button>
            </div>
          </div>
        </aside>
        <main className="main">
          {loading ? <Spinner /> : error || !d ? (
            <>
              <Alert>{error || 'No se encontró la droguería.'}</Alert>
              <p><Link to="/">Volver a mis droguerías</Link></p>
            </>
          ) : (
            <DrugstoreCtx.Provider value={{ drugstore: d, reload }}>
              <Outlet />
            </DrugstoreCtx.Provider>
          )}
        </main>
      </div>
    </>
  );
}

export function PlainLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <>
      <Banner />
      <header className="topbar" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Link to="/" className="logo" style={{ textDecoration: 'none' }}><i>+</i> FARMIX</Link>
        <span className="small">
          {user?.fullName} · <Link to="/cuenta">Mi cuenta</Link> · <button className="link" onClick={async () => { await logout(); nav('/login'); }}>Cerrar sesión</button>
        </span>
      </header>
      <main className="main" style={{ margin: '0 auto' }}><Outlet /></main>
    </>
  );
}
