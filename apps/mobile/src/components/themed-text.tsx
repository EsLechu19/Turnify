import { Text, type TextProps } from 'react-native';

import { TypeScale, type TypeVariant } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TextTone = 'default' | 'muted' | 'faint' | 'primary' | 'accent' | 'success' | 'danger' | 'inverse';

/**
 * Names used before the single type scale existed. They stay mapped so a screen
 * that is not part of the current redesign keeps compiling unchanged.
 */
const legacyVariants = {
  default: 'body',
  small: 'label',
  smallBold: 'bodyStrong',
  subtitle: 'display',
  link: 'label',
  linkPrimary: 'label',
} as const satisfies Record<string, TypeVariant>;

export type ThemedTextProps = TextProps & {
  /** Preferred: any variant of the type scale in `constants/theme`. */
  variant?: TypeVariant;
  /** Legacy name for `variant`, kept for screens outside the redesign. */
  type?: TypeVariant | keyof typeof legacyVariants;
  tone?: TextTone;
  /** Legacy name for `tone`. */
  themeColor?: TextTone;
};

export function ThemedText({ style, variant, type, tone, themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const resolved = (variant ?? (type && type in TypeScale ? (type as TypeVariant) : undefined) ?? (type ? legacyVariants[type as keyof typeof legacyVariants] : undefined) ?? 'body');
  const toneColor = {
    default: theme.text,
    muted: theme.textSecondary,
    faint: theme.textFaint,
    primary: theme.primary,
    accent: theme.accentDeep,
    success: theme.success,
    danger: theme.destructive,
    inverse: theme.textInverse,
  }[tone ?? themeColor ?? 'default'];

  return <Text {...rest} style={[TypeScale[resolved], { color: toneColor }, style]} />;
}