import type { PanelStats } from '@/data/types';
import { formatWait } from '@/utils/format';
import { StatCard } from '@/components/common';

export interface StatsCompare {
  avgWaitMinutes: number | null;
  absent: number | null;
}

function deltaFoot(
  current: number,
  previous: number | null,
  unit: string,
  goodWhenUp: boolean,
): { text: string; className: string } {
  if (previous === null) {
    return { text: 'Hoy', className: 'muted' };
  }

  const diff = current - previous;

  if (diff === 0) {
    return { text: `Igual que ayer`, className: 'muted' };
  }

  const good = diff > 0 === goodWhenUp;
  const direction = diff > 0 ? '▲' : '▼';

  return {
    text: `${direction} ${Math.abs(diff)}${unit ? ` ${unit}` : ''} vs. ayer`,
    className: good ? 'trend trend--up' : 'trend trend--down',
  };
}

export function StatCards({ stats, compare }: { stats: PanelStats; compare?: StatsCompare | null }) {
  const wait = deltaFoot(stats.averageWaitMinutes, compare?.avgWaitMinutes ?? null, 'min', false);
  const absent = deltaFoot(stats.absent, compare?.absent ?? null, '', false);

  return (
    <div className="grid grid--stats">
      <StatCard
        foot={<span className="muted">Turnos cerrados hoy</span>}
        icon="check"
        label="Atendidos hoy"
        value={String(stats.completed)}
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
