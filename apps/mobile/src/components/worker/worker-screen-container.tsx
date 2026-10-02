import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomTabInset, Radius } from '@/constants/theme';
import { workerNavigationItems, type WorkerNavigationKey } from '@/features/worker/worker-navigation';
import { useTheme } from '@/hooks/use-theme';

type WorkerScreenContainerProps = {
  activeNavigation: WorkerNavigationKey;
  children: React.ReactNode;
};

/** Persistent worker frame for assignment-safe operational destinations. */
export function WorkerScreenContainer({ activeNavigation, children }: WorkerScreenContainerProps) {
  const theme = useTheme();

  return (
    <View style={[styles.shell, { backgroundColor: theme.background }]}>
      <View style={styles.content}>{children}</View>
      <View style={[styles.navigation, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        {workerNavigationItems.map((item) => {
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

export const workerScreenStyles = StyleSheet.create({
  page: { gap: 16, paddingBottom: 28, paddingHorizontal: 20, paddingTop: 20 },
  card: { borderRadius: Radius.medium, borderWidth: 1, gap: 8, padding: 16 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  title: { fontSize: 26, fontWeight: '700', letterSpacing: -0.4, lineHeight: 32 },
  detail: { fontSize: 15, lineHeight: 22 },
});

const styles = StyleSheet.create({
  shell: { flex: 1 },
  content: { alignSelf: 'center', flex: 1, maxWidth: 480, width: '100%' },
  navigation: {
    alignSelf: 'center', borderTopWidth: 1, flexDirection: 'row', maxWidth: 480,
    minHeight: 64 + BottomTabInset, paddingBottom: BottomTabInset, paddingHorizontal: 8, width: '100%',
  },
  navigationItem: { alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: 56, paddingHorizontal: 2 },
  indicator: { borderRadius: Radius.small, height: 3, marginBottom: 6, width: 24 },
  navigationLabel: { fontSize: 11, fontWeight: '600', lineHeight: 16 },
});
