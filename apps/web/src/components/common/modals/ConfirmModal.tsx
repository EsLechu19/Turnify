import type { ReactNode } from 'react';

import { Button } from '@/components/common/Button';
import type { IconName } from '@/components/Icon';
import { Modal } from './Modal';

export function ConfirmModal({
  open,
  title,
  detail,
  onCancel,
  onConfirm,
  confirmLabel,
  confirmIcon,
  confirmVariant = 'danger',
  children,
}: {
  open: boolean;
  title: string;
  detail?: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  confirmIcon?: IconName;
  confirmVariant?: 'danger' | 'primary';
  children?: ReactNode;
}) {
  if (!open) {
    return null;
  }

  return (
    <Modal
      detail={detail}
      footer={
        <>
          <Button onClick={onCancel} variant="secondary">
            Cancelar
          </Button>
          <Button icon={confirmIcon} onClick={onConfirm} variant={confirmVariant}>
            {confirmLabel}
          </Button>
        </>
      }
      maxWidth={480}
      onClose={onCancel}
      title={title}
    >
      {children}
    </Modal>
  );
}