import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import { normalizeGuestDetails } from '../../apps/mobile/src/features/queue/guest-ticket-details';
import { activeGuestTicketRoute, canUseGuestTicket, isActiveGuestTicketStatus, isTerminalGuestTicketStatus, publicBookingRoutes, publicLaunchRoute, publicShopRoute } from '../../apps/mobile/src/features/public/public-route-policy';

describe('public guest flow contracts', () => {
  it('uses the public welcome as the launch route and shares a single discovery destination for code and QR entry', () => {
    expect(publicLaunchRoute).toBe('/');
    expect(publicShopRoute).toBe('/(public)/shop');
  });

  it('keeps the prescribed Stitch booking sequence without a separate confirmation route', () => {
    expect(publicBookingRoutes).toEqual([
      '/(public)/shop',
      '/(public)/service',
      '/(public)/barber',
      '/(public)/details',
      '/(public)/ticket',
    ]);
    expect(publicBookingRoutes.join(',')).not.toContain('/(public)/confirm');
  });

  it('requires a guest name and only preserves approved optional details', () => {
    expect(normalizeGuestDetails({ name: ' Ada ', ageRange: '25_34', gender: 'female' }))
      .toEqual({ name: 'Ada', ageRange: '25_34', gender: 'female' });
    expect(() => normalizeGuestDetails({ name: '' })).toThrow();
  });

  it('does not expose a guest ticket from its visible code alone', () => {
    expect(canUseGuestTicket(null)).toBe(false);
    expect(canUseGuestTicket({ ticketId: 'ticket', capability: '' })).toBe(false);
    expect(canUseGuestTicket({ ticketId: 'ticket', capability: 'unguessable-capability' })).toBe(true);
  });

  it('keeps active states on the existing ticket target and restores launch eligibility for terminal states', () => {
    expect(isActiveGuestTicketStatus('en_espera')).toBe(true);
    expect(isActiveGuestTicketStatus('llamado')).toBe(true);
    expect(activeGuestTicketRoute('llamado')).toBe('/(public)/ticket');
    expect(isTerminalGuestTicketStatus('finalizado')).toBe(true);
    expect(isTerminalGuestTicketStatus('cancelado')).toBe(true);
    expect(isTerminalGuestTicketStatus('ausente')).toBe(true);
  });

  it('does not serialize the capability into public booking routes', () => {
    expect(publicBookingRoutes.join(',')).not.toContain('capability');
    expect(activeGuestTicketRoute('en_espera')).not.toContain('capability');
  });

  it('resolves the root route to the demo login without capability persistence', () => {
    const home = readFileSync('apps/mobile/src/app/index.tsx', 'utf8');
    const session = readFileSync('apps/mobile/src/features/public/guest-flow-session.tsx', 'utf8');

    expect(home).toContain("export { default } from './(auth)/login'");
    expect(home).not.toContain('<View');
    expect(home).not.toContain('<ScrollView');
    expect(session).not.toMatch(/AsyncStorage|SecureStore|capability.*params/i);
  });

  it('redirects discovery entry points to the active ticket while ticket access exists', () => {
    const scan = readFileSync('apps/mobile/src/app/(public)/scan.tsx', 'utf8');
    const shop = readFileSync('apps/mobile/src/app/(public)/shop.tsx', 'utf8');

    expect(scan).toContain('hasActiveTicketAccess');
    expect(scan).toContain("router.replace('/(public)/ticket')");
    expect(shop).toContain('hasActiveTicketAccess');
    expect(shop).toContain("router.replace('/(public)/ticket')");
  });
});
