import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { Pill, type PillTone } from '@/components/ui/pill';
import { Palette, Radius, space, TypeScale } from '@/constants/theme';

export type RowProps = {
  title: string;
  detail?: string;
  icon?: IconName;
  trailing?: string;
  badge?: string;
  badgeTone?: PillTone;
  onPress?: () => void;
  showChevron?: boolean;
  disabled?: boolean;
};

/** Tappable list row with a single consistent anatomy. */
export function Row({
  title,
  detail,
  icon,
  trailing,
  badge,
  badgeTone = 'neutral',
  onPress,
  showChevron,
  disabled = false,
}: RowProps) {
  const chevron = showChevron ?? Boolean(onPress);
  const content = (
    <>
      {icon ? (
        <View style={styles.iconDisc}>
          <Icon color={Palette.brand} name={icon} size={19} />
        </View>
      ) : null}
      <View style={styles.text}>
        <Text numberOfLines={1} style={[TypeScale.bodyStrong, { color: Palette.ink }]}>
          {title}
        </Text>
        {detail ? (
          <Text numberOfLines={2} style={[TypeScale.caption, { color: Palette.inkMuted }]}>
            {detail}
          </Text>
        ) : null}
      </View>
      {badge ? <Pill label={badge} tone={badgeTone} /> : null}
      {trailing ? (
        <Text numberOfLines={1} style={[TypeScale.bodySmall, { color: Palette.inkMuted }]}>
          {trailing}
        </Text>
      ) : null}
      {chevron ? <Icon color={Palette.inkFaint} name="chevron-right" size={18} /> : null}
    </>
  );

  if (!onPress) {
    return <View style={[styles.row, disabled ? styles.disabled : null]}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null, disabled ? styles.disabled : null]}
    >
      {content}
    </Pressable>
  );
}

/** Large selectable card: service options, roles, barber selection. */
export function OptionCard({
  title,
  detail,
  meta,
  icon,
  selected = false,
  onPress,
  disabled = false,
  badge,
  badgeTone = 'brand',
  accessibilityLabel,
}: {
  title: string;
  detail?: string;
  meta?: string;
  icon?: IconName;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  badge?: string;
  badgeTone?: PillTone;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        selected ? styles.optionSelected : null,
        pressed ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      {icon ? (
        <View style={[styles.iconDisc, selected ? styles.iconDiscSelected : null]}>
          <Icon color={selected ? '#FFFFFF' : Palette.brand} name={icon} size={20} />
        </View>
      ) : null}

      <View style={styles.text}>
        <Text numberOfLines={1} style={[TypeScale.bodyStrong, { color: Palette.ink }]}>
          {title}
        </Text>
        {detail ? (
          <Text numberOfLines={2} style={[TypeScale.caption, { color: Palette.inkMuted }]}>
            {detail}
          </Text>
        ) : null}
        {meta ? (
          <Text style={[TypeScale.eyebrow, { color: Palette.goldDeep }]}>{meta}</Text>
        ) : null}
      </View>

      {badge ? <Pill label={badge} tone={badgeTone} /> : null}
      <View style={[styles.radio, selected ? styles.radioOn : null]}>
        {selected ? <Icon color="#FFFFFF" name="check" size={13} strokeWidth={3} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
    borderRadius: Radius.medium,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space(3),
    minHeight: 60,
    paddingHorizontal: space(4),
    paddingVertical: space(3),
  },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
  iconDisc: {
    alignItems: 'center',
    backgroundColor: Palette.brandSoft,
    borderRadius: Radius.small,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  iconDiscSelected: { backgroundColor: Palette.brand },
  text: { flex: 1, gap: 2 },
  option: {
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
    borderRadius: Radius.large,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: space(3),
    padding: space(4),
  },
  optionSelected: { backgroundColor: Palette.brandSoftest, borderColor: Palette.brand },
  radio: {
    alignItems: 'center',
    borderColor: Palette.borderStrong,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  radioOn: { backgroundColor: Palette.brand, borderColor: Palette.brand },
});