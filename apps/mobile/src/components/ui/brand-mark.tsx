import { Image, type ImageStyle, type StyleProp } from 'react-native';

/**
 * The official Turnify mark, generated from `recursos/logo_turnify.png`:
 * the cream logo placed on a `#101D4A` tile.
 */
import logo from '../../../assets/images/turnify-mark.png';

import { Palette, Radius } from '@/constants/theme';

export type BrandMarkProps = {
  /** Square edge in points. */
  size?: number;
  /** Rounds the logo inside a brand tile. Off for large marks. */
  rounded?: boolean;
  /** Sits the mark on a brand tile. The asset already carries the navy tile. */
  tile?: boolean;
  style?: StyleProp<ImageStyle>;
};

/**
 * Single source of truth for the Turnify identity in the UI. Replaces the four
 * hand-drawn teal squares that used to be inlined across the screens.
 */
export function BrandMark({ size = 32, rounded = true, tile = false, style }: BrandMarkProps) {
  if (tile) {
    return (
      <Image
        accessibilityIgnoresInvertColors
        accessibilityLabel="Turnify"
        source={logo}
        style={[{ backgroundColor: Palette.ink, borderRadius: rounded ? Radius.medium : 0, height: size, width: size }, style]}
      />
    );
  }

  return (
    <Image
      accessibilityIgnoresInvertColors
      accessibilityLabel="Turnify"
      resizeMode="contain"
      source={logo}
      style={[{ borderRadius: rounded ? Radius.small : 0, height: size, width: size }, style]}
    />
  );
}