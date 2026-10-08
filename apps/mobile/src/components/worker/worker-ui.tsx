import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Button, Icon, Pill, type IconName } from '@/components/ui';
import { Palette, Radius, Shadows, space, TypeScale } from '@/constants/theme';

/**
 * Worker surfaces keep their own vocabulary because they are shared by the
 * minified operational screens, but every value now comes from the brand tokens.
 */
export const workerColors = {
  background: Palette.canvas,
  card: Palette.surface,
  low: Palette.brandSoftest,
  container: Palette.brandSoft,
  high: Palette.brandSoft,
  outline: Palette.border,
  ink: Palette.ink,
  primary: Palette.brand,
  body: Palette.ink,
  muted: Palette.inkMuted,
  teal: Palette.brand,
  tealContainer: Palette.brandSoft,
  error: Palette.danger,
  errorContainer: Palette.dangerSoft,
} as const;

export type WorkerTextVariant = 'eyebrow' | 'label' | 'body' | 'title' | 'headline' | 'metric';

export function WorkerText({
  children,
  variant = 'body',
  color = workerColors.body,
  style,
}: {
  children: ReactNode;
  variant?: WorkerTextVariant;
  color?: string;
  style?: StyleProp<any>;
}) {
  const scale: Record<WorkerTextVariant, (typeof TypeScale)[keyof typeof TypeScale]> = {
    eyebrow: TypeScale.eyebrow,
    label: TypeScale.label,
    body: TypeScale.body,
    title: TypeScale.h2,
    headline: TypeScale.h3,
    metric: TypeScale.metric,
  };

  return <Text style={[scale[variant], { color }, style]}>{children}</Text>;
}

export function WorkerButton({
  label,
  onPress,
  disabled,
  tone = 'primary',
  style,
}: {
  label: string;
  onPress(): void;
  disabled?: boolean;
  tone?: 'primary' | 'secondary' | 'danger';
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Button
      accessibilityLabel={label}
      disabled={disabled}
      label={label}
      onPress={onPress}
      style={style}
      variant={tone === 'danger' ? 'danger' : tone === 'secondary' ? 'secondary' : 'primary'}
    />
  );
}

const workerGlyphs: Record<string, IconName> = {
  live: 'zap',
  queue: 'list',
  history: 'history',
  profile: 'user',
  back: 'arrow-left',
  close: 'close',
  add: 'plus',
  check: 'check',
};

export function WorkerIcon({
  name,
  color = workerColors.ink,
  size = 22,
}: {
  name: 'live' | 'queue' | 'history' | 'profile' | 'back' | 'close' | 'add' | 'check';
  color?: string;
  size?: number;
}) {
  return <Icon color={color} name={workerGlyphs[name]} size={size} />;
}

export function WorkerPill({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'teal' | 'error' }) {
  return <Pill label={label} tone={tone === 'error' ? 'danger' : tone === 'teal' ? 'brand' : 'neutral'} />;
}

export const workerUiStyles = StyleSheet.create({
  page: {
    backgroundColor: workerColors.background,
    gap: space(4),
    padding: space(4),
    paddingBottom: space(8),
  },
  card: {
    backgroundColor: workerColors.card,
    borderColor: workerColors.outline,
    borderRadius: Radius.large,
    borderWidth: 1,
    gap: space(3),
    padding: space(4),
    ...Shadows.card,
  },
  row: { alignItems: 'center', flexDirection: 'row' },
  split: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
});
