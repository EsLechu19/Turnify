import type { AuthProfile } from '@/features/auth/use-auth';

export const customerNavigationItems = [
  { key: 'home', label: 'Inicio', href: '/(app)' },
  { key: 'history', label: 'Mis turnos', href: '/(app)/history' },
  { key: 'profile', label: 'Perfil', href: '/(app)/profile' },
] as const;

export type CustomerNavigationKey = (typeof customerNavigationItems)[number]['key'];
export type AppRouteName =
  | 'index'
  | 'admin'
  | 'configuration'
  | 'history'
  | 'preview'
  | 'profile'
  | 'register-business'
  | 'scan'
  | 'ticket'
  | 'worker';

const customerRoutes = new Set<AppRouteName>(['index', 'history', 'preview', 'profile', 'scan', 'ticket']);
const personalRoutes = new Set<AppRouteName>(['admin', 'configuration', 'index', 'worker']);
const adminRoutes = new Set<AppRouteName>(['admin', 'configuration', 'index']);

export function appRouteNameFromSegments(segments: readonly string[]): AppRouteName {
  const leaf = segments.at(-1);
  return leaf && !leaf.startsWith('(') ? leaf as AppRouteName : 'index';
}

export function roleCanAccessAppRoute(role: AuthProfile['role'], route: AppRouteName): boolean {
  if (role === 'cliente') return customerRoutes.has(route);
  if (role === 'personal') return personalRoutes.has(route);
  return adminRoutes.has(route);
}
