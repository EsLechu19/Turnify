/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#15202B',
    background: '#FBF9F5',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#D7E9E8',
    textSecondary: '#5C6670',
    primary: '#0E8388',
    primaryMuted: '#E1F1F0',
    destructive: '#C6533A',
    destructiveMuted: '#F8E6E1',
    border: '#E5DDD2',
    success: '#237A5A',
  },
  dark: {
    text: '#F7F3EC',
    background: '#0E1E2E',
    backgroundElement: '#172C3A',
    backgroundSelected: '#214C50',
    textSecondary: '#BCC7CC',
    primary: '#40B8BA',
    primaryMuted: '#173D40',
    destructive: '#EC8A74',
    destructiveMuted: '#482B2A',
    border: '#304450',
    success: '#66C39A',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

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
  small: 10,
  medium: 14,
  large: 20,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
