import type { ReactNode } from 'react';

import { Button } from '@/components/common/Button';
import { Modal } from './Modal';

export function FormModal({
  open,
  title,
  detail,
  onClose,
  onSubmit,
  saving,
  submitLabel,
  children,
  error,
}: {
  open: boolean;
  title: string;
  detail?: string;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
  saving?: boolean;
  submitLabel: string;
  children: ReactNode;
  error?: string;
}) {
  if (!open) return null;

  return (
    <Modal title={title} detail={detail} onClose={onClose} maxWidth={640}>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 16 }}>
        {children}
        {error ? (
          <span role="alert" style={{ color: 'var(--danger-ink)', font: 'var(--text-caption)' }}>
            {error}
          </span>
        ) : null}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button onClick={onClose} type="button" variant="secondary">
            Cancelar
          </Button>
          <Button disabled={saving} icon="check" type="submit">
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}