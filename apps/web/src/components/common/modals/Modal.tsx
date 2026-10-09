import { useEffect, type ReactNode } from 'react';

import { IconButton } from '@/components/common/IconButton';

export function Modal({
  title,
  detail,
  onClose,
  children,
  footer,
  maxWidth = 560,
}: {
  title: string;
  detail?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: number;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      style={{
        alignItems: 'center',
        background: 'rgba(15, 23, 42, 0.45)',
        display: 'flex',
        inset: 0,
        justifyContent: 'center',
        padding: 20,
        position: 'fixed',
        zIndex: 60,
      }}
    >
      <div
        aria-label={title}
        aria-modal="true"
        role="dialog"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 24px 60px rgba(15, 23, 42, 0.28)',
          display: 'grid',
          gap: 16,
          maxHeight: '86vh',
          maxWidth,
          overflowY: 'auto',
          padding: 24,
          width: '100%',
        }}
      >
        <header style={{ alignItems: 'flex-start', display: 'flex', gap: 12, justifyContent: 'space-between' }}>
          <div style={{ display: 'grid', gap: 4 }}>
            <h2 style={{ font: 'var(--text-headline)', margin: 0 }}>{title}</h2>
            {detail ? (
              <span className="muted" style={{ font: 'var(--text-caption)' }}>
                {detail}
              </span>
            ) : null}
          </div>
          <IconButton icon="close" label="Cerrar" onClick={onClose} />
        </header>

        <div style={{ display: 'grid', gap: 16 }}>{children}</div>

        {footer ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-end' }}>{footer}</div>
        ) : null}
      </div>
    </div>
  );
}