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

/** Keeps a signed-in user away from the login form. */
export function RedirectIfAuthenticated() {
  const { status } = useAuth();

  if (status === 'restoring') {
    return null;
  }

  if (status === 'authenticated') {
    return <Navigate replace to="/" />;
  }

  return <Outlet />;
}