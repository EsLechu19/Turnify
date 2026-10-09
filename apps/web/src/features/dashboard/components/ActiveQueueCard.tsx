import { useNavigate } from 'react-router-dom';

import { Icon } from '@/components/Icon';
import { Button, Card, CardHead } from '@/components/common';
import type { QueueTicket } from '@/data/types';

/**
 * Called turns lead (they are next to be seated), then waiting ones by longest
 * wait first, so the next customer in line always sits at the top and moves up
 * as the ones ahead are served.
 *
 * Read-only board: operations (call, assign) live in the mobile app and the
 * queue section until their backend counterparts land (S2b). Nothing here
 * pretends to change the queue.
 */
function orderForService(tickets: QueueTicket[]): QueueTicket[] {
  return tickets
    .filter((t) => t.status === 'llamado' || t.status === 'espera')
    .sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'llamado' ? -1 : 1;
      }

      return b.waitedMinutes - a.waitedMinutes;
    });
}

export function ActiveQueueCard({ tickets, occupiedCount = 0 }: { tickets: QueueTicket[]; occupiedCount?: number }) {
  const navigate = useNavigate();
  const ordered = orderForService(tickets);

  const activeTickets = ordered
    .slice(0, 10)
    .map((t, index) => ({
      position: occupiedCount + index + 1,
      code: t.code,
      customer: t.customer,
      service: t.service,
      status: t.status,
      waitedMinutes: t.waitedMinutes,
      barber: t.barber,
      id: t.id,
    }));

  return (
    <Card className="card--compact">
      <CardHead
        action={
          <Button variant="ghost" size="sm" icon="list" onClick={() => navigate('/cola')}>
            Ver lista completa
          </Button>
        }
        detail="Clientes esperando en tiempo real"
        title="Cola activa"
      />
      <div className="active-queue">
        {activeTickets.length === 0 ? (
          <div className="active-queue__empty">
            <Icon name="ticket" size={32} />
            <p>No hay clientes en espera</p>
          </div>
        ) : (
          <div className="active-queue__list">
            {activeTickets.map((ticket, index) => {
              const isFirst = index === 0;
              const assignedText = ticket.barber || 'Cualquiera disponible';
              const isWaiting = ticket.status === 'espera';

              return (
                <div key={ticket.id} className={`active-queue__item ${isFirst ? 'active-queue__item--first' : ''}`}>
                  <div className="active-queue__left">
                    <span className={`active-queue__number ${isFirst ? 'active-queue__number--first' : ''}`}>
                      #{ticket.position}
                    </span>
                  </div>
                  <div className="active-queue__content">
                    <div className="active-queue__header">
                      <strong className="active-queue__name">{ticket.customer}</strong>
                      {ticket.status === 'llamado' ? (
                        <span className="active-queue__status active-queue__status--called">LLAMADO</span>
                      ) : (
                        <span className="active-queue__status active-queue__status--waiting">ESPERANDO</span>
                      )}
                    </div>
                    <div className="active-queue__details">
                      <div className="active-queue__detail-row">
                        <Icon name="scissors" size={14} className="active-queue__icon" />
                        <span className="active-queue__service-name">{ticket.service}</span>
                        <span className="active-queue__assigned-name">
                          <Icon name={ticket.barber ? 'user' : 'user-arrows'} size={14} className="active-queue__icon" />
                          {assignedText}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="active-queue__right">
                    <div className="active-queue__time">
                      <Icon name="clock" size={14} className="active-queue__icon" />
                      <span>Espera {ticket.waitedMinutes} min</span>
                    </div>
                    {isWaiting && <span className="active-queue__not-ready">Esperando</span>}
                    {ticket.status === 'llamado' && ticket.barber && (
                      <span className="active-queue__barber">{ticket.barber}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
