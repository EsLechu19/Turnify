import { describe, expect, it } from 'vitest';
import { guestRatingState } from '../../apps/mobile/src/features/public/guest-rating';
import type { GuestTicketState } from '../../apps/mobile/src/features/queue/public-guest-ticket-api';

const state = (changes: Partial<GuestTicketState>): GuestTicketState => ({
  visibleCode: 'A', status: 'finalizado', peopleAhead: 0, waitMinutes: 0,
  serviceName: null, requestedBarberName: null, assignedBarberName: null,
  calledDeadlineAt: null, customerResponse: null, customerResponseAt: null,
  puntuacion: null, graciaMin: null, canRate: false, ratingDeadlineAt: null,
  ...changes,
});

describe('guest rating projection', () => {
  it('uses server eligibility but hides the action at the exact deadline', () => {
    const deadline = Date.parse('2026-11-01T00:00:00Z');
    const ticket = state({ canRate: true, ratingDeadlineAt: new Date(deadline).toISOString() });
    expect(guestRatingState(ticket, deadline - 1)).toBe('pending');
    expect(guestRatingState(ticket, deadline)).toBe('expired');
    expect(guestRatingState(state({ ...ticket, canRate: false }), deadline - 1)).toBe('expired');
    expect(guestRatingState(state({ ...ticket, puntuacion: 4 }), deadline - 1)).toBe('rated');
    expect(guestRatingState(state({ ...ticket, ratingDeadlineAt: null }), deadline - 1)).toBe('unavailable');
    expect(guestRatingState(state({ ...ticket, ratingDeadlineAt: 'invalid' }), deadline - 1)).toBe('unavailable');
  });
});
