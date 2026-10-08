import type { ReactNode } from 'react';

export interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  statusBadge?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  statusBadge,
  className = '',
}: PageHeaderProps) {
  return (
    <div className={`dashboard__header ${className}`}>
      <div className="dashboard__panel-header" style={{ flexWrap: 'wrap', rowGap: 14 }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <h1 style={{ font: 'var(--text-display)', margin: 0 }}>{title}</h1>
          {subtitle && <span className="muted" style={{ font: 'var(--text-body)' }}>{subtitle}</span>}
          {statusBadge && <span style={{ marginTop: 4 }}>{statusBadge}</span>}
        </div>

        {actions && (
          <div className="panel-actions" style={{ alignSelf: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
