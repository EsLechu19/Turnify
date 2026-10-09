export function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={{ display: 'grid', gap: 2, justifyItems: 'center', textAlign: 'center' }}>
      <strong style={{ font: 'var(--text-title)' }}>{value}</strong>
      <span className="muted" style={{ font: 'var(--text-caption)' }}>
        {label}
      </span>
    </div>
  );
}
