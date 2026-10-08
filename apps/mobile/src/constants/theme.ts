/**
 * Turnify design tokens.
 *
 * Single source of truth for the visual language of the app. The palette comes
 * from the brand reference in `recursos/colores.md`; the logo itself lives in
 * `recursos/logo_turnify.png`.
 *
 * The product ships in a single light appearance, so `Colors.dark` is an alias
 * of `Colors.light` instead of a second, untested palette.
 */

import '@/global.css';

import { Platform, type ViewStyle } from 'react-native';

export const Palette = {
  /** #1264E8 — botones, navegación y acciones principales. */
  brand: '#1264E8',
  brandBright: '#087FF5',
  brandDeep: '#0B47B8',
  /** #E7F0FF — tarjetas suaves, campos seleccionados. */
  brandSoft: '#E7F0FF',
  brandSoftest: '#F4F8FF',
  /** #101D4A — títulos y texto importante. */
  ink: '#101D4A',
  /** #52617A — texto secundario. */
  inkMuted: '#52617A',
  inkFaint: '#8A99B4',
  /** #F0F6FF — fondo general de la app. */
  canvas: '#F0F6FF',
  surface: '#FFFFFF',
  surfaceMuted: '#F8FAFF',
  /** #FFB718 — reservado a avisos, "te toca" y destacados. */
  gold: '#FFB718',
  goldDeep: '#F59E0B',
  goldSoft: '#FFF7E0',
  goldBorder: '#FBE3A6',
  /** #FF8A8A — detalles de la mascota. */
  rose: '#FF8A8A',
  success: '#22C55E',
  successSoft: '#E8F9EF',
  successBorder: '#BFE9CF',
  danger: '#EF4444',
  dangerSoft: '#FDECEC',
  dangerBorder: '#F8CFCF',
  dangerInk: '#A32020',
  successInk: '#12693C',
  goldInk: '#9A6206',
  brandBorder: '#C9DDFF',
  border: '#DCE7FB',
  borderStrong: '#BFD3F5',
  overlay: 'rgba(16, 29, 74, 0.55)',
} as const;

const lightColors = {
  text: Palette.ink,
  textSecondary: Palette.inkMuted,
  textFaint: Palette.inkFaint,
  textInverse: '#FFFFFF',
  background: Palette.canvas,
  backgroundElement: Palette.surface,
  backgroundSelected: Palette.brandSoft,
  backgroundMuted: Palette.surfaceMuted,
  primary: Palette.brand,
  primaryBright: Palette.brandBright,
  primaryDeep: Palette.brandDeep,
  primaryMuted: Palette.brandSoft,
  accent: Palette.gold,
  accentDeep: Palette.goldDeep,
  accentMuted: Palette.goldSoft,
  mascot: Palette.rose,
  destructive: Palette.danger,
  destructiveMuted: Palette.dangerSoft,
  success: Palette.success,
  successMuted: Palette.successSoft,
  border: Palette.border,
  borderStrong: Palette.borderStrong,
  overlay: Palette.overlay,
} as const;

/** One appearance only: `dark` is an alias so the broken branch cannot return. */
export const Colors = { light: lightColors, dark: lightColors };

export type ThemeColor = keyof typeof lightColors;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/** 4pt base scale. `space(3)` is 12, `space(5)` is 20. */
export const space = (steps: number): number => steps * 4;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  xs: 8,
  small: 12,
  medium: 16,
  large: 20,
  xl: 28,
  xlarge: 34,
  pill: 999,
} as const;

export const BorderWidth = {
  hairline: 1,
  thick: 2,
} as const;

/** The only type scale in the product. Every screen reads from here. */
const baseTypeScale = {
  metric: { fontSize: 44, lineHeight: 48, fontWeight: '800', letterSpacing: -1 },
  display: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.6 },
  title: { fontSize: 23, lineHeight: 29, fontWeight: '800', letterSpacing: -0.3 },
  headline: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '700' },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  caption: { fontSize: 12, lineHeight: 17, fontWeight: '500' },
  eyebrow: { fontSize: 11, lineHeight: 14, fontWeight: '800', letterSpacing: 0.9 },
  code: { fontFamily: Fonts?.mono, fontSize: 13, lineHeight: 18, fontWeight: '700', letterSpacing: 1 },
} as const;

/**
 * Semantic headings on top of the scale. New code prefers `metric`/`display`/
 * `title`; `h1..h5` exist so screens still using the old names keep compiling.
 */
export const TypeScale = {
  ...baseTypeScale,
  h1: baseTypeScale.display,
  h2: baseTypeScale.title,
  h3: baseTypeScale.headline,
  h4: baseTypeScale.bodyStrong,
  h5: baseTypeScale.label,
  bodySmall: baseTypeScale.caption,
} as const;

export type TypeVariant = keyof typeof TypeScale;

type ShadowSpec = {
  offsetY: number;
  opacity: number;
  radius: number;
  elevation: number;
};

export type ShadowStyle = ViewStyle;

/**
 * react-native-web rejects the `shadow*` props ("use boxShadow"), while native
 * keeps its exact rendering through them. This returns the right pair per
 * platform so the design tokens stay declared once and look the same everywhere.
 */
function shadow({ offsetY, opacity, radius, elevation }: ShadowSpec): ShadowStyle {
  return Platform.select<ShadowStyle>({
    web: { boxShadow: `0 ${offsetY}px ${radius}px rgba(16, 29, 74, ${opacity})` },
    default: {
      shadowColor: Palette.ink,
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: radius,
      elevation,
    },
  });
}

export const Shadows = {
  card: shadow({ offsetY: 4, opacity: 0.06, radius: 12, elevation: 2 }),
  raised: shadow({ offsetY: 10, opacity: 0.12, radius: 24, elevation: 6 }),
  /** Bottom navigation and sticky action bars. */
  nav: shadow({ offsetY: -4, opacity: 0.08, radius: 16, elevation: 12 }),
  /** Modal sheets rise from the bottom edge. */
  sheet: shadow({ offsetY: -8, opacity: 0.18, radius: 28, elevation: 16 }),
} as const;

export const BottomTabInset = Platform.select({ ios: 56, android: 84 }) ?? 0;
export const MaxContentWidth = 560;