import { describe, expect, it } from 'vitest';

import type { WorkerHistoryEntry } from '../../apps/mobile/src/features/queue/worker-barber-api';
import { filterWorkerHistoryByPeriod, formatHistoryDuration, summarizeWorkerHistory } from '../../apps/mobile/src/features/queue/worker-history-stats';

const base = new Date('2026-10-07T15:00:00');

function entry(overrides: Partial<WorkerHistoryEntry>): WorkerHistoryEntry {
  return {
    ticketId: 't1',
    visibleCode: 'A1',
    queueName: 'Cortes',
    serviceName: 'Corte',
    state: 'finalizado',
    completedAt: base.toISOString(),
    clientName: 'Cliente',
    startedAt: null,
    finishedAt: null,
    durationSeconds: null,
    ...overrides,
  };
}

describe('worker history stats', () => {
  it('filters today, week and month', () => {
    const entries = [
      entry({ ticketId: 'today', completedAt: new Date('2026-10-07T10:00:00').toISOString() }),
      entry({ ticketId: 'week', completedAt: new Date('2026-10-05T10:00:00').toISOString() }),
      entry({ ticketId: 'month', completedAt: new Date('2026-10-01T10:00:00').toISOString() }),
      entry({ ticketId: 'old', completedAt: new Date('2026-09-30T10:00:00').toISOString() }),
    ];

    expect(filterWorkerHistoryByPeriod(entries, 'hoy', base).map((e) => e.ticketId)).toEqual(['today']);
    expect(filterWorkerHistoryByPeriod(entries, 'semana', base).map((e) => e.ticketId)).toEqual(['today', 'week']);
    expect(filterWorkerHistoryByPeriod(entries, 'mes', base).map((e) => e.ticketId)).toEqual(['today', 'week', 'month']);
  });

  it('summarizes attended, absent and average duration', () => {
    const summary = summarizeWorkerHistory([
      entry({ durationSeconds: 600 }),
      entry({ ticketId: 't2', durationSeconds: 1200 }),
      entry({ ticketId: 't3', state: 'ausente', durationSeconds: null }),
    ]);

    expect(summary.attended).toBe(2);
    expect(summary.absent).toBe(1);
    expect(summary.averageDurationSeconds).toBe(900);
  });

  it('formats duration', () => {
    expect(formatHistoryDuration(900)).toBe('15 min');
    expect(formatHistoryDuration(null)).toBe('—');
  });
});
