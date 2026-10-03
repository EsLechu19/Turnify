import { describe, expect, it } from 'vitest';

import { mapWorkerLiveOperations } from '../../apps/mobile/src/features/worker/worker-live-operations';
import { workerNavigationItems } from '../../apps/mobile/src/features/worker/worker-navigation';

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
});
