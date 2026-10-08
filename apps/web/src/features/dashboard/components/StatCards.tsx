import type { PanelStats } from '@/data/types';
import { formatWait } from '@/utils/format';
import { StatCard } from '@/components/common';

export function StatCards({ stats }: { stats: PanelStats }) {
  return (
    <div className="grid grid--stats">
      <StatCard
        foot={<span className="muted">Esperando en sala</span>}
        icon="users"
        label="Esperando en sala"
        value={String(stats.waiting)}
      />
      <StatCard
        foot={<span className="muted">En atención ahora</span>}
        icon="scissors"
        label="En atención"
        value={String(stats.inService)}
      />
      <StatCard
        foot={<span className="trend trend--down">▲ 2 min vs. ayer</span>}
        icon="clock"
        label="Espera promedio"
        value={formatWait(stats.averageWaitMinutes)}
      />
      <StatCard
        foot={<span className="trend trend--down">▲ 1 vs. semana pasada</span>}
        icon="user-xmark"
        label="Ausentes hoy"
        value={String(stats.absent)}
      />
    </div>
  );
}