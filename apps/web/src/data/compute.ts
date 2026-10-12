import type { PanelStats, QueueTicket, ServiceMixItem, TeamMember } from './types';

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

/** Live service mix derived from the board tickets (replaces the static mix). */
export function computeServiceMix(tickets: QueueTicket[]): ServiceMixItem[] {
  const counts = new Map<string, number>();

  for (const ticket of tickets) {
    counts.set(ticket.service, (counts.get(ticket.service) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([service, count]) => ({ service, count }))
    .sort((a, b) => b.count - a.count);
}

const SUGGESTION_WINDOW = 30;
const OUTLIER_FACTOR = 2;

/**
 * Suggested duration from recent measurements: the last 30 valid ones, dropping
 * values over twice the median (interruptions must not move the estimate).
 */
export function suggestDuration(minutes: number[]): { suggested: number | null; measured: number } {
  const valid = minutes.filter((value) => Number.isFinite(value) && value > 0).slice(0, SUGGESTION_WINDOW);

  if (valid.length === 0) {
    return { suggested: null, measured: 0 };
  }

  const ordered = [...valid].sort((a, b) => a - b);
  const median = ordered[Math.floor(ordered.length / 2)];
  const kept = median <= 0 ? ordered : ordered.filter((value) => value <= median * OUTLIER_FACTOR);

  if (kept.length === 0) {
    return { suggested: null, measured: valid.length };
  }

  return {
    suggested: Math.round(kept.reduce((sum, value) => sum + value, 0) / kept.length),
    measured: valid.length,
  };
}

export type PanelAlert = {
  id: string;
  tone: 'danger' | 'gold' | 'brand';
  message: string;
  to: '/equipo' | '/historial';
};

const LONG_WAIT_MINUTES = 20;
const ABSENT_SPIKE_COUNT = 3;

/** Operational alerts derived from the live board (no invented thresholds beyond the documented ones). */
export function computeAlerts(tickets: QueueTicket[], team: TeamMember[]): PanelAlert[] {
  const alerts: PanelAlert[] = [];

  for (const member of team) {
    if (member.availability === 'atencion' && !member.currentTicket) {
      alerts.push({ id: `stuck-${member.id}`, tone: 'danger', message: `${member.name} figura ocupado sin turno.`, to: '/equipo' });
    }
  }

  for (const ticket of tickets) {
    if (ticket.status === 'llamado' && !ticket.barber) {
      alerts.push({ id: `unassigned-${ticket.id}`, tone: 'gold', message: `${ticket.code} llamado sin barbero.`, to: '/equipo' });
    }

    if (ticket.status === 'espera' && ticket.waitedMinutes >= LONG_WAIT_MINUTES) {
      alerts.push({ id: `waiting-${ticket.id}`, tone: 'gold', message: `${ticket.code} espera ${ticket.waitedMinutes} min.`, to: '/equipo' });
    }
  }

  const absent = tickets.filter((ticket) => ticket.status === 'ausente').length;

  if (absent >= ABSENT_SPIKE_COUNT) {
    alerts.push({ id: 'absent-spike', tone: 'danger', message: `${absent} ausentes hoy.`, to: '/historial' });
  }

  return alerts;
}