import { Icon } from '@/components/Icon';
import { Card, CardHead } from '@/components/common';
import type { DailySummary } from '@/data/live';

function display(value: string | null): string {
  return value ?? '—';
}

export function DailySummaryCard({ summary }: { summary: DailySummary | null }) {
  const attended = summary ? String(summary.attended) : '—';
  const punctuality = summary?.punctuality == null ? '—' : `${summary.punctuality}%`;
  const incidents = summary ? String(summary.incidents) : '—';
  const avgService = summary?.avgServiceMinutes == null ? '—' : `${summary.avgServiceMinutes} min`;
  const satisfaction = summary?.satisfaction == null ? '—' : String(summary.satisfaction);

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
              <strong>{attended}</strong>
              <span>Atendidos</span>
            </div>
          </div>
          <div className="daily-summary__item">
            <span className="daily-summary__icon">
              <Icon name="clock" size={36} />
            </span>
            <div>
              <strong>{punctuality}</strong>
              <span>Puntualidad</span>
            </div>
          </div>
          <div className="daily-summary__item">
            <span className="daily-summary__icon">
              <Icon name="info" size={36} />
            </span>
            <div>
              <strong>{incidents}</strong>
              <span>Incidentes</span>
            </div>
          </div>
          <div className="daily-summary__item">
            <span className="daily-summary__icon">
              <Icon name="store" size={36} />
            </span>
            <div>
              <strong>{display(summary?.lastClose ?? null)}</strong>
              <span>Último cierre</span>
            </div>
          </div>
          <div className="daily-summary__item">
            <span className="daily-summary__icon">
              <Icon name="scissors" size={36} />
            </span>
            <div>
              <strong>{avgService}</strong>
              <span>Tiempo prom.</span>
            </div>
          </div>
          <div className="daily-summary__item">
            <span className="daily-summary__icon">
              <Icon name="star" size={36} />
            </span>
            <div>
              <strong>{satisfaction}</strong>
              <span>Satisfacción</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
