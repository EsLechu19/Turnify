import { StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { Palette, Radius, space, TypeScale } from '@/constants/theme';

export type PillTone = 'neutral' | 'brand' | 'gold' | 'success' | 'danger' | 'ink' | 'soft';

export type PillProps = {
  label: string;
  tone?: PillTone;
  icon?: IconName;
  /** Solid pills fill the surface; the rest are soft tints. */
  solid?: boolean;
};

const tones: Record<PillTone, { background: string; text: string; border: string }> = {
  neutral: { background: Palette.brandSoftest, text: Palette.inkMuted, border: Palette.border },
  brand: { background: Palette.brandSoft, text: Palette.brandDeep, border: Palette.brandBorder },
  gold: { background: Palette.goldSoft, text: Palette.goldInk, border: Palette.goldBorder },
  success: { background: Palette.successSoft, text: Palette.successInk, border: Palette.successBorder },
  danger: { background: Palette.dangerSoft, text: Palette.dangerInk, border: Palette.dangerBorder },
  ink: { background: Palette.ink, text: '#FFFFFF', border: Palette.ink },
  soft: { background: 'transparent', text: Palette.inkMuted, border: Palette.border },
};

export function Pill({ label, tone = 'neutral', icon, solid = false }: PillProps) {
  const palette = tones[tone];
  const solidPair = solid
    ? { backgroundColor: palette.text, borderColor: palette.text }
    : { backgroundColor: palette.background, borderColor: palette.border };

  return (
    <View style={[styles.pill, solidPair]}>
      {icon ? <Icon color={solid ? palette.background : palette.text} name={icon} size={13} strokeWidth={2.2} /> : null}
      <Text style={[TypeScale.eyebrow, { color: solid ? palette.background : palette.text }]}>{label}</Text>
    </View>
  );
}

/** Number-first block used for ticket codes and queue positions. */
export function Metric({
  value,
  label,
  icon,
  tone = 'ink',
  size = 'md',
}: {
  value: string;
  label: string;
  icon?: IconName;
  tone?: 'ink' | 'brand' | 'gold' | 'success' | 'danger' | 'muted';
  size?: 'sm' | 'md' | 'lg';
}) {
  const color = {
    ink: Palette.ink,
    brand: Palette.brand,
    gold: Palette.goldInk,
    success: Palette.successInk,
    danger: Palette.danger,
    muted: Palette.inkMuted,
  }[tone];
  const scale = size === 'lg' ? TypeScale.display : size === 'sm' ? TypeScale.title : TypeScale.metric;

  return (
    <View style={styles.metric}>
      {icon ? <Icon color={color} name={icon} size={20} /> : null}
      <Text adjustsFontSizeToFit numberOfLines={1} style={[scale, { color }]}>
        {value}
      </Text>
      <Text style={[TypeScale.caption, { color: Palette.inkMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: space(2.5),
    paddingVertical: space(1.5),
  },
  metric: { gap: space(0.5) },
});