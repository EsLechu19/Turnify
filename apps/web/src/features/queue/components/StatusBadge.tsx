import { Badge } from '@/components/common';
import { statusLabels, statusTone } from '@/data/mocks/panel';
import type { QueueTicket } from '@/data/types';

export function StatusBadge({ ticket }: { ticket: QueueTicket }) {
  return (
    <Badge tone={statusTone[ticket.status]}>
      {statusLabels[ticket.status]}
      {ticket.priority ? ' · Preferencial' : ''}
    </Badge>
  );
}