import type { AuthProfile } from '@/features/auth/use-auth';

export const workerNavigationItems = [
  { key: 'live', label: 'En vivo', href: '/(app)/worker' },
  { key: 'queue', label: 'Cola', href: '/(app)/worker-queue' },
  { key: 'history', label: 'Historial', href: '/(app)/worker-history' },
  { key: 'profile', label: 'Perfil', href: '/(app)/worker-profile' },
] as const;

export type WorkerNavigationKey = (typeof workerNavigationItems)[number]['key'];

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
  | 'worker'
  | 'worker-queue'
  | 'worker-history'
  | 'worker-profile';

const customerRoutes = new Set<AppRouteName>();
const workerRoutes = new Set<AppRouteName>(['worker', 'worker-queue', 'worker-history', 'worker-profile']);
const adminRoutes = new Set<AppRouteName>(['admin', 'configuration']);

export function appRouteNameFromSegments(segments: readonly string[]): AppRouteName {
  const leaf = segments.at(-1);
  return leaf && !leaf.startsWith('(') ? leaf as AppRouteName : 'index';
}

export function roleCanAccessAppRoute(profile: AuthProfile | null | undefined, route: AppRouteName): boolean {
  if (profile?.role === 'cliente') return customerRoutes.has(route);
  if (profile?.role === 'personal') return typeof profile.businessId === 'string' && profile.businessId.length > 0 && workerRoutes.has(route);
  if (profile?.role === 'admin') return adminRoutes.has(route);
  return false;
}
