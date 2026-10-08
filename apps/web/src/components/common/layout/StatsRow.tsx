import type { ReactNode } from 'react';

import type { IconName } from '@/components/Icon';
import { StatCard } from '@/components/common/data-display/StatCard';

export interface StatItem {
  label: string;
  value: string | number;
  icon: IconName;
  foot?: ReactNode;
}

export interface StatsRowProps {
  stats: StatItem[];
  className?: string;
}

export function StatsRow({ stats, className = '' }: StatsRowProps) {
  return (
    <div className={`grid grid--stats ${className}`}>
      {stats.map((stat, index) => (
        <StatCard
          key={index}
          label={stat.label}
          value={String(stat.value)}
          icon={stat.icon}
          foot={stat.foot}
        />
      ))}
    </div>
  );
}