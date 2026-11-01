import { describe, expect, it } from 'vitest';
import { canRespondToGuestCall, queueMetrics } from '../../apps/mobile/src/features/public/guest-ticket-display';
import type { GuestTicketState } from '../../apps/mobile/src/features/queue/public-guest-ticket-api';

const called = { status: 'llamado', calledDeadlineAt: '2026-10-31T12:02:00Z', customerResponse: null } as GuestTicketState;

describe('mobile guest ticket display rules', () => {
  it('uses the effective server deadline, never an assumed grace period', () => {
    expect(canRespondToGuestCall(called, Date.parse('2026-10-31T12:01:59Z'))).toBe(true);
    expect(canRespondToGuestCall(called, Date.parse('2026-10-31T12:02:00Z'))).toBe(false);
    expect(canRespondToGuestCall({ ...called, calledDeadlineAt: null })).toBe(false);
    expect(canRespondToGuestCall({ ...called, customerResponse: 'presente' })).toBe(false);
  });

  it('never turns unknown wait into a fabricated position or estimate', () => {
    expect(queueMetrics({ ...called, peopleAhead: -1, waitMinutes: NaN })).toEqual({ ahead: 'Sin datos', wait: 'Sin estimación' });
    expect(queueMetrics({ ...called, peopleAhead: 2, waitMinutes: 7 })).toEqual({ ahead: '2', wait: '~7 min' });
  });
});
