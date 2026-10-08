import { availabilityLabels } from '@/data/mocks/panel';
import type { TeamMember } from '@/data/types';
import { Card, CardHead, Badge } from '@/components/common';

export function BarberStationsCard({ team }: { team: TeamMember[] }) {
  return (
    <Card>
      <CardHead detail="Estado de estaciones y barberos" title="Barberos y estaciones" />
      <div className="barber-stations">
        {team.map((member, index) => {
          const station = index + 1;
          const currentService = member.currentTicket ? 'Corte + barba' : undefined;
          const endsIn = member.availability === 'atencion' ? 15 : undefined;

          return (
            <div key={station} className="barber-station">
              <div className="barber-station__header">
                <span className="barber-station__num">Estación {station}</span>
                <Badge
                  tone={
                    member.availability === 'atencion'
                      ? 'brand'
                      : member.availability === 'disponible'
                        ? 'success'
                        : member.availability === 'descanso'
                          ? 'gold'
                          : 'neutral'
                  }
                >
                  {availabilityLabels[member.availability]}
                </Badge>
              </div>
              <div className="barber-station__info">
                <strong>{member.name}</strong>
                <span>{member.completedToday} cortes hoy</span>
              </div>
              {currentService ? (
                <div className="barber-station__current">
                  <span className="barber-station__service">{currentService}</span>
                  {member.currentTicket ? <span className="barber-station__occupied-with">OCUPADO</span> : null}
                  {endsIn !== undefined ? (
                    <span className="barber-station__ends">Termina en ~{endsIn} min</span>
                  ) : null}
                </div>
              ) : null}
              {!currentService && member.availability === 'disponible' ? (
                <span className="barber-station__available">Disponible para siguiente</span>
              ) : null}
              {member.availability === 'descanso' ? (
                <span className="barber-station__break">En descanso</span>
              ) : null}
              {member.availability === 'fuera' ? (
                <span className="barber-station__off">Fuera de turno</span>
              ) : null}
            </div>
          );
        })}
      </div>
    </Card>
  );
}