import { describe, expect, it } from 'vitest';

import {
  canCancelTicket,
  presentTicketStatus,
  ticketPosition,
} from '../../apps/mobile/src/features/queue/ticket-presentation';

describe('commercial ticket presentation', () => {
  it('shows queue facts only while the ticket is waiting', () => {
    expect(presentTicketStatus('en_espera')).toMatchObject({
      label: 'En espera',
      showsQueueProgress: true,
    });
    expect(presentTicketStatus('notificado')).toMatchObject({
      label: 'Notificado',
      showsQueueProgress: true,
    });
    expect(presentTicketStatus('llamado').showsQueueProgress).toBe(false);
    expect(ticketPosition(2)).toBe(3);
  });

  it('maps called, in-service, and terminal states without false promises', () => {
    expect(presentTicketStatus('llamado').message).toBe('Tu turno fue llamado.');
    expect(presentTicketStatus('en_atencion').message).toBe('Tu servicio está en atención.');
    expect(presentTicketStatus('finalizado').message).toBe('Tu turno fue finalizado.');
    expect(presentTicketStatus('cancelado')).toMatchObject({ tone: 'destructive' });
    expect(presentTicketStatus('ausente')).toMatchObject({ tone: 'destructive' });
  });

  it('retains cancellation only for the contract-permitted waiting states', () => {
    expect(canCancelTicket('en_espera')).toBe(true);
    expect(canCancelTicket('notificado')).toBe(true);
    expect(canCancelTicket('llamado')).toBe(false);
    expect(canCancelTicket('en_atencion')).toBe(false);
    expect(canCancelTicket('finalizado')).toBe(false);
    expect(canCancelTicket('cancelado')).toBe(false);
    expect(canCancelTicket('ausente')).toBe(false);
  });
});
