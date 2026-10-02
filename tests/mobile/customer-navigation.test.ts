import { describe, expect, it } from 'vitest';

import {
  appRouteNameFromSegments,
  customerNavigationItems,
  roleCanAccessAppRoute,
} from '../../apps/mobile/src/features/customer/customer-navigation';
import { workerNavigationItems } from '../../apps/mobile/src/features/worker/worker-navigation';

describe('customer navigation', () => {
  it('offers only the approved customer destinations', () => {
    expect(customerNavigationItems).toEqual([
      { key: 'home', label: 'Inicio', href: '/(app)' },
      { key: 'history', label: 'Mis turnos', href: '/(app)/history' },
      { key: 'profile', label: 'Perfil', href: '/(app)/profile' },
    ]);
  });

  it('keeps customer booking and ticket routes available while blocking worker and admin routes', () => {
    expect(roleCanAccessAppRoute('cliente', 'preview')).toBe(true);
    expect(roleCanAccessAppRoute('cliente', 'ticket')).toBe(true);
    expect(roleCanAccessAppRoute('cliente', 'worker')).toBe(false);
    expect(roleCanAccessAppRoute('cliente', 'admin')).toBe(false);
    expect(roleCanAccessAppRoute('cliente', 'configuration')).toBe(false);
  });

  it('resolves the app group root as the customer landing route', () => {
    expect(appRouteNameFromSegments(['(app)'])).toBe('index');
    expect(appRouteNameFromSegments(['(app)', 'history'])).toBe('history');
  });

  it('offers approved worker destinations and prevents role route leakage', () => {
    expect(workerNavigationItems).toEqual([
      { key: 'live', label: 'En vivo', href: '/(app)/worker' },
      { key: 'queue', label: 'Cola', href: '/(app)/worker-queue' },
      { key: 'history', label: 'Historial', href: '/(app)/worker-history' },
      { key: 'profile', label: 'Perfil', href: '/(app)/worker-profile' },
    ]);
    expect(roleCanAccessAppRoute('personal', 'worker-queue')).toBe(true);
    expect(roleCanAccessAppRoute('personal', 'history')).toBe(false);
    expect(roleCanAccessAppRoute('cliente', 'worker-profile')).toBe(false);
    expect(roleCanAccessAppRoute('admin', 'worker-history')).toBe(false);
  });
});
