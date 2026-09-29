// ETA helpers: derive wait estimates from queue position and resolve
// the average service duration from samples. Pure functions only;
// status literals stay in Spanish, everything else is in English.
import {
  DEFAULT_PREFERENCIAL_CADA,
  orderWaiting,
  type QueueSnapshotItem,
} from './queue';

// Fallback service duration in seconds when samples are too scarce.
export const DEFAULT_FALLBACK_SECONDS = 300;

// Minimum samples required before trusting the measured average.
export const DEFAULT_MIN_SAMPLES = 3;

// Derives ETA minutes for someone with personasDelante people ahead:
// ceil(delante * promedio / puestos / 60), floored at 1 minute while
// anyone is ahead and exactly 0 when nobody is ahead.
export function deriveEtaMinutes(
  personasDelante: number,
  duracionPromedioSeg: number,
  puestosActivos: number,
): number {
  if (!Number.isFinite(personasDelante) || personasDelante < 0) {
    throw new RangeError(
      `personasDelante must be a non-negative number, got "${personasDelante}"`,
    );
  }
  if (!Number.isFinite(duracionPromedioSeg) || duracionPromedioSeg <= 0) {
    throw new RangeError(
      `duracionPromedioSeg must be a positive number, got "${duracionPromedioSeg}"`,
    );
  }
  if (!Number.isInteger(puestosActivos) || puestosActivos < 1) {
    throw new RangeError(
      `puestosActivos must be a positive integer, got "${puestosActivos}"`,
    );
  }
  if (personasDelante === 0) {
    return 0;
  }
  const rawMinutes =
    (personasDelante * duracionPromedioSeg) / puestosActivos / 60;
  return Math.max(1, Math.ceil(rawMinutes));
}

// Resolves the average service duration from measured samples,
// falling back while fewer than minSamples measurements exist.
export function resolveAverage(
  samples: readonly number[],
  fallback: number = DEFAULT_FALLBACK_SECONDS,
  minSamples: number = DEFAULT_MIN_SAMPLES,
): number {
  if (samples.length < minSamples) {
    return fallback;
  }
  const total = samples.reduce((sum, sample) => sum + sample, 0);
  return total / samples.length;
}

// Options for projecting the waiting queue with per-ticket ETAs.
export interface ProjectQueueOptions {
  averageSeconds: number;
  activeCounters: number;
  preferencialCada?: number;
}

// Projected queue entry: position, people ahead and ETA minutes.
export interface ProjectedEntry {
  id: string;
  posicion: number;
  personasDelante: number;
  etaMinutes: number;
}

// Projects the waiting queue, combining slot order with one ETA per
// ticket. Non-waiting tickets are skipped; positions stay gapless.
export function projectQueue(
  queue: readonly QueueSnapshotItem[],
  options: ProjectQueueOptions,
): ProjectedEntry[] {
  const ordered = orderWaiting(
    queue,
    options.preferencialCada ?? DEFAULT_PREFERENCIAL_CADA,
  );
  return ordered.map((slot) => {
    const personasDelante = slot.posicion - 1;
    return {
      id: slot.id,
      posicion: slot.posicion,
      personasDelante,
      etaMinutes: deriveEtaMinutes(
        personasDelante,
        options.averageSeconds,
        options.activeCounters,
      ),
    };
  });
}
