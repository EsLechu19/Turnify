// No-show grace sweep: marks called tickets absent once the grace
// window closes. Status literals stay in Spanish to match the database;
// every other identifier and comment in this module is in English.
import type { TicketStatus } from './turn';

// Minimal snapshot of a ticket needed to evaluate the no-show grace.
export interface NoShowSnapshotItem {
  id: string;
  status: TicketStatus;
  llamadoEn?: string;
}

// Result of a no-show sweep: the next snapshot plus expired ids.
export interface NoShowSweepResult {
  snapshot: NoShowSnapshotItem[];
  expiredIds: string[];
}

// Milliseconds per minute of grace.
const MS_PER_MINUTE = 60_000;

// Rejects grace windows below one minute; every entry point validates.
function assertValidGrace(minutosGracia: number): void {
  if (!Number.isFinite(minutosGracia) || minutosGracia < 1) {
    throw new RangeError(
      `minutosGracia must be at least 1, got "${minutosGracia}"`,
    );
  }
}

// Reports whether a ticket called at llamadoEn is past the grace window
// at now. The cutoff is inclusive: elapsed >= grace means expired.
export function isPastGrace(
  llamadoEn: string,
  now: string | Date,
  minutosGracia: number,
): boolean {
  assertValidGrace(minutosGracia);
  const calledAt = Date.parse(llamadoEn);
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(now);
  return nowMs - calledAt >= minutosGracia * MS_PER_MINUTE;
}

// Collects the ids of llamado tickets past the grace window.
// Tickets in any other status, or llamado tickets without a llamadoEn
// stamp, are never reported as expired.
export function expiredCalledTurnIds(
  snapshot: readonly NoShowSnapshotItem[],
  now: string | Date,
  minutosGracia: number,
): string[] {
  assertValidGrace(minutosGracia);
  return snapshot
    .filter(
      (item) =>
        item.status === 'llamado' &&
        item.llamadoEn !== undefined &&
        isPastGrace(item.llamadoEn, now, minutosGracia),
    )
    .map((item) => item.id);
}

// Sweeps a snapshot, moving expired llamado tickets to ausente.
// The input snapshot and its items are never mutated; every other
// status keeps its exact item reference in the new snapshot.
export function applyNoShowSweep(
  snapshot: readonly NoShowSnapshotItem[],
  now: string | Date,
  minutosGracia: number,
): NoShowSweepResult {
  assertValidGrace(minutosGracia);
  const expiredIds = expiredCalledTurnIds(snapshot, now, minutosGracia);
  const expired = new Set(expiredIds);
  return {
    snapshot: snapshot.map((item) =>
      expired.has(item.id) ? { ...item, status: 'ausente' as const } : item,
    ),
    expiredIds,
  };
}
