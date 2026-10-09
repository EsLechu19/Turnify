import type { PanelStats } from '@/data/types';
import { formatWait } from '@/utils/format';
import { StatCard } from '@/components/common';

export interface StatsCompare {
  avgWaitMinutes: number | null;
  absent: number | null;
}

function deltaFoot(current: number, previous: number | null, unit: string): { text: string; className: string } {
  if (previous === null) {
    return { text: 'Hoy', className: 'muted' };
  }

  const diff = current - previous;

  if (diff === 0) {
    return { text: `Igual que ayer`, className: 'muted' };
  }

  return {
    text: `${diff > 0 ? '▲' : '▼'} ${Math.abs(diff)} ${unit} vs. ayer`,
    className: diff > 0 ? 'trend trend--up' : 'trend trend--down',
  };
}

export function StatCards({ stats, compare }: { stats: PanelStats; compare?: StatsCompare | null }) {
  const wait = deltaFoot(stats.averageWaitMinutes, compare?.avgWaitMinutes ?? null, 'min');
  const absent = deltaFoot(stats.absent, compare?.absent ?? null, '');

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
        foot={<span className={wait.className}>{wait.text}</span>}
        icon="clock"
        label="Espera promedio"
        value={formatWait(stats.averageWaitMinutes)}
      />
      <StatCard
        foot={<span className={absent.className}>{absent.text}</span>}
        icon="user-xmark"
        label="Ausentes hoy"
        value={String(stats.absent)}
      />
    </div>
  );
}
