export const accountNavigationItems = [
  { key: 'shops', label: 'Mis barberías', href: '/(app)/worker-shops' },
  { key: 'profile', label: 'Mi perfil', href: '/(app)/worker-profile' },
] as const;

export type WorkerAccountNavigationKey = (typeof accountNavigationItems)[number]['key'];
