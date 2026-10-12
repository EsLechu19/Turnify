import { useNavigate } from 'react-router-dom';

import { Button, Card, CardHead } from '@/components/common';
import { nextActionableTicket } from '@/data/selectors';
import type { QueueTicket } from '@/data/types';
import { useQueue } from '@/state/QueueContext';

const MAX_ROWS = 8;

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
  const visible = live.slice(0, MAX_ROWS);
  const hidden = live.length - visible.length;

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
        <p className="muted" style={{ font: 'var(--text-body)', margin: 0 }}>
          Cola vacía: ningún turno en espera, llamado ni en atención.
        </p>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {visible.map((ticket) => (
            <div key={ticket.id} style={{ alignItems: 'center', display: 'flex', gap: 10 }}>
              <strong style={{ font: 'var(--text-body-strong)', minWidth: 64 }}>{ticket.code}</strong>
              <span className="muted" style={{ flex: 1, font: 'var(--text-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ticket.service}{ticket.barber ? ` · ${ticket.barber}` : ''}
              </span>
              <span style={{ font: 'var(--text-label)' }}>{rowLabel(ticket)}</span>
              {next?.id === ticket.id ? <span style={{ font: 'var(--text-label)' }}>· siguiente</span> : null}
            </div>
          ))}
          {hidden > 0 ? (
            <p className="muted" style={{ font: 'var(--text-body)', margin: 0 }}>
              +{hidden} turnos más en la cola.
            </p>
          ) : null}
        </div>
      )}
    </Card>
  );
}
