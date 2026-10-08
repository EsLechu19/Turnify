import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button, type ButtonVariant } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { Palette, space, TypeScale } from '@/constants/theme';

export type StateBlockProps = {
  loading?: boolean;
  icon?: IconName;
  title?: string;
  detail?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionVariant?: ButtonVariant;
  /** Single-line error text rendered in the danger colour. */
  error?: string | null;
};

/** Replaces the 14 different loading / empty / error blocks found in the screens. */
export function StateBlock({
  loading = false,
  icon,
  title,
  detail,
  actionLabel,
  onAction,
  actionVariant = 'primary',
  error,
}: StateBlockProps) {
  if (loading) {
    return (
      <View style={styles.block}>
        <ActivityIndicator color={Palette.brand} size="large" />
        {detail ? <Text style={[TypeScale.bodySmall, styles.center]}>{detail}</Text> : null}
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.block}>
        <View style={[styles.iconDisc, { backgroundColor: Palette.dangerSoft }]}>
          <Icon color={Palette.danger} name="alert" size={26} />
        </View>
        <Text style={[TypeScale.title, styles.center]}>Algo salió mal</Text>
        <Text style={[TypeScale.bodySmall, styles.center, { color: Palette.danger }]}>{error}</Text>
        {actionLabel && onAction ? (
          <Button label={actionLabel} onPress={onAction} variant={actionVariant} />
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.block}>
      {icon ? (
        <View style={[styles.iconDisc, { backgroundColor: Palette.brandSoft }]}>
          <Icon color={Palette.brand} name={icon} size={26} />
        </View>
      ) : null}
      {title ? <Text style={[TypeScale.title, styles.center]}>{title}</Text> : null}
      {detail ? <Text style={[TypeScale.bodySmall, styles.center]}>{detail}</Text> : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant={actionVariant} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: space(2.5),
    paddingHorizontal: space(5),
    paddingVertical: space(7),
  },
  center: { textAlign: 'center' },
  iconDisc: {
    alignItems: 'center',
    borderRadius: 999,
    height: 56,
    justifyContent: 'center',
    marginBottom: space(1),
    width: 56,
  },
});