import { Icon } from '@/components/Icon';
import { Button, Card, CardHead } from '@/components/common';
import type { QueueTicket } from '@/data/types';

/**
 * Called turns lead (they are next to be seated), then waiting ones by longest
 * wait first, so the next customer in line always sits at the top and moves up
 * as the ones ahead are served.
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

export function ActiveQueueCard({ tickets, onCall, onAssign, occupiedCount = 0 }: { tickets: QueueTicket[]; onCall: (id: string) => void; onAssign: (id: string) => void; occupiedCount?: number }) {
  const ordered = orderForService(tickets);
  const firstWaitingIndex = ordered.findIndex((t) => t.status === 'espera');

  const activeTickets = ordered
    .slice(0, 10)
    .map((t, index) => ({
      position: occupiedCount + index + 1,
      code: t.code,
      customer: t.customer,
      service: t.service,
      status: t.status,
      waitedMinutes: t.waitedMinutes,
      estimatedWait: t.waitedMinutes + (t.status === 'espera' ? 5 : 0),
      barber: t.barber,
      id: t.id,
      /** Only the next customer in line can be summoned; the rest keep their turn. */
      isNextInLine: index === firstWaitingIndex,
    }));

  return (
    <Card className="card--compact">
      <CardHead
        action={
          <Button variant="ghost" size="sm" icon="list">
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
                const canCall = isWaiting && ticket.isNextInLine;

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
                        {ticket.status === 'llamado' || ticket.status === 'atencion' ? (
                          <Button variant="secondary" size="sm" className="active-queue__status-btn active-queue__status--called">
                            AVISAR
                          </Button>
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
                        <span>Espera est. {ticket.estimatedWait} min</span>
                      </div>
                      {canCall && (
                        <Button variant="primary" size="sm" icon="bell" onClick={() => onCall(ticket.id)} className="active-queue__call-btn">
                          LLAMAR
                        </Button>
                      )}
                      {isWaiting && !canCall && (
                        <span className="active-queue__not-ready">Esperando</span>
                      )}
                      {ticket.status === 'llamado' && (
                        <Button variant="secondary" size="sm" icon="user-plus" onClick={() => onAssign(ticket.id)}>
                          Asignar
                        </Button>
                      )}
                      {ticket.status === 'atencion' && ticket.barber && (
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