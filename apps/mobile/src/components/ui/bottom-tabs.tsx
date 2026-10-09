import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { Palette, Radius, Shadows, space, TypeScale } from '@/constants/theme';

export type BottomTabItem = {
  key: string;
  label: string;
  icon: IconName;
  onPress: () => void;
  badge?: string | number;
};

export function BottomTabs({ items, activeKey }: { items: BottomTabItem[]; activeKey: string }) {
  return (
    <View style={styles.bar}>
      {items.map((item) => {
        const active = item.key === activeKey;

        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            key={item.key}
            onPress={item.onPress}
            style={({ pressed }) => [styles.item, pressed ? styles.pressed : null]}
          >
            <View style={[styles.iconSlot, active ? styles.iconSlotActive : null]}>
              <Icon color={active ? Palette.brand : Palette.inkFaint} name={item.icon} size={21} strokeWidth={active ? 2.2 : 1.9} />
              {item.badge != null && item.badge !== '' ? (
                <View style={styles.badge}>
                  <Text style={[styles.badgeText, { color: '#FFFFFF' }]}>{item.badge}</Text>
                </View>
              ) : null}
            </View>
            <Text
              numberOfLines={1}
              style={[TypeScale.eyebrow, { color: active ? Palette.brand : Palette.inkFaint }]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'stretch',
    backgroundColor: Palette.surface,
    borderTopColor: Palette.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: space(1),
    paddingBottom: space(2),
    paddingHorizontal: space(2),
    paddingTop: space(2),
    ...Shadows.nav,
  },
  item: { alignItems: 'center', flex: 1, gap: space(1) },
  pressed: { opacity: 0.6 },
  iconSlot: {
    alignItems: 'center',
    borderRadius: Radius.pill,
    height: 30,
    justifyContent: 'center',
    width: 52,
  },
  iconSlotActive: { backgroundColor: Palette.brandSoft },
  badge: {
    alignItems: 'center',
    backgroundColor: Palette.danger,
    borderColor: Palette.surface,
    borderRadius: Radius.pill,
    borderWidth: 2,
    height: 18,
    justifyContent: 'center',
    minWidth: 18,
    paddingHorizontal: 4,
    position: 'absolute',
    right: 4,
    top: -2,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },
});