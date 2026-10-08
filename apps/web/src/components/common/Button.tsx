import type { CSSProperties, ReactNode } from 'react';

import { Icon, type IconName } from '@/components/Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger' | 'success';

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  icon,
  disabled,
  type = 'button',
  className,
  style,
  'aria-label': ariaLabel,
}: {
  children?: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
}) {
  const iconSize = size === 'sm' ? 15 : size === 'lg' ? 22 : 17;
  const paddingClass = size === 'sm' ? ' btn--sm' : size === 'lg' ? ' btn--lg' : '';

  return (
    <button
      aria-label={ariaLabel}
      className={`btn btn--${variant}${paddingClass} ${className || ''}`}
      disabled={disabled}
      onClick={onClick}
      style={style}
      type={type}
    >
      {icon ? <Icon name={icon} size={iconSize} /> : null}
      {children}
    </button>
  );
}