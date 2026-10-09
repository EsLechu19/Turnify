import type { ReactNode } from 'react';

import { Icon, type IconName } from '@/components/Icon';

export type BadgeTone = 'neutral' | 'brand' | 'gold' | 'success' | 'danger' | 'ink';

export function Badge({
  children,
  tone = 'neutral',
  icon,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  icon?: IconName;
}) {
  return (
    <span className={`badge badge--${tone}`}>
      {icon ? <Icon name={icon} size={13} /> : null}
      {children}
    </span>
  );
}