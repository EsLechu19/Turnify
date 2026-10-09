import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { Palette, Radius, Shadows, space } from '@/constants/theme';

export type CardTone = 'default' | 'brand' | 'soft' | 'gold' | 'danger' | 'success' | 'ink';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export type CardProps = Omit<ViewProps, 'style'> & {
  tone?: CardTone;
  padding?: CardPadding;
  radius?: number;
  bordered?: boolean;
  elevated?: boolean;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

const tones: Record<CardTone, { background: string; border: string }> = {
  default: { background: Palette.surface, border: Palette.border },
  brand: { background: Palette.brandSoft, border: Palette.brandSoft },
  soft: { background: Palette.surfaceMuted, border: Palette.border },
  gold: { background: Palette.goldSoft, border: Palette.goldBorder },
  danger: { background: Palette.dangerSoft, border: Palette.dangerBorder },
  success: { background: Palette.successSoft, border: Palette.successBorder },
  ink: { background: Palette.ink, border: Palette.ink },
};

const paddings: Record<CardPadding, number> = {
  none: 0,
  sm: space(3),
  md: space(4),
  lg: space(5),
};

export function Card({
  tone = 'default',
  padding = 'md',
  radius = Radius.large,
  bordered = true,
  elevated = false,
  style,
  ...rest
}: CardProps) {
  const surface = tones[tone];

  return (
    <View
      {...rest}
      style={[
        styles.card,
        {
          backgroundColor: surface.background,
          borderColor: surface.border,
          borderRadius: radius,
          padding: paddings[padding],
        },
        bordered ? styles.bordered : styles.borderless,
        elevated ? Shadows.card : null,
        style,
      ]}
    />
  );
}

export function Divider({ spacing = 'md' }: { spacing?: 'sm' | 'md' | 'lg' }) {
  const gap = { sm: space(2), md: space(4), lg: space(6) }[spacing];
  return <View style={{ backgroundColor: Palette.border, height: 1, marginVertical: gap, width: '100%' }} />;
}

const styles = StyleSheet.create({
  card: { gap: space(3) },
  bordered: { borderWidth: 1 },
  borderless: { borderWidth: 0 },
});