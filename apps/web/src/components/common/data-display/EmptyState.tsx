export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      <p className="muted">{detail}</p>
    </div>
  );
}