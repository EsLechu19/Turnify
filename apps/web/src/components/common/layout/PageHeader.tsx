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
      <div className="dashboard__header-content">
        <div className="dashboard__header-copy">
          <h1>{title}</h1>
          {subtitle && <span className="muted">{subtitle}</span>}
          {statusBadge && <span className="dashboard__header-status">{statusBadge}</span>}
        </div>

        {actions && (
          <div className="panel-actions">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
