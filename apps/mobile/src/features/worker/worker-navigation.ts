import type { AuthProfile } from '@/features/auth/use-auth';

export const workerNavigationItems = [
  { key: 'live', label: 'En vivo', href: '/(app)/worker' },
  { key: 'queue', label: 'Cola', href: '/(app)/worker-queue' },
  { key: 'history', label: 'Historial', href: '/(app)/worker-history' },
  { key: 'profile', label: 'Perfil', href: '/(app)/worker-profile' },
] as const;

export type WorkerNavigationKey = (typeof workerNavigationItems)[number]['key'];

/**
 * Routes of the authenticated app group. Administration lives in the web panel,
 * so the mobile app only serves customers and barbers.
 */
export type AppRouteName =
  | 'index'
  | 'history'
  | 'profile'
  | 'register-business'
  | 'worker'
  | 'worker-queue'
  | 'worker-history'
  | 'worker-profile'
  | 'worker-shops'
  | 'worker-walk-in';

const customerRoutes = new Set<AppRouteName>(['index', 'history', 'profile', 'register-business']);
const workerRoutes = new Set<AppRouteName>(['worker', 'worker-queue', 'worker-history', 'worker-profile', 'worker-walk-in']);

export function appRouteNameFromSegments(segments: readonly string[]): AppRouteName {
  const leaf = segments.at(-1);
  return leaf && !leaf.startsWith('(') ? leaf as AppRouteName : 'index';
}

export function roleCanAccessAppRoute(profile: AuthProfile | null | undefined, route: AppRouteName): boolean {
  if (profile?.role === 'cliente') return customerRoutes.has(route);
  if (profile?.role === 'personal') return route === 'worker-shops' || (typeof profile.businessId === 'string' && profile.businessId.length > 0 && workerRoutes.has(route));
  return false;
}
