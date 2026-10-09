import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { BrandMark } from '@/components/ui/brand-mark';
import { IconButton } from '@/components/ui/button';
import { Palette, space, TypeScale } from '@/constants/theme';

export type ScreenHeaderProps = {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  /** `translucent` lets the canvas show through when the header scrolls away. */
  tone?: 'canvas' | 'translucent' | 'brand';
  align?: 'start' | 'center';
  style?: StyleProp<ViewStyle>;
};

export function ScreenHeader({
  title,
  eyebrow,
  subtitle,
  onBack,
  right,
  tone = 'canvas',
  align = 'start',
  style,
}: ScreenHeaderProps) {
  const onBrand = tone === 'brand';

  return (
    <View
      style={[
        styles.header,
        tone === 'translucent' ? styles.translucent : null,
        onBrand ? styles.brand : null,
        align === 'center' ? styles.centered : null,
        style,
      ]}
    >
      {onBack ? (
        <IconButton accessibilityLabel="Volver" name="arrow-left" onPress={onBack} tone={onBrand ? 'ghost' : 'surface'} />
      ) : null}

      <View style={styles.titles}>
        {eyebrow ? (
          <Text style={[TypeScale.eyebrow, { color: onBrand ? 'rgba(255,255,255,0.82)' : Palette.goldDeep }]}>
            {eyebrow}
          </Text>
        ) : null}
        <Text numberOfLines={2} style={[TypeScale.h2, { color: onBrand ? '#FFFFFF' : Palette.ink }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={2} style={[TypeScale.bodySmall, { color: onBrand ? 'rgba(255,255,255,0.86)' : Palette.inkMuted }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

/**
 * Centred app bar used by every public screen: back action, Turnify lockup and
 * an optional trailing control.
 */
export function BrandBar({
  onBack,
  right,
  step,
  backLabel = 'Volver al inicio',
}: {
  onBack?: () => void;
  right?: React.ReactNode;
  /** Progress label shown on the trailing slot, e.g. `1/3`. */
  step?: string;
  backLabel?: string;
}) {
  return (
    <View style={styles.brandBar}>
      <View style={styles.brandBarSlot}>{onBack ? <IconButton accessibilityLabel={backLabel} name="arrow-left" onPress={onBack} /> : null}</View>
      <View accessibilityLabel="Turnify" style={styles.brandLockup}>
        <BrandMark size={28} tile />
        <Text style={[TypeScale.headline, { color: Palette.ink }]}>Turnify</Text>
      </View>
      <View style={[styles.brandBarSlot, styles.brandBarSlotRight]}>
        {step ? (
          <View style={styles.step}>
            <Text style={[TypeScale.eyebrow, { color: Palette.inkFaint }]}>Paso</Text>
            <Text style={[TypeScale.bodyStrong, { color: Palette.brand }]}>{step}</Text>
          </View>
        ) : (
          right
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    backgroundColor: Palette.canvas,
    flexDirection: 'row',
    gap: space(3),
    paddingBottom: space(4),
    paddingHorizontal: space(5),
    paddingTop: space(2),
  },
  translucent: { backgroundColor: 'transparent' },
  brand: { backgroundColor: Palette.brand },
  centered: { justifyContent: 'center' },
  titles: { flex: 1, gap: space(0.5) },
  right: { alignItems: 'center', flexDirection: 'row', gap: space(2) },
  brandBar: { alignItems: 'center', flexDirection: 'row', minHeight: 44 },
  brandBarSlot: { alignItems: 'flex-start', width: 40 },
  brandBarSlotRight: { alignItems: 'flex-end' },
  brandLockup: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: space(2), justifyContent: 'center' },
  step: { alignItems: 'flex-end', minWidth: 40 },
});