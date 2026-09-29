import type { NoShowSnapshotItem } from '../../src/domain/noShow';
import type { QueueSnapshotItem } from '../../src/domain/queue';
import type { Ticket } from '../../src/domain/turn';

let sequence = 0;
let queueSequence = 0;
let noShowSequence = 0;

// Builds a Ticket with sensible defaults; callers override per case.
export function buildTicket(overrides: Partial<Ticket> = {}): Ticket {
  sequence += 1;
  return {
    id: `ticket-${sequence}`,
    status: 'en_espera',
    ...overrides,
  };
}

// Resets the id sequence so tests stay deterministic when needed.
export function resetTicketSequence(): void {
  sequence = 0;
}

// Builds a queue snapshot item with sensible defaults; callers override per case.
export function buildQueueItem(
  overrides: Partial<QueueSnapshotItem> = {},
): QueueSnapshotItem {
  queueSequence += 1;
  const order = queueSequence;
  return {
    id: `queue-${order}`,
    prioridad: 'normal',
    creadoEn: `2026-01-01T10:00:${String(order).padStart(2, '0')}Z`,
    numero: order,
    status: 'en_espera',
    ...overrides,
  };
}

// Builds a deterministic mixed queue: normals first, then preferentials,
// with creation order matching numbering within each priority.
export function buildQueue(options: {
  normals: number;
  preferentials: number;
}): QueueSnapshotItem[] {
  const items: QueueSnapshotItem[] = [];
  for (let index = 1; index <= options.normals; index += 1) {
    items.push(
      buildQueueItem({
        id: `normal-${index}`,
        prioridad: 'normal',
        creadoEn: `2026-01-01T10:00:${String(index).padStart(2, '0')}Z`,
        numero: index,
        status: 'en_espera',
      }),
    );
  }
  for (let index = 1; index <= options.preferentials; index += 1) {
    items.push(
      buildQueueItem({
        id: `preferencial-${index}`,
        prioridad: 'preferencial',
        creadoEn: `2026-01-01T11:00:${String(index).padStart(2, '0')}Z`,
        numero: index,
        status: 'en_espera',
      }),
    );
  }
  return items;
}

// Resets the queue builder sequence so tests stay deterministic when needed.
export function resetQueueSequence(): void {
  queueSequence = 0;
}

// Builds a llamado snapshot item with sensible defaults; callers override per case.
export function buildCalledItem(
  overrides: Partial<NoShowSnapshotItem> = {},
): NoShowSnapshotItem {
  noShowSequence += 1;
  return {
    id: `called-${noShowSequence}`,
    status: 'llamado',
    llamadoEn: '2026-01-01T10:00:00Z',
    ...overrides,
  };
}

// Resets the no-show builder sequence so tests stay deterministic when needed.
export function resetNoShowSequence(): void {
  noShowSequence = 0;
}
