import type { TicketState } from './queue-api';

export type TicketStatusPresentation = {
  label: string;
  message: string;
  tone: 'primary' | 'destructive';
  showsQueueProgress: boolean;
  isActiveTurn: boolean;
  isCompletedTurn: boolean;
};

export function presentTicketStatus(status: TicketState['status']): TicketStatusPresentation {
  switch (status) {
    case 'en_espera':
      return {
        label: 'En espera',
        message: 'Tu turno está en espera.',
        tone: 'primary',
        showsQueueProgress: true,
        isActiveTurn: false,
        isCompletedTurn: false,
      };
    case 'notificado':
      return {
        label: 'Notificado',
        message: 'Tu turno sigue en espera.',
        tone: 'primary',
        showsQueueProgress: true,
        isActiveTurn: false,
        isCompletedTurn: false,
      };
    case 'llamado':
      return {
        label: 'Llamado',
        message: 'Tu turno fue llamado.',
        tone: 'primary',
        showsQueueProgress: false,
        isActiveTurn: true,
        isCompletedTurn: false,
      };
    case 'en_atencion':
      return {
        label: 'En atención',
        message: 'Tu servicio está en atención.',
        tone: 'primary',
        showsQueueProgress: false,
        isActiveTurn: false,
        isCompletedTurn: false,
      };
    case 'finalizado':
      return {
        label: 'Finalizado',
        message: 'Tu turno fue finalizado.',
        tone: 'primary',
        showsQueueProgress: false,
        isActiveTurn: false,
        isCompletedTurn: true,
      };
    case 'cancelado':
      return {
        label: 'Cancelado',
        message: 'Tu turno fue cancelado.',
        tone: 'destructive',
        showsQueueProgress: false,
        isActiveTurn: false,
        isCompletedTurn: false,
      };
    case 'ausente':
      return {
        label: 'Ausente',
        message: 'Tu turno fue marcado como ausente.',
        tone: 'destructive',
        showsQueueProgress: false,
        isActiveTurn: false,
        isCompletedTurn: false,
      };
  }
}

export function canCancelTicket(status: TicketState['status']): boolean {
  return status === 'en_espera' || status === 'notificado';
}

export function ticketPosition(peopleAhead: number): number {
  return peopleAhead + 1;
}

export function formatEstimatedWait(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}
