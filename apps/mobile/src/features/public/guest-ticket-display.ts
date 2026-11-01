import type { GuestTicketState } from '@/features/queue/public-guest-ticket-api';

export function canRespondToGuestCall(ticket: GuestTicketState, now = Date.now()): boolean {
  const deadline = ticket.calledDeadlineAt ? Date.parse(ticket.calledDeadlineAt) : NaN;
  return ticket.status === 'llamado' && !ticket.customerResponse && Number.isFinite(deadline) && deadline > now;
}

export function queueMetrics(ticket: GuestTicketState): { ahead: string; wait: string } {
  const ahead = Number.isInteger(ticket.peopleAhead) && ticket.peopleAhead >= 0 ? ticket.peopleAhead : null;
  const wait = Number.isFinite(ticket.waitMinutes) && ticket.waitMinutes >= 0 ? ticket.waitMinutes : null;
  return {
    ahead: ahead === null ? 'Sin datos' : String(ahead),
    wait: wait === null ? 'Sin estimación' : ahead === 0 ? 'Ahora' : `~${Math.ceil(wait)} min`,
  };
}
