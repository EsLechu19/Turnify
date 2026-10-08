import type { CSSProperties, ReactNode } from 'react';

export function Card({
  children,
  tone = 'default',
  flush = false,
  className = '',
  style,
}: {
  children: ReactNode;
  tone?: 'default' | 'brand' | 'gold' | 'ink';
  flush?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const toneClass = tone === 'default' ? '' : ` card--${tone}`;

  return <section className={`card${toneClass}${flush ? ' card--flush' : ''} ${className}`.trim()} style={style}>{children}</section>;
}

export function CardHead({
  title,
  detail,
  action,
  icon,
  level = 2,
}: {
  title: ReactNode;
  detail?: string;
  action?: ReactNode;
  icon?: ReactNode;
  level?: 2 | 3;
}) {
  const Heading = level === 2 ? 'h2' : 'h3';

  return (
    <header className="card__head">
      <div>
        {icon ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>{icon}</span> : null}
        {typeof title === 'string' ? <Heading>{title}</Heading> : title}
        {detail ? <p>{detail}</p> : null}
      </div>
      {action}
    </header>
  );
}