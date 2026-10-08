import { describe, expect, it } from 'vitest';

import {
  appRouteNameFromSegments,
  customerNavigationItems,
  roleCanAccessAppRoute,
} from '../../apps/mobile/src/features/customer/customer-navigation';
import { workerNavigationItems } from '../../apps/mobile/src/features/worker/worker-navigation';
import { staffLanding } from '../../apps/mobile/src/features/public/public-route-policy';

describe('customer navigation', () => {
  it('keeps account destinations out of the public guest flow', () => {
    expect(customerNavigationItems).toEqual([
      { key: 'home', label: 'Inicio', href: '/(app)' },
      { key: 'barbers', label: 'Barberías', href: '/(app)/barbers' },
      { key: 'history', label: 'Mis turnos', href: '/(app)/history' },
      { key: 'profile', label: 'Perfil', href: '/(app)/profile' },
    ]);
  });

  it('denies authenticated customer routes while preserving staff-only access', () => {
    const customer = { role: 'cliente' as const, businessId: null };

    expect(roleCanAccessAppRoute(customer, 'preview')).toBe(false);
    expect(roleCanAccessAppRoute(customer, 'ticket')).toBe(false);
    expect(roleCanAccessAppRoute(customer, 'worker')).toBe(false);
    expect(roleCanAccessAppRoute(customer, 'admin')).toBe(false);
    expect(roleCanAccessAppRoute(customer, 'configuration')).toBe(false);
  });

  it('does not make the protected app group a landing route', () => {
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
    const worker = { role: 'personal' as const, businessId: 'shop' };

    expect(roleCanAccessAppRoute(worker, 'worker-queue')).toBe(true);
    expect(roleCanAccessAppRoute(worker, 'history')).toBe(false);
    expect(roleCanAccessAppRoute({ role: 'cliente', businessId: null }, 'worker-profile')).toBe(false);
    expect(roleCanAccessAppRoute({ role: 'admin', businessId: 'shop' }, 'worker-history')).toBe(false);
  });

  it('redirects authenticated staff to their existing role-safe operational landing', () => {
    expect(staffLanding({ role: 'personal', businessId: 'shop' })).toBe('/(app)/worker');
    expect(staffLanding({ role: 'admin', businessId: 'shop' })).toBe('/(app)/admin');
    expect(staffLanding({ role: 'cliente', businessId: null })).toBe('/');
  });
});
