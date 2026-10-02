export {
  appRouteNameFromSegments,
  roleCanAccessAppRoute,
  type AppRouteName,
} from '../worker/worker-navigation';

export const customerNavigationItems = [
  { key: 'home', label: 'Inicio', href: '/(app)' },
  { key: 'history', label: 'Mis turnos', href: '/(app)/history' },
  { key: 'profile', label: 'Perfil', href: '/(app)/profile' },
] as const;

export type CustomerNavigationKey = (typeof customerNavigationItems)[number]['key'];
