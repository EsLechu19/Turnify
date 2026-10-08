import type { WorkerHistoryEntry } from './worker-barber-api';

export type WorkerHistoryPeriod = 'hoy' | 'semana' | 'mes';

export type WorkerHistorySummary = {
  attended: number;
  absent: number;
  total: number;
  averageDurationSeconds: number | null;
};

export function periodStart(period: WorkerHistoryPeriod, now: Date): Date {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (period === 'hoy') return start;
  if (period === 'semana') {
    const day = start.getDay() === 0 ? 7 : start.getDay();
    start.setDate(start.getDate() - (day - 1));
    return start;
  }
  start.setDate(1);
  return start;
}

export function isInHistoryPeriod(iso: string | null, period: WorkerHistoryPeriod, now: Date): boolean {
  if (!iso) return false;
  const value = new Date(iso);
  return !Number.isNaN(value.getTime()) && value >= periodStart(period, now) && value <= now;
}

export function filterWorkerHistoryByPeriod(entries: WorkerHistoryEntry[], period: WorkerHistoryPeriod, now: Date): WorkerHistoryEntry[] {
  return entries.filter((entry) => isInHistoryPeriod(entry.completedAt, period, now));
}

export function summarizeWorkerHistory(entries: WorkerHistoryEntry[]): WorkerHistorySummary {
  const attendedEntries = entries.filter((entry) => entry.state === 'finalizado');
  const durationValues = attendedEntries
    .map((entry) => entry.durationSeconds)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0);

  return {
    attended: attendedEntries.length,
    absent: entries.filter((entry) => entry.state === 'ausente').length,
    total: entries.length,
    averageDurationSeconds: durationValues.length === 0 ? null : Math.round(durationValues.reduce((sum, value) => sum + value, 0) / durationValues.length),
  };
}

export function formatHistoryDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '—';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function formatHistoryTime(iso: string | null): string {
  if (!iso) return '—';
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return '—';
  return new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit' }).format(value);
}
