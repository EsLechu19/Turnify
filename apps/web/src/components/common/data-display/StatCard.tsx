import type { ReactNode } from 'react';

import { Icon, type IconName } from '@/components/Icon';

export function StatCard({
  label,
  value,
  icon,
  foot,
}: {
  label: string;
  value: string;
  icon: IconName;
  foot: ReactNode;
}) {
  return (
    <article className="stat">
      <div className="stat__top">
        <span className="stat__label">{label}</span>
        <span className="stat__icon">
          <Icon name={icon} size={19} />
        </span>
      </div>
      <strong className="stat__value">{value}</strong>
      <div className="stat__foot">{foot}</div>
    </article>
  );
}