export function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'grid', gap: 2, minWidth: 0 }}>
      <span
        className="muted"
        style={{ font: 'var(--text-caption)', letterSpacing: '0.06em', textTransform: 'uppercase' }}
      >
        {label}
      </span>
      <strong
        style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      >
        {value}
      </strong>
    </div>
  );
}
