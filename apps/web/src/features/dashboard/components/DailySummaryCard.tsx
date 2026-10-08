import { Icon } from '@/components/Icon';
import { Card, CardHead } from '@/components/common';

export function DailySummaryCard() {
  const summary = {
    attended: 47,
    punctuality: 92,
    incidents: 2,
    lastShiftClose: '20:30',
    avgServiceTime: 28,
    satisfaction: 4.8,
  };

  return (
    <Card>
      <CardHead detail="Métricas del turno actual" title="Resumen del día" />
      <div className="daily-summary">
        <div className="daily-summary__grid">
          <div className="daily-summary__item">
            <span className="daily-summary__icon">
              <Icon name="check-circle" size={36} />
            </span>
            <div>
              <strong>{summary.attended}</strong>
              <span>Atendidos</span>
            </div>
          </div>
          <div className="daily-summary__item">
            <span className="daily-summary__icon">
              <Icon name="clock" size={36} />
            </span>
            <div>
              <strong>{summary.punctuality}%</strong>
              <span>Puntualidad</span>
            </div>
          </div>
          <div className="daily-summary__item">
            <span className="daily-summary__icon">
              <Icon name="info" size={36} />
            </span>
            <div>
              <strong>{summary.incidents}</strong>
              <span>Incidentes</span>
            </div>
          </div>
          <div className="daily-summary__item">
            <span className="daily-summary__icon">
              <Icon name="store" size={36} />
            </span>
            <div>
              <strong>{summary.lastShiftClose}</strong>
              <span>Último cierre</span>
            </div>
          </div>
          <div className="daily-summary__item">
            <span className="daily-summary__icon">
              <Icon name="scissors" size={36} />
            </span>
            <div>
              <strong>{summary.avgServiceTime} min</strong>
              <span>Tiempo prom.</span>
            </div>
          </div>
          <div className="daily-summary__item">
            <span className="daily-summary__icon">
              <Icon name="star" size={36} />
            </span>
            <div>
              <strong>{summary.satisfaction}</strong>
              <span>Satisfacción</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}