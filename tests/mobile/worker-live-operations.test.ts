import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { mapWorkerLiveOperations } from '../../apps/mobile/src/features/worker/worker-live-operations';
import { workerNavigationItems } from '../../apps/mobile/src/features/worker/worker-navigation';

const source = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const ticket = (state: 'en_espera' | 'notificado' | 'llamado' | 'en_atencion', visibleCode: string) => ({
  ticketId: visibleCode,
  queueId: 'queue-1',
  queueName: 'Main queue',
  visibleCode,
  state,
  serviceName: 'Haircut',
  requestedBarberName: null,
  assignedBarberName: null,
  calledDeadlineAt: null,
  customerResponse: null,
  customerResponseAt: null,
  inicioEn: null,
});

describe('Worker live operations mapping', () => {
  it('keeps the real compatible order and exposes its first ticket as the next action', () => {
    const operations = mapWorkerLiveOperations([ticket('notificado', 'A-02'), ticket('en_espera', 'A-03'), ticket('llamado', 'A-01')]);

    expect(operations.compatibleTickets.map(({ visibleCode }) => visibleCode)).toEqual(['A-02', 'A-03']);
    expect(operations.nextTicket?.visibleCode).toBe('A-02');
    expect(operations.calledTicket?.visibleCode).toBe('A-01');
  });

  it('shows attention only for an actual in-service ticket and leaves an empty compatible queue honest', () => {
    const operations = mapWorkerLiveOperations([ticket('en_atencion', 'A-04')]);

    expect(operations.attentionTicket?.visibleCode).toBe('A-04');
    expect(operations.compatibleTickets).toEqual([]);
    expect(operations.nextTicket).toBeNull();
  });

  it('retains the four Worker destinations in the persistent navigation', () => {
    expect(workerNavigationItems).toEqual([
      { key: 'live', label: 'En vivo', href: '/(app)/worker' },
      { key: 'queue', label: 'Cola', href: '/(app)/worker-queue' },
      { key: 'history', label: 'Historial', href: '/(app)/worker-history' },
      { key: 'profile', label: 'Perfil', href: '/(app)/worker-profile' },
    ]);
  });

  it('lets the worker mark the in-service ticket absent from the attention card', () => {
    const jornada = source('../../apps/mobile/src/app/(app)/worker.tsx');

    expect(jornada).toContain('En atención ahora');
    expect(jornada).toContain('markMyTicketAbsent(attentionTicket.ticketId)');
  });

  it('re-syncs the worker screens while a called ticket is active', () => {
    const jornada = source('../../apps/mobile/src/app/(app)/worker.tsx');
    const queue = source('../../apps/mobile/src/app/(app)/worker-queue.tsx');

    for (const screen of [jornada, queue]) {
      expect(screen).toContain("state === 'llamado'");
      expect(screen).toContain('setInterval');
      expect(screen).toContain('void refresh()');
    }
  });

  it('shows the elapsed attention time on the in-service card', () => {
    const jornada = source('../../apps/mobile/src/app/(app)/worker.tsx');
    const hook = source('../../apps/mobile/src/features/worker/use-remaining-tolerance.ts');
    const api = source('../../apps/mobile/src/features/queue/worker-barber-api.ts');

    expect(api).toContain('inicioEn: ticket.inicio_en');
    expect(hook).toContain('useElapsedSince');
    expect(jornada).toContain('useElapsedSince');
  });

  it('shows the called ticket with a live synchronized tolerance in the Cola tab', () => {
    const queue = source('../../apps/mobile/src/app/(app)/worker-queue.tsx');
    const hook = source('../../apps/mobile/src/features/worker/use-remaining-tolerance.ts');
    const jornada = source('../../apps/mobile/src/app/(app)/worker.tsx');

    expect(queue).toContain('useRemainingTolerance');
    expect(queue).toContain('calledDeadlineAt');
    expect(queue).toContain('LLAMADO');
    expect(queue).toContain('restantes');
    expect(hook).toContain('setInterval(() => setNow(Date.now()), 1000)');
    expect(jornada).toContain('@/features/worker/use-remaining-tolerance');
  });
});
