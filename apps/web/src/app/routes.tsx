import { Navigate, Route, Routes } from 'react-router-dom';

import { AppShell } from '@/layouts/AppShell';
import { RedirectIfAuthenticated, RequireAdmin, RequireAuth } from '@/app/RequireAuth';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { HistoryPage } from '@/features/history/HistoryPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { ServicesPage } from '@/features/services/ServicesPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { TeamPage } from '@/features/team/TeamPage';

/** `/login` is public; every panel section sits behind the session gate. */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<RedirectIfAuthenticated />}>
        <Route element={<LoginPage />} path="/login" />
        <Route element={<RegisterPage />} path="/register" />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<RequireAdmin />}>
          <Route element={<AppShell />}>
          <Route element={<DashboardPage />} index />
          <Route element={<ServicesPage />} path="servicios" />
            <Route element={<TeamPage />} path="equipo" />
            <Route element={<HistoryPage />} path="historial" />
            <Route element={<SettingsPage />} path="configuracion" />
            <Route element={<Navigate replace to="/" />} path="*" />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}