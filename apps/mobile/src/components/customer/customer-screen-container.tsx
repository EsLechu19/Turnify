import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthScreenContainer } from '@/components/auth/auth-ui';
import { BottomTabInset, Radius } from '@/constants/theme';
import {
  customerNavigationItems,
  type CustomerNavigationKey,
} from '@/features/customer/customer-navigation';
import { useTheme } from '@/hooks/use-theme';

type CustomerScreenContainerProps = {
  activeNavigation: CustomerNavigationKey;
  children: React.ReactNode;
};

/** Shared customer frame; booking and live-ticket routes keep the same role navigation. */
export function CustomerScreenContainer({ activeNavigation, children }: CustomerScreenContainerProps) {
  const theme = useTheme();

  return (
    <View style={[styles.shell, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <AuthScreenContainer>{children}</AuthScreenContainer>
      </View>
      <View style={[styles.navigation, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
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
              <View style={[styles.indicator, { backgroundColor: active ? theme.primary : 'transparent' }]} />
              <Text style={[styles.navigationLabel, { color: active ? theme.primary : theme.textSecondary }]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  content: { flex: 1 },
  navigation: {
    alignSelf: 'center',
    borderTopWidth: 1,
    flexDirection: 'row',
    maxWidth: 480,
    minHeight: 64 + BottomTabInset,
    paddingBottom: BottomTabInset,
    paddingHorizontal: 20,
    width: '100%',
  },
  navigationItem: { alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: 56, paddingHorizontal: 4 },
  indicator: { borderRadius: Radius.small, height: 3, marginBottom: 6, width: 24 },
  navigationLabel: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
});
