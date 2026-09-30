import { describe, expect, it } from 'vitest';
import { orderWaiting } from '../../src/domain/queue';
import { buildQueue, buildQueueItem } from './factories';

// Verifies the waiting-queue ordering: priority slot interleaving,
// same-priority tie-breaks, waiting-only filtering and determinism.
describe('orderWaiting', () => {
  it('orders same-priority tickets by creadoEn then numero', () => {
    const queue = [
      buildQueueItem({ id: 'n-late', creadoEn: '2026-01-01T10:00:03Z', numero: 3 }),
      buildQueueItem({ id: 'n-early', creadoEn: '2026-01-01T10:00:01Z', numero: 1 }),
      buildQueueItem({ id: 'n-mid', creadoEn: '2026-01-01T10:00:02Z', numero: 2 }),
    ];
    expect(orderWaiting(queue).map((slot) => slot.id)).toEqual([
      'n-early',
      'n-mid',
      'n-late',
    ]);
  });

  it('breaks creadoEn ties by numero', () => {
    const queue = [
      buildQueueItem({ id: 'n-high', creadoEn: '2026-01-01T10:00:00Z', numero: 9 }),
      buildQueueItem({ id: 'n-low', creadoEn: '2026-01-01T10:00:00Z', numero: 2 }),
    ];
    expect(orderWaiting(queue).map((slot) => slot.id)).toEqual(['n-low', 'n-high']);
  });

  it('interleaves with N=3: preferential first, then three normals', () => {
    const queue = buildQueue({ normals: 6, preferentials: 2 });
    const ids = orderWaiting(queue, 3).map((slot) => slot.id);
    expect(ids).toEqual([
      'preferencial-1',
      'normal-1',
      'normal-2',
      'normal-3',
      'preferencial-2',
      'normal-4',
      'normal-5',
      'normal-6',
    ]);
  });

  it('uses the first slot for preferentials with a custom N=1', () => {
    const queue = buildQueue({ normals: 2, preferentials: 2 });
    const ids = orderWaiting(queue, 1).map((slot) => slot.id);
    expect(ids).toEqual(['preferencial-1', 'normal-1', 'preferencial-2', 'normal-2']);
  });

  it('defaults to a preferential first slot followed by three normals', () => {
    const queue = buildQueue({ normals: 4, preferentials: 1 });
    const ids = orderWaiting(queue).map((slot) => slot.id);
    expect(ids).toEqual([
      'preferencial-1',
      'normal-1',
      'normal-2',
      'normal-3',
      'normal-4',
    ]);
  });

  it('advances the other side without gaps when preferentials run out', () => {
    const queue = buildQueue({ normals: 5, preferentials: 1 });
    const ids = orderWaiting(queue, 3).map((slot) => slot.id);
    expect(ids).toEqual([
      'preferencial-1',
      'normal-1',
      'normal-2',
      'normal-3',
      'normal-4',
      'normal-5',
    ]);
  });

  it('advances normals without gaps when no preferentials wait', () => {
    const queue = buildQueue({ normals: 3, preferentials: 0 });
    const ids = orderWaiting(queue, 3).map((slot) => slot.id);
    expect(ids).toEqual(['normal-1', 'normal-2', 'normal-3']);
  });

  it('fills normal slots with preferentials when no normals wait', () => {
    const queue = buildQueue({ normals: 0, preferentials: 3 });
    const ids = orderWaiting(queue, 3).map((slot) => slot.id);
    expect(ids).toEqual(['preferencial-1', 'preferencial-2', 'preferencial-3']);
  });

  it('only counts en_espera and notificado as waiting', () => {
    const queue = [
      buildQueueItem({ id: 'waiting', status: 'en_espera' }),
      buildQueueItem({ id: 'notified', status: 'notificado' }),
      buildQueueItem({ id: 'called', status: 'llamado' }),
      buildQueueItem({ id: 'serving', status: 'en_atencion' }),
      buildQueueItem({ id: 'done', status: 'finalizado' }),
      buildQueueItem({ id: 'cancelled', status: 'cancelado' }),
      buildQueueItem({ id: 'absent', status: 'ausente' }),
    ];
    expect(orderWaiting(queue).map((slot) => slot.id)).toEqual([
      'waiting',
      'notified',
    ]);
  });

  it('assigns 1-based positions without gaps', () => {
    const queue = buildQueue({ normals: 4, preferentials: 1 });
    expect(orderWaiting(queue, 3)).toEqual([
      { id: 'preferencial-1', posicion: 1 },
      { id: 'normal-1', posicion: 2 },
      { id: 'normal-2', posicion: 3 },
      { id: 'normal-3', posicion: 4 },
      { id: 'normal-4', posicion: 5 },
    ]);
  });

  it('returns an empty order for an empty queue', () => {
    expect(orderWaiting([])).toEqual([]);
  });

  it('is deterministic and leaves the input untouched', () => {
    const queue = buildQueue({ normals: 4, preferentials: 2 });
    const frozen = Object.freeze(queue.map((item) => Object.freeze({ ...item })));
    const first = orderWaiting([...queue], 3);
    const second = orderWaiting([...queue], 3);
    expect(second).toEqual(first);
    expect(queue).toEqual([...frozen]);
  });
});
