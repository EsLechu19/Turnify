import { useNavigate } from 'react-router-dom';

import { Button, Card, CardHead } from '@/components/common';
import type { PanelAlert } from '@/data/compute';

export function AlertsCard({ alerts }: { alerts: PanelAlert[] }) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHead detail="Lo que necesita tu ojo ahora" title="Alertas operativas" />
      {alerts.length === 0 ? (
        <p className="alerts-card__empty muted">
          Sin alertas: operación normal.
        </p>
      ) : (
        <div className="alerts-card__list">
          {alerts.map((alert) => (
            <div key={alert.id} className="alerts-card__item">
              <span aria-hidden className={`alerts-card__dot alerts-card__dot--${alert.tone}`} />
              <span className="alerts-card__message">{alert.message}</span>
              <Button variant="ghost" size="sm" onClick={() => navigate(alert.to)}>
                {alert.to === '/equipo' ? 'Ver equipo' : 'Ver historial'}
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
