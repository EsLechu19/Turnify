import { describe, expect, it } from 'vitest';

import {
  appRouteNameFromSegments,
  customerNavigationItems,
  roleCanAccessAppRoute,
} from '../../apps/mobile/src/features/customer/customer-navigation';

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
});
