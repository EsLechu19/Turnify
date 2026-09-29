import { IllegalTransitionError } from './errors';
import { ACTIVE, type Ticket, type TicketStatus } from './turn';

// Allowed next statuses per current status (forward-only machine).
// Anything not listed here is illegal and rejected.
const ALLOWED: Record<TicketStatus, TicketStatus[]> = {
  en_espera: ['notificado', 'llamado', 'cancelado'],
  notificado: ['llamado', 'cancelado'],
  llamado: ['en_atencion', 'ausente'],
  en_atencion: ['finalizado'],
  finalizado: [],
  cancelado: [],
  ausente: [],
};

// Reports whether a transition between two statuses is legal.
export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  return ALLOWED[from].includes(to);
}

// Moves a ticket forward, returning a new ticket object.
// The input ticket is never mutated; illegal moves throw.
export function applyTransition(ticket: Ticket, to: TicketStatus): Ticket {
  if (!canTransition(ticket.status, to)) {
    throw new IllegalTransitionError(ticket.status, to);
  }
  return { ...ticket, status: to };
}

// Keeps only active tickets, preserving their relative order.
// Terminal tickets (finalizado, cancelado, ausente) are dropped.
export function compactActivePositions(tickets: Ticket[]): Ticket[] {
  return tickets.filter((ticket) => ACTIVE.includes(ticket.status));
}
