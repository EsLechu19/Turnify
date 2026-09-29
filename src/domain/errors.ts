// Typed domain errors for the ticket lifecycle.
export class IllegalTransitionError extends Error {
  readonly from: string;
  readonly to: string;

  constructor(from: string, to: string) {
    super(`Illegal ticket transition from "${from}" to "${to}"`);
    this.name = 'IllegalTransitionError';
    this.from = from;
    this.to = to;
  }
}

export class TurnNotFoundError extends Error {
  readonly ticketId: string;

  constructor(ticketId: string) {
    super(`Ticket not found: "${ticketId}"`);
    this.name = 'TurnNotFoundError';
    this.ticketId = ticketId;
  }
}
