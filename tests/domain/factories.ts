import type { Ticket } from '../../src/domain/turn';

let sequence = 0;

// Builds a Ticket with sensible defaults; callers override per case.
export function buildTicket(overrides: Partial<Ticket> = {}): Ticket {
  sequence += 1;
  return {
    id: `ticket-${sequence}`,
    status: 'en_espera',
    ...overrides,
  };
}

// Resets the id sequence so tests stay deterministic when needed.
export function resetTicketSequence(): void {
  sequence = 0;
}
