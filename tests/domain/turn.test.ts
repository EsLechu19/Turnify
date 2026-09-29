import { describe, expect, it } from 'vitest';
import { ACTIVE, TERMINAL } from '../../src/domain/turn';
import type { TicketStatus } from '../../src/domain/turn';

// Verifies the status vocabularly matches the DB enum and the
// active/terminal partition covers every status exactly once.
describe('ticket status vocabulary', () => {
  it('exposes the seven statuses matching the DB enum', () => {
    const all: TicketStatus[] = [
      'en_espera',
      'notificado',
      'llamado',
      'en_atencion',
      'finalizado',
      'cancelado',
      'ausente',
    ];
    expect([...ACTIVE, ...TERMINAL].sort()).toEqual(all.sort());
  });

  it('marks the first four statuses as active', () => {
    expect(ACTIVE).toEqual(['en_espera', 'notificado', 'llamado', 'en_atencion']);
  });

  it('marks finalizado, cancelado and ausente as terminal', () => {
    expect(TERMINAL).toEqual(['finalizado', 'cancelado', 'ausente']);
  });
});
