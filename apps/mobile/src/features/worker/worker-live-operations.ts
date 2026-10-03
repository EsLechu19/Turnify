import type { WorkerTicket } from '@/features/queue/worker-barber-api';

export type WorkerLiveOperations = {
  compatibleTickets: WorkerTicket[];
  nextTicket: WorkerTicket | null;
  attentionTicket: WorkerTicket | null;
  calledTicket: WorkerTicket | null;
};

/** Maps only the authenticated worker queue payload into the live-tab states. */
export function mapWorkerLiveOperations(tickets: WorkerTicket[]): WorkerLiveOperations {
  const compatibleTickets = tickets.filter((ticket) => ticket.state === 'en_espera' || ticket.state === 'notificado');

  return {
    compatibleTickets,
    nextTicket: compatibleTickets[0] ?? null,
    attentionTicket: tickets.find((ticket) => ticket.state === 'en_atencion') ?? null,
    calledTicket: tickets.find((ticket) => ticket.state === 'llamado') ?? null,
  };
}
