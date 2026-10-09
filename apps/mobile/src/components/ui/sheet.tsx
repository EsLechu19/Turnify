import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Palette, Radius, Shadows, space, TypeScale } from '@/constants/theme';

export type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'danger';
  onConfirm?: () => void;
  cancelLabel?: string;
  /** Disables the scrim tap so a destructive choice cannot be dismissed by accident. */
  dismissible?: boolean;
};

/**
 * One modal for every confirmation in the app (cancel turn, delete, sign out,
 * worker join). Replaces the per-screen hand-rolled `Modal` blocks.
 */
export function Sheet({
  visible,
  onClose,
  title,
  description,
  children,
  confirmLabel,
  confirmVariant = 'primary',
  onConfirm,
  cancelLabel = 'Cancelar',
  dismissible = true,
}: SheetProps) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <Pressable
          accessibilityLabel="Cerrar"
          accessibilityRole="button"
          onPress={dismissible ? onClose : undefined}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.sheet}>
          <Text style={[TypeScale.h3, { color: Palette.ink }]}>{title}</Text>
          {description ? (
            <Text style={[TypeScale.bodySmall, { color: Palette.inkMuted }]}>{description}</Text>
          ) : null}
          {children}
          <View style={styles.actions}>
            <Button fullWidth label={cancelLabel} onPress={onClose} variant="secondary" />
            {confirmLabel && onConfirm ? (
              <Button fullWidth label={confirmLabel} onPress={onConfirm} variant={confirmVariant} />
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** Confirmation dialog built on top of `Sheet`. */
export function useConfirm() {
  const [request, setRequest] = useState<{
    title: string;
    description?: string;
    confirmLabel?: string;
    confirmVariant?: 'primary' | 'danger';
    onConfirm: () => void;
  } | null>(null);

  return {
    confirm: setRequest,
    dialog: request ? (
      <Sheet
        confirmLabel={request.confirmLabel ?? 'Confirmar'}
        confirmVariant={request.confirmVariant}
        description={request.description}
        dismissible={request.confirmVariant !== 'danger'}
        onClose={() => setRequest(null)}
        onConfirm={() => {
          request.onConfirm();
          setRequest(null);
        }}
        title={request.title}
        visible
      />
    ) : null,
  };
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(16,29,74,0.52)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Palette.canvas,
    borderTopLeftRadius: Radius.xlarge,
    borderTopRightRadius: Radius.xlarge,
    gap: space(3),
    padding: space(5),
    paddingBottom: space(7),
    ...Shadows.sheet,
  },
  actions: { gap: space(2), marginTop: space(2) },
});