import type {
  HistoryStatus,
  QueueTicket,
  StaffAvailability,
  TeamMember,
} from './types';

/**
 * Pure presentation labels and derivations for the panel.
 *
 * These used to live inside `data/mocks/*`, which forced features to import
 * fixtures to reach them. Labels live here now; mocks re-export them so
 * nothing else changes. Features must import from `@/data/labels`.
 */

/** Short copy for the station and team cards. `staffAvailabilityLabels` is the wording used by the staff form. */
export const availabilityLabels: Record<TeamMember['availability'], string> = {
  atencion: 'Ocupado',
  disponible: 'Disponible',
  descanso: 'En descanso',
  fuera: 'Fuera de turno',
};

export const statusLabels: Record<QueueTicket['status'], string> = {
  espera: 'En espera',
  llamado: 'Llamado',
  atencion: 'En atención',
  finalizado: 'Finalizado',
  ausente: 'Ausente',
};

export const statusTone: Record<QueueTicket['status'], 'neutral' | 'brand' | 'gold' | 'success' | 'danger'> = {
  espera: 'neutral',
  llamado: 'gold',
  atencion: 'brand',
  finalizado: 'success',
  ausente: 'danger',
};

export const staffAvailabilityLabels: Record<StaffAvailability, string> = {
  atencion: 'En atención',
  disponible: 'Disponible',
  descanso: 'En descanso',
  fuera: 'Fuera de atención',
};

export const staffAvailabilityTone: Record<StaffAvailability, 'brand' | 'success' | 'gold' | 'neutral'> = {
  atencion: 'brand',
  disponible: 'success',
  descanso: 'gold',
  fuera: 'neutral',
};

export const historyStatusLabels: Record<HistoryStatus, string> = {
  completado: 'Completado',
  ausencia: 'Ausencia',
  cancelado: 'Cancelado',
};

export const historyStatusTone: Record<HistoryStatus, 'success' | 'danger' | 'neutral'> = {
  completado: 'success',
  ausencia: 'danger',
  cancelado: 'neutral',
};

/** Minutes spent per finished service (8h shift / finished services today). */
export function paceOf(completedToday: number): number | null {
  if (completedToday <= 0) {
    return null;
  }

  return Math.round(480 / completedToday);
}

export function averageOf(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}
