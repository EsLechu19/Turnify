import type { ReactNode } from 'react';

export function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div
      style={{
        alignItems: 'baseline',
        borderBottom: '1px dashed var(--border)',
        display: 'flex',
        gap: 16,
        justifyContent: 'space-between',
        paddingBottom: 8,
      }}
    >
      <span className="muted" style={{ font: 'var(--text-label)' }}>
        {label}
      </span>
      <strong style={{ textAlign: 'right' }}>{value}</strong>
    </div>
  );
}