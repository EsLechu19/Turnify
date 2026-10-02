import { describe, expect, it } from 'vitest';

import { normalizeGuestDetails } from '../../apps/mobile/src/features/queue/guest-ticket-details';
import { canUseGuestTicket, publicBookingRoutes, publicLaunchRoute, publicShopRoute } from '../../apps/mobile/src/features/public/public-route-policy';

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
});
