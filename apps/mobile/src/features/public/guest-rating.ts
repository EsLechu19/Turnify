import type { GuestTicketState } from '@/features/queue/public-guest-ticket-api';

export function guestRatingState(ticket: GuestTicketState, now = Date.now()): 'pending' | 'rated' | 'expired' | 'unavailable' {
  if (ticket.puntuacion != null) return 'rated';
  const deadline = ticket.ratingDeadlineAt ? Date.parse(ticket.ratingDeadlineAt) : NaN;
  if (!Number.isFinite(deadline)) return 'unavailable';
  if (now >= deadline) return 'expired';
  return ticket.canRate ? 'pending' : 'expired';
}
