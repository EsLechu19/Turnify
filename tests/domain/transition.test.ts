import { describe, expect, it } from 'vitest';
import { IllegalTransitionError, TurnNotFoundError } from '../../src/domain/errors';
import type { Ticket } from '../../src/domain/turn';
import {
  applyTransition,
  canTransition,
  compactActivePositions,
} from '../../src/domain/transition';
import { buildTicket } from './factories';

describe('canTransition', () => {
  it('allows every forward transition from the spec', () => {
    const allowed: Array<[Ticket['status'], Ticket['status']]> = [
      ['en_espera', 'notificado'],
      ['en_espera', 'llamado'],
      ['en_espera', 'cancelado'],
      ['notificado', 'llamado'],
      ['notificado', 'cancelado'],
      ['llamado', 'en_atencion'],
      ['llamado', 'ausente'],
      ['en_atencion', 'finalizado'],
    ];
    for (const [from, to] of allowed) {
      expect(canTransition(from, to)).toBe(true);
    }
  });

  it('rejects backward, skipping and same-status transitions', () => {
    const denied: Array<[Ticket['status'], Ticket['status']]> = [
      ['notificado', 'en_espera'],
      ['llamado', 'notificado'],
      ['llamado', 'en_espera'],
      ['en_atencion', 'llamado'],
      ['en_espera', 'en_atencion'],
      ['en_espera', 'finalizado'],
      ['notificado', 'finalizado'],
      ['llamado', 'cancelado'],
      ['llamado', 'finalizado'],
      ['en_atencion', 'cancelado'],
      ['en_atencion', 'ausente'],
      ['en_espera', 'en_espera'],
      ['finalizado', 'finalizado'],
    ];
    for (const [from, to] of denied) {
      expect(canTransition(from, to)).toBe(false);
    }
  });

  it('rejects every transition out of a terminal status', () => {
    const terminal: Ticket['status'][] = ['finalizado', 'cancelado', 'ausente'];
    const anyStatus: Ticket['status'][] = [
      'en_espera',
      'notificado',
      'llamado',
      'en_atencion',
      'finalizado',
      'cancelado',
      'ausente',
    ];
    for (const from of terminal) {
      for (const to of anyStatus) {
        expect(canTransition(from, to)).toBe(false);
      }
    }
  });
});

describe('applyTransition', () => {
  it('moves the ticket to the next status', () => {
    const ticket = buildTicket({ status: 'en_espera' });
    const next = applyTransition(ticket, 'notificado');
    expect(next.status).toBe('notificado');
    expect(next.id).toBe(ticket.id);
  });

  it('does not mutate the original ticket', () => {
    const ticket = buildTicket({ status: 'llamado' });
    const frozen = Object.freeze({ ...ticket });
    const next = applyTransition(frozen, 'en_atencion');
    expect(next).not.toBe(ticket);
    expect(ticket.status).toBe('llamado');
    expect(next.status).toBe('en_atencion');
  });

  it('throws IllegalTransitionError on any illegal move', () => {
    const ticket = buildTicket({ status: 'en_espera' });
    expect(() => applyTransition(ticket, 'finalizado')).toThrow(IllegalTransitionError);
    try {
      applyTransition(ticket, 'finalizado');
    } catch (error) {
      expect(error).toBeInstanceOf(IllegalTransitionError);
      expect((error as IllegalTransitionError).name).toBe('IllegalTransitionError');
    }
  });
});

describe('compactActivePositions', () => {
  it('keeps active tickets in order and drops terminal ones', () => {
    const tickets = [
      buildTicket({ status: 'en_espera' }),
      buildTicket({ status: 'finalizado' }),
      buildTicket({ status: 'llamado' }),
      buildTicket({ status: 'cancelado' }),
      buildTicket({ status: 'ausente' }),
      buildTicket({ status: 'en_atencion' }),
    ];
    const compacted = compactActivePositions(tickets);
    expect(compacted.map((ticket) => ticket.status)).toEqual([
      'en_espera',
      'llamado',
      'en_atencion',
    ]);
  });

  it('returns a new array and leaves the input untouched', () => {
    const tickets = [buildTicket({ status: 'notificado' })];
    const compacted = compactActivePositions(tickets);
    expect(compacted).not.toBe(tickets);
    expect(tickets).toHaveLength(1);
  });
});

describe('domain errors', () => {
  it('exposes typed errors extending Error with their names set', () => {
    const illegal = new IllegalTransitionError('en_espera', 'finalizado');
    expect(illegal).toBeInstanceOf(Error);
    expect(illegal).toBeInstanceOf(IllegalTransitionError);
    expect(illegal.name).toBe('IllegalTransitionError');
    expect(illegal.message).toContain('en_espera');
    expect(illegal.message).toContain('finalizado');

    const missing = new TurnNotFoundError('ticket-9');
    expect(missing).toBeInstanceOf(Error);
    expect(missing).toBeInstanceOf(TurnNotFoundError);
    expect(missing.name).toBe('TurnNotFoundError');
    expect(missing.message).toContain('ticket-9');
  });
});
