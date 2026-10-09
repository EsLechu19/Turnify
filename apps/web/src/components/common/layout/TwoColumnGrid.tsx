import type { ReactNode } from 'react';

export interface TwoColumnGridProps {
  children: ReactNode;
  split?: 'even' | 'wide-left' | 'wide-right';
  className?: string;
}

export function TwoColumnGrid({
  children,
  split = 'even',
  className = '',
}: TwoColumnGridProps) {
  const style =
    split === 'wide-left'
      ? { gridTemplateColumns: '1.6fr 1fr' }
      : split === 'wide-right'
        ? { gridTemplateColumns: '1fr 1.6fr' }
        : undefined;

  return (
    <div className={`grid grid--two ${className}`} style={style}>
      {children}
    </div>
  );
}
