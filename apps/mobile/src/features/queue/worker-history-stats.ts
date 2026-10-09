import type { WorkerHistoryEntry } from './worker-barber-api';

export type WorkerHistoryPeriod = 'hoy' | 'semana' | 'mes';

export type WorkerHistorySummary = {
  attended: number;
  absent: number;
  total: number;
  averageDurationSeconds: number | null;
};

/** Fixed Lima offset (America/Lima has no DST). */
const LIMA_MS = 5 * 3600_000;
const DAY_MS = 24 * 3600_000;

/** Lima calendar day number (days since epoch) holding the instant. */
function limaDayNumber(when: Date): number {
  return Math.floor((when.getTime() - LIMA_MS) / DAY_MS);
}

/** Absolute instant of a Lima-midnight day number. */
function limaMidnight(dayNumber: number): Date {
  return new Date(dayNumber * DAY_MS + LIMA_MS);
}

export function periodStart(period: WorkerHistoryPeriod, now: Date): Date {
  const today = limaDayNumber(now);

  if (period === 'hoy') return limaMidnight(today);

  if (period === 'semana') {
    // 1970-01-01 was Thursday, so Monday is offset 0 here.
    const weekdayMondayFirst = (((today + 3) % 7) + 7) % 7;
    return limaMidnight(today - weekdayMondayFirst);
  }

  const probe = new Date(today * DAY_MS);
  return new Date(Date.UTC(probe.getUTCFullYear(), probe.getUTCMonth(), 1) + LIMA_MS);
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
  return new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit' }).format(value);
}
