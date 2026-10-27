import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import { DrugstoreLayout, PlainLayout } from './Layout';
import { LoginPage, RegisterPage, ResetPage } from './pages/AuthPages';
import { DrugstoresPage } from './pages/DrugstoresPage';
import { DashboardPage } from './pages/DashboardPage';
import { ExpirationsPage } from './pages/ExpirationsPage';
import { WastePage } from './pages/WastePage';
import { SegregationPage } from './pages/SegregationPage';
import { StaffPage } from './pages/StaffPage';
import { DiagnosticoPage } from './pages/DiagnosticoPage';
import { ReportPage } from './pages/ReportPage';
import { NormativaPage } from './pages/NormativaPage';
import { ImportsPage } from './pages/ImportsPage';
import { LocalMigrationPage } from './pages/LocalMigrationPage';
import { MembersPage, SettingsPage } from './pages/MembersPage';
import { AccountPage } from './pages/AccountPage';
import { Spinner, ToastProvider } from './ui';

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="auth-wrap"><Spinner /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<RegisterPage />} />
          <Route path="/recuperar" element={<ResetPage />} />
          <Route element={<Protected><PlainLayout /></Protected>}>
            <Route path="/" element={<DrugstoresPage />} />
            <Route path="/cuenta" element={<AccountPage />} />
          </Route>
          <Route path="/d/:id" element={<Protected><DrugstoreLayout /></Protected>}>
            <Route index element={<DashboardPage />} />
            <Route path="vencimientos" element={<ExpirationsPage />} />
            <Route path="residuos" element={<WastePage />} />
            <Route path="segregacion" element={<SegregationPage />} />
            <Route path="personal" element={<StaffPage />} />
            <Route path="plan" element={<Navigate to="../diagnostico?v=mejoras" replace />} />
            <Route path="diagnostico" element={<DiagnosticoPage />} />
            <Route path="reporte" element={<ReportPage />} />
            <Route path="normativa" element={<NormativaPage />} />
            <Route path="importar" element={<ImportsPage />} />
            <Route path="migrar" element={<LocalMigrationPage />} />
            <Route path="miembros" element={<MembersPage />} />
            <Route path="configuracion" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
