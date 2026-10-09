import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '@/state/AuthContext';

/**
 * Gate for every panel section. While the stored session is being read it
 * renders nothing to avoid flashing the login form on a reload; anonymous users
 * are sent to `/login`, remembering where they were headed.
 */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'restoring') {
    return null;
  }

  if (status === 'anonymous') {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  }

  return <Outlet />;
}

/**
 * Keeps a signed-in admin away from the login form. Non-admin sessions stay on
 * `/login` on purpose: sending them to `/` would bounce them straight back
 * here through `RequireAdmin`, looping forever on a blank screen.
 */
export function RedirectIfAuthenticated() {
  const { status, session } = useAuth();

  if (status === 'restoring') {
    return null;
  }

  if (status === 'authenticated' && session?.user.role === 'admin') {
    return <Navigate replace to="/" />;
  }

  return <Outlet />;
}

/**
 * Admin gate for the panel: only `admin` profiles operate here. Anyone else
 * (including `barbero`, who works from the mobile app) bounces to `/login`
 * with a message instead of a bare redirect.
 */
export function RequireAdmin() {
  const { status, session } = useAuth();
  const location = useLocation();

  if (status === 'restoring') {
    return null;
  }

  if (status === 'anonymous' || session?.user.role !== 'admin') {
    return (
      <Navigate
        replace
        state={{ from: location.pathname, message: 'Acceso solo para administradores.' }}
        to="/login"
      />
    );
  }

  return <Outlet />;
}