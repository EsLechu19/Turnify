import type { ReactNode } from 'react';

export function CardNote({ children }: { children: ReactNode }) {
  return (
    <p className="muted" style={{ font: 'var(--text-body)', margin: 0 }}>
      {children}
    </p>
  );
}
