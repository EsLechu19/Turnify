import { useNavigate } from 'react-router-dom';

import { Button, Card, CardHead } from '@/components/common';
import type { PanelAlert } from '@/data/compute';

const toneColor: Record<PanelAlert['tone'], string> = {
  danger: 'var(--danger, #ef4444)',
  gold: 'var(--gold, #f59e0b)',
  brand: 'var(--brand, #1264e8)',
};

export function AlertsCard({ alerts }: { alerts: PanelAlert[] }) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHead detail="Lo que necesita tu ojo ahora" title="Alertas operativas" />
      {alerts.length === 0 ? (
        <p className="muted" style={{ font: 'var(--text-body)', margin: 0 }}>
          Sin alertas: operación normal.
        </p>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {alerts.map((alert) => (
            <div key={alert.id} style={{ alignItems: 'center', display: 'flex', gap: 10 }}>
              <span
                aria-hidden
                style={{ background: toneColor[alert.tone], borderRadius: '50%', flex: 'none', height: 10, width: 10 }}
              />
              <span style={{ flex: 1, font: 'var(--text-body)' }}>{alert.message}</span>
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
