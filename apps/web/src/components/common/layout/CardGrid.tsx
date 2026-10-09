import type { ReactNode } from 'react';

export interface CardGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
  gap?: number;
}

export function CardGrid({
  children,
  columns = 2,
  className = '',
  gap = 24,
}: CardGridProps) {
  const colsClass = columns === 2 ? 'card-grid' : columns === 3 ? 'card-grid-3' : 'card-grid-4';

  return (
    <div className={`${colsClass} ${className}`} style={{ gap }}>
      {children}
    </div>
  );
}
