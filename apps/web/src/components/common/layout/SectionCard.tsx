import type { ReactNode } from 'react';

import { Card, CardHead } from './Card';

export interface SectionCardProps {
  title: ReactNode;
  detail?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  tone?: 'default' | 'brand' | 'gold' | 'ink';
  compact?: boolean;
}

export function SectionCard({
  title,
  detail,
  icon,
  action,
  children,
  className = '',
  style,
  tone = 'default',
  compact = false,
}: SectionCardProps) {
  return (
    <Card tone={tone} className={className} style={style}>
      <CardHead title={title} detail={detail} icon={icon} action={action} />
      <div style={{ padding: compact ? '8px 0 0' : 0 }}>
        {children}
      </div>
    </Card>
  );
}