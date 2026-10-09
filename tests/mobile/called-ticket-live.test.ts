import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('called ticket live update', () => {
  it('repolls the guest ticket while the screen stays focused', () => {
    const ticket = source('../../apps/mobile/src/app/(public)/ticket.tsx');

    expect(ticket).toContain('GUEST_TICKET_POLL_MS');
    expect(ticket).toContain('setInterval');
    expect(ticket).toContain('clearInterval');
  });

  it('keeps the called-ticket hero, countdown, assignment, and tolerance copy', () => {
    const called = source('../../apps/mobile/src/components/customer/called-guest-ticket.tsx');

    expect(called).toContain('¡ES TU TURNO!');
    expect(called).toContain('LLAMANDO');
    expect(called).toContain('Tienes 5 minutos de tolerancia');
    expect(called).toContain('Ya estoy aquí');
    expect(called).toContain('Llego en 2 minutos');
  });
});
