import type { QueueTicket } from './types';

/** Next actionable ticket: a called ticket first, then the longest waiting one. */
export function nextActionableTicket(tickets: QueueTicket[]): QueueTicket | null {
  const called = tickets.filter((ticket) => ticket.status === 'llamado');

  if (called.length > 0) {
    return [...called].sort((a, b) => a.arrivesAt.localeCompare(b.arrivesAt))[0];
  }

  const waiting = tickets.filter((ticket) => ticket.status === 'espera');

  if (waiting.length === 0) {
    return null;
  }

  return [...waiting].sort((a, b) => b.waitedMinutes - a.waitedMinutes)[0];
}