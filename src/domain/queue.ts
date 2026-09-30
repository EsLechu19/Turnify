// Waiting-queue ordering: interleaves normal and preferential tickets
// into service slots. Preferentials take the first slot, then every (N+1)-th
// slot while both lanes wait; an empty lane yields its slots to the other side so
// the order never has gaps. Pure and deterministic: the input is never
// mutated and ties break by creation time, then ticket number.
import type { TicketStatus } from './turn';

// Priority vocabulary stays in Spanish to match the domain language.
export type TicketPriority = 'normal' | 'preferencial';

// Minimal snapshot of a ticket needed to compute the waiting order.
export interface QueueSnapshotItem {
  id: string;
  prioridad: TicketPriority;
  creadoEn: string;
  numero: number;
  status: TicketStatus;
}

// One ordered slot in the waiting queue, with a 1-based position.
export interface OrderedSlot {
  id: string;
  posicion: number;
}

// Default normal slots after each preferential slot: a preferential ticket,
// then three normals (preferentials land on slots 1, 5, 9, ...).
export const DEFAULT_PREFERENCIAL_CADA = 3;

// Only these statuses still wait for service; every other status
// (llamado, en_atencion and the terminal ones) is ignored here.
const WAITING: readonly TicketStatus[] = ['en_espera', 'notificado'];

// Orders two snapshot items inside the same priority lane by arrival,
// breaking creation-time ties with the ticket number.
function compareByArrival(
  first: QueueSnapshotItem,
  second: QueueSnapshotItem,
): number {
  if (first.creadoEn < second.creadoEn) {
    return -1;
  }
  if (first.creadoEn > second.creadoEn) {
    return 1;
  }
  return first.numero - second.numero;
}

// Orders the waiting tickets of a queue snapshot, returning one slot
// per waiting ticket with a gapless 1-based position.
export function orderWaiting(
  queue: readonly QueueSnapshotItem[],
  preferencialCada: number = DEFAULT_PREFERENCIAL_CADA,
): OrderedSlot[] {
  if (!Number.isInteger(preferencialCada) || preferencialCada < 1) {
    throw new RangeError(
      `preferencialCada must be a positive integer, got "${preferencialCada}"`,
    );
  }
  // Filter copies each lane, so sorting below never touches the input.
  const normals = queue
    .filter(
      (item) => item.prioridad === 'normal' && WAITING.includes(item.status),
    )
    .sort(compareByArrival);
  const preferentials = queue
    .filter(
      (item) =>
        item.prioridad === 'preferencial' && WAITING.includes(item.status),
    )
    .sort(compareByArrival);

  const ordered: OrderedSlot[] = [];
  let normalIndex = 0;
  let preferentialIndex = 0;
  let posicion = 1;
  while (
    normalIndex < normals.length ||
    preferentialIndex < preferentials.length
  ) {
    const isPreferentialSlot = (posicion - 1) % (preferencialCada + 1) === 0;
    let next: QueueSnapshotItem;
    if (isPreferentialSlot && preferentialIndex < preferentials.length) {
      next = preferentials[preferentialIndex] as QueueSnapshotItem;
      preferentialIndex += 1;
    } else if (!isPreferentialSlot && normalIndex < normals.length) {
      next = normals[normalIndex] as QueueSnapshotItem;
      normalIndex += 1;
    } else if (preferentialIndex < preferentials.length) {
      // Designated lane is empty: the other side advances without gaps.
      next = preferentials[preferentialIndex] as QueueSnapshotItem;
      preferentialIndex += 1;
    } else {
      next = normals[normalIndex] as QueueSnapshotItem;
      normalIndex += 1;
    }
    ordered.push({ id: next.id, posicion });
    posicion += 1;
  }
  return ordered;
}
