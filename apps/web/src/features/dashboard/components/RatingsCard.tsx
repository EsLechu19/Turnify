import { Card, CardHead } from '@/components/common';
import type { RatingByBarber } from '@/data/live';

function stars(average: number | null): string {
  if (average == null) return 'Sin votos';
  const filled = Math.round(average);
  return `${'★'.repeat(filled)}${'☆'.repeat(Math.max(0, 5 - filled))} ${average.toFixed(1)}`;
}

export function RatingsCard({ ratings }: { ratings: RatingByBarber[] | null }) {
  const ranked = [...(ratings ?? [])].sort((a, b) => (b.average ?? -1) - (a.average ?? -1)).slice(0, 5);

  return (
    <Card>
      <CardHead detail="Votos de los invitados por barbero" title="Satisfacción por barbero" />
      {ranked.length === 0 ? (
        <p className="muted" style={{ font: 'var(--text-body)', margin: 0 }}>
          Todavía no hay votos registrados.
        </p>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {ranked.map((row) => (
            <div key={row.barberId} style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <strong style={{ font: 'var(--text-body-strong)' }}>{row.name}</strong>
              <span className="muted" style={{ font: 'var(--text-body)' }}>
                {stars(row.average)} · {row.votes} {row.votes === 1 ? 'voto' : 'votos'}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
