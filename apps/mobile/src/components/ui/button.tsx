import { Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { router, type Href } from 'expo-router';

import { Icon, type IconName } from '@/components/ui/icon';
import { Palette, Radius, Shadows, space, TypeScale } from '@/constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'gold' | 'danger' | 'success' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  onPress?: () => void;
  /** Navigates instead of firing an action. Used by the auth footers. */
  href?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

const surfaces: Record<ButtonVariant, { background: string; border: string; text: string }> = {
  primary: { background: Palette.brand, border: Palette.brand, text: '#FFFFFF' },
  secondary: { background: Palette.surface, border: Palette.borderStrong, text: Palette.brand },
  soft: { background: Palette.brandSoft, border: Palette.brandSoft, text: Palette.brandDeep },
  ghost: { background: 'transparent', border: 'transparent', text: Palette.inkMuted },
  gold: { background: Palette.gold, border: Palette.gold, text: Palette.ink },
  danger: { background: Palette.dangerSoft, border: Palette.dangerSoft, text: Palette.danger },
  success: { background: Palette.success, border: Palette.success, text: '#FFFFFF' },
  link: { background: 'transparent', border: 'transparent', text: Palette.brand },
};

const metrics: Record<ButtonSize, { height: number; paddingHorizontal: number; gap: number; icon: number }> = {
  sm: { height: 38, paddingHorizontal: 14, gap: 6, icon: 16 },
  md: { height: 48, paddingHorizontal: 18, gap: 8, icon: 18 },
  lg: { height: 56, paddingHorizontal: 22, gap: 10, icon: 20 },
};

export function Button({
  label,
  onPress,
  href,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  fullWidth = false,
  disabled = false,
  style,
  textStyle,
  ...rest
}: ButtonProps) {
  const surface = surfaces[variant];
  const metric = metrics[size];
  const isDisabled = disabled || loading;
  const isLink = variant === 'link';
  const contentColor = isDisabled ? Palette.inkFaint : surface.text;
  const handlePress = href ? () => router.push(href as Href) : onPress;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={handlePress}
      {...rest}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: surface.background,
          borderColor: surface.border,
          gap: metric.gap,
          height: isLink ? undefined : metric.height,
          paddingHorizontal: isLink ? 0 : metric.paddingHorizontal,
          width: fullWidth ? '100%' : undefined,
        },
        variant === 'primary' || variant === 'gold' || variant === 'success' ? Shadows.card : null,
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
        style,
      ]}
    >
      {icon ? <Icon color={contentColor} name={icon} size={metric.icon} strokeWidth={2} /> : null}
      <Text numberOfLines={1} style={[TypeScale.bodyStrong, { color: contentColor }, textStyle]}>
        {loading ? 'Cargando…' : label}
      </Text>
      {iconRight ? <Icon color={contentColor} name={iconRight} size={metric.icon} strokeWidth={2} /> : null}
    </Pressable>
  );
}

/** Square icon-only action, used in headers and rows. */
export function IconButton({
  name,
  onPress,
  accessibilityLabel,
  size = 40,
  tone = 'surface',
  disabled = false,
  style,
}: {
  name: IconName;
  onPress?: () => void;
  accessibilityLabel: string;
  size?: number;
  tone?: 'surface' | 'soft' | 'ghost';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const background = tone === 'soft' ? Palette.brandSoft : tone === 'ghost' ? 'transparent' : Palette.surface;
  const border = tone === 'soft' ? Palette.brandSoft : tone === 'ghost' ? 'transparent' : Palette.border;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [
        {
          alignItems: 'center',
          backgroundColor: background,
          borderColor: border,
          borderRadius: Radius.pill,
          borderWidth: 1,
          height: size,
          justifyContent: 'center',
          width: size,
        },
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      <Icon color={disabled ? Palette.inkFaint : Palette.ink} name={name} size={Math.round(size * 0.5)} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: Radius.medium,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: space(4),
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.55 },
});