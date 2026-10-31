import { useNavigate } from 'react-router-dom';

import { Button, Card, CardHead } from '@/components/common';
import { nextActionableTicket } from '@/data/selectors';
import type { QueueTicket } from '@/data/types';
import { useQueue } from '@/state/QueueContext';

function rowLabel(ticket: QueueTicket): string {
  if (ticket.status === 'llamado') return 'Llamado';
  if (ticket.status === 'atencion') return 'En atención';
  return ticket.priority ? 'Preferencial' : 'En espera';
}

/**
 * Read-only live board for Inicio: who waits, who was called, who is in
 * service. No operating actions here — the mobile worker owns the queue.
 */
export function LiveQueueCard() {
  const navigate = useNavigate();
  const { tickets } = useQueue();
  const live = tickets.filter(
    (ticket) => ticket.status === 'espera' || ticket.status === 'llamado' || ticket.status === 'atencion',
  );
  const next = nextActionableTicket(tickets);

  return (
    <Card>
      <CardHead
        detail={live.length === 0 ? 'Sin movimiento ahora mismo' : `${live.length} turnos en juego`}
        title="Cola en vivo"
        action={
          <Button variant="ghost" size="sm" onClick={() => navigate('/equipo')}>
            Ver equipo
          </Button>
        }
      />
      {live.length === 0 ? (
        <p className="live-queue__empty muted">
          Cola vacía: ningún turno en espera, llamado ni en atención.
        </p>
      ) : (
        <div className="live-queue__list">
          {live.map((ticket) => (
            <div key={ticket.id} className="live-queue__item">
              <strong className="live-queue__code">{ticket.code}</strong>
              <span className="live-queue__service muted">
                {ticket.service}{ticket.barber ? ` · ${ticket.barber}` : ''}
              </span>
              <span className={`live-queue__status live-queue__status--${ticket.status}`}>{rowLabel(ticket)}</span>
              {next?.id === ticket.id ? <span className="live-queue__next">· siguiente</span> : null}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
