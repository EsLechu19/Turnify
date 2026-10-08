import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabInset, Palette, Radius, Shadows, space } from '@/constants/theme';
import { BrandMark, Icon } from '@/components/ui';
import { customerNavigationItems, type CustomerNavigationKey } from '@/features/customer/customer-navigation';

type CustomerScreenContainerProps = {
  activeNavigation: CustomerNavigationKey;
  children: React.ReactNode;
};

export function CustomerScreenContainer({ activeNavigation, children }: CustomerScreenContainerProps) {
  return (
    <SafeAreaView edges={['top']} style={styles.shell}>
      <View style={styles.header}>
        <View accessibilityLabel="Turnify" style={styles.identity}>
          <BrandMark size={30} tile />
          <View style={styles.identityText}>
            <Text style={styles.brandName}>Turnify</Text>
            <Text style={styles.roleName}>Cliente</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>{children}</View>

      <View style={styles.navigation}>
        {customerNavigationItems.map((item) => {
          const active = item.key === activeNavigation;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={item.label}
              onPress={() => router.replace(item.href as Href)}
              style={({ pressed }) => [styles.navigationItem, { opacity: pressed ? 0.72 : 1 }]}
            >
              <Icon color={active ? Palette.brand : Palette.inkFaint} name={navigationIcons[item.key]} size={20} />
              <Text style={[styles.navigationLabel, { color: active ? Palette.brand : Palette.inkFaint }]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const navigationIcons: Record<CustomerNavigationKey, 'home' | 'storefront' | 'history' | 'user'> = {
  home: 'home',
  barbers: 'storefront',
  history: 'history',
  profile: 'user',
};

const styles = StyleSheet.create({
  shell: { backgroundColor: Palette.canvas, flex: 1 },
  header: {
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderBottomColor: Palette.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: space(3),
    justifyContent: 'space-between',
    minHeight: 60,
    paddingHorizontal: space(4),
    ...Shadows.card,
  },
  identity: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: space(2.5), minWidth: 0 },
  identityText: { flex: 1, gap: 1 },
  brandName: { color: Palette.ink, fontSize: 18, fontWeight: '700' },
  roleName: { color: Palette.inkMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.9, textTransform: 'uppercase' },
  content: { alignSelf: 'center', flex: 1, maxWidth: 640, width: '100%' },
  navigation: {
    alignSelf: 'center',
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    maxWidth: 640,
    minHeight: 64 + BottomTabInset,
    paddingBottom: BottomTabInset,
    paddingHorizontal: space(2),
    width: '100%',
  },
  navigationItem: { alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: 64, paddingHorizontal: space(1) },
  navigationLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.9, marginTop: 3, textTransform: 'uppercase' },
});
