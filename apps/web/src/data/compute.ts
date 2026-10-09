import type { PanelStats, QueueTicket } from './types';

export function computeStats(tickets: QueueTicket[]): PanelStats {
  const active = tickets.filter((ticket) => ticket.status !== 'finalizado' && ticket.status !== 'ausente');
  const waitingTickets = active.filter((ticket) => ticket.status === 'espera');
  const totalWait = waitingTickets.reduce((sum, ticket) => sum + ticket.waitedMinutes, 0);

  return {
    waiting: waitingTickets.length,
    inService: active.filter((ticket) => ticket.status === 'atencion').length,
    called: active.filter((ticket) => ticket.status === 'llamado').length,
    completed: tickets.filter((ticket) => ticket.status === 'finalizado').length,
    absent: tickets.filter((ticket) => ticket.status === 'ausente').length,
    averageWaitMinutes: waitingTickets.length === 0 ? 0 : Math.round(totalWait / waitingTickets.length),
  };
}